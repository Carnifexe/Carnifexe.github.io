const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080; // Der Port, den Render bereitstellt, oder 8080 für lokale Entwicklung

// HTTP-Server erstellen und Express verwenden
const server = http.createServer(app);

// WebSocket-Server erstellen
const wss = new WebSocket.Server({ server });

let players = []; // Liste der verbundenen Spieler
let gameInProgress = false;

// HTTP-Route für den Fall, dass du eine Webseite servieren möchtest
app.use(express.static('public')); // Statische Dateien servieren (HTML, CSS, JS)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); // HTML-Datei senden
});

// WebSocket-Verbindung und Nachrichtenbehandlung
wss.on('connection', (ws) => {
    console.log('Ein Spieler hat sich verbunden.');

    // Füge den neuen Spieler zur Liste hinzu
    players.push(ws);

    // Funktion zur Aktualisierung der Spieler-Liste
    function updatePlayerList() {
        const playerNames = players.map((player, index) => `Player ${index + 1}`);
        players.forEach(player => {
            player.send(JSON.stringify({
                type: 'updatePlayers',
                players: playerNames
            }));
        });
    }

    // Nachrichten des Spielers
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'challenge') {
            const challenger = ws;
            const challengedPlayerName = data.player;

            const challengedPlayer = players.find(player => player.name === challengedPlayerName);

            if (challengedPlayer) {
                challengedPlayer.send(JSON.stringify({
                    type: 'gameStart',
                    playerNumber: players.indexOf(challenger) + 1
                }));
                challenger.send(JSON.stringify({
                    type: 'gameStart',
                    playerNumber: players.indexOf(challengedPlayer) + 1
                }));

                gameInProgress = true;
            }
        }

        if (data.type === 'gameOver') {
            players.forEach(player => {
                player.send(JSON.stringify({
                    type: 'gameOver'
                }));
            });
            gameInProgress = false;
        }

        if (data.type === 'scoreUpdate') {
            const { player1, player2 } = data;
            players.forEach(player => {
                player.send(JSON.stringify({
                    type: 'scoreUpdate',
                    player1,
                    player2
                }));
            });
        }
    });

    ws.on('close', () => {
        console.log('Ein Spieler hat die Verbindung getrennt.');
        players = players.filter(player => player !== ws);
        updatePlayerList();
    });

    // Weisen Sie dem Spieler einen Namen zu
    ws.name = `Player ${players.length}`;
    updatePlayerList();
});

// Den HTTP-Server auf Port 8080 oder den von Render angegebenen Port starten
server.listen(port, '0.0.0.0', () => {
    console.log(`Server läuft auf http://0.0.0.0:${port}`);
});
