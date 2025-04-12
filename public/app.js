// Initialize Telegram WebApp with fallback
const WebApp = window.Telegram?.WebApp || {
    initData: '',
    initDataUnsafe: {
        user: {
            id: Math.floor(Math.random() * 1000000),
            first_name: 'Guest',
            last_name: 'User',
            username: 'guest' + Math.floor(Math.random() * 1000)
        }
    },
    ready: () => {},
    expand: () => {},
    close: () => {},
    showAlert: (message) => alert(message),
    showPopup: (params) => alert(params.message),
    sendData: (data) => console.log('Data sent:', data)
};

// Initialize the WebApp
WebApp.ready();
WebApp.expand();

// Initialize Socket.io
const socket = io();

// Application state
const state = {
    currentScreen: 'menu',
    gameId: null,
    players: [],
    role: null,
    location: null,
    timer: null
};

// User profile
const userProfile = {
    id: WebApp.initDataUnsafe.user.id,
    name: WebApp.initDataUnsafe.user.first_name + ' ' + (WebApp.initDataUnsafe.user.last_name || ''),
    avatar: 'default'
};

// Translations
const translations = {
    ru: {
        welcome: 'Добро пожаловать в Spy Game!',
        welcomeDescription: 'Выберите действие для начала игры',
        createGame: 'Создать игру',
        joinGame: 'Присоединиться',
        settings: 'Настройки',
        back: 'Назад',
        home: 'Главная',
        playersCount: 'Количество игроков',
        roundTime: 'Время раунда (минуты)',
        startGame: 'Начать игру',
        enterGameCode: 'Введите код игры',
        join: 'Присоединиться',
        soundEffects: 'Звуковые эффекты',
        notifications: 'Уведомления',
        theme: 'Тема',
        darkTheme: 'Темная',
        lightTheme: 'Светлая',
        lobby: 'Лобби',
        copyGameId: 'Копировать ID',
        waitingForPlayers: 'Ожидание игроков...',
        playerJoined: 'присоединился к игре',
        playerLeft: 'покинул игру',
        admin: 'Админ',
        gameIdCopied: 'ID игры скопирован',
        error: 'Произошла ошибка'
    },
    en: {
        welcome: 'Welcome to Spy Game!',
        welcomeDescription: 'Choose an action to start the game',
        createGame: 'Create Game',
        joinGame: 'Join Game',
        settings: 'Settings',
        back: 'Back',
        home: 'Home',
        playersCount: 'Number of players',
        roundTime: 'Round time (minutes)',
        startGame: 'Start Game',
        enterGameCode: 'Enter game code',
        join: 'Join',
        soundEffects: 'Sound Effects',
        notifications: 'Notifications',
        theme: 'Theme',
        darkTheme: 'Dark',
        lightTheme: 'Light',
        lobby: 'Lobby',
        copyGameId: 'Copy ID',
        waitingForPlayers: 'Waiting for players...',
        playerJoined: 'joined the game',
        playerLeft: 'left the game',
        admin: 'Admin',
        gameIdCopied: 'Game ID copied',
        error: 'An error occurred'
    },
    es: {
        welcome: '¡Bienvenido a Spy Game!',
        welcomeDescription: 'Elige una acción para comenzar el juego',
        createGame: 'Crear Juego',
        joinGame: 'Unirse',
        settings: 'Configuración',
        back: 'Atrás',
        home: 'Inicio',
        playersCount: 'Número de jugadores',
        roundTime: 'Tiempo de ronda (minutos)',
        startGame: 'Comenzar Juego',
        enterGameCode: 'Ingresa el código del juego',
        join: 'Unirse',
        soundEffects: 'Efectos de sonido',
        notifications: 'Notificaciones',
        theme: 'Tema',
        darkTheme: 'Oscuro',
        lightTheme: 'Claro',
        lobby: 'Sala de espera',
        copyGameId: 'Copiar ID',
        waitingForPlayers: 'Esperando jugadores...',
        playerJoined: 'se unió al juego',
        playerLeft: 'salió del juego',
        admin: 'Admin',
        gameIdCopied: 'ID del juego copiado',
        error: 'Se produjo un error'
    }
};

// DOM Elements
const elements = {
    sections: {
        home: document.getElementById('homeSection'),
        create: document.getElementById('createGameSection'),
        join: document.getElementById('joinGameSection'),
        settings: document.getElementById('settingsSection'),
        lobby: document.getElementById('lobbySection')
    },
    navItems: document.querySelectorAll('.nav-item'),
    themeToggle: document.getElementById('themeToggle'),
    languageSelect: document.getElementById('languageSelect'),
    themeSelect: document.getElementById('themeSelect'),
    soundToggle: document.getElementById('soundToggle'),
    notificationsToggle: document.getElementById('notificationsToggle'),
    gameId: document.getElementById('gameId'),
    playersList: document.getElementById('playersList'),
    copyGameIdBtn: document.getElementById('copyGameIdBtn')
};

