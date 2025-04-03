const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['https://carnifexe-github-io.onrender.com', 'http://localhost:10000'],
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

// Matchmaking Queue
const waitingQueue = [];
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`Neuer Spieler verbunden: ${socket.id}`);

  socket.on('join_queue', (playerName) => {
    waitingQueue.push({ socket, name: playerName });
    tryMatchPlayers();
  });

  socket.on('game_update', (data) => {
    const game = activeGames.get(data.gameId);
    if (!game) return;

    const opponent = game.players.find(p => p.socket.id !== socket.id);
    if (opponent) {
      opponent.socket.emit('game_update', {
        ...data,
        isOpponent: true
      });
    }
  });

  socket.on('disconnect', () => {
    // Handle disconnect from queue
    const queueIndex = waitingQueue.findIndex(p => p.socket.id === socket.id);
    if (queueIndex !== -1) {
      waitingQueue.splice(queueIndex, 1);
    }

    // Handle disconnect from active game
    activeGames.forEach((game, gameId) => {
      const playerIndex = game.players.findIndex(p => p.socket.id === socket.id);
      if (playerIndex !== -1) {
        game.players.forEach(p => {
          p.socket.emit('game_ended', { reason: 'opponent_disconnected' });
        });
        activeGames.delete(gameId);
      }
    });
  });
});

function tryMatchPlayers() {
  while (waitingQueue.length >= 2) {
    const player1 = waitingQueue.shift();
    const player2 = waitingQueue.shift();
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    activeGames.set(gameId, {
      players: [player1, player2],
      lastUpdate: Date.now()
    });

    player1.socket.emit('game_start', {
      gameId,
      playerSide: 'left',
      opponentName: player2.name
    });

    player2.socket.emit('game_start', {
      gameId,
      playerSide: 'right',
      opponentName: player1.name
    });

    console.log(`Spiel gestartet: ${gameId} | ${player1.name} vs ${player2.name}`);
  }
}

// Cleanup inactive games every hour
setInterval(() => {
  const now = Date.now();
  activeGames.forEach((game, gameId) => {
    if (now - game.lastUpdate > 3600000) {
      activeGames.delete(gameId);
    }
  });
}, 3600000);

httpServer.listen(process.env.PORT || 10000, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 10000}`);
});
