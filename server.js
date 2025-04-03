const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Konfiguration für Production und Development
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://carnifexe-github-io.onrender.com'] 
      : ['http://localhost:10000'],
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Statische Dateien mit Cache-Control
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
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
    players: waitingQueue.length,
    games: activeGames.size,
    uptime: process.uptime()
  });
});

// SPA Fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Matchmaking System
const waitingQueue = [];
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Connected: ${socket.id}`);

  socket.on('join_queue', (playerData) => {
    const player = {
      socket,
      id: socket.id,
      name: playerData?.name || `Player_${Math.floor(Math.random() * 1000)}`,
      joinedAt: Date.now()
    };

    waitingQueue.push(player);
    tryMatchPlayers();
    
    socket.emit('queue_update', {
      position: waitingQueue.length,
      estimatedWait: Math.floor(waitingQueue.length * 1.5) // Geschätzte Wartezeit in Sekunden
    });
  });

  socket.on('game_input', (inputData) => {
    const game = activeGames.get(inputData.gameId);
    if (!game) return;

    const opponent = game.players.find(p => p.id !== socket.id);
    if (opponent) {
      opponent.socket.emit('game_update', {
        type: 'input',
        ...inputData
      });
    }
  });

  socket.on('disconnect', () => {
    cleanupPlayer(socket.id);
    console.log(`[${new Date().toISOString()}] Disconnected: ${socket.id}`);
  });
});

// Helper Functions
function tryMatchPlayers() {
  while (waitingQueue.length >= 2) {
    const player1 = waitingQueue.shift();
    const player2 = waitingQueue.shift();
    const gameId = generateGameId();

    activeGames.set(gameId, {
      players: [player1, player2],
      state: {
        ball: { x: 50, y: 50 },
        scores: { left: 0, right: 0 },
        lastUpdate: Date.now()
      }
    });

    [player1, player2].forEach((player, index) => {
      player.socket.emit('game_start', {
        gameId,
        playerSide: index === 0 ? 'left' : 'right',
        opponentName: index === 0 ? player2.name : player1.name,
        initialState: activeGames.get(gameId).state
      });
    });

    logGameStart(gameId, player1.name, player2.name);
  }
}

function cleanupPlayer(playerId) {
  // Remove from queue
  waitingQueue.splice(waitingQueue.findIndex(p => p.id === playerId), 1);

  // End active games
  activeGames.forEach((game, gameId) => {
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      game.players.forEach(player => {
        player.socket.emit('game_ended', {
          reason: 'opponent_disconnected',
          gameId
        });
      });
      activeGames.delete(gameId);
    }
  });
}

function generateGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function logGameStart(gameId, player1, player2) {
  const logEntry = `[${new Date().toISOString()}] Game ${gameId}: ${player1} vs ${player2}\n`;
  fs.appendFile('games.log', logEntry, (err) => {
    if (err) console.error('Log error:', err);
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

// Cleanup old games every hour
setInterval(() => {
  const now = Date.now();
  activeGames.forEach((game, gameId) => {
    if (now - game.state.lastUpdate > 3600000) { // 1 hour
      game.players.forEach(player => {
        player.socket.emit('game_ended', {
          reason: 'inactivity',
          gameId
        });
      });
      activeGames.delete(gameId);
    }
  });
}, 3600000);
