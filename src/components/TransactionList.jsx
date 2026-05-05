import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiShoppingCart, FiHome, FiCoffee, FiDollarSign, FiActivity, FiEdit2, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { AddTransaction } from './AddTransaction';
import './TransactionList.css';

const formatCurrency = (amount, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'Comida': case 'Food': return <FiCoffee />;
    case 'Compras': case 'Shopping': return <FiShoppingCart />;
    case 'Vivienda': case 'Housing': return <FiHome />;
    case 'Sueldo': case 'Salary': return <FiDollarSign />;
    case 'Transferencia': return <FiRefreshCw />;
    default: return <FiActivity />;
  }
};

const categoryMap = {
  'Food': 'Comida', 'Shopping': 'Compras', 'Housing': 'Vivienda',
  'Transport': 'Transporte', 'Salary': 'Sueldo', 'Other': 'Otros'
};

export const TransactionList = () => {
  const { transactions, deleteTransaction, activeAccount } = useExpenses();
  const currency = activeAccount?.currency || 'ARS';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [editingTx, setEditingTx] = useState(null);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || tx.category === filterCategory || categoryMap[tx.category] === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = ['All', ...new Set(transactions.map(t => categoryMap[t.category] || t.category))];

  return (
    <div className="transaction-list-container">
      <div className="tx-list-header">
        <h3>Últimos Movimientos</h3>
      </div>

      <div className="tx-filters">
        <input type="text" placeholder="Buscar movimiento..." className="search-input form-input"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select className="category-filter form-input" value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat === 'All' ? 'Todas las categorías' : cat}</option>
          ))}
        </select>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="glass-panel empty-state">
          <p>No hay movimientos registrados.</p>
        </div>
      ) : (
        <div className="transaction-list">
          {filteredTransactions.map(tx => (
            <div key={tx.id} className="glass-panel transaction-item">
              <div className="tx-left">
                <div className={`tx-icon ${tx.type === 'transfer' ? 'transfer' : ''}`}>
                  {getCategoryIcon(tx.category)}
                </div>
                <div className="tx-details">
                  <h4>{tx.description}</h4>
                  <div className="tx-meta">
                    <p>{new Date(tx.date).toLocaleDateString('es-AR')}</p>
                    <span className={`category-badge cat-${(categoryMap[tx.category] || tx.category || '').toLowerCase().replace(/\s/g, '-')}`}>
                      {categoryMap[tx.category] || tx.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="tx-right">
                <span className={`tx-amount ${tx.type}`}>
                  {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇄' : '-'}{formatCurrency(tx.amount, currency)}
                </span>
                <div className="tx-actions">
                  {tx.type !== 'transfer' && (
                    <button className="edit-btn" onClick={() => setEditingTx(tx)} title="Editar">
                      <FiEdit2 />
                    </button>
                  )}
                  <button className="delete-btn" onClick={() => deleteTransaction(tx.id)} title="Eliminar">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTx && (
        <AddTransaction editingTx={editingTx} onClose={() => setEditingTx(null)} />
      )}
    </div>
  );
};
