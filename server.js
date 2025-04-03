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
  inGame: new Map()   // gameId -> {player1, player2}
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

    const opponent = game.players.find(p => p.id !== socket.id);
    if (opponent) {
      opponent.socket.emit('game_update', data);
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

    // Spiel erstellen
    players.inGame.set(gameId, {
      players: [player1, player2],
      createdAt: Date.now()
    });

    log(`Spiel gestartet: ${gameId} | ${player1.name} vs ${player2.name}`);

    // Spieler benachrichtigen
    player1.socket.emit('game_start', {
      gameId,
      playerSide: 'left',
      opponent: player2.name
    });

    player2.socket.emit('game_start', {
      gameId,
      playerSide: 'right',
      opponent: player1.name
    });

    // Warteschlange aktualisieren
    updateQueue();
  }
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
