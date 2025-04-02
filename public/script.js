document.addEventListener('DOMContentLoaded', () => {
    // 1. Socket.io-Verbindung herstellen
    const socket = io('https://carnifexe-github-io.onrender.com', {
        transports: ['websocket'],
        secure: true,
        withCredentials: true
    });

    // Debugging
    socket.on('connect', () => {
        console.log('✅ Verbunden mit Server. Socket-ID:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('❌ Verbindung getrennt');
    });

    socket.on('connect_error', (err) => {
        console.error('Verbindungsfehler:', err.message);
        alert('Server nicht erreichbar. Bitte später erneut versuchen.');
    });

    // 2. DOM-Elemente
    const lobbyScreen = document.getElementById('lobby');
    const gameScreen = document.getElementById('game');
    const playerList = document.getElementById('players');
    const leftScore = document.getElementById('leftScore');
    const rightScore = document.getElementById('rightScore');
    const leftPaddle = document.getElementById('leftPaddle');
    const rightPaddle = document.getElementById('rightPaddle');
    const ball = document.getElementById('ball');
    const invitationModal = document.getElementById('invitationModal');
    const invitationText = document.getElementById('invitationText');
    const acceptInviteBtn = document.getElementById('acceptInvite');
    const declineInviteBtn = document.getElementById('declineInvite');
    const notificationModal = document.getElementById('notificationModal');
    const notificationText = document.getElementById('notificationText');
    const closeNotificationBtn = document.getElementById('closeNotification');

    // 3. Spielzustand
    let currentGame = null;
    let playerSide = null;
    const paddleHeight = 100;
    const canvasHeight = 500;
    const canvasWidth = 800;

    // 4. Event-Listener für Spielerliste
    socket.on('playerListUpdate', (players) => {
        console.log('Aktualisierte Spielerliste:', players);
        playerList.innerHTML = '';

        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name} (${player.status === 'waiting' ? 'Wartend' : 'Spielt'})`;
            li.dataset.id = player.id;

            if (player.status === 'playing' || player.id === socket.id) {
                li.classList.add('playing');
            } else {
                li.addEventListener('click', () => {
                    console.log('Spieler herausfordern:', player.id);
                    socket.emit('invite', player.id);
                });
            }

            playerList.appendChild(li);
        });
    });

    // 5. Einladungs-Handling
    socket.on('invitation', (data) => {
        console.log('Einladung erhalten von:', data.fromName);
        invitationText.textContent = `${data.fromName} möchte gegen dich spielen. Annehmen?`;
        invitationModal.classList.remove('hidden');

        acceptInviteBtn.onclick = () => {
            socket.emit('invitationResponse', { to: data.from, accepted: true });
            invitationModal.classList.add('hidden');
        };

        declineInviteBtn.onclick = () => {
            socket.emit('invitationResponse', { to: data.from, accepted: false });
            invitationModal.classList.add('hidden');
        };
    });

    socket.on('invitationDeclined', (data) => {
        notificationText.textContent = `${data.by} hat deine Einladung abgelehnt.`;
        notificationModal.classList.remove('hidden');
    });

    // 6. Spielstart
    socket.on('gameStart', (data) => {
        console.log('Spiel startet:', data);
        currentGame = data.gameId;
        playerSide = data.playerSide;

        lobbyScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        // Schlägersteuerung aktivieren
        if (playerSide === 'left') {
            document.addEventListener('mousemove', moveLeftPaddle);
        } else {
            document.addEventListener('mousemove', moveRightPaddle);
        }
    });

    // 7. Spielzustand-Updates
    socket.on('gameState', (state) => {
        // Schlägerpositionen
        const leftPaddleY = (state.leftPaddleY / 100) * canvasHeight;
        const rightPaddleY = (state.rightPaddleY / 100) * canvasHeight;
        
        leftPaddle.style.top = `${leftPaddleY - paddleHeight/2}px`;
        rightPaddle.style.top = `${rightPaddleY - paddleHeight/2}px`;

        // Ballposition
        const ballX = (state.ballX / 100) * canvasWidth;
        const ballY = (state.ballY / 100) * canvasHeight;
        
        ball.style.left = `${ballX - 10}px`;
        ball.style.top = `${ballY - 10}px`;

        // Punkte
        leftScore.textContent = state.leftScore;
        rightScore.textContent = state.rightScore;
    });

    // 8. Spielende
    socket.on('gameEnd', () => {
        if (currentGame) {
            socket.emit('gameOver', currentGame);
            currentGame = null;
        }
    });

    socket.on('returnToLobby', () => {
        gameScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
        document.removeEventListener('mousemove', moveLeftPaddle);
        document.removeEventListener('mousemove', moveRightPaddle);
    });

    // 9. UI-Event-Listener
    closeNotificationBtn.addEventListener('click', () => {
        notificationModal.classList.add('hidden');
    });

    // 10. Steuerungsfunktionen
    function moveLeftPaddle(e) {
        const rect = gameScreen.getBoundingClientRect();
        const y = ((e.clientY - rect.top) / canvasHeight) * 100;
        socket.emit('paddleMove', { gameId: currentGame, y });
    }

    function moveRightPaddle(e) {
        const rect = gameScreen.getBoundingClientRect();
        const y = ((e.clientY - rect.top) / canvasHeight) * 100;
        socket.emit('paddleMove', { gameId: currentGame, y });
    }
});
