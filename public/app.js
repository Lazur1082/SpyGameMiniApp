// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Инициализация Socket.io
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
let currentPlayer = null;
let isAdmin = false;
let lastScreen = 'main';
let settings = {
    theme: localStorage.getItem('theme') || 'light',
    sound: localStorage.getItem('sound') === 'true' || false
};

// Звуковые эффекты
const sounds = {
    message: new Audio('/sounds/message.mp3'),
    join: new Audio('/sounds/join.mp3'),
    leave: new Audio('/sounds/leave.mp3')
};

// Функции
function showScreen(screenName) {
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
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    settings.theme = theme;
    elements.themeToggle.checked = theme === 'dark';
}

function updateSound(enabled) {
    localStorage.setItem('sound', enabled);
    settings.sound = enabled;
    elements.soundToggle.checked = enabled;
}

// Обработчики настроек
elements.themeToggle.addEventListener('change', (e) => {
    updateTheme(e.target.checked ? 'dark' : 'light');
});

elements.soundToggle.addEventListener('change', (e) => {
    updateSound(e.target.checked);
});

// Обработчики событий UI
buttons.settings.addEventListener('click', () => {
    showScreen('settings');
});

buttons.backFromSettings.addEventListener('click', () => {
    showScreen(lastScreen);
});

buttons.showCreate.addEventListener('click', () => showScreen('start'));
buttons.showJoin.addEventListener('click', () => showScreen('join'));
buttons.backToMenu1.addEventListener('click', () => showScreen('main'));
buttons.backToMenu2.addEventListener('click', () => showScreen('main'));
buttons.backToMenu3.addEventListener('click', () => {
    socket.emit('leaveGame');
    showScreen('main');
});

buttons.create.addEventListener('click', () => {
    const name = elements.playerName.value.trim();
    if (name) {
        socket.emit('createGame', { name });
    } else {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Пожалуйста, введите ваше имя',
            buttons: [{type: 'ok'}]
        });
    }
});

buttons.join.addEventListener('click', () => {
    const name = elements.playerNameJoin.value.trim();
    const gameId = elements.gameId.value.trim();
    if (name && gameId) {
        socket.emit('joinGame', { name, gameId });
    } else {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Пожалуйста, введите ваше имя и ID игры',
            buttons: [{type: 'ok'}]
        });
    }
});

buttons.start.addEventListener('click', () => {
    if (isAdmin) {
        socket.emit('startGame');
    }
});

buttons.send.addEventListener('click', () => {
    const message = elements.messageInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { text: message });
        elements.messageInput.value = '';
    }
});

elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        buttons.send.click();
    }
});

buttons.end.addEventListener('click', () => {
    if (isAdmin) {
        tg.showConfirm('Вы уверены, что хотите завершить игру?', (confirmed) => {
            if (confirmed) {
                socket.emit('endGame');
            }
        });
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

socket.on('gameCreated', (data) => {
    currentPlayer = data.player;
    isAdmin = true;
    elements.currentGameId.textContent = data.gameId;
    updatePlayersList(data.players);
    showScreen('waiting');
    
    // Копируем ID игры в буфер обмена
    navigator.clipboard.writeText(data.gameId).catch(() => {});
    tg.showPopup({
        title: 'Игра создана',
        message: `ID игры: ${data.gameId}\nID скопирован в буфер обмена`,
        buttons: [{type: 'ok'}]
    });
});

socket.on('joinedGame', (data) => {
    currentPlayer = data.player;
    isAdmin = data.player.isAdmin;
    elements.currentGameId.textContent = data.gameId;
    updatePlayersList(data.players);
    showScreen('waiting');
    playSound('join');
});

socket.on('playerJoined', (data) => {
    updatePlayersList(data.players);
    playSound('join');
});

socket.on('playerLeft', (data) => {
    updatePlayersList(data.players);
    playSound('leave');
});

socket.on('gameStarted', (data) => {
    elements.roleInfo.innerHTML = `
        <h3 class="role-title">${data.role === 'spy' ? 'Вы - ШПИОН! 🕵️‍♂️' : 'Ваша роль'}</h3>
        <p>${data.role === 'spy' ? 
            'Попытайтесь угадать локацию, слушая разговор других игроков' : 
            `Локация: ${data.location}<br>Не дайте шпиону догадаться!`}</p>
    `;
    elements.chatMessages.innerHTML = '';
    showScreen('game');
});

socket.on('chatMessage', (data) => {
    addChatMessage(data);
});

socket.on('gameEnded', (data) => {
    elements.gameResults.innerHTML = `
        <h3>Игра завершена!</h3>
        <p>Шпион: ${data.spy}</p>
        <p>Локация: ${data.location}</p>
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
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
        
        // Показываем главное меню
        showScreen('main');
        
        // Подключаемся к серверу
        socket.connect();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        tg.showAlert('Произошла ошибка при загрузке приложения');
    }
}); 