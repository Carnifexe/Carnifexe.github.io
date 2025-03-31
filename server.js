const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let rooms = [];

// === OPTIMIERUNG 1: Ping/Pong für Verbindungsstabilität ===
wss.on('connection', (ws) => {
    ws.isAlive = true; // Flag für Verbindungsstatus
    ws.on('pong', () => ws.isAlive = true); // Antwort auf Ping

    console.log("Ein Client hat sich verbunden.");
    players.push(ws);
    console.log(`Aktuelle Spieleranzahl: ${players.length}`);

    if (players.length % 2 === 0) {
        console.log("Zwei Spieler sind verbunden. Spiel wird gestartet...");
        const roomId = rooms.length + 1;
        rooms.push({ roomId, players: players.slice(-2), gameStarted: false });
        startGame(roomId);
    } else {
        broadcastPlayerCount();
    }

    // === OPTIMIERUNG 2: Try-Catch für Nachrichten-Parsing ===
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === "getPlayers") {
                ws.send(JSON.stringify({ type: "playerList", count: players.length, rooms }));
            }
            if (data.type === "ready") {
                console.log("Spielstartanfrage erhalten.");
                const room = rooms.find(room => room.players.includes(ws));
                if (room && room.players.length === 2 && !room.gameStarted) {
                    room.gameStarted = true;
                    startGame(room.roomId);
                }
            }
        } catch (error) {
            console.error("Ungültige Nachricht:", error);
        }
    });

    // === OPTIMIERUNG 3: Verbesserter Room-Cleanup ===
    ws.on('close', () => {
        players = players.filter(player => player !== ws);
        console.log(`Spieler getrennt. Aktuelle Spieleranzahl: ${players.length}`);
        
        rooms = rooms.filter(room => {
            const hasPlayer = room.players.includes(ws);
            if (hasPlayer) {
                room.players.forEach(p => {
                    if (p !== ws && p.readyState === WebSocket.OPEN) {
                        p.send(JSON.stringify({ type: "playerDisconnected" }));
                    }
                });
            }
            return !hasPlayer;
        });
        
        broadcastPlayerCount();
    });
});

// === OPTIMIERUNG 1: Ping-Intervall für inaktive Clients ===
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log("Client wegen Inaktivität getrennt.");
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Alle 30 Sekunden prüfen

function broadcastPlayerCount() {
    const playerCount = players.length;
    players.forEach(player => {
        if (player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify({ type: "updatePlayerCount", count: playerCount }));
        }
    });
}

function startGame(roomId) {
    const room = rooms.find(r => r.roomId === roomId);
    if (room && room.players.length === 2 && !room.gameStarted) {
        room.gameStarted = true;
        room.players.forEach((player, index) => {
            if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({ 
                    type: "gameStart", 
                    roomId,
                    playerNumber: index + 1
                }));
            }
        });
        console.log(`Spiel im Raum ${roomId} gestartet!`);
    }
}

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
