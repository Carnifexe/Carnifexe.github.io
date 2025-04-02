const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://carnifexe-github-io.onrender.com", "http://localhost:*"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game state
const players = {};
const games = {};
let playerCount = 0;

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('✅ Neue Verbindung:', socket.id);
    
    // Assign player name
    playerCount++;
    const playerName = `Spieler ${playerCount}`;
    players[socket.id] = {
        name: playerName,
        socket: socket,
        status: 'waiting'
    };
    
    // Send updated player list
    updatePlayerList();
    
    // Handle game invitation
    socket.on('invite', (targetId) => {
        if (players[targetId] && players[targetId].status === 'waiting') {
            io.to(targetId).emit('invitation', {
                from: socket.id,
                fromName: players[socket.id].name
            });
            console.log(`🎮 ${playerName} lädt ${players[targetId].name} ein`);
        }
    });
    
    // Handle invitation response
    socket.on('invitationResponse', (data) => {
        const { to, accepted } = data;
        
        if (accepted) {
            // Start game
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
            
            console.log(`🚀 Spiel gestartet: ${gameId}`);
            updatePlayerList();
        } else {
            // Decline
            io.to(to).emit('invitationDeclined', {
                by: players[socket.id].name
            });
            console.log(`❌ Einladung abgelehnt von ${players[socket.id].name}`);
        }
    });
    
    // Handle paddle movement
    socket.on('paddleMove', (data) => {
        const { gameId, y } = data;
        const game = games[gameId];
        
        if (game) {
            if (socket.id === game.leftPlayer) {
                game.leftPaddleY = y;
            } else if (socket.id === game.rightPlayer) {
                game.rightPaddleY = y;
            }
            
            // Broadcast game state
            io.to(game.leftPlayer).emit('gameState', getGameState(game, game.leftPlayer));
            io.to(game.rightPlayer).emit('gameState', getGameState(game, game.rightPlayer));
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('❌ Verbindung getrennt:', socket.id);
        
        // End any active games
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

// Game functions
function createGame(player1, player2) {
    return {
        leftPlayer: player1,
        rightPlayer: player2,
        leftPaddleY: 50,
        rightPaddleY: 50,
        ballX: 50,
        ballY: 50,
        ballSpeedX: (Math.random() > 0.5 ? 1 : -1) * 5,
        ballSpeedY: (Math.random() > 0.5 ? 1 : -1) * 5,
        leftScore: 0,
        rightScore: 0,
        roundsPlayed: 0
    };
}

function updateGame(game) {
    // Ball movement
    game.ballX += game.ballSpeedX;
    game.ballY += game.ballSpeedY;
    
    // Wall collision
    if (game.ballY <= 0 || game.ballY >= 100) {
        game.ballSpeedY = -game.ballSpeedY;
    }
    
    // Paddle collision
    if (game.ballX <= 5 && game.ballY >= game.leftPaddleY - 10 && game.ballY <= game.leftPaddleY + 10) {
        game.ballSpeedX = -game.ballSpeedX * 1.05;
    }
    
    if (game.ballX >= 95 && game.ballY >= game.rightPaddleY - 10 && game.ballY <= game.rightPaddleY + 10) {
        game.ballSpeedX = -game.ballSpeedX * 1.05;
    }
    
    // Scoring
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
    
    // Game over after 10 rounds
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

function getGameState(game, playerId) {
    return {
        leftPaddleY: game.leftPaddleY,
        rightPaddleY: game.rightPaddleY,
        ballX: game.ballX,
        ballY: game.ballY,
        leftScore: game.leftScore,
        rightScore: game.rightScore,
        isLeftPlayer: playerId === game.leftPlayer
    };
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
        console.log(`🏁 Spiel beendet: ${gameId}`);
    }
}

function updatePlayerList() {
    const playerList = Object.values(players).map(player => ({
        id: player.socket.id,
        name: player.name,
        status: player.status
    }));
    io.emit('playerListUpdate', playerList);
    console.log('📋 Spielerliste aktualisiert:', playerList);
}

// Game loop (60 FPS)
setInterval(() => {
    for (const gameId in games) {
        updateGame(games[gameId]);
        const game = games[gameId];
        io.to(game.leftPlayer).emit('gameState', getGameState(game, game.leftPlayer));
        io.to(game.rightPlayer).emit('gameState', getGameState(game, game.rightPlayer));
    }
}, 1000 / 60);

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Server läuft auf Port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
});
