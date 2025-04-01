const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');
const uuid = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Spielzustand
const gameState = {
  players: new Map(),
  rooms: [],
  publicRooms: []
};

// Verbindungsüberwachung
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function broadcastRoomList() {
  const publicRooms = gameState.publicRooms.map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.length
  }));

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "roomList",
        rooms: publicRooms
      }));
    }
  });
}

function createRoom(player1, player2, isPublic = false, roomName = '') {
  const roomId = uuid.v4();
  const initialBall = {
    x: 500,
    y: 300,
    speedX: 5 * (Math.random() > 0.5 ? 1 : -1),
    speedY: 5 * (Math.random() > 0.5 ? 1 : -1),
    lastUpdate: Date.now()
  };

  const room = {
    id: roomId,
    name: roomName,
    players: [player1.ws, player2.ws],
    playerIds: [player1.id, player2.id],
    playerNames: [player1.name, player2.name],
    ball: {...initialBall},
    scores: [0, 0],
    paddles: [300, 300],
    lastUpdate: Date.now(),
    gameLoop: null,
    readyStates: [false, false],
    isPublic,
    lastPaddleUpdates: [Date.now(), Date.now()]
  };

  if (isPublic) {
    gameState.publicRooms.push(room);
    broadcastRoomList();
  }

  gameState.rooms.push(room);

  // Sende Raum-Infos an beide Spieler
  [player1.ws, player2.ws].forEach((ws, index) => {
    ws.send(JSON.stringify({
      type: 'roomCreated',
      roomId,
      playerNumber: index + 1,
      opponentName: index === 0 ? player2.name : player1.name,
      isPublic
    }));
  });

  return room;
}

function startGame(room) {
  room.ball = {
    x: 500,
    y: 300,
    speedX: 5 * (Math.random() > 0.5 ? 1 : -1),
    speedY: 5 * (Math.random() > 0.5 ? 1 : -1),
    lastUpdate: Date.now()
  };

  // Starte Spiel-Loop
  room.gameLoop = setInterval(() => {
    const now = Date.now();
    const delta = (now - room.lastUpdate) / 1000;
    room.lastUpdate = now;

    // Ballbewegung mit delta time compensation
    room.ball.x += room.ball.speedX * delta * 60;
    room.ball.y += room.ball.speedY * delta * 60;

    // Kollisionen
    handleCollisions(room);

    // Zustand an Spieler senden
    broadcastGameState(room);
  }, 16);

  // Sende Startnachrichten
  room.players.forEach((player, index) => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({
        type: 'gameStart',
        playerNumber: index + 1,
        initialBall: room.ball
      }));
    }
  });
}

function handleCollisions(room) {
  // Wandkollision
  if (room.ball.y <= 10 || room.ball.y >= 590) {
    room.ball.speedY = -room.ball.speedY;
  }
  
  // Paddle-Kollision mit Interpolation
  const paddle1Pos = room.paddles[0] + (room.paddles[0] - room.paddles[0]) * 
                    ((Date.now() - room.lastPaddleUpdates[0]) / 16);
  const paddle2Pos = room.paddles[1] + (room.paddles[1] - room.paddles[1]) * 
                    ((Date.now() - room.lastPaddleUpdates[1]) / 16);
  
  if (room.ball.x <= 30 && room.ball.x >= 15 && 
      room.ball.y >= paddle1Pos && room.ball.y <= paddle1Pos + 100) {
    room.ball.speedX = -room.ball.speedX * 1.05;
  } else if (room.ball.x >= 970 && room.ball.x <= 985 && 
             room.ball.y >= paddle2Pos && room.ball.y <= paddle2Pos + 100) {
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
  const state = {
    type: 'gameState',
    ballX: room.ball.x,
    ballY: room.ball.y,
    ballSpeedX: room.ball.speedX,
    ballSpeedY: room.ball.speedY,
    player1Y: room.paddles[0],
    player2Y: room.paddles[1],
    timestamp: Date.now(),
    serverTime: Date.now()
  };
  
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(state));
    }
  });
}

