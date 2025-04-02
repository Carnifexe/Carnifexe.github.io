const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);

// Render-spezifische WebSocket-Konfiguration
const io = new Server(server, {
  cors: {
    origin: 'https://carnifexe-github-io.onrender.com',
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Statische Dateien aus /public
app.use(express.static(path.join(__dirname, 'public')));

// Health Check für Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    websocket: 'wss://carnifexe-github-io.onrender.com'
  });
});

// WebSocket-Verbindung
io.on('connection', (socket) => {
  console.log('🔗 Verbindung:', socket.id);

  // Ping-Pong für Render Keep-Alive
  socket.on('ping', (cb) => cb('pong'));

  // Spieler-Management
  const players = {};
  const games = {};
  let playerCount = 0;

  playerCount++;
  players[socket.id] = {
    name: `Spieler ${playerCount}`,
    status: 'waiting'
  };

  // Spiel-Logik (Beispiel-Event)
  socket.on('playerMove', (data) => {
    io.emit('gameUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Trennung:', socket.id);
    delete players[socket.id];
  });
});

// Render-Optimierungen
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 Server gestartet auf Port ${PORT}
  📡 WebSocket: wss://carnifexe-github-io.onrender.com
  `);
});
