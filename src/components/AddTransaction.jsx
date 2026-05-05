import React, { useState, useEffect } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import './AddTransaction.css';

const DEFAULT_CATEGORIES = ['Comida', 'Compras', 'Vivienda', 'Transporte', 'Salud', 'Ocio', 'Educación', 'Otros'];

export const AddTransaction = ({ onClose, editingTx = null }) => {
  const getLocalDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const { addTransaction, updateTransaction, customCategories, activeAccount } = useExpenses();
  const currency = activeAccount?.currency || 'ARS';
  const allCategories = [...DEFAULT_CATEGORIES, ...(customCategories || [])];

  const [description, setDescription] = useState(editingTx?.description || '');
  const [amount, setAmount] = useState(editingTx?.amount || '');
  const [type, setType] = useState(editingTx?.type || 'expense');
  const [category, setCategory] = useState(editingTx?.category || 'Comida');
  const [datetime, setDatetime] = useState(
    editingTx ? new Date(editingTx.date).toISOString().slice(0, 16) : getLocalDatetime()
  );
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(3);
  const [isTransfer, setIsTransfer] = useState(editingTx?.type === 'transfer' || false);

  const { accounts, activeAccountId } = useExpenses();
  const [transferToAccountId, setTransferToAccountId] = useState(
    accounts.find(a => a.id !== activeAccountId)?.id || ''
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    if (editingTx) {
      updateTransaction(editingTx.id, {
        description,
        amount: parseFloat(amount),
        type,
        category: type === 'income' ? 'Sueldo' : category,
        date: new Date(datetime).toISOString(),
      });
    } else if (isTransfer) {
      addTransaction({
        description: `Transferencia: ${description}`,
        amount: parseFloat(amount),
        type: 'transfer',
        category: 'Transferencia',
        date: new Date(datetime).toISOString(),
        transferToAccountId,
      });
    } else {
      addTransaction({
        description,
        amount: parseFloat(amount),
        type,
        category: type === 'income' ? 'Sueldo' : category,
        date: new Date(datetime).toISOString(),
        installments: (type === 'expense' && isInstallment) ? installments : 1
      });
    }

    onClose();
  };

  return (
    <div className="add-tx-overlay" onClick={onClose}>
      <div className="add-tx-modal" onClick={e => e.stopPropagation()}>
        <div className="add-tx-header">
          <h3>{editingTx ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form className="tx-form" onSubmit={handleSubmit}>
          {!editingTx && (
            <div className="type-selector">
              <button type="button" className={`type-btn ${!isTransfer && type === 'expense' ? 'active expense' : ''}`}
                onClick={() => { setType('expense'); setIsTransfer(false); }}>Gasto</button>
              <button type="button" className={`type-btn ${!isTransfer && type === 'income' ? 'active income' : ''}`}
                onClick={() => { setType('income'); setIsTransfer(false); }}>Ingreso</button>
              {accounts.length > 1 && (
                <button type="button" className={`type-btn ${isTransfer ? 'active transfer' : ''}`}
                  onClick={() => setIsTransfer(true)}>
                  <FiRefreshCw style={{ marginRight: '4px' }} />Transferir
                </button>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Descripción</label>
            <input type="text" className="form-input" value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Ej. Supermercado" required />
          </div>

          <div className="form-group">
            <label>Monto ({currency})</label>
            <input type="number" className="form-input" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" required />
          </div>

          <div className="form-group">
            <label>Fecha y Hora</label>
            <input type="datetime-local" className="form-input" value={datetime}
              onChange={e => setDatetime(e.target.value)} required />
          </div>

          {isTransfer && (
            <div className="form-group">
              <label>Cuenta destino</label>
              <select className="form-input" value={transferToAccountId}
                onChange={e => setTransferToAccountId(e.target.value)}>
                {accounts.filter(a => a.id !== activeAccountId).map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>
          )}

          {!isTransfer && type === 'expense' && !editingTx && (
            <>
              <div className="form-group">
                <label>Categoría</label>
                <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" id="isInstallment" checked={isInstallment}
                  onChange={e => setIsInstallment(e.target.checked)}
                  style={{ width: 'auto', accentColor: 'var(--accent-primary)' }} />
                <label htmlFor="isInstallment" style={{ margin: 0 }}>Pagar en cuotas</label>
              </div>

              {isInstallment && (
                <div className="form-group">
                  <label>Cantidad de Cuotas</label>
                  <input type="number" className="form-input" value={installments}
                    onChange={e => setInstallments(parseInt(e.target.value))} min="2" max="24" required />
                </div>
              )}
            </>
          )}

          {!isTransfer && type === 'expense' && editingTx && (
            <div className="form-group">
              <label>Categoría</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="submit-btn">
            {editingTx ? 'Guardar Cambios' : isTransfer ? 'Transferir' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
};
