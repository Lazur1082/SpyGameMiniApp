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
    playerName: tg.initDataUnsafe?.user?.first_name || 'Player',
    userId: tg.initDataUnsafe?.user?.id || Math.random().toString(36).substring(7)
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
    Object.values(elements.screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
        }
    });
    
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
    elements.buttons.backFromLobby.addEventListener('click', () => {
        socket.emit('leaveGame', { gameId: state.gameId });
        showScreen('home');
    });
}

if (elements.buttons.confirmCreate) {
    elements.buttons.confirmCreate.addEventListener('click', () => {
        const playersCount = parseInt(elements.inputs.playersCount.value);
        const roundTime = parseInt(elements.inputs.roundTime.value);
        
        if (playersCount < 2 || playersCount > 10) {
            alert('Количество игроков должно быть от 2 до 10');
            return;
        }
        
        socket.emit('createGame', {
            playersCount,
            roundTime,
            playerName: state.playerName,
            userId: state.userId
        });
    });
}

if (elements.buttons.confirmJoin) {
    elements.buttons.confirmJoin.addEventListener('click', () => {
        const gameCode = elements.inputs.gameCode.value.trim();
        if (!gameCode) {
            alert('Пожалуйста, введите код игры');
            return;
        }
        
        socket.emit('joinGame', {
            gameId: gameCode,
            playerName: state.playerName,
            userId: state.userId
        });
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
    state.gameId = data.gameId;
    state.isAdmin = true;
    if (elements.gameId) {
        elements.gameId.textContent = data.gameId;
    }
    updatePlayersList(data.players);
    showScreen('lobby');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = data.isAdmin;
    if (elements.gameId) {
        elements.gameId.textContent = data.gameId;
    }
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
    alert(error.message || 'Произошла ошибка');
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
    
    // Mobile viewport fix
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
});
