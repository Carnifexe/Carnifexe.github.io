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
    callback(true); // CORS für WebSockets erlauben
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Spieler- und Raumverwaltung
let players = [];
let rooms = [];
let queue = [];  // Warteschlange für Spieler

// Ping/Pong für stabile Verbindungen
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Client wegen Inaktivität getrennt');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Alle 30 Sekunden prüfen

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  console.log('Neuer Spieler verbunden');
  players.push(ws);
  broadcastPlayerCount();

  // Spieler beitreten Warteschlange
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === "joinQueue") {
      queue.push(ws);
      broadcastQueueCount();
      
      // Wenn 2 Spieler in der Warteschlange sind, Raum erstellen
      if (queue.length >= 2) {
        const roomId = rooms.length + 1;
        const roomPlayers = queue.splice(0, 2);  // Entferne 2 Spieler aus der Warteschlange
        rooms.push({ 
          roomId, 
          players: roomPlayers,
          host: roomPlayers[0], // Erster Spieler ist Host
          gameStarted: false
        });
        
        // Spieler ihre Nummer mitteilen
        roomPlayers.forEach((player, index) => {
          player.send(JSON.stringify({ 
            type: "gameStart", 
            playerNumber: index + 1 
          }));
        });
      }
    }

    // Weiterleiten der Spielnachrichten an den Gegner
    if (["paddleMove", "ballUpdate", "scoreUpdate"].includes(data.type)) {
      const room = rooms.find(r => r.players.includes(ws));
      if (room) {
        room.players.forEach(player => {
          if (player !== ws && player.readyState === WebSocket.OPEN) {
            player.send(message);
          }
        });
      }
    }
    
    if (data.type === "leaveQueue") {
      queue = queue.filter(player => player !== ws);
      broadcastQueueCount();
    }

    // Raum beitreten oder Spiel starten, wenn "ready" gesendet wird
    if (data.type === 'ready') {
      const room = rooms.find(r => r.players.includes(ws));
      if (room && !room.gameStarted) {
        room.gameStarted = true;
        startGame(room.roomId);
      }
    }
  });

  // Verbindungsabbruch
  ws.on('close', () => {
    players = players.filter(p => p !== ws);
    rooms = rooms.filter(room => {
      const index = room.players.indexOf(ws);
      if (index !== -1) {
        room.players[index].send(JSON.stringify({ type: 'opponentDisconnected' }));
        return false; // Raum löschen
      }
      return true;
    });
    broadcastPlayerCount();
  });
});

// Hilfsfunktionen
function broadcastPlayerCount() {
  const count = players.length;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'updatePlayerCount', count }));
    }
  });
}

function broadcastQueueCount() {
  wss.clients.forEach(client => {
    client.send(JSON.stringify({ 
      type: "queueUpdate", 
      count: queue.length 
    }));
  });
}

function startGame(roomId) {
  const room = rooms.find(r => r.roomId === roomId);
  if (room && room.players.length === 2) {
    room.players.forEach((player, index) => {
      player.send(JSON.stringify({
        type: 'gameStart',
        roomId,
        playerNumber: index + 1
      }));
    });
    console.log(`Spiel in Raum ${roomId} gestartet!`);
  }
}

// Server starten
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
