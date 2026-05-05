import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider, useExpenses } from './context/ExpenseContext';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { AddTransaction } from './components/AddTransaction';
import { Login } from './components/Login';
import { Subscriptions } from './components/Subscriptions';
import { Goals } from './components/Goals';
import { InstallPrompt } from './components/InstallPrompt';
import { Settings } from './components/Settings';
import { FiPlus, FiLogOut, FiHome, FiRepeat, FiTarget, FiSettings } from 'react-icons/fi';
import './App.css';

function AppContent() {
  const { user, logout } = useAuth();
  const { accounts, activeAccountId, switchAccount, addAccount, dataLoading } = useExpenses();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  const handleAddAccount = () => {
    const name = prompt("Nombre de la nueva cuenta (ej. Negocio):");
    if (name && name.trim()) {
      const isUSD = window.confirm("¿La cuenta es en Dólares? (Cancelá para Pesos)");
      addAccount(name.trim(), isUSD ? 'USD' : 'ARS');
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/icon-512.png" alt="Lumina Pro" style={{ height: '36px', width: '36px', borderRadius: '8px', objectFit: 'cover' }} />
          Lumina Pro
        </div>
        
        <div className="account-controls" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select 
            className="form-input" 
            style={{ padding: '0.4rem', fontSize: '0.85rem' }}
            value={activeAccountId}
            onChange={(e) => {
              if (e.target.value === 'new') {
                handleAddAccount();
              } else {
                switchAccount(e.target.value);
              }
            }}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency || 'ARS'})</option>
            ))}
            <option value="new">+ Nueva Cuenta</option>
          </select>
          
          <button className="user-profile" onClick={() => setShowSettings(true)} title="Configuración">
            <FiSettings />
          </button>
          <button className="user-profile" onClick={logout} title="Cerrar sesión">
            <FiLogOut />
          </button>
        </div>
      </header>

      <main className="main-content" style={{ paddingBottom: '90px' }}>
        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cargando tus datos...</p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <>
                <Dashboard />
                <TransactionList />
              </>
            )}
            {currentView === 'subscriptions' && <Subscriptions />}
            {currentView === 'goals' && <Goals />}
          </>
        )}
      </main>

      <button className="fab" onClick={() => setShowAddModal(true)}>
        <FiPlus />
      </button>

      {showAddModal && (
        <AddTransaction onClose={() => setShowAddModal(false)} />
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      <InstallPrompt />

      <nav className="bottom-nav">
        <button 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <FiHome />
          <span>Inicio</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setCurrentView('subscriptions')}
        >
          <FiRepeat />
          <span>Suscripciones</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'goals' ? 'active' : ''}`}
          onClick={() => setCurrentView('goals')}
        >
          <FiTarget />
          <span>Metas</span>
        </button>
      </nav>
    </div>
  );
}

function Main() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <ExpenseProvider>
      <AppContent />
    </ExpenseProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

export default App;
