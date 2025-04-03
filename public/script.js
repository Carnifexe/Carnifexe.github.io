document.addEventListener('DOMContentLoaded', () => {
  // DOM-Elemente
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const playerList = document.getElementById('playerList');
  const connectionStatus = document.getElementById('connectionStatus');
  const playButton = document.getElementById('playButton');
  const gameInfo = document.getElementById('gameInfo');
  const leftScore = document.getElementById('leftScore').querySelector('span:last-child');
  const rightScore = document.getElementById('rightScore').querySelector('span:last-child');
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
    leftPaddle: { y: 50, width: 15, height: 100 },
    rightPaddle: { y: 50, width: 15, height: 100 },
    ball: { x: 50, y: 50, radius: 8 },
    scores: { left: 0, right: 0 },
    currentGame: null,
    playerSide: null,
    opponentName: '',
    playerName: '',
    gameActive: false
  };

  // Socket.io Verbindung
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 3000
  });

  // Verbindungsstatus
  socket.on('connect', () => {
    console.log('Verbunden mit Server:', socket.id);
    connectionStatus.innerHTML = '🟢 ONLINE';
    connectionStatus.className = 'online';
    gameInfo.textContent = 'Bereit zum Spielen';
  });

  socket.on('disconnect', (reason) => {
    console.log('Verbindung getrennt:', reason);
    connectionStatus.innerHTML = '🔴 OFFLINE';
    connectionStatus.className = 'offline';
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
    
    // Spielernamen anzeigen
    if (gameState.playerSide === 'left') {
      leftPlayerName.textContent = gameState.playerName || 'Du';
      rightPlayerName.textContent = data.opponent;
    } else {
      leftPlayerName.textContent = data.opponent;
      rightPlayerName.textContent = gameState.playerName || 'Du';
    }
    
    // Spielerliste aktualisieren
    playerList.innerHTML = `
      <li class="playing">
        Gegen ${data.opponent}
        <span class="status">(${gameState.playerSide === 'left' ? 'Links' : 'Rechts'})</span>
      </li>
    `;
    
    gameCanvas.style.cursor = 'none';
    gameInfo.textContent = 'Spiel läuft!';
    queueStatus.textContent = '';
    
    // Scores zurücksetzen
    gameState.scores = { left: 0, right: 0 };
    leftScore.textContent = '0';
    rightScore.textContent = '0';
    
    render();
  });

  // Spielupdate
  socket.on('game_update', (data) => {
    if (!gameState.gameActive) return;
    
    // Gegner-Paddle aktualisieren
    if (gameState.playerSide === 'left') {
      gameState.rightPaddle.y = data.paddleY;
    } else {
      gameState.leftPaddle.y = data.paddleY;
    }
    
    // Ballposition (falls vorhanden)
    if (data.ball) {
      gameState.ball = data.ball;
    }
    
    // Punktestand
    if (data.scores) {
      gameState.scores = data.scores;
      leftScore.textContent = gameState.scores.left;
      rightScore.textContent = gameState.scores.right;
    }
  });

  // Spielende
  socket.on('game_ended', (data) => {
    console.log('Spiel beendet:', data);
    gameState.gameActive = false;
    gameCanvas.style.cursor = 'default';
    
    if (data.reason === 'opponent_disconnected') {
      playerList.innerHTML = '<li class="empty">Gegner hat das Spiel verlassen</li>';
      gameInfo.textContent = 'Spiel beendet';
    }
  });

  // Spielen-Button
  playButton.addEventListener('click', () => {
    if (socket.connected) {
      gameState.playerName = prompt('Dein Spielername:', `Spieler_${Math.floor(Math.random()*1000)}`);
      const nameToSend = gameState.playerName || `Spieler_${socket.id.substr(0, 4)}`;
      
      socket.emit('join_queue', nameToSend);
      playerList.innerHTML = '<li class="empty">Suche nach Gegner...</li>';
      gameInfo.textContent = 'Verbinde...';
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

  // Touch-Support
  gameCanvas.addEventListener('touchmove', (e) => {
    if (!gameState.gameActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / gameCanvas.height) * 100));
    
    if (gameState.playerSide === 'left') {
      gameState.leftPaddle.y = y;
    } else {
      gameState.rightPaddle.y = y;
    }
    
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
    
    requestAnimationFrame(render);
  }

  // Initialisierung
  playButton.style.display = 'block';
});
