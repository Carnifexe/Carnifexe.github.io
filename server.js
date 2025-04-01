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
      const player1 = gameState.queue.shift();
      const player2 = gameState.queue.shift();
      const room = {
        players: [player1, player2],
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
  }
}

function handleGameState(ws, data) {
  const room = gameState.rooms.find(r => r.players.includes(ws));
  if (room) {
    room.players.forEach(player => {
      if (player !== ws && player.readyState === WebSocket.OPEN) {
        player.send(JSON.stringify({
          ...data,
          timestamp: Date.now()
        }));
      }
    });
  }
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
