// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io with error handling
const socket = io('https://spygameminiapp.onrender.com', {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
});

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
    sendMessage: document.getElementById('sendMessageBtn'),
    backToMenu: document.getElementById('backToMenuBtn')
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
    } else {
        console.error(`Screen not found: ${screenName}`);
        // Fallback to home screen if requested screen doesn't exist
        showScreen('home');
    }
}

function showAlert(message) {
    // Use standard browser alert instead of Telegram WebApp popup
    alert(message);
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
            showAlert('ID игры скопирован!');
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

if (buttons.backToMenu) {
    buttons.backToMenu.addEventListener('click', () => {
        showScreen('home');
    });
}

// Navigation event listeners
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = item.dataset.screen;
        if (screen === 'game' && !state.gameId) {
            showAlert('Сначала создайте или присоединитесь к игре');
            return;
        }
        showScreen(screen);
    });
});

// Socket.io connection handling
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    showAlert('Ошибка подключения к серверу. Пожалуйста, попробуйте позже.');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
    }
});

// Game Events
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
