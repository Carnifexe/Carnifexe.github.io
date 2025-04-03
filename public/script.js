document.addEventListener('DOMContentLoaded', () => {
  // DOM-Elemente
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const playButton = document.getElementById('playButton');
  const gameInfo = document.getElementById('gameInfo');
  const leftPlayerName = document.getElementById('leftPlayerName');
  const rightPlayerName = document.getElementById('rightPlayerName');
  
  // Queue Status Element
  const queueStatus = document.createElement('div');
  queueStatus.id = 'queue-status';
  queueStatus.style.margin = '10px 0';
  queueStatus.style.color = '#FFC107';
  gameInfo.parentNode.insertBefore(queueStatus, gameInfo.nextSibling);

  // Spielzustand
  const gameState = {
    leftPaddle: { y: 50, width: 15, height: 20 },
    rightPaddle: { y: 50, width: 15, height: 20 },
    ball: { x: 50, y: 50, radius: 5, speedX: 0, speedY: 0 },
    scores: { left: 0, right: 0 },
    currentGame: null,
    playerSide: null,
    opponentName: '',
    playerName: '',
    gameActive: false,
    isHost: false
  };

  // Canvas Größe anpassen
  function resizeCanvas() {
    gameCanvas.width = gameCanvas.clientWidth;
    gameCanvas.height = gameCanvas.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Socket.io Verbindung
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 3000
  });

  // Verbindungsstatus
  socket.on('connect', () => {
    console.log('Verbunden mit Server:', socket.id);
    gameInfo.textContent = 'Bereit zum Spielen';
  });

  socket.on('disconnect', (reason) => {
    console.log('Verbindung getrennt:', reason);
    gameState.gameActive = false;
    queueStatus.textContent = reason === 'io server disconnect' 
      ? 'Server neu gestartet - bitte Seite neu laden' 
      : 'Verbindung verloren - versuche erneut...';
  });

  socket.on('connect_error', (err) => {
    console.error('Verbindungsfehler:', err);
    queueStatus.textContent = 'Verbindungsfehler - versuche erneut...';
  });

  // Warteschlangen-Update
  socket.on('queue_update', (data) => {
    console.log('Warteschlangen-Update:', data);
    queueStatus.textContent = `Warteposition: ${data.position} (ca. ${data.estimatedWait}s)`;
    gameInfo.textContent = 'Suche nach Gegner...';
  });

  // Spielstart
  socket.on('game_start', (data) => {
    console.log('Spielstart:', data);
    gameState.currentGame = data.gameId;
    gameState.playerSide = data.playerSide;
    gameState.opponentName = data.opponent;
    gameState.gameActive = true;
    gameState.isHost = data.playerSide === 'left';
    
    // Initialzustand übernehmen
    gameState.ball = {
      x: data.initialState.ball.x,
      y: data.initialState.ball.y,
      speedX: data.initialState.ball.speedX,
      speedY: data.initialState.ball.speedY,
      radius: 5
    };
    gameState.scores = data.initialState.scores;
    gameState.leftPaddle.y = data.initialState.leftPaddleY;
    gameState.rightPaddle.y = data.initialState.rightPaddleY;
    
    // Spielernamen anzeigen
    if (gameState.playerSide === 'left') {
      leftPlayerName.textContent = gameState.playerName || 'Du';
      rightPlayerName.textContent = data.opponent;
    } else {
      leftPlayerName.textContent = data.opponent;
      rightPlayerName.textContent = gameState.playerName || 'Du';
    }
    
    gameInfo.textContent = 'Spiel läuft!';
    queueStatus.textContent = '';
    
    // Game Loop starten
    startGameLoop();
  });

  function startGameLoop() {
    function gameLoop() {
      if (!gameState.gameActive) return;
      
      // Ballbewegung nur vom Host berechnen
      if (gameState.isHost) {
        gameState.ball.x += gameState.ball.speedX;
        gameState.ball.y += gameState.ball.speedY;
        
        // Kollisionen prüfen
        checkCollisions();
        
        // Update an Server senden
        socket.emit('game_update', {
          gameId: gameState.currentGame,
          ball: gameState.ball,
          scores: gameState.scores,
          isHost: true
        });
      }
      
      render();
      requestAnimationFrame(gameLoop);
    }
    gameLoop();
  }

  function checkCollisions() {
    // Wandkollision
    if (gameState.ball.y - gameState.ball.radius <= 0 || 
        gameState.ball.y + gameState.ball.radius >= 100) {
      gameState.ball.speedY *= -1;
    }
    
    // Schlägerkollision (nur Host prüft)
    if (gameState.isHost) {
      if (gameState.ball.x - gameState.ball.radius <= 20 + 15 && 
          Math.abs(gameState.ball.y - gameState.leftPaddle.y) < 15) {
        gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 1.05;
      }
      if (gameState.ball.x + gameState.ball.radius >= gameCanvas.width - 20 - 15 && 
          Math.abs(gameState.ball.y - gameState.rightPaddle.y) < 15) {
        gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 1.05;
      }
      
      // Punkte
      if (gameState.ball.x < 0 || gameState.ball.x > 100) {
        if (gameState.ball.x < 0) gameState.scores.right++;
        else gameState.scores.left++;
        resetBall();
      }
    }
  }

  function resetBall() {
    gameState.ball = { 
      x: 50, 
      y: 50,
      speedX: (Math.random() > 0.5 ? 1 : -1) * 2,
      speedY: (Math.random() * 2 - 1) * 2,
      radius: 5
    };
  }

  // Spielupdate
  socket.on('game_update', (data) => {
    if (!gameState.gameActive) return;
    
    if (data.ball) {
      gameState.ball = data.ball;
    }
    
    if (data.scores) {
      gameState.scores = data.scores;
    }
  });

  // Spielende
  socket.on('game_ended', (data) => {
    console.log('Spiel beendet:', data);
    gameState.gameActive = false;
    gameCanvas.style.cursor = 'default';
    
    if (data.reason === 'opponent_disconnected') {
      gameInfo.textContent = 'Gegner hat das Spiel verlassen';
    }
  });

  // Spielen-Button
  playButton.addEventListener('click', () => {
    if (socket.connected) {
      gameState.playerName = prompt('Dein Spielername:', `Spieler_${Math.floor(Math.random()*1000)}`);
      const nameToSend = gameState.playerName || `Spieler_${socket.id.substr(0, 4)}`;
      
      socket.emit('join_queue', nameToSend);
      gameInfo.textContent = 'Suche nach Gegner...';
    } else {
      alert('Keine Serververbindung!');
    }
  });

  // Paddle-Bewegung
  gameCanvas.addEventListener('mousemove', (e) => {
    if (!gameState.gameActive) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / gameCanvas.height) * 100));
    
    // Eigenes Paddle bewegen
    if (gameState.playerSide === 'left') {
      gameState.leftPaddle.y = y;
    } else {
      gameState.rightPaddle.y = y;
    }
    
    // Update an Server senden
    socket.emit('game_update', {
      gameId: gameState.currentGame,
      paddleY: y
    });
  });

  // Render-Funktion
  function render() {
    if (!gameState.gameActive) return;
    
    // Hintergrund
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Mittellinie
    ctx.setLineDash([15, 15]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gameCanvas.width/2, 0);
    ctx.lineTo(gameCanvas.width/2, gameCanvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Schläger
    ctx.fillStyle = '#FFF';
    // Linker Schläger
    ctx.fillRect(
      20, 
      (gameState.leftPaddle.y/100)*gameCanvas.height - gameState.leftPaddle.height/2, 
      gameState.leftPaddle.width, 
      gameState.leftPaddle.height
    );
    // Rechter Schläger
    ctx.fillRect(
      gameCanvas.width - 20 - gameState.rightPaddle.width, 
      (gameState.rightPaddle.y/100)*gameCanvas.height - gameState.rightPaddle.height/2, 
      gameState.rightPaddle.width, 
      gameState.rightPaddle.height
    );
    
    // Ball
    ctx.beginPath();
    ctx.arc(
      (gameState.ball.x/100)*gameCanvas.width,
      (gameState.ball.y/100)*gameCanvas.height,
      gameState.ball.radius,
      0,
      Math.PI*2
    );
    ctx.fill();
    
    // Spielernamen anzeigen
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(leftPlayerName.textContent, gameCanvas.width * 0.25, 30);
    ctx.fillText(rightPlayerName.textContent, gameCanvas.width * 0.75, 30);
    
    // Punktestand anzeigen
    ctx.font = '24px Arial';
    ctx.fillText(gameState.scores.left, gameCanvas.width * 0.25, 60);
    ctx.fillText(gameState.scores.right, gameCanvas.width * 0.75, 60);
  }
});
