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
    ball: {
      x: 500, y: 300,
      speedX: 5 * (Math.random() > 0.5 ? 1 : -1),
      speedY: 5 * (Math.random() > 0.5 ? 1 : -1),
      lastUpdate: Date.now()
    },
    paddles: [300, 300],
    scores: [0, 0],
    lastBroadcast: 0,
    sequenceNumber: 0,
    gameLoop: null
  };

  // Starte Spiel-Loop
  room.gameLoop = setInterval(() => updateGameState(room), 16);
  
  // Sende initialen Zustand
  broadcastGameState(room);
  
  player1.send(JSON.stringify({ 
    type: 'gameStart', 
    playerNumber: 1,
    initialBall: room.ball
  }));
  player2.send(JSON.stringify({ 
    type: 'gameStart', 
    playerNumber: 2,
    initialBall: room.ball
  }));
  
  gameState.rooms.push(room);
  return room;
}

function updateGameState(room) {
  const now = Date.now();
  const delta = (now - room.ball.lastUpdate) / 1000;
  room.ball.lastUpdate = now;

  // Ballbewegung
  room.ball.x += room.ball.speedX * delta * 60;
  room.ball.y += room.ball.speedY * delta * 60;

  // Kollisionen
  handleCollisions(room);

  // Zustand an Spieler senden
  broadcastGameState(room);
}

function handleCollisions(room) {
  // Wandkollision
  if (room.ball.y <= 10 || room.ball.y >= 590) {
    room.ball.speedY = -room.ball.speedY;
  }
  
  // Paddle-Kollision
  if (room.ball.x <= 30 && room.ball.x >= 15 && 
      room.ball.y >= room.paddles[0] && room.ball.y <= room.paddles[0] + 100) {
    room.ball.speedX = -room.ball.speedX * 1.05;
  } else if (room.ball.x >= 970 && room.ball.x <= 985 && 
             room.ball.y >= room.paddles[1] && room.ball.y <= room.paddles[1] + 100) {
    room.ball.speedX = -room.ball.speedX * 1.05;
  }
  
  // Punkte
  if (room.ball.x < 0) {
    room.scores[1]++;
    resetBall(room);
    broadcastScoreUpdate(room);
  } else if (room.ball.x > 1000) {
    room.scores[0]++;
    resetBall(room);
    broadcastScoreUpdate(room);
  }
}

function resetBall(room) {
  room.ball.x = 500;
  room.ball.y = 300;
  room.ball.speedX = 5 * (Math.random() > 0.5 ? 1 : -1);
  room.ball.speedY = 5 * (Math.random() > 0.5 ? 1 : -1);
  room.ball.lastUpdate = Date.now();
}

function broadcastGameState(room) {
  const now = Date.now();
  if (now - room.lastBroadcast < 16) return; // Nicht öfter als 60fps
  
  room.sequenceNumber++;
  const state = {
    type: 'gameState',
    seq: room.sequenceNumber,
    ballX: Math.round(room.ball.x),
    ballY: Math.round(room.ball.y),
    ballSpeedX: Math.round(room.ball.speedX * 100) / 100,
    ballSpeedY: Math.round(room.ball.speedY * 100) / 100,
    player1Y: room.paddles[0],
    player2Y: room.paddles[1],
    timestamp: now
  };

  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(state));
    }
  });
  room.lastBroadcast = now;
}

function broadcastScoreUpdate(room) {
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({
        type: 'scoreUpdate',
        player: 1,
        score: room.scores[0]
      }));
      player.send(JSON.stringify({
        type: 'scoreUpdate',
        player: 2,
        score: room.scores[1]
      }));
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
          
        case 'paddleMove':
          const room = gameState.rooms.find(r => r.players.includes(ws));
          if (room) {
            const playerIndex = room.players.indexOf(ws);
            room.paddles[playerIndex] = data.y;
            
            // Aktualisiere anderen Spieler
            const otherPlayer = room.players[1 - playerIndex];
            if (otherPlayer.readyState === WebSocket.OPEN) {
              otherPlayer.send(JSON.stringify({
                type: 'paddleMove',
                player: playerIndex + 1,
                y: data.y
              }));
            }
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
        // Beende Spiel-Loop
        if (room.gameLoop) clearInterval(room.gameLoop);
        
        // Benachrichtige anderen Spieler
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
