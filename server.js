const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = createServer(app);

// CORS für Render.com konfigurieren
app.use(cors({
  origin: [
    'https://carnifexe-github-io.onrender.com',
    'http://localhost:10000'
  ],
  credentials: true
}));

// WebSocket-Server mit speziellen Render-Einstellungen
const io = new Server(server, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com',
      'http://localhost:10000'
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../client')));

// Health Check für Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    connections: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

// Debug Endpoint
app.get('/debug', (req, res) => {
  res.json({
    clients: Array.from(io.sockets.sockets.keys()),
    games: Object.keys(games).length,
    memory: process.memoryUsage()
  });
});

// Spiel-Logik
const players = {};
const games = {};
let playerCount = 0;

io.on('connection', (socket) => {
  console.log('🔌 Neue Verbindung:', socket.id);
  
  playerCount++;
  const playerName = `Spieler ${playerCount}`;
  players[socket.id] = {
    name: playerName,
    socket: socket,
    status: 'waiting'
  };

  updatePlayerList();

  // Ping/Pong für Verbindungsüberwachung
  socket.on('ping', (cb) => cb(Date.now()));

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
  const playerList = Object.values(players).map(p => ({
    id: p.socket.id,
    name: p.name,
    status: p.status
  }));
  io.emit('playerListUpdate', playerList);
}

// Spiel-Loop (60 FPS)
setInterval(() => {
  for (const gameId in games) {
    updateGamePhysics(games[gameId]);
  }
}, 1000 / 60);

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Server läuft auf Port ${PORT}`);
  console.log(`🔗 WebSocket: wss://localhost:${PORT}`);
});
