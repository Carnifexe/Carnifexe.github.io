// Importiere die notwendigen Module
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Port für Glitch

// Serviere statische Dateien (HTML, CSS, JS) aus dem 'public' Ordner
app.use(express.static('public'));

// Route für die Startseite (optional, aber nützlich, wenn du eine Index-Seite haben möchtest)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/pong.html');
});

// Server starten
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
