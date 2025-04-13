// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io
const socket = io();

// App state
const state = {
    currentScreen: 'home',
    gameId: null,
    isAdmin: false,
    players: []
};

// DOM elements
const screens = {
    home: document.getElementById('homeScreen'),
    create: document.getElementById('createScreen'),
    join: document.getElementById('joinScreen'),
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
    backToMenu: document.getElementById('backToMenuBtn'),
    startGame: document.getElementById('startGameBtn'),
    copyGameId: document.getElementById('copyGameIdBtn'),
    sendMessage: document.getElementById('sendMessageBtn')
};

const inputs = {
    gameId: document.getElementById('gameIdInput'),
    message: document.getElementById('messageInput')
};

const lists = {
    players: document.getElementById('playersList'),
    chat: document.getElementById('chatMessages')
};

// Functions
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        state.currentScreen = screenName;
    }
}

function updatePlayersList(players) {
    if (!lists.players) return;
    lists.players.innerHTML = '';
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="player-avatar">👤</div>
            <div class="player-name">${player.name}</div>
            ${player.isAdmin ? '<div class="admin-badge">👑</div>' : ''}
        `;
        lists.players.appendChild(playerItem);
    });
}

function addChatMessage(message, type = 'received') {
    if (!lists.chat) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    lists.chat.appendChild(messageElement);
    lists.chat.scrollTop = lists.chat.scrollHeight;
}

// Event listeners
if (buttons.createGame) {
    buttons.createGame.addEventListener('click', () => showScreen('create'));
}

if (buttons.joinGame) {
    buttons.joinGame.addEventListener('click', () => showScreen('join'));
}

if (buttons.settings) {
    buttons.settings.addEventListener('click', () => showScreen('settings'));
}

if (buttons.backToMenu) {
    buttons.backToMenu.addEventListener('click', () => showScreen('home'));
}

if (buttons.confirmCreate) {
    buttons.confirmCreate.addEventListener('click', () => {
        socket.emit('createGame', {
            playerName: tg.initDataUnsafe.user?.first_name || 'Player'
        });
    });
}

if (buttons.confirmJoin) {
    buttons.confirmJoin.addEventListener('click', () => {
        const gameId = inputs.gameId?.value;
        if (gameId) {
            socket.emit('joinGame', {
                gameId,
                playerName: tg.initDataUnsafe.user?.first_name || 'Player'
            });
        }
    });
}

if (buttons.startGame) {
    buttons.startGame.addEventListener('click', () => {
        socket.emit('startGame', { gameId: state.gameId });
    });
}

if (buttons.copyGameId) {
    buttons.copyGameId.addEventListener('click', () => {
        if (state.gameId) {
            navigator.clipboard.writeText(state.gameId);
            alert('Game ID copied to clipboard!');
        }
    });
}

if (buttons.sendMessage) {
    buttons.sendMessage.addEventListener('click', () => {
        const message = inputs.message?.value;
        if (message && state.gameId) {
            socket.emit('chatMessage', {
                gameId: state.gameId,
                message
            });
            inputs.message.value = '';
        }
    });
}

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = true;
    updatePlayersList(data.players);
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    updatePlayersList(data.players);
    showScreen('lobby');
});

socket.on('playerJoined', (data) => {
    updatePlayersList(data.players);
    addChatMessage(`${data.playerName} joined the game`, 'system');
});

socket.on('playerLeft', (data) => {
    updatePlayersList(data.players);
    addChatMessage(`${data.playerName} left the game`, 'system');
});

socket.on('gameStarted', (data) => {
    showScreen('game');
    addChatMessage('Game started!', 'system');
});

socket.on('chatMessage', (data) => {
    addChatMessage(`${data.playerName}: ${data.message}`);
});

socket.on('error', (error) => {
    alert(error.message);
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
});
