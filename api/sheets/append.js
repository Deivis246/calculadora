const { google } = require('googleapis');
const { getAuth } = require('./_auth');

module.exports = async function(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { spreadsheetId, patient } = req.body;
    if (!spreadsheetId || !patient) {
      return res.status(400).json({ error: 'Missing spreadsheetId or patient data' });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Extraer todos los valores de las propiedades del paciente de forma ordenada
    const rowData = Object.values(patient);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData],
      },
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in append sheet:', error);
    res.status(500).json({ error: error.message });
  }
};
