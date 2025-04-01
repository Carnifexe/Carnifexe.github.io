const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const gameState = {
  players: [],
  queue: [],
  rooms: [],
  defaultCanvas: { width: 800, height: 600 }
};

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function updateQueueCount() {
  broadcast({
    type: "queueUpdate",
    queueCount: gameState.queue.length,
    totalCount: gameState.players.length
  });
}

function handleSyncRequest(ws, data) {
  ws.send(JSON.stringify({
    type: "syncResponse",
    clientTime: data.clientTime,
    serverTime: Date.now()
  }));
}

function handleJoinQueue(ws, data) {
  if (!gameState.queue.includes(ws)) {
    gameState.queue.push(ws);
    ws.send(JSON.stringify({ 
      type: 'joinedQueue',
      position: gameState.queue.length
    }));
    updateQueueCount();
    
    if (gameState.queue.length >= 2) {
      startGame();
    }
  }
}

function handleGameState(ws, data) {
  const room = gameState.rooms.find(r => r.players.includes(ws));
  if (room) {
    // Nur Host aktualisiert den Ballzustand
    if (data.playerNumber === 1) {
      room.ballState = {
        x: data.ballX,
        y: data.ballY,
        speedX: data.ballSpeedX,
        speedY: data.ballSpeedY,
        timestamp: Date.now()
      };
    }

    // Aktualisiere nur die Paddle-Position des sendenden Spielers
    if (data.playerNumber === 1) {
      room.player1Y = data.player1Y;
    } else if (data.playerNumber === 2) {
      room.player2Y = data.player2Y;
    }

    // Sende aktualisierten Zustand an beide Spieler
    room.players.forEach(player => {
      if (player.readyState === WebSocket.OPEN) {
        player.send(JSON.stringify({
          type: "gameState",
          ballX: room.ballState?.x || gameState.defaultCanvas.width/2,
          ballY: room.ballState?.y || gameState.defaultCanvas.height/2,
          ballSpeedX: room.ballState?.speedX || BALL_BASE_SPEED,
          ballSpeedY: room.ballState?.speedY || 0,
          player1Y: room.player1Y,
          player2Y: room.player2Y,
          isHost: data.playerNumber === 1,
          timestamp: room.ballState?.timestamp || Date.now()
        }));
      }
    });
  }
}

function startGame() {
  const [player1, player2] = gameState.queue.splice(0, 2);
  const room = {
    players: [player1, player2],
    ballState: null,
    player1Y: gameState.defaultCanvas.height / 2 - PADDLE_HEIGHT / 2,
    player2Y: gameState.defaultCanvas.height / 2 - PADDLE_HEIGHT / 2,
    canvas: { ...gameState.defaultCanvas }
  };
  gameState.rooms.push(room);
  
  player1.send(JSON.stringify({ 
    type: 'gameStart', 
    playerNumber: 1 
  }));
  player2.send(JSON.stringify({ 
    type: 'gameStart', 
    playerNumber: 2 
  }));
  updateQueueCount();
}

wss.on('connection', (ws) => {
  console.log('Neue Verbindung');
  gameState.players.push(ws);
  updateQueueCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'syncRequest') handleSyncRequest(ws, data);
      else if (data.type === 'joinQueue') handleJoinQueue(ws, data);
      else if (data.type === 'gameState') handleGameState(ws, data);
      
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
        room.players.forEach(p => {
          if (p !== ws && p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ type: 'gameEnded' }));
          }
        });
      }
      return !shouldRemove;
    });
    updateQueueCount();
    console.log('Verbindung geschlossen');
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 8080}`);
});
