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

// DOM Elements
const screens = {
    home: document.getElementById('homeScreen'),
    createGame: document.getElementById('createGameScreen'),
    joinGame: document.getElementById('joinGameScreen'),
    settings: document.getElementById('settingsScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen')
};

const navItems = document.querySelectorAll('.nav-item');
const gameIdElement = document.getElementById('gameId');
const playersList = document.getElementById('playersList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const copyGameIdBtn = document.getElementById('copyGameIdBtn');
const startGameBtn = document.getElementById('startGameBtn');
const endGameBtn = document.getElementById('endGameBtn');
const roleInfo = document.getElementById('roleInfo');
const gameTimer = document.getElementById('gameTimer');

// Functions
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    // Show requested screen
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
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
    if (!playersList) return;
    playersList.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.innerHTML = `
            <div class="player-avatar">${player.name.charAt(0)}</div>
            <div class="player-name">${player.name}</div>
            ${player.isAdmin ? '<div class="admin-badge">👑</div>' : ''}
        `;
        playersList.appendChild(playerElement);
    });
}

function addChatMessage(message) {
    if (!chatMessages) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender === state.userName ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event Listeners
document.getElementById('createGameBtn')?.addEventListener('click', () => {
    showScreen('createGame');
});

document.getElementById('joinGameBtn')?.addEventListener('click', () => {
    showScreen('joinGame');
});

document.getElementById('settingsBtn')?.addEventListener('click', () => {
    showScreen('settings');
});

document.getElementById('confirmCreateBtn')?.addEventListener('click', () => {
    const playersCount = parseInt(document.getElementById('playersCount').value);
    const roundTime = parseInt(document.getElementById('roundTime').value);
    socket.emit('createGame', { playersCount, roundTime });
});

document.getElementById('confirmJoinBtn')?.addEventListener('click', () => {
    const gameCode = document.getElementById('gameCode').value;
    if (gameCode) {
        socket.emit('joinGame', { gameId: gameCode });
    }
});

sendMessageBtn?.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message && state.gameId) {
        socket.emit('chatMessage', {
            gameId: state.gameId,
            message: message
        });
        messageInput.value = '';
    }
});

messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessageBtn.click();
    }
});

copyGameIdBtn?.addEventListener('click', () => {
    if (state.gameId) {
        navigator.clipboard.writeText(state.gameId);
        alert('ID игры скопирован в буфер обмена');
    }
});

startGameBtn?.addEventListener('click', () => {
    if (state.gameId && state.isAdmin) {
        socket.emit('startGame', { gameId: state.gameId });
    }
});

endGameBtn?.addEventListener('click', () => {
    if (state.gameId) {
        socket.emit('endGame', { gameId: state.gameId });
        showScreen('home');
    }
});

// Navigation event listeners
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = item.dataset.screen;
        if (screen === 'game' && !state.gameId) {
            alert('Сначала создайте или присоединитесь к игре');
            return;
        }
        showScreen(screen);
    });
});

// Socket Events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = true;
    if (gameIdElement) gameIdElement.textContent = data.gameId;
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = false;
    if (gameIdElement) gameIdElement.textContent = data.gameId;
    showScreen('lobby');
});

socket.on('playerJoined', (data) => {
    state.players = data.players;
    updatePlayersList(data.players);
});

socket.on('gameStarted', (data) => {
    state.role = data.role;
    state.task = data.task;
    if (roleInfo) {
        roleInfo.textContent = `Ваша роль: ${data.role}`;
        if (data.role === 'Шпион') {
            roleInfo.textContent += '\nВаша задача - угадать задание других игроков!';
        } else {
            roleInfo.textContent += `\nВаше задание: ${data.task}`;
        }
    }
    showScreen('game');
});

socket.on('chatMessage', (data) => {
    addChatMessage(data);
});

socket.on('gameError', (data) => {
    alert(data.message);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize screens
    Object.values(screens).forEach(screen => {
        if (screen) screen.style.display = 'none';
    });
    showScreen('home');
});
