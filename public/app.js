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
    playerName: 'Игрок'
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
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
    
    const screen = screens[screenName];
    if (screen) {
        screen.style.display = 'block';
        state.currentScreen = screenName;
    }

    // Show game navigation when in game or lobby
    showGameNavigation(screenName === 'game' || screenName === 'lobby');
}

// Update players list
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.textContent = `${player.name}${player.isAdmin ? ' (Админ)' : ''}`;
        playersList.appendChild(playerElement);
    });
}

// Add chat message
function addChatMessage(message, type = 'received', playerName = 'System') {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.innerHTML = `
        <div class="message-sender">${playerName}</div>
        <div class="message-text">${message}</div>
    `;
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
            const playersCount = parseInt(inputs.playersCount?.value) || 4;
            if (playersCount < 2 || playersCount > 8) {
                alert('Количество игроков должно быть от 2 до 8');
                return;
            }
            socket.emit('createGame', {
                playersCount,
                playerName: state.playerName
            });
        });
    }

    // Game joining
    if (buttons.confirmJoin) {
        buttons.confirmJoin.addEventListener('click', () => {
            const gameId = inputs.gameId?.value?.trim();
            if (!gameId) {
                alert('Введите код игры');
                return;
            }
            socket.emit('joinGame', {
                gameId,
                playerName: state.playerName
            });
        });
    }

    // Start game
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

    // Exit game
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

    // Send message
    if (buttons.sendMessage) {
        buttons.sendMessage.addEventListener('click', () => {
            const message = inputs.message?.value?.trim();
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
    addChatMessage('Подключено к серверу', 'system');
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
    if (data.error) {
        alert(data.error);
        return;
    }
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
    state.role = data.role;
    state.location = data.location;
    document.getElementById('playerRole').textContent = state.role;
    document.getElementById('playerLocation').textContent = state.location;
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
