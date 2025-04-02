document.addEventListener('DOMContentLoaded', () => {
  // 1. Verbindung herstellen
  const isProduction = window.location.hostname.includes('render.com');
  const backendUrl = isProduction 
    ? 'wss://carnifexe-github-io.onrender.com' 
    : 'ws://localhost:10000';

  const socket = io(backendUrl, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    withCredentials: true
  });

  // 2. Verbindungsdiagnose
  socket.on('connect', () => {
    console.log('✅ Verbunden mit:', backendUrl);
    document.body.style.border = '5px solid green';
  });

  socket.on('disconnect', () => {
    console.log('❌ Verbindung getrennt');
    document.body.style.border = '5px solid orange';
  });

  socket.on('connect_error', (err) => {
    console.error('Verbindungsfehler:', err);
    document.body.style.border = '5px solid red';
    showError(`Server nicht erreichbar: ${err.message}`);
  });

  // 3. DOM-Elemente
  const elements = {
    lobby: document.getElementById('lobby'),
    game: document.getElementById('game'),
    players: document.getElementById('players'),
    leftScore: document.getElementById('leftScore'),
    rightScore: document.getElementById('rightScore'),
    leftPaddle: document.getElementById('leftPaddle'),
    rightPaddle: document.getElementById('rightPaddle'),
    ball: document.getElementById('ball'),
    invitationModal: document.getElementById('invitationModal'),
    invitationText: document.getElementById('invitationText'),
    acceptBtn: document.getElementById('acceptInvite'),
    declineBtn: document.getElementById('declineInvite'),
    notificationModal: document.getElementById('notificationModal'),
    notificationText: document.getElementById('notificationText'),
    closeNotification: document.getElementById('closeNotification')
  };

  // 4. Spielzustand
  const state = {
    currentGame: null,
    playerSide: null,
    canvasHeight: 500,
    canvasWidth: 800,
    paddleHeight: 100
  };

  // 5. Event-Handler
  socket.on('playerListUpdate', (players) => {
    elements.players.innerHTML = '';
    players.forEach(player => {
      const li = document.createElement('li');
      li.textContent = `${player.name} (${player.status === 'waiting' ? 'Wartend' : 'Spielt'})`;
      li.dataset.id = player.id;

      if (player.status === 'playing' || player.id === socket.id) {
        li.classList.add('playing');
      } else {
        li.addEventListener('click', () => socket.emit('invite', player.id));
      }
      elements.players.appendChild(li);
    });
  });

  socket.on('invitation', (data) => {
    elements.invitationText.textContent = `${data.fromName} möchte spielen. Annehmen?`;
    elements.invitationModal.classList.remove('hidden');
    
    elements.acceptBtn.onclick = () => {
      socket.emit('invitationResponse', { to: data.from, accepted: true });
      elements.invitationModal.classList.add('hidden');
    };
    
    elements.declineBtn.onclick = () => {
      socket.emit('invitationResponse', { to: data.from, accepted: false });
      elements.invitationModal.classList.add('hidden');
    };
  });

  socket.on('gameStart', (data) => {
    state.currentGame = data.gameId;
    state.playerSide = data.playerSide;
    
    elements.lobby.classList.add('hidden');
    elements.game.classList.remove('hidden');
    
    const moveHandler = state.playerSide === 'left' 
      ? moveLeftPaddle 
      : moveRightPaddle;
    document.addEventListener('mousemove', moveHandler);
  });

  socket.on('gameState', (gameState) => {
    // Schläger aktualisieren
    const leftY = (gameState.leftPaddleY / 100) * state.canvasHeight;
    const rightY = (gameState.rightPaddleY / 100) * state.canvasHeight;
    elements.leftPaddle.style.top = `${leftY - state.paddleHeight/2}px`;
    elements.rightPaddle.style.top = `${rightY - state.paddleHeight/2}px`;
    
    // Ball aktualisieren
    const ballX = (gameState.ballX / 100) * state.canvasWidth;
    const ballY = (gameState.ballY / 100) * state.canvasHeight;
    elements.ball.style.left = `${ballX - 10}px`;
    elements.ball.style.top = `${ballY - 10}px`;
    
    // Punkte aktualisieren
    elements.leftScore.textContent = gameState.leftScore;
    elements.rightScore.textContent = gameState.rightScore;
  });

  // 6. Steuerung
  function moveLeftPaddle(e) {
    const y = (e.clientY / window.innerHeight) * 100;
    socket.emit('paddleMove', { gameId: state.currentGame, y });
  }

  function moveRightPaddle(e) {
    const y = (e.clientY / window.innerHeight) * 100;
    socket.emit('paddleMove', { gameId: state.currentGame, y });
  }

  // 7. Hilfsfunktionen
  function showError(message) {
    elements.notificationText.textContent = message;
    elements.notificationModal.classList.remove('hidden');
  }

  elements.closeNotification.addEventListener('click', () => {
    elements.notificationModal.classList.add('hidden');
  });
});
