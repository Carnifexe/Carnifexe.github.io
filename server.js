const WebSocket = require('ws');

// WebSocket Server Setup mit der externen Adresse
const wss = new WebSocket.Server({
    port: 8080,
    host: 'carnifexe-github-io.onrender.com'  // WebSocket-Serveradresse
});

let players = [];  // Liste der verbundenen Spieler
let gameInProgress = false;  // Status, ob das Spiel läuft oder nicht

// Wenn ein Client sich verbindet
wss.on('connection', (ws) => {
    console.log('Ein neuer Spieler hat sich verbunden');
    
    // Füge den neuen Spieler zur Liste hinzu
    players.push(ws);

    // Sende die aktuelle Liste der Spieler an alle verbundenen Clients
    sendPlayerList();

    // Wenn der Spieler eine Herausforderung annehmen möchte
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'challenge':
                // Spieler herausfordern
                handleChallenge(ws, data.player);
                break;
            case 'scoreUpdate':
                // Die Punktzahl aktualisieren
                updateScore(data.player1, data.player2);
                break;
            case 'gameStart':
                // Das Spiel starten
                startGame();
                break;
            default:
                console.log('Unbekannter Nachrichtentyp:', data);
        }
    });

    // Wenn der Spieler die Verbindung schließt
    ws.on('close', () => {
        console.log('Ein Spieler hat die Verbindung getrennt');
        players = players.filter(player => player !== ws);
        sendPlayerList();
    });
});

// Funktion um die Liste der Spieler an alle zu senden
function sendPlayerList() {
    const playerNames = players.map(player => player.id || `Spieler ${players.indexOf(player) + 1}`);
    const message = JSON.stringify({ type: 'updatePlayers', players: playerNames });

    players.forEach(player => player.send(message));
}

// Funktion, um eine Herausforderung zu senden
function handleChallenge(ws, playerName) {
    // Wenn ein Spiel bereits läuft, nicht herausfordern
    if (gameInProgress) {
        ws.send(JSON.stringify({ type: 'error', message: 'Ein Spiel läuft bereits!' }));
        return;
    }

    // Den Herausgeforderten finden
    const opponent = players.find(player => player.id === playerName);

    if (opponent) {
        // Frage den Gegner, ob er die Herausforderung annimmt
        opponent.send(JSON.stringify({
            type: 'challenge',
            player: ws.id
        }));

        // Warte auf Antwort
        ws.send(JSON.stringify({
            type: 'waiting',
            message: `Warte auf Antwort von ${playerName}...`
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: `Spieler ${playerName} existiert nicht!`
        }));
    }
}

// Funktion um das Spiel zu starten
function startGame() {
    if (gameInProgress) return;

    gameInProgress = true;
    console.log('Das Spiel hat begonnen!');

    // Sende an alle Spieler, dass das Spiel gestartet ist
    players.forEach(player => {
        player.send(JSON.stringify({ type: 'gameStart', playerNumber: players.indexOf(player) }));
    });
}

// Funktion, um die Punktzahl zu aktualisieren
function updateScore(player1, player2) {
    players.forEach(player => {
        player.send(JSON.stringify({ type: 'scoreUpdate', player1, player2 }));
    });
}

// Error Handling
wss.on('error', (err) => {
    console.error('WebSocket-Fehler:', err);
});

// Server läuft
console.log('WebSocket-Server läuft auf wss://carnifexe-github-io.onrender.com');
