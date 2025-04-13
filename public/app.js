// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io with Android-specific settings
const socket = io({
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
});

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
    backToMenu: document.getElementById('backToMenuBtn'),
    startGame: document.getElementById('startGameBtn'),
    copyGameId: document.getElementById('copyGameIdBtn'),
    sendMessage: document.getElementById('sendMessageBtn'),
    endGame: document.getElementById('endGameBtn')
};

const inputs = {
    gameId: document.getElementById('gameCode'),
    message: document.getElementById('messageInput'),
    playersCount: document.getElementById('playersCount'),
    roundTime: document.getElementById('roundTime')
};

const lists = {
    players: document.getElementById('playersList'),
    chat: document.getElementById('chatMessages')
};

// Functions
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
            screen.style.display = 'none';
        }
    });

    // Show requested screen
    const screen = screens[screenName];
    if (screen) {
        screen.classList.add('active');
        screen.style.display = 'block';
        state.currentScreen = screenName;
        
        // Force reflow for Android
        screen.offsetHeight;
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
        }
    });
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

function addChatMessage(message, type = 'received', playerName = 'System') {
    if (!lists.chat) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = `
        <div class="message-sender">${playerName}</div>
        <div class="message-text">${message}</div>
    `;
    lists.chat.appendChild(messageElement);
    lists.chat.scrollTop = lists.chat.scrollHeight;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
    showScreen('home');

    // Navigation event listeners
    document.querySelectorAll('.nav-item').forEach(item => {
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

    // Button event listeners
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
            const playersCount = inputs.playersCount?.value || 4;
            const roundTime = inputs.roundTime?.value || 3;
            socket.emit('createGame', {
                playersCount,
                roundTime,
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
                    message,
                    playerName: tg.initDataUnsafe.user?.first_name || 'Player'
                });
                addChatMessage(message, 'sent', tg.initDataUnsafe.user?.first_name || 'Player');
                inputs.message.value = '';
            }
        });
    }

    if (buttons.endGame) {
        buttons.endGame.addEventListener('click', () => {
            socket.emit('endGame', { gameId: state.gameId });
            showScreen('home');
        });
    }
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
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    document.getElementById('gameId').textContent = data.gameId;
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
    addChatMessage(data.message, 'received', data.playerName);
});

socket.on('error', (error) => {
    alert(error.message);
});
