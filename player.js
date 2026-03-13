// Supabase Client Setup
const supabaseUrl = 'https://yzmpfzegltldxybnxetp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bXBmemVnbHRsZHh5Ym54ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjU4ODksImV4cCI6MjA4ODk0MTg4OX0.8chkQbYBsoE-VIg2Aq_UGOVM8gVW-gC9-z7R1s04HzU';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Create Realtime Channel
const bingoChannel = supabaseClient.channel('bingo_room');

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

// Subscribe to Supabase Broadcast Events
bingoChannel
  .on('broadcast', { event: 'sync_state' }, (payload) => {
      const state = payload.payload;
      const mustReset = serverWords.length > 0 && serverWords.join() !== state.words.join();
      
      serverWords = state.words;
      serverCalledWords = state.calledWords;

      if (currentPlayer) {
          if (mustReset || state.alertMsg) {
              if (state.alertMsg) alert(state.alertMsg);
              else alert("¡La Mamá de Isaac cambió las reglas o las palabras del Bingo! Se generará un cartón nuevo con las opciones actuales.");
              localStorage.removeItem('bingoBoard_isaac_player_' + currentPlayer);
              generateBoard();
          }
          // The board might just need rendering if words just loaded
          if (document.querySelectorAll('.cell').length === 0 || document.querySelector('.cell').textContent === 'Conectando con Mamá...') {
               generateBoard();
          }
          updateLatestWord();
      }
  })
  .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
          // Ask the admin for the current state
          bingoChannel.send({
              type: 'broadcast',
              event: 'request_state',
              payload: {}
          });
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
    
    // Si no tenemos palabras del servidor aún (Admin offline o cargando)
    if (serverWords.length === 0) {
        board.innerHTML = '<p style="color:white; font-size:1.2rem; grid-column: span 5; text-align: center;">Conectando con Mamá...</p>';
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
    // Comunicar el grito por Supabase Broadcast
    bingoChannel.send({
        type: 'broadcast',
        event: 'playerBingo',
        payload: { name: currentPlayer }
    });
    
    // Celebración local en el dispositivo del invitado
    celebrationModal.classList.remove('hidden');
});

btnCloseCelebration.addEventListener('click', () => {
    celebrationModal.classList.add('hidden');
});

// Iniciar sesión
initPlayerSession();
