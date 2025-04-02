const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const server = new WebSocket.Server({ port: PORT });

let queue = [];
let games = new Map();
let ballX = 0, ballY = 0;
let ballSpeedX = 5, ballSpeedY = 5;

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
    
    // Beginne das Spiel und sende kontinuierlich die Ballposition
    gameLoop(player1, player2);
}

function gameLoop(player1, player2) {
    setInterval(() => {
        // Berechne die neue Ballposition
        ballX += ballSpeedX;
        ballY += ballSpeedY;

        if (ballY <= 0 || ballY >= 600) ballSpeedY *= -1;

        // Kollisionsabfrage
        if ((ballX <= 15 && ballY >= player1.y && ballY <= player1.y + 100) ||
            (ballX >= 785 && ballY >= player2.y && ballY <= player2.y + 100)) {
            ballSpeedX *= -1;
        }

        // Ball zurücksetzen, wenn er das Spielfeld verlässt
        if (ballX < 0 || ballX > 800) {
            ballX = 400;
            ballY = 300;
            ballSpeedX = 5 * (Math.random() > 0.5 ? 1 : -1);
            ballSpeedY = 5 * (Math.random() > 0.5 ? 1 : -1);
        }

        // Sende die Ballposition an beide Spieler
        [player1, player2].forEach(player => {
            if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({
                    type: "ballUpdate",
                    x: ballX,
                    y: ballY,
                    speedX: ballSpeedX,
                    speedY: ballSpeedY
                }));
            }
        });
    }, 1000 / 60); // 60 FPS
}

console.log(`WebSocket-Server läuft auf Port ${PORT}`);
