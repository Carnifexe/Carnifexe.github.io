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

  // Raum erstellen, sobald 2 verfügbare Spieler da sind
  const availablePlayers = players.filter(p => 
    !rooms.some(room => room.players.includes(p))
  );
  if (availablePlayers.length >= 2) {
    const roomId = rooms.length + 1;
    const roomPlayers = availablePlayers.slice(0, 2);
    rooms.push({ roomId, players: roomPlayers, gameStarted: false });
    console.log(`Raum ${roomId} mit 2 Spielern erstellt`);
    startGame(roomId);
  }

  // Nachrichten verarbeiten
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Nachricht:', data.type); // Debug-Log

      if (data.type === 'ready') {
        const room = rooms.find(r => r.players.includes(ws));
        if (room && !room.gameStarted) {
          room.gameStarted = true;
          startGame(room.roomId);
        }
      }
    } catch (error) {
      console.error('Nachrichtenfehler:', error);
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
