// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp || {
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

// Инициализация Socket.io
const socket = io();

// Состояние приложения
const state = {
    gameId: null,
    players: [],
    isInGame: false,
    isAdmin: false
};

// Профиль пользователя
const userProfile = {
    name: tg.initDataUnsafe?.user?.username || 'Игрок',
    avatar: '/images/default-avatar.png'
};

// Основные функции
const showScreen = (screenId) => {
    if (state.isInGame && !['gameScreen', 'waitingScreen'].includes(screenId)) {
        return;
    }
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }
};

const updatePlayersList = (players) => {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="player-avatar">
                <img src="${player.avatar}" alt="${player.name}">
            </div>
            <span class="player-name">${player.name}</span>
            ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
        `;
        playersList.appendChild(playerItem);
    });
};

const addChatMessage = (message) => {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender === userProfile.name ? 'own' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Обработчики событий
const setupEventListeners = () => {
    // Создание игры
    const createGameBtn = document.getElementById('createGame');
    if (createGameBtn) {
        createGameBtn.addEventListener('click', () => {
            socket.emit('createGame', {
                user: {
                    name: userProfile.name,
                    avatar: userProfile.avatar
                }
            });
        });
    }

    // Присоединение к игре
    const joinGameBtn = document.getElementById('joinGame');
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            const gameId = document.getElementById('gameId').value.trim();
            if (!gameId) {
                tg.showAlert('Введите ID игры');
                return;
            }
            
            socket.emit('joinGame', {
                gameId,
                user: {
                    name: userProfile.name,
                    avatar: userProfile.avatar
                }
            });
        });
    }

    // Отправка сообщения
    const sendMessageBtn = document.getElementById('sendMessage');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
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
                text: message
            });
            
            messageInput.value = '';
        });
    }

    // Начало игры
    const startGameBtn = document.getElementById('startGame');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (!state.isAdmin) {
                tg.showAlert('Только администратор может начать игру');
                return;
            }
            
            socket.emit('startGame', { gameId: state.gameId });
        });
    }
};

// Обработчики Socket.io
const setupSocketHandlers = () => {
    socket.on('connect', () => {
        showScreen('mainMenu');
        addChatMessage({
            sender: 'Система',
            text: '🎮 Добро пожаловать в игру "Шпион"!'
        });
    });

    socket.on('connect_error', (error) => {
        tg.showAlert('Ошибка подключения к серверу');
    });

    socket.on('error', (error) => {
        tg.showAlert(error.message || 'Произошла ошибка');
    });

    socket.on('gameCreated', (data) => {
        state.gameId = data.gameId;
        state.players = [{ 
            name: userProfile.name, 
            avatar: userProfile.avatar,
            isAdmin: true 
        }];
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
        if (!state.players) state.players = [];
        state.players.push({ 
            name: data.playerName, 
            avatar: data.avatar,
            isAdmin: false 
        });
        updatePlayersList(state.players);
        
        addChatMessage({
            sender: 'Система',
            text: `${data.playerName} присоединился к игре`
        });
    });

    socket.on('playerLeft', (data) => {
        state.players = state.players.filter(p => p.name !== data.playerName);
        updatePlayersList(state.players);
        
        addChatMessage({
            sender: 'Система',
            text: `${data.playerName} покинул игру`
        });
    });

    socket.on('chatMessage', (data) => {
        addChatMessage(data);
    });

    socket.on('gameStarted', (data) => {
        state.isInGame = true;
        showScreen('gameScreen');
        
        document.querySelector('.bottom-navigation').style.display = 'none';
        document.querySelector('.header').style.display = 'none';
        
        addChatMessage({
            sender: 'Система',
            text: `Игра началась! Ваша роль: ${data.role}`
        });
    });
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram WebApp
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Установка обработчиков
    setupSocketHandlers();
    setupEventListeners();
    
    // Показываем главное меню
    showScreen('mainMenu');
});