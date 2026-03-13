// Socket.io Client
const socket = io();

const playerLogin = document.getElementById('player-login');
const playerBoardContainer = document.getElementById('player-board-container');
const playerNameInput = document.getElementById('player-name');
const btnPlayerLogin = document.getElementById('btn-player-login');
const displayName = document.getElementById('display-name');
const btnLogoutPlayer = document.getElementById('btn-logout-player');

const board = document.getElementById('bingo-board');
const btnNewCard = document.getElementById('btn-new-card');
const latestWordEl = document.getElementById('latest-word');

const btnBingo = document.getElementById('btn-bingo');
const celebrationModal = document.getElementById('celebration-modal');
const btnCloseCelebration = document.getElementById('btn-close-celebration');

let currentPlayer = localStorage.getItem('bingoPlayerName_isaac');

// Server State
let serverWords = [];
let serverCalledWords = [];

// Escucha el estado del juego que manda la Base de Datos
socket.on('syncState', (state) => {
    // Si la lista de palabras cambió radicalmente desde el servidor,
    // o el juego se reinició y borramos los cartones locales.
    const mustReset = serverWords.length > 0 && serverWords.join() !== state.words.join();
    
    serverWords = state.words;
    serverCalledWords = state.calledWords;

    if (currentPlayer) {
        if (mustReset) {
            alert("¡Mamá ha cambiado las reglas o las palabras del Bingo! Se generará un cartón nuevo con las opciones actuales.");
            localStorage.removeItem('bingoBoard_isaac_player_' + currentPlayer);
            generateBoard();
        }
        updateLatestWord();
    }
});

// Admin Alerts (ej. reinicios de juego)
socket.on('adminAlert', (msg) => {
    if (currentPlayer) {
        alert(msg);
        localStorage.removeItem('bingoBoard_isaac_player_' + currentPlayer);
        generateBoard();
    }
});

// Login System
function initPlayerSession() {
    if (currentPlayer) {
        playerLogin.classList.add('hidden');
        playerBoardContainer.classList.remove('hidden');
        displayName.textContent = currentPlayer;
        generateBoard();
        updateLatestWord();
    }
}

btnPlayerLogin.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
        currentPlayer = name;
        localStorage.setItem('bingoPlayerName_isaac', currentPlayer);
        initPlayerSession();
    } else {
        alert("Por favor, ingresa tu nombre o el de tu familia para jugar.");
    }
});

btnLogoutPlayer.addEventListener('click', () => {
    if(confirm("¿Seguro que quieres cambiar de nombre? Perderás tu cartón actual.")){
        localStorage.removeItem('bingoPlayerName_isaac');
        localStorage.removeItem('bingoBoard_isaac_player_' + currentPlayer); 
        currentPlayer = null;
        playerNameInput.value = '';
        playerBoardContainer.classList.add('hidden');
        playerLogin.classList.remove('hidden');
    }
});

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function generateBoard() {
    board.innerHTML = '';
    let cellData = [];
    const storageKey = 'bingoBoard_isaac_player_' + currentPlayer;
    const savedBoard = localStorage.getItem(storageKey);
    
    // Si no tenemos palabras del servidor aún, devolvérnos
    if (serverWords.length === 0) {
        board.innerHTML = '<p style="color:white; font-size:1.2rem; grid-column: span 5; text-align: center;">Conectando con Servidor...</p>';
        return;
    }

    if (savedBoard) {
        cellData = JSON.parse(savedBoard);
    } else {
        const shuffledWords = shuffle([...serverWords]).slice(0, 24);
        shuffledWords.splice(12, 0, "Isaac (Libre)");
        cellData = shuffledWords.map((word, i) => ({
            text: word,
            marked: (i === 12)
        }));
        localStorage.setItem(storageKey, JSON.stringify(cellData));
    }

    cellData.forEach((cellObj, index) => {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        if (index === 12) cell.classList.add('free');
        if (cellObj.marked) cell.classList.add('marked');
        cell.textContent = cellObj.text;

        cell.addEventListener('click', () => {
            if (index !== 12) {
                cellObj.marked = !cellObj.marked;
                if (cellObj.marked) cell.classList.add('marked');
                else cell.classList.remove('marked');
                localStorage.setItem(storageKey, JSON.stringify(cellData));
            }
        });
        board.appendChild(cell);
    });
}

function updateLatestWord() {
    if (serverCalledWords.length > 0) {
        const last = serverCalledWords[serverCalledWords.length - 1];
        latestWordEl.textContent = "Última cantada: " + last;
        latestWordEl.classList.add('pulse');
        setTimeout(() => latestWordEl.classList.remove('pulse'), 1000);
    } else {
        latestWordEl.textContent = "Esperando a que mamá empiece...";
    }
}

btnNewCard.addEventListener('click', () => {
    if(confirm("¿Estás seguro de generar un cartón nuevo? Se borrará tu progreso actual.")){
        localStorage.removeItem('bingoBoard_isaac_player_' + currentPlayer);
        generateBoard();
    }
});

// Bingo Event - Sends to DB
btnBingo.addEventListener('click', () => {
    // Comunicar el grito a la base de datos central!
    socket.emit('playerBingo', currentPlayer);
    
    // Celebración local en el dispositivo del invitado
    celebrationModal.classList.remove('hidden');
});

btnCloseCelebration.addEventListener('click', () => {
    celebrationModal.classList.add('hidden');
});

// Iniciar sesión
initPlayerSession();
