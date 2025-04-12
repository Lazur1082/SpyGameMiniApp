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
    isInGame: false,
    isAdmin: false
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

// Профиль пользователя
const userProfile = {
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

// Функция показа экрана
function showScreen(screenId) {
    console.log('Showing screen:', screenId);
    
    if (state.isInGame && !['gameScreen', 'waitingScreen'].includes(screenId)) {
        console.log('Navigation blocked during gameplay');
        return;
    }
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }
}

// Функция обновления профиля
function updateProfile(name, avatar) {
    console.log('Updating profile:', { name, avatar });
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
        playerItem.innerHTML = `
            <div class="player-avatar">
                <img src="${userProfile.avatar}" alt="${player.name}">
            </div>
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
        `;
        playersList.appendChild(playerItem);
    });
}

// Функция добавления сообщения в чат
function addChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

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
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

// Функция для загрузки аватара
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

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
    reader.onload = function(e) {
        const base64Image = e.target.result;
        updateProfile(userProfile.name, base64Image);
        
        // Обновляем выбранный аватар
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    };
    reader.readAsDataURL(file);
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    console.log('Initializing event listeners...');

    // Сохранение ника
    const saveNicknameBtn = document.getElementById('saveNickname');
    if (saveNicknameBtn) {
        saveNicknameBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('profileName');
            if (nameInput) {
                const newName = nameInput.value.trim();
                if (newName) {
                    updateProfile(newName, userProfile.avatar);
                    console.log('Nickname saved:', newName);
                }
            }
        });
    }

    // Создание игры
    const createGameBtn = document.getElementById('createGame');
    if (createGameBtn) {
        createGameBtn.addEventListener('click', () => {
            console.log('Create game button clicked');
            createGame();
        });
    } else {
        console.error('Create game button not found');
    }

    // Присоединение к игре
    const joinGameBtn = document.getElementById('joinGame');
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            console.log('Join game button clicked');
            joinGame();
        });
    } else {
        console.error('Join game button not found');
    }

    // Навигация
    const mainMenuNav = document.getElementById('mainMenuNav');
    if (mainMenuNav) {
        mainMenuNav.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Main menu nav clicked');
            showScreen('mainMenu');
        });
    }

    const createGameNav = document.getElementById('createGameNav');
    if (createGameNav) {
        createGameNav.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Create game nav clicked');
            showScreen('startScreen');
        });
    }

    const joinGameNav = document.getElementById('joinGameNav');
    if (joinGameNav) {
        joinGameNav.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Join game nav clicked');
            showScreen('joinScreen');
        });
    }

    // Профиль
    const profileButton = document.getElementById('profileButton');
    if (profileButton) {
        profileButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Profile button clicked');
            showScreen('profileScreen');
        });
    }

    const profileNav = document.getElementById('profileNav');
    if (profileNav) {
        profileNav.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Profile nav clicked');
            showScreen('profileScreen');
        });
    }

    // Настройки
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Settings button clicked');
            showScreen('settingsScreen');
        });
    }

    // Кнопки "Назад"
    const backButtons = [
        { id: 'backFromProfile', screen: 'mainMenu' },
        { id: 'backFromSettings', screen: 'mainMenu' },
        { id: 'backToMenu1', screen: 'mainMenu' },
        { id: 'backToMenu2', screen: 'mainMenu' },
        { id: 'backToMenu3', screen: 'mainMenu' }
    ];

    backButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`${button.id} clicked`);
                showScreen(button.screen);
            });
        }
    });

    // Чат
    const sendMessageBtn = document.getElementById('sendMessage');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim();
            
            if (message) {
                if (message.startsWith('/')) {
                    handleCommand(message);
                } else {
                    socket.emit('chatMessage', {
                        sender: userProfile.name,
                        text: message
                    });
                }
                messageInput.value = '';
            }
        });
    }

    // Обработка Enter в полях ввода
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = e.target.value.trim();
                if (message) {
                    if (message.startsWith('/')) {
                        handleCommand(message);
                    } else {
                        socket.emit('chatMessage', {
                            sender: userProfile.name,
                            text: message
                        });
                    }
                    e.target.value = '';
                }
            }
        });
    }

    const gameIdInput = document.getElementById('gameId');
    if (gameIdInput) {
        gameIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinGame();
            }
        });
    }
}

