const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = [];
let playerCount = 0;

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('New player connected: ' + socket.id);

  // Spieler zur Liste hinzufügen
  players.push(socket);
  playerCount++;

  // Sende die Liste der verbundenen Spieler an alle Clients
  io.emit('playerList', getWaitingPlayerNames());

  // Wenn ein Spieler eine Herausforderung schickt
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

  // Wenn ein Spieler das Spiel verlässt
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id);
    players = players.filter(player => player.id !== socket.id);
    // Sende die aktualisierte Liste an alle Clients
    io.emit('playerList', getWaitingPlayerNames());
  });
});

// Funktion zur Ausgabe der Warteliste
function getWaitingPlayerNames() {
  return players.map((player, index) => {
    return { name: `Spieler ${index + 1}`, id: player.id };
  });
}

server.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});
