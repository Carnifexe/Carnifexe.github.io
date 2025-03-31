const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Spielzustand
const state = {
  players: [],
  queue: [],
  rooms: []
};

// Verbindungsüberwachung
setInterval(() => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000);

function broadcastQueueCount() {
  const message = JSON.stringify({
    type: "queueUpdate",
    queueCount: state.queue.length,
    totalCount: state.players.length
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function handleGameState(ws, data) {
  const room = state.rooms.find(r => r.players.includes(ws));
  if (!room) return;

  const now = Date.now();
  const message = JSON.stringify({
    ...data,
    timestamp: now
  });

  room.players.forEach(player => {
    if (player !== ws && player.readyState === WebSocket.OPEN) {
      player.send(message);
    }
  });
}

function handlePaddleMove(ws, data) {
  const room = state.rooms.find(r => r.players.includes(ws));
  if (!room) return;

  room.players.forEach(player => {
    if (player !== ws && player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(data));
    }
  });
}

function handleScoreUpdate(ws, data) {
  const room = state.rooms.find(r => r.players.includes(ws));
  if (!room) return;

  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', ws => {
  state.players.push(ws);
  broadcastQueueCount();

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'joinQueue':
          if (!state.queue.includes(ws)) {
            state.queue.push(ws);
            ws.send(JSON.stringify({ type: 'joinedQueue' }));
            broadcastQueueCount();
            
            if (state.queue.length >= 2) {
              const player1 = state.queue.shift();
              const player2 = state.queue.shift();
              const room = { players: [player1, player2] };
              state.rooms.push(room);
              
              player1.send(JSON.stringify({ 
                type: 'gameStart', 
                playerNumber: 1 
              }));
              player2.send(JSON.stringify({ 
                type: 'gameStart', 
                playerNumber: 2 
              }));
              broadcastQueueCount();
            }
          }
          break;
          
        case 'leaveQueue':
          state.queue = state.queue.filter(p => p !== ws);
          ws.send(JSON.stringify({ type: 'leftQueue' }));
          broadcastQueueCount();
          break;
          
        case 'gameState':
          handleGameState(ws, data);
          break;
          
        case 'paddleMove':
        case 'paddleUpdate':
          handlePaddleMove(ws, data);
          break;
          
        case 'scoreUpdate':
          handleScoreUpdate(ws, data);
          break;
      }
    } catch (error) {
      console.error('Nachrichtenverarbeitungsfehler:', error);
    }
  });

  ws.on('close', () => {
    state.players = state.players.filter(p => p !== ws);
    state.queue = state.queue.filter(p => p !== ws);
    
    state.rooms = state.rooms.filter(room => {
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
