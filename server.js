const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Socket.io Konfiguration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://carnifexe-github-io.onrender.com'] 
      : ['http://localhost:10000'],
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Middleware für statische Dateien
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store');
    } else {
      res.set('Cache-Control', 'public, max-age=86400');
    }
  }
});

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// SPA Fallback Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Matchmaking System
const waitingQueue = [];
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on('join_queue', (playerName) => {
    const player = {
      socket,
      id: socket.id,
      name: playerName || `Player_${Math.floor(Math.random() * 1000)}`,
      joinedAt: Date.now()
    };
    
    waitingQueue.push(player);
    tryMatchPlayers();
  });

  socket.on('game_update', (gameData) => {
    const game = activeGames.get(gameData.gameId);
    if (!game) return;

    const opponent = game.players.find(p => p.id !== socket.id);
    if (opponent) {
      opponent.socket.emit('game_update', gameData);
    }
  });

  socket.on('disconnect', () => {
    cleanupPlayer(socket.id);
  });
});

function tryMatchPlayers() {
  while (waitingQueue.length >= 2) {
    const player1 = waitingQueue.shift();
    const player2 = waitingQueue.shift();
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

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
  }
}

function cleanupPlayer(playerId) {
  // Aus Warteschlange entfernen
  const queueIndex = waitingQueue.findIndex(p => p.id === playerId);
  if (queueIndex !== -1) {
    waitingQueue.splice(queueIndex, 1);
  }

  // Aktive Spiele beenden
  activeGames.forEach((game, gameId) => {
    const playerIndex = game.players.findIndex(p => p.id === playerId);
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
httpServer.listen(PORT, () => {
  console.log(`
  ====================================
  🚀 Server running on port ${PORT}
  ⚡ Environment: ${process.env.NODE_ENV || 'development'}
  🕒 Started at: ${new Date().toLocaleString()}
  ====================================
  `);
});

// Inaktive Spiele bereinigen (stündlich)
setInterval(() => {
  const now = Date.now();
  activeGames.forEach((game, gameId) => {
    if (now - game.createdAt > 3600000) {
      game.players.forEach(player => {
        player.socket.emit('game_ended', {
          reason: 'session_expired'
        });
      });
      activeGames.delete(gameId);
    }
  });
}, 3600000);
