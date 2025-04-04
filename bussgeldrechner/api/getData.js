export default async function handler(req, res) {
    // Hole die Umgebungsvariablen
    const BIN_ID = process.env.BIN_ID;
    const API_KEY = process.env.API_KEY;

    try {
        // Hole die Daten von jsonbin.io
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: {
                "X-Master-Key": API_KEY
            }
        });

        // Wenn die Anfrage erfolgreich war, sende die Daten als Antwort zurück
        if (response.ok) {
            const data = await response.json();
            res.status(200).json(data);
        } else {
            res.status(response.status).json({ error: "Daten konnten nicht abgerufen werden" });
        }
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen der Daten" });
    }
}
