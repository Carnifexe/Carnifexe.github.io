export default async function handler(req, res) {
  // CORS-Header für GitHub Pages Zugriff
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight-Anfrage (OPTIONS) direkt beantworten
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Nur GET-Anfragen erlauben
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Umgebungsvariablen (in Vercel gesetzt)
  const BIN_ID = process.env.JSONBIN_BIN_ID; // Empfohlener Variablenname
  const API_KEY = process.env.JSONBIN_MASTER_KEY; // Konsistent mit saveStats.js

  if (!BIN_ID || !API_KEY) {
    console.error('Fehler: BIN_ID oder API_KEY nicht gesetzt!');
    return res.status(500).json({ 
      error: 'Server-Konfigurationsfehler' 
    });
  }

  try {
    // Daten von JSONBin.io abrufen
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        "X-Master-Key": API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API-Fehler: ${response.status}`);
    }

    const data = await response.json();
    
    // Antwort formatieren (kompatibel mit statistik.html)
    return res.status(200).json({
      record: data.record || { 
        day: {}, 
        week: {}, 
        month: {}, 
        year: {}, 
        allTime: {} 
      }
    });

  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
    return res.status(500).json({ 
      error: 'Fehler beim Abrufen der Daten',
      details: error.message 
    });
  }
}
