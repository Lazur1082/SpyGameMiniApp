// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io
const socket = io();

// Application state
const state = {
    currentScreen: 'home',
    gameId: null,
    isAdmin: false,
    players: []
};

// DOM Elements
const screens = {
    home: document.getElementById('homeScreen'),
    create: document.getElementById('createGameScreen'),
    join: document.getElementById('joinGameScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen'),
    settings: document.getElementById('settingsScreen')
};

const buttons = {
    createGame: document.getElementById('createGameBtn'),
    joinGame: document.getElementById('joinGameBtn'),
    settings: document.getElementById('settingsBtn'),
    confirmCreate: document.getElementById('confirmCreateBtn'),
    confirmJoin: document.getElementById('confirmJoinBtn'),
    startGame: document.getElementById('startGameBtn'),
    endGame: document.getElementById('endGameBtn'),
    copyGameId: document.getElementById('copyGameIdBtn'),
    sendMessage: document.getElementById('sendMessageBtn')
};

const navItems = document.querySelectorAll('.nav-item');
const gameIdElement = document.getElementById('gameId');
const playersList = document.getElementById('playersList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const roleInfo = document.getElementById('roleInfo');
const gameTimer = document.getElementById('gameTimer');

// Functions
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
        }
    });

    // Show requested screen
    const screen = screens[screenName];
    if (screen) {
        screen.classList.add('active');
        state.currentScreen = screenName;
    }

    // Update navigation
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
        }
    });
}

function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;

    playersList.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.innerHTML = `
            <div class="player-avatar">${player.avatar || '👤'}</div>
            <div class="player-name">${player.name}</div>
            ${player.isAdmin ? '<div class="admin-badge">👑</div>' : ''}
        `;
        playersList.appendChild(playerElement);
    });
}

function addChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender === state.userId ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event Listeners
if (buttons.createGame) {
    buttons.createGame.addEventListener('click', () => showScreen('create'));
}

if (buttons.joinGame) {
    buttons.joinGame.addEventListener('click', () => showScreen('join'));
}

if (buttons.settings) {
    buttons.settings.addEventListener('click', () => showScreen('settings'));
}

if (buttons.confirmCreate) {
    buttons.confirmCreate.addEventListener('click', () => {
        const playersCount = document.getElementById('playersCount').value;
        const roundTime = document.getElementById('roundTime').value;
        socket.emit('createGame', { playersCount, roundTime });
    });
}

if (buttons.confirmJoin) {
    buttons.confirmJoin.addEventListener('click', () => {
        const gameCode = document.getElementById('gameCode').value;
        socket.emit('joinGame', { gameCode });
    });
}

if (buttons.startGame) {
    buttons.startGame.addEventListener('click', () => {
        socket.emit('startGame');
    });
}

if (buttons.endGame) {
    buttons.endGame.addEventListener('click', () => {
        socket.emit('endGame');
        showScreen('home');
    });
}

if (buttons.copyGameId) {
    buttons.copyGameId.addEventListener('click', () => {
        const gameId = document.getElementById('gameId');
        if (gameId) {
            navigator.clipboard.writeText(gameId.textContent);
            alert('ID игры скопирован!');
        }
    });
}

if (buttons.sendMessage) {
    buttons.sendMessage.addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput && messageInput.value.trim()) {
            socket.emit('chatMessage', { text: messageInput.value });
            messageInput.value = '';
        }
    });
}

// Socket Events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = true;
    document.getElementById('gameId').textContent = data.gameId;
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = false;
    document.getElementById('gameId').textContent = data.gameId;
    showScreen('lobby');
});

socket.on('playersUpdate', (data) => {
    state.players = data.players;
    updatePlayersList(data.players);
});

socket.on('chatMessage', (data) => {
    addChatMessage(data);
});

socket.on('gameStarted', () => {
    showScreen('game');
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
    
    // Show home screen
    showScreen('home');
});
