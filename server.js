const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Pong Server is running...');
});

const wss = new WebSocket.Server({ server });

let players = []; // Liste der verbundenen Spieler
let gameInProgress = false;

wss.on('connection', (ws) => {
    console.log('Ein Spieler hat sich verbunden.');

    players.push(ws);

    // Funktion zur Aktualisierung der Spieler-Liste
    function updatePlayerList() {
        const playerNames = players.map(player => player.name || `Player ${players.indexOf(player) + 1}`);
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

    ws.name = `Player ${players.indexOf(ws) + 1}`;
    updatePlayerList();
});

server.listen(8080, '0.0.0.0', () => {
    console.log('Server läuft auf http://0.0.0.0:8080');
});
