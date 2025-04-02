document.addEventListener('DOMContentLoaded', () => {
  // 1. Verbindung mit Ihrer Render-URL
  const socket = io('wss://carnifexe-github-io.onrender.com', {
    transports: ['websocket'],
    reconnectionAttempts: 5
  });

  // 2. Verbindungsstatus-Anzeige
  const statusIndicator = document.createElement('div');
  statusIndicator.style.position = 'fixed';
  statusIndicator.style.bottom = '10px';
  statusIndicator.style.right = '10px';
  statusIndicator.style.padding = '10px';
  statusIndicator.style.borderRadius = '5px';
  document.body.appendChild(statusIndicator);

  // 3. Ereignis-Handler
  socket.on('connect', () => {
    console.log('✅ Verbunden mit Render');
    statusIndicator.textContent = 'Online';
    statusIndicator.style.background = '#4CAF50';
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Fehler:', err.message);
    statusIndicator.textContent = `Offline: ${err.message}`;
    statusIndicator.style.background = '#F44336';
  });

  socket.on('gameUpdate', (data) => {
    console.log('Spielupdate:', data);
    // Hier Ihre Spiel-Logik einfügen
  });

  // 4. Ping-Pong für Verbindungsüberwachung
  setInterval(() => {
    socket.emit('ping', Date.now(), (response) => {
      const latency = Date.now() - response;
      console.log(`Latenz: ${latency}ms`);
    });
  }, 25000);
});
