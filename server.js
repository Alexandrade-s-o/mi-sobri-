const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_FILE = './db.json';

// Estado por defecto
let gameState = {
    words: [
        "Pañales", "Biberón", "Chupón", "Sonajero", "Babero", "Cobija", 
        "Calcetines", "Zapatitos", "Toallitas", "Crema", "Shampoo", 
        "Talco", "Gorrito", "Mameluco", "Tina", "Juguete", "Mordedera", 
        "Cuna", "Carriola", "Canguro", "Bañera", "Toalla", "Termómetro", 
        "Cepillo", "Esponja", "Pañalera", "Aspirador", "Cambiador",
        "Monitor", "Almohada", "Peluche", "Bañador", "Móvil", "Termo"
    ],
    calledWords: [],
    remainingWords: []
};

// Cargar la base de datos si existe
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        gameState = JSON.parse(data);
    } catch (e) {
        console.error("Error reading db.json, starting with defaults.");
        gameState.remainingWords = [...gameState.words];
    }
} else {
    // Inicializar remainingWords la primera vez
    gameState.remainingWords = [...gameState.words];
    fs.writeFileSync(DB_FILE, JSON.stringify(gameState));
}

// Guardar en la base de datos
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(gameState, null, 2));
}

// Servir la carpeta actual como archivos web
app.use(express.static(__dirname));

// WebSocket Logic (Tiempo Real)
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado: ' + socket.id);

    // Enviar el estado actual al apenas conectarse
    socket.emit('syncState', gameState);

    // Cuando la admin guarda nuevas palabras
    socket.on('adminUpdateWords', (newWords) => {
        gameState.words = newWords;
        // Al cambiar palabras, reiniciar la tómbola
        gameState.remainingWords = [...newWords];
        gameState.calledWords = [];
        saveDB();
        io.emit('syncState', gameState);
        io.emit('adminAlert', 'Palabras actualizadas y juego reiniciado.');
    });

    // Cuando la admin gira y saca una tarjeta
    socket.on('adminDrawWord', (wordTarget) => {
        // Validación de seguridad para que la palabra no se repita
        if (!gameState.calledWords.includes(wordTarget)) {
            gameState.calledWords.push(wordTarget);
            gameState.remainingWords = gameState.remainingWords.filter(w => w !== wordTarget);
            saveDB();
            // Emitir a todos la actualización
            io.emit('syncState', gameState);
        }
    });

    // Cuando la admin reinicia el juego entero
    socket.on('adminResetGame', () => {
        gameState.remainingWords = [...gameState.words];
        gameState.calledWords = [];
        saveDB();
        io.emit('syncState', gameState);
    });

    // Cuando un jugador presiona el gran botón de BINGO
    socket.on('playerBingo', (playerName) => {
        console.log(`¡${playerName} cantó BINGO!`);
        // Avisar a todos (especialmente a la administracion)
        io.emit('bingoAlert', playerName);
    });

    socket.on('disconnect', () => {
         console.log('Usuario desconectado: ' + socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('=================================');
    console.log(`¡BASE DE DATOS Y SERVIDOR INICIADOS!`);
    console.log(`Abre el Bingo Multijugador en: http://localhost:${PORT}`);
    console.log(`Invita a la familia conectándose a tu IP en el puerto ${PORT}`);
    console.log('=================================');
});
