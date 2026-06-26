const { google } = require('googleapis');
const { getAuth } = require('./_auth');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { resumen } = req.body;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || req.body.spreadsheetId;

    if (!spreadsheetId || !resumen) {
      return res.status(400).json({ error: 'Missing spreadsheetId or resumen data' });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Obtener pestañas del documento
    let meta;
    try {
      meta = await sheets.spreadsheets.get({ spreadsheetId });
    } catch (errGet) {
      return res.status(500).json({ error: 'No se pudo acceder al Google Sheet: ' + errGet.message });
    }

    const resumenTab = meta.data.sheets.find(s => s.properties.title.toLowerCase() === 'resumen');
    if (!resumenTab) {
      return res.status(400).json({ error: 'No existe la pestaña "resumen". Por favor presiona el botón + abajo en tu Excel y llámala "resumen".' });
    }

    const tabId = resumenTab.properties.sheetId;
    const tabTitle = resumenTab.properties.title; // Respeta mayúsculas si el usuario puso "Resumen"

    // 2. Verificar si la pestaña está vacía leyendo la celda A1
    const checkEmpty = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabTitle}!A1:B1`
    });

    const isEmpty = !checkEmpty.data.values || checkEmpty.data.values.length === 0;

    if (isEmpty) {
      const headers = [
        "Fecha/Hora", "Nombre", "Edad", "Sexo", "IMC (kg/m²)", "Cat. IMC",
        "TFGe (mL/min)", "Estado Renal", "FINDRISC (pts)", "Riesgo FINDRISC",
        "PREVENT CVD 10a (%)", "Riesgo PREVENT", "IPAQ (MET-min/sem)", "Actividad IPAQ",
        "Estado HTA", "PA Actual", "Estado DM", "HbA1c Actual",
        "Estado Dislipidemia", "LDL Actual", "Estado Obesidad",
        "Antihipertensivos", "Antidiabéticos", "Estatinas"
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabTitle}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [headers] }
      });

      // Dar formato azul marino elegante con letras blancas en negrita al encabezado
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              repeatCell: {
                range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.08, green: 0.15, blue: 0.36 },
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                  }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)"
              }
            }]
          }
        });
      } catch (e) {}
    }

    // 3. Preparar la fila de datos del resumen ejecutivo
    const now = new Date();
    const fechaHoraFormateada = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false });

    const rowData = [fechaHoraFormateada, ...Object.values(resumen)];

    // 4. Insertar fila en la pestaña resumen
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabTitle}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [rowData] }
    });

    // 5. Limpiar fondo y dar formato de Fecha/Hora a la columna A
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId: tabId, startRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 1, green: 1, blue: 1 },
                    textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, bold: false }
                  }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)"
              }
            },
            {
              repeatCell: {
                range: { sheetId: tabId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    numberFormat: { type: 'DATE_TIME', pattern: 'dd/MM/yyyy HH:mm:ss' }
                  }
                },
                fields: "userEnteredFormat.numberFormat"
              }
            }
          ]
        }
      });
    } catch (e) {}

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in append-resumen sheet:', error);
    res.status(500).json({ error: error.message });
  }
};
