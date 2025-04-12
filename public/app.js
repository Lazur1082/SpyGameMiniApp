// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Настройки
const settings = {
    theme: 'light',
    sound: true
};

// Socket.io
const socket = io();

// DOM элементы
const screens = {
    settings: document.getElementById('settingsScreen'),
    main: document.getElementById('mainMenu'),
    start: document.getElementById('startScreen'),
    join: document.getElementById('joinScreen'),
    waiting: document.getElementById('waitingScreen'),
    game: document.getElementById('gameScreen'),
    end: document.getElementById('endScreen')
};

const elements = {
    playerName: document.getElementById('playerName'),
    playerNameJoin: document.getElementById('playerNameJoin'),
    gameId: document.getElementById('gameId'),
    currentGameId: document.getElementById('currentGameId'),
    playersList: document.getElementById('playersList'),
    roleInfo: document.getElementById('roleInfo'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    gameResults: document.getElementById('gameResults'),
    themeToggle: document.getElementById('themeToggle'),
    soundToggle: document.getElementById('soundToggle'),
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
    sendMessage: document.getElementById('sendMessage')
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
let currentPlayer = null;
let isAdmin = false;
let lastScreen = 'main';

// Звуковые эффекты
const sounds = {
    message: new Audio('/sounds/message.mp3'),
    join: new Audio('/sounds/join.mp3'),
    leave: new Audio('/sounds/leave.mp3')
};

// Функции
function showScreen(screenName) {
    console.log('Showing screen:', screenName);
    // Скрываем все экраны
    const screens = [
        'settingsScreen',
        'mainMenu',
        'startScreen',
        'joinScreen',
        'waitingScreen',
        'gameScreen',
        'endScreen'
    ];

    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('hidden');
        }
    });

    // Показываем нужный экран
    const targetScreen = document.getElementById(screenName + 'Screen') || 
                        document.getElementById(screenName + 'Menu');
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
    messageDiv.className = `message ${message.sender === currentPlayer?.name ? 'own' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    if (settings.sound && message.sender !== currentPlayer?.name) {
        sounds.message.play().catch(() => {});
    }
}

function playSound(soundName) {
    if (settings.sound && sounds[soundName]) {
        sounds[soundName].play().catch(() => {});
    }
}

function updateTheme(theme) {
    settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        tg.setHeaderColor('#212121');
        tg.setBackgroundColor('#212121');
    } else {
        tg.setHeaderColor('#2481cc');
        tg.setBackgroundColor('#ffffff');
    }
}

function updateSound(sound) {
    settings.sound = sound;
}

// Обработчики настроек
elements.themeToggle.addEventListener('change', (e) => {
    console.log('Theme toggle changed');
    updateTheme(e.target.checked ? 'dark' : 'light');
});

elements.soundToggle.addEventListener('change', (e) => {
    console.log('Sound toggle changed');
    updateSound(e.target.checked);
});

// Обработчики событий UI
buttons.settings.addEventListener('click', () => {
    console.log('Settings button clicked');
    showScreen('settings');
});

buttons.backFromSettings.addEventListener('click', () => {
    console.log('Back from settings clicked');
    showScreen('main');
});

buttons.showCreate.addEventListener('click', () => {
    console.log('Show create game clicked');
    showScreen('start');
});

buttons.showJoin.addEventListener('click', () => {
    console.log('Show join game clicked');
    showScreen('join');
});

buttons.backToMenu1.addEventListener('click', () => {
    console.log('Back to menu 1 clicked');
    showScreen('main');
});

buttons.backToMenu2.addEventListener('click', () => {
    console.log('Back to menu 2 clicked');
    showScreen('main');
});

buttons.backToMenu3.addEventListener('click', () => {
    console.log('Back to menu 3 clicked');
    showScreen('main');
});

buttons.create.addEventListener('click', () => {
    console.log('Create game clicked');
    const name = elements.playerName.value.trim();
    if (name) {
        socket.emit('createGame', { name });
    } else {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Введите ваше имя',
            buttons: [{type: 'ok'}]
        });
    }
});

buttons.join.addEventListener('click', () => {
    console.log('Join game clicked');
    const name = elements.playerNameJoin.value.trim();
    const gameId = elements.gameId.value.trim().toUpperCase();
    if (name && gameId) {
        socket.emit('joinGame', { name, gameId });
    } else {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Заполните все поля',
            buttons: [{type: 'ok'}]
        });
    }
});

buttons.start.addEventListener('click', () => {
    console.log('Start game clicked');
    const gameId = elements.currentGameId.textContent;
    if (gameId) {
        socket.emit('startGame', { gameId });
    }
});

buttons.send.addEventListener('click', () => {
    console.log('Send message clicked');
    const message = elements.messageInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { text: message });
        elements.messageInput.value = '';
    }
});

elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        console.log('Send message keypress');
        e.preventDefault();
        buttons.send.click();
    }
});

buttons.end.addEventListener('click', () => {
    console.log('End game clicked');
    const gameId = elements.currentGameId.textContent;
    if (gameId) {
        socket.emit('endGame', { gameId });
    }
});

buttons.newGame.addEventListener('click', () => {
    showScreen('main');
});

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
    currentPlayer = player;
    isAdmin = true;
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
    currentPlayer = player;
    isAdmin = player.isAdmin;
    elements.currentGameId.textContent = gameId;
    updatePlayersList(players);
    showScreen('waiting');
    playSound('join');
});

socket.on('playerJoined', ({ players }) => {
    updatePlayersList(players);
    playSound('join');
});

socket.on('playerLeft', ({ players }) => {
    updatePlayersList(players);
    playSound('leave');
});

socket.on('gameStarted', ({ role, location }) => {
    elements.roleInfo.innerHTML = `
        <h3 class="role-title">${role === 'spy' ? 'Вы - Шпион! 🕵️‍♂️' : 'Ваша роль'}</h3>
        <p>${role === 'spy' ? 
            'Попытайтесь угадать локацию, слушая разговор других игроков' : 
            `Локация: ${location}<br>Не дайте шпиону догадаться!`}</p>
    `;
    elements.chatMessages.innerHTML = '';
    showScreen('game');
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
});

// Функция копирования ID игры
function copyGameId() {
    const gameId = elements.currentGameId.textContent;
    if (gameId) {
        navigator.clipboard.writeText(gameId)
            .then(() => {
                tg.showPopup({
                    title: 'Скопировано',
                    message: 'ID игры скопирован в буфер обмена',
                    buttons: [{type: 'ok'}]
                });
            })
            .catch(() => {
                tg.showPopup({
                    title: 'Ошибка',
                    message: 'Не удалось скопировать ID игры',
                    buttons: [{type: 'ok'}]
                });
            });
    }
}

// Обработчики событий
function initializeEventListeners() {
    console.log('Initializing event listeners');
    
    // Кнопки навигации
    elements.settingsButton.addEventListener('click', () => {
        console.log('Settings button clicked');
        showScreen('settings');
    });
    
    elements.backFromSettings.addEventListener('click', () => {
        console.log('Back from settings clicked');
        showScreen('main');
    });
    
    elements.showCreateGame.addEventListener('click', () => {
        console.log('Show create game clicked');
        showScreen('start');
    });
    
    elements.showJoinGame.addEventListener('click', () => {
        console.log('Show join game clicked');
        showScreen('join');
    });
    
    elements.backToMenu1.addEventListener('click', () => {
        console.log('Back to menu 1 clicked');
        showScreen('main');
    });
    
    elements.backToMenu2.addEventListener('click', () => {
        console.log('Back to menu 2 clicked');
        showScreen('main');
    });
    
    elements.backToMenu3.addEventListener('click', () => {
        console.log('Back to menu 3 clicked');
        showScreen('main');
    });

    // Кнопки действий
    elements.createGame.addEventListener('click', () => {
        console.log('Create game clicked');
        const name = elements.playerName.value.trim();
        if (name) {
            socket.emit('createGame', { name });
        } else {
            tg.showPopup({
                title: 'Ошибка',
                message: 'Введите ваше имя',
                buttons: [{type: 'ok'}]
            });
        }
    });

    elements.joinGame.addEventListener('click', () => {
        console.log('Join game clicked');
        const name = elements.playerNameJoin.value.trim();
        const gameId = elements.gameId.value.trim().toUpperCase();
        if (name && gameId) {
            socket.emit('joinGame', { name, gameId });
        } else {
            tg.showPopup({
                title: 'Ошибка',
                message: 'Заполните все поля',
                buttons: [{type: 'ok'}]
            });
        }
    });

    elements.startGame.addEventListener('click', () => {
        console.log('Start game clicked');
        const gameId = elements.currentGameId.textContent;
        if (gameId) {
            socket.emit('startGame', { gameId });
        }
    });

    elements.endGame.addEventListener('click', () => {
        console.log('End game clicked');
        const gameId = elements.currentGameId.textContent;
        if (gameId) {
            socket.emit('endGame', { gameId });
        }
    });

    elements.sendMessage.addEventListener('click', () => {
        console.log('Send message clicked');
        const message = elements.messageInput.value.trim();
        if (message) {
            socket.emit('chatMessage', { text: message });
            elements.messageInput.value = '';
        }
    });

    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Send message keypress');
            e.preventDefault();
            elements.sendMessage.click();
        }
    });

    // Настройки
    elements.themeToggle.addEventListener('change', (e) => {
        console.log('Theme toggle changed');
        updateTheme(e.target.checked ? 'dark' : 'light');
    });

    elements.soundToggle.addEventListener('change', (e) => {
        console.log('Sound toggle changed');
        updateSound(e.target.checked);
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    try {
        // Установка темы
        updateTheme(settings.theme);
        updateSound(settings.sound);
        
        // Установка имени из Telegram
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
            elements.playerName.value = name;
            elements.playerNameJoin.value = name;
        }
        
        // Инициализация обработчиков событий
        initializeEventListeners();
        
        // Показываем главное меню
        showScreen('main');
        
        // Подключаемся к серверу
        socket.connect();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        tg.showAlert('Произошла ошибка при загрузке приложения');
    }
}); 