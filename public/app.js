// Инициализация Telegram WebApp
let tg;
try {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
} catch (e) {
    // Создаем заглушку для работы на ПК
    tg = {
        initData: '',
        initDataUnsafe: { user: { username: 'Player' } },
        ready: () => {},
        expand: () => {},
        enableClosingConfirmation: () => {},
        showAlert: (message) => alert(message),
        showPopup: (params) => confirm(params.message),
        close: () => {},
        setHeaderColor: (color) => {},
        setBackgroundColor: (color) => {}
    };
}

// Настройки
const settings = {
    theme: 'light',
    sound: true
};

// Socket.io
const socket = io();

// DOM элементы
const elements = {
    // Кнопки
    settingsButton: document.getElementById('settingsButton'),
    backFromSettings: document.getElementById('backFromSettings'),
    showCreateGame: document.getElementById('showCreateGame'),
    showJoinGame: document.getElementById('showJoinGame'),
    createGame: document.getElementById('createGame'),
    joinGame: document.getElementById('joinGame'),
    backToMenu1: document.getElementById('backToMenu1'),
    backToMenu2: document.getElementById('backToMenu2'),
    backToMenu3: document.getElementById('backToMenu3'),
    startGame: document.getElementById('startGame'),
    endGame: document.getElementById('endGame'),
    newGame: document.getElementById('newGame'),
    sendMessage: document.getElementById('sendMessage'),

    // Экраны
    settingsScreen: document.getElementById('settingsScreen'),
    mainMenu: document.getElementById('mainMenu'),
    startScreen: document.getElementById('startScreen'),
    joinScreen: document.getElementById('joinScreen'),
    waitingScreen: document.getElementById('waitingScreen'),
    gameScreen: document.getElementById('gameScreen'),
    endScreen: document.getElementById('endScreen'),

    // Поля ввода
    playerName: document.getElementById('playerName'),
    playerNameJoin: document.getElementById('playerNameJoin'),
    gameId: document.getElementById('gameId'),
    messageInput: document.getElementById('messageInput'),
    currentGameId: document.getElementById('currentGameId'),
    playersList: document.getElementById('playersList'),
    roleInfo: document.getElementById('roleInfo'),
    chatMessages: document.getElementById('chatMessages'),
    gameResults: document.getElementById('gameResults'),

    // Настройки
    themeToggle: document.getElementById('themeToggle'),
    soundToggle: document.getElementById('soundToggle')
};

const buttons = {
    settings: document.getElementById('settingsButton'),
    backFromSettings: document.getElementById('backFromSettings'),
    showCreate: document.getElementById('showCreateGame'),
    showJoin: document.getElementById('showJoinGame'),
    create: document.getElementById('createGame'),
    join: document.getElementById('joinGame'),
    start: document.getElementById('startGame'),
    send: document.getElementById('sendMessage'),
    end: document.getElementById('endGame'),
    newGame: document.getElementById('newGame'),
    backToMenu1: document.getElementById('backToMenu1'),
    backToMenu2: document.getElementById('backToMenu2'),
    backToMenu3: document.getElementById('backToMenu3')
};

// Состояние приложения
const state = {
    theme: localStorage.getItem('theme') || 'light',
    sound: localStorage.getItem('sound') === 'true',
    gameId: null,
    playerName: null,
    role: null,
    players: [],
    messages: []
};

// Звуковые эффекты
const sounds = {
    message: new Audio('/sounds/message.mp3'),
    join: new Audio('/sounds/join.mp3'),
    leave: new Audio('/sounds/leave.mp3')
};

// Localization
const translations = {
    ru: {
        welcome: 'Добро пожаловать!',
        createGame: 'Создать игру',
        joinGame: 'Присоединиться',
        profile: 'Профиль',
        settings: 'Настройки',
        back: 'Назад',
        save: 'Сохранить',
        changeAvatar: 'Изменить',
        enterName: 'Введите имя',
        enterGameId: 'ID игры',
        enterMessage: 'Введите сообщение',
        send: 'Отправить',
        copy: 'Копировать',
        players: 'Игроки',
        startGame: 'Начать игру',
        leaveGame: 'Покинуть игру',
        endGame: 'Завершить игру',
        newGame: 'Новая игра',
        gameEnded: 'Игра завершена!'
    },
    en: {
        welcome: 'Welcome!',
        createGame: 'Create Game',
        joinGame: 'Join Game',
        profile: 'Profile',
        settings: 'Settings',
        back: 'Back',
        save: 'Save',
        changeAvatar: 'Change Avatar',
        enterName: 'Enter name',
        enterGameId: 'Game ID',
        enterMessage: 'Enter message',
        send: 'Send',
        copy: 'Copy',
        players: 'Players',
        startGame: 'Start Game',
        leaveGame: 'Leave Game',
        endGame: 'End Game',
        newGame: 'New Game',
        gameEnded: 'Game Ended!'
    },
    es: {
        welcome: '¡Bienvenido!',
        createGame: 'Crear Juego',
        joinGame: 'Unirse',
        profile: 'Perfil',
        settings: 'Ajustes',
        back: 'Atrás',
        save: 'Guardar',
        changeAvatar: 'Cambiar Avatar',
        enterName: 'Ingrese nombre',
        enterGameId: 'ID del Juego',
        enterMessage: 'Ingrese mensaje',
        send: 'Enviar',
        copy: 'Copiar',
        players: 'Jugadores',
        startGame: 'Iniciar Juego',
        leaveGame: 'Salir del Juego',
        endGame: 'Terminar Juego',
        newGame: 'Nuevo Juego',
        gameEnded: '¡Juego Terminado!'
    }
};

