const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let rooms = []; // Array to store rooms
let players = {}; // Store player data

// Handle new connections
wss.on('connection', (ws) => {
  let playerId = 'player-' + Math.random().toString(36).substr(2, 9);
  let currentRoom = null;

  // Initial message: store player
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'playerConnect':
        players[playerId] = { ws, playerId };
        break;
      
      case 'joinQueue':
        // Create or join a room
        if (rooms.length < 10) {
          currentRoom = createRoom(playerId);
          ws.send(JSON.stringify({
            type: 'roomListUpdate',
            rooms: rooms.map(room => ({ id: room.id, playerCount: room.players.length }))
          }));
        }
        break;
        
      case 'joinRoom':
        joinRoom(data.roomId, playerId, ws);
        break;

      case 'playerReady':
        handlePlayerReady(data.roomId, playerId);
        break;

      case 'gameState':
        // Broadcast the game state to both players
        broadcastGameState(data);
        break;

      default:
        break;
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    // Handle player disconnection
    if (currentRoom) {
      removePlayerFromRoom(currentRoom.id, playerId);
    }
  });
});

function createRoom(playerId) {
  const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
  const newRoom = { id: roomId, players: [playerId], ready: [false, false] };
  rooms.push(newRoom);
  return newRoom;
}

function joinRoom(roomId, playerId, ws) {
  const room = rooms.find(r => r.id === roomId);
  if (room && room.players.length < 2) {
    room.players.push(playerId);
    ws.send(JSON.stringify({
      type: 'gameStart',
      roomId: roomId
    }));
    broadcastRoomList();
  }
}

function handlePlayerReady(roomId, playerId) {
  const room = rooms.find(r => r.id === roomId);
  if (room) {
    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex !== -1) {
      room.ready[playerIndex] = true;
      if (room.ready[0] && room.ready[1]) {
        startGame(roomId);
      }
    }
  }
}

function startGame(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (room) {
    // Notify both players to start the game
    room.players.forEach(playerId => {
      players[playerId].ws.send(JSON.stringify({
        type: 'gameStart',
        roomId: roomId
      }));
    });
  }
}

function broadcastGameState(data) {
  // Send the game state to all players in the room
  const room = rooms.find(r => r.id === data.roomId);
  if (room) {
    room.players.forEach(playerId => {
      players[playerId].ws.send(JSON.stringify(data));
    });
  }
}

function removePlayerFromRoom(roomId, playerId) {
  const room = rooms.find(r => r.id === roomId);
  if (room) {
    room.players = room.players.filter(p => p !== playerId);
    if (room.players.length === 0) {
      // Delete empty room
      rooms = rooms.filter(r => r.id !== roomId);
    }
  }
}

function broadcastRoomList() {
  rooms.forEach(room => {
    room.players.forEach(playerId => {
      players[playerId].ws.send(JSON.stringify({
        type: 'roomListUpdate',
        rooms: rooms.map(r => ({ id: r.id, playerCount: r.players.length }))
      }));
    });
  });
}
