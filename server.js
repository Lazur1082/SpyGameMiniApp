require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Инициализация бота Telegram
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

// Инициализация SQLite базы данных
const db = new sqlite3.Database('spygame.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
    } else {
        console.log('Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

// Инициализация таблиц
function initializeDatabase() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE,
            name TEXT,
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица игр
        db.run(`CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT UNIQUE,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица игроков
        db.run(`CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT,
            user_id INTEGER,
            role TEXT,
            word TEXT,
            FOREIGN KEY (game_id) REFERENCES games(game_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    });
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;
    
    const message = `Привет, ${firstName}! Добро пожаловать в игру "Шпион"! 🎮\n\n` +
                   `Нажми на кнопку ниже, чтобы начать игру:`;
    
    const keyboard = {
        inline_keyboard: [[{
            text: '🎮 Играть в Шпиона',
            web_app: { url: process.env.WEB_APP_URL }
        }]]
    };
    
    bot.sendMessage(chatId, message, {
        reply_markup: keyboard
    }).catch(error => {
        console.error('Ошибка отправки сообщения:', error);
    });
});

// Обработка ошибок бота
bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
    setTimeout(() => {
        bot.stopPolling();
        bot.startPolling();
    }, 5000);
});

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Генерация случайной локации
const locations = [
    'Аэропорт', 'Банк', 'Больница', 'Гостиница', 'Кафе', 'Кинотеатр',
    'Магазин', 'Музей', 'Парк', 'Ресторан', 'Спортзал', 'Театр',
    'Университет', 'Школа', 'Цирк', 'Зоопарк', 'Библиотека', 'Стадион'
];

function getRandomLocation() {
    return locations[Math.floor(Math.random() * locations.length)];
}

