export default async function handler(req, res) {
  const BIN_ID = process.env.BIN_ID;
  const API_KEY = process.env.API_KEY;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Nur POST erlaubt' });
  }

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) throw new Error("Fehler beim Speichern");

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    res.status(500).json({ error: 'Fehler beim Speichern der Daten' });
  }
}
