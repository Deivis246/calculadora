const { google } = require('googleapis');
const { getAuth } = require('./_auth');

function generateClinicalTexts(res, pat = {}) {
  const recsGen = [];
  const recsHta = [];
  const recsDm = [];
  const recsLip = [];
  const recsObes = [];
  const planMon = [];

  // 1. Recomendaciones Generales
  if (res.ipaqCat) {
    recsGen.push(`• Actividad física (${res.ipaqCat}): Nivel actual ${res.ipaqMet || 0} MET-min/sem. Progresar: añadir 2 sesiones de fuerza muscular/sem o ejercicio aeróbico.`);
  }
  if (res.htaStatus && res.htaStatus !== 'No diagnosticado') {
    recsGen.push(`• Dieta DASH: Indicada por HTA (PA actual: ${res.paActual || 'elevada'}). Aumentar frutas/verduras (4-5 porciones/día), lácteos descremados, granos integrales. Reducir sodio < 2.3 g/día.`);
  }
  if (res.dmStatus && res.dmStatus !== 'No diagnosticado') {
    recsGen.push(`• Plan nutricional glucemia: Plato saludable 1/2 verduras, 1/4 proteína, 1/4 carbohidrato complejo. Evitar azúcares refinados y jugos.`);
  }
  if (res.dislStatus && res.dislStatus !== 'No diagnosticado') {
    recsGen.push(`• Dieta cardioprotectora: Omega-3 (pescado azul 2x/sem), grasas saturadas < 7%, fibra soluble >= 10 g/día.`);
  }
  if (res.bmiCat && (res.bmiCat.includes('Sobrepeso') || res.bmiCat.includes('Obesidad'))) {
    recsGen.push(`• Manejo del peso: IMC actual ${res.bmi || ''} kg/m² (${res.bmiCat}). Meta: reducir 5-10% del peso corporal con déficit calórico de 300-500 kcal/día.`);
  }
  recsGen.push(`• Sueño y manejo del estrés: Dormir 7-9 horas/noche. Evaluar SAOS si ronquido intenso o somnolencia diurna.`);

  // 2. Hipertensión
  if (res.htaStatus !== 'No diagnosticado') {
    recsHta.push(`• Estado clínico: ${res.htaStatus} (${res.paActual || ''}).`);
    if (res.paActual && res.paActual.includes('Estadio 2')) {
      recsHta.push(`• HTA Estadio 2: Iniciar con combinación de dosis fija (Perindopril 5mg + Amlodipino 5mg, o Losartán 50mg + HCTZ 12.5mg). Meta < 130/80 mmHg.`);
    } else if (res.paActual && res.paActual.includes('Estadio 1')) {
      recsHta.push(`• HTA Estadio 1: Iniciar monoterapia (Clortalidona 12.5mg o Amlodipino 5mg). Reevaluar en 4 semanas.`);
    } else {
      recsHta.push(`• Mantener control farmacológico y estilo de vida saludable. Meta < 130/80 mmHg.`);
    }
    recsHta.push(`• Automonitoreo recomendado: MAPA domiciliaria 2 veces/día x 7 días antes de consulta.`);
  } else {
    recsHta.push(`• Sin diagnóstico clínico de Hipertensión. PA actual: ${res.paActual || 'Normal'}.`);
  }

  // 3. Diabetes / Prediabetes
  if (res.dmStatus !== 'No diagnosticado') {
    recsDm.push(`• Estado clínico: ${res.dmStatus} (HbA1c: ${res.hba1cActual || 'no registrada'}, Glucosa: ${pat.glucosa ? pat.glucosa + ' mg/dL' : 'ver lab'}). FINDRISC: ${res.findrisc || 0} pts (${res.findCat || ''}).`);
    recsDm.push(`• Intervención de estilo de vida intensiva: reduce progresión a DM2 en 58%. Meta: pérdida del 7% del peso corporal.`);
    if (parseFloat(res.bmi) >= 35 || res.dmStatus.includes('Fuera de meta') || pat.glucosa >= 100) {
      recsDm.push(`• Metformina indicada 850 mg/día con alimentos. Vigilar vitamina B12 anualmente.`);
    }
  } else {
    recsDm.push(`• Sin diagnóstico clínico de Diabetes. FINDRISC: ${res.findrisc || 0} pts (${res.findCat || ''}).`);
  }

  // 4. Dislipidemia
  if (res.dislStatus !== 'No diagnosticado' || parseFloat(res.preventCvd10) >= 5) {
    recsLip.push(`• Estado clínico: ${res.dislStatus} (LDL actual: ${res.ldlActual || 'no registrado'}). Riesgo PREVENT 10a: ${res.preventCvd10 || 0}% (${res.preventCat || ''}).`);
    if (parseFloat(res.preventCvd10) >= 20) {
      recsLip.push(`• Riesgo ALTO: Estatina de alta intensidad obligatoria (Rosuvastatina 20-40mg o Atorvastatina 40-80mg). Meta LDL < 55 mg/dL.`);
    } else if (parseFloat(res.preventCvd10) >= 10) {
      recsLip.push(`• Riesgo INTERMEDIO: Estatina moderada-alta (Atorvastatina 20-40mg). Meta LDL < 70 mg/dL.`);
    } else {
      recsLip.push(`• Riesgo BORDERLINE/MODERADO: Estatina moderada (Atorvastatina 10-20mg o Rosuvastatina 5-10mg). Meta LDL < 100 mg/dL.`);
    }
    if (pat.trigliceridos >= 200) {
      recsLip.push(`• Hipertrigliceridemia (${pat.trigliceridos} mg/dL): Añadir Fenofibrato 160 mg/día y restricción estricta de azúcares refinados y alcohol.`);
    }
  } else {
    recsLip.push(`• Sin diagnóstico de Dislipidemia. Riesgo PREVENT 10a: ${res.preventCvd10 || 0}% (${res.preventCat || 'Bajo'}).`);
  }

  // 5. Obesidad / Sobrepeso
  if (res.bmiCat && (res.bmiCat.includes('Sobrepeso') || res.bmiCat.includes('Obesidad'))) {
    recsObes.push(`• Diagnóstico: IMC ${res.bmi || ''} kg/m² (${res.bmiCat}).`);
    recsObes.push(`• Meta inicial: reducir 5-10% del peso corporal con déficit calórico de 500 kcal/día + ejercicio moderado 150 min/sem.`);
    if (parseFloat(res.bmi) >= 30 || (parseFloat(res.bmi) >= 27 && (res.htaStatus !== 'No diagnosticado' || res.dmStatus !== 'No diagnosticado'))) {
      recsObes.push(`• Elegible a farmacoterapia anti-obesidad (GLP-1 RA como Tirzepatida o Semaglutida, o Naltrexona/Bupropión) por comorbilidad cardiometabólica.`);
    }
  } else {
    recsObes.push(`• IMC ${res.bmi || ''} kg/m² (${res.bmiCat || 'Normal'}). Mantener peso saludable.`);
  }

  // 6. Plan de Monitorización
  planMon.push(`• Presión arterial: Control en ${res.paActual && res.paActual.includes('Estadio 2') ? '1 mes' : '3-6 meses'}. Meta < 130/80 mmHg.`);
  planMon.push(`• Glucemia / HbA1c: Control cada ${res.dmStatus !== 'No diagnosticado' ? '3-6 meses' : '12 meses'}. Meta HbA1c < 7.0%.`);
  planMon.push(`• Perfil lipídico: Control cada 12 meses (o a las 8-12 semanas de iniciar estatina).`);
  planMon.push(`• Función renal: TFGe actual ${res.egfr || '—'} mL/min (${res.egfrStatus || ''}). Control anual de creatinina y potasio.`);

  return [
    recsGen.join('\n'),
    recsHta.join('\n'),
    recsDm.join('\n'),
    recsLip.join('\n'),
    recsObes.join('\n'),
    planMon.join('\n')
  ];
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { resumen, patient } = req.body;
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

    const headers = [
      "Fecha/Hora", "Nombre", "Edad", "Sexo", "IMC (kg/m²)", "Cat. IMC",
      "TFGe (mL/min)", "Estado Renal", "FINDRISC (pts)", "Riesgo FINDRISC",
      "PREVENT CVD 10a (%)", "Riesgo PREVENT", "IPAQ (MET-min/sem)", "Actividad IPAQ",
      "Estado HTA", "PA Actual", "Estado DM", "HbA1c Actual",
      "Estado Dislipidemia", "LDL Actual", "Estado Obesidad",
      "Antihipertensivos", "Antidiabéticos", "Estatinas",
      "Recomendaciones Generales (No Farmacológicas)",
      "Recomendaciones Farmacológicas HTA",
      "Intervención Prediabetes / Diabetes",
      "Recomendaciones Farmacológicas Dislipidemia",
      "Manejo de Sobrepeso / Obesidad",
      "Plan de Monitorización"
    ];

    // Siempre actualizar/asegurar la Fila 1 con los 30 encabezados completos
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabTitle}!A1:AD1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] }
    });

    // Dar formato azul marino elegante con letras blancas en negrita a toda la fila 1 (30 columnas)
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId: tabId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 30 },
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

    // 2. Generar textos clínicos estructurados (las 6 cajas de texto profesionales)
    const recTexts = generateClinicalTexts(resumen || {}, patient || {});

    // 3. Preparar la fila de datos completa (30 casilleros exactos)
    const now = new Date();
    const fechaHoraFormateada = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false });

    const rowData = [fechaHoraFormateada, ...Object.values(resumen), ...recTexts];

    // 4. Insertar fila completa debajo en la pestaña resumen
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabTitle}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [rowData] }
    });

    // 5. Limpiar fondo blanco, dar formato de Fecha/Hora a columna A, y ajustar texto con salto de línea en columnas 25-30
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
            },
            {
              repeatCell: {
                range: { sheetId: tabId, startRowIndex: 1, startColumnIndex: 24, endColumnIndex: 30 },
                cell: {
                  userEnteredFormat: {
                    wrapStrategy: 'WRAP',
                    verticalAlignment: 'TOP'
                  }
                },
                fields: "userEnteredFormat(wrapStrategy,verticalAlignment)"
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
