import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUser } from 'react-icons/fi';
import './Login.css';

// Usamos el icono de huella dactilar genérico ya que no hay uno oficial en Feather sin agregar librerías extra
// pero podemos usar otro representativo o simplemente texto. Usaremos un emoji o icono simple para la demo.
import { FiUnlock } from 'react-icons/fi';

export const Login = () => {
  const { loginUser, registerUser, loginWithBiometrics } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const handleAction = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert('Completá todos los campos');
      return;
    }

    if (activeTab === 'register') {
      if (!fullName.trim()) {
        alert('Ingresá tu nombre completo');
        return;
      }
      registerUser(username.trim(), fullName.trim(), password);
    } else {
      loginUser(username.trim(), password);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="login-header">
          <img src="/logo.png" alt="Lumina Pro" style={{ width: '80px', height: '80px', borderRadius: '20px', marginBottom: '1rem', objectFit: 'cover', boxShadow: '0 8px 32px rgba(6, 182, 212, 0.4)' }} />
          <h2>Lumina Pro</h2>
          <p>Gestión Financiera Inteligente</p>
        </div>

        <div className="login-tabs">
          <button 
            type="button"
            className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Ingresar
          </button>
          <button 
            type="button"
            className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Registrarse
          </button>
        </div>

        <form className="login-form" onSubmit={handleAction}>
          {activeTab === 'register' && (
            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Leo Rodriguez"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required={activeTab === 'register'}
              />
            </div>
          )}

          <div className="form-group">
            <label>Nombre de Usuario</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. leorodriguez"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Tu contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={activeTab === 'register' ? 'register-btn' : 'login-btn'}>
            {activeTab === 'register' ? 'Crear Usuario' : 'Ingresar'}
          </button>
          
          {activeTab === 'login' && (
            <button 
              type="button" 
              className="login-btn" 
              style={{ marginTop: '-0.5rem', background: 'transparent', border: '1px solid var(--border-color)' }}
              onClick={() => loginWithBiometrics(username)}
            >
              <FiUnlock className="fingerprint-icon" /> 
              Ingresar con Huella
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