// Functions
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    state.currentScreen = screenId;
}

function updateTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    const themeIcon = elements.themeToggle.querySelector('i');
    themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function updateLanguage(language) {
    state.currentLanguage = language;
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    
    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        element.textContent = translations[language][key];
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        element.placeholder = translations[language][key];
    });
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

function updatePlayersList(players) {
    elements.playersList.innerHTML = players.map(player => `
        <div class="player-item">
            <div class="player-avatar">${player.name.charAt(0)}</div>
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge" data-i18n="admin">Админ</span>' : ''}
        </div>
    `).join('');
    
    // Update translations for admin badges
    document.querySelectorAll('.admin-badge').forEach(badge => {
        badge.textContent = translations[state.currentLanguage].admin;
    });
}

// Event Listeners
elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen(item.dataset.section);
    });
});

elements.themeToggle.addEventListener('click', () => {
    const newTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
});

elements.languageSelect.addEventListener('change', (e) => {
    updateLanguage(e.target.value);
});

elements.themeSelect.addEventListener('change', (e) => {
    updateTheme(e.target.value);
});

elements.soundToggle.addEventListener('change', (e) => {
    state.settings.sound = e.target.checked;
    localStorage.setItem('sound', e.target.checked);
});

elements.notificationsToggle.addEventListener('change', (e) => {
    state.settings.notifications = e.target.checked;
    localStorage.setItem('notifications', e.target.checked);
});

document.getElementById('createGameBtn').addEventListener('click', () => {
    socket.emit('createGame', { player: userProfile });
});

document.getElementById('joinGameBtn').addEventListener('click', () => {
    showScreen('join');
});

document.getElementById('confirmJoinBtn').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value.trim();
    if (gameId) {
        socket.emit('joinGame', { gameId, player: userProfile });
    } else {
        WebApp.showAlert('Please enter a game ID');
    }
});

document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        try {
            socket.emit('chatMessage', {
                gameId: state.gameId,
                sender: userProfile.name,
                text: message
            });
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message');
        }
    }
});

document.querySelectorAll('.back-to-home').forEach(button => {
    button.addEventListener('click', () => {
        showScreen('home');
    });
});

elements.copyGameIdBtn.addEventListener('click', () => {
    if (state.gameId) {
        navigator.clipboard.writeText(state.gameId)
            .then(() => {
                alert(translations[state.currentLanguage].gameIdCopied || 'ID игры скопирован');
            })
            .catch(err => {
                console.error('Failed to copy game ID:', err);
            });
    }
});

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    document.getElementById('gameIdDisplay').textContent = data.gameId;
    updatePlayerList(data.players);
    showScreen('lobby');
});

socket.on('playerJoined', (data) => {
    updatePlayerList(data.players);
});

socket.on('playerLeft', (data) => {
    updatePlayerList(data.players);
});

socket.on('chatMessage', (message) => {
    addChatMessage(message);
});

socket.on('gameStarted', (data) => {
    state.role = data.role;
    state.location = data.location;
    document.getElementById('roleDisplay').textContent = data.role;
    document.getElementById('locationDisplay').textContent = data.location;
    showScreen('game');
});

socket.on('error', (error) => {
    WebApp.showAlert(error.message);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set initial theme
    updateTheme(state.currentTheme);
    
    // Set initial language
    updateLanguage(state.currentLanguage);
    
    // Load settings
    const savedSound = localStorage.getItem('sound');
    const savedNotifications = localStorage.getItem('notifications');
    
    if (savedSound !== null) {
        state.settings.sound = savedSound === 'true';
        elements.soundToggle.checked = state.settings.sound;
    }
    
    if (savedNotifications !== null) {
        state.settings.notifications = savedNotifications === 'true';
        elements.notificationsToggle.checked = state.settings.notifications;
    }
    
    // Show home section
    showScreen('home');
    
    // Add translations for admin badge
    translations.ru.admin = 'Админ';
    translations.en.admin = 'Admin';
    translations.es.admin = 'Admin';
    
    // Add translation for game ID copied message
    translations.ru.gameIdCopied = 'ID игры скопирован';
    translations.en.gameIdCopied = 'Game ID copied';
    translations.es.gameIdCopied = 'ID del juego copiado';
});