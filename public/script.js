document.addEventListener('DOMContentLoaded', () => {
  // ======================
  // 1. Initialisierung
  // ======================
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const statusDisplay = document.createElement('div');
  
  // Status-Anzeige stylen
  statusDisplay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #333;
    color: white;
    border-radius: 5px;
    font-family: Arial;
    z-index: 1000;
  `;
  document.body.appendChild(statusDisplay);

  // ======================
  // 2. WebSocket-Verbindung
  // ======================
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    timeout: 10000,
    withCredentials: true
  });

  // ======================
  // 3. Spielzustand
  // ======================
  const game = {
    leftPaddle: { y: 50, width: 20, height: 100 },
    rightPaddle: { y: 50, width: 20, height: 100 },
    ball: { x: 50, y: 50, radius: 10 },
    score: { left: 0, right: 0 },
    isConnected: false
  };

  // ======================
  // 4. Verbindungs-Handler
  // ======================
  socket.on('connect', () => {
    console.log('✅ Verbunden mit Server:', socket.id);
    game.isConnected = true;
    statusDisplay.textContent = '🟢 ONLINE';
    statusDisplay.style.background = '#4CAF50';
  });

  socket.on('disconnect', () => {
    console.log('❌ Verbindung getrennt');
    game.isConnected = false;
    statusDisplay.textContent = '🔴 OFFLINE';
    statusDisplay.style.background = '#F44336';
  });

  socket.on('connect_error', (err) => {
    console.error('Verbindungsfehler:', err.message);
    statusDisplay.innerHTML = `⚠️ FEHLER: <br>${err.message}`;
    statusDisplay.style.background = '#FF9800';
  });

  // Test-Ereignis vom Server
  socket.on('serverReady', (data) => {
    console.log('Server bestätigt:', data.message);
    alert(`Erfolgreich verbunden mit:\n${data.message}`);
  });

  // ======================
  // 5. Spiel-Ereignisse
  // ======================
  socket.on('gameStart', ({ gameId, playerSide }) => {
    console.log(`Spiel gestartet (${gameId}) als ${playerSide}`);
    game.playerSide = playerSide;
    game.gameId = gameId;
  });

  socket.on('gameState', (state) => {
    game.leftPaddle.y = state.leftPaddleY;
    game.rightPaddle.y = state.rightPaddleY;
    game.ball.x = state.ballX;
    game.ball.y = state.ballY;
    game.score.left = state.leftScore;
    game.score.right = state.rightScore;
  });

  socket.on('playerListUpdate', (players) => {
    console.log('Aktive Spieler:', players);
    // Hier könnten Sie die Spielerliste im UI anzeigen
  });

  // ======================
  // 6. Steuerung
  // ======================
  canvas.addEventListener('mousemove', (e) => {
    if (!game.isConnected) return;
    
    const rect = canvas.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / canvas.height) * 100;
    
    socket.emit('playerMove', {
      gameId: game.gameId,
      y: y
    });
  });

  // ======================
  // 7. Render-Loop
  // ======================
  function draw() {
    // Hintergrund
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Mittellinie
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke();
    
    // Schläger
    ctx.fillStyle = '#FFF';
    ctx.fillRect(
      20, 
      (game.leftPaddle.y / 100) * canvas.height - game.leftPaddle.height/2, 
      game.leftPaddle.width, 
      game.leftPaddle.height
    );
    
    ctx.fillRect(
      canvas.width - 40, 
      (game.rightPaddle.y / 100) * canvas.height - game.rightPaddle.height/2, 
      game.rightPaddle.width, 
      game.rightPaddle.height
    );
    
    // Ball
    ctx.beginPath();
    ctx.arc(
      (game.ball.x / 100) * canvas.width,
      (game.ball.y / 100) * canvas.height,
      game.ball.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Score
    ctx.font = '48px Arial';
    ctx.fillText(game.score.left, canvas.width/4, 50);
    ctx.fillText(game.score.right, 3*canvas.width/4, 50);
    
    requestAnimationFrame(draw);
  }

  // ======================
  // 8. Initialisierung
  // ======================
  draw();

  // Ping-Pong für Verbindungsüberwachung
  setInterval(() => {
    if (game.isConnected) {
      socket.emit('ping', Date.now(), (timestamp) => {
        const latency = Date.now() - timestamp;
        console.log(`Latenz: ${latency}ms`);
      });
    }
  }, 25000);
});
