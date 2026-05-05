import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUnlock, FiMail, FiLock, FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './Login.css';

export const Login = () => {
  const { loginUser, registerUser, loginWithBiometrics, resetPassword, authError, setAuthError, authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const clearError = () => setAuthError('');

  const handleTab = (tab) => { setActiveTab(tab); clearError(); setShowReset(false); setResetSent(false); };

  const handleAction = async (e) => {
    e.preventDefault();
    clearError();
    if (activeTab === 'register') {
      if (!email.trim() || !username.trim() || !fullName.trim() || !password.trim()) {
        setAuthError('Completá todos los campos.');
        return;
      }
      await registerUser(email.trim(), username.trim(), fullName.trim(), password);
    } else {
      if (!email.trim() || !password.trim()) {
        setAuthError('Ingresá tu email y contraseña.');
        return;
      }
      await loginUser(email.trim(), password);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    clearError();
    const ok = await resetPassword(email.trim());
    if (ok) setResetSent(true);
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="login-header">
          <img src="/icon-512.png" alt="Lumina Pro" style={{ width: '72px', height: '72px', borderRadius: '18px', marginBottom: '1rem', objectFit: 'cover', boxShadow: '0 8px 32px rgba(139,92,246,0.5)' }} />
          <h2>Lumina Pro</h2>
          <p>Gestión Financiera Inteligente</p>
        </div>

        {!showReset ? (
          <>
            <div className="login-tabs">
              <button type="button" className={`login-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => handleTab('login')}>Ingresar</button>
              <button type="button" className={`login-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => handleTab('register')}>Registrarse</button>
            </div>

            <form className="login-form" onSubmit={handleAction}>
              {activeTab === 'register' && (
                <>
                  <div className="form-group">
                    <label>Nombre Completo</label>
                    <div className="input-with-icon">
                      <FiUser className="input-icon" />
                      <input type="text" className="form-input" placeholder="Ej. Leo Rodriguez" value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Nombre de Usuario</label>
                    <div className="input-with-icon">
                      <FiUser className="input-icon" />
                      <input type="text" className="form-input" placeholder="Ej. leorodriguez" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Email</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input type="email" className="form-input" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'} />
                </div>
              </div>

              {authError && (
                <div className="auth-error">
                  <FiAlertCircle /> <span>{authError}</span>
                </div>
              )}

              <button type="submit" className="login-btn" disabled={authLoading}>
                {authLoading ? 'Procesando...' : activeTab === 'register' ? 'Crear Cuenta' : 'Ingresar'}
              </button>

              {activeTab === 'login' && (
                <>
                  <button type="button" className="login-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginTop: '-0.5rem' }} onClick={() => loginWithBiometrics(email)}>
                    <FiUnlock style={{ marginRight: '0.4rem' }} /> Ingresar con Huella
                  </button>
                  <button type="button" onClick={() => { setShowReset(true); clearError(); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'center', marginTop: '0.2rem' }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </>
              )}
            </form>
          </>
        ) : (
          <form className="login-form" onSubmit={handleReset}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Recuperar contraseña</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Te enviaremos un link para restablecer tu contraseña.
            </p>

            {resetSent ? (
              <div className="auth-success">
                <FiCheckCircle /> <span>¡Email enviado! Revisá tu bandeja de entrada.</span>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Tu email</label>
                  <div className="input-with-icon">
                    <FiMail className="input-icon" />
                    <input type="email" className="form-input" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                {authError && <div className="auth-error"><FiAlertCircle /> <span>{authError}</span></div>}
                <button type="submit" className="login-btn" disabled={authLoading}>{authLoading ? 'Enviando...' : 'Enviar link'}</button>
              </>
            )}

            <button type="button" onClick={() => { setShowReset(false); setResetSent(false); clearError(); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', marginTop: '0.5rem' }}>
              ← Volver al login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
