document.addEventListener('DOMContentLoaded', () => {
  // ================
  // 1. DOM-Elemente
  // ================
  const statusDisplay = document.getElementById('connectionStatus');
  const playerList = document.getElementById('playerList');
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const leftScore = document.getElementById('leftScore');
  const rightScore = document.getElementById('rightScore');

  // ================
  // 2. Spielzustand
  // ================
  const gameState = {
    leftPaddle: { y: 50, width: 20, height: 100 },
    rightPaddle: { y: 50, width: 20, height: 100 },
    ball: { x: 50, y: 50, radius: 10 },
    scores: { left: 0, right: 0 },
    currentGame: null,
    playerSide: null
  };

  // ================
  // 3. WebSocket-Verbindung
  // ================
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],  // Erzwingt WebSocket
    reconnectionAttempts: 5,
    timeout: 10000,
    withCredentials: true,
    upgrade: false  // WICHTIG: Deaktiviert Polling-Fallback
  });

  // ================
  // 4. Verbindungsmanagement
  // ================
  function updateStatus(connected, message = '') {
    statusDisplay.textContent = connected ? '🟢 ONLINE' : `🔴 OFFLINE: ${message}`;
    statusDisplay.className = connected ? 'online' : 'offline';
  }

  socket.on('connect', () => {
    console.log('✅ Verbunden mit Server:', socket.id);
    updateStatus(true);
    
    // Handshake mit Server
    socket.emit('client_ready', {
      version: '1.0',
      renderUrl: 'carnifexe-github-io.onrender.com'
    });
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Verbindungsfehler:', err.message);
    updateStatus(false, err.message.includes('websocket') 
      ? 'WebSocket blockiert' 
      : 'Server nicht erreichbar'
    );
    
    // Automatischer Neuversuch
    setTimeout(() => socket.connect(), 3000);
  });

  socket.on('disconnect', (reason) => {
    console.log('Verbindung getrennt:', reason);
    updateStatus(false, 'Verbindung verloren');
  });

  // ================
  // 5. Server-Ereignisse
  // ================
  socket.on('server_ready', (data) => {
    console.log('Server bestätigt:', data.message);
    statusDisplay.textContent = `🟢 ${data.message}`;
  });

  socket.on('playerListUpdate', (players) => {
    playerList.innerHTML = players.map(player => `
      <li class="${player.status === 'playing' ? 'playing' : ''}" 
          data-id="${player.id}">
        ${player.name} 
        <span>(${player.status === 'waiting' ? 'Wartend' : 'Spielt'})</span>
      </li>
    `).join('');

    // Event-Listener für Spielerliste
    document.querySelectorAll('#playerList li:not(.playing)').forEach(li => {
      li.addEventListener('click', () => {
        socket.emit('invite_player', li.dataset.id);
      });
    });
  });

  socket.on('game_start', (data) => {
    gameState.currentGame = data.gameId;
    gameState.playerSide = data.playerSide;
    console.log(`Spiel gestartet als ${data.playerSide}`);
  });

  socket.on('game_update', (state) => {
    gameState.leftPaddle.y = state.leftPaddleY;
    gameState.rightPaddle.y = state.rightPaddleY;
    gameState.ball.x = state.ballX;
    gameState.ball.y = state.ballY;
    gameState.scores.left = state.leftScore;
    gameState.scores.right = state.rightScore;
    
    leftScore.textContent = gameState.scores.left;
    rightScore.textContent = gameState.scores.right;
  });

  // ================
  // 6. Spielsteuerung
  // ================
  gameCanvas.addEventListener('mousemove', (e) => {
    if (!gameState.currentGame) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / gameCanvas.height) * 100;
    
    socket.emit('move_paddle', {
      gameId: gameState.currentGame,
      y: y,
      side: gameState.playerSide
    });
  });

  // ================
  // 7. Render-Loop
  // ================
  function render() {
    // Hintergrund
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Mittellinie
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gameCanvas.width/2, 0);
    ctx.lineTo(gameCanvas.width/2, gameCanvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Schläger
    ctx.fillStyle = '#FFF';
    ctx.fillRect(
      20, 
      (gameState.leftPaddle.y / 100) * gameCanvas.height - gameState.leftPaddle.height/2, 
      gameState.leftPaddle.width, 
      gameState.leftPaddle.height
    );
    ctx.fillRect(
      gameCanvas.width - 40, 
      (gameState.rightPaddle.y / 100) * gameCanvas.height - gameState.rightPaddle.height/2, 
      gameState.rightPaddle.width, 
      gameState.rightPaddle.height
    );
    
    // Ball
    ctx.beginPath();
    ctx.arc(
      (gameState.ball.x / 100) * gameCanvas.width,
      (gameState.ball.y / 100) * gameCanvas.height,
      gameState.ball.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    requestAnimationFrame(render);
  }

  // ================
  // 8. Initialisierung
  // ================
  render();

  // Ping-Pong für Verbindungsüberwachung
  setInterval(() => {
    if (socket.connected) {
      const pingStart = Date.now();
      socket.emit('ping', pingStart, () => {
        const latency = Date.now() - pingStart;
        console.log('Ping:', latency, 'ms');
      });
    }
  }, 20000);
});
