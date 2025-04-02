const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ======================
// 1. Server-Initialisierung
// ======================
const app = express();
const httpServer = createServer(app);

// ======================
// 2. WebSocket-Konfiguration
// ======================
const io = new Server(httpServer, {
  cors: {
    origin: 'https://carnifexe-github-io.onrender.com',
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

// ======================
// 3. Middleware
// ======================
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// 4. Wichtige Endpoints
// ======================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    websocket: io.engine.clientsCount,
    timestamp: Date.now()
  });
});

app.get('/debug', (req, res) => {
  res.json({
    server: 'carnifexe-github-io.onrender.com',
    clients: Array.from(io.sockets.sockets.keys()),
    games: Object.keys(games).length,
    memory: process.memoryUsage()
  });
});

// ======================
// 5. Spiel-Logik
// ======================
const players = {};
const games = {};
let playerCount = 0;

// ======================
// 6. WebSocket-Handler
// ======================
io.on('connection', (socket) => {
  console.log(`🎮 Neue Verbindung: ${socket.id}`);

  // Spieler registrieren
  playerCount++;
  const playerName = `Spieler ${playerCount}`;
  players[socket.id] = {
    name: playerName,
    status: 'waiting',
    lastActive: Date.now()
  };

  // Initiale Daten senden
  socket.emit('welcome', {
    message: `Willkommen ${playerName}`,
    id: socket.id
  });

  updatePlayerList();

  // ======================
  // 7. Ereignis-Handler
  // ======================
  
  // Ping-Pong für Verbindungsüberwachung
  socket.on('ping', (timestamp, callback) => {
    players[socket.id].lastActive = Date.now();
    callback(timestamp);
  });

  // Spielereignisse
  socket.on('invite', (targetId) => {
    if (players[targetId]?.status === 'waiting') {
      io.to(targetId).emit('invitation', {
        from: socket.id,
        fromName: players[socket.id].name
      });
    }
  });

  socket.on('accept_invitation', ({ gameId, players: [player1, player2] }) => {
    startGame(gameId, player1, player2);
  });

  socket.on('move_paddle', ({ gameId, y, side }) => {
    const game = games[gameId];
    if (game) {
      game[side === 'left' ? 'leftPaddleY' : 'rightPaddleY'] = y;
      updateGameState(gameId);
    }
  });

  // Verbindungstrennung
  socket.on('disconnect', () => {
    console.log(`❌ Verbindung getrennt: ${socket.id}`);
    cleanupPlayer(socket.id);
  });

  // ======================
  // 8. Test-Events
  // ======================
  socket.emit('connection_test', {
    server: 'carnifexe-github-io.onrender.com',
    timestamp: Date.now()
  });
});

// ======================
// 9. Spiel-Funktionen
// ======================
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
    lastUpdate: Date.now()
  };

  // Spielerstatus aktualisieren
  players[player1].status = 'playing';
  players[player2].status = 'playing';

  // Spiel starten
  io.to(player1).emit('game_start', {
    gameId,
    playerSide: 'left',
    opponent: players[player2].name
  });

  io.to(player2).emit('game_start', {
    gameId,
    playerSide: 'right',
    opponent: players[player1].name
  });

  updatePlayerList();
}

function updateGameState(gameId) {
  const game = games[gameId];
  if (!game) return;

  // Ballbewegung
  game.ballX += game.ballSpeedX;
  game.ballY += game.ballSpeedY;

  // Kollisionen
  if (game.ballY <= 0 || game.ballY >= 100) game.ballSpeedY *= -1;
  if (game.ballX <= 5 && Math.abs(game.ballY - game.leftPaddleY) < 10) game.ballSpeedX *= -1.05;
  if (game.ballX >= 95 && Math.abs(game.ballY - game.rightPaddleY) < 10) game.ballSpeedX *= -1.05;

  // Punkte
  if (game.ballX < 0) {
    game.rightScore++;
    resetBall(game);
  } else if (game.ballX > 100) {
    game.leftScore++;
    resetBall(game);
  }

  // Spielzustand an Clients senden
  io.to(game.leftPlayer).emit('game_update', {
    leftPaddleY: game.leftPaddleY,
    rightPaddleY: game.rightPaddleY,
    ballX: game.ballX,
    ballY: game.ballY,
    leftScore: game.leftScore,
    rightScore: game.rightScore
  });

  io.to(game.rightPlayer).emit('game_update', {
    leftPaddleY: game.leftPaddleY,
    rightPaddleY: game.rightPaddleY,
    ballX: game.ballX,
    ballY: game.ballY,
    leftScore: game.leftScore,
    rightScore: game.rightScore
  });

  game.lastUpdate = Date.now();
}

function resetBall(game) {
  game.ballX = 50;
  game.ballY = 50;
  game.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
  game.ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * 5;
}

function cleanupPlayer(playerId) {
  // Aktive Spiele des Spielers beenden
  for (const gameId in games) {
    const game = games[gameId];
    if (game.leftPlayer === playerId || game.rightPlayer === playerId) {
      endGame(gameId);
    }
  }
  delete players[playerId];
  updatePlayerList();
}

function endGame(gameId) {
  const game = games[gameId];
  if (game) {
    [game.leftPlayer, game.rightPlayer].forEach(playerId => {
      if (players[playerId]) {
        players[playerId].status = 'waiting';
        io.to(playerId).emit('game_end');
      }
    });
    delete games[gameId];
  }
}

function updatePlayerList() {
  const playerList = Object.values(players).map(player => ({
    id: player.socketId,
    name: player.name,
    status: player.status
  }));

  // Sende die Liste an alle verbundenen Clients
  io.emit('player_list_update', playerList);
}

// ======================
// 10. Spiel-Loop (60 FPS)
// ======================
setInterval(() => {
  for (const gameId in games) {
    updateGameState(gameId);
  }
}, 1000 / 60);

// ======================
// 11. Serverstart
// ======================
const PORT = process.env.PORT;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ===============================
  🚀 Server gestartet auf Port ${PORT}
  📡 WebSocket: wss://carnifexe-github-io.onrender.com
  🕹️  Bereit für Verbindungen
  ===============================
  `);
});
