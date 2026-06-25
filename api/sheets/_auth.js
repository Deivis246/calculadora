const { google } = require('googleapis');

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Replace escaped newlines if they come from env vars
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Las credenciales de Google Cloud no se encontraron en las variables de entorno de Vercel (GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY).');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
  });

  return auth;
}

module.exports = { getAuth };
