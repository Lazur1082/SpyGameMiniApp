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
function showSection(sectionId) {
    Object.values(elements.sections).forEach(section => {
        section.classList.remove('active');
    });
    elements.sections[sectionId].classList.add('active');
    state.currentSection = sectionId;
    
    elements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });
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
        showSection(item.dataset.section);
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
    showSection('create');
});

document.getElementById('joinGameBtn').addEventListener('click', () => {
    showSection('join');
});

document.getElementById('startGameBtn').addEventListener('click', createGame);
document.getElementById('joinGameConfirmBtn').addEventListener('click', joinGame);

document.querySelectorAll('.back-to-home').forEach(button => {
    button.addEventListener('click', () => {
        showSection('home');
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
    if (data.error) {
        alert(data.error);
        return;
    }
    
    state.gameId = data.gameId;
    state.isAdmin = true;
    elements.gameId.textContent = data.gameId;
    showSection('lobby');
});

socket.on('gameJoined', (data) => {
    if (data.error) {
        alert(data.error);
        return;
    }
    
    state.gameId = data.gameId;
    state.isAdmin = false;
    elements.gameId.textContent = data.gameId;
    showSection('lobby');
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

socket.on('playerJoined', (data) => {
    if (state.settings.notifications) {
        alert(`${data.playerName} ${translations[state.currentLanguage].playerJoined}`);
    }
});

socket.on('playerLeft', (data) => {
    if (state.settings.notifications) {
        alert(`${data.playerName} ${translations[state.currentLanguage].playerLeft}`);
    }
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
    showSection('home');
    
    // Add translations for admin badge
    translations.ru.admin = 'Админ';
    translations.en.admin = 'Admin';
    translations.es.admin = 'Admin';
    
    // Add translation for game ID copied message
    translations.ru.gameIdCopied = 'ID игры скопирован';
    translations.en.gameIdCopied = 'Game ID copied';
    translations.es.gameIdCopied = 'ID del juego copiado';
});