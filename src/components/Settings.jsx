import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { FiDownload, FiUpload, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import './Settings.css';

export const Settings = ({ onClose }) => {
  const { user } = useAuth();
  const { customCategories, addCustomCategory, deleteCustomCategory } = useExpenses();
  const [newCategory, setNewCategory] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleExport = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(user.username)) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina_backup_${user.username}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    setImportSuccess('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, data[key]);
        });
        setImportSuccess('¡Datos restaurados! Recargá la app para ver los cambios.');
      } catch {
        setImportError('Archivo inválido. Asegurate de usar un backup de Lumina Pro.');
      }
    };
    reader.readAsText(file);
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    addCustomCategory(trimmed);
    setNewCategory('');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Configuración</h3>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        {/* Backup Section */}
        <div className="settings-section">
          <h4>Backup de Datos</h4>
          <p className="settings-desc">Exportá todos tus datos para respaldarlos o importarlos en otro dispositivo.</p>
          <div className="settings-actions">
            <button className="settings-btn primary" onClick={handleExport}>
              <FiDownload /> Exportar Backup
            </button>
            <label className="settings-btn secondary">
              <FiUpload /> Importar Backup
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>
          {importError && <p className="settings-error">{importError}</p>}
          {importSuccess && <p className="settings-success">{importSuccess}</p>}
        </div>

        {/* Custom Categories */}
        <div className="settings-section">
          <h4>Categorías Personalizadas</h4>
          <p className="settings-desc">Creá tus propias categorías para clasificar mejor tus gastos.</p>
          <div className="category-input-row">
            <input
              type="text"
              className="form-input"
              placeholder="Nueva categoría..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              style={{ flex: 1 }}
            />
            <button className="settings-btn primary small" onClick={handleAddCategory}>
              <FiPlus />
            </button>
          </div>
          <div className="custom-categories-list">
            {(customCategories || []).map(cat => (
              <div key={cat} className="custom-category-chip">
                <span>{cat}</span>
                <button onClick={() => deleteCustomCategory(cat)}><FiTrash2 /></button>
              </div>
            ))}
            {(!customCategories || customCategories.length === 0) && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No hay categorías personalizadas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
