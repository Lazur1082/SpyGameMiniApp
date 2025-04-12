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

    // Обработчик начала игры
    socket.on('startGame', ({ gameId }) => {
        const game = games.get(gameId);
        if (game && game.players.length >= 3) {
            // Выбираем случайную локацию
            const location = locations[Math.floor(Math.random() * locations.length)];
            
            // Выбираем случайного шпиона
            const spyIndex = Math.floor(Math.random() * game.players.length);
            
            // Отправляем роли игрокам
            game.players.forEach((player, index) => {
                const role = index === spyIndex ? 'spy' : 'civilian';
                const playerSocket = io.sockets.sockets.get(player.id);
                if (playerSocket) {
                    playerSocket.emit('gameStarted', { role, location });
                }
            });
            
            // Отправляем сообщение с фото и кнопкой
            const message = {
                type: 'gameStart',
                photo: 'https://example.com/game-start.jpg', // Замените на реальный URL фото
                caption: 'Игра началась!',
                buttons: [
                    {
                        text: 'Правила игры',
                        callback_data: 'rules'
                    },
                    {
                        text: 'Начать обсуждение',
                        callback_data: 'start_discussion'
                    }
                ]
            };
            
            io.to(gameId).emit('gameMessage', message);
            
            // Удаляем игру из списка активных
            games.delete(gameId);
        }
    });

    // Обработчик нажатия на inline кнопку
    socket.on('buttonClick', ({ gameId, buttonId }) => {
        const game = games.get(gameId);
        if (game) {
            switch (buttonId) {
                case 'rules':
                    const rulesMessage = {
                        type: 'rules',
                        text: 'Правила игры:\n1. Один игрок - шпион\n2. Остальные - мирные жители\n3. Шпион не знает локацию\n4. Мирные жители знают локацию\n5. Обсуждайте локацию, не называя её\n6. Шпион должен угадать локацию'
                    };
                    io.to(gameId).emit('gameMessage', rulesMessage);
                    break;
                case 'start_discussion':
                    const discussionMessage = {
                        type: 'discussion',
                        text: 'Обсуждение началось! Время: 10 минут'
                    };
                    io.to(gameId).emit('gameMessage', discussionMessage);
                    break;
            }
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