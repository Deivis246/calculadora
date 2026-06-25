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

    // Eliminamos la lógica de usar un solo ID maestro porque el usuario
    // desea que se cree uno nuevo cada vez.

    const response = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'Calculadora Cardiometabólica - ' + new Date().toISOString().split('T')[0]
        }
      }
    });

    const spreadsheetId = response.data.spreadsheetId;
    const drive = google.drive({ version: 'v3', auth });

    try {
      if (process.env.GOOGLE_ADMIN_EMAIL) {
        // Compartir explícitamente con el correo del usuario
        await drive.permissions.create({
          fileId: spreadsheetId,
          sendNotificationEmail: false,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: process.env.GOOGLE_ADMIN_EMAIL
          }
        });
      } else {
        // Intentar hacerlo público (suele fallar en organizaciones estrictas)
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: 'writer',
            type: 'anyone'
          }
        });
      }
    } catch (permError) {
      console.error("Error al compartir el archivo, pero se creó exitosamente:", permError);
      // No lanzamos error 500 para que la app no se rompa, 
      // pero el usuario podría tener "Acceso Denegado" al abrir el link.
    }

    res.status(200).json({ ok: true, spreadsheetId });
  } catch (error) {
    console.error('Error in create sheet:', error);
    res.status(500).json({ error: error.message });
  }
};
