export default async function handler(req, res) {
  const BIN_ID = process.env.BIN_ID;
  const API_KEY = process.env.API_KEY;

  const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    headers: {
      'X-Master-Key': API_KEY
    }
  });

  const data = await response.json();
  res.status(200).json(data);
}
