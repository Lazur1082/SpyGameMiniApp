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

// Обработчики событий
function initializeEventListeners() {
    console.log('Initializing event listeners');
    
    // Кнопка темы в хедере
    const themeButton = document.getElementById('themeButton');
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            updateTheme(newTheme);
        });
    }
    
    // Переключатель темы в настройках
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Устанавливаем начальное состояние
        const savedTheme = localStorage.getItem('theme') || 'light';
        themeToggle.checked = savedTheme === 'dark';
        updateTheme(savedTheme);
        
        themeToggle.addEventListener('change', (e) => {
            console.log('Theme toggle changed:', e.target.checked);
            const isDark = e.target.checked;
            updateTheme(isDark ? 'dark' : 'light');
        });
    }

    // Кнопка настроек
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showScreen('settings');
        });
    }
    
    if (elements.backFromSettings) {
        elements.backFromSettings.addEventListener('click', () => {
            console.log('Back from settings clicked');
            showScreen('main');
        });
    }
    
    if (elements.showCreateGame) {
        elements.showCreateGame.addEventListener('click', () => {
            console.log('Show create game clicked');
            showScreen('start');
        });
    }
    
    if (elements.showJoinGame) {
        elements.showJoinGame.addEventListener('click', () => {
            console.log('Show join game clicked');
            showScreen('join');
        });
    }
    
    if (elements.backToMenu1) {
        elements.backToMenu1.addEventListener('click', () => {
            console.log('Back to menu 1 clicked');
            showScreen('main');
        });
    }
    
    if (elements.backToMenu2) {
        elements.backToMenu2.addEventListener('click', () => {
            console.log('Back to menu 2 clicked');
            showScreen('main');
        });
    }
    
    if (elements.backToMenu3) {
        elements.backToMenu3.addEventListener('click', () => {
            console.log('Back to menu 3 clicked');
            showScreen('main');
        });
    }

    // Кнопки действий
    if (elements.createGame) {
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
    }

    if (elements.joinGame) {
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
    }

    if (elements.startGame) {
        elements.startGame.addEventListener('click', () => {
            console.log('Start game clicked');
            const gameId = elements.currentGameId.textContent;
            if (gameId) {
                socket.emit('startGame', { gameId });
            }
        });
    }

    if (elements.endGame) {
        elements.endGame.addEventListener('click', () => {
            console.log('End game clicked');
            const gameId = elements.currentGameId.textContent;
            if (gameId) {
                socket.emit('endGame', { gameId });
            }
        });
    }

    if (elements.sendMessage) {
        elements.sendMessage.addEventListener('click', () => {
            console.log('Send message clicked');
            const text = elements.messageInput.value.trim();
            if (text) {
                socket.emit('chatMessage', { text });
                elements.messageInput.value = '';
            }
        });
    }

    if (elements.messageInput) {
        elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Send message keypress');
                elements.sendMessage.click();
            }
        });
    }

    // Настройки
    if (elements.soundToggle) {
        elements.soundToggle.addEventListener('change', (e) => {
            console.log('Sound toggle changed');
            updateSound(e.target.checked);
        });
    }
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    try {
        // Загружаем сохраненные настройки
        const savedTheme = localStorage.getItem('theme') || 'light';
        const savedSound = localStorage.getItem('sound');
        
        updateTheme(savedTheme);
        if (savedSound !== null) {
            updateSound(savedSound === 'true');
        }
        
        // Установка имени из Telegram
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
            if (elements.playerName) elements.playerName.value = name;
            if (elements.playerNameJoin) elements.playerNameJoin.value = name;
        }
        
        // Инициализация обработчиков событий
        initializeEventListeners();
        
        // Показываем главное меню
        showScreen('main');
        
        // Подключаемся к серверу
        socket.connect();
        
        // Initialize sound
        initializeSound();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        try {
            tg.showAlert('Произошла ошибка при загрузке приложения');
        } catch (e) {
            alert('Произошла ошибка при загрузке приложения');
        }
    }
}); 