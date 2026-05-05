import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiX } from 'react-icons/fi';
import './AddTransaction.css';

export const AddTransaction = ({ onClose }) => {
  const getLocalDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const { addTransaction } = useExpenses();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Comida');
  const [datetime, setDatetime] = useState(getLocalDatetime());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(3);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    addTransaction({
      description,
      amount: parseFloat(amount),
      type,
      category: type === 'income' ? 'Sueldo' : category,
      date: new Date(datetime).toISOString(),
      installments: (type === 'expense' && isInstallment) ? installments : 1
    });

    onClose();
  };

  return (
    <div className="add-tx-overlay" onClick={onClose}>
      <div className="add-tx-modal" onClick={e => e.stopPropagation()}>
        <div className="add-tx-header">
          <h3>Nuevo Movimiento</h3>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <form className="tx-form" onSubmit={handleSubmit}>
          <div className="type-selector">
            <button
              type="button"
              className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Gasto
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              Ingreso
            </button>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <input 
              type="text" 
              className="form-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Supermercado"
              required
            />
          </div>

          <div className="form-group">
            <label>Monto (ARS)</label>
            <input 
              type="number" 
              className="form-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Fecha y Hora</label>
            <input 
              type="datetime-local" 
              className="form-input"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              required
            />
          </div>

          {type === 'expense' && (
            <>
              <div className="form-group">
                <label>Categoría</label>
                <select 
                  className="form-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="Comida">Comida</option>
                  <option value="Compras">Compras</option>
                  <option value="Vivienda">Vivienda</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="isInstallment"
                  checked={isInstallment}
                  onChange={e => setIsInstallment(e.target.checked)}
                  style={{ width: 'auto', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="isInstallment" style={{ margin: 0 }}>Pagar en cuotas</label>
              </div>

              {isInstallment && (
                <div className="form-group">
                  <label>Cantidad de Cuotas</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={installments}
                    onChange={e => setInstallments(parseInt(e.target.value))}
                    min="2"
                    max="24"
                    required
                  />
                </div>
              )}
            </>
          )}

          <button type="submit" className="submit-btn">Guardar</button>
        </form>
      </div>
    </div>
  );
};
