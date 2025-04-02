<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pong Multiplayer | carnifexe-github-io.onrender.com</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #222;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
      overflow: hidden;
    }
    h1 {
      margin-top: 20px;
    }
    #gameCanvas {
      background: #000;
      border: 2px solid #444;
      display: block;
      margin: 20px auto;
    }
  </style>
</head>
<body>
  <h1>Pong Multiplayer</h1>
  <canvas id="gameCanvas" width="800" height="500"></canvas>

  <!-- Socket.io & Game Script -->
  <script src="/socket.io/socket.io.js"></script>
  <script src="script.js"></script>
</body>
</html>
