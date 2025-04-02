document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
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
    
    // Game state
    let socket;
    let currentGame = null;
    let playerSide = null;
    let paddleHeight = 100;
    let canvasHeight = 500;
    let canvasWidth = 800;
    
    // Connect to server
    connectToServer();
    
    function connectToServer() {
        socket = io();
        
        // Handle player list updates
        socket.on('playerListUpdate', (players) => {
            playerList.innerHTML = '';
            players.forEach(player => {
                const li = document.createElement('li');
                li.textContent = `${player.name} (${player.status === 'waiting' ? 'Wartend' : 'Spielt'})`;
                li.dataset.id = player.id;
                
                if (player.status === 'playing' || player.id === socket.id) {
                    li.classList.add('playing');
                } else {
                    li.addEventListener('click', () => invitePlayer(player.id));
                }
                
                playerList.appendChild(li);
            });
        });
        
        // Handle game invitations
        socket.on('invitation', (data) => {
            invitationText.textContent = `${data.fromName} möchte gegen dich spielen. Möchtest du annehmen?`;
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
        
        // Handle declined invitations
        socket.on('invitationDeclined', (data) => {
            notificationText.textContent = `${data.by} hat deine Einladung abgelehnt.`;
            notificationModal.classList.remove('hidden');
        });
        
        // Handle game start
        socket.on('gameStart', (data) => {
            currentGame = data.gameId;
            playerSide = data.playerSide;
            
            lobbyScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            
            // Set up paddle controls
            if (playerSide === 'left') {
                document.addEventListener('mousemove', moveLeftPaddle);
            } else {
                document.addEventListener('mousemove', moveRightPaddle);
            }
        });
        
        // Handle game state updates
        socket.on('gameState', (state) => {
            // Update paddles
            const leftPaddleY = (state.leftPaddleY / 100) * canvasHeight;
            const rightPaddleY = (state.rightPaddleY / 100) * canvasHeight;
            
            leftPaddle.style.top = `${leftPaddleY - paddleHeight/2}px`;
            rightPaddle.style.top = `${rightPaddleY - paddleHeight/2}px`;
            
            // Update ball
            const ballX = (state.ballX / 100) * canvasWidth;
            const ballY = (state.ballY / 100) * canvasHeight;
            
            ball.style.left = `${ballX - 10}px`;
            ball.style.top = `${ballY - 10}px`;
            
            // Update scores
            leftScore.textContent = state.leftScore;
            rightScore.textContent = state.rightScore;
        });
        
        // Handle game end
        socket.on('gameEnd', () => {
            if (currentGame) {
                socket.emit('gameOver', currentGame);
                currentGame = null;
            }
        });
        
        // Handle return to lobby
        socket.on('returnToLobby', () => {
            gameScreen.classList.add('hidden');
            lobbyScreen.classList.remove('hidden');
            
            // Remove paddle controls
            document.removeEventListener('mousemove', moveLeftPaddle);
            document.removeEventListener('mousemove', moveRightPaddle);
        });
        
        // Handle disconnect
        socket.on('disconnect', () => {
            notificationText.textContent = 'Verbindung zum Server verloren. Seite wird neu geladen...';
            notificationModal.classList.remove('hidden');
            closeNotificationBtn.onclick = () => location.reload();
        });
    }
    
    // Event listeners for modals
    closeNotificationBtn.addEventListener('click', () => {
        notificationModal.classList.add('hidden');
    });
    
    // Functions
    function invitePlayer(playerId) {
        socket.emit('invite', playerId);
    }
    
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