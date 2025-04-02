document.addEventListener('DOMContentLoaded', () => {
  // ================
  // 1. Initialisierung
  // ================
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const playerList = document.getElementById('playerList');
  const leftScore = document.getElementById('leftScore');
  const rightScore = document.getElementById('rightScore');
  const connectionStatus = document.getElementById('connectionStatus');
  const invitationModal = document.getElementById('invitationModal');
  const invitationText = document.getElementById('invitationText');
  const acceptBtn = document.getElementById('acceptInvite');
  const declineBtn = document.getElementById('declineInvite');

  // ================
  // 2. Spielzustand
  // ================
  const gameState = {
    leftPaddle: { y: 50, width: 20, height: 100 },
    rightPaddle: { y: 50, width: 20, height: 100 },
    ball: { x: 50, y: 50, radius: 10 },
    scores: { left: 0, right: 0 },
    currentGame: null,
    playerSide: null,
    socketId: null
  };

  // ================
  // 3. WebSocket-Verbindung
  // ================
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    upgrade: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    timeout: 10000,
    withCredentials: false
  });

  // ================
  // 4. Verbindungsmanagement
  // ================
  function updateConnectionStatus(connected, message = '') {
    connectionStatus.textContent = connected ? '🟢 ONLINE' : `🔴 OFFLINE: ${message}`;
    connectionStatus.className = connected ? 'online' : 'offline';
  }

  socket.on('connect', () => {
    console.log('✅ Verbunden mit Socket-ID:', socket.id);
    gameState.socketId = socket.id;
    updateConnectionStatus(true);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Verbindungsfehler:', err.message);
    updateConnectionStatus(false, err.message);
    
    // Automatischer Neuversuch
    setTimeout(() => socket.connect(), 5000);
  });

  socket.on('disconnect', (reason) => {
    console.log('Verbindung getrennt:', reason);
    updateConnectionStatus(false, 'Verbindung verloren');
  });

  socket.on('welcome', (data) => {
    console.log('Server begrüßt:', data.message);
    connectionStatus.textContent = `🟢 ${data.message}`;
  });

  // ================
  // 5. Spielereignisse
  // ================
  socket.on('player_list', (players) => {
    playerList.innerHTML = players
      .filter(player => player.id !== socket.id) // Filtere den eigenen Spieler
      .map(player => `
        <li class="${player.status === 'playing' ? 'playing' : 'available'}" 
            data-id="${player.id}">
          ${player.name} 
          <span class="status">(${player.status === 'waiting' ? 'Wartend' : 'Spielt'})</span>
        </li>
      `).join('');

    // Klick-Listener für verfügbare Spieler
    document.querySelectorAll('#playerList li.available').forEach(li => {
      li.addEventListener('click', () => {
        if (!gameState.currentGame) {
          console.log('Lade Spieler ein:', li.dataset.id);
          socket.emit('invite', li.dataset.id);
          li.classList.add('pending');
          li.querySelector('.status').textContent = '(Einladung gesendet)';
        }
      });
    });
  });

  socket.on('invitation', (data) => {
    invitationText.textContent = `${data.fromName} möchte gegen dich spielen!`;
    invitationModal.style.display = 'flex';

    acceptBtn.onclick = () => {
      socket.emit('accept_invitation', {
        gameId: `${data.from}-${socket.id}`,
        players: [data.from, socket.id]
      });
      invitationModal.style.display = 'none';
    };

    declineBtn.onclick = () => {
      socket.emit('decline_invitation', data.from);
      invitationModal.style.display = 'none';
    };
  });

  socket.on('invitation_sent', (data) => {
    console.log(`Einladung an ${data.targetName} gesendet`);
    // Optional: Visuelles Feedback
    const statusEl = document.getElementById('connectionStatus');
    statusEl.textContent = `✉️ Einladung an ${data.targetName} gesendet`;
    statusEl.style.backgroundColor = '#FFA500';
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

  socket.on('game_end', () => {
    gameState.currentGame = null;
    console.log('Spiel beendet');
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
      socket.emit('ping', pingStart, (serverTime) => {
        const latency = Date.now() - pingStart;
        console.log('Latenz:', latency, 'ms');
      });
    }
  }, 25000);
});
