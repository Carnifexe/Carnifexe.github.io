const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = [];  // Liste der verbundenen Spieler
let gameInProgress = false;

wss.on('connection', (ws) => {
    console.log('Ein Spieler hat sich verbunden.');

    // Wenn ein neuer Spieler sich verbindet, wird dieser der Spieler-Liste hinzugefügt
    players.push(ws);

    // Sende die Liste der verbundenen Spieler an alle Clients
    function updatePlayerList() {
        const playerNames = players.map(player => player.name || `Player ${players.indexOf(player) + 1}`);
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
            const challenger = ws;
            const challengedPlayerName = data.player;

            // Suche den herausgeforderten Spieler
            const challengedPlayer = players.find(player => player.name === challengedPlayerName);

            if (challengedPlayer) {
                // Sende eine Nachricht an den herausgeforderten Spieler
                challengedPlayer.send(JSON.stringify({
                    type: 'gameStart',
                    playerNumber: players.indexOf(challenger) + 1
                }));
                challenger.send(JSON.stringify({
                    type: 'gameStart',
                    playerNumber: players.indexOf(challengedPlayer) + 1
                }));

                // Spiel starten
                gameInProgress = true;
            }
        }

        // Wenn das Spiel vorbei ist, senden wir eine "gameOver"-Nachricht an beide Spieler
        if (data.type === 'gameOver') {
            players.forEach(player => {
                player.send(JSON.stringify({
                    type: 'gameOver'
                }));
            });
            gameInProgress = false;
        }

        // Wenn der Spieler das Spiel gewonnen hat, senden wir eine "scoreUpdate"-Nachricht an beide Spieler
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

    // Wenn der Spieler den Server verlässt, wird er aus der Spieler-Liste entfernt
    ws.on('close', () => {
        console.log('Ein Spieler hat die Verbindung getrennt.');
        players = players.filter(player => player !== ws);
        updatePlayerList();
    });

    // Spieler benennen (hier nur zu Demonstrationszwecken)
    ws.name = `Player ${players.indexOf(ws) + 1}`;
    updatePlayerList();
});

server.listen(8080, () => {
    console.log('Server läuft auf http://localhost:8080');
});