// API Routes
app.post('/api/profile', upload.single('avatar'), async (req, res) => {
    try {
        const { telegramId, name } = req.body;
        const avatar = req.file ? `/images/avatars/${req.file.filename}` : null;

        db.run(
            'INSERT OR REPLACE INTO users (telegram_id, name, avatar) VALUES (?, ?, ?)',
            [telegramId, name, avatar],
            function(err) {
                if (err) {
                    res.status(500).json({ success: false, error: err.message });
                } else {
                    res.json({ success: true, userId: this.lastID });
                }
            }
        );
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/profile/:telegramId', async (req, res) => {
    try {
        db.get(
            'SELECT * FROM users WHERE telegram_id = ?',
            [req.params.telegramId],
            (err, user) => {
                if (err) {
                    res.status(500).json({ success: false, error: err.message });
                } else if (user) {
                    res.json({ success: true, user });
                } else {
                    res.status(404).json({ success: false, error: 'User not found' });
                }
            }
        );
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Обработка подключений Socket.io
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // Создание новой игры
    socket.on('createGame', async (data) => {
        try {
            const gameId = uuidv4().substring(0, 6);
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // Создаем игру
                db.run(
                    'INSERT INTO games (game_id, status) VALUES (?, ?)',
                    [gameId, 'waiting'],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            socket.emit('error', { message: 'Ошибка создания игры' });
                            return;
                        }
                        
                        // Добавляем игрока
                        db.run(
                            'INSERT INTO players (game_id, user_id, role) VALUES (?, ?, ?)',
                            [gameId, data.user.id, 'spy'],
                            function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    socket.emit('error', { message: 'Ошибка добавления игрока' });
                                    return;
                                }
                                
                                db.run('COMMIT');
                                socket.join(gameId);
                                socket.emit('gameCreated', { gameId });
                            }
                        );
                    }
                );
            });
        } catch (error) {
            console.error('Error creating game:', error);
            socket.emit('error', { message: 'Ошибка создания игры' });
        }
    });

    // Присоединение к игре
    socket.on('joinGame', async (data) => {
        try {
            console.log('Joining game:', data);
            const { gameId, user } = data;
            
            if (!gameId || !user || !user.id) {
                throw new Error('Неверные данные для присоединения к игре');
            }
            
            const game = games.get(gameId);
            if (!game) {
                throw new Error('Игра не найдена');
            }
            
            if (game.players.length >= 4) {
                throw new Error('Игра уже заполнена');
            }
            
            // Добавляем игрока в игру
            game.players.push({
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                socketId: socket.id
            });
            
            // Обновляем игру в базе данных
            const [result] = await pool.query(
                'UPDATE games SET players = ? WHERE id = ?',
                [JSON.stringify(game.players), gameId]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Не удалось обновить игру');
            }
            
            // Присоединяем сокет к комнате игры
            socket.join(gameId);
            
            // Отправляем обновление всем игрокам
            io.to(gameId).emit('gameUpdated', {
                gameId: gameId,
                players: game.players
            });
            
            // Отправляем подтверждение присоединения
            socket.emit('gameJoined', {
                gameId: gameId,
                players: game.players
            });
            
            console.log(`Player ${user.name} joined game ${gameId}`);
        } catch (error) {
            console.error('Error joining game:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Начало игры
    socket.on('startGame', async (data) => {
        try {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // Обновляем статус игры
                db.run(
                    'UPDATE games SET status = ? WHERE game_id = ?',
                    ['playing', data.gameId],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            socket.emit('error', { message: 'Ошибка начала игры' });
                            return;
                        }
                        
                        // Получаем список игроков
                        db.all(
                            'SELECT * FROM players WHERE game_id = ?',
                            [data.gameId],
                            (err, players) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    socket.emit('error', { message: 'Ошибка получения списка игроков' });
                                    return;
                                }
                                
                                // Выбираем случайного шпиона
                                const spyIndex = Math.floor(Math.random() * players.length);
                                const location = getRandomLocation();
                                
                                // Обновляем роли и слова
                                players.forEach((player, index) => {
                                    const role = index === spyIndex ? 'spy' : 'civilian';
                                    const word = role === 'spy' ? '' : location;
                                    
                                    db.run(
                                        'UPDATE players SET role = ?, word = ? WHERE id = ?',
                                        [role, word, player.id],
                                        (err) => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                socket.emit('error', { message: 'Ошибка обновления ролей' });
                                                return;
                                            }
                                        }
                                    );
                                });
                                
                                db.run('COMMIT');
                                io.to(data.gameId).emit('gameStarted', { players });
                            }
                        );
                    }
                );
            });
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('error', { message: 'Ошибка начала игры' });
        }
    });

    // Отправка сообщения в чат
    socket.on('chatMessage', ({ text }) => {
        try {
            db.get(
                'SELECT p.*, u.name FROM players p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
                [socket.id],
                (err, player) => {
                    if (err || !player) {
                        socket.emit('error', { message: 'Ошибка отправки сообщения' });
                        return;
                    }
                    
                    io.to(player.game_id).emit('chatMessage', {
                        sender: player.name,
                        text
                    });
                }
            );
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
        }
    });

    // Завершение игры
    socket.on('endGame', ({ gameId }) => {
        try {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // Получаем информацию об игре
                db.get(
                    'SELECT p.*, u.name FROM players p JOIN users u ON p.user_id = u.id WHERE p.game_id = ? AND p.role = ?',
                    [gameId, 'spy'],
                    (err, spy) => {
                        if (err) {
                            db.run('ROLLBACK');
                            socket.emit('error', { message: 'Ошибка завершения игры' });
                            return;
                        }
                        
                        // Обновляем статус игры
                        db.run(
                            'UPDATE games SET status = ? WHERE game_id = ?',
                            ['ended', gameId],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    socket.emit('error', { message: 'Ошибка завершения игры' });
                                    return;
                                }
                                
                                db.run('COMMIT');
                                io.to(gameId).emit('gameEnded', {
                                    spy: spy.name,
                                    location: getRandomLocation()
                                });
                            }
                        );
                    }
                );
            });
        } catch (error) {
            console.error('Ошибка при завершении игры:', error);
        }
    });

    // Выход из игры
    socket.on('leaveGame', () => {
        try {
            db.get(
                'SELECT game_id FROM players WHERE id = ?',
                [socket.id],
                (err, player) => {
                    if (err || !player) return;
                    
                    db.run(
                        'DELETE FROM players WHERE id = ?',
                        [socket.id],
                        (err) => {
                            if (err) return;
                            
                            // Проверяем, остались ли игроки
                            db.get(
                                'SELECT COUNT(*) as count FROM players WHERE game_id = ?',
                                [player.game_id],
                                (err, result) => {
                                    if (err) return;
                                    
                                    if (result.count === 0) {
                                        // Удаляем игру, если нет игроков
                                        db.run(
                                            'DELETE FROM games WHERE game_id = ?',
                                            [player.game_id]
                                        );
                                    } else {
                                        io.to(player.game_id).emit('playerLeft', { players: result.count });
                                    }
                                }
                            );
                        }
                    );
                }
            );
        } catch (error) {
            console.error('Ошибка при выходе из игры:', error);
        }
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Необработанное отклонение промиса:', error);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
}); 