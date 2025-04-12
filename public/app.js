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
    players: [],
    playerName: tg.initDataUnsafe?.user?.first_name || 'Player'
};

// DOM Elements
const elements = {
    screens: {
        home: document.getElementById('homeScreen'),
        create: document.getElementById('createGameScreen'),
        join: document.getElementById('joinGameScreen'),
        lobby: document.getElementById('lobbyScreen'),
        game: document.getElementById('gameScreen')
    },
    buttons: {
        createGame: document.getElementById('createGameBtn'),
        joinGame: document.getElementById('joinGameBtn'),
        confirmCreate: document.getElementById('confirmCreateBtn'),
        confirmJoin: document.getElementById('confirmJoinBtn'),
        backFromCreate: document.getElementById('backFromCreateBtn'),
        backFromJoin: document.getElementById('backFromJoinBtn'),
        backFromLobby: document.getElementById('backFromLobbyBtn'),
        copyGameId: document.getElementById('copyGameIdBtn'),
        startGame: document.getElementById('startGameBtn'),
        sendMessage: document.getElementById('sendMessageBtn')
    },
    inputs: {
        playersCount: document.getElementById('playersCount'),
        roundTime: document.getElementById('roundTime'),
        gameCode: document.getElementById('gameCode'),
        message: document.getElementById('messageInput')
    },
    gameId: document.getElementById('gameId'),
    playersList: document.getElementById('playersList'),
    chatMessages: document.getElementById('chatMessages'),
    roleInfo: document.getElementById('roleInfo'),
    gameTimer: document.getElementById('gameTimer'),
    navItems: document.querySelectorAll('.nav-item')
};

// Functions
function showScreen(screenId) {
    // Hide all screens
    Object.values(elements.screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
        }
    });
    
    // Show the requested screen
    const targetScreen = elements.screens[screenId];
    if (targetScreen) {
        targetScreen.classList.add('active');
        state.currentScreen = screenId;
    }
    
    // Update navigation
    elements.navItems.forEach(item => {
        if (item) {
            item.classList.remove('active');
            if (item.dataset.screen === screenId) {
                item.classList.add('active');
            }
        }
    });
}

function updatePlayersList(players) {
    elements.playersList.innerHTML = players.map(player => `
        <div class="player-item">
            <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
        </div>
    `).join('');
}

function addChatMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender === state.playerName ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <span class="message-sender">${message.sender}</span>
            <span class="message-text">${message.text}</span>
        </div>
    `;
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Event Listeners
elements.buttons.createGame.addEventListener('click', () => showScreen('create'));
elements.buttons.joinGame.addEventListener('click', () => showScreen('join'));
elements.buttons.backFromCreate.addEventListener('click', () => showScreen('home'));
elements.buttons.backFromJoin.addEventListener('click', () => showScreen('home'));
elements.buttons.backFromLobby.addEventListener('click', () => showScreen('home'));

elements.buttons.confirmCreate.addEventListener('click', () => {
    const playersCount = parseInt(elements.inputs.playersCount.value);
    const roundTime = parseInt(elements.inputs.roundTime.value);
    
    socket.emit('createGame', {
        playersCount,
        roundTime,
        playerName: state.playerName
    });
});

elements.buttons.confirmJoin.addEventListener('click', () => {
    const gameCode = elements.inputs.gameCode.value.trim();
    if (!gameCode) {
        alert('Пожалуйста, введите код игры');
        return;
    }
    
    socket.emit('joinGame', {
        gameId: gameCode,
        playerName: state.playerName
    });
});

elements.buttons.copyGameId.addEventListener('click', () => {
    navigator.clipboard.writeText(state.gameId).then(() => {
        alert('ID игры скопирован');
    });
});

elements.buttons.sendMessage.addEventListener('click', () => {
    const text = elements.inputs.message.value.trim();
    if (!text) return;
    
    socket.emit('chatMessage', {
        gameId: state.gameId,
        sender: state.playerName,
        text
    });
    
    elements.inputs.message.value = '';
});

elements.buttons.startGame.addEventListener('click', () => {
    if (!state.isAdmin) return;
    socket.emit('startGame', { gameId: state.gameId });
});

// Socket Events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = true;
    elements.gameId.textContent = data.gameId;
    updatePlayersList(data.players);
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = data.isAdmin;
    elements.gameId.textContent = data.gameId;
    updatePlayersList(data.players);
    showScreen('lobby');
});

socket.on('playerJoined', (data) => {
    updatePlayersList(data.players);
});

socket.on('playerLeft', (data) => {
    updatePlayersList(data.players);
});

socket.on('chatMessage', (message) => {
    addChatMessage(message);
});

socket.on('gameStarted', (data) => {
    elements.roleInfo.textContent = `Ваша роль: ${data.role}`;
    if (data.word) {
        elements.roleInfo.textContent += ` | Слово: ${data.word}`;
    }
    showScreen('game');
});

socket.on('gameError', (error) => {
    alert(error.message);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all screens are properly initialized
    Object.values(elements.screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
    
    // Show the home screen
    showScreen('home');
});