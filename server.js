const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

// Initialisierung
const app = express();
const httpServer = createServer(app);

// CORS für Render.com konfigurieren
const allowedOrigins = [
  'https://carnifexe-github-io.onrender.com',
  'http://localhost:10000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// WebSocket-Server mit Render-spezifischen Einstellungen
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 Minuten
    skipMiddlewares: true
  }
});

// Statische Dateien aus public/ servieren
app.use(express.static(path.join(__dirname, 'public')));

// API-Endpunkte
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    connections: io.engine.clientsCount
  });
});

// Spiel-Logik
const players = {};
const games = {};
let playerCount = 0;

io.on('connection', (socket) => {
  console.log('🔌 Neue Verbindung:', socket.id);
  
  // Spieler registrieren
  playerCount++;
  const playerName = `Spieler ${playerCount}`;
  players[socket.id] = { name: playerName, status: 'waiting' };

  // Initiale Spielerliste senden
  updatePlayerList();

  // Ping/Pong für Verbindungsüberwachung
  socket.on('ping', (cb) => cb('pong'));

  // Spiel-Events
  socket.on('invite', (targetId) => {
    if (players[targetId]?.status === 'waiting') {
      io.to(targetId).emit('invitation', {
        from: socket.id,
        fromName: playerName
      });
    }
  });

  socket.on('invitationResponse', ({ to, accepted }) => {
    if (accepted) {
      startGame(socket.id, to);
    } else {
      io.to(to).emit('invitationDeclined', { by: playerName });
    }
  });

  socket.on('paddleMove', ({ gameId, y }) => {
    const game = games[gameId];
    if (!game) return;

    if (socket.id === game.leftPlayer) game.leftPaddleY = y;
    if (socket.id === game.rightPlayer) game.rightPaddleY = y;

    updateGameState(game);
  });

  socket.on('disconnect', () => {
    console.log('❌ Verbindung getrennt:', socket.id);
    endPlayerSession(socket.id);
  });
});

// Spiel-Funktionen
function startGame(player1, player2) {
  const gameId = `${player1}-${player2}`;
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
    roundsPlayed: 0
  };

  players[player1].status = 'playing';
  players[player2].status = 'playing';

  io.to(player1).emit('gameStart', {
    gameId,
    opponent: players[player2].name,
    playerSide: 'left'
  });

  io.to(player2).emit('gameStart', {
    gameId,
    opponent: players[player1].name,
    playerSide: 'right'
  });

  updatePlayerList();
}

function updateGameState(game) {
  io.to(game.leftPlayer).emit('gameState', {
    leftPaddleY: game.leftPaddleY,
    rightPaddleY: game.rightPaddleY,
    ballX: game.ballX,
    ballY: game.ballY,
    leftScore: game.leftScore,
    rightScore: game.rightScore
  });

  io.to(game.rightPlayer).emit('gameState', {
    leftPaddleY: game.leftPaddleY,
    rightPaddleY: game.rightPaddleY,
    ballX: game.ballX,
    ballY: game.ballY,
    leftScore: game.leftScore,
    rightScore: game.rightScore
  });
}

function endPlayerSession(playerId) {
  for (const gameId in games) {
    if ([games[gameId].leftPlayer, games[gameId].rightPlayer].includes(playerId)) {
      endGame(gameId);
      break;
    }
  }
  delete players[playerId];
  updatePlayerList();
}

function updatePlayerList() {
  io.emit('playerListUpdate', Object.values(players));
}

// Spiel-Loop (60 FPS)
setInterval(() => {
  for (const gameId in games) {
    updateGamePhysics(games[gameId]);
  }
}, 1000 / 60);

function updateGamePhysics(game) {
  // Ballbewegung
  game.ballX += game.ballSpeedX;
  game.ballY += game.ballSpeedY;

  // Kollisionen
  if (game.ballY <= 0 || game.ballY >= 100) game.ballSpeedY *= -1;
  if (game.ballX <= 5 && Math.abs(game.ballY - game.leftPaddleY) < 10) game.ballSpeedX *= -1.05;
  if (game.ballX >= 95 && Math.abs(game.ballY - game.rightPaddleY) < 10) game.ballSpeedX *= -1.05;

  // Punkte
  if (game.ballX < 0 || game.ballX > 100) {
    game.ballX < 0 ? game.rightScore++ : game.leftScore++;
    resetBall(game);
    game.roundsPlayed++;
  }

  // Spielende
  if (game.roundsPlayed >= 10) {
    io.to(game.leftPlayer).emit('gameEnd');
    io.to(game.rightPlayer).emit('gameEnd');
    endGame(gameId);
  }
}

function resetBall(game) {
  game.ballX = 50;
  game.ballY = 50;
  game.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
  game.ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * 5;
}

// Server starten
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Server läuft auf Port ${PORT}`);
  console.log(`🌐 WebSocket: wss://localhost:${PORT}`);
  console.log(`📂 Statische Dateien aus: ${path.join(__dirname, 'public')}`);
});
