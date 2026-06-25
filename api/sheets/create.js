const { google } = require('googleapis');
const { getAuth } = require('./_auth');

module.exports = async function(req, res) {
  // Allow CORS for local testing if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'Calculadora Cardiometabólica - ' + new Date().toISOString().split('T')[0]
        }
      }
    });

    res.status(200).json({ ok: true, spreadsheetId: response.data.spreadsheetId });
  } catch (error) {
    console.error('Error in create sheet:', error);
    res.status(500).json({ error: error.message });
  }
};