function broadcastScoreUpdate(room) {
  const scoreMsg = {
    type: 'scoreUpdate',
    player1Score: room.scores[0],
    player2Score: room.scores[1],
    timestamp: Date.now()
  };
  
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(scoreMsg));
    }
  });
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.playerId = uuid.v4();

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'playerConnect':
          gameState.players.set(ws.playerId, { 
            ws, 
            id: ws.playerId,
            name: data.playerName || `Player_${ws.playerId.substring(0, 4)}`
          });
          ws.send(JSON.stringify({
            type: 'playerConnected',
            playerId: ws.playerId
          }));
          broadcastRoomList();
          break;
          
        case 'createRoom':
          const player = gameState.players.get(ws.playerId);
          if (player) {
            // Für öffentliche Räume - wartet auf zweiten Spieler
            const newRoom = {
              id: uuid.v4(),
              name: data.roomName || 'Pong Room',
              players: [player.ws],
              playerIds: [player.id],
              playerNames: [player.name],
              isPublic: true,
              waitingForPlayers: true
            };
            gameState.publicRooms.push(newRoom);
            gameState.rooms.push(newRoom);
            broadcastRoomList();
          }
          break;
          
        case 'joinRoom':
          const roomToJoin = gameState.rooms.find(r => r.id === data.roomId);
          if (roomToJoin && roomToJoin.players.length === 1) {
            const joiningPlayer = gameState.players.get(ws.playerId);
            if (joiningPlayer) {
              roomToJoin.players.push(joiningPlayer.ws);
              roomToJoin.playerIds.push(joiningPlayer.id);
              roomToJoin.playerNames.push(joiningPlayer.name);
              roomToJoin.waitingForPlayers = false;
              
              // Raum ist jetzt voll, erstelle das eigentliche Spiel
              const player1 = gameState.players.get(roomToJoin.playerIds[0]);
              const player2 = gameState.players.get(roomToJoin.playerIds[1]);
              createRoom(player1, player2, roomToJoin.isPublic, roomToJoin.name);
              
              // Entferne den temporären Wartezimmer
              gameState.rooms = gameState.rooms.filter(r => r.id !== roomToJoin.id);
              gameState.publicRooms = gameState.publicRooms.filter(r => r.id !== roomToJoin.id);
              broadcastRoomList();
            }
          }
          break;
          
        case 'setReady':
          const room = gameState.rooms.find(r => r.playerIds.includes(ws.playerId));
          if (room) {
            const playerIndex = room.playerIds.indexOf(ws.playerId);
            room.readyStates[playerIndex] = data.isReady;
            
            // Beide bereit? Starte das Spiel!
            if (room.readyStates.every(ready => ready)) {
              startGame(room);
            } else {
              // Aktualisiere Ready-Status für beide Spieler
              room.players.forEach((player, idx) => {
                if (player.readyState === WebSocket.OPEN) {
                  player.send(JSON.stringify({
                    type: 'readyUpdate',
                    player1Ready: room.readyStates[0],
                    player2Ready: room.readyStates[1]
                  }));
                }
              });
            }
          }
          break;
          
        case 'paddleMove':
          const gameRoom = gameState.rooms.find(r => r.players.includes(ws));
          if (gameRoom) {
            const playerIndex = gameRoom.players.indexOf(ws);
            gameRoom.paddles[playerIndex] = data.y;
            gameRoom.lastPaddleUpdates[playerIndex] = Date.now();
            
            // Sofortiges Update für niedrige Latenz
            const otherPlayer = gameRoom.players[1 - playerIndex];
            if (otherPlayer.readyState === WebSocket.OPEN) {
              otherPlayer.send(JSON.stringify({
                type: 'paddleUpdate',
                player: playerIndex + 1,
                y: data.y,
                timestamp: Date.now()
              }));
            }
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: data.timestamp,
            serverTime: Date.now()
          }));
          break;
      }
    } catch (error) {
      console.error('Nachrichtenverarbeitungsfehler:', error);
    }
  });

  ws.on('close', () => {
    // Finde und entferne Spieler
    gameState.players.delete(ws.playerId);
    
    // Beende Räume
    gameState.rooms = gameState.rooms.filter(room => {
      if (room.playerIds.includes(ws.playerId)) {
        // Spieler aus Raum entfernen
        const playerIndex = room.playerIds.indexOf(ws.playerId);
        room.players.splice(playerIndex, 1);
        room.playerIds.splice(playerIndex, 1);
        room.playerNames.splice(playerIndex, 1);
        
        // Wenn Raum jetzt leer ist, aufräumen
        if (room.players.length === 0) {
          if (room.gameLoop) clearInterval(room.gameLoop);
          return false;
        } else {
          // Benachrichtige verbleibenden Spieler
          room.players.forEach(p => {
            if (p.readyState === WebSocket.OPEN) {
              p.send(JSON.stringify({ 
                type: 'playerLeft',
                playerNumber: playerIndex + 1
              }));
            }
          });
          return true;
        }
      }
      return true;
    });
    
    // Aktualisiere öffentliche Raumliste
    gameState.publicRooms = gameState.publicRooms.filter(room => 
      room.playerIds.length > 0
    );
    broadcastRoomList();
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server läuft auf Port ${process.env.PORT || 8080}`);
});
