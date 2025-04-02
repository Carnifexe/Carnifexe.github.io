const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const socket = io('http://localhost:10000', {
  transports: ['websocket'],  // Erzwingt WebSocket
  upgrade: false,
  reconnectionAttempts: 5
});

// Game state
const players = {};
const games = {};
let playerCount = 0;

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    
    playerCount++;
    const playerName = `Spieler ${playerCount}`;
    players[socket.id] = {
        name: playerName,
        socket: socket,
        status: 'waiting'
    };
    
    updatePlayerList();
    
    socket.on('invite', (targetId) => {
        if (players[targetId] && players[targetId].status === 'waiting') {
            io.to(targetId).emit('invitation', {
                from: socket.id,
                fromName: players[socket.id].name
            });
        }
    });
    
    socket.on('invitationResponse', (data) => {
        const { to, accepted } = data;
        
        if (accepted) {
            players[socket.id].status = 'playing';
            players[to].status = 'playing';
            
            const gameId = `${socket.id}-${to}`;
            games[gameId] = createGame(socket.id, to);
            
            io.to(socket.id).emit('gameStart', {
                gameId,
                opponent: players[to].name,
                playerSide: 'left'
            });
            
            io.to(to).emit('gameStart', {
                gameId,
                opponent: players[socket.id].name,
                playerSide: 'right'
            });
            
            updatePlayerList();
        } else {
            io.to(to).emit('invitationDeclined', {
                by: players[socket.id].name
            });
        }
    });
    
    socket.on('paddleMove', (data) => {
        const { gameId, y } = data;
        const game = games[gameId];
        
        if (game) {
            if (socket.id === game.leftPlayer) {
                game.leftPaddleY = y;
            } else if (socket.id === game.rightPlayer) {
                game.rightPaddleY = y;
            }
            
            io.to(game.leftPlayer).emit('gameState', getGameState(game, game.leftPlayer));
            io.to(game.rightPlayer).emit('gameState', getGameState(game, game.rightPlayer));
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);
        
        for (const gameId in games) {
            if (games[gameId].leftPlayer === socket.id || games[gameId].rightPlayer === socket.id) {
                endGame(gameId);
                break;
            }
        }
        
        delete players[socket.id];
        updatePlayerList();
    });
});

function createGame(player1, player2) {
    return {
        leftPlayer: player1,
        rightPlayer: player2,
        leftPaddleY: 50,
        rightPaddleY: 50,
        ballX: 50,
        ballY: 50,
        ballSpeedX: 5,
        ballSpeedY: 5,
        leftScore: 0,
        rightScore: 0,
        roundsPlayed: 0
    };
}

function updateGame(game) {
    game.ballX += game.ballSpeedX;
    game.ballY += game.ballSpeedY;
    
    if (game.ballY <= 0 || game.ballY >= 100) {
        game.ballSpeedY = -game.ballSpeedY;
    }
    
    if (game.ballX <= 5 && game.ballY >= game.leftPaddleY - 10 && game.ballY <= game.leftPaddleY + 10) {
        game.ballSpeedX = -game.ballSpeedX * 1.05;
    }
    
    if (game.ballX >= 95 && game.ballY >= game.rightPaddleY - 10 && game.ballY <= game.rightPaddleY + 10) {
        game.ballSpeedX = -game.ballSpeedX * 1.05;
    }
    
    if (game.ballX < 0) {
        game.rightScore++;
        resetBall(game);
        game.roundsPlayed++;
    }
    
    if (game.ballX > 100) {
        game.leftScore++;
        resetBall(game);
        game.roundsPlayed++;
    }
    
    if (game.roundsPlayed >= 10) {
        io.to(game.leftPlayer).emit('gameEnd');
        io.to(game.rightPlayer).emit('gameEnd');
        endGame(`${game.leftPlayer}-${game.rightPlayer}`);
    }
}

function resetBall(game) {
    game.ballX = 50;
    game.ballY = 50;
    game.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
    game.ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * 5;
}

function endGame(gameId) {
    const game = games[gameId];
    if (game) {
        if (players[game.leftPlayer]) {
            players[game.leftPlayer].status = 'waiting';
            io.to(game.leftPlayer).emit('returnToLobby');
        }
        if (players[game.rightPlayer]) {
            players[game.rightPlayer].status = 'waiting';
            io.to(game.rightPlayer).emit('returnToLobby');
        }
        delete games[gameId];
        updatePlayerList();
    }
}

function updatePlayerList() {
    const playerList = Object.values(players).map(player => ({
        id: player.socket.id,
        name: player.name,
        status: player.status
    }));
    io.emit('playerListUpdate', playerList);
}

setInterval(() => {
    for (const gameId in games) {
        updateGame(games[gameId]);
        const game = games[gameId];
        io.to(game.leftPlayer).emit('gameState', getGameState(game, game.leftPlayer));
        io.to(game.rightPlayer).emit('gameState', getGameState(game, game.rightPlayer));
    }
}, 1000 / 60);

const PORT = 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