let currentLanguage = localStorage.getItem('language') || 'ru';

function updateLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    translatePage();
}

function translatePage() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
}

// User Profile
let userProfile = {
    name: localStorage.getItem('userName') || '',
    avatar: localStorage.getItem('userAvatar') || '/images/default-avatar.png'
};

function updateProfile(name, avatar) {
    userProfile.name = name;
    userProfile.avatar = avatar;
    localStorage.setItem('userName', name);
    localStorage.setItem('userAvatar', avatar);
    updateProfileUI();
}

function updateProfileUI() {
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) profileName.value = userProfile.name;
    if (profileAvatar) profileAvatar.src = userProfile.avatar;
}

// Функции
function showScreen(screenName) {
    console.log('Showing screen:', screenName);
    
    // Скрываем все экраны
    Object.values(elements).forEach(element => {
        if (element && element.classList && element.classList.contains('screen')) {
            element.classList.add('hidden');
        }
    });

    // Показываем нужный экран
    const targetScreen = elements[screenName + 'Screen'] || elements[screenName + 'Menu'];
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }
}

function updatePlayersList(players) {
    elements.playersList.innerHTML = '';
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase();
        playerItem.innerHTML = `
            <div class="player-avatar">${initials}</div>
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
        `;
        elements.playersList.appendChild(playerItem);
    });
}

function addChatMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender === state.playerName ? 'own' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    if (state.sound && message.sender !== state.playerName) {
        sounds.message.play().catch(() => {});
    }
}

function playSound(soundName) {
    if (!state.sound) return;
    
    try {
        const audio = new Audio(`/sounds/${soundName}.mp3`);
        audio.play().catch(error => {
            console.error('Error playing sound:', error);
        });
    } catch (error) {
        console.error('Error initializing sound:', error);
    }
}

// Функция обновления темы
function updateTheme(theme) {
    console.log('Updating theme to:', theme);
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Обновляем иконку в хедере
    const themeButton = document.getElementById('themeButton');
    if (themeButton) {
        themeButton.querySelector('.button-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    // Обновляем цвета в Telegram WebApp
    if (theme === 'dark') {
        tg.setHeaderColor('#212121');
        tg.setBackgroundColor('#212121');
    } else {
        tg.setHeaderColor('#2481cc');
        tg.setBackgroundColor('#ffffff');
    }
}

function updateSound(sound) {
    state.sound = sound;
    localStorage.setItem('sound', sound);
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    console.log('Initializing event listeners...');

    // Навигационные кнопки
    document.getElementById('settingsButton').addEventListener('click', () => {
        console.log('Settings button clicked');
        showScreen('settings');
    });

    document.getElementById('backFromSettings').addEventListener('click', () => {
        console.log('Back from settings clicked');
        showScreen('main');
    });

    document.getElementById('showCreateGame').addEventListener('click', () => {
        console.log('Show create game clicked');
        showScreen('start');
    });

    document.getElementById('showJoinGame').addEventListener('click', () => {
        console.log('Show join game clicked');
        showScreen('join');
    });

    document.getElementById('backToMenu1').addEventListener('click', () => {
        console.log('Back to menu 1 clicked');
        showScreen('main');
    });

    document.getElementById('backToMenu2').addEventListener('click', () => {
        console.log('Back to menu 2 clicked');
        showScreen('main');
    });

    document.getElementById('backToMenu3').addEventListener('click', () => {
        console.log('Back to menu 3 clicked');
        showScreen('main');
    });

    // Кнопки игры
    document.getElementById('createGame').addEventListener('click', () => {
        console.log('Create game clicked');
        const playerName = document.getElementById('playerName').value.trim();
        if (playerName) {
            createGame(playerName);
        } else {
            tg.showAlert('Пожалуйста, введите ваше имя');
        }
    });

    document.getElementById('joinGame').addEventListener('click', () => {
        console.log('Join game clicked');
        const playerName = document.getElementById('playerNameJoin').value.trim();
        const gameId = document.getElementById('gameId').value.trim();
        if (playerName && gameId) {
            joinGame(gameId, playerName);
        } else {
            tg.showAlert('Пожалуйста, введите имя и ID игры');
        }
    });

    document.getElementById('startGame').addEventListener('click', () => {
        console.log('Start game clicked');
        startGame();
    });

    document.getElementById('endGame').addEventListener('click', () => {
        console.log('End game clicked');
        endGame();
    });

    document.getElementById('newGame').addEventListener('click', () => {
        console.log('New game clicked');
        showScreen('main');
    });

    // Чат
    document.getElementById('sendMessage').addEventListener('click', () => {
        console.log('Send message clicked');
        const message = document.getElementById('messageInput').value.trim();
        if (message) {
            sendMessage(message);
            document.getElementById('messageInput').value = '';
        }
    });

    // Настройки
    document.getElementById('themeToggle').addEventListener('change', (e) => {
        console.log('Theme toggle changed:', e.target.checked);
        updateTheme(e.target.checked ? 'dark' : 'light');
    });

    document.getElementById('soundToggle').addEventListener('change', (e) => {
        console.log('Sound toggle changed:', e.target.checked);
        updateSound(e.target.checked);
    });

    // Обработка нажатия Enter в полях ввода
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = e.target.value.trim();
            if (message) {
                sendMessage(message);
                e.target.value = '';
            }
        }
    });

    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const playerName = e.target.value.trim();
            if (playerName) {
                createGame(playerName);
            }
        }
    });

    document.getElementById('playerNameJoin').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const playerName = e.target.value.trim();
            const gameId = document.getElementById('gameId').value.trim();
            if (playerName && gameId) {
                joinGame(gameId, playerName);
            }
        }
    });
}

