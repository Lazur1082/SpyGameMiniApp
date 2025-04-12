// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io
const socket = io();

// Game state
let gameState = {
    gameId: null,
    playerName: tg.initDataUnsafe.user?.first_name || 'Player',
    isAdmin: false,
    players: [],
    messages: []
};

// DOM Elements
const screens = {
    menu: document.getElementById('menuScreen'),
    join: document.getElementById('joinScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen')
};

const elements = {
    playersList: document.getElementById('playersList'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    gameIdDisplay: document.getElementById('gameId'),
    joinGameInput: document.getElementById('joinGameInput'),
    roleDisplay: document.getElementById('roleDisplay'),
    locationDisplay: document.getElementById('locationDisplay')
};

// Show active screen, hide others
function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
        screen.style.display = 'none';
    });
    screens[screenId].style.display = 'flex';
}

// Update players list
function updatePlayersList(players) {
    elements.playersList.innerHTML = players.map(player => `
        <div class="player-item">
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
        </div>
    `).join('');
}

// Add chat message
function addChatMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message${message.sender === gameState.playerName ? ' own' : ''}`;
    messageElement.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Event Listeners
document.getElementById('createGameBtn').addEventListener('click', () => {
    socket.emit('createGame', { playerName: gameState.playerName });
});

document.getElementById('joinGameBtn').addEventListener('click', () => {
    const gameId = elements.joinGameInput.value.trim();
    if (gameId) {
        socket.emit('joinGame', { gameId, playerName: gameState.playerName });
    }
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    if (gameState.gameId) {
        socket.emit('startGame', { gameId: gameState.gameId });
    }
});

document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const text = elements.chatInput.value.trim();
    if (text && gameState.gameId) {
        socket.emit('chatMessage', { gameId: gameState.gameId, text });
        elements.chatInput.value = '';
    }
});

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    showScreen('menu');
});

socket.on('gameCreated', (data) => {
    gameState.gameId = data.gameId;
    gameState.isAdmin = true;
    elements.gameIdDisplay.textContent = data.gameId;
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    gameState.gameId = data.gameId;
    showScreen('lobby');
});

socket.on('updatePlayers', (data) => {
    gameState.players = data.players;
    updatePlayersList(data.players);
    
    // Show/hide start game button based on admin status
    const startGameBtn = document.getElementById('startGameBtn');
    const isAdmin = data.players.find(p => p.id === socket.id)?.isAdmin;
    startGameBtn.style.display = isAdmin ? 'block' : 'none';
});

socket.on('gameStarted', (data) => {
    elements.roleDisplay.textContent = data.isSpy ? 'Вы шпион!' : 'Вы мирный житель';
    elements.locationDisplay.textContent = data.isSpy ? '???' : `Локация: ${data.location}`;
    showScreen('game');
});

socket.on('newMessage', (message) => {
    addChatMessage(message);
});

socket.on('error', (data) => {
    alert(data.message);
});

// Initialize
showScreen('menu');