const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);

// Render-spezifische CORS-Konfiguration
const io = new Server(server, {
  cors: {
    origin: [
      'https://carnifexe-github-io.onrender.com',
      'http://localhost:10000'
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(express.static(path.join(__dirname, '../client')));

// Health Check Endpoint für Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Socket.io Logik (wie zuvor)
io.on('connection', (socket) => {
  console.log('Neue Verbindung:', socket.id);
  // ... Ihr bestehender connection-Handler
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
