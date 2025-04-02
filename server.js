const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const server = new WebSocket.Server({ port: PORT });

let queue = [];
let games = new Map();

server.on('connection', (socket) => {
    console.log('Neuer Spieler verbunden.');

    socket.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === "joinQueue") {
            queue.push(socket);
            console.log(`Spieler in Warteschlange: ${queue.length}`);

            server.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: "queueUpdate", count: queue.length }));
                }
            });

            if (queue.length >= 2) {
                startGame(queue.shift(), queue.shift());
            }
        }

        if (data.type === "paddleMove" || data.type === "ballUpdate") {
            const game = games.get(socket);
            if (game) {
                const opponent = game.opponent;
                if (opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify(data));
                }
            }
        }
    });

    socket.on('close', () => {
        console.log('Spieler hat die Verbindung getrennt.');
        queue = queue.filter(player => player !== socket);

        const game = games.get(socket);
        if (game) {
            games.delete(game.player);
            games.delete(game.opponent);
            if (game.opponent.readyState === WebSocket.OPEN) {
                game.opponent.send(JSON.stringify({ type: "opponentDisconnected" }));
            }
        }
    });
});

function startGame(player1, player2) {
    games.set(player1, { player: player1, opponent: player2 });
    games.set(player2, { player: player2, opponent: player1 });

    player1.send(JSON.stringify({ type: "gameStart", playerNumber: 1, opponent: "Spieler 2" }));
    player2.send(JSON.stringify({ type: "gameStart", playerNumber: 2, opponent: "Spieler 1" }));

    console.log('Neues Spiel gestartet!');
}

console.log(`WebSocket-Server läuft auf Port ${PORT}`);
