const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = []; // Alle verbundenen Spieler
let rooms = [];    // Laufende Spiele (Räume)

wss.on('connection', (ws) => {
    console.log("Ein neuer Client hat sich verbunden.");

    // Füge den neuen Spieler zur Liste der verbundenen Spieler hinzu
    players.push(ws);
    broadcastPlayerCount(); // Sende die aktuelle Spieleranzahl an alle Clients

    // Wenn 2 Spieler verbunden sind, starte ein Spiel
    if (players.length % 2 === 0) {
        const roomId = rooms.length + 1;
        rooms.push({ roomId, players: players.slice(-2), gameStarted: false });
        startGame(roomId);
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === "getPlayers") {
            // Sende die aktuelle Spieleranzahl zurück
            ws.send(JSON.stringify({ type: "playerList", count: players.length, rooms }));
        }

        if (data.type === "ready") {
            // Hier könnte man zusätzliche Logik für den Start des Spiels hinzufügen
            console.log("Spielstartanfrage erhalten.");
        }
    });

    ws.on('close', () => {
        // Entferne den Spieler aus der Liste der verbundenen Spieler
        players = players.filter(player => player !== ws);
        broadcastPlayerCount(); // Aktualisiere die Spieleranzahl

        // Wenn ein Spielraum verlassen wurde, lösche den Raum
        rooms = rooms.filter(room => !room.players.includes(ws));
    });
});

// Funktion, um die aktuelle Spieleranzahl an alle Clients zu senden
function broadcastPlayerCount() {
    const playerCount = players.length;
    players.forEach(player => {
        // Versenden Sie die aktualisierte Spieleranzahl an alle Clients
        player.send(JSON.stringify({ type: "updatePlayerCount", count: playerCount }));
    });
}

// Funktion, um das Spiel zu starten, wenn zwei Spieler verbunden sind
function startGame(roomId) {
    const room = rooms.find(r => r.roomId === roomId);
    if (room && room.players.length === 2 && !room.gameStarted) {
        room.gameStarted = true;

        room.players.forEach(player => {
            player.send(JSON.stringify({ type: "gameStart", roomId }));
        });
    }
}
