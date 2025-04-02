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
  const gameInfo = document.getElementById('gameInfo');

  // ================
  // 2. Spielzustand
  // ================
  const gameState = {
    leftPaddle: { y: 50, width: 15, height: 100 },
    rightPaddle: { y: 50, width: 15, height: 100 },
    ball: { x: 50, y: 50, radius: 8 },
    scores: { left: 0, right: 0 },
    currentGame: null,
    playerSide: null,
    playerId: null,
    socketId: null,
    lastUpdate: 0,
    ping: 0
  };

  // ================
  // 3. WebSocket-Verbindung
  // ================
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    upgrade: false,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000,
    withCredentials: false
  });

  // ================
  // 4. Verbindungsmanagement
  // ================
  let connectionTimeout;
  let reconnectAttempts = 0;

  function updateConnectionStatus(connected, message = '') {
    const statusEl = document.getElementById('connectionStatus');
    
    if (connected) {
      statusEl.innerHTML = '🟢 ONLINE';
      statusEl.className = 'online';
      statusEl.title = `Latenz: ${gameState.ping}ms`;
      reconnectAttempts = 0;
    } else {
      statusEl.innerHTML = `🔴 OFFLINE: ${message}`;
      statusEl.className = 'offline';
      
      if (message.includes('Verbindung verloren')) {
        scheduleReconnect();
      }
    }
  }

  function scheduleReconnect() {
    if (!connectionTimeout && reconnectAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
      connectionTimeout = setTimeout(() => {
        socket.connect();
        reconnectAttempts++;
        connectionTimeout = null;
      }, delay);
    }
  }

  socket.on('connect', () => {
    console.log('✅ Verbunden mit Socket-ID:', socket.id);
    gameState.socketId = socket.id;
    updateConnectionStatus(true);
    updateEmptyPlayerList();
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Verbindungsfehler:', err.message);
    updateConnectionStatus(false, err.message || 'Verbindungsfehler');
  });

  socket.on('disconnect', (reason) => {
    console.log('Verbindung getrennt:', reason);
    updateConnectionStatus(false, 'Verbindung verloren');
    
    if (reason === 'io server disconnect') {
      // Server-seitige Trennung, neu verbinden
      socket.connect();
    }
  });

  socket.on('welcome', (data) => {
    console.log('Server begrüßt:', data.message);
    gameState.playerId = data.id;
    updateConnectionStatus(true, `${data.message} (${data.playerCount} Spieler online)`);
  });

  // ================
  // 5. Spielerliste & Einladungen
  // ================
  function updateEmptyPlayerList() {
    playerList.innerHTML = '<li class="empty">Suche nach Spielern...</li>';
    gameInfo.textContent = 'Verbinde mit Server...';
  }

  function renderPlayerList(players) {
    const availablePlayers = players.filter(p => 
      p.id !== gameState.playerId && p.status === 'waiting'
    );

    if (availablePlayers.length === 0) {
      playerList.innerHTML = '<li class="empty">Keine Spieler verfügbar</li>';
      gameInfo.textContent = 'Warte auf Gegner...';
    } else {
      playerList.innerHTML = availablePlayers.map(player => `
        <li class="available" data-id="${player.id}">
          ${player.name}
          <span class="status">(Wartend)</span>
        </li>
      `).join('');

      // Event Listener für Spielereinladungen
      document.querySelectorAll('#playerList li.available').forEach(li => {
        li.addEventListener('click', () => {
          if (!gameState.currentGame) {
            const playerId = li.dataset.id;
            console.log('Lade Spieler ein:', playerId);
            
            socket.emit('invite', playerId);
            li.classList.add('pending');
            li.querySelector('.status').textContent = '(Einladung gesendet)';
            
            gameInfo.textContent = 'Einladung gesendet...';
          }
        });
      });
    }
  }

  socket.on('player_list', (players) => {
    if (players.length <= 1) {
      updateEmptyPlayerList();
    } else {
      renderPlayerList(players);
    }
  });

  socket.on('invitation', (data) => {
    invitationText.textContent = `${data.fromName} möchte gegen dich spielen!`;
    invitationModal.style.display = 'flex';
    gameInfo.textContent = 'Einladung erhalten!';

    acceptBtn.onclick = () => {
      const gameId = data.gameId || `${data.from}-${gameState.playerId}`;
      socket.emit('accept_invitation', {
        gameId,
        players: [data.from, gameState.playerId]
      });
      invitationModal.style.display = 'none';
      gameInfo.textContent = 'Spiel startet...';
    };

    declineBtn.onclick = () => {
      socket.emit('decline_invitation', data.from);
      invitationModal.style.display = 'none';
      gameInfo.textContent = 'Einladung abgelehnt';
    };
  });

  socket.on('invitation_sent', (data) => {
    console.log(`Einladung an ${data.targetName} gesendet`);
    gameInfo.textContent = `Einladung an ${data.targetName} gesendet`;
    
    // Visuelles Feedback
    connectionStatus.textContent = `✉️ Einladung gesendet`;
    connectionStatus.style.backgroundColor = '#FFA500';
    setTimeout(() => updateConnectionStatus(true), 3000);
  });

  // ================
  // 6. Spielereignisse
  // ================
  socket.on('game_start', (data) => {
    gameState.currentGame = data.gameId;
    gameState.playerSide = data.playerSide;
    console.log(`🎮 Spiel gestartet als ${data.playerSide}`);
    gameInfo.textContent = `Spiel läuft (vs ${data.opponent})`;
    
    // Canvas für Spiel vorbereiten
    gameCanvas.style.cursor = 'none';
  });

  socket.on('game_update', (state) => {
    gameState.lastUpdate = Date.now();
    
    // Interpolation für flüssigere Bewegungen
    const interpolationFactor = 0.2;
    gameState.leftPaddle.y += (state.leftPaddleY - gameState.leftPaddle.y) * interpolationFactor;
    gameState.rightPaddle.y += (state.rightPaddleY - gameState.rightPaddle.y) * interpolationFactor;
    gameState.ball.x = state.ballX;
    gameState.ball.y = state.ballY;
    
    // Scores aktualisieren
    if (gameState.scores.left !== state.leftScore || gameState.scores.right !== state.rightScore) {
      animateScoreChange(state.leftScore, state.rightScore);
    }
    gameState.scores.left = state.leftScore;
    gameState.scores.right = state.rightScore;
  });

  function animateScoreChange(left, right) {
    leftScore.textContent = left;
    rightScore.textContent = right;
    
    // Animationseffekt
    leftScore.style.transform = 'scale(1.5)';
    rightScore.style.transform = 'scale(1.5)';
    setTimeout(() => {
      leftScore.style.transform = 'scale(1)';
      rightScore.style.transform = 'scale(1)';
    }, 300);
  }

  socket.on('game_ended', (data) => {
    console.log('Spiel beendet:', data.reason);
    gameCanvas.style.cursor = 'default';
    
    if (data.reason === 'opponent_disconnected') {
      gameInfo.textContent = 'Gegner hat das Spiel verlassen!';
    } else {
      gameInfo.textContent = 'Spiel beendet';
    }
    
    // Reset game state
    gameState.currentGame = null;
    gameState.playerSide = null;
    gameState.ball.x = 50;
    gameState.ball.y = 50;
  });

  // ================
  // 7. Spielsteuerung
  // ================
  gameCanvas.addEventListener('mousemove', (e) => {
    if (!gameState.currentGame || !gameState.playerSide) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / gameCanvas.height) * 100;
    
    socket.emit('move_paddle', {
      gameId: gameState.currentGame,
      y: y,
      side: gameState.playerSide
    });
  });

  // Touch-Support für Mobile
  gameCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameState.currentGame || !gameState.playerSide) return;
    
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    const y = ((touch.clientY - rect.top) / gameCanvas.height) * 100;
    
    socket.emit('move_paddle', {
      gameId: gameState.currentGame,
      y: y,
      side: gameState.playerSide
    });
  });

  // ================
  // 8. Render-Loop
  // ================
  function render() {
    // Hintergrund
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Mittellinie (gestrichelt)
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
      (gameState.leftPaddle.y / 100) * gameCanvas.height - gameState.leftPaddle.height/2, 
      gameState.leftPaddle.width, 
      gameState.leftPaddle.height
    );
    // Rechter Schläger
    ctx.fillRect(
      gameCanvas.width - 20 - gameState.rightPaddle.width, 
      (gameState.rightPaddle.y / 100) * gameCanvas.height - gameState.rightPaddle.height/2, 
      gameState.rightPaddle.width, 
      gameState.rightPaddle.height
    );
    
    // Ball mit Glow-Effekt
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFF';
    ctx.beginPath();
    ctx.arc(
      (gameState.ball.x / 100) * gameCanvas.width,
      (gameState.ball.y / 100) * gameCanvas.height,
      gameState.ball.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    
    requestAnimationFrame(render);
  }

  // ================
  // 9. Ping & Verbindungsüberwachung
  // ================
  setInterval(() => {
    if (socket.connected) {
      const pingStart = Date.now();
      socket.emit('ping', pingStart, (serverTime) => {
        gameState.ping = Date.now() - pingStart;
        connectionStatus.title = `Latenz: ${gameState.ping}ms`;
      });
    }
  }, 10000);

  // ================
  // 10. Initialisierung
  // ================
  render();
  updateEmptyPlayerList();

  // Automatischer Reconnect bei Tab-Wechsel
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) {
      socket.connect();
    }
  });
});
