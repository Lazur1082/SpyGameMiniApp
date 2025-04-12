// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize Socket.io
const socket = io();

// Application state
const state = {
    currentScreen: 'menu',
    gameId: null,
    playerName: tg.initDataUnsafe?.user?.first_name || 'Игрок',
    avatar: '👤',
    role: null,
    location: null,
    players: [],
    messages: []
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
        screen.style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'block';
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
    socket.emit('createGame', {
        playerName: state.playerName,
        avatar: state.avatar
    });
});

document.getElementById('joinGameBtn').addEventListener('click', () => {
    showScreen('join');
});

document.getElementById('confirmJoinBtn').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value.trim();
    if (gameId) {
        socket.emit('joinGame', {
            gameId,
            playerName: state.playerName,
            avatar: state.avatar
        });
    }
});

document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    if (text && state.gameId) {
        socket.emit('chatMessage', {
            gameId: state.gameId,
            sender: state.playerName,
            text
        });
        messageInput.value = '';
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
    showScreen('lobby');
    document.getElementById('gameIdDisplay').textContent = data.gameId;
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
    showScreen('game');
    document.getElementById('roleDisplay').textContent = `Ваша роль: ${data.role}`;
    document.getElementById('locationDisplay').textContent = `Локация: ${data.location}`;
});

socket.on('error', (data) => {
    alert(data.message);
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