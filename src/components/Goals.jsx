import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiPlus, FiTarget, FiDollarSign, FiTrash2 } from 'react-icons/fi';
import './Goals.css';

const formatCurrency = (amount, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

export const Goals = () => {
  const { goals, addGoal, contributeToGoal, deleteGoal, activeAccount, balance } = useExpenses();
  const currency = activeAccount?.currency || 'ARS';
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  const [contributeModalGoal, setContributeModalGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalAmount) return;
    
    addGoal({
      name: newGoalName,
      amount: parseFloat(newGoalAmount)
    });
    
    setNewGoalName('');
    setNewGoalAmount('');
    setShowAddModal(false);
  };

  const handleContribute = (e) => {
    e.preventDefault();
    if (!contributeAmount) return;
    const amount = parseFloat(contributeAmount);
    
    if (amount > balance) {
      alert('No tenés suficiente balance para hacer este aporte.');
      return;
    }
    
    contributeToGoal(contributeModalGoal.id, amount);
    setContributeAmount('');
    setContributeModalGoal(null);
  };

  return (
    <div className="goals-container" style={{ paddingBottom: '90px' }}>
      <div className="goals-header">
        <h2>Metas de Ahorro</h2>
        <button className="add-goal-btn" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Nueva Meta
        </button>
      </div>

      <div className="goals-list">
        {goals.length === 0 ? (
          <div className="glass-panel empty-state">
            <FiTarget size={40} color="var(--accent-secondary)" />
            <p>No tenés metas configuradas.</p>
          </div>
        ) : (
          goals.map(goal => {
            const progress = Math.min((goal.saved / goal.amount) * 100, 100);
            
            return (
              <div key={goal.id} className="glass-panel goal-card">
                <div className="goal-info">
                  <div className="goal-title-row">
                    <h3>{goal.name}</h3>
                    <button className="delete-goal" onClick={() => deleteGoal(goal.id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                  <div className="goal-amounts">
                    <span className="goal-saved">{formatCurrency(goal.saved, currency)}</span>
                    <span className="goal-target">de {formatCurrency(goal.amount, currency)}</span>
                  </div>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                
                <div className="goal-actions">
                  <span className="goal-percentage">{progress.toFixed(1)}% completado</span>
                  {progress < 100 && (
                    <button 
                      className="contribute-btn"
                      onClick={() => setContributeModalGoal(goal)}
                    >
                      <FiDollarSign /> Aportar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-tx-modal" onClick={e => e.stopPropagation()}>
            <div className="add-tx-header">
              <h3>Nueva Meta</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>X</button>
            </div>
            <form className="tx-form" onSubmit={handleAddGoal}>
              <div className="form-group">
                <label>Nombre de la Meta (ej. Vacaciones)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newGoalName} 
                  onChange={e => setNewGoalName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Monto Objetivo ({currency})</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newGoalAmount} 
                  onChange={e => setNewGoalAmount(e.target.value)} 
                  min="1" 
                  step="0.01" 
                  required 
                />
              </div>
              <button type="submit" className="submit-btn">Crear Meta</button>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeModalGoal && (
        <div className="modal-overlay" onClick={() => setContributeModalGoal(null)}>
          <div className="add-tx-modal" onClick={e => e.stopPropagation()}>
            <div className="add-tx-header">
              <h3>Aportar a: {contributeModalGoal.name}</h3>
              <button className="close-btn" onClick={() => setContributeModalGoal(null)}>X</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Balance disponible: {formatCurrency(balance, currency)}
            </p>
            <form className="tx-form" onSubmit={handleContribute}>
              <div className="form-group">
                <label>Monto a aportar ({currency})</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={contributeAmount} 
                  onChange={e => setContributeAmount(e.target.value)} 
                  min="0.01" 
                  step="0.01" 
                  required 
                />
              </div>
              <button type="submit" className="submit-btn">Realizar Aporte</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
