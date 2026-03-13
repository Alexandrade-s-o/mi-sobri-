// Supabase Client Setup
const supabaseUrl = 'https://yzmpfzegltldxybnxetp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bXBmemVnbHRsZHh5Ym54ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjU4ODksImV4cCI6MjA4ODk0MTg4OX0.8chkQbYBsoE-VIg2Aq_UGOVM8gVW-gC9-z7R1s04HzU';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const bingoChannel = supabaseClient.channel('bingo_room');

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

// Server State Mirror (Stored in localStorage since Mamá is the Source of Truth)
let localWords = [];
let localRemainingWords = [];
let localCalledWords = [];
let isLoggedIn = false;

function getDefaultWords() {
    return [
        "Pañales", "Biberón", "Chupón", "Sonajero", "Babero", "Cobija", 
        "Calcetines", "Zapatitos", "Toallitas", "Crema", "Shampoo", 
        "Talco", "Gorrito", "Mameluco", "Tina", "Juguete", "Mordedera", 
        "Cuna", "Carriola", "Canguro", "Bañera", "Toalla", "Termómetro", 
        "Cepillo", "Esponja", "Pañalera", "Aspirador", "Cambiador",
        "Monitor", "Almohada", "Peluche", "Bañador", "Móvil", "Termo"
    ];
}

function loadLocalState() {
    const savedWords = localStorage.getItem('bingoAdmin_words');
    if (savedWords) {
        localWords = JSON.parse(savedWords);
    } else {
        localWords = getDefaultWords();
    }
    
    localRemainingWords = JSON.parse(localStorage.getItem('bingoAdmin_remaining')) || [...localWords];
    localCalledWords = JSON.parse(localStorage.getItem('bingoAdmin_called')) || [];
}

function saveLocalState() {
    localStorage.setItem('bingoAdmin_words', JSON.stringify(localWords));
    localStorage.setItem('bingoAdmin_remaining', JSON.stringify(localRemainingWords));
    localStorage.setItem('bingoAdmin_called', JSON.stringify(localCalledWords));
}

function broadcastState(alertMsg = null) {
    if(!isLoggedIn) return;
    bingoChannel.send({
        type: 'broadcast',
        event: 'sync_state',
        payload: {
            words: localWords,
            remainingWords: localRemainingWords,
            calledWords: localCalledWords,
            alertMsg: alertMsg
        }
    });
}

// ------------------------------------
// Supabase Realtime Handlers
// ------------------------------------
bingoChannel
  .on('broadcast', { event: 'request_state' }, (payload) => {
      // Un invitado entró y pidió sincronizarse
      if (isLoggedIn) {
          broadcastState(); // Enviamos el estado a todos inmediatamente
      }
  })
  .on('broadcast', { event: 'playerBingo' }, (payload) => {
      // Alguien ganó!!
      if (isLoggedIn) {
          winnerName.textContent = payload.payload.name;
          winnerModal.classList.remove('hidden');
      }
  })
  .subscribe();

// ------------------------------------
// Authentication
// ------------------------------------
function attemptLogin() {
    if (passwordInput.value.toLowerCase() === 'isaac') {
        loginScreen.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        isLoggedIn = true;
        
        loadLocalState();
        wordInput.value = localWords.join(", ");
        updateCallerUI();
        broadcastState(); // Tell everyone we are back online
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
    
    localWords = newWords;
    localRemainingWords = [...localWords]; // Reset
    localCalledWords = []; // Reset
    
    saveLocalState();
    updateCallerUI();
    broadcastState("¡Mamá actualizó las palabras del juego! Juego reiniciado.");

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
        // Al terminar de girar
        localCalledWords.push(wordTarget);
        localRemainingWords.splice(randomIndex, 1);
        saveLocalState();
        updateCallerUI();
        
        broadcastState();

        // Disparamos animación
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
        localRemainingWords = [...localWords];
        localCalledWords = [];
        saveLocalState();
        updateCallerUI();
        broadcastState("¡Juego reiniciado!");
    }
});

btnCloseWinner.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
});
