const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// 1. Server-Initialisierung mit erweitertem Logging
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// 2. WebSocket-Konfiguration mit optimierten Einstellungen
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
  pingInterval: 10000,    // Verkürztes Intervall (10s)
  pingTimeout: 20000,     // Kürzerer Timeout (20s)
  cookie: false
});

// 3. Middleware mit Cache-Control
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store');
  }
}));

// 4. Erweiterter Health Check
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

// 5. Debug-Endpoint mit Spielerliste
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

// 6. Spiel-Logik mit verbesserter Spielerverwaltung
const players = {};
const games = {};
let playerCount = 0;
const PLAYER_NAME_PREFIX = "Spieler";

// 7. Verbesserte Spieler-ID Generierung
function generatePlayerId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// 8. WebSocket-Verbindungsmanagement
io.on('connection', (socket) => {
  // Spieler registrieren mit eindeutiger ID
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

  // Initiale Bestätigung senden
  socket.emit('welcome', {
    message: `Willkommen ${playerName}`,
    id: playerId,
    server: 'carnifexe-github-io.onrender.com',
    playerCount
  });

  // Ping-Pong mit Aktivitätsupdate
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

  // Verbindungstrennung mit Aufräumen
  socket.on('disconnect', (reason) => {
    console.log(`❌ Verbindung getrennt: ${playerName} (${reason})`);
    cleanupPlayer(playerId);
  });

  // Initiale Spielerliste senden
  updatePlayerList();
});

// 9. Verbesserte Spiel-Funktionen
function startGame(gameId, player1, player2) {
  games[gameId] = {
    leftPlayer: player1,
    rightPlayer: player2,
    leftPaddleY: 50,
    rightPaddleY: 50,
    ballX: 50,
    ballY: 50,
    ballSpeedX: (Math.random() > 0.5 ? 1 : -1) * 5,
    ballSpeedY: (Math.random() > 0.5 ? 1 : -1) * 5,
    leftScore: 0,
    rightScore: 0,
    startTime: Date.now(),
    lastUpdate: Date.now()
  };

  // Spielerstatus aktualisieren
  players[player1].status = 'playing';
  players[player2].status = 'playing';

  console.log(`🎮 Spiel gestartet: ${gameId} | ${players[player1].name} vs ${players[player2].name}`);

  // Spiel starten
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

  // Aktive Spiele des Spielers beenden
  for (const gameId in games) {
    const game = games[gameId];
    if (game.leftPlayer === playerId || game.rightPlayer === playerId) {
      endGame(gameId, playerId);
    }
  }

  // Spieler entfernen und Zähler aktualisieren
  console.log(`♻️ Spieler aufgeräumt: ${players[playerId].name}`);
  delete players[playerId];
  playerCount = Math.max(0, playerCount - 1); // Sicherstellen, dass der Zähler nicht negativ wird
  
  updatePlayerList();
}

function endGame(gameId, disconnectedPlayerId = null) {
  const game = games[gameId];
  if (!game) return;

  const otherPlayerId = game.leftPlayer === disconnectedPlayerId 
    ? game.rightPlayer 
    : game.leftPlayer;

  // Benachrichtigungen senden
  if (disconnectedPlayerId) {
    io.to(players[otherPlayerId]?.socketId).emit('game_ended', {
      reason: 'opponent_disconnected'
    });
  } else {
    io.to(game.leftPlayer).emit('game_ended', { reason: 'normal' });
    io.to(game.rightPlayer).emit('game_ended', { reason: 'normal' });
  }

  // Spielerstatus zurücksetzen
  [game.leftPlayer, game.rightPlayer].forEach(id => {
    if (players[id]) {
      players[id].status = 'waiting';
    }
  });

  console.log(`🏁 Spiel beendet: ${gameId} | Dauer: ${((Date.now() - game.startTime) / 1000).toFixed(1)}s`);
  delete games[gameId];
}

// 10. Spiel-Loop mit verbesserten Kollisionen
setInterval(() => {
  const now = Date.now();
  for (const gameId in games) {
    updateGamePhysics(gameId, now);
  }
}, 1000 / 60);

function updateGamePhysics(gameId, timestamp) {
  const game = games[gameId];
  if (!game) return;

  // Zeitbasierte Updates für konsistente Geschwindigkeit
  const deltaTime = (timestamp - game.lastUpdate) / 1000;
  game.lastUpdate = timestamp;

  // Ballbewegung
  game.ballX += game.ballSpeedX * deltaTime * 60; // Normalisiert auf 60 FPS
  game.ballY += game.ballSpeedY * deltaTime * 60;

  // Wandkollisionen
  if (game.ballY <= 0 || game.ballY >= 100) {
    game.ballSpeedY *= -1;
    game.ballY = Math.max(0, Math.min(100, game.ballY));
  }

  // Schlägerkollisionen
  if (game.ballX <= 5 && Math.abs(game.ballY - game.leftPaddleY) < 15) {
    game.ballSpeedX = Math.abs(game.ballSpeedX) * 1.05;
    game.ballX = 5; // Position korrigieren
  }
  if (game.ballX >= 95 && Math.abs(game.ballY - game.rightPaddleY) < 15) {
    game.ballSpeedX = -Math.abs(game.ballSpeedX) * 1.05;
    game.ballX = 95;
  }

  // Punkte
  if (game.ballX < 0 || game.ballX > 100) {
    if (game.ballX < 0) game.rightScore++;
    else game.leftScore++;
    resetBall(game);
  }

  broadcastGameState(gameId);
}

function resetBall(game) {
  game.ballX = 50;
  game.ballY = 50;
  game.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
  game.ballSpeedY = (Math.random() * 2 - 1) * 5;
}

// 11. Inaktive Spieler bereinigen
setInterval(() => {
  const now = Date.now();
  Object.keys(players).forEach(playerId => {
    if (now - players[playerId].lastActive > 30000) { // 30 Sekunden inaktiv
      const socket = io.sockets.sockets.get(players[playerId].socketId);
      if (socket) socket.disconnect();
    }
  });
}, 10000);

// 12. Serverstart mit erweitertem Logging
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

// 13. Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server wird heruntergefahren...');
  io.emit('server_shutdown');
  httpServer.close(() => {
    process.exit(0);
  });
});
