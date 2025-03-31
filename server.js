const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Spielzustand
const gameState = {
  players: new Set(),
  queue: [],
  rooms: []
};

// Verbindungsüberwachung
const connectionCheck = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function broadcastQueueCount() {
  const message = JSON.stringify({
    type: "queueUpdate",
    queueCount: gameState.queue.length,
    totalCount: gameState.players.size
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function createRoom(player1, player2) {
  const room = {
    players: [player1, player2],
    createdAt: Date.now()
  };
  gameState.rooms.push(room);
  
  player1.send(JSON.stringify({ type: 'gameStart', playerNumber: 1 }));
  player2.send(JSON.stringify({ type: 'gameStart', playerNumber: 2 }));
  
  return room;
}

function handleGameState(ws, data) {
  const room = gameState.rooms.find(r => r.players.includes(ws));
  if (!room) return;

  const now = Date.now();
  const compensatedData = {
    ...data,
    timestamp: now
  };

  room.players.forEach(player => {
    if (player !== ws && player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(compensatedData));
    }
  });
}

wss.on('connection', ws => {
  ws.isAlive = true;
  gameState.players.add(ws);
  broadcastQueueCount();

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'joinQueue':
          if (!gameState.queue.includes(ws)) {
            gameState.queue.push(ws);
            ws.send(JSON.stringify({ type: 'joinedQueue' }));
            broadcastQueueCount();
            
            if (gameState.queue.length >= 2) {
              const player1 = gameState.queue.shift();
              const player2 = gameState.queue.shift();
              createRoom(player1, player2);
              broadcastQueueCount();
            }
          }
          break;
          
        case 'leaveQueue':
          gameState.queue = gameState.queue.filter(p => p !== ws);
          ws.send(JSON.stringify({ type: 'leftQueue' }));
          broadcastQueueCount();
          break;
          
        case 'gameState':
          handleGameState(ws, data);
          break;
          
        case 'paddleMove':
        case 'paddleUpdate':
          const room = gameState.rooms.find(r => r.players.includes(ws));
          if (room) {
            room.players.forEach(player => {
              if (player !== ws && player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify(data));
              }
            });
          }
          break;
          
        case 'scoreUpdate':
          const scoreRoom = gameState.rooms.find(r => r.players.includes(ws));
          if (scoreRoom) {
            scoreRoom.players.forEach(player => {
              if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify(data));
              }
            });
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
          break;
      }
    } catch (error) {
      console.error('Nachrichtenverarbeitungsfehler:', error);
    }
  });

  ws.on('close', () => {
    gameState.players.delete(ws);
    gameState.queue = gameState.queue.filter(p => p !== ws);
    
    gameState.rooms = gameState.rooms.filter(room => {
      if (room.players.includes(ws)) {
        room.players.forEach(p => {
          if (p !== ws && p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ type: 'gameEnded' }));
          }
        });
        return false;
      }
      return true;
    });
    
    broadcastQueueCount();
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 8080}`);
});

process.on('SIGINT', () => {
  clearInterval(connectionCheck);
  wss.close();
  server.close();
  process.exit();
});
