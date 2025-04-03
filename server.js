const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Debugging aktivieren
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log(`[${new Date().toISOString()}]`, ...args);
}

const io = new Server(httpServer, {
  cors: {
    origin: ['https://carnifexe-github-io.onrender.com', 'http://localhost:10000'],
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

app.use(express.static(path.join(__dirname, 'public')));

// Erweiterte Spielerverwaltung
const players = {
  waiting: new Map(),  // socket.id -> playerData
  inGame: new Map()    // gameId -> {player1, player2}
};

io.on('connection', (socket) => {
  log(`Neue Verbindung: ${socket.id}`);

  socket.on('join', (playerName = `Player_${Math.floor(Math.random() * 1000)}`) => {
    log(`${socket.id} betritt Warteschlange als "${playerName}"`);
    
    players.waiting.set(socket.id, {
      socket,
      name: playerName,
      joinedAt: Date.now()
    });

    socket.emit('queue_update', {
      position: players.waiting.size,
      estimatedTime: players.waiting.size * 10 // Geschätzte Sekunden
    });

    tryMatchPlayers();
  });

  socket.on('disconnect', () => {
    cleanupPlayer(socket.id);
    log(`Verbindung getrennt: ${socket.id}`);
  });
});

// Verbessertes Matchmaking
function tryMatchPlayers() {
  log(`Aktuelle Warteschlange: ${players.waiting.size} Spieler`);
  
  if (players.waiting.size >= 2) {
    const [id1, id2] = Array.from(players.waiting.keys()).slice(0, 2);
    const player1 = players.waiting.get(id1);
    const player2 = players.waiting.get(id2);
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Spieler in Spiel bewegen
    players.waiting.delete(id1);
    players.waiting.delete(id2);
    players.inGame.set(gameId, { player1, player2 });

    // Spiel starten
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

    log(`Neues Spiel (${gameId}): ${player1.name} vs ${player2.name}`);
    
    // Update für verbleibende Wartende
    updateQueuePositions();
  }
}

function updateQueuePositions() {
  let position = 1;
  players.waiting.forEach((player, id) => {
    player.socket.emit('queue_update', {
      position: position++,
      estimatedTime: position * 10
    });
  });
}

function cleanupPlayer(playerId) {
  // Aus Warteschlange entfernen
  if (players.waiting.has(playerId)) {
    players.waiting.delete(playerId);
    log(`Spieler ${playerId} aus Warteschlange entfernt`);
    updateQueuePositions();
  }

  // Aus aktiven Spielen entfernen
  players.inGame.forEach((game, gameId) => {
    if (game.player1.socket.id === playerId || game.player2.socket.id === playerId) {
      const opponent = game.player1.socket.id === playerId ? game.player2 : game.player1;
      opponent.socket.emit('game_ended', { reason: 'opponent_disconnected' });
      players.inGame.delete(gameId);
      log(`Spiel ${gameId} beendet (Spieler getrennt)`);
    }
  });
}

// Statusüberwachung
setInterval(() => {
  log(`Status: ${players.waiting.size} wartende, ${players.inGame.size} aktive Spiele`);
}, 60000); // Loggt alle 60 Sekunden

httpServer.listen(PORT, () => {
  log(`Server gestartet auf Port ${PORT}`);
});
