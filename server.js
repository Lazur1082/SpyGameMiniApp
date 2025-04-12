require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Game state
const games = new Map();
const locations = [
    "Больница", "Школа", "Банк", "Пляж", "Театр",
    "Ресторан", "Супермаркет", "Отель", "Парк",
    "Университет", "Аэропорт", "Поезд", "Церковь",
    "Цирк", "Казино", "Посольство", "Полицейский участок",
    "Пиратский корабль", "Подводная лодка", "Космическая станция"
];

// Socket.io handlers
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create new game
    socket.on('createGame', (data) => {
        try {
            const gameId = Math.random().toString(36).substring(2, 8);
            games.set(gameId, {
                id: gameId,
                players: [{
                    id: socket.id,
                    name: data.playerName,
                    isAdmin: true
                }],
                messages: [],
                started: false,
                location: null,
                spy: null
            });

            socket.join(gameId);
            socket.emit('gameCreated', { gameId });
            io.to(gameId).emit('updatePlayers', { players: games.get(gameId).players });
        } catch (error) {
            socket.emit('error', { message: 'Error creating game' });
        }
    });

    // Join game
    socket.on('joinGame', (data) => {
        try {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }

            if (game.started) {
                socket.emit('error', { message: 'Game already started' });
                return;
            }

            game.players.push({
                id: socket.id,
                name: data.playerName,
                isAdmin: false
            });

            socket.join(data.gameId);
            io.to(data.gameId).emit('updatePlayers', { players: game.players });
            socket.emit('gameJoined', { gameId: data.gameId });
        } catch (error) {
            socket.emit('error', { message: 'Error joining game' });
        }
    });

    // Start game
    socket.on('startGame', (data) => {
        try {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }

            const player = game.players.find(p => p.id === socket.id);
            if (!player || !player.isAdmin) {
                socket.emit('error', { message: 'Only admin can start the game' });
                return;
            }

            if (game.players.length < 3) {
                socket.emit('error', { message: 'Need at least 3 players' });
                return;
            }

            // Select random location and spy
            game.location = locations[Math.floor(Math.random() * locations.length)];
            game.spy = game.players[Math.floor(Math.random() * game.players.length)].id;
            game.started = true;

            // Send role to each player
            game.players.forEach(player => {
                io.to(player.id).emit('gameStarted', {
                    isSpy: player.id === game.spy,
                    location: player.id === game.spy ? null : game.location
                });
            });
        } catch (error) {
            socket.emit('error', { message: 'Error starting game' });
        }
    });

    // Chat message
    socket.on('chatMessage', (data) => {
        try {
            const game = games.get(data.gameId);
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }

            const player = game.players.find(p => p.id === socket.id);
            if (!player) {
                socket.emit('error', { message: 'Player not found' });
                return;
            }

            const message = {
                sender: player.name,
                text: data.text,
                timestamp: new Date().toISOString()
            };

            game.messages.push(message);
            io.to(data.gameId).emit('newMessage', message);
        } catch (error) {
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        games.forEach((game, gameId) => {
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
                if (game.players.length === 0) {
                    games.delete(gameId);
                } else {
                    // If admin left, make the first player admin
                    if (game.players[0] && !game.players.some(p => p.isAdmin)) {
                        game.players[0].isAdmin = true;
                    }
                    io.to(gameId).emit('updatePlayers', { players: game.players });
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 