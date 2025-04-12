// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io
const socket = io();

// Application state
const state = {
    currentSection: 'home',
    currentTheme: localStorage.getItem('theme') || 'dark',
    currentLanguage: localStorage.getItem('language') || 'ru',
    gameId: null,
    isAdmin: false,
    players: [],
    playerName: tg.initDataUnsafe.user?.first_name || 'Player',
    settings: {
        sound: true,
        notifications: true
    }
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
    gameTimer: document.getElementById('gameTimer')
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
}

function updatePlayersList(players) {
    if (elements.playersList) {
        elements.playersList.innerHTML = players.map(player => `
            <div class="player-item">
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <span class="player-name">${player.name}</span>
                ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
            </div>
        `).join('');
    }
}

function addChatMessage(message) {
    if (elements.chatMessages) {
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
}

function createGame() {
    const playersCount = parseInt(document.getElementById('playersCount').value);
    const roundTime = parseInt(document.getElementById('roundTime').value);
    
    socket.emit('createGame', { 
        playersCount, 
        roundTime,
        playerName: state.playerName
    });
}

function joinGame() {
    const gameCode = document.getElementById('gameCode').value.trim();
    if (!gameCode) {
        alert(translations[state.currentLanguage].enterGameCode);
        return;
    }
    
    socket.emit('joinGame', { 
        gameId: gameCode,
        playerName: state.playerName
    });
}

// Event Listeners
if (elements.buttons.createGame) {
    elements.buttons.createGame.addEventListener('click', () => showScreen('create'));
}

if (elements.buttons.joinGame) {
    elements.buttons.joinGame.addEventListener('click', () => showScreen('join'));
}

if (elements.buttons.backFromCreate) {
    elements.buttons.backFromCreate.addEventListener('click', () => showScreen('home'));
}

if (elements.buttons.backFromJoin) {
    elements.buttons.backFromJoin.addEventListener('click', () => showScreen('home'));
}

if (elements.buttons.backFromLobby) {
    elements.buttons.backFromLobby.addEventListener('click', () => showScreen('home'));
}

if (elements.buttons.confirmCreate) {
    elements.buttons.confirmCreate.addEventListener('click', () => {
        createGame();
    });
}

if (elements.buttons.confirmJoin) {
    elements.buttons.confirmJoin.addEventListener('click', () => {
        joinGame();
    });
}

if (elements.buttons.copyGameId) {
    elements.buttons.copyGameId.addEventListener('click', () => {
        navigator.clipboard.writeText(state.gameId).then(() => {
            alert('ID игры скопирован');
        });
    });
}

if (elements.buttons.sendMessage) {
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
}

if (elements.buttons.startGame) {
    elements.buttons.startGame.addEventListener('click', () => {
        if (!state.isAdmin) return;
        socket.emit('startGame', { gameId: state.gameId });
    });
}

// Socket Events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    if (data.error) {
        alert(data.error);
        return;
    }
    
    state.gameId = data.gameId;
    state.isAdmin = true;
    elements.gameId.textContent = data.gameId;
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    if (data.error) {
        alert(data.error);
        return;
    }
    
    state.gameId = data.gameId;
    state.isAdmin = false;
    elements.gameId.textContent = data.gameId;
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
    if (elements.roleInfo) {
        elements.roleInfo.textContent = `Ваша роль: ${data.role}`;
        if (data.word) {
            elements.roleInfo.textContent += ` | Слово: ${data.word}`;
        }
    }
    showScreen('game');
});

socket.on('gameError', (error) => {
    alert(error.message);
});

socket.on('error', (error) => {
    alert(error.message || translations[state.currentLanguage].error);
});

socket.on('updatePlayers', (data) => {
    if (data.error) {
        alert(data.error);
        return;
    }
    
    state.players = data.players;
    updatePlayersList(data.players);
    
    // Show/hide start game button based on admin status
    const startGameBtn = document.getElementById('startGameBtn');
    startGameBtn.style.display = state.isAdmin ? 'block' : 'none';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
});