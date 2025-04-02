const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = [];

wss.on('connection', (ws) => {
    console.log('Ein Spieler hat sich verbunden');
    
    // Neue Verbindung hinzufügen
    players.push(ws);

    // Sende die Liste der verbundenen Spieler an alle Clients
    function updatePlayers() {
        const playerNames = players.map((player, index) => `Spieler ${index + 1}`);
        players.forEach(player => {
            player.send(JSON.stringify({
                type: 'updatePlayers',
                players: playerNames
            }));
        });
    }

    // Wenn ein Spieler eine Herausforderung sendet
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'challenge') {
            const opponentIndex = players.findIndex(player => player !== ws);
            if (opponentIndex !== -1) {
                players[opponentIndex].send(JSON.stringify({
                    type: 'gameStart',
                    playerNumber: players.indexOf(ws)
                }));
                ws.send(JSON.stringify({
                    type: 'gameStart',
                    playerNumber: players.indexOf(players[opponentIndex])
                }));
            }
        }
    });

    // Sende regelmäßig die Liste der Spieler
    setInterval(updatePlayers, 1000);

    // Wenn ein Spieler die Verbindung schließt
    ws.on('close', () => {
        players = players.filter(player => player !== ws);
        updatePlayers();
    });
});

console.log('WebSocket-Server läuft auf ws://localhost:8080');