// Обработчики событий Socket.io
function setupSocketHandlers() {
    socket.on('connect', () => {
        console.log('Connected to server');
        showScreen('mainMenu');
        
        // Отправляем приветственное сообщение
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

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        tg.showAlert(error.message || 'Произошла ошибка');
    });

    socket.on('gameCreated', (data) => {
        console.log('Game created:', data);
        state.gameId = data.gameId;
        state.players = [{ name: userProfile.name, isAdmin: true }];
        state.isAdmin = true;
        showScreen('waitingScreen');
        updatePlayersList(state.players);
        document.getElementById('currentGameId').textContent = data.gameId;
        
        addChatMessage({
            sender: 'Система',
            text: `Игра ${data.gameId} создана. Ожидаем игроков...`
        });
    });

    socket.on('gameJoined', (data) => {
        console.log('Game joined:', data);
        state.gameId = data.gameId;
        state.players = data.players;
        state.isAdmin = false;
        showScreen('waitingScreen');
        updatePlayersList(data.players);
        document.getElementById('currentGameId').textContent = data.gameId;
        
        addChatMessage({
            sender: 'Система',
            text: `Вы присоединились к игре ${data.gameId}`
        });
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        if (!state.players) state.players = [];
        state.players.push({ name: data.playerName, isAdmin: false });
        updatePlayersList(state.players);
        
        addChatMessage({
            sender: 'Система',
            text: `${data.playerName} присоединился к игре`
        });
    });

    socket.on('chatMessage', (data) => {
        console.log('Received chat message:', data);
        addChatMessage({
            sender: data.sender,
            text: data.text,
            isOwn: data.sender === userProfile.name
        });
    });

    socket.on('gameStarted', (data) => {
        console.log('Game started:', data);
        state.role = data.role;
        state.isInGame = true;
        showScreen('gameScreen');
        
        // Отключаем навигацию
        document.querySelector('.bottom-navigation').style.display = 'none';
        document.querySelector('.header').style.display = 'none';
        
        addChatMessage({
            sender: 'Система',
            text: `Игра началась! Ваша роль: ${data.role}`
        });
    });

    socket.on('gameEnded', (data) => {
        console.log('Game ended:', data);
        state.isInGame = false;
        showScreen('endScreen');
        
        // Включаем навигацию
        document.querySelector('.bottom-navigation').style.display = 'flex';
        document.querySelector('.header').style.display = 'flex';
        
        addChatMessage({
            sender: 'Система',
            text: `Игра завершена! Шпион: ${data.spy}, Локация: ${data.location}`
        });
    });
}

// Функции управления игрой
function createGame() {
    console.log('Creating game...');
    if (!userProfile.name) {
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

function joinGame() {
    console.log('Joining game...');
    const gameId = document.getElementById('gameId').value.trim();
    if (!gameId) {
        tg.showAlert('Введите ID игры');
        return;
    }
    
    if (!userProfile.name) {
        const defaultName = tg?.initDataUnsafe?.user?.username || 'Игрок';
        updateProfile(defaultName, userProfile.avatar);
    }
    
    socket.emit('joinGame', {
        gameId: gameId,
        playerName: userProfile.name,
        user: {
            id: socket.id,
            name: userProfile.name,
            avatar: userProfile.avatar
        }
    });
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;

    const message = messageInput.value.trim();
    if (!message) return;

    if (!state.gameId) {
        tg.showAlert('Вы не находитесь в игре');
        return;
    }

    socket.emit('chatMessage', {
        gameId: state.gameId,
        sender: userProfile.name,
        text: message,
        timestamp: new Date().toISOString()
    });
    
    messageInput.value = '';
}

function startGame() {
    if (!state.isAdmin) {
        tg.showAlert('Только администратор может начать игру');
        return;
    }
    
    socket.emit('startGame', { gameId: state.gameId });
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    setupSocketHandlers();
    initializeEventListeners();
    
    // Установка начального языка
    const savedLanguage = localStorage.getItem('language') || 'ru';
    updateLanguage(savedLanguage);
    
    // Установка начальной темы
    const savedTheme = localStorage.getItem('theme') || 'light';
    updateTheme(savedTheme);
    
    // Обновление профиля
    updateProfileUI();
    
    // Показываем главное меню
    showScreen('mainMenu');
    console.log('Main menu should be visible now');
    
    console.log('App initialized successfully');
}); 