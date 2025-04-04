export default async function handler(req, res) {
  const BIN_ID = process.env.BIN_ID;
  const API_KEY = process.env.API_KEY;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error("Fehler beim Laden");

    const json = await response.json();
    res.status(200).json(json);
  } catch (error) {
    console.error("Serverfehler:", error);
    res.status(500).json({ error: 'Fehler beim Laden der Daten' });
  }
}
