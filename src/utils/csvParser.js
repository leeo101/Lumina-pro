/**
 * csvParser.js
 * Detecta el formato de CSV de distintos bancos argentinos y mapea
 * las columnas a transacciones de Lumina Pro.
 */

// ── Detección de categoría por palabras clave ──────────────────────────────
const CATEGORY_RULES = [
  { keywords: ['SUPERM', 'COTO', 'DIA ', 'CARREFOUR', 'DISCO', 'JUMBO', 'WALMART', 'CHANG', 'LA ANONIMA', 'VITAL', 'RESTAURANT', 'RESTO', 'PIZZA', 'BURGER', 'MCDONALD', 'KFC', 'CAFE', 'PANADERIA', 'SUSHI', 'DELIVERY', 'PEDIDOS YA', 'RAPPI'], category: 'Food' },
  { keywords: ['CABIFY', 'UBER', 'SUBTE', 'SUBE ', 'TAXI', 'REMIS', 'YPF', 'SHELL', 'AXION', 'NAFTA', 'ESTACION', 'PEAJE', 'AUTOPISTA', 'COLECTIVO', 'TREN '], category: 'Transport' },
  { keywords: ['NETFLIX', 'SPOTIFY', 'DISNEY', 'AMAZON', 'APPLE', 'GOOGLE', 'MERCADOLIBRE', 'MELI', 'TIENDA', 'FALABELLA', 'FRÁVEGA', 'FRAVEGA', 'MUSIMUNDO', 'GARBARINO', 'ZARA', 'HYM', 'ROPA', 'INDUMENTARIA'], category: 'Shopping' },
  { keywords: ['ALQUILER', 'EXPENSAS', 'LUZ ', 'EDESUR', 'EDENOR', 'GAS ', 'METROGAS', 'AGUA ', 'AYSA', 'INTERNET', 'TELECOM', 'FIBERTEL', 'MOVISTAR', 'PERSONAL ', 'CLARO ', 'DIRECTV', 'CABLEVISION'], category: 'Housing' },
  { keywords: ['SUELDO', 'HABERES', 'SALARIO', 'HONORARIO', 'FACTURA', 'COBRO', 'TRANSFERENCIA REC', 'ACREDITACION SUELDO'], category: 'Salary' },
];

const detectCategory = (description = '') => {
  const upper = description.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => upper.includes(k))) return rule.category;
  }
  return 'Other';
};

// ── Normalizar fecha ───────────────────────────────────────────────────────
const parseDate = (str = '') => {
  if (!str) return new Date().toISOString();
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`).toISOString();
  }
  // yyyy-mm-dd
  const ymd = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (ymd) return new Date(`${str}T12:00:00`).toISOString();

  const d = new Date(str);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
};

// ── Normalizar monto ───────────────────────────────────────────────────────
const parseAmount = (str = '') => {
  if (typeof str === 'number') return str;
  // Remove currency symbols, spaces, dots used as thousand separator
  const cleaned = String(str)
    .replace(/[$ ]/g, '')
    .replace(/\./g, '')   // remove thousand dots
    .replace(',', '.');   // decimal comma → dot
  return parseFloat(cleaned) || 0;
};

// ── Detección del formato del banco ───────────────────────────────────────
const normalize = (s = '') => s.toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents

const findCol = (headers, candidates) => {
  const normed = headers.map(normalize);
  for (const c of candidates) {
    const idx = normed.indexOf(normalize(c));
    if (idx !== -1) return headers[idx];
  }
  return null;
};

/**
 * Detecta las columnas relevantes según los headers del CSV.
 * Retorna un objeto { dateCol, descCol, amountCol, debitCol, creditCol, bankName }
 */
const detectFormat = (headers) => {
  const dateCol   = findCol(headers, ['fecha', 'date', 'fecha operacion', 'fecha movimiento']);
  const descCol   = findCol(headers, ['descripcion', 'concepto', 'detalle', 'comercio', 'descripción', 'movimiento', 'operacion']);
  const amountCol = findCol(headers, ['importe', 'monto', 'amount', 'importe ars', 'importe ($)', 'total']);
  const debitCol  = findCol(headers, ['debito', 'débito', 'cargo', 'egreso']);
  const creditCol = findCol(headers, ['credito', 'crédito', 'abono', 'ingreso', 'acreditacion']);

  let bankName = 'Genérico';
  const h = headers.map(normalize).join(' ');
  if (h.includes('santander')) bankName = 'Santander';
  else if (h.includes('galicia')) bankName = 'Galicia';
  else if (h.includes('bbva') || h.includes('frances')) bankName = 'BBVA';
  else if (h.includes('naranja')) bankName = 'Naranja X';
  else if (h.includes('mercado pago') || h.includes('mp')) bankName = 'Mercado Pago';
  else if (h.includes('macro')) bankName = 'Macro';
  else if (h.includes('brubank')) bankName = 'Brubank';
  else if (h.includes('uala') || h.includes('ualá')) bankName = 'Ualá';

  return { dateCol, descCol, amountCol, debitCol, creditCol, bankName };
};

// ── Parser principal ───────────────────────────────────────────────────────
/**
 * Convierte filas de CSV ya parseadas en transacciones de Lumina Pro.
 * @param {Array<Object>} rows  - Filas del CSV (objetos key→value)
 * @param {Array<string>} headers - Headers del CSV
 * @returns {{ transactions: Array, bankName: string, errors: number }}
 */
export const mapRowsToTransactions = (rows, headers) => {
  const { dateCol, descCol, amountCol, debitCol, creditCol, bankName } = detectFormat(headers);

  const transactions = [];
  let errors = 0;

  for (const row of rows) {
    try {
      const description = (row[descCol] || row[headers[1]] || 'Sin descripción').trim();
      const rawDate = row[dateCol] || row[headers[0]] || '';
      const date = parseDate(rawDate);

      let amount = 0;
      let type = 'expense';

      if (debitCol && creditCol) {
        // Formato con columnas separadas de débito/crédito
        const debit  = Math.abs(parseAmount(row[debitCol]));
        const credit = Math.abs(parseAmount(row[creditCol]));
        if (credit > 0) { amount = credit; type = 'income'; }
        else if (debit > 0) { amount = debit; type = 'expense'; }
        else continue; // fila vacía
      } else if (amountCol) {
        const raw = parseAmount(row[amountCol]);
        if (raw === 0) continue;
        amount = Math.abs(raw);
        type   = raw > 0 ? 'income' : 'expense';
      } else {
        // Intentar con cualquier columna numérica
        const numCols = headers.filter(h => {
          const v = parseAmount(row[h]);
          return !isNaN(v) && v !== 0;
        });
        if (numCols.length === 0) continue;
        const raw = parseAmount(row[numCols[0]]);
        amount = Math.abs(raw);
        type   = raw > 0 ? 'income' : 'expense';
      }

      const category = type === 'income'
        ? detectCategory(description) === 'Salary' ? 'Salary' : 'Other'
        : detectCategory(description);

      transactions.push({ description, amount, type, category, date });
    } catch {
      errors++;
    }
  }

  return { transactions, bankName, errors };
};
