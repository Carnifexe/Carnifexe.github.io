const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Korrigierte Socket.io Konfiguration mit allen Klammern
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com',
      'http://localhost:10000'
    ],
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Statische Dateien - korrekte Middleware-Syntax
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', time: new Date() });
});

// SPA Fallback Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Matchmaking System
const waitingPlayers = [];
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join', (playerName) => {
    waitingPlayers.push({
      socket,
      name: playerName || `Player${Math.floor(Math.random() * 1000)}`
    });
    tryMatchPlayers();
  });

  socket.on('disconnect', () => {
    cleanupPlayer(socket.id);
  });
});

function tryMatchPlayers() {
  while (waitingPlayers.length >= 2) {
    const [player1, player2] = waitingPlayers.splice(0, 2);
    const gameId = `game_${Date.now()}`;
    
    activeGames.set(gameId, [player1.socket, player2.socket]);
    
    player1.socket.emit('start', { 
      gameId, 
      side: 'left',
      opponent: player2.name 
    });
    
    player2.socket.emit('start', { 
      gameId, 
      side: 'right',
      opponent: player1.name 
    });
  }
}

function cleanupPlayer(playerId) {
  // Aus Warteschlange entfernen
  const index = waitingPlayers.findIndex(p => p.socket.id === playerId);
  if (index !== -1) waitingPlayers.splice(index, 1);
  
  // Aktive Spiele bereinigen
  activeGames.forEach((players, gameId) => {
    if (players.some(p => p.id === playerId)) {
      players.forEach(p => p.emit('end'));
      activeGames.delete(gameId);
    }
  });
}

// Serverstart
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
