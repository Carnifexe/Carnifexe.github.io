const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Server Initialisierung
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Socket.io Konfiguration
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com',
      'https://carnifexe.github.io',
      'http://localhost:10000'
    ],
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Middleware für statische Dateien
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store');
  }
});

// API Endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    players: waitingQueue.length,
    activeGames: activeGames.size
  });
});

// Fallback für SPA Routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Spieler-Warteschlange
const waitingQueue = [];
const activeGames = new Map();

// Socket.io Verbindungsmanagement
io.on('connection', (socket) => {
  console.log(`Neue Verbindung: ${socket.id}`);

  socket.on('join_queue', (playerName) => {
    const player = {
      socket,
      name: playerName || `Spieler_${Math.floor(Math.random() * 1000)}`,
      joinedAt: Date.now()
    };
    
    waitingQueue.push(player);
    tryMatchPlayers();
    
    console.log(`Spieler in Warteschlange: ${player.name}`);
  });

  socket.on('game_update', (data) => {
    const game = activeGames.get(data.gameId);
    if (!game) return;

    const opponent = game.players.find(p => p.socket.id !== socket.id);
    if (opponent) {
      opponent.socket.emit('game_update', {
        ...data,
        isOpponent: true
      });
    }
  });

  socket.on('disconnect', () => {
    cleanupPlayer(socket.id);
    console.log(`Verbindung getrennt: ${socket.id}`);
  });
});

// Matchmaking Funktion
function tryMatchPlayers() {
  while (waitingQueue.length >= 2) {
    const player1 = waitingQueue.shift();
    const player2 = waitingQueue.shift();
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    activeGames.set(gameId, {
      players: [player1, player2],
      createdAt: Date.now()
    });

    player1.socket.emit('game_start', {
      gameId,
      playerSide: 'left',
      opponentName: player2.name
    });

    player2.socket.emit('game_start', {
      gameId,
      playerSide: 'right',
      opponentName: player1.name
    });

    console.log(`Neues Spiel gestartet: ${gameId}`);
    console.log(`Spieler: ${player1.name} vs ${player2.name}`);
  }
}

// Spieler Cleanup
function cleanupPlayer(socketId) {
  // Aus Warteschlange entfernen
  const queueIndex = waitingQueue.findIndex(p => p.socket.id === socketId);
  if (queueIndex !== -1) {
    waitingQueue.splice(queueIndex, 1);
  }

  // Aktive Spiele beenden
  activeGames.forEach((game, gameId) => {
    const playerIndex = game.players.findIndex(p => p.socket.id === socketId);
    if (playerIndex !== -1) {
      game.players.forEach(player => {
        player.socket.emit('game_ended', {
          reason: 'opponent_disconnected'
        });
      });
      activeGames.delete(gameId);
    }
  });
}

// Server Start
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ==========================================
  🚀 Server gestartet auf Port ${PORT}
  📡 WebSocket: wss://carnifexe-github-io.onrender.com
  🕹️  Bereit für Verbindungen
  ⏱  ${new Date().toLocaleString()}
  ==========================================
  `);
});

// Inaktive Spiele bereinigen (alle 30 Minuten)
setInterval(() => {
  const now = Date.now();
  activeGames.forEach((game, gameId) => {
    if (now - game.createdAt > 1800000) { // 30 Minuten
      game.players.forEach(player => {
        player.socket.emit('game_ended', {
          reason: 'session_expired'
        });
      });
      activeGames.delete(gameId);
    }
  });
}, 1800000);
