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
    location: null,
    playerName: tg.initDataUnsafe.user?.first_name || 'Player'
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
    leaveGame2: document.getElementById('leaveGameBtn2'),
    exitGame: document.getElementById('exitGameBtn'),
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

// Loading screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const app = document.querySelector('.app');
    if (loadingScreen && app) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            app.style.display = 'flex';
        }, 500);
    }
}

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
    if (gameNav) {
        gameNav.style.display = show ? 'flex' : 'none';
    }
}

// Screen management
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
            <div class="player-name">${player.name || 'Игрок'}</div>
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
            <div class="message-sender">${playerName || 'Игрок'}</div>
            <div class="message-text">${message || ''}</div>
        `;
    } else {
        messageElement.innerHTML = `<div class="message-text">${message || ''}</div>`;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
    showScreen('home');

    // Hide loading screen after 1 second
    setTimeout(hideLoadingScreen, 1000);

    // Theme toggle
    if (buttons.themeToggle) {
        buttons.themeToggle.addEventListener('click', toggleTheme);
    }

    // Navigation
    if (buttons.createGame) {
        buttons.createGame.addEventListener('click', () => showScreen('create'));
    }

    if (buttons.joinGame) {
        buttons.joinGame.addEventListener('click', () => showScreen('join'));
    }

    if (buttons.backToMenu) {
        buttons.backToMenu.addEventListener('click', () => showScreen('home'));
    }

    if (buttons.backToMenu2) {
        buttons.backToMenu2.addEventListener('click', () => showScreen('home'));
    }

    // Game creation
    if (buttons.confirmCreate) {
        buttons.confirmCreate.addEventListener('click', () => {
            const playersCount = inputs.playersCount?.value || 4;
            socket.emit('createGame', {
                playersCount,
                playerName: state.playerName
            });
        });
    }

    // Game joining
    if (buttons.confirmJoin) {
        buttons.confirmJoin.addEventListener('click', () => {
            const gameId = inputs.gameId?.value;
            if (gameId) {
                socket.emit('joinGame', {
                    gameId,
                    playerName: state.playerName
                });
            }
        });
    }

    // Game start
    if (buttons.startGame) {
        buttons.startGame.addEventListener('click', () => {
            if (state.isAdmin && state.gameId) {
                socket.emit('startGame', { gameId: state.gameId });
            }
        });
    }

    // Leave game
    if (buttons.leaveGame) {
        buttons.leaveGame.addEventListener('click', () => {
            if (state.gameId) {
                socket.emit('leaveGame', { gameId: state.gameId });
                state.gameId = null;
                state.isAdmin = false;
                showScreen('home');
            }
        });
    }

    if (buttons.leaveGame2) {
        buttons.leaveGame2.addEventListener('click', () => {
            if (state.gameId) {
                socket.emit('leaveGame', { gameId: state.gameId });
                state.gameId = null;
                state.isAdmin = false;
                showScreen('home');
            }
        });
    }

    if (buttons.exitGame) {
        buttons.exitGame.addEventListener('click', () => {
            if (state.gameId) {
                socket.emit('leaveGame', { gameId: state.gameId });
                state.gameId = null;
                state.isAdmin = false;
                showScreen('home');
            }
        });
    }

    // Chat
    if (buttons.sendMessage) {
        buttons.sendMessage.addEventListener('click', () => {
            const message = inputs.message?.value.trim();
            if (message && state.gameId) {
                socket.emit('chatMessage', {
                    gameId: state.gameId,
                    message,
                    playerName: state.playerName
                });
                addChatMessage(message, 'sent', state.playerName);
                inputs.message.value = '';
            }
        });
    }

    // Copy game ID
    if (buttons.copyGameId) {
        buttons.copyGameId.addEventListener('click', () => {
            if (state.gameId) {
                navigator.clipboard.writeText(state.gameId);
                alert('Код игры скопирован!');
            }
        });
    }

    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = item.getAttribute('data-screen');
            if (screen) {
                showScreen(screen);
            }
        });
    });

    // Handle Enter key in chat
    if (inputs.message) {
        inputs.message.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buttons.sendMessage.click();
            }
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
    addChatMessage(`${data.playerName || 'Игрок'} присоединился к игре`, 'system');
});

socket.on('playerLeft', (data) => {
    updatePlayersList(data.players);
    addChatMessage(`${data.playerName || 'Игрок'} покинул игру`, 'system');
});

socket.on('gameStarted', (data) => {
    const playerData = data.players.find(p => p.name === state.playerName);
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
