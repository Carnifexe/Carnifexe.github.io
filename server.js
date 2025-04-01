const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Spielkonstanten
const BALL_BASE_SPEED = 8;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10; // Korrigierte Schlägerbreite

const gameState = {
  players: [],
  queue: [],
  rooms: [],
  defaultCanvas: { width: 800, height: 600 }
};

function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function updatePlayerCounts() {
  const message = {
    type: "playerCountUpdate",
    totalPlayers: gameState.players.length,
    inQueue: gameState.queue.length
  };
  
  wss.clients.forEach(client => {
    sendToClient(client, message);
  });
}

function handleSyncRequest(ws, data) {
  sendToClient(ws, {
    type: "syncResponse",
    clientTime: data.clientTime,
    serverTime: Date.now()
  });
}

function handleJoinQueue(ws, data) {
  if (!gameState.queue.includes(ws)) {
    gameState.queue.push(ws);
    sendToClient(ws, {
      type: 'joinedQueue',
      position: gameState.queue.length
    });
    
    updatePlayerCounts();
    
    if (gameState.queue.length >= 2) {
      startGame();
    }
  }
}

function handleGameState(ws, data) {
  const room = gameState.rooms.find(r => r.players.includes(ws));
  if (!room) return;

  if (data.playerNumber === 1) {
    room.ballState = {
      x: data.ballX,
      y: data.ballY,
      speedX: data.ballSpeedX,
      speedY: data.ballSpeedY,
      timestamp: Date.now()
    };
    room.player1Y = data.player1Y;
  } else if (data.playerNumber === 2) {
    room.player2Y = data.player2Y;
  }

  room.players.forEach(player => {
    sendToClient(player, {
      type: "gameState",
      ballX: room.ballState.x,
      ballY: room.ballState.y,
      ballSpeedX: room.ballState.speedX,
      ballSpeedY: room.ballState.speedY,
      player1Y: room.player1Y,
      player2Y: room.player2Y,
      isHost: data.playerNumber === 1,
      timestamp: room.ballState.timestamp
    });
  });
}

function startGame() {
  if (gameState.queue.length < 2) return;

  const [player1, player2] = gameState.queue.splice(0, 2);
  const now = Date.now();
  const startTime = now + 3000; // 3 Sekunden Countdown

  const room = {
    players: [player1, player2],
    ballState: {
      x: gameState.defaultCanvas.width / 2,
      y: gameState.defaultCanvas.height / 2,
      speedX: 0, // Startet erst nach Countdown
      speedY: 0,
      timestamp: now
    },
    player1Y: gameState.defaultCanvas.height / 2 - PADDLE_HEIGHT / 2,
    player2Y: gameState.defaultCanvas.height / 2 - PADDLE_HEIGHT / 2,
    gameStartTime: startTime
  };
  gameState.rooms.push(room);

  [player1, player2].forEach((player, index) => {
    sendToClient(player, {
      type: 'gameStart',
      playerNumber: index + 1,
      canvasWidth: gameState.defaultCanvas.width,
      canvasHeight: gameState.defaultCanvas.height,
      startTime: startTime
    });
  });

  updatePlayerCounts();
}

wss.on('connection', (ws) => {
  console.log('Neue Verbindung');
  gameState.players.push(ws);
  updatePlayerCounts();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch(data.type) {
        case 'syncRequest': handleSyncRequest(ws, data); break;
        case 'joinQueue': handleJoinQueue(ws, data); break;
        case 'gameState': handleGameState(ws, data); break;
        case 'paddleMove': break;
      }
    } catch (error) {
      console.error('Nachrichtenfehler:', error);
    }
  });

  ws.on('close', () => {
    gameState.players = gameState.players.filter(p => p !== ws);
    gameState.queue = gameState.queue.filter(p => p !== ws);
    gameState.rooms = gameState.rooms.filter(room => {
      const shouldRemove = room.players.includes(ws);
      if (shouldRemove) {
        room.players.forEach(p => p !== ws && sendToClient(p, { type: 'gameEnded' }));
      }
      return !shouldRemove;
    });
    updatePlayerCounts();
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 8080}`);
});
