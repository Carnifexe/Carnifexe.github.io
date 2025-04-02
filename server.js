const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = []; // Eine Liste, um alle verbundenen Spieler zu speichern

wss.on('connection', (ws) => {
    console.log('Ein neuer Spieler hat sich verbunden.');

    // Bei Empfang einer Nachricht vom Client
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'challenge') {
            // Eine Herausforderung wurde gesendet
            const { player } = data;
            const playerName = getPlayerName(ws);
            console.log(`${playerName} hat eine Herausforderung an ${player} gesendet.`);
            handleChallenge(player, playerName);
        } else if (data.type === 'scoreUpdate') {
            // Punkte nach einem Tor aktualisieren
            const { player1, player2 } = data;
            console.log(`Punkte Update - Player1: ${player1}, Player2: ${player2}`);
            // Hier könnte man den Score in einer Datenbank speichern, wenn nötig
        } else if (data.type === 'gameStart') {
            // Wenn das Spiel startet
            console.log('Spiel gestartet!');
            broadcastGameStart();
        }
    });

    // Bei einer neuen Verbindung Spieler hinzufügen
    ws.on('open', () => {
        const playerName = 'Spieler_' + (players.length + 1); // Einfache Namensvergabe
        players.push({ name: playerName, socket: ws });
        console.log(`${playerName} wurde dem Spiel beigetreten.`);
        sendPlayerList();
    });

    // Wenn ein Spieler sich trennt, entfernen wir ihn aus der Liste
    ws.on('close', () => {
        const playerIndex = players.findIndex(player => player.socket === ws);
        if (playerIndex !== -1) {
            const playerName = players[playerIndex].name;
            players.splice(playerIndex, 1);
            console.log(`${playerName} hat das Spiel verlassen.`);
            sendPlayerList();
        }
    });

    // Sendet die Spielerliste an alle Clients
    function sendPlayerList() {
        const playerNames = players.map(player => player.name);
        broadcast({
            type: 'updatePlayers',
            players: playerNames
        });
    }

    // Sendet eine Nachricht an alle verbundenen Clients
    function broadcast(message) {
        players.forEach(player => {
            player.socket.send(JSON.stringify(message));
        });
    }

    // Startet das Spiel, wenn eine Herausforderung angenommen wird
    function handleChallenge(challenger, challenged) {
        const challengerSocket = players.find(player => player.name === challenger)?.socket;
        const challengedSocket = players.find(player => player.name === challenged)?.socket;

        if (challengerSocket && challengedSocket) {
            // Sende eine Nachricht an beide Spieler, dass das Spiel gestartet wird
            challengerSocket.send(JSON.stringify({ type: 'gameStart', playerNumber: 1 }));
            challengedSocket.send(JSON.stringify({ type: 'gameStart', playerNumber: 2 }));
            console.log(`Spiel zwischen ${challenger} und ${challenged} wird gestartet.`);
        }
    }

    // Broadcast eine Nachricht an alle Spieler, dass das Spiel gestartet wird
    function broadcastGameStart() {
        broadcast({
            type: 'gameStart'
        });
    }

    // Hilfsfunktion, um den Spielernamen aus einer Verbindung zu extrahieren
    function getPlayerName(socket) {
        const player = players.find(player => player.socket === socket);
        return player ? player.name : 'Unbekannt';
    }
});

console.log('WebSocket-Server läuft auf ws://localhost:8080');
