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

    // 1. Verificar si existe la pestaña "resumen" o "Resumen"
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    let resumenTab = meta.data.sheets.find(s => s.properties.title.toLowerCase() === 'resumen');

    let tabId;
    let isNewTab = false;

    if (!resumenTab) {
      // Crear la pestaña "resumen" automáticamente
      const addResp = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'resumen' }
            }
          }]
        }
      });
      tabId = addResp.data.replies[0].addSheet.properties.sheetId;
      isNewTab = true;
    } else {
      tabId = resumenTab.properties.sheetId;
    }

    // 2. Si la pestaña es nueva, insertamos los encabezados clínicos
    if (isNewTab) {
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
        range: 'resumen!A1',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [headers] }
      });

      // Dar formato azul oscuro con letras blancas en negrita al encabezado
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
    }

    // 3. Preparar la fila del paciente con fecha y hora
    const now = new Date();
    const fechaHoraFormateada = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false });

    const rowData = [fechaHoraFormateada, ...Object.values(resumen)];

    // 4. Insertar datos en la pestaña "resumen"
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'resumen!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [rowData] }
    });

    // 5. Limpiar fondo y dar formato de fecha a columna A en la pestaña resumen
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
    } catch (fmtErr) {
      console.error("Error aplicando formato en resumen:", fmtErr);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in append-resumen sheet:', error);
    res.status(500).json({ error: error.message });
  }
};
