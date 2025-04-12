const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

const tg = window.Telegram.WebApp;

// Инициализация Telegram Web App
try {
    tg.ready();
    tg.expand();
} catch (error) {
    console.error('Ошибка инициализации Telegram Web App:', error);
}

// DOM элементы
const startScreen = document.getElementById('startScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');

const playerNameInput = document.getElementById('playerName');
const gameIdInput = document.getElementById('gameId');
const currentGameIdSpan = document.getElementById('currentGameId');
const playersList = document.getElementById('playersList');
const roleInfo = document.getElementById('roleInfo');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const gameResults = document.getElementById('gameResults');

// Кнопки
const createGameBtn = document.getElementById('createGame');
const joinGameBtn = document.getElementById('joinGame');
const startGameBtn = document.getElementById('startGame');
const sendMessageBtn = document.getElementById('sendMessage');
const endGameBtn = document.getElementById('endGame');
const newGameBtn = document.getElementById('newGame');

let currentGameId = null;

// Установка имени пользователя из Telegram
try {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        playerNameInput.value = user.first_name || 'Игрок';
        if (user.last_name) {
            playerNameInput.value += ' ' + user.last_name;
        }
    }
} catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
}

// Обработка состояния подключения
socket.on('connect', () => {
    console.log('Подключено к серверу');
    document.body.classList.remove('disconnected');
});

socket.on('disconnect', () => {
    console.log('Отключено от сервера');
    document.body.classList.add('disconnected');
    tg.showAlert('Потеряно соединение с сервером. Пытаемся переподключиться...');
});

socket.on('connect_error', (error) => {
    console.error('Ошибка подключения:', error);
    tg.showAlert('Ошибка подключения к серверу');
});

// Создание новой игры
createGameBtn.addEventListener('click', () => {
    try {
        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            tg.showAlert('Введите ваше имя');
            return;
        }
        socket.emit('createGame', playerName);
    } catch (error) {
        console.error('Ошибка при создании игры:', error);
        tg.showAlert('Ошибка при создании игры');
    }
});

// Присоединение к игре
joinGameBtn.addEventListener('click', () => {
    try {
        const playerName = playerNameInput.value.trim();
        const gameId = gameIdInput.value.trim();
        if (!playerName || !gameId) {
            tg.showAlert('Введите ваше имя и ID игры');
            return;
        }
        socket.emit('joinGame', { gameId, playerName });
    } catch (error) {
        console.error('Ошибка при присоединении к игре:', error);
        tg.showAlert('Ошибка при присоединении к игре');
    }
});

// Начало игры
startGameBtn.addEventListener('click', () => {
    try {
        socket.emit('startGame', currentGameId);
    } catch (error) {
        console.error('Ошибка при начале игры:', error);
        tg.showAlert('Ошибка при начале игры');
    }
});

// Отправка сообщения
sendMessageBtn.addEventListener('click', () => {
    try {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('chatMessage', { gameId: currentGameId, message });
            messageInput.value = '';
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        tg.showAlert('Ошибка при отправке сообщения');
    }
});

// Завершение игры
endGameBtn.addEventListener('click', () => {
    try {
        socket.emit('endGame', currentGameId);
    } catch (error) {
        console.error('Ошибка при завершении игры:', error);
        tg.showAlert('Ошибка при завершении игры');
    }
});

// Новая игра
newGameBtn.addEventListener('click', () => {
    try {
        location.reload();
    } catch (error) {
        console.error('Ошибка при перезагрузке страницы:', error);
        tg.showAlert('Ошибка при начале новой игры');
    }
});

// Обработка нажатия Enter в поле сообщения
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessageBtn.click();
    }
});

// Сокет события
socket.on('gameCreated', (gameId) => {
    try {
        currentGameId = gameId;
        currentGameIdSpan.textContent = gameId;
        startScreen.classList.add('hidden');
        waitingScreen.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка при обработке создания игры:', error);
        tg.showAlert('Ошибка при создании игры');
    }
});

socket.on('error', (message) => {
    console.error('Ошибка от сервера:', message);
    tg.showAlert(message);
});

socket.on('playerJoined', (players) => {
    try {
        playersList.innerHTML = players.map(player => 
            `<div class="player-item">${player.name}</div>`
        ).join('');
    } catch (error) {
        console.error('Ошибка при обновлении списка игроков:', error);
    }
});

socket.on('gameStarted', (data) => {
    try {
        waitingScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        if (data.role === 'spy') {
            roleInfo.innerHTML = `
                <h3>Вы - ШПИОН! 🕵️‍♂️</h3>
                <p>Ваша задача - угадать место, о котором говорят другие игроки.</p>
            `;
        } else {
            roleInfo.innerHTML = `
                <h3>Ваше место: ${data.location}</h3>
                <p>Ваша задача - не дать шпиону догадаться о месте.</p>
            `;
        }
    } catch (error) {
        console.error('Ошибка при начале игры:', error);
        tg.showAlert('Ошибка при начале игры');
    }
});

socket.on('newMessage', (data) => {
    try {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <span class="player">${data.player}:</span> ${data.message}
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Ошибка при отображении сообщения:', error);
    }
});

socket.on('gameEnded', (data) => {
    try {
        gameScreen.classList.add('hidden');
        endScreen.classList.remove('hidden');
        gameResults.innerHTML = `
            <p>Место было: <strong>${data.location}</strong></p>
            <p>Шпионом был: <strong>${data.spy}</strong></p>
        `;
    } catch (error) {
        console.error('Ошибка при завершении игры:', error);
        tg.showAlert('Ошибка при завершении игры');
    }
});

socket.on('playerLeft', (players) => {
    try {
        playersList.innerHTML = players.map(player => 
            `<div class="player-item">${player.name}</div>`
        ).join('');
    } catch (error) {
        console.error('Ошибка при обновлении списка игроков:', error);
    }
}); 