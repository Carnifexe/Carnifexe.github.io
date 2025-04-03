const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Debugging
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log(`[${new Date().toISOString()}]`, ...args);
}

// Socket.io Konfiguration
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com',
      'http://localhost:10000'
    ],
    methods: ["GET", "POST"]
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Spielerverwaltung
const players = {
  waiting: new Map(), // socket.id -> playerData
  inGame: new Map()   // gameId -> {player1, player2, state}
};

io.on('connection', (socket) => {
  log(`Neue Verbindung: ${socket.id}`);

  socket.on('join_queue', (playerName) => {
    const player = {
      socket,
      id: socket.id,
      name: playerName || `Player_${Math.floor(Math.random() * 1000)}`,
      joinedAt: Date.now()
    };

    players.waiting.set(socket.id, player);
    log(`${player.name} (${socket.id}) in Warteschlange`);

    // Bestätigung senden
    socket.emit('queue_update', {
      position: players.waiting.size,
      estimatedWait: players.waiting.size * 5 // Sekunden
    });

    tryMatchPlayers();
  });

  socket.on('game_update', (data) => {
    const game = players.inGame.get(data.gameId);
    if (!game) return;

    // Ball-Physik auf dem Server berechnen (nur wenn vom Host gesendet)
    if (data.ball && data.isHost) {
      calculateBallPhysics(game, data.ball);
    }

    // Update an Gegner senden
    const opponent = game.players.find(p => p.id !== socket.id);
    if (opponent) {
      opponent.socket.emit('game_update', {
        ...data,
        isOpponent: true
      });
    }
  });

  socket.on('disconnect', () => {
    cleanupPlayer(socket.id);
    log(`Verbindung getrennt: ${socket.id}`);
  });
});

// Matchmaking
function tryMatchPlayers() {
  if (players.waiting.size >= 2) {
    const playersToMatch = Array.from(players.waiting.values()).slice(0, 2);
    const [player1, player2] = playersToMatch;
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Spieler aus Warteschlange entfernen
    players.waiting.delete(player1.id);
    players.waiting.delete(player2.id);

    // Spiel erstellen mit initialem Zustand
    const gameState = {
      ball: {
        x: 50,
        y: 50,
        speedX: (Math.random() > 0.5 ? 1 : -1) * 2,
        speedY: (Math.random() * 2 - 1) * 2
      },
      scores: {
        left: 0,
        right: 0
      },
      leftPaddleY: 50,
      rightPaddleY: 50
    };

    players.inGame.set(gameId, {
      players: [player1, player2],
      createdAt: Date.now(),
      state: gameState
    });

    log(`Spiel gestartet: ${gameId} | ${player1.name} vs ${player2.name}`);

    // Spieler benachrichtigen
    player1.socket.emit('game_start', {
      gameId,
      playerSide: 'left',
      opponent: player2.name,
      initialState: gameState
    });

    player2.socket.emit('game_start', {
      gameId,
      playerSide: 'right',
      opponent: player1.name,
      initialState: gameState
    });

    // Warteschlange aktualisieren
    updateQueue();
  }
}

// Ball-Physik Funktion
function calculateBallPhysics(game, ballData) {
  const gameState = game.state;
  
  // Ballbewegung
  gameState.ball.x += ballData.speedX;
  gameState.ball.y += ballData.speedY;

  // Wandkollision
  if (gameState.ball.y <= 0 || gameState.ball.y >= 100) {
    gameState.ball.speedY *= -1;
  }

  // Schlägerkollision
  if (gameState.ball.x <= 5 && Math.abs(gameState.ball.y - game.state.leftPaddleY) < 15) {
    gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 1.05;
  }
  if (gameState.ball.x >= 95 && Math.abs(gameState.ball.y - game.state.rightPaddleY) < 15) {
    gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 1.05;
  }

  // Punkte
  if (gameState.ball.x < 0 || gameState.ball.x > 100) {
    if (gameState.ball.x < 0) gameState.scores.right++;
    else gameState.scores.left++;
    resetBall(gameState);
  }
}

function resetBall(gameState) {
  gameState.ball = { 
    x: 50, 
    y: 50,
    speedX: (Math.random() > 0.5 ? 1 : -1) * 2,
    speedY: (Math.random() * 2 - 1) * 2
  };
}

function cleanupPlayer(playerId) {
  // Aus Warteschlange entfernen
  if (players.waiting.has(playerId)) {
    players.waiting.delete(playerId);
    log(`Spieler ${playerId} aus Warteschlange entfernt`);
    updateQueue();
  }

  // Aus aktiven Spielen entfernen
  players.inGame.forEach((game, gameId) => {
    if (game.players.some(p => p.id === playerId)) {
      game.players.forEach(player => {
        player.socket.emit('game_ended', {
          reason: 'opponent_disconnected'
        });
      });
      players.inGame.delete(gameId);
      log(`Spiel ${gameId} beendet`);
    }
  });
}

function updateQueue() {
  let position = 1;
  players.waiting.forEach(player => {
    player.socket.emit('queue_update', {
      position: position++,
      estimatedWait: position * 5
    });
  });
}

// Serverstart
httpServer.listen(PORT, () => {
  log(`Server läuft auf Port ${PORT}`);
  log(`Warte auf Verbindungen...`);
});

// Status-Logging
setInterval(() => {
  log(`Status: ${players.waiting.size} wartende, ${players.inGame.size} aktive Spiele`);
}, 30000);
