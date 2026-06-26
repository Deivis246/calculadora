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

    // Correo de destino configurable mediante variable de entorno, por defecto deiviscuentas50@gmail.com
    const targetEmail = process.env.GOOGLE_ADMIN_EMAIL || process.env.DESTINATION_EMAIL || 'deiviscuentas50@gmail.com';

    try {
      // Compartir con el correo y ENVIAR NOTIFICACIÓN POR CORREO con el documento
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: true,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: targetEmail
        }
      });
      console.log(`Documento creado y compartido exitosamente por correo a: ${targetEmail}`);
    } catch (permError) {
      console.error("Error al enviar por correo el documento, intentando acceso público:", permError);
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: 'writer',
            type: 'anyone'
          }
        });
      } catch (publicErr) {
        console.error("También falló el permiso público:", publicErr);
      }
    }

    res.status(200).json({ ok: true, spreadsheetId });
  } catch (error) {
    console.error('Error in create sheet:', error);
    res.status(500).json({ error: error.message });
  }
};
