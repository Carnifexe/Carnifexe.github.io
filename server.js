const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Hier kommt die Spiel-Logik aus Node.js
let players = [];
let rooms = [];

wss.on('connection', (ws) => {
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

    ws.on('message', (message) => {
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
    });

    ws.on('close', () => {
        players = players.filter(player => player !== ws);
        console.log(`Spieler getrennt. Aktuelle Spieleranzahl: ${players.length}`);
        broadcastPlayerCount();
        rooms = rooms.filter(room => !room.players.includes(ws));
    });
});

function broadcastPlayerCount() {
    const playerCount = players.length;
    players.forEach(player => {
        player.send(JSON.stringify({ type: "updatePlayerCount", count: playerCount }));
    });
}

function startGame(roomId) {
    const room = rooms.find(r => r.roomId === roomId);
    if (room && room.players.length === 2 && !room.gameStarted) {
        room.gameStarted = true;
        room.players.forEach((player, index) => {
            player.send(JSON.stringify({ 
                type: "gameStart", 
                roomId,
                playerNumber: index + 1 // Spieler 1 oder 2
            }));
        });
        console.log(`Spiel im Raum ${roomId} gestartet!`);
    }
}

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
