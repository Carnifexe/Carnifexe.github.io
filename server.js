const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// 1. Server-Initialisierung
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// 2. WebSocket-Konfiguration
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com',
      'https://carnifexe.github.io',
      'http://localhost:10000'
    ],
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['websocket'],
  allowEIO3: true,
  pingInterval: 10000,
  pingTimeout: 20000,
  cookie: false
});

// 3. Middleware
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store');
  }
}));

// 4. Health Check Endpoint
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    status: 'online',
    players: Object.keys(players).length,
    games: Object.keys(games).length,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heap: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}/${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
    },
    uptime: process.uptime()
  });
});

// 5. Debug Endpoint
app.get('/debug', (req, res) => {
  res.json({
    clients: Array.from(io.sockets.sockets.keys()),
    players: Object.values(players).map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      lastActive: p.lastActive
    })),
    games: Object.keys(games).map(gameId => ({
      gameId,
      players: [games[gameId].leftPlayer, games[gameId].rightPlayer],
      score: `${games[gameId].leftScore}-${games[gameId].rightScore}`
    }))
  });
});

// 6. Spiel-Logik
const players = {};
const games = {};
let playerCount = 0;
const PLAYER_NAME_PREFIX = "Spieler";
const INITIAL_BALL_SPEED = 1.5; // Reduzierte Geschwindigkeit
const PADDLE_GROWTH_FACTOR = 0.2;

