<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pong Multiplayer</title>
  <style>
    body {
      font-family: Arial, sans-serif;
    }
    .waiting-list {
      margin-top: 20px;
    }
    .player {
      padding: 10px;
      cursor: pointer;
      background-color: #f0f0f0;
      margin-bottom: 5px;
      border: 1px solid #ddd;
    }
    .player:hover {
      background-color: #d0d0d0;
    }
    canvas {
      border: 1px solid black;
      display: block;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <h1>Pong Multiplayer</h1>
  <div id="waitingRoom">
    <h2>Warteliste</h2>
    <div class="waiting-list" id="waitingList">
      <!-- Spieler werden hier angezeigt -->
    </div>
  </div>

  <div id="gameArea" style="display: none;">
    <h2>Spiel läuft...</h2>
    <canvas id="pongCanvas" width="800" height="400"></canvas>
    <div id="scoreboard">
      <span id="leftScore">0</span> - <span id="rightScore">0</span>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();

    let opponentId = null;
    let gameInProgress = false;

    // Spielerlistenevents
    socket.on('playerList', (players) => {
      const waitingList = document.getElementById('waitingList');
      waitingList.innerHTML = '';
      players.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.textContent = player;
        playerElement.classList.add('player');
        playerElement.onclick = () => challengePlayer(index);
        waitingList.appendChild(playerElement);
      });
    });

    function challengePlayer(index) {
      const playerName = `Spieler ${index + 1}`;
      const opponentSocketId = players[index];
      if (confirm(`Möchtest du gegen ${playerName} spielen?`)) {
        socket.emit('challengePlayer', playerName, opponentSocketId);
      }
    }

    // Herausforderungen empfangen
    socket.on('receiveChallenge', (challengerName, challengerId) => {
      if (confirm(`${challengerName} möchte gegen dich spielen. Möchtest du die Herausforderung annehmen?`)) {
        socket.emit('challengeResponse', true, challengerId);
      } else {
        socket.emit('challengeResponse', false, challengerId);
      }
    });

    socket.on('challengeDeclined', () => {
      alert('Die Herausforderung wurde abgelehnt.');
    });

    socket.on('startGame', () => {
      startPongGame();
    });

    socket.on('returnToWait', () => {
      returnToWaitingRoom();
    });

    // Pong-Spiel starten
    function startPongGame() {
      document.getElementById('waitingRoom').style.display = 'none';
      document.getElementById('gameArea').style.display = 'block';
      gameInProgress = true;

      // TODO: Hier das Pong-Spiel-Canvas implementieren
      let leftScore = 0;
      let rightScore = 0;

      const canvas = document.getElementById('pongCanvas');
      const context = canvas.getContext('2d');

      // Pong-Spiel Logik
      // TODO: Pong-Spiel Implementierung, z. B. Bewegung der Schläger und Ball

      function draw() {
        // Zeichne das Spielfeld, die Schläger und den Ball
        context.clearRect(0, 0, canvas.width, canvas.height);
        // TODO: Ball- und Schlägerbewegung hier umsetzen
        // Score anzeigen
        document.getElementById('leftScore').textContent = leftScore;
        document.getElementById('rightScore').textContent = rightScore;
      }

      setInterval(draw, 1000 / 60); // FPS
    }

    function returnToWaitingRoom() {
      document.getElementById('gameArea').style.display = 'none';
      document.getElementById('waitingRoom').style.display = 'block';
      gameInProgress = false;
    }
  </script>
</body>
</html>
