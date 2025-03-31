const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files (deine HTML-Datei)
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket-Verbindung
wss.on('connection', (ws) => {
  console.log('Ein Client hat sich verbunden');
  
  // Nachrichten an den Client senden
  ws.send(JSON.stringify({ message: 'Willkommen zum Pong-Spiel!' }));

  ws.on('message', (message) => {
    console.log('Nachricht vom Client:', message);
  });

  ws.on('close', () => {
    console.log('Ein Client hat die Verbindung beendet');
  });
});

// Start des Servers
server.listen(8080, () => {
  console.log('Server läuft auf http://localhost:8080');
});
