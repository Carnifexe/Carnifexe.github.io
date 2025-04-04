// api/getData.js
export default async function handler(req, res) {
  // CORS für GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const BIN_ID = process.env.BIN_ID;
  const API_KEY = process.env.API_KEY;

  if (!BIN_ID || !API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { "X-Master-Key": API_KEY }
    });

    if (!response.ok) throw new Error('JSONBin.io error');
    const data = await response.json();
    res.status(200).json({ record: data.record || {} });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
