const socket = io();

// UI Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const btnLogin = document.getElementById('btn-login');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');

const btnTabCaller = document.getElementById('btn-tab-caller');
const btnTabConfig = document.getElementById('btn-tab-config');
const callerSection = document.getElementById('caller-section');
const configSection = document.getElementById('config-section');

const wordInput = document.getElementById('word-input');
const btnSaveWords = document.getElementById('btn-save-words');
const saveMsg = document.getElementById('save-msg');

const currentWordEl = document.getElementById('current-word');
const btnDraw = document.getElementById('btn-draw');
const tombola = document.getElementById('tombola');
const historyList = document.getElementById('history-list');
const btnResetCaller = document.getElementById('btn-reset-caller');

const winnerModal = document.getElementById('winner-modal');
const winnerName = document.getElementById('winner-name');
const btnCloseWinner = document.getElementById('btn-close-winner');

// Server State Mirror
let localWords = [];
let localRemainingWords = [];
let localCalledWords = [];
let isLoggedIn = false;

socket.on('syncState', (state) => {
    localWords = state.words;
    localRemainingWords = state.remainingWords;
    localCalledWords = state.calledWords;
    // Si la mamí ya inició sesión temporalmente sin cargar esto...
    if (wordInput.value === "") {
        wordInput.value = localWords.join(", ");
    }
    updateCallerUI();
});

socket.on('bingoAlert', (playerName) => {
    if (isLoggedIn) {
        winnerName.textContent = playerName;
        winnerModal.classList.remove('hidden');
    }
});

// Authentication
function attemptLogin() {
    if (passwordInput.value.toLowerCase() === 'isaac') {
        loginScreen.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        isLoggedIn = true;
        wordInput.value = localWords.join(", ");
    } else {
        loginError.classList.remove('hidden');
    }
}
btnLogin.addEventListener('click', attemptLogin);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
});

// Nav Tabs
btnTabCaller.addEventListener('click', () => {
    btnTabCaller.classList.add('active');
    btnTabConfig.classList.remove('active');
    callerSection.classList.remove('hidden');
    configSection.classList.add('hidden');
});
btnTabConfig.addEventListener('click', () => {
    btnTabConfig.classList.add('active');
    btnTabCaller.classList.remove('active');
    configSection.classList.remove('hidden');
    callerSection.classList.add('hidden');
    wordInput.value = localWords.join(", ");
});

// Config Guardar
btnSaveWords.addEventListener('click', () => {
    const newWords = wordInput.value.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (newWords.length < 24) {
        alert(`¡Necesitas al menos 24 opciones! Tienes ${newWords.length}.`);
        return;
    }
    
    // Mandar petición de actualización a la DB
    socket.emit('adminUpdateWords', newWords);

    saveMsg.classList.remove('hidden');
    setTimeout(() => saveMsg.classList.add('hidden'), 3000);
});

// Ruleta / Tómbola UI
function updateCallerUI() {
    if (!isLoggedIn) return;

    if (localCalledWords.length === 0) {
        currentWordEl.textContent = "¡Lista para girar!";
        currentWordEl.style.animation = 'none';
        btnDraw.disabled = false;
        btnDraw.textContent = "Girar Ruleta";
    } else {
        // Enforce reading the very last drawn word
        const lastWord = localCalledWords[localCalledWords.length - 1];
        currentWordEl.textContent = lastWord;
    }

    historyList.innerHTML = '';
    [...localCalledWords].reverse().forEach(word => {
        const span = document.createElement('span');
        span.classList.add('history-item');
        span.textContent = word;
        historyList.appendChild(span);
    });

    if (localRemainingWords.length === 0) {
        btnDraw.disabled = true;
        btnDraw.textContent = "¡Bingo terminado!";
    }
}

// Sacar Ficha
function drawWord() {
    if (localRemainingWords.length === 0 || btnDraw.disabled) return;
    
    // Elegimos de forma pseudo-local solo de los "restantes" del server
    const randomIndex = Math.floor(Math.random() * localRemainingWords.length);
    const wordTarget = localRemainingWords[randomIndex];
    
    // Lock Animation Temporarily
    btnDraw.disabled = true;
    tombola.classList.remove('spin');
    void tombola.offsetWidth;
    tombola.classList.add('spin');
    
    currentWordEl.textContent = "Girando...";
    currentWordEl.style.animation = 'none';

    setTimeout(() => {
        // Al terminar de girar, le decimos a la base de datos la ficha elegida
        // La DB lo agrega allá y nos retransmitirá via syncState instantáneamente.
        socket.emit('adminDrawWord', wordTarget);

        // Disparamos animación de llegada de texto
        currentWordEl.style.animation = 'none';
        currentWordEl.offsetHeight; 
        currentWordEl.style.animation = 'popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        if (localRemainingWords.length > 0) btnDraw.disabled = false;
    }, 2500);
}

btnDraw.addEventListener('click', drawWord);

// Reiniciar 
btnResetCaller.addEventListener('click', () => {
    if (confirm("¿Seguro que quieres reiniciar el juego? Se vaciará la tómbola y el historial.")) {
        socket.emit('adminResetGame');
    }
});

btnCloseWinner.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
});
