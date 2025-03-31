const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

// Setze die Express App und den HTTP Server auf
const app = express();
const server = http.createServer(app);

// Setze WebSocket Server auf
const wss = new WebSocket.Server({ server });

// Stelle sicher, dass das `public` Verzeichnis für statische Dateien genutzt wird
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket-Server logik
wss.on('connection', (ws) => {
    console.log('Ein Client hat sich verbunden');

    ws.on('message', (message) => {
        console.log('Nachricht vom Client:', message);

        // Beispiel: Nachrichten an alle verbundenen Clients senden
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Ein Client hat die Verbindung beendet');
    });
});

// Server starten
const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
