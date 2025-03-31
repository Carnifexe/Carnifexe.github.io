const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = []; // Liste der verbundenen Spieler
let rooms = [];    // Liste der aktiven Räume

// Wenn ein neuer Client verbunden wird
wss.on('connection', (ws) => {
    console.log("Ein Client hat sich verbunden.");
    
    // Füge den neuen Spieler zur Liste der verbundenen Spieler hinzu
    players.push(ws);
    console.log(`Aktuelle Spieleranzahl: ${players.length}`);

    // Wenn genau 2 Spieler verbunden sind, starte das Spiel
    if (players.length % 2 === 0) {
        console.log("Zwei Spieler sind verbunden. Spiel wird gestartet...");
        const roomId = rooms.length + 1;
        rooms.push({ roomId, players: players.slice(-2), gameStarted: false });
        startGame(roomId);
    } else {
        // Benachrichtige alle verbundenen Clients über die aktuelle Spieleranzahl
        broadcastPlayerCount();
    }

    // Wenn der Client eine Nachricht sendet
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === "getPlayers") {
            // Sende die aktuelle Spieleranzahl zurück
            ws.send(JSON.stringify({ type: "playerList", count: players.length, rooms }));
        }

        if (data.type === "ready") {
            console.log("Spielstartanfrage erhalten.");
            // Wenn zwei Spieler bereit sind, starte das Spiel
            const room = rooms.find(room => room.players.includes(ws));
            if (room && room.players.length === 2 && !room.gameStarted) {
                room.gameStarted = true;
                startGame(room.roomId);
            }
        }
    });

    // Wenn der Client die Verbindung trennt
    ws.on('close', () => {
        // Entferne den Spieler aus der Liste der verbundenen Spieler
        players = players.filter(player => player !== ws);
        console.log(`Spieler getrennt. Aktuelle Spieleranzahl: ${players.length}`);

        // Aktualisiere die Spieleranzahl bei allen Clients
        broadcastPlayerCount();

        // Wenn ein Raum ohne Spieler übrig bleibt, löschen
        rooms = rooms.filter(room => !room.players.includes(ws));
    });
});

// Funktion, um die aktuelle Spieleranzahl an alle Clients zu senden
function broadcastPlayerCount() {
    const playerCount = players.length;
    players.forEach(player => {
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
        console.log(`Spiel im Raum ${roomId} gestartet!`);
    }
}
