export default async function handler(req, res) {
    const BIN_ID = process.env.BIN_ID;
    const API_KEY = process.env.API_KEY;

    if (!BIN_ID || !API_KEY) {
        return res.status(500).json({ error: 'BIN_ID oder API_KEY nicht gesetzt!' });
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: {
                "X-Master-Key": API_KEY
            }
        });

        if (response.ok) {
            const data = await response.json();
            res.status(200).json(data);
        } else {
            res.status(response.status).json({ error: `Fehler beim Abrufen der Daten. Status: ${response.status}` });
        }
    } catch (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
}
