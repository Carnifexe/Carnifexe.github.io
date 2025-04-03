document.addEventListener('DOMContentLoaded', () => {
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const playerList = document.getElementById('playerList');
  const connectionStatus = document.getElementById('connectionStatus');
  
  const gameState = {
    leftPaddle: { y: 50, width: 15, height: 100 },
    rightPaddle: { y: 50, width: 15, height: 100 },
    ball: { x: 50, y: 50, radius: 8 },
    scores: { left: 0, right: 0 },
    currentGame: null,
    playerSide: null,
    opponentName: '',
    lastUpdate: Date.now()
  };

  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket']
  });

  // Verbindungsstatus
  socket.on('connect', () => {
    connectionStatus.innerHTML = '🟢 ONLINE';
    connectionStatus.className = 'online';
    
    const playerName = `Spieler_${Math.floor(Math.random() * 1000)}`;
    socket.emit('join_queue', playerName);
    playerList.innerHTML = '<li class="empty">Suche nach Gegner...</li>';
  });

  socket.on('disconnect', () => {
    connectionStatus.innerHTML = '🔴 OFFLINE';
    connectionStatus.className = 'offline';
  });

  // Spielstart
  socket.on('game_start', (data) => {
    gameState.currentGame = data.gameId;
    gameState.playerSide = data.playerSide;
    gameState.opponentName = data.opponentName;
    
    playerList.innerHTML = `
      <li class="playing">
        ${data.opponentName}
        <span class="status">(Spielt gegen dich)</span>
      </li>
    `;
    
    gameCanvas.style.cursor = 'none';
    render();
  });

  // Spielupdate vom Gegner
  socket.on('game_update', (data) => {
    if (data.isOpponent) {
      if (gameState.playerSide === 'left') {
        gameState.rightPaddle.y = data.paddleY;
      } else {
        gameState.leftPaddle.y = data.paddleY;
      }
      
      if (data.ball) {
        gameState.ball = data.ball;
      }
      
      if (data.scores) {
        gameState.scores = data.scores;
      }
    }
  });

  // Spielende
  socket.on('game_ended', () => {
    gameState.currentGame = null;
    gameCanvas.style.cursor = 'default';
    playerList.innerHTML = '<li class="empty">Spiel beendet</li>';
  });

  // Paddle Bewegung
  gameCanvas.addEventListener('mousemove', (e) => {
    if (!gameState.currentGame) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / gameCanvas.height) * 100;
    
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

  // Render-Loop
  function render() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Mittellinie
    ctx.setLineDash([15, 15]);
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(gameCanvas.width/2, 0);
    ctx.lineTo(gameCanvas.width/2, gameCanvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Schläger
    ctx.fillStyle = '#FFF';
    ctx.fillRect(20, (gameState.leftPaddle.y/100)*gameCanvas.height-50, 15, 100);
    ctx.fillRect(gameCanvas.width-35, (gameState.rightPaddle.y/100)*gameCanvas.height-50, 15, 100);
    
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
});
