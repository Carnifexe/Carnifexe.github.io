document.addEventListener('DOMContentLoaded', () => {
  // 1. Canvas-Elemente
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const statusDiv = document.createElement('div');
  statusDiv.style.position = 'fixed';
  statusDiv.style.bottom = '10px';
  statusDiv.style.right = '10px';
  statusDiv.style.padding = '10px';
  statusDiv.style.background = '#333';
  statusDiv.style.borderRadius = '5px';
  document.body.appendChild(statusDiv);

  // 2. Verbindung herstellen
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    reconnectionAttempts: 5
  });

  // 3. Spielzustand
  const gameState = {
    leftPaddleY: 50,
    rightPaddleY: 50,
    ball: { x: 50, y: 50 }
  };

  // 4. Verbindungs-Handler
  socket.on('connect', () => {
    console.log('✅ Verbunden mit Server');
    statusDiv.textContent = 'Online';
    statusDiv.style.color = '#4CAF50';
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Fehler:', err.message);
    statusDiv.textContent = 'Offline: ' + err.message;
    statusDiv.style.color = '#F44336';
  });

  socket.on('paddleMoved', (data) => {
    if (data.playerId === socket.id) {
      gameState.leftPaddleY = data.y;
    } else {
      gameState.rightPaddleY = data.y;
    }
  });

  // 5. Maussteuerung
  canvas.addEventListener('mousemove', (e) => {
    const y = (e.clientY / canvas.height) * 100;
    socket.emit('movePaddle', y);
  });

  // 6. Spiel-Loop
  function gameLoop() {
    // Spielfeld zeichnen
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Schläger zeichnen
    ctx.fillStyle = '#FFF';
    ctx.fillRect(20, (gameState.leftPaddleY / 100) * canvas.height - 50, 20, 100);
    ctx.fillRect(760, (gameState.rightPaddleY / 100) * canvas.height - 50, 20, 100);
    
    // Ball zeichnen
    ctx.beginPath();
    ctx.arc(
      (gameState.ball.x / 100) * canvas.width,
      (gameState.ball.y / 100) * canvas.height,
      10, 0, Math.PI * 2
    );
    ctx.fill();
    
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
});
