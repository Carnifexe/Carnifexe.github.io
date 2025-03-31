// In der connection-Handler:
ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.type === "joinQueue") {
        queue.push(ws);
        broadcastQueueCount();
        
        // Wenn 2 Spieler in der Warteschlange sind
        if (queue.length >= 2) {
            const roomId = rooms.length + 1;
            const roomPlayers = queue.splice(0, 2);
            rooms.push({ 
                roomId, 
                players: roomPlayers,
                host: roomPlayers[0], // Erster Spieler ist Host
                gameStarted: false
            });
            
            // Spieler benachrichtigen
            roomPlayers[0].send(JSON.stringify({ 
                type: "gameStart", 
                playerNumber: 1,
                isHost: true
            }));
            roomPlayers[1].send(JSON.stringify({ 
                type: "gameStart", 
                playerNumber: 2,
                isHost: false
            }));
        }
    }
    
    // Nachrichten an Gegner weiterleiten
    if (["paddleMove", "ballUpdate", "scoreUpdate"].includes(data.type)) {
        const room = rooms.find(r => r.players.includes(ws));
        if (room) {
            room.players.forEach(player => {
                if (player !== ws && player.readyState === WebSocket.OPEN) {
                    player.send(message);
                }
            });
        }
    }
    
    if (data.type === "leaveQueue") {
        queue = queue.filter(player => player !== ws);
        broadcastQueueCount();
    }
});

// Hilfsfunktion für Warteschlangen-Updates
function broadcastQueueCount() {
    const count = queue.length;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
                type: "queueUpdate", 
                count 
            }));
        }
    });
}
