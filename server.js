require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const TelegramBot = require('node-telegram-bot-api');

// Инициализация бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

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

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
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
});

// Обработка подключений
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Создание новой игры
    socket.on('createGame', (playerName) => {
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
    });

    // Присоединение к игре
    socket.on('joinGame', ({ gameId, playerName }) => {
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
    });

    // Начало игры
    socket.on('startGame', (gameId) => {
        const game = activeGames.get(gameId);
        if (!game || game.players.length < 3) {
            socket.emit('error', 'Недостаточно игроков');
            return;
        }

        // Выбираем случайное место
        game.location = locations[Math.floor(Math.random() * locations.length)];
        // Выбираем случайного шпиона
        game.spyIndex = Math.floor(Math.random() * game.players.length);
        game.state = 'in_progress';

        // Отправляем карточки игрокам
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
    });

    // Отправка сообщения в чат
    socket.on('chatMessage', ({ gameId, message }) => {
        const game = activeGames.get(gameId);
        if (!game) return;

        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;

        io.to(gameId).emit('newMessage', {
            player: player.name,
            message: message
        });
    });

    // Завершение игры
    socket.on('endGame', (gameId) => {
        const game = activeGames.get(gameId);
        if (!game) return;

        io.to(gameId).emit('gameEnded', {
            location: game.location,
            spy: game.players[game.spyIndex].name
        });

        activeGames.delete(gameId);
    });

    // Отключение игрока
    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
        // Очистка игр, где был этот игрок
        for (const [gameId, game] of activeGames.entries()) {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
                if (game.players.length === 0) {
                    activeGames.delete(gameId);
                } else {
                    io.to(gameId).emit('playerLeft', game.players);
                }
            }
        }
    });
});

// Очистка неактивных игр каждые 30 минут
setInterval(() => {
    const now = Date.now();
    for (const [gameId, game] of activeGames.entries()) {
        if (game.state === 'waiting' && now - game.createdAt > 30 * 60 * 1000) {
            activeGames.delete(gameId);
        }
    }
}, 30 * 60 * 1000);

// Получаем порт из переменной окружения или используем 3000
const PORT = process.env.PORT || 3000;

// Явно указываем, что сервер слушает на указанном порту
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
}); 