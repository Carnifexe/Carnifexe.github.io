export default async function handler(req, res) {
    if (req.method === 'PUT') {
        const stats = req.body;

        try {
            // Speichern der Statistik auf jsonbin.io
            const response = await fetch(`https://api.jsonbin.io/v3/b/${process.env.BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': process.env.API_KEY
                },
                body: JSON.stringify(stats)
            });

            if (response.ok) {
                res.status(200).json({ message: "Statistik erfolgreich gespeichert" });
            } else {
                res.status(response.status).json({ error: "Fehler beim Speichern der Statistik" });
            }
        } catch (error) {
            res.status(500).json({ error: "Fehler beim Speichern der Statistik" });
        }
    } else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
