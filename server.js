const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let queue = [];
let rooms = [];

// Ping alle 30 Sekunden
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

function broadcastQueueCount() {
  const queueCount = queue.length;
  const totalCount = players.length;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "queueUpdate",
        queueCount,
        totalCount
      }));
    }
  });
}

wss.on('connection', (ws) => {
  players.push(ws);
  broadcastQueueCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'syncRequest') {
        ws.send(JSON.stringify({
          type: "syncResponse",
          clientTime: data.clientTime,
          serverTime: Date.now()
        }));
      }
      else if (data.type === 'joinQueue') {
        if (!queue.includes(ws)) {
          queue.push(ws);
          ws.send(JSON.stringify({ type: 'joinedQueue' }));
          broadcastQueueCount();
          
          if (queue.length >= 2) {
            const player1 = queue.shift();
            const player2 = queue.shift();
            const room = { players: [player1, player2] };
            rooms.push(room);
            
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
      }
      else if (data.type === 'leaveQueue') {
        queue = queue.filter(p => p !== ws);
        ws.send(JSON.stringify({ type: 'leftQueue' }));
        broadcastQueueCount();
      }
      else if (data.type === 'gameState') {
        const room = rooms.find(r => r.players.includes(ws));
        if (room) {
          // NEU: Sofortiges Senden ohne Verzögerung
          room.players.forEach(player => {
            if (player !== ws && player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify({
                ...data,
                timestamp: Date.now() // NEU: Aktueller Zeitstempel
              }));
            }
          });
        }
      }
      else if (data.type === 'scoreUpdate') {
        const room = rooms.find(r => r.players.includes(ws));
        if (room) {
          room.players.forEach(player => {
            if (player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify(data));
            }
          });
        }
      }
      else if (data.type === 'paddleMove') {
        const room = rooms.find(r => r.players.includes(ws));
        if (room) {
          room.players.forEach(player => {
            if (player !== ws && player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify({
                type: "paddleMove",
                player: data.player,
                y: data.y,
                timestamp: Date.now() // NEU: Aktueller Zeitstempel
              }));
            }
          });
        }
      }
    } catch (error) {
      console.error('Fehler bei Nachrichtenverarbeitung:', error);
    }
  });

  ws.on('close', () => {
    players = players.filter(p => p !== ws);
    queue = queue.filter(p => p !== ws);
    rooms = rooms.filter(room => {
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
  console.log('Server läuft auf Port ' + (process.env.PORT || 8080));
});
