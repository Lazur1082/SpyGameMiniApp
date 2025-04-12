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
    gameId: null,
    playerName: null,
    role: null,
    players: [],
    messages: [],
    isInGame: false
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
        settings: 'Настройки',
        back: 'Назад',
        enterName: 'Введите имя',
        enterGameId: 'ID игры',
        enterMessage: 'Введите сообщение',
        send: 'Отправить',
        copy: 'Копировать',
        players: 'Игроки',
        startGame: 'Начать игру',
        endGame: 'Завершить игру',
        newGame: 'Новая игра',
        gameEnded: 'Игра завершена!'
    },
    en: {
        welcome: 'Welcome!',
        createGame: 'Create Game',
        joinGame: 'Join Game',
        settings: 'Settings',
        back: 'Back',
        enterName: 'Enter name',
        enterGameId: 'Game ID',
        enterMessage: 'Enter message',
        send: 'Send',
        copy: 'Copy',
        players: 'Players',
        startGame: 'Start Game',
        endGame: 'End Game',
        newGame: 'New Game',
        gameEnded: 'Game Ended!'
    },
    es: {
        welcome: '¡Bienvenido!',
        createGame: 'Crear Juego',
        joinGame: 'Unirse',
        settings: 'Ajustes',
        back: 'Atrás',
        enterName: 'Ingrese nombre',
        enterGameId: 'ID del Juego',
        enterMessage: 'Ingrese mensaje',
        send: 'Enviar',
        copy: 'Copiar',
        players: 'Jugadores',
        startGame: 'Iniciar Juego',
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
    avatar: localStorage.getItem('userAvatar') || '/images/default-avatar.png',
    gamesPlayed: parseInt(localStorage.getItem('gamesPlayed')) || 0,
    gamesWon: parseInt(localStorage.getItem('gamesWon')) || 0
};

// Функция обновления темы
function updateTheme(theme) {
    console.log('Updating theme to:', theme);
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Обновляем иконку в хедере
    const themeButton = document.getElementById('themeButton');
    if (themeButton) {
        const icon = themeButton.querySelector('.button-icon');
        if (icon) {
            icon.className = `fas fa-${theme === 'dark' ? 'sun' : 'moon'} button-icon`;
        }
    }
    
    // Обновляем цвета в Telegram WebApp
    if (theme === 'dark') {
        tg.setHeaderColor('#36393f');
        tg.setBackgroundColor('#36393f');
    } else {
        tg.setHeaderColor('#ffffff');
        tg.setBackgroundColor('#ffffff');
    }
}

// Функция обновления профиля
function updateProfile(name, avatar) {
    console.log('Updating profile:', { name, avatar });
    if (!name || !avatar) {
        console.error('Invalid profile data');
        return;
    }
    
    userProfile.name = name;
    userProfile.avatar = avatar;
    
    // Сохраняем в localStorage
    localStorage.setItem('userName', name);
    localStorage.setItem('userAvatar', avatar);
    
    // Обновляем UI
    updateProfileUI();
}

function updateProfileUI() {
    console.log('Updating profile UI');
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    const headerAvatar = document.getElementById('headerAvatar');
    const gamesPlayed = document.getElementById('gamesPlayed');
    const gamesWon = document.getElementById('gamesWon');
    
    if (profileName) {
        profileName.value = userProfile.name;
        console.log('Updated profile name:', userProfile.name);
    }
    if (profileAvatar) {
        profileAvatar.src = userProfile.avatar;
        console.log('Updated profile avatar:', userProfile.avatar);
    }
    if (headerAvatar) {
        headerAvatar.src = userProfile.avatar;
        console.log('Updated header avatar:', userProfile.avatar);
    }
    if (gamesPlayed) {
        gamesPlayed.textContent = userProfile.gamesPlayed;
        console.log('Updated games played:', userProfile.gamesPlayed);
    }
    if (gamesWon) {
        gamesWon.textContent = userProfile.gamesWon;
        console.log('Updated games won:', userProfile.gamesWon);
    }
}

function updateGameStats(played, won) {
    userProfile.gamesPlayed = played;
    userProfile.gamesWon = won;
    localStorage.setItem('gamesPlayed', played);
    localStorage.setItem('gamesWon', won);
    updateProfileUI();
}

function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase();
        playerItem.innerHTML = `
            <div class="player-avatar">${initials}</div>
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
        `;
        playersList.appendChild(playerItem);
    });
}

