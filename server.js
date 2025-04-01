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
  rooms: []
};

function broadcastQueueCount() {
  const message = {
    type: "queueUpdate",
    queueCount: gameState.queue.length,
    totalCount: gameState.players.length
  };
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Neue Verbindung');
  gameState.players.push(ws);
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
        if (!gameState.queue.includes(ws)) {
          gameState.queue.push(ws);
          ws.send(JSON.stringify({ 
            type: 'joinedQueue',
            position: gameState.queue.length
          }));
          broadcastQueueCount();
          
          if (gameState.queue.length >= 2) {
            const player1 = gameState.queue.shift();
            const player2 = gameState.queue.shift();
            const room = { 
              players: [player1, player2],
              ballState: null,
              lastUpdate: Date.now()
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
            broadcastQueueCount();
          }
        }
      }
      else if (data.type === 'leaveQueue') {
        gameState.queue = gameState.queue.filter(p => p !== ws);
        ws.send(JSON.stringify({ type: 'leftQueue' }));
        broadcastQueueCount();
      }
      else if (data.type === 'gameState') {
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
            room.lastUpdate = Date.now();
          }

          // Sende aktualisierten Zustand an beide Spieler
          room.players.forEach(player => {
            if (player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify({
                type: "gameState",
                ballX: room.ballState?.x || canvas.width/2,
                ballY: room.ballState?.y || canvas.height/2,
                ballSpeedX: room.ballState?.speedX || BALL_BASE_SPEED,
                ballSpeedY: room.ballState?.speedY || 0,
                player1Y: data.player1Y,
                player2Y: data.player2Y,
                isHost: data.playerNumber === 1,
                timestamp: room.ballState?.timestamp || Date.now()
              }));
            }
          });
        }
      }
      else if (data.type === 'scoreUpdate') {
        const room = gameState.rooms.find(r => r.players.includes(ws));
        if (room) {
          room.players.forEach(player => {
            if (player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (error) {
      console.error('Nachrichtenfehler:', error);
    }
  });

  ws.on('close', () => {
    gameState.players = gameState.players.filter(p => p !== ws);
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
