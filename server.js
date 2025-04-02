const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = [];
let playerCount = 0;
let waitingPlayers = [];

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('New player connected: ' + socket.id);
  
  players.push(socket);
  playerCount++;
  
  // Wenn ein Spieler sich verbindet, sende ihm die Liste der wartenden Spieler
  socket.emit('playerList', getWaitingPlayerNames());

  // Wenn ein Spieler einen anderen herausfordert
  socket.on('challengePlayer', (challengerName, opponentId) => {
    const opponentSocket = players.find(player => player.id === opponentId);
    if (opponentSocket) {
      opponentSocket.emit('receiveChallenge', challengerName, socket.id);
    }
  });

  // Wenn der Gegner eine Herausforderung annimmt oder ablehnt
  socket.on('challengeResponse', (accept, challengerId) => {
    const challengerSocket = players.find(player => player.id === challengerId);
    if (challengerSocket) {
      if (accept) {
        challengerSocket.emit('startGame');
        socket.emit('startGame');
      } else {
        challengerSocket.emit('challengeDeclined');
        socket.emit('challengeDeclined');
      }
    }
  });

  // Wenn ein Spiel vorbei ist, komme zurück in den Wartebereich
  socket.on('endGame', () => {
    io.emit('returnToWait');
  });

  // Wenn ein Spieler das Spiel verlässt
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id);
    players = players.filter(player => player.id !== socket.id);
  });
});

function getWaitingPlayerNames() {
  return players.map((player, index) => {
    return `Spieler ${index + 1}`;
  });
}

server.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});