// Функция добавления сообщения в чат
function addChatMessage(message) {
    console.log('Adding chat message:', message);
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.isOwn ? 'own' : ''}`;
    
    let messageContent = `
        <div class="message-sender">${message.sender}</div>
    `;
    
    if (message.image) {
        messageContent += `
            <div class="message-image">
                <img src="${message.image}" alt="Message image">
            </div>
        `;
    }
    
    messageContent += `
        <div class="message-text">${message.text}</div>
    `;
    
    messageDiv.innerHTML = messageContent;
    
    try {
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Воспроизводим звук только для входящих сообщений
        if (!message.isOwn && state.sound) {
            playSound('message');
        }
    } catch (error) {
        console.error('Error adding message to chat:', error);
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

// Инициализация обработчиков событий
function initializeEventListeners() {
    console.log('Initializing event listeners...');

    // Обработчик кнопки темы
    const themeButton = document.getElementById('themeButton');
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            const newTheme = state.theme === 'dark' ? 'light' : 'dark';
            updateTheme(newTheme);
        });
    }

    // Обработчик загрузки аватара
    const avatarUpload = document.getElementById('avatarUpload');
    const changeAvatar = document.getElementById('changeAvatar');
    if (avatarUpload && changeAvatar) {
        changeAvatar.addEventListener('click', () => {
            avatarUpload.click();
        });

        avatarUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // Проверяем тип файла
                if (!file.type.startsWith('image/')) {
                    tg.showAlert('Пожалуйста, выберите изображение');
                    return;
                }

                // Проверяем размер файла (максимум 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    tg.showAlert('Размер файла не должен превышать 2MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    updateProfile(userProfile.name, e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Обработчики навигации
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const screenId = button.getAttribute('data-screen');
            if (screenId) {
                showScreen(screenId);
            }
        });
    });

    // Обработчик сохранения имени
    const saveNameButton = document.getElementById('saveName');
    if (saveNameButton) {
        saveNameButton.addEventListener('click', () => {
            const nameInput = document.getElementById('profileName');
            if (nameInput) {
                const newName = nameInput.value.trim();
                if (newName) {
                    updateProfile(newName, userProfile.avatar);
                }
            }
        });
    }
}

// Обработчики событий Socket.io
socket.on('connect', () => {
    console.log('Connected to server');
    showScreen('mainMenu');
    
    // Отправляем приветственное сообщение с изображением
    const welcomeMessage = {
        text: '🎮 Добро пожаловать в игру "Шпион"!\n\n🔍 В этой игре один из игроков становится шпионом, а остальные знают локацию.\n🎯 Задача шпиона - угадать локацию, а остальных - не дать ему это сделать.\n\n📱 Для начала игры нажмите кнопку ниже:',
        image: '/images/SpyGameBannerWelcome.png'
    };
    
    addChatMessage({
        sender: 'Система',
        text: welcomeMessage.text,
        image: welcomeMessage.image
    });
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    tg.showAlert('Ошибка подключения к серверу. Пожалуйста, проверьте интернет-соединение.');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    tg.showAlert('Потеряно соединение с сервером. Пытаемся переподключиться...');
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    tg.showAlert(error.message || 'Произошла ошибка');
});

socket.on('gameJoined', (data) => {
    console.log('Game joined:', data);
    state.gameId = data.gameId;
    state.players = data.players;
    showScreen('waitingScreen');
    updatePlayersList(data.players);
    document.getElementById('currentGameId').textContent = data.gameId;
});

socket.on('gameUpdated', (data) => {
    console.log('Game updated:', data);
    state.players = data.players;
    updatePlayersList(data.players);
});

socket.on('gameCreated', (data) => {
    console.log('Game created:', data);
    state.gameId = data.gameId;
    showScreen('waitingScreen');
    updatePlayersList([{ name: userProfile.name, isAdmin: true }]);
    document.getElementById('currentGameId').textContent = data.gameId;
});

socket.on('playerJoined', (data) => {
    console.log('Player joined:', data);
    const players = [...state.players, { name: data.playerName, isAdmin: false }];
    updatePlayersList(players);
});

socket.on('gameStarted', (data) => {
    console.log('Game started:', data);
    state.role = data.role;
    state.isInGame = true;
    showScreen('gameScreen');
    
    // Отключаем навигацию
    const bottomNav = document.querySelector('.bottom-navigation');
    if (bottomNav) {
        bottomNav.style.display = 'none';
    }
    
    const header = document.querySelector('.header');
    if (header) {
        header.style.display = 'none';
    }
});

socket.on('chatMessage', (data) => {
    console.log('Received chat message:', data);
    if (data.sender !== userProfile.name) {
        addChatMessage({
            sender: data.sender,
            text: data.text,
            isOwn: false
        });
    }
});

socket.on('gameEnded', ({ spy, location }) => {
    state.isInGame = false;
    elements.gameResults.innerHTML = `
        <h3>Игра завершена!</h3>
        <p>Шпион: ${spy}</p>
        <p>Локация: ${location}</p>
    `;
    showScreen('endScreen');
    playSound('end');
    
    // Включаем навигацию
    const bottomNav = document.querySelector('.bottom-navigation');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
    }
    
    const header = document.querySelector('.header');
    if (header) {
        header.style.display = 'flex';
    }
});

socket.on('joinError', (error) => {
    console.error('Join error:', error);
    tg.showAlert(error.message || 'Ошибка присоединения к игре');
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

// Функция создания игры
function createGame() {
    console.log('Creating game...');
    if (!userProfile.name) {
        console.error('Player name is required');
        const defaultName = tg?.initDataUnsafe?.user?.username || 'Игрок';
        updateProfile(defaultName, userProfile.avatar);
    }
    
    socket.emit('createGame', {
        playerName: userProfile.name,
        user: {
            id: socket.id,
            name: userProfile.name,
            avatar: userProfile.avatar
        }
    });
}

// Функция присоединения к игре
function joinGame() {
    console.log('Joining game...');
    const gameId = document.getElementById('gameId').value.trim();
    if (!gameId) {
        console.error('Game ID is required');
        tg.showAlert('Введите ID игры');
        return;
    }
    
    if (!userProfile.name) {
        console.error('Player name is required');
        const defaultName = tg?.initDataUnsafe?.user?.username || 'Игрок';
        updateProfile(defaultName, userProfile.avatar);
    }
    
    console.log('Emitting joinGame event with:', {
        gameId: gameId,
        user: {
            id: socket.id,
            name: userProfile.name,
            avatar: userProfile.avatar
        }
    });
    
    socket.emit('joinGame', {
        gameId: gameId,
        user: {
            id: socket.id,
            name: userProfile.name,
            avatar: userProfile.avatar
        }
    });
}

// Функция начала игры
function startGame() {
    console.log('Starting game');
    socket.emit('startGame');
}

// Функция завершения игры
function endGame() {
    console.log('Ending game');
    socket.emit('endGame');
}

// Обработка команд чата
function handleCommand(command) {
    switch(command) {
        case '/start':
            const startMessage = {
                text: '🎮 Добро пожаловать в игру "Шпион"!\n\n🔍 В этой игре один из игроков становится шпионом, а остальные знают локацию.\n🎯 Задача шпиона - угадать локацию, а остальных - не дать ему это сделать.\n\n📱 Для начала игры нажмите кнопку ниже:',
                image: '/images/SpyGameBannerWelcome.png'
            };
            addChatMessage({
                sender: 'Система',
                text: startMessage.text,
                image: startMessage.image
            });
            break;
        case '/help':
            addChatMessage({
                sender: 'Система',
                text: '📖 Доступные команды:\n/start - Начать игру\n/help - Показать это сообщение'
            });
            break;
    }
}

// Функция отправки сообщения
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
        console.error('Message input not found');
        return;
    }

    const message = messageInput.value.trim();
    if (!message) {
        console.log('Empty message, not sending');
        return;
    }

    console.log('Sending message:', message);
    
    try {
        // Добавляем сообщение в чат сразу
        addChatMessage({
            sender: userProfile.name,
            text: message,
            isOwn: true
        });
        
        // Очищаем поле ввода
        messageInput.value = '';
        
        // Отправляем сообщение на сервер
        socket.emit('chatMessage', {
            gameId: state.gameId,
            sender: userProfile.name,
            text: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        tg.showAlert('Ошибка отправки сообщения. Попробуйте еще раз.');
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Инициализация обработчиков событий
    initializeEventListeners();
    
    // Установка начального языка
    const savedLanguage = localStorage.getItem('language') || 'ru';
    updateLanguage(savedLanguage);
    
    // Установка начальной темы
    const savedTheme = localStorage.getItem('theme') || 'light';
    updateTheme(savedTheme);
    
    // Установка имени игрока, если оно не установлено
    if (!userProfile.name) {
        const defaultName = tg?.initDataUnsafe?.user?.username || 'Игрок';
        updateProfile(defaultName, userProfile.avatar);
    }
    
    // Обновление профиля
    updateProfileUI();
    
    // Показываем главное меню
    showScreen('mainMenu');
    console.log('Main menu should be visible now');
    
    console.log('App initialized successfully');
}); 