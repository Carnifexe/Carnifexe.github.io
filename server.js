const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialisierung
const app = express();
const httpServer = createServer(app);

// Render-spezifische WebSocket-Konfiguration
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com', // Ihre exakte Frontend-URL
      'http://localhost:10000' // Für lokale Tests
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket'],
  allowEIO3: true, // Kompatibilität mit älteren Clients
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000 // 2 Minuten Wiederherstellung
  }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Wichtige Endpoints für Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: Date.now(),
    websocketClients: io.engine.clientsCount
  });
});

app.get('/debug', (req, res) => {
  res.json({
    server: 'carnifexe-github-io.onrender.com',
    websocket: {
      clients: io.engine.clientsCount,
      pingInterval: io.engine.opts.pingInterval,
      pingTimeout: io.engine.opts.pingTimeout
    },
    memory: process.memoryUsage()
  });
});

// Spiel-Logik
const gameState = {
  players: {},
  games: {},
  playerCount: 0
};

// WebSocket-Verbindungen
io.on('connection', (socket) => {
  console.log(`🎮 Neue Verbindung: ${socket.id}`);
  
  // Spieler registrieren
  gameState.playerCount++;
  const playerName = `Spieler ${gameState.playerCount}`;
  gameState.players[socket.id] = {
    name: playerName,
    status: 'waiting',
    lastActive: Date.now()
  };

  // 1. Ping-Pong für Verbindungsüberwachung
  socket.on('ping', (cb) => {
    gameState.players[socket.id].lastActive = Date.now();
    cb('pong');
  });

  // 2. Spielinitialisierung
  socket.on('invite', (targetId) => {
    if (gameState.players[targetId]?.status === 'waiting') {
      io.to(targetId).emit('invitation', {
        from: socket.id,
        fromName: playerName
      });
    }
  });

  // 3. Spielstart
  socket.on('startGame', ({ gameId, players }) => {
    gameState.games[gameId] = {
      ball: { x: 50, y: 50, speedX: 5, speedY: 5 },
      scores: { left: 0, right: 0 },
      lastUpdate: Date.now()
    };
    players.forEach(id => {
      gameState.players[id].status = 'playing';
      io.to(id).emit('gameStart', { gameId });
    });
  });

  // 4. Spielereignisse
  socket.on('playerMove', ({ gameId, y }) => {
    const game = gameState.games[gameId];
    if (game) {
      if (socket.id === game.leftPlayer) game.leftPaddle = y;
      if (socket.id === game.rightPlayer) game.rightPaddle = y;
      game.lastUpdate = Date.now();
    }
  });

  // 5. Verbindungstrennung
  socket.on('disconnect', () => {
    console.log(`⚠️ Verbindung getrennt: ${socket.id}`);
    cleanUpPlayer(socket.id);
  });

  // Debug: Testevent senden
  socket.emit('serverReady', {
    message: `Verbunden mit carnifexe-github-io.onrender.com`,
    timestamp: Date.now()
  });
});

// Hilfsfunktionen
function cleanUpPlayer(playerId) {
  // Beendet alle Spiele des Spielers
  for (const gameId in gameState.games) {
    const game = gameState.games[gameId];
    if ([game?.leftPlayer, game?.rightPlayer].includes(playerId)) {
      endGame(gameId);
    }
  }
  delete gameState.players[playerId];
  updatePlayerList();
}

function endGame(gameId) {
  const game = gameState.games[gameId];
  if (game) {
    [game.leftPlayer, game.rightPlayer].forEach(id => {
      if (gameState.players[id]) {
        gameState.players[id].status = 'waiting';
        io.to(id).emit('gameEnd');
      }
    });
    delete gameState.games[gameId];
  }
}

function updatePlayerList() {
  io.emit('playerListUpdate', 
    Object.values(gameState.players).map(p => ({
      id: p.socketId,
      name: p.name,
      status: p.status
    }))
  );
}

// Spiel-Update-Loop (60 FPS)
setInterval(() => {
  for (const gameId in gameState.games) {
    updateGamePhysics(gameState.games[gameId]);
  }
}, 1000 / 60);

function updateGamePhysics(game) {
  // Ballbewegung
  game.ball.x += game.ball.speedX;
  game.ball.y += game.ball.speedY;

  // Kollisionen
  if (game.ball.y <= 0 || game.ball.y >= 100) game.ball.speedY *= -1;
  if (game.ball.x <= 5 && Math.abs(game.ball.y - game.leftPaddle) < 10) game.ball.speedX *= -1.05;
  if (game.ball.x >= 95 && Math.abs(game.ball.y - game.rightPaddle) < 10) game.ball.speedX *= -1.05;

  // Punkte
  if (game.ball.x < 0 || game.ball.x > 100) {
    game.ball.x < 0 ? game.scores.right++ : game.scores.left++;
    resetBall(game);
  }
}

function resetBall(game) {
  game.ball = {
    x: 50,
    y: 50,
    speedX: (Math.random() > 0.5 ? 1 : -1) * 5,
    speedY: (Math.random() > 0.5 ? 1 : -1) * 5
  };
}

// Serverstart
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ====================
  🚀 Server gestartet
  📡 Port: ${PORT}
  🌐 WebSocket: wss://carnifexe-github-io.onrender.com
  🏠 Local: http://localhost:${PORT}
  ====================
  `);
});