function generatePlayerId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// 7. WebSocket-Verbindungsmanagement
io.on('connection', (socket) => {
  playerCount++;
  const playerId = generatePlayerId();
  const playerName = `${PLAYER_NAME_PREFIX} ${playerCount}`;
  
  players[playerId] = {
    id: playerId,
    socketId: socket.id,
    name: playerName,
    status: 'waiting',
    lastActive: Date.now(),
    joinTime: new Date().toISOString()
  };

  console.log(`🔗 Neue Verbindung: ${playerName} (ID: ${playerId}) | ${playerCount} Spieler online`);

  // Initiale Begrüßung
  socket.emit('welcome', {
    message: `Willkommen ${playerName}`,
    id: playerId,
    server: 'carnifexe-github-io.onrender.com',
    playerCount
  });

  // Ping-Pong
  socket.on('ping', (timestamp, callback) => {
    if (players[playerId]) {
      players[playerId].lastActive = Date.now();
    }
    callback({ 
      timestamp,
      serverTime: Date.now(),
      playerCount
    });
  });

  // Spielmanagement
  socket.on('invite', (targetId) => {
    if (players[targetId]?.status === 'waiting' && players[playerId]?.status === 'waiting') {
      console.log(`🎯 ${playerName} lädt ${players[targetId].name} ein`);
      
      io.to(players[targetId].socketId).emit('invitation', {
        from: playerId,
        fromName: playerName,
        gameId: `${playerId}-${targetId}`
      });
      
      socket.emit('invitation_sent', {
        targetId,
        targetName: players[targetId].name
      });
    }
  });

  socket.on('accept_invitation', ({ gameId, players: [player1, player2] }) => {
    if (players[player1] && players[player2]) {
      startGame(gameId, player1, player2);
    }
  });

  socket.on('move_paddle', ({ gameId, y, side }) => {
    updatePaddlePosition(gameId, side, y);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ Verbindung getrennt: ${playerName} (${reason})`);
    cleanupPlayer(playerId);
  });

  updatePlayerList();
});

// 8. Spiel-Funktionen
function startGame(gameId, player1, player2) {
  games[gameId] = {
    leftPlayer: player1,
    rightPlayer: player2,
    leftPaddleY: 50,
    rightPaddleY: 50,
    leftPaddleSize: 1,
    rightPaddleSize: 1,
    ballX: 50,
    ballY: 50,
    ballSpeedX: (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED,
    ballSpeedY: (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED,
    leftScore: 0,
    rightScore: 0,
    startTime: Date.now(),
    lastUpdate: Date.now()
  };

  players[player1].status = 'playing';
  players[player2].status = 'playing';

  console.log(`🎮 Spiel gestartet: ${gameId} | ${players[player1].name} vs ${players[player2].name}`);

  io.to(players[player1].socketId).emit('game_start', {
    gameId,
    playerSide: 'left',
    opponent: players[player2].name
  });

  io.to(players[player2].socketId).emit('game_start', {
    gameId,
    playerSide: 'right',
    opponent: players[player1].name
  });

  updatePlayerList();
}

function updatePaddlePosition(gameId, side, y) {
  const game = games[gameId];
  if (game) {
    game[`${side}PaddleY`] = Math.max(0, Math.min(100, y));
    game.lastUpdate = Date.now();
    broadcastGameState(gameId);
  }
}

function broadcastGameState(gameId) {
  const game = games[gameId];
  if (!game) return;

  const gameState = {
    leftPaddleY: game.leftPaddleY,
    rightPaddleY: game.rightPaddleY,
    leftPaddleSize: game.leftPaddleSize,
    rightPaddleSize: game.rightPaddleSize,
    ballX: game.ballX,
    ballY: game.ballY,
    leftScore: game.leftScore,
    rightScore: game.rightScore,
    gameTime: Date.now() - game.startTime
  };

  io.to(players[game.leftPlayer].socketId).emit('game_update', gameState);
  io.to(players[game.rightPlayer].socketId).emit('game_update', gameState);
}

function updatePlayerList() {
  const playerData = Object.values(players).map(p => ({
    id: p.id,
    name: p.name,
    status: p.status,
    lastActive: p.lastActive
  }));

  io.emit('player_list', playerData);
}

function cleanupPlayer(playerId) {
  if (!players[playerId]) return;

  for (const gameId in games) {
    const game = games[gameId];
    if (game.leftPlayer === playerId || game.rightPlayer === playerId) {
      endGame(gameId, playerId);
    }
  }

  console.log(`♻️ Spieler aufgeräumt: ${players[playerId].name}`);
  delete players[playerId];
  playerCount = Math.max(0, playerCount - 1);
  
  updatePlayerList();
}

function endGame(gameId, disconnectedPlayerId = null) {
  const game = games[gameId];
  if (!game) return;

  const otherPlayerId = game.leftPlayer === disconnectedPlayerId 
    ? game.rightPlayer 
    : game.leftPlayer;

  if (disconnectedPlayerId) {
    io.to(players[otherPlayerId]?.socketId).emit('game_ended', {
      reason: 'opponent_disconnected'
    });
  } else {
    io.to(players[game.leftPlayer].socketId).emit('game_ended', { reason: 'normal' });
    io.to(players[game.rightPlayer].socketId).emit('game_ended', { reason: 'normal' });
  }

  [game.leftPlayer, game.rightPlayer].forEach(id => {
    if (players[id]) {
      players[id].status = 'waiting';
    }
  });

  console.log(`🏁 Spiel beendet: ${gameId} | Dauer: ${((Date.now() - game.startTime) / 1000).toFixed(1)}s`);
  delete games[gameId];
}

// 9. Spiel-Loop mit optimierter Physik
setInterval(() => {
  const now = Date.now();
  for (const gameId in games) {
    updateGamePhysics(gameId, now);
  }
}, 1000 / 60);

function updateGamePhysics(gameId, timestamp) {
  const game = games[gameId];
  if (!game) return;

  const deltaTime = (timestamp - game.lastUpdate) / 1000;
  game.lastUpdate = timestamp;

  // Ballbewegung mit reduzierter Geschwindigkeit
  game.ballX += game.ballSpeedX * deltaTime * 30;
  game.ballY += game.ballSpeedY * deltaTime * 30;

  // Wandkollisionen
  if (game.ballY <= 0 || game.ballY >= 100) {
    game.ballSpeedY *= -1;
    game.ballY = Math.max(0, Math.min(100, game.ballY));
  }

  // Schlägerkollisionen mit Größenberücksichtigung
  const leftPaddleHeight = 15 * game.leftPaddleSize;
  const rightPaddleHeight = 15 * game.rightPaddleSize;
  
  if (game.ballX <= 5 && Math.abs(game.ballY - game.leftPaddleY) < leftPaddleHeight/2) {
    game.ballSpeedX = Math.abs(game.ballSpeedX) * 1.05;
    game.ballX = 5;
  }
  if (game.ballX >= 95 && Math.abs(game.ballY - game.rightPaddleY) < rightPaddleHeight/2) {
    game.ballSpeedX = -Math.abs(game.ballSpeedX) * 1.05;
    game.ballX = 95;
  }

  // Punkte mit Schlägergrößenanpassung
  if (game.ballX < 0 || game.ballX > 100) {
    if (game.ballX < 0) {
      game.rightScore++;
      game.leftPaddleSize = Math.min(2, game.leftPaddleSize + PADDLE_GROWTH_FACTOR);
      game.rightPaddleSize = 1;
    } else {
      game.leftScore++;
      game.rightPaddleSize = Math.min(2, game.rightPaddleSize + PADDLE_GROWTH_FACTOR);
      game.leftPaddleSize = 1;
    }
    resetBall(game);
  }

  broadcastGameState(gameId);
}

function resetBall(game) {
  game.ballX = 50;
  game.ballY = 50;
  game.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED;
  game.ballSpeedY = (Math.random() * 2 - 1) * INITIAL_BALL_SPEED;
}

// 10. Inaktive Spieler bereinigen
setInterval(() => {
  const now = Date.now();
  Object.keys(players).forEach(playerId => {
    if (now - players[playerId].lastActive > 30000) {
      const socket = io.sockets.sockets.get(players[playerId].socketId);
      if (socket) socket.disconnect();
    }
  });
}, 10000);

// 11. Serverstart
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

// 12. Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server wird heruntergefahren...');
  io.emit('server_shutdown');
  httpServer.close(() => {
    process.exit(0);
  });
});
