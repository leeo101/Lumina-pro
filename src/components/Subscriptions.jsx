import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiPlus, FiRepeat, FiTrash2, FiCalendar } from 'react-icons/fi';
import './Subscriptions.css';

const formatCurrency = (amount, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

export const Subscriptions = () => {
  const { subscriptions, addSubscription, deleteSubscription, activeAccount } = useExpenses();
  const currency = activeAccount?.currency || 'ARS';
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDay, setNewDay] = useState(1);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newAmount || !newDay) return;
    
    addSubscription({
      name: newName,
      amount: parseFloat(newAmount),
      day: parseInt(newDay)
    });
    
    setNewName('');
    setNewAmount('');
    setNewDay(1);
    setShowAddModal(false);
  };

  const totalMonthly = subscriptions.reduce((acc, sub) => acc + sub.amount, 0);

  return (
    <div className="subscriptions-container" style={{ paddingBottom: '90px' }}>
      <div className="subs-header">
        <h2>Suscripciones</h2>
        <button className="add-sub-btn" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Agregar
        </button>
      </div>

      {subscriptions.length > 0 && (
        <div className="glass-panel subs-summary">
          <p>Compromiso Mensual Fijo</p>
          <h3>{formatCurrency(totalMonthly, currency)}</h3>
        </div>
      )}

      <div className="subs-list">
        {subscriptions.length === 0 ? (
          <div className="glass-panel empty-state">
            <FiRepeat size={40} color="var(--accent-secondary)" />
            <p>No tenés suscripciones configuradas.</p>
          </div>
        ) : (
          subscriptions.sort((a, b) => a.day - b.day).map(sub => (
            <div key={sub.id} className="glass-panel sub-card">
              <div className="sub-icon">
                <FiRepeat />
              </div>
              <div className="sub-info">
                <h4>{sub.name}</h4>
                <div className="sub-meta">
                  <FiCalendar /> <span>Día {sub.day} de cada mes</span>
                </div>
              </div>
              <div className="sub-right">
                <span className="sub-amount">{formatCurrency(sub.amount, currency)}</span>
                <button className="delete-sub" onClick={() => deleteSubscription(sub.id)}>
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-tx-modal" onClick={e => e.stopPropagation()}>
            <div className="add-tx-header">
              <h3>Nueva Suscripción</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>X</button>
            </div>
            <form className="tx-form" onSubmit={handleAdd}>
              <div className="form-group">
                <label>Servicio (ej. Netflix, Alquiler)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Monto ({currency})</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newAmount} 
                  onChange={e => setNewAmount(e.target.value)} 
                  min="0.01" 
                  step="0.01" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Día de cobro (1 al 31)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newDay} 
                  onChange={e => setNewDay(e.target.value)} 
                  min="1" 
                  max="31" 
                  required 
                />
              </div>
              <button type="submit" className="submit-btn">Guardar Suscripción</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
