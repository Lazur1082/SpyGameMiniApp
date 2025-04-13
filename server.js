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

    // Create new game
    socket.on('createGame', (data) => {
        const { playersCount, playerName } = data;
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const game = {
            id: gameId,
            players: [{ id: socket.id, name: playerName, isAdmin: true }],
            maxPlayers: playersCount,
            status: 'waiting'
        };
        
        games.set(gameId, game);
        socket.join(gameId);
        
        socket.emit('gameCreated', {
            gameId,
            players: game.players
        });
    });

    // Join existing game
    socket.on('joinGame', (data) => {
        const { gameId, playerName } = data;
        const game = games.get(gameId);

        if (!game) {
            socket.emit('gameJoined', { error: 'Игра не найдена' });
            return;
        }

        if (game.players.length >= game.maxPlayers) {
            socket.emit('gameJoined', { error: 'Игра уже заполнена' });
            return;
        }

        if (game.status !== 'waiting') {
            socket.emit('gameJoined', { error: 'Игра уже началась' });
            return;
        }

        game.players.push({ id: socket.id, name: playerName, isAdmin: false });
        socket.join(gameId);

        io.to(gameId).emit('playerJoined', {
            players: game.players
        });

        socket.emit('gameJoined', {
            gameId,
            players: game.players
        });
    });

    // Start game
    socket.on('startGame', (data) => {
        const { gameId } = data;
        const game = games.get(gameId);

        if (!game) return;

        const admin = game.players.find(p => p.isAdmin);
        if (admin && admin.id === socket.id) {
            game.status = 'started';
            
            // Assign roles and locations
            const roles = ['Шпион', 'Мирный житель'];
            const locations = ['Пляж', 'Кинотеатр', 'Ресторан', 'Школа', 'Больница', 'Аэропорт'];
            
            const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
            const spyIndex = Math.floor(Math.random() * shuffledPlayers.length);
            
            shuffledPlayers.forEach((player, index) => {
                const role = index === spyIndex ? roles[0] : roles[1];
                const location = index === spyIndex ? 'Неизвестно' : locations[Math.floor(Math.random() * locations.length)];
                
                io.to(player.id).emit('gameStarted', {
                    players: game.players,
                    role,
                    location
                });
            });
        }
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const { gameId, message, playerName } = data;
        io.to(gameId).emit('chatMessage', {
            message,
            playerName
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        
        // Find and remove player from games
        for (const [gameId, game] of games.entries()) {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = game.players[playerIndex];
                game.players.splice(playerIndex, 1);
                
                if (game.players.length === 0) {
                    games.delete(gameId);
                } else {
                    io.to(gameId).emit('playerLeft', {
                        players: game.players
                    });
                }
                break;
            }
        }
    });

    // Обработка события присоединения игрока
    socket.on('playerJoined', (data) => {
        updatePlayersList(data.players);
        addChatMessage(`${data.playerName} присоединился к игре`, 'system');
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

// Убедитесь, что в функции addChatMessage используется корректное имя
function addChatMessage(message, type = 'received', playerName = 'System') {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = `
        <div class="message-sender">${playerName || 'Игрок'}</div>
        <div class="message-text">${message || ''}</div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Функция для скрытия экрана загрузки
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const app = document.querySelector('.app');
    if (loadingScreen && app) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            app.style.display = 'flex';
        }, 500);
    }
}

// Вызов hideLoadingScreen после загрузки
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(hideLoadingScreen, 1000);
});

// Game joining
if (buttons.confirmJoin) {
    buttons.confirmJoin.addEventListener('click', () => {
        const gameId = inputs.gameId.value.trim();
        const playerName = document.getElementById('playerNameJoin').value.trim(); // Получаем ник

        if (!gameId) {
            alert('Введите код игры');
            return;
        }

        if (!playerName) {
            alert('Введите ваш ник');
            return;
        }

        socket.emit('joinGame', {
            gameId,
            playerName // Передаем ник в событии
        });
    });
}