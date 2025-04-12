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

// Хранилище активных игр
const activeGames = new Map();

// Обработка подключений Socket.io
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // Создание новой игры
    socket.on('createGame', async (data) => {
        try {
            const gameId = uuidv4().substring(0, 6);
            const game = {
                id: gameId,
                status: 'waiting',
                players: [{
                    id: data.user.id,
                    name: data.user.name,
                    avatar: data.user.avatar,
                    isAdmin: true
                }],
                location: null,
                spy: null
            };

            activeGames.set(gameId, game);
            socket.join(gameId);
            socket.emit('gameCreated', { gameId });
        } catch (error) {
            console.error('Error creating game:', error);
            socket.emit('error', { message: 'Ошибка создания игры' });
        }
    });

    // Присоединение к игре
    socket.on('joinGame', async (data) => {
        try {
            const { gameId, user } = data;
            
            if (!gameId || !user || !user.id) {
                throw new Error('Неверные данные для присоединения к игре');
            }
            
            const game = activeGames.get(gameId);
            if (!game) {
                throw new Error('Игра не найдена');
            }

            if (game.status !== 'waiting') {
                throw new Error('Игра уже началась');
            }

            // Проверяем, не присоединился ли уже игрок
            const existingPlayer = game.players.find(p => p.id === user.id);
            if (existingPlayer) {
                throw new Error('Вы уже в этой игре');
            }

            // Добавляем игрока
            game.players.push({
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                isAdmin: false
            });

            socket.join(gameId);
            socket.emit('gameJoined', { 
                gameId,
                players: game.players
            });

            // Оповещаем остальных игроков
            socket.to(gameId).emit('playerJoined', {
                playerName: user.name,
                avatar: user.avatar
            });
        } catch (error) {
            console.error('Error joining game:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Отправка сообщения в чат
    socket.on('chatMessage', (data) => {
        try {
            const { gameId, sender, text } = data;
            const game = activeGames.get(gameId);
            
            if (!game) {
                throw new Error('Игра не найдена');
            }

            io.to(gameId).emit('chatMessage', {
                sender,
                text,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Ошибка отправки сообщения' });
        }
    });

    // Начало игры
    socket.on('startGame', (data) => {
        try {
            const { gameId } = data;
            const game = activeGames.get(gameId);
            
            if (!game) {
                throw new Error('Игра не найдена');
            }

            if (game.status !== 'waiting') {
                throw new Error('Игра уже началась');
            }

            // Выбираем случайную локацию
            game.location = getRandomLocation();
            
            // Выбираем случайного шпиона
            const spyIndex = Math.floor(Math.random() * game.players.length);
            game.spy = game.players[spyIndex].id;
            
            game.status = 'playing';

            // Отправляем роли игрокам
            game.players.forEach(player => {
                const role = player.id === game.spy ? 'spy' : 'civilian';
                const word = role === 'spy' ? 'Вы шпион!' : game.location;
                
                io.to(player.id).emit('gameStarted', {
                    role,
                    word
                });
            });
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Отключение игрока
    socket.on('disconnect', () => {
        console.log('Отключение:', socket.id);
        // Здесь можно добавить логику для обработки отключения игрока
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