require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});
const TelegramBot = require('node-telegram-bot-api');

// Инициализация бота с отключением веб-хука во избежание конфликтов
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: true,
    webHook: false 
});

// Обработка ошибок бота
bot.on('error', (error) => {
    console.error('Ошибка бота:', error);
});

bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
});

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Обработка ошибок Express
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).send('Что-то пошло не так!');
});

// Список локаций для игры
const locations = [
    'Аэропорт',
    'Больница',
    'Кафе',
    'Кинотеатр',
    'Магазин',
    'Парк',
    'Ресторан',
    'Школа',
    'Спортзал',
    'Библиотека'
];

// Хранение активных игр
const activeGames = new Map();

// Настройка статических файлов
app.use(express.static('public'));

// Добавляем маршрут для проверки здоровья сервера
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    try {
        const chatId = msg.chat.id;
        console.log(`Пользователь ${msg.from.username || msg.from.id} запустил бота`);
        bot.sendMessage(chatId, 
            'Добро пожаловать в игру "Шпион"! 🕵️‍♂️\n\n' +
            'Чтобы начать игру, нажмите на кнопку ниже:',
            {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '🎮 Начать игру',
                            web_app: { url: process.env.WEB_APP_URL }
                        }
                    ]]
                }
            }
        );
    } catch (error) {
        console.error('Ошибка при обработке /start:', error);
    }
});

// Обработка подключений Socket.IO
io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);

    // Обработка ошибок сокета
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Создание новой игры
    socket.on('createGame', (playerName) => {
        try {
            console.log(`Создание игры игроком: ${playerName}`);
            const gameId = Math.random().toString(36).substring(2, 8);
            const game = {
                id: gameId,
                players: [{ id: socket.id, name: playerName }],
                state: 'waiting',
                location: null,
                spyIndex: null,
                createdAt: Date.now()
            };
            activeGames.set(gameId, game);
            socket.join(gameId);
            socket.emit('gameCreated', gameId);
            io.to(gameId).emit('playerJoined', game.players);
            console.log(`Игра создана: ${gameId}`);
        } catch (error) {
            console.error('Ошибка при создании игры:', error);
            socket.emit('error', 'Ошибка при создании игры');
        }
    });

    // Присоединение к игре
    socket.on('joinGame', ({ gameId, playerName }) => {
        try {
            console.log(`Игрок ${playerName} пытается присоединиться к игре ${gameId}`);
            const game = activeGames.get(gameId);
            if (!game) {
                socket.emit('error', 'Игра не найдена');
                return;
            }
            if (game.state !== 'waiting') {
                socket.emit('error', 'Игра уже началась');
                return;
            }
            game.players.push({ id: socket.id, name: playerName });
            socket.join(gameId);
            io.to(gameId).emit('playerJoined', game.players);
            console.log(`Игрок ${playerName} присоединился к игре ${gameId}`);
        } catch (error) {
            console.error('Ошибка при присоединении к игре:', error);
            socket.emit('error', 'Ошибка при присоединении к игре');
        }
    });

    // Начало игры
    socket.on('startGame', (gameId) => {
        try {
            console.log(`Попытка начать игру: ${gameId}`);
            const game = activeGames.get(gameId);
            if (!game || game.players.length < 3) {
                socket.emit('error', 'Недостаточно игроков');
                return;
            }

            game.location = locations[Math.floor(Math.random() * locations.length)];
            game.spyIndex = Math.floor(Math.random() * game.players.length);
            game.state = 'in_progress';

            game.players.forEach((player, index) => {
                const isSpy = index === game.spyIndex;
                const message = isSpy 
                    ? { role: 'spy', location: null }
                    : { role: 'player', location: game.location };
                
                io.to(player.id).emit('gameStarted', message);
            });

            io.to(gameId).emit('gameState', {
                state: 'in_progress',
                players: game.players.map(p => p.name)
            });
            console.log(`Игра ${gameId} началась`);
        } catch (error) {
            console.error('Ошибка при начале игры:', error);
            socket.emit('error', 'Ошибка при начале игры');
        }
    });

    // Отправка сообщения в чат
    socket.on('chatMessage', ({ gameId, message }) => {
        try {
            const game = activeGames.get(gameId);
            if (!game) return;

            const player = game.players.find(p => p.id === socket.id);
            if (!player) return;

            io.to(gameId).emit('newMessage', {
                player: player.name,
                message: message
            });
            console.log(`Сообщение в игре ${gameId} от ${player.name}`);
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
        }
    });

    // Завершение игры
    socket.on('endGame', (gameId) => {
        try {
            console.log(`Завершение игры: ${gameId}`);
            const game = activeGames.get(gameId);
            if (!game) return;

            io.to(gameId).emit('gameEnded', {
                location: game.location,
                spy: game.players[game.spyIndex].name
            });

            activeGames.delete(gameId);
            console.log(`Игра ${gameId} завершена`);
        } catch (error) {
            console.error('Ошибка при завершении игры:', error);
            socket.emit('error', 'Ошибка при завершении игры');
        }
    });

    // Отключение игрока
    socket.on('disconnect', () => {
        try {
            console.log(`Отключение игрока: ${socket.id}`);
            for (const [gameId, game] of activeGames.entries()) {
                const playerIndex = game.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1) {
                    const player = game.players[playerIndex];
                    game.players.splice(playerIndex, 1);
                    console.log(`Игрок ${player.name} покинул игру ${gameId}`);
                    if (game.players.length === 0) {
                        activeGames.delete(gameId);
                        console.log(`Игра ${gameId} удалена`);
                    } else {
                        io.to(gameId).emit('playerLeft', game.players);
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка при отключении игрока:', error);
        }
    });
});

// Очистка неактивных игр каждые 30 минут
setInterval(() => {
    try {
        const now = Date.now();
        let cleanedGames = 0;
        for (const [gameId, game] of activeGames.entries()) {
            if (game.state === 'waiting' && now - game.createdAt > 30 * 60 * 1000) {
                activeGames.delete(gameId);
                cleanedGames++;
            }
        }
        if (cleanedGames > 0) {
            console.log(`Очищено неактивных игр: ${cleanedGames}`);
        }
    } catch (error) {
        console.error('Ошибка при очистке неактивных игр:', error);
    }
}, 30 * 60 * 1000);

// Получаем порт из переменной окружения или используем 3000
const PORT = process.env.PORT || 3000;

// Запуск сервера
const server = http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Веб-приложение доступно по адресу: ${process.env.WEB_APP_URL}`);
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('Необработанное исключение:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Необработанное отклонение промиса:', error);
}); 