import React, { useMemo, useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiArrowUpRight, FiArrowDownRight, FiCalendar, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis } from 'recharts';
import { exportToPdf } from '../utils/pdfExport';
import './Dashboard.css';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#f59e0b', '#ec4899'];

const formatCurrency = (amount, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatMonth = (date) => {
  const str = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const calculateChange = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

const categoryMap = {
  'Food': 'Comida',
  'Shopping': 'Compras',
  'Housing': 'Vivienda',
  'Transport': 'Transporte',
  'Salary': 'Sueldo',
  'Other': 'Otros'
};

export const Dashboard = () => {
  const { balance, income, expense, prevIncome, prevExpense, dailyBudget, dailyBudgetLimit, dailyBudgetUsed, monthlyBudget, setMonthlyBudget, transactions, currentMonthDate, changeMonth, activeAccount } = useExpenses();
  const currency = activeAccount?.currency || 'ARS';
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const expensesByCategory = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const categories = {};
    
    expenseTxs.forEach(t => {
      if (categories[t.category]) {
        categories[t.category] += t.amount;
      } else {
        categories[t.category] = t.amount;
      }
    });

    return Object.keys(categories).map(key => ({
      name: categoryMap[key] || key,
      value: categories[key]
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const expensesByDay = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
    
    // Initialize array with all days of the month
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        date: `${day}/${currentMonthDate.getMonth() + 1}`,
        amount: 0,
      };
    });

    expenseTxs.forEach(t => {
      const date = new Date(t.date);
      // Index is day - 1
      const dayIndex = date.getDate() - 1;
      if (daysArray[dayIndex]) {
        daysArray[dayIndex].amount += t.amount;
      }
    });

    return daysArray;
  }, [transactions, currentMonthDate]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
          <p style={{ color: '#fff', fontSize: '0.9rem' }}>{`${payload[0].name} : ${formatCurrency(payload[0].value, currency)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <div className="month-selector" style={{ position: 'relative' }}>
        <button className="month-btn" onClick={() => changeMonth(-1)}><FiChevronLeft /></button>
        <h2 className="month-title">{formatMonth(currentMonthDate)}</h2>
        <button className="month-btn" onClick={() => changeMonth(1)}><FiChevronRight /></button>
        
        <button 
          className="export-btn" 
          onClick={() => exportToPdf(transactions, activeAccount, currentMonthDate, balance, income, expense)}
          style={{ position: 'absolute', right: 0, background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
          title="Exportar a PDF"
        >
          <FiDownload />
        </button>
      </div>

      <div className="glass-panel balance-card">
        <h3 className="balance-title">Balance Total</h3>
        <h1 className="balance-amount">{formatCurrency(balance, currency)}</h1>
      </div>

      <div className="summary-cards">
        <div className="glass-panel summary-card">
          <div className="summary-icon income">
            <FiArrowUpRight />
          </div>
          <div className="summary-info">
            <h4>Ingresos</h4>
            <p>{formatCurrency(income, currency)}</p>
            <span className={`comparison ${income >= prevIncome ? 'positive' : 'negative'}`}>
              {calculateChange(income, prevIncome)} vs mes ant.
            </span>
          </div>
        </div>
        <div className="glass-panel summary-card">
          <div className="summary-icon expense">
            <FiArrowDownRight />
          </div>
          <div className="summary-info">
            <h4>Gastos</h4>
            <p>{formatCurrency(expense, currency)}</p>
            <span className={`comparison ${expense >= prevExpense ? 'negative' : 'positive'}`}>
              {calculateChange(expense, prevExpense)} vs mes ant.
            </span>
          </div>
        </div>
      </div>

      <div className="glass-panel summary-card daily-budget-card">
        <div className="summary-icon daily">
          <FiCalendar />
        </div>
        <div className="summary-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Presupuesto Diario</h4>
            <button
              onClick={() => { setEditingBudget(true); setBudgetInput(monthlyBudget || ''); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {monthlyBudget > 0 ? 'Editar' : 'Configurar'}
            </button>
          </div>

          {editingBudget ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <input
                type="number"
                className="form-input"
                placeholder="Presupuesto mensual"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', flex: 1 }}
                autoFocus
              />
              <button
                className="register-btn"
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => { setMonthlyBudget(budgetInput); setEditingBudget(false); }}
              >OK</button>
              <button
                onClick={() => setEditingBudget(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
              >✕</button>
            </div>
          ) : (
            <>
              <p style={{ marginTop: '0.2rem' }}>
                {monthlyBudget > 0
                  ? <><strong>{formatCurrency(dailyBudget, currency)}</strong> <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>disponible hoy</span></>
                  : <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Configurá tu presupuesto mensual</span>
                }
              </p>
              {monthlyBudget > 0 && dailyBudgetLimit > 0 && (
                <>
                  <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (dailyBudgetUsed / dailyBudgetLimit) * 100)}%`,
                      background: dailyBudgetUsed > dailyBudgetLimit ? '#ef4444' : 'var(--accent-secondary)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>
                    Gastado hoy: {formatCurrency(dailyBudgetUsed, currency)} de {formatCurrency(dailyBudgetLimit, currency)}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {expensesByCategory.length > 0 && (
        <div className="glass-panel chart-container">
          <h3>Gastos por Categoría</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {expensesByDay.some(d => d.amount > 0) && (
        <div className="glass-panel chart-container">
          <h3>Gastos por Día (Mes Completo)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expensesByDay}>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                content={({active, payload}) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                        <p style={{ color: '#fff', fontSize: '0.9rem' }}>{`${payload[0].payload.date}: ${formatCurrency(payload[0].value, currency)}`}</p>
                      </div>
                    );
                  }
                  return null;
                }} 
              />
              <Bar dataKey="amount" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
