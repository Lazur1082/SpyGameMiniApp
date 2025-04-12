require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
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
app.use(express.static('public'));

// Welcome message handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '🎮 Начать игру',
                    web_app: { url: process.env.WEB_APP_URL }
                }
            ]]
        }
    };
    
    bot.sendMessage(chatId, 
        '👋 Добро пожаловать в игру "Шпион"!\n\n' +
        '🎯 Правила просты:\n' +
        '1. Создайте игру или присоединитесь к существующей\n' +
        '2. В игре участвуют 2 игрока\n' +
        '3. Один игрок - шпион, другой - обычный игрок\n' +
        '4. Шпион не знает локацию, обычный игрок знает\n' +
        '5. Задача - вычислить шпиона!\n\n' +
        'Нажмите кнопку ниже, чтобы начать игру!',
        options
    );
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createGame', (data) => {
        const gameId = Math.random().toString(36).substring(2, 8);
        const game = {
            id: gameId,
            players: [{
                id: socket.id,
                name: data.playerName,
                avatar: data.avatar
            }],
            status: 'waiting',
            maxPlayers: 2
        };
        
        games.set(gameId, game);
        socket.join(gameId);
        socket.emit('gameCreated', { gameId });
    });

    socket.on('joinGame', (data) => {
        const game = games.get(data.gameId);
        
        if (!game) {
            socket.emit('error', { message: 'Игра не найдена' });
            return;
        }
        
        if (game.players.length >= game.maxPlayers) {
            socket.emit('error', { message: 'Игра уже заполнена' });
            return;
        }
        
        game.players.push({
            id: socket.id,
            name: data.playerName,
            avatar: data.avatar
        });
        
        socket.join(data.gameId);
        io.to(data.gameId).emit('playerJoined', { players: game.players });
        
        if (game.players.length === game.maxPlayers) {
            startGame(data.gameId);
        }
    });

    socket.on('chatMessage', (data) => {
        const game = games.get(data.gameId);
        if (!game) return;
        
        const message = {
            sender: data.sender,
            text: data.text,
            timestamp: new Date().toISOString()
        };
        
        io.to(data.gameId).emit('chatMessage', message);
    });

    socket.on('disconnect', () => {
        for (const [gameId, game] of games.entries()) {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
                io.to(gameId).emit('playerLeft', { players: game.players });
                
                if (game.players.length === 0) {
                    games.delete(gameId);
                }
            }
        }
    });
});

function startGame(gameId) {
    const game = games.get(gameId);
    if (!game) return;
    
    const locations = ['Ресторан', 'Пляж', 'Кинотеатр', 'Библиотека', 'Парк'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const spyIndex = Math.floor(Math.random() * game.players.length);
    
    game.status = 'playing';
    game.location = location;
    game.spyId = game.players[spyIndex].id;
    
    game.players.forEach((player, index) => {
        const role = player.id === game.spyId ? 'Шпион' : 'Обычный игрок';
        const playerLocation = role === 'Шпион' ? 'Неизвестно' : location;
        
        io.to(player.id).emit('gameStarted', {
            role,
            location: playerLocation
        });
    });
    
    io.to(gameId).emit('gameStatus', { status: 'playing' });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 