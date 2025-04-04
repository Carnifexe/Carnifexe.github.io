import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method === 'PUT') {
        const { stats } = req.body;

        // Hole den Bin ID und den Master Key aus den Umgebungsvariablen
        const binId = process.env.BIN_ID;
        const masterKey = process.env.MASTER_KEY;

        if (!binId || !masterKey) {
            return res.status(400).json({ error: 'Bin ID oder Master Key fehlen.' });
        }

        try {
            // Sende eine Anfrage an JSONBin, um die Statistik zu speichern
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': masterKey,
                },
                body: JSON.stringify(stats), // Die zu speichernden Statistiken
            });

            if (!response.ok) {
                throw new Error('Fehler beim Speichern der Statistik.');
            }

            const data = await response.json();
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
}
