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
  players: new Map(),
  rooms: []
};

const MAX_ROOMS = 10;
const TICK_RATE = 1000 / 30; // 30Hz Update

// Verbindungsüberwachung
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function createRoom(playerId, ws) {
  if (gameState.rooms.length >= MAX_ROOMS) {
    ws.send(JSON.stringify({ type: "roomLimitReached" }));
    return;
  }

  const room = {
    id: `room-${Date.now()}`,
    players: [{ id: playerId, ws, ready: false }],
    ball: null,
    scores: [0, 0],
    paddles: [300, 300],
    gameLoop: null
  };
  
  gameState.rooms.push(room);
  broadcastRoomList();
}

function joinRoom(roomId, playerId, ws) {
  const room = gameState.rooms.find(r => r.id === roomId);
  if (!room || room.players.length >= 2) return;

  room.players.push({ id: playerId, ws, ready: false });
  
  if (room.players.length === 2) {
    room.players.forEach(p => p.ws.send(JSON.stringify({ type: 'readyCheck' })));
  }

  broadcastRoomList();
}

function broadcastRoomList() {
  const roomsInfo = gameState.rooms.map(r => ({ id: r.id, players: r.players.length }));
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'roomList', rooms: roomsInfo }));
    }
  });
}

function startGame(room) {
  const initialBall = { x: 500, y: 300, speedX: 5, speedY: 5 };
  room.ball = { ...initialBall };
  room.gameLoop = setInterval(() => updateGame(room), TICK_RATE);

  room.players.forEach((p, index) => p.ws.send(JSON.stringify({
    type: 'gameStart',
    playerNumber: index + 1,
    initialBall
  })));
}

function updateGame(room) {
  room.ball.x += room.ball.speedX;
  room.ball.y += room.ball.speedY;

  handleCollisions(room);

  const gameState = {
    type: 'gameState',
    ballX: room.ball.x,
    ballY: room.ball.y,
    paddles: room.paddles
  };

  room.players.forEach(p => {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(JSON.stringify(gameState));
    }
  });
}

function handleCollisions(room) {
  if (room.ball.y <= 10 || room.ball.y >= 590) room.ball.speedY = -room.ball.speedY;

  room.players.forEach((p, i) => {
    if (room.ball.x <= 30 && i === 0 || room.ball.x >= 970 && i === 1) {
      if (room.ball.y >= room.paddles[i] && room.ball.y <= room.paddles[i] + 100) {
        room.ball.speedX = -room.ball.speedX * 1.05;
      }
    }
  });
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  
  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'createRoom':
          createRoom(data.playerId, ws);
          break;
        case 'joinRoom':
          joinRoom(data.roomId, data.playerId, ws);
          break;
        case 'ready':
          const room = gameState.rooms.find(r => r.players.some(p => p.id === data.playerId));
          if (room) {
            const player = room.players.find(p => p.id === data.playerId);
            player.ready = true;
            if (room.players.length === 2 && room.players.every(p => p.ready)) {
              startGame(room);
            }
          }
          break;
        case 'paddleMove':
          const gameRoom = gameState.rooms.find(r => r.players.some(p => p.id === data.playerId));
          if (gameRoom) {
            const playerIndex = gameRoom.players.findIndex(p => p.id === data.playerId);
            gameRoom.paddles[playerIndex] = data.y;
          }
          break;
      }
    } catch (error) {
      console.error('Nachrichtenverarbeitungsfehler:', error);
    }
  });
  
  ws.on('close', () => {
    gameState.rooms.forEach(room => {
      room.players = room.players.filter(p => p.ws !== ws);
      if (room.players.length === 0) {
        clearInterval(room.gameLoop);
      }
    });
    gameState.rooms = gameState.rooms.filter(r => r.players.length > 0);
    broadcastRoomList();
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 8080}`);
});
