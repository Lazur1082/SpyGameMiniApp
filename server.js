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

// Инициализация бота
let bot;
try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
        polling: {
            interval: 300,
            autoStart: true,
            params: {
                timeout: 10
            }
        }
    });
    console.log('Бот успешно инициализирован');
} catch (error) {
    console.error('Ошибка инициализации бота:', error);
    process.exit(1);
}

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `👋 Привет! Я бот для игры "Шпион".\n\n` +
        `🎮 Чтобы начать игру, используйте команду /game\n` +
        `📝 Правила игры: /rules\n` +
        `❓ Помощь: /help`;
    
    bot.sendMessage(chatId, welcomeMessage);
});

// Обработка команды /game
bot.onText(/\/game/, (msg) => {
    const chatId = msg.chat.id;
    const gameMessage = `🎮 Начать игру:\n\n` +
        `1. Создайте игру: /create\n` +
        `2. Присоединитесь к игре: /join <ID игры>`;
    
    bot.sendMessage(chatId, gameMessage);
});

// Обработка команды /rules
bot.onText(/\/rules/, (msg) => {
    const chatId = msg.chat.id;
    const rulesMessage = `📝 Правила игры "Шпион":\n\n` +
        `1. В игре участвуют от 3 до 8 игроков\n` +
        `2. Один из игроков становится шпионом\n` +
        `3. Остальные игроки получают одинаковую локацию\n` +
        `4. Игроки обсуждают локацию, не называя её напрямую\n` +
        `5. Шпион должен угадать локацию\n` +
        `6. Если шпион угадывает - он побеждает\n` +
        `7. Если игроки разоблачают шпиона - побеждают они`;
    
    bot.sendMessage(chatId, rulesMessage);
});

// Обработка команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `❓ Помощь по командам:\n\n` +
        `/start - Начать работу с ботом\n` +
        `/game - Начать новую игру\n` +
        `/rules - Правила игры\n` +
        `/help - Показать это сообщение\n\n` +
        `Для создания игры:\n` +
        `/create - Создать новую игру\n` +
        `/join <ID> - Присоединиться к игре`;
    
    bot.sendMessage(chatId, helpMessage);
});

// Обработка команды /create
bot.onText(/\/create/, (msg) => {
    const chatId = msg.chat.id;
    const gameId = generateGameId();
    const game = {
        id: gameId,
        players: [{ id: chatId, name: msg.from.first_name, isAdmin: true }],
        status: 'waiting',
        location: null,
        spy: null
    };
    games.set(gameId, game);
    
    const createMessage = `🎮 Игра создана!\n\n` +
        `ID игры: ${gameId}\n` +
        `Отправьте этот ID другим игрокам, чтобы они могли присоединиться\n\n` +
        `Игроки:\n` +
        `- ${msg.from.first_name} (Администратор)`;
    
    bot.sendMessage(chatId, createMessage);
});

// Обработка команды /join
bot.onText(/\/join (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const gameId = match[1].toUpperCase();
    const game = games.get(gameId);
    
    if (!game) {
        bot.sendMessage(chatId, '❌ Игра не найдена. Проверьте ID игры.');
        return;
    }
    
    if (game.status !== 'waiting') {
        bot.sendMessage(chatId, '❌ Игра уже началась.');
        return;
    }
    
    if (game.players.length >= 8) {
        bot.sendMessage(chatId, '❌ Игра заполнена (максимум 8 игроков).');
        return;
    }
    
    const player = { id: chatId, name: msg.from.first_name, isAdmin: false };
    game.players.push(player);
    
    const playersList = game.players.map(p => `- ${p.name}${p.isAdmin ? ' (Администратор)' : ''}`).join('\n');
    const joinMessage = `✅ Вы присоединились к игре!\n\n` +
        `ID игры: ${gameId}\n\n` +
        `Игроки:\n${playersList}`;
    
    bot.sendMessage(chatId, joinMessage);
    
    // Уведомляем других игроков
    game.players.forEach(p => {
        if (p.id !== chatId) {
            bot.sendMessage(p.id, `🆕 ${msg.from.first_name} присоединился к игре!`);
        }
    });
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

    // Создание новой игры
    socket.on('createGame', ({ name }) => {
        try {
            const gameId = generateGameId();
            const game = {
                id: gameId,
                players: [{ id: socket.id, name, isAdmin: true }],
                status: 'waiting',
                location: null,
                spy: null
            };
            games.set(gameId, game);
            socket.join(gameId);
            socket.emit('gameCreated', { gameId, player: game.players[0], players: game.players });
        } catch (error) {
            console.error('Ошибка при создании игры:', error);
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