import React, { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import './InstallPrompt.css';

const DISMISSED_KEY = 'lumina_install_dismissed_v2';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // El evento puede haber sido capturado globalmente antes de que este
    // componente se montara (ej: mientras estaba en la pantalla de login).
    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
      setShowPrompt(true);
    }

    // También escuchamos por si el evento llega después
    const handler = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      const alreadyDismissed = localStorage.getItem(DISMISSED_KEY);
      if (!alreadyDismissed) {
        setDeferredPrompt(e);
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      window.__deferredInstallPrompt = null;
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      window.__deferredInstallPrompt = null;
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt-card glass-panel">
        <button className="install-close" onClick={handleDismiss}>
          <FiX />
        </button>
        <div className="install-icon">
          <img src="/icon-512.png" alt="Lumina Pro" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
        </div>
        <div className="install-text">
          <h3>Instalá Lumina Pro</h3>
          <p>Llevá tus finanzas siempre con vos. Instalá la app en tu pantalla de inicio para acceso rápido.</p>
        </div>
        <button className="install-action-btn" onClick={handleInstall}>
          <FiDownload style={{ marginRight: '0.4rem' }} />
          Instalar App
        </button>
      </div>
    </div>
  );
};
