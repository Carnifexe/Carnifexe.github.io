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
  players: [],
  queue: [],
  rooms: [],
  defaultCanvas: { width: 800, height: 600 }
};

// Verbindungsmanagement
wss.on('connection', (ws) => {
  console.log('Neue Verbindung');
  gameState.players.push(ws);
  updateQueueCount();

  // Nachrichtenverarbeitung
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Nachrichtenfehler:', error);
    }
  });

  // Verbindungsschließung
  ws.on('close', () => {
    console.log('Verbindung geschlossen');
    cleanupConnection(ws);
  });
});

// Nachrichtenhandler
function handleMessage(ws, data) {
  switch (data.type) {
    case 'syncRequest':
      handleSyncRequest(ws, data);
      break;
    case 'joinQueue':
      handleJoinQueue(ws, data);
      break;
    case 'leaveQueue':
      handleLeaveQueue(ws);
      break;
    case 'gameState':
      handleGameState(ws, data);
      break;
    case 'scoreUpdate':
      handleScoreUpdate(ws, data);
      break;
    case 'paddleMove':
      handlePaddleMove(ws, data);
      break;
    case 'canvasSize':
      handleCanvasSize(ws, data);
      break;
  }
}

// Hilfsfunktionen
function updateQueueCount() {
  const message = {
    type: "queueUpdate",
    queueCount: gameState.queue.length,
    totalCount: gameState.players.length
  };
  broadcast(message);
}

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
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
    
    // Aktualisiere Canvas-Größe falls vorhanden
    const room = gameState.rooms.find(r => r.players.includes(ws));
    if (room && data.canvasWidth && data.canvasHeight) {
      room.canvas = { width: data.canvasWidth, height: data.canvasHeight };
    }
    
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

function startGame() {
  const player1 = gameState.queue.shift();
  const player2 = gameState.queue.shift();
  
  const room = {
    players: [player1, player2],
    canvas: { ...gameState.defaultCanvas }
  };
  
  gameState.rooms.push(room);
  
  player1.send(JSON.stringify({ 
    type: 'gameStart', 
    playerNumber: 1,
    opponentConnected: true
  }));
  
  player2.send(JSON.stringify({ 
    type: 'gameStart', 
    playerNumber: 2,
    opponentConnected: true 
  }));
  
  updateQueueCount();
}

function handleGameState(ws, data) {
  const room = gameState.rooms.find(r => r.players.includes(ws));
  if (!room) return;

  // Normalisierte Position berechnen
  const normalizedState = {
    ...data,
    ballX: data.ballX / data.canvasWidth * room.canvas.width,
    ballY: data.ballY / data.canvasHeight * room.canvas.height,
    timestamp: Date.now()
  };

  // An Gegenspieler senden
  room.players.forEach(player => {
    if (player !== ws && player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(normalizedState));
    }
  });
}

function cleanupConnection(ws) {
  gameState.players = gameState.players.filter(p => p !== ws);
  gameState.queue = gameState.queue.filter(p => p !== ws);
  
  // Räume aufräumen
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
  
  updateQueueCount();
}

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 8080}`);
});
