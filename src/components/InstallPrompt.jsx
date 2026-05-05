import React, { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import './InstallPrompt.css';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Escuchar el evento que indica que la app se puede instalar
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Chequear si ya cerramos este cartel antes en esta sesión/dispositivo
      const dismissed = localStorage.getItem('lumina_install_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si ya se instaló, ocultar
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Limpiar listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostrar el prompt nativo
    deferredPrompt.prompt();
    
    // Esperar a ver qué elige el usuario
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    // Limpiamos el evento
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('lumina_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt-card glass-panel">
        <button className="install-close" onClick={handleDismiss}>
          <FiX />
        </button>
        <div className="install-icon" style={{ background: 'transparent' }}>
          <img src="/logo.png" alt="Lumina Pro" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
        </div>
        <div className="install-text">
          <h3>Instalá Lumina Pro</h3>
          <p>Llevá tus finanzas al siguiente nivel. Instalá la aplicación en tu pantalla de inicio.</p>
        </div>
        <button className="install-action-btn" onClick={handleInstallClick}>
          Instalar App
        </button>
      </div>
    </div>
  );
};