// Обработчики событий Socket.io
socket.on('connect', () => {
    console.log('Подключено к серверу');
    showScreen('main');
});

socket.on('connect_error', (error) => {
    console.error('Ошибка подключения:', error);
    tg.showAlert('Ошибка подключения к серверу. Пожалуйста, попробуйте позже.');
});

socket.on('disconnect', () => {
    console.log('Отключено от сервера');
    tg.showAlert('Потеряно соединение с сервером. Пытаемся переподключиться...');
});

socket.on('error', (error) => {
    console.error('Ошибка:', error);
    tg.showPopup({
        title: 'Ошибка',
        message: error.message || 'Произошла ошибка',
        buttons: [{type: 'ok'}]
    });
});

socket.on('gameCreated', ({ gameId, player, players }) => {
    state.gameId = gameId;
    state.playerName = player.name;
    state.role = player.role;
    state.players = players;
    elements.currentGameId.textContent = gameId;
    updatePlayersList(players);
    showScreen('waiting');
    
    // Копируем ID игры в буфер обмена
    navigator.clipboard.writeText(gameId).catch(() => {});
    tg.showPopup({
        title: 'Игра создана',
        message: `ID игры: ${gameId}\nID скопирован в буфер обмена`,
        buttons: [{type: 'ok'}]
    });
});

socket.on('joinedGame', ({ gameId, player, players }) => {
    state.gameId = gameId;
    state.playerName = player.name;
    state.role = player.role;
    state.players = players;
    elements.currentGameId.textContent = gameId;
    updatePlayersList(players);
    showScreen('waiting');
    playSound('join');
});

socket.on('playerJoined', ({ players }) => {
    state.players = players;
    updatePlayersList(players);
    playSound('join');
});

socket.on('playerLeft', ({ players }) => {
    state.players = players;
    updatePlayersList(players);
    playSound('leave');
});

socket.on('gameStarted', ({ role, location }) => {
    state.role = role;
    elements.roleInfo.innerHTML = `
        <h3 class="role-title">${role === 'spy' ? 'Вы - Шпион! 🕵️‍♂️' : 'Ваша роль'}</h3>
        <p>${role === 'spy' ? 
            'Попытайтесь угадать локацию, слушая разговор других игроков' : 
            `Локация: ${location}<br>Не дайте шпиону догадаться!`}</p>
    `;
    elements.chatMessages.innerHTML = '';
    showScreen('game');
    playSound('start');
});

socket.on('chatMessage', ({ sender, text }) => {
    addChatMessage({ sender, text });
});

socket.on('gameEnded', ({ spy, location }) => {
    elements.gameResults.innerHTML = `
        <h3>Игра завершена!</h3>
        <p>Шпион: ${spy}</p>
        <p>Локация: ${location}</p>
    `;
    showScreen('end');
    playSound('end');
});

// Sound handling
function initializeSound() {
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.checked = state.sound;
        soundToggle.addEventListener('change', (e) => {
            state.sound = e.target.checked;
            localStorage.setItem('sound', state.sound);
            console.log('Sound setting changed:', state.sound);
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Инициализация обработчиков событий
    initializeEventListeners();
    
    // Установка начальной темы
    const savedTheme = localStorage.getItem('theme') || 'light';
    updateTheme(savedTheme);
    
    // Установка начальных настроек звука
    const savedSound = localStorage.getItem('sound') === 'true';
    updateSound(savedSound);
    
    // Показываем главное меню
    showScreen('main');
    
    console.log('App initialized successfully');
}); 