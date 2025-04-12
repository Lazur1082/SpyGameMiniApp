require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
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

// Хранилище игр
const games = new Map();

// Список локаций
const locations = [
    'Аэропорт', 'Банк', 'Больница', 'Гостиница', 'Кафе', 'Кинотеатр',
    'Магазин', 'Музей', 'Парк', 'Ресторан', 'Спортзал', 'Театр',
    'Университет', 'Школа', 'Цирк', 'Зоопарк', 'Библиотека', 'Стадион'
];

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

// Обработка подключений
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // Создание игры
    socket.on('createGame', (data) => {
        try {
            const gameId = uuidv4().substring(0, 6);
            const game = {
                id: gameId,
                status: 'waiting',
                players: [{
                    id: socket.id,
                    name: data.user.name,
                    avatar: data.user.avatar,
                    isAdmin: true
                }],
                location: null,
                spy: null
            };

            games.set(gameId, game);
            socket.join(gameId);
            socket.emit('gameCreated', { gameId });
        } catch (error) {
            console.error('Error creating game:', error);
            socket.emit('error', { message: 'Ошибка создания игры' });
        }
    });

    // Присоединение к игре
    socket.on('joinGame', (data) => {
        try {
            const { gameId, user } = data;
            const game = games.get(gameId);

            if (!game) {
                throw new Error('Игра не найдена');
            }

            if (game.status !== 'waiting') {
                throw new Error('Игра уже началась');
            }

            // Проверяем, не присоединился ли уже игрок
            const existingPlayer = game.players.find(p => p.id === socket.id);
            if (existingPlayer) {
                throw new Error('Вы уже в этой игре');
            }

            // Добавляем игрока
            game.players.push({
                id: socket.id,
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

    // Отправка сообщения
    socket.on('chatMessage', (data) => {
        try {
            const { gameId, text } = data;
            const game = games.get(gameId);

            if (!game) {
                throw new Error('Игра не найдена');
            }

            const player = game.players.find(p => p.id === socket.id);
            if (!player) {
                throw new Error('Вы не в этой игре');
            }

            const message = {
                sender: player.name,
                text,
                timestamp: new Date().toISOString()
            };

            io.to(gameId).emit('chatMessage', message);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Ошибка отправки сообщения' });
        }
    });

    // Начало игры
    socket.on('startGame', (data) => {
        try {
            const { gameId } = data;
            const game = games.get(gameId);

            if (!game) {
                throw new Error('Игра не найдена');
            }

            if (game.status !== 'waiting') {
                throw new Error('Игра уже началась');
            }

            // Проверяем, является ли игрок администратором
            const player = game.players.find(p => p.id === socket.id);
            if (!player || !player.isAdmin) {
                throw new Error('Только администратор может начать игру');
            }

            // Выбираем случайную локацию
            game.location = locations[Math.floor(Math.random() * locations.length)];
            
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
        
        // Удаляем игрока из всех игр
        games.forEach((game, gameId) => {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = game.players[playerIndex];
                game.players.splice(playerIndex, 1);
                
                // Если игрок был администратором, назначаем нового
                if (player.isAdmin && game.players.length > 0) {
                    game.players[0].isAdmin = true;
                }
                
                // Если игра пуста, удаляем её
                if (game.players.length === 0) {
                    games.delete(gameId);
                } else {
                    // Оповещаем остальных игроков
                    io.to(gameId).emit('playerLeft', {
                        playerName: player.name
                    });
                }
            }
        });
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
}); 