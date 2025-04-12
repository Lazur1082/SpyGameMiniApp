require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const TelegramBot = require('node-telegram-bot-api');

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
app.use(express.static('public'));

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

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        const username = msg.from.username || msg.from.first_name;
        
        // Отправляем приветственное сообщение с фото
        await bot.sendPhoto(chatId, 'https://example.com/welcome.jpg', {
            caption: `Привет, ${username}! Добро пожаловать в игру "Шпион".\n\n` +
                    'Чтобы начать игру, перейдите по ссылке ниже:\n' +
                    'https://t.me/your_bot_username?start=game',
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Error in /start command:', error);
    }
});

// Обработка ошибок бота
bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
    // Перезапускаем бота при ошибке
    setTimeout(() => {
        bot.stopPolling();
        bot.startPolling();
    }, 5000);
});

// Хранение игр
const games = new Map();

// Генерация случайного ID игры
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Генерация случайной локации
const locations = [
    'Аэропорт', 'Банк', 'Больница', 'Гостиница', 'Кафе', 'Кинотеатр',
    'Магазин', 'Музей', 'Парк', 'Ресторан', 'Спортзал', 'Театр',
    'Университет', 'Школа', 'Цирк', 'Зоопарк', 'Библиотека', 'Стадион'
];

function getRandomLocation() {
    return locations[Math.floor(Math.random() * locations.length)];
}

// Обработка подключений Socket.io
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // Обработка создания игры
    socket.on('createGame', async (data) => {
        try {
            const { name } = data;
            if (!name) {
                socket.emit('error', { message: 'Имя игрока не указано' });
                return;
            }

            // Генерируем уникальный ID игры
            const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Создаем новую игру
            const game = {
                id: gameId,
                players: [{
                    id: socket.id,
                    name: name,
                    isAdmin: true
                }],
                status: 'waiting',
                timer: 300, // 5 минут
                createdAt: Date.now()
            };

            // Сохраняем игру
            games.set(gameId, game);
            
            // Присоединяем сокет к комнате игры
            socket.join(gameId);
            
            // Отправляем ответ клиенту
            socket.emit('gameCreated', {
                gameId: gameId,
                player: {
                    name: name,
                    isAdmin: true
                },
                players: game.players
            });

            console.log(`Game created: ${gameId} by ${name}`);
        } catch (error) {
            console.error('Error creating game:', error);
            socket.emit('error', { message: 'Ошибка при создании игры' });
        }
    });

    // Присоединение к игре
    socket.on('joinGame', ({ name, gameId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                socket.emit('error', { message: 'Игра не найдена' });
                return;
            }
            if (game.status !== 'waiting') {
                socket.emit('error', { message: 'Игра уже началась' });
                return;
            }
            if (game.players.length >= 8) {
                socket.emit('error', { message: 'Игра заполнена' });
                return;
            }

            const player = { id: socket.id, name, isAdmin: false };
            game.players.push(player);
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { players: game.players });
            socket.emit('joinedGame', { gameId, player, players: game.players });
        } catch (error) {
            console.error('Ошибка при присоединении к игре:', error);
            socket.emit('error', { message: 'Ошибка при присоединении к игре' });
        }
    });

    // Начало игры
    socket.on('startGame', ({ gameId }) => {
        try {
            const game = games.get(gameId);
            if (!game) {
                socket.emit('error', { message: 'Игра не найдена' });
                return;
            }
            if (game.players.length < 3) {
                socket.emit('error', { message: 'Недостаточно игроков' });
                return;
            }

            game.status = 'playing';
            game.location = getRandomLocation();
            game.spy = game.players[Math.floor(Math.random() * game.players.length)].id;

            game.players.forEach(player => {
                const role = player.id === game.spy ? 'spy' : 'civilian';
                io.to(player.id).emit('gameStarted', {
                    role,
                    location: role === 'civilian' ? game.location : null
                });
            });
        } catch (error) {
            console.error('Ошибка при начале игры:', error);
            socket.emit('error', { message: 'Ошибка при начале игры' });
        }
    });

    // Отправка сообщения в чат
    socket.on('chatMessage', ({ text }) => {
        try {
            const game = Array.from(games.values()).find(g => 
                g.players.some(p => p.id === socket.id)
            );
            if (!game) return;

            const player = game.players.find(p => p.id === socket.id);
            io.to(game.id).emit('chatMessage', {
                sender: player.name,
                text
            });
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
        }
    });

    // Завершение игры
    socket.on('endGame', ({ gameId }) => {
        try {
            const game = games.get(gameId);
            if (!game) return;

            // Проверяем, является ли игрок админом
            const player = game.players.find(p => p.id === socket.id);
            if (!player || !player.isAdmin) {
                socket.emit('error', { message: 'Только администратор может завершить игру' });
                return;
            }

            const spy = game.players.find(p => p.id === game.spy);
            io.to(gameId).emit('gameEnded', {
                spy: spy.name,
                location: game.location
            });
            games.delete(gameId);
        } catch (error) {
            console.error('Ошибка при завершении игры:', error);
        }
    });

    // Выход из игры
    socket.on('leaveGame', () => {
        try {
            const game = Array.from(games.values()).find(g => 
                g.players.some(p => p.id === socket.id)
            );
            if (!game) return;

            game.players = game.players.filter(p => p.id !== socket.id);
            if (game.players.length === 0) {
                games.delete(game.id);
            } else {
                io.to(game.id).emit('playerLeft', { players: game.players });
            }
        } catch (error) {
            console.error('Ошибка при выходе из игры:', error);
        }
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        try {
            const game = Array.from(games.values()).find(g => 
                g.players.some(p => p.id === socket.id)
            );
            if (!game) return;

            game.players = game.players.filter(p => p.id !== socket.id);
            if (game.players.length === 0) {
                games.delete(game.id);
            } else {
                io.to(game.id).emit('playerLeft', { players: game.players });
            }
        } catch (error) {
            console.error('Ошибка при отключении:', error);
        }
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