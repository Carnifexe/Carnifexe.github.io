const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const server = new WebSocket.Server({ port: PORT });

let queue = [];
let games = new Map();
let ball = { x: 400, y: 300, speedX: 4, speedY: 4 };

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

        if (data.type === "paddleMove") {
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

    player1.send(JSON.stringify({ type: "gameStart", playerNumber: 1 }));
    player2.send(JSON.stringify({ type: "gameStart", playerNumber: 2 }));

    console.log('Neues Spiel gestartet!');

    setInterval(() => {
        ball.x += ball.speedX;
        ball.y += ball.speedY;

        if (ball.y <= 0 || ball.y >= 600) ball.speedY *= -1;
        if (ball.x <= 0 || ball.x >= 800) ball.speedX *= -1;

        player1.send(JSON.stringify({ type: "ballUpdate", x: ball.x, y: ball.y }));
        player2.send(JSON.stringify({ type: "ballUpdate", x: ball.x, y: ball.y }));
    }, 1000 / 60);
}

console.log(`WebSocket-Server läuft auf Port ${PORT}`);
