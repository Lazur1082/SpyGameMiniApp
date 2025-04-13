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
    players: [],
    role: null,
    location: null
};

// DOM elements
const screens = {
    home: document.getElementById('homeScreen'),
    create: document.getElementById('createGameScreen'),
    join: document.getElementById('joinGameScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen')
};

const buttons = {
    createGame: document.getElementById('createGameBtn'),
    joinGame: document.getElementById('joinGameBtn'),
    confirmCreate: document.getElementById('confirmCreateBtn'),
    confirmJoin: document.getElementById('confirmJoinBtn'),
    backToMenu: document.getElementById('backToMenuBtn'),
    backToMenu2: document.getElementById('backToMenuBtn2'),
    startGame: document.getElementById('startGameBtn'),
    copyGameId: document.getElementById('copyGameIdBtn'),
    sendMessage: document.getElementById('sendMessageBtn'),
    leaveGame: document.getElementById('leaveGameBtn'),
    themeToggle: document.getElementById('themeToggle')
};

const inputs = {
    gameId: document.getElementById('gameCode'),
    message: document.getElementById('messageInput'),
    playersCount: document.getElementById('playersCount')
};

const lists = {
    players: document.getElementById('playersList'),
    chat: document.getElementById('chatMessages')
};

// Theme handling
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    buttons.themeToggle.innerHTML = newTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

// Game navigation
function showGameNavigation(show) {
    const gameNav = document.getElementById('gameNav');
    gameNav.style.display = show ? 'flex' : 'none';
}

// Screen management
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    });

    const screen = screens[screenName];
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        state.currentScreen = screenName;
    }

    // Show game navigation when in game or lobby
    showGameNavigation(screenName === 'game' || screenName === 'lobby');
}

// Players list management
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

// Chat management
function addChatMessage(message, type = 'received', playerName = 'System') {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    if (playerName !== 'System') {
        messageElement.innerHTML = `
            <div class="message-sender">${playerName}</div>
            <div class="message-text">${message}</div>
        `;
    } else {
        messageElement.innerHTML = `<div class="message-text">${message}</div>`;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    buttons.themeToggle.addEventListener('click', toggleTheme);

    // Navigation
    buttons.createGame.addEventListener('click', () => showScreen('create'));
    buttons.joinGame.addEventListener('click', () => showScreen('join'));
    buttons.backToMenu.addEventListener('click', () => showScreen('home'));
    buttons.backToMenu2.addEventListener('click', () => showScreen('home'));

    // Game creation
    buttons.confirmCreate.addEventListener('click', () => {
        const playersCount = inputs.playersCount.value;
        socket.emit('createGame', {
            playersCount,
            playerName: tg.initDataUnsafe.user?.first_name || 'Player'
        });
    });

    // Game joining
    buttons.confirmJoin.addEventListener('click', () => {
        const gameId = inputs.gameId.value;
        if (gameId) {
            socket.emit('joinGame', {
                gameId,
                playerName: tg.initDataUnsafe.user?.first_name || 'Player'
            });
        }
    });

    // Game start
    buttons.startGame.addEventListener('click', () => {
        if (state.isAdmin) {
            socket.emit('startGame', { gameId: state.gameId });
        }
    });

    // Leave game
    buttons.leaveGame.addEventListener('click', () => {
        if (state.gameId) {
            socket.emit('leaveGame', { gameId: state.gameId });
            state.gameId = null;
            state.isAdmin = false;
            showScreen('home');
        }
    });

    // Chat
    buttons.sendMessage.addEventListener('click', () => {
        const message = inputs.message.value.trim();
        if (message && state.gameId) {
            socket.emit('chatMessage', {
                gameId: state.gameId,
                message,
                playerName: tg.initDataUnsafe.user?.first_name || 'Player'
            });
            addChatMessage(message, 'sent', tg.initDataUnsafe.user?.first_name || 'Player');
            inputs.message.value = '';
        }
    });

    // Copy game ID
    buttons.copyGameId.addEventListener('click', () => {
        if (state.gameId) {
            navigator.clipboard.writeText(state.gameId);
            alert('Код игры скопирован!');
        }
    });

    // Initialize screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
    showScreen('home');
});

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = true;
    document.getElementById('gameId').textContent = data.gameId;
    updatePlayersList(data.players);
    showScreen('lobby');
    addChatMessage('Вы создали игру!', 'system');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    document.getElementById('gameId').textContent = data.gameId;
    updatePlayersList(data.players);
    showScreen('lobby');
    addChatMessage('Вы присоединились к игре!', 'system');
});

socket.on('playerJoined', (data) => {
    updatePlayersList(data.players);
    addChatMessage(`${data.playerName} присоединился к игре`, 'system');
});

socket.on('playerLeft', (data) => {
    updatePlayersList(data.players);
    addChatMessage(`${data.playerName} покинул игру`, 'system');
});

socket.on('gameStarted', (data) => {
    const playerData = data.players.find(p => p.name === (tg.initDataUnsafe.user?.first_name || 'Player'));
    if (playerData) {
        state.role = playerData.role;
        state.location = playerData.location;
        document.getElementById('playerRole').textContent = state.role;
        if (state.role === 'Мирный житель') {
            document.getElementById('playerLocation').textContent = state.location;
        } else {
            document.getElementById('playerLocation').textContent = 'Неизвестно';
        }
    }
    showScreen('game');
    addChatMessage('Игра началась!', 'system');
});

socket.on('chatMessage', (data) => {
    addChatMessage(data.message, 'received', data.playerName);
});

socket.on('gameEnded', () => {
    state.gameId = null;
    state.isAdmin = false;
    showScreen('home');
    addChatMessage('Игра завершена!', 'system');
});

socket.on('error', (error) => {
    alert(error.message);
});
