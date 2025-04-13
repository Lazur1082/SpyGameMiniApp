require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Store active games
const games = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Добро пожаловать в Spy Game! Нажмите кнопку ниже, чтобы начать игру.', {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Начать игру', web_app: { url: process.env.WEB_APP_URL } }
            ]]
        }
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createGame', (data) => {
        try {
            const { playersCount, roundTime, playerName } = data;
            
            if (playersCount < 2 || playersCount > 10) {
                socket.emit('gameError', { message: 'Количество игроков должно быть от 2 до 10' });
                return;
            }

            const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const game = {
                id: gameId,
                players: [{
                    id: socket.id,
                    name: playerName,
                    isAdmin: true
                }],
                playersCount,
                roundTime,
                status: 'waiting',
                messages: []
            };

            games.set(gameId, game);
            socket.join(gameId);
            socket.emit('gameCreated', { gameId, players: game.players });
        } catch (error) {
            console.error('Error creating game:', error);
            socket.emit('gameError', { message: 'Ошибка при создании игры' });
        }
    });

    socket.on('joinGame', (data) => {
        try {
            const { gameId, playerName } = data;
            const game = games.get(gameId);

            if (!game) {
                socket.emit('gameError', { message: 'Игра не найдена' });
                return;
            }

            if (game.players.length >= game.playersCount) {
                socket.emit('gameError', { message: 'Игра уже заполнена' });
                return;
            }

            if (game.status !== 'waiting') {
                socket.emit('gameError', { message: 'Игра уже началась' });
                return;
            }

            game.players.push({
                id: socket.id,
                name: playerName,
                isAdmin: false
            });

            socket.join(gameId);
            io.to(gameId).emit('playerJoined', { players: game.players });
        } catch (error) {
            console.error('Error joining game:', error);
            socket.emit('gameError', { message: 'Ошибка при присоединении к игре' });
        }
    });

    socket.on('chatMessage', (data) => {
        try {
            const { gameId, sender, text } = data;
            const game = games.get(gameId);

            if (!game) {
                socket.emit('gameError', { message: 'Игра не найдена' });
                return;
            }

            const message = {
                sender,
                text,
                timestamp: new Date().toISOString()
            };

            game.messages.push(message);
            io.to(gameId).emit('chatMessage', message);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('gameError', { message: 'Ошибка отправки сообщения' });
        }
    });

    socket.on('startGame', (data) => {
        try {
            const { gameId } = data;
            const game = games.get(gameId);

            if (!game) {
                socket.emit('gameError', { message: 'Игра не найдена' });
                return;
            }

            if (game.players.length < 2) {
                socket.emit('gameError', { message: 'Недостаточно игроков для начала игры' });
                return;
            }

            if (game.players.length > game.playersCount) {
                socket.emit('gameError', { message: 'Слишком много игроков' });
                return;
            }

            const spyIndex = Math.floor(Math.random() * game.players.length);
            const word = 'Телефон'; // Здесь можно добавить список слов

            game.players.forEach((player, index) => {
                const role = index === spyIndex ? 'Шпион' : 'Игрок';
                const playerWord = role === 'Шпион' ? null : word;
                io.to(player.id).emit('gameStarted', { role, word: playerWord });
            });

            game.status = 'playing';
            io.to(gameId).emit('gameStatus', { status: 'playing' });
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('gameError', { message: 'Ошибка при начале игры' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        games.forEach((game, gameId) => {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
                if (game.players.length === 0) {
                    games.delete(gameId);
                } else {
                    io.to(gameId).emit('playerLeft', { players: game.players });
                }
            }
        });
    });
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});