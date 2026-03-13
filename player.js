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
              else alert("\u00a1La Mam\u00e1 de Isaac cambi\u00f3 las reglas o las palabras del Bingo! Se generar\u00e1 un cart\u00f3n nuevo con las opciones actuales.");
              localStorage.removeItem('bingoBoard_isaac_player_' + currentPlayer);
              generateBoard();
          } else {
              // Just refresh which cells are now valid/callable
              refreshCellValidity();
          }
          // The board might just need rendering if words just loaded
          if (document.querySelectorAll('.cell').length === 0 || document.querySelector('.cell.free') === null) {
               generateBoard();
          }
          updateLatestWord();
      }
  })
  .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
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
            if (index === 12) return; // free space always stays marked
            cellObj.marked = !cellObj.marked;
            if (cellObj.marked) cell.classList.add('marked');
            else cell.classList.remove('marked');
            localStorage.setItem(storageKey, JSON.stringify(cellData));
        });
        board.appendChild(cell);
    });
}

// Refresh cells - just visual update showing which ones have been called (no locking)
function refreshCellValidity() {
    const storageKey = 'bingoBoard_isaac_player_' + currentPlayer;
    const savedBoard = localStorage.getItem(storageKey);
    if (!savedBoard) return;
    const cellData = JSON.parse(savedBoard);

    const cells = board.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        if (index === 12) return; // free space
        const word = cellData[index]?.text;
        // Highlight cells whose word has been called (subtle glow)
        if (serverCalledWords.includes(word)) {
            cell.classList.add('called');
        } else {
            cell.classList.remove('called');
        }
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

// Bingo Event - Validates then sends to server
btnBingo.addEventListener('click', () => {
    const storageKey = 'bingoBoard_isaac_player_' + currentPlayer;
    const savedBoard = localStorage.getItem(storageKey);
    if (!savedBoard) return;

    const cellData = JSON.parse(savedBoard);

    // Check all marked cells (except free space) are in the called list
    const cheatingCells = cellData.filter((cell, i) => {
        return i !== 12 && cell.marked && !serverCalledWords.includes(cell.text);
    });

    if (cheatingCells.length > 0) {
        // Busted! Highlight the bad cells
        const cells = board.querySelectorAll('.cell');
        cellData.forEach((cell, i) => {
            if (i !== 12 && cell.marked && !serverCalledWords.includes(cell.text)) {
                cells[i].classList.add('invalid-click');
                setTimeout(() => cells[i].classList.remove('invalid-click'), 800);
            }
        });
        alert('🚨 ¡Trampa detectada! Tienes casillas marcadas que aún no han salido en la ruleta. ¡Sigue esperando!');
        return;
    }

    // Check there are enough marked cells to form a valid bingo (row, column or diagonal)
    const grid = cellData.map(c => c.marked);
    const lines = [
        // Rows
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
        // Columns
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
        // Diagonals
        [0,6,12,18,24],[4,8,12,16,20]
    ];
    const hasBingo = lines.some(line => line.every(i => grid[i]));

    if (!hasBingo) {
        alert('¡Todavía no tienes una línea completa! Sigue marcando.');
        return;
    }

    // Valid Bingo! Send signal
    bingoChannel.send({
        type: 'broadcast',
        event: 'playerBingo',
        payload: { name: currentPlayer }
    });
    
    celebrationModal.classList.remove('hidden');
});

btnCloseCelebration.addEventListener('click', () => {
    celebrationModal.classList.add('hidden');
});

// Iniciar sesión
initPlayerSession();
