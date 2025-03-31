const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = [];
let gameStarted = false;

wss.on('connection', (ws) => {
    if (players.length < 2) {
        players.push(ws);
        ws.send(JSON.stringify({ type: "assignPlayer", player: players.length }));

        // Wenn beide Spieler verbunden sind, starte das Spiel
        if (players.length === 2 && !gameStarted) {
            gameStarted = true;
            players.forEach(player => {
                player.send(JSON.stringify({ type: "gameStart" }));
            });
        }
    } else {
        ws.send(JSON.stringify({ type: "error", message: "Spiel ist voll." }));
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        // Verarbeite die Nachrichten (Spielzustand, Bewegungen, etc.)
        if (data.type === "move") {
            // Verarbeite Bewegungen der Spieler
            // Hier kannst du die Logik zur Übertragung des aktuellen Spielzustands an beide Spieler einbauen
            // Zum Beispiel:
            if (data.player === 1) {
                // Update für Spieler 1
            } else {
                // Update für Spieler 2
            }
        }
    });

    ws.on('close', () => {
        // Verwalte die Verbindungsabbrüche und sende Nachrichten an die verbleibenden Spieler
        players = players.filter(player => player !== ws);
        if (players.length === 1) {
            players[0].send(JSON.stringify({ type: "gameOver", message: "Der Gegner hat das Spiel verlassen!" }));
        }
    });
});
