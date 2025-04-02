const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);

// WebSocket-Server für Render.com
const io = new Server(server, {
  cors: {
    origin: 'https://carnifexe-github-io.onrender.com',
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Statische Dateien
app.use(express.static(path.join(__dirname, 'public')));

// Health Check (für Render notwendig)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'online',
    websocket: 'wss://carnifexe-github-io.onrender.com' 
  });
});

// Spiel-Logik
const players = {};
let playerCount = 0;

io.on('connection', (socket) => {
  console.log('🔗 Neue Verbindung:', socket.id);

  // Spieler registrieren
  playerCount++;
  const playerName = `Spieler ${playerCount}`;
  players[socket.id] = { name: playerName, score: 0 };

  // Debug-Ping
  socket.on('ping', (cb) => cb('pong'));

  // Beispiel: Spielerbewegung
  socket.on('movePaddle', (y) => {
    io.emit('paddleMoved', { playerId: socket.id, y });
  });

  socket.on('disconnect', () => {
    console.log('❌ Spieler getrennt:', players[socket.id]?.name);
    delete players[socket.id];
  });
});

// Render-Optimierungen
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 Server gestartet
  📡 WebSocket: wss://carnifexe-github-io.onrender.com
  `);
});
