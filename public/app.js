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
        lightTheme: 'Светлая'
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
        lightTheme: 'Light'
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
        lightTheme: 'Claro'
    }
};

// DOM Elements
const elements = {
    sections: {
        home: document.getElementById('homeSection'),
        create: document.getElementById('createGameSection'),
        join: document.getElementById('joinGameSection'),
        settings: document.getElementById('settingsSection')
    },
    navItems: document.querySelectorAll('.nav-item'),
    themeToggle: document.getElementById('themeToggle'),
    languageSelect: document.getElementById('languageSelect'),
    themeSelect: document.getElementById('themeSelect'),
    soundToggle: document.getElementById('soundToggle'),
    notificationsToggle: document.getElementById('notificationsToggle')
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
    
    socket.emit('createGame', { playersCount, roundTime });
}

function joinGame() {
    const gameCode = document.getElementById('gameCode').value;
    socket.emit('joinGame', { gameCode });
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

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('gameCreated', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = true;
    showSection('lobby');
});

socket.on('gameJoined', (data) => {
    state.gameId = data.gameId;
    state.isAdmin = false;
    showSection('lobby');
});

socket.on('error', (error) => {
    alert(error.message);
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
});