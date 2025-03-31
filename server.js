const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  verifyClient: (info, callback) => {
    callback(true);
  }
});

app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let rooms = [];
let queue = [];
let scores = {};

// Ping/Pong für Verbindungsstabilität
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Client wegen Inaktivität getrennt');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  console.log('Neuer Spieler verbunden');
  players.push(ws);
  broadcastPlayerCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Empfangen:', data);

      if (data.type === "joinQueue") {
        if (!queue.includes(ws)) {
          queue.push(ws);
          broadcastQueueCount();
          
          if (queue.length >= 2) {
            createRoom();
          }
        }
      }

      if (data.type === "leaveQueue") {
        queue = queue.filter(player => player !== ws);
        broadcastQueueCount();
      }

      if (data.type === "paddleMove") {
        const room = findPlayerRoom(ws);
        if (room) {
          broadcastToRoom(room, ws, {
            type: "paddleUpdate",
            player: data.player,
            y: data.y
          });
        }
      }

      if (data.type === "ballUpdate") {
        const room = findPlayerRoom(ws);
        if (room) {
          broadcastToRoom(room, ws, {
            type: "ballUpdate",
            ballX: data.ballX,
            ballY: data.ballY,
            ballSpeedX: data.ballSpeedX,
            ballSpeedY: data.ballSpeedY
          });
        }
      }

      if (data.type === "goal") {
        const room = findPlayerRoom(ws);
        if (room) {
          if (!scores[room.roomId]) {
            scores[room.roomId] = { player1Score: 0, player2Score: 0 };
          }
          
          if (data.scorer === 1) {
            scores[room.roomId].player1Score++;
          } else if (data.scorer === 2) {
            scores[room.roomId].player2Score++;
          }
          
          broadcastToRoom(room, null, {
            type: "scoreUpdate",
            player1Score: scores[room.roomId].player1Score,
            player2Score: scores[room.roomId].player2Score
          });

          // Ball zurücksetzen
          broadcastToRoom(room, null, {
            type: "ballReset",
            ballX: room.canvasWidth / 2,
            ballY: room.canvasHeight / 2,
            ballSpeedX: 5 * (Math.random() > 0.5 ? 1 : -1),
            ballSpeedY: 5 * (Math.random() > 0.5 ? 1 : -1)
          });
        }
      }
    } catch (error) {
      console.error('Fehler bei der Nachrichtenverarbeitung:', error);
    }
  });

  ws.on('close', () => {
    console.log('Spieler getrennt');
    players = players.filter(p => p !== ws);
    queue = queue.filter(p => p !== ws);
    
    // Räume aufräumen
    rooms = rooms.filter(room => {
      if (room.players.includes(ws)) {
        room.players.forEach(player => {
          if (player !== ws && player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify({ type: 'opponentDisconnected' }));
          }
        });
        return false;
      }
      return true;
    });
    
    broadcastPlayerCount();
    broadcastQueueCount();
  });
});

function createRoom() {
  const roomId = rooms.length + 1;
  const roomPlayers = queue.splice(0, 2);
  const newRoom = {
    roomId,
    players: roomPlayers,
    host: roomPlayers[0],
    canvasWidth: 800,
    canvasHeight: 600
  };
  rooms.push(newRoom);
  
  // Spieler benachrichtigen
  roomPlayers[0].send(JSON.stringify({ 
    type: "gameStart", 
    playerNumber: 1,
    isHost: true
  }));
  roomPlayers[1].send(JSON.stringify({ 
    type: "gameStart", 
    playerNumber: 2,
    isHost: false
  }));
  
  console.log(`Raum ${roomId} erstellt`);
  broadcastQueueCount();
}

function findPlayerRoom(ws) {
  return rooms.find(r => r.players.includes(ws));
}

function broadcastToRoom(room, excludeWs, message) {
  room.players.forEach(player => {
    if (player !== excludeWs && player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(message));
    }
  });
}

function broadcastPlayerCount() {
  const count = players.length;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'updatePlayerCount', count }));
    }
  });
}

function broadcastQueueCount() {
  const count = queue.length;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ 
        type: "queueUpdate", 
        count 
      }));
    }
  });
}

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
