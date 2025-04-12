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
    messages: [],
    language: localStorage.getItem('language') || 'ru'
};

// Звуковые эффекты
const sounds = {
    message: new Audio('/sounds/message.mp3'),
    join: new Audio('/sounds/join.mp3'),
    leave: new Audio('/sounds/leave.mp3')
};

// Локализация
const translations = {
    ru: {
        gameTitle: 'Шпион',
        gameDescription: 'Увлекательная игра для компании друзей',
        createGame: 'Создать игру',
        joinGame: 'Присоединиться',
        back: 'Назад',
        startGame: 'Начать игру',
        leaveLobby: 'Покинуть лобби',
        endGame: 'Завершить игру',
        yourName: 'Ваше имя',
        gameCode: 'Код игры',
        gameCodeLabel: 'Код игры:',
        copyCode: 'Копировать код',
        players: 'Игроки',
        yourRole: 'Ваша роль',
        enterMessage: 'Введите сообщение...',
        send: 'Отправить',
        language: 'Язык'
    },
    en: {
        gameTitle: 'Spy',
        gameDescription: 'An exciting game for a group of friends',
        createGame: 'Create Game',
        joinGame: 'Join Game',
        back: 'Back',
        startGame: 'Start Game',
        leaveLobby: 'Leave Lobby',
        endGame: 'End Game',
        yourName: 'Your Name',
        gameCode: 'Game Code',
        gameCodeLabel: 'Game Code:',
        copyCode: 'Copy Code',
        players: 'Players',
        yourRole: 'Your Role',
        enterMessage: 'Enter message...',
        send: 'Send',
        language: 'Language'
    },
    es: {
        gameTitle: 'Espía',
        gameDescription: 'Un juego emocionante para un grupo de amigos',
        createGame: 'Crear Juego',
        joinGame: 'Unirse al Juego',
        back: 'Atrás',
        startGame: 'Comenzar Juego',
        leaveLobby: 'Salir del Lobby',
        endGame: 'Terminar Juego',
        yourName: 'Tu Nombre',
        gameCode: 'Código del Juego',
        gameCodeLabel: 'Código del Juego:',
        copyCode: 'Copiar Código',
        players: 'Jugadores',
        yourRole: 'Tu Rol',
        enterMessage: 'Escribe un mensaje...',
        send: 'Enviar',
        language: 'Idioma'
    },
    fr: {
        gameTitle: 'Espion',
        gameDescription: 'Un jeu passionnant pour un groupe d\'amis',
        createGame: 'Créer une Partie',
        joinGame: 'Rejoindre une Partie',
        back: 'Retour',
        startGame: 'Commencer la Partie',
        leaveLobby: 'Quitter le Lobby',
        endGame: 'Terminer la Partie',
        yourName: 'Votre Nom',
        gameCode: 'Code de la Partie',
        gameCodeLabel: 'Code de la Partie:',
        copyCode: 'Copier le Code',
        players: 'Joueurs',
        yourRole: 'Votre Rôle',
        enterMessage: 'Entrez un message...',
        send: 'Envoyer',
        language: 'Langue'
    },
    de: {
        gameTitle: 'Spion',
        gameDescription: 'Ein spannendes Spiel für eine Gruppe von Freunden',
        createGame: 'Spiel Erstellen',
        joinGame: 'Spiel Beitreten',
        back: 'Zurück',
        startGame: 'Spiel Starten',
        leaveLobby: 'Lobby Verlassen',
        endGame: 'Spiel Beenden',
        yourName: 'Dein Name',
        gameCode: 'Spielcode',
        gameCodeLabel: 'Spielcode:',
        copyCode: 'Code Kopieren',
        players: 'Spieler',
        yourRole: 'Deine Rolle',
        enterMessage: 'Nachricht eingeben...',
        send: 'Senden',
        language: 'Sprache'
    }
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
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.textContent = `${player.name}${player.isAdmin ? ' (Админ)' : ''}`;
        playersList.appendChild(playerElement);
    });
}

function addChatMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender === state.playerName ? 'own' : ''}`;
    
    let messageContent = `
        <div class="message-sender">${message.sender}</div>
    `;
    
    if (message.text) {
        messageContent += `<div class="message-text">${message.text}</div>`;
    }
    
    if (message.photo) {
        messageContent += `
            <div class="message-photo-container">
                <img src="${message.photo}" alt="Фото" class="message-photo">
                ${message.caption ? `<div class="message-photo-caption">${message.caption}</div>` : ''}
            </div>
        `;
    }
    
    messageDiv.innerHTML = messageContent;
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

// Функция обновления языка
function updateLanguage(lang) {
    console.log('Updating language to:', lang);
    state.language = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('language', lang);
    
    const t = translations[lang];
    
    // Обновляем тексты
    document.querySelector('.menu-title').textContent = t.gameTitle;
    document.querySelector('.menu-description').textContent = t.gameDescription;
    document.getElementById('createGameButton').textContent = t.createGame;
    document.getElementById('joinGameButton').textContent = t.joinGame;
    document.getElementById('backFromSettings').textContent = t.back;
    document.getElementById('startGameButton').textContent = t.startGame;
    document.getElementById('leaveLobbyButton').textContent = t.leaveLobby;
    document.getElementById('endGameButton').textContent = t.endGame;
    document.getElementById('playerName').placeholder = t.yourName;
    document.getElementById('joinPlayerName').placeholder = t.yourName;
    document.getElementById('gameCode').placeholder = t.gameCode;
    document.querySelector('.game-id span').textContent = t.gameCodeLabel;
    document.getElementById('copyGameCode').ariaLabel = t.copyCode;
    document.querySelector('.players-container h3').textContent = t.players;
    document.querySelector('.role-display h2').textContent = t.yourRole;
    document.getElementById('messageInput').placeholder = t.enterMessage;
    document.getElementById('sendMessageButton').ariaLabel = t.send;
    document.querySelector('.settings-item label').textContent = t.language;
}

// Функция обновления игрового экрана
function updateGameScreen(game) {
    const roleDisplay = document.getElementById('playerRole');
    const timerDisplay = document.getElementById('timer');
    const endGameButton = document.getElementById('endGameButton');
    
    // Обновляем роль
    if (game.spy === state.playerName) {
        roleDisplay.textContent = 'Вы - Шпион! 🕵️‍♂️';
    } else {
        roleDisplay.textContent = `Вы - Гражданский. Локация: ${game.location}`;
    }
    
    // Обновляем таймер
    updateTimer(game.timer);
    
    // Показываем/скрываем кнопку завершения игры
    const isAdmin = game.players.find(p => p.name === state.playerName)?.isAdmin;
    endGameButton.style.display = isAdmin ? 'block' : 'none';
}

// Обработчики событий
function initializeEventListeners() {
    console.log('Initializing event listeners');
    
    // Кнопка создания игры в главном меню
    document.getElementById('createGameButton').onclick = function() {
        console.log('Create game button clicked');
        document.getElementById('mainMenuScreen').classList.add('hidden');
        document.getElementById('createGameScreen').classList.remove('hidden');
    };
    
    // Кнопка присоединения к игре в главном меню
    document.getElementById('joinGameButton').onclick = function() {
        console.log('Join game button clicked');
        document.getElementById('mainMenuScreen').classList.add('hidden');
        document.getElementById('joinGameScreen').classList.remove('hidden');
    };
    
    // Кнопка темы в хедере
    const themeButton = document.getElementById('themeButton');
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            updateTheme(newTheme);
        });
    }
    
    // Кнопка настроек
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showScreen('settings');
        });
    }
    
    // Кнопка назад из настроек
    const backFromSettings = document.getElementById('backFromSettings');
    if (backFromSettings) {
        backFromSettings.addEventListener('click', () => {
            showScreen('main');
        });
    }
    
    // Кнопка назад из лобби
    const leaveLobbyButton = document.getElementById('leaveLobbyButton');
    if (leaveLobbyButton) {
        leaveLobbyButton.onclick = function() {
            console.log('Leave lobby button clicked');
            document.getElementById('lobbyScreen').classList.add('hidden');
            document.getElementById('mainMenuScreen').classList.remove('hidden');
            socket.emit('leaveGame');
        };
    }
    
    // Кнопка назад из создания игры
    const backFromCreate = document.getElementById('backFromCreate');
    if (backFromCreate) {
        backFromCreate.onclick = function() {
            console.log('Back from create clicked');
            document.getElementById('createGameScreen').classList.add('hidden');
            document.getElementById('mainMenuScreen').classList.remove('hidden');
        };
    }
    
    // Кнопка назад из присоединения к игре
    const backFromJoin = document.getElementById('backFromJoin');
    if (backFromJoin) {
        backFromJoin.onclick = function() {
            console.log('Back from join clicked');
            document.getElementById('joinGameScreen').classList.add('hidden');
            document.getElementById('mainMenuScreen').classList.remove('hidden');
        };
    }
    
    // Кнопка начала игры в лобби
    const startGameButton = document.getElementById('startGameButton');
    if (startGameButton) {
        startGameButton.onclick = function() {
            console.log('Start game button clicked');
            if (state.isAdmin) {
                socket.emit('startGame', { gameId: state.gameId });
            } else {
                tg.showAlert('Только администратор может начать игру');
            }
        };
    }
    
    // Кнопка отправки сообщения
    const sendMessageButton = document.getElementById('sendMessageButton');
    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', () => {
            const text = document.getElementById('messageInput').value.trim();
            if (text) {
                socket.emit('chatMessage', { text });
                document.getElementById('messageInput').value = '';
            }
        });
    }
    
    // Кнопка отправки фото
    const sendPhotoButton = document.getElementById('sendPhotoButton');
    if (sendPhotoButton) {
        sendPhotoButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const photoData = e.target.result;
                        const caption = prompt('Введите подпись к фото (необязательно):');
                        socket.emit('chatMessage', {
                            text: '',
                            photo: photoData,
                            caption: caption
                        });
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    }
    
    // Кнопка завершения игры
    const endGameButton = document.getElementById('endGameButton');
    if (endGameButton) {
        endGameButton.addEventListener('click', () => {
            const gameId = document.getElementById('gameCodeDisplay').textContent;
            if (gameId) {
                socket.emit('endGame', { gameId });
            }
        });
    }
    
    // Выбор языка
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            updateLanguage(e.target.value);
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
    console.error('Socket error:', error);
    tg.showAlert(error.message || 'Произошла ошибка');
});

socket.on('gameCreated', (data) => {
    console.log('Game created:', data);
    const { gameId, player, players } = data;
    
    // Сохраняем информацию об игре
    state.gameId = gameId;
    state.playerName = player.name;
    state.isAdmin = player.isAdmin;
    state.players = players;
    
    // Обновляем отображение
    document.getElementById('gameCodeDisplay').textContent = gameId;
    updatePlayersList(players);
    
    // Переходим в лобби
    document.getElementById('createGameScreen').classList.add('hidden');
    document.getElementById('lobbyScreen').classList.remove('hidden');
});

socket.on('joinedGame', (data) => {
    console.log('Joined game:', data);
    const { gameId, player, players } = data;
    
    // Сохраняем информацию об игре
    state.gameId = gameId;
    state.playerName = player.name;
    state.isAdmin = player.isAdmin;
    state.players = players;
    
    // Обновляем отображение
    document.getElementById('gameCodeDisplay').textContent = gameId;
    updatePlayersList(players);
    
    // Переходим в лобби
    document.getElementById('joinGameScreen').classList.add('hidden');
    document.getElementById('lobbyScreen').classList.remove('hidden');
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

socket.on('gameStarted', (game) => {
    state.game = game;
    showScreen('game');
    updateGameScreen(game);
});

socket.on('chatMessage', (message) => {
    addChatMessage(message);
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
function initializeApp() {
    try {
        // Инициализация Telegram WebApp
        tg.ready();
        tg.expand();
        
        // Устанавливаем тему
        const savedTheme = localStorage.getItem('theme') || 'light';
        updateTheme(savedTheme);
        
        // Устанавливаем язык
        const savedLanguage = localStorage.getItem('language') || 'ru';
        updateLanguage(savedLanguage);
        
        // Устанавливаем выбранный язык в селекте
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = savedLanguage;
        }
        
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
        
        // Инициализация приложения
        initializeApp();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        try {
            tg.showAlert('Произошла ошибка при загрузке приложения');
        } catch (e) {
            alert('Произошла ошибка при загрузке приложения');
        }
    }
}); 