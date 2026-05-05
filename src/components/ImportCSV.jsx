import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { FiUpload, FiX, FiCheck, FiAlertCircle, FiArrowUpRight, FiArrowDownRight, FiFileText } from 'react-icons/fi';
import { useExpenses } from '../context/ExpenseContext';
import { mapRowsToTransactions } from '../utils/csvParser';
import './ImportCSV.css';

const CATEGORY_LABELS = {
  Food: 'Comida', Shopping: 'Compras', Housing: 'Vivienda',
  Transport: 'Transporte', Salary: 'Sueldo', Other: 'Otros',
};

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

export const ImportCSV = ({ onClose }) => {
  const { addTransaction } = useExpenses();
  const fileRef = useRef();

  const [step, setStep] = useState('upload'); // upload | preview | done
  const [bankName, setBankName] = useState('');
  const [parsed, setParsed] = useState([]);   // all rows
  const [selected, setSelected] = useState([]); // indexes selected for import
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: ({ data, meta }) => {
        if (!data || data.length === 0) {
          setError('El archivo está vacío o no tiene el formato correcto.');
          return;
        }
        const { transactions, bankName: bank, errors } = mapRowsToTransactions(data, meta.fields || []);
        if (transactions.length === 0) {
          setError('No se pudieron detectar transacciones. Revisá que el archivo sea un CSV de movimientos bancarios.');
          return;
        }
        setBankName(bank);
        setParsed(transactions);
        setSelected(transactions.map((_, i) => i)); // all selected by default
        if (errors > 0) setError(`${errors} filas no pudieron leerse y fueron ignoradas.`);
        setStep('preview');
      },
      error: () => setError('No se pudo leer el archivo. Asegurate de que sea un CSV válido.'),
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const toggleRow = (i) => {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const toggleAll = () => {
    setSelected(selected.length === parsed.length ? [] : parsed.map((_, i) => i));
  };

  const handleImport = async () => {
    setImporting(true);
    const toImport = parsed.filter((_, i) => selected.includes(i));
    for (const tx of toImport) {
      addTransaction(tx);
      await new Promise(r => setTimeout(r, 20)); // pequeña pausa para no saturar
    }
    setImported(toImport.length);
    setStep('done');
    setImporting(false);
  };

  const incomeTotal  = parsed.filter((_, i) => selected.includes(i) && parsed[i].type === 'income').reduce((a, t) => a + t.amount, 0);
  const expenseTotal = parsed.filter((_, i) => selected.includes(i) && parsed[i].type === 'expense').reduce((a, t) => a + t.amount, 0);

  return (
    <div className="import-overlay" onClick={onClose}>
      <div className="import-modal glass-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="import-header">
          <div>
            <h3>Importar Movimientos</h3>
            {bankName && <span className="import-bank-badge">{bankName}</span>}
          </div>
          <button className="import-close" onClick={onClose}><FiX /></button>
        </div>

        {/* Step: upload */}
        {step === 'upload' && (
          <div
            className="import-dropzone"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <FiUpload className="import-drop-icon" />
            <p className="import-drop-title">Arrastrá tu CSV bancario o hacé click</p>
            <p className="import-drop-sub">Compatible con Santander · Galicia · BBVA · Naranja X · Mercado Pago · Brubank · Ualá y más</p>
            {error && (
              <div className="import-error"><FiAlertCircle /> {error}</div>
            )}
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && (
          <>
            <div className="import-summary-row">
              <div className="import-stat income">
                <FiArrowUpRight />
                <span>{fmt(incomeTotal)}</span>
                <label>Ingresos</label>
              </div>
              <div className="import-stat expense">
                <FiArrowDownRight />
                <span>{fmt(expenseTotal)}</span>
                <label>Gastos</label>
              </div>
              <div className="import-stat neutral">
                <FiFileText />
                <span>{selected.length}/{parsed.length}</span>
                <label>Seleccionados</label>
              </div>
            </div>

            {error && <div className="import-error small"><FiAlertCircle /> {error}</div>}

            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selected.length === parsed.length} onChange={toggleAll} /></th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((tx, i) => (
                    <tr key={i} className={selected.includes(i) ? '' : 'import-row-disabled'} onClick={() => toggleRow(i)}>
                      <td><input type="checkbox" checked={selected.includes(i)} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} /></td>
                      <td className="import-date">{new Date(tx.date).toLocaleDateString('es-AR')}</td>
                      <td className="import-desc" title={tx.description}>{tx.description}</td>
                      <td><span className="import-cat-chip">{CATEGORY_LABELS[tx.category] || tx.category}</span></td>
                      <td>
                        <span className={`import-type ${tx.type}`}>
                          {tx.type === 'income' ? <FiArrowUpRight /> : <FiArrowDownRight />}
                          {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className={`import-amount ${tx.type}`}>{fmt(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="import-actions">
              <button className="import-btn secondary" onClick={() => { setStep('upload'); setError(''); }}>← Volver</button>
              <button className="import-btn primary" onClick={handleImport} disabled={importing || selected.length === 0}>
                {importing ? 'Importando...' : `Importar ${selected.length} movimientos`}
              </button>
            </div>
          </>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="import-done">
            <div className="import-done-icon">✅</div>
            <h3>{imported} movimientos importados</h3>
            <p>Tus transacciones ya están en el dashboard.</p>
            <button className="import-btn primary" onClick={onClose}>Listo</button>
          </div>
        )}
      </div>
    </div>
  );
};
