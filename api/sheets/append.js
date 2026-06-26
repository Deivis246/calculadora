const { google } = require('googleapis');
const { getAuth } = require('./_auth');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { patient } = req.body;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || req.body.spreadsheetId;

    if (!spreadsheetId || !patient) {
      return res.status(400).json({ error: 'Missing spreadsheetId or patient data' });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Calcular IMC si tenemos peso y talla
    let imcCalc = "";
    if (patient.peso && patient.talla) {
      const tallaMetros = patient.talla / 100;
      imcCalc = +(patient.peso / (tallaMetros * tallaMetros)).toFixed(1);
    }

    // Mapeo estructurado exacto a las 28 columnas de Replit
    const rowData = [
      new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }), // 1. Fecha/Hora
      patient.nombre || "Anónimo",                                      // 2. Nombre
      patient.edad ?? "",                                               // 3. Edad
      patient.sexo ?? "",                                               // 4. Sexo
      patient.peso ?? "",                                               // 5. Peso (kg)
      patient.talla ?? "",                                              // 6. Talla (cm)
      imcCalc,                                                          // 7. IMC
      patient.cintura ?? "",                                            // 8. Cintura (cm)
      patient.sbp ?? "",                                                // 9. PA Sistólica
      patient.dbp ?? "",                                                // 10. PA Diastólica
      patient.fc ?? "",                                                 // 11. FC (lpm)
      patient.glucosa ?? "",                                            // 12. Glucosa (mg/dL)
      patient.hba1c ?? "",                                              // 13. HbA1c (%)
      patient.creatinina ?? "",                                         // 14. Creatinina (mg/dL)
      patient.colesterolTotal ?? "",                                    // 15. Col. Total (mg/dL)
      patient.hdl ?? "",                                                // 16. HDL (mg/dL)
      patient.ldl ?? "",                                                // 17. LDL (mg/dL)
      patient.trigliceridos ?? "",                                      // 18. Triglicéridos (mg/dL)
      patient.esDiabetico ? "Sí" : "No",                                // 19. Es Diabético
      patient.esHipertenso ? "Sí" : "No",                               // 20. Es Hipertenso
      patient.tieneDislipidemia ? "Sí" : "No",                          // 21. Dislipidemia
      patient.fumador ? "Sí" : "No",                                    // 22. Fumador
      patient.usaInsulina ? "Sí" : "No",                                // 23. Usa Insulina
      patient.usaAntidiabeticosOrales ? "Sí" : "No",                    // 24. Usa Antidiabéticos
      patient.usaAntihipertensivos ? "Sí" : "No",                       // 25. Usa Antihipertensivos
      patient.nombreInsulina ?? "",                                     // 26. Insulina (nombre)
      patient.nombreAntidiabeticosOrales ?? "",                         // 27. Antidiabéticos (nombre)
      patient.nombreAntihipertensivos ?? ""                             // 28. Antihipertensivos (nombre)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A1',
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
