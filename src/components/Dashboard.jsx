import React, { useMemo, useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FiArrowUpRight, FiArrowDownRight, FiCalendar, FiChevronLeft, FiChevronRight, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, LineChart, Line, YAxis, ReferenceLine } from 'recharts';
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
  if (previous === 0 && current === 0) return { text: 'Sin movimientos', positive: null };
  if (previous === 0) return { text: 'Primer registro', positive: true };
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  const sign = percentage > 0 ? '+' : '';
  return { text: `${sign}${percentage.toFixed(1)}% vs mes ant.`, positive: percentage >= 0 };
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
  const { balance, income, expense, prevIncome, prevExpense, dailyBudget, dailyBudgetLimit, dailyBudgetUsed, dailyBudgetSource, monthlyBudget, setMonthlyBudget, transactions, currentMonthDate, changeMonth, activeAccount, sixMonthTrend, exchangeRate, exchangeRateLoading } = useExpenses();
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
      <div className="month-header">
        <button className="month-btn" onClick={() => changeMonth(-1)} title="Mes anterior">
          <FiChevronLeft />
        </button>
        
        <div className="month-display">
          <h2 className="month-title">{formatMonth(currentMonthDate)}</h2>
          <button
            className="month-export-btn"
            onClick={() => exportToPdf(transactions, activeAccount, currentMonthDate, balance, income, expense)}
            title="Exportar PDF"
          >
            <FiDownload />
          </button>
        </div>

        <button className="month-btn" onClick={() => changeMonth(1)} title="Mes siguiente">
          <FiChevronRight />
        </button>
      </div>

      <div className="glass-panel balance-card">

        <h3 className="balance-title">Balance Total</h3>
        <h1 className="balance-amount">{formatCurrency(balance, currency)}</h1>
      </div>

      {/* Exchange Rate Widget */}
      {exchangeRate && (
        <div className="glass-panel exchange-card">
          <div className="exchange-flag">💵</div>
          <div className="exchange-info">
            <span className="exchange-label">Dólar Blue</span>
            <div className="exchange-rates">
              <span>Compra: <strong>${exchangeRate.buy}</strong></span>
              <span>Venta: <strong>${exchangeRate.sell}</strong></span>
            </div>
          </div>
          <FiRefreshCw className="exchange-icon" title="Actualizado" />
        </div>
      )}

      <div className="summary-cards">
        <div className="glass-panel summary-card">
          <div className="summary-icon income">
            <FiArrowUpRight />
          </div>
          <div className="summary-info">
            <h4>Ingresos</h4>
            <p>{formatCurrency(income, currency)}</p>
            {(() => { const c = calculateChange(income, prevIncome); return c.positive === null
              ? <span className="comparison neutral">{c.text}</span>
              : <span className={`comparison ${c.positive ? 'positive' : 'negative'}`}>{c.text}</span>; })()}
          </div>
        </div>
        <div className="glass-panel summary-card">
          <div className="summary-icon expense">
            <FiArrowDownRight />
          </div>
          <div className="summary-info">
            <h4>Gastos</h4>
            <p>{formatCurrency(expense, currency)}</p>
            {(() => { const c = calculateChange(expense, prevExpense); return c.positive === null
              ? <span className="comparison neutral">{c.text}</span>
              : <span className={`comparison ${!c.positive ? 'positive' : 'negative'}`}>{c.text}</span>; })()}
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
              {monthlyBudget > 0 ? (
                <>
                  <p style={{ marginTop: '0.2rem' }}>
                    <strong>{formatCurrency(dailyBudgetLimit, currency)}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.3rem' }}>por día</span>
                  </p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-secondary)', display: 'block', marginBottom: '0.3rem' }}>📋 Presupuesto manual</span>
                  <div style={{ marginTop: '0.1rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (dailyBudgetUsed / dailyBudgetLimit) * 100)}%`,
                      background: dailyBudgetUsed > dailyBudgetLimit ? '#ef4444' : 'var(--accent-secondary)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Gastado hoy: <strong style={{ color: dailyBudgetUsed > dailyBudgetLimit ? '#ef4444' : 'var(--text-primary)' }}>{formatCurrency(dailyBudgetUsed, currency)}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: dailyBudget > 0 ? 'var(--accent-secondary)' : '#ef4444', fontWeight: 600 }}>
                      {dailyBudget > 0 ? `Disponible: ${formatCurrency(dailyBudget, currency)}` : 'Límite superado'}
                    </span>
                  </div>
                </>
              ) : dailyBudgetSource === 'income' ? (
                <>
                  <p style={{ marginTop: '0.2rem' }}>
                    <strong>{formatCurrency(dailyBudgetLimit, currency)}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.3rem' }}>por día</span>
                  </p>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'block', marginBottom: '0.3rem' }}>💰 Basado en tus ingresos del mes</span>
                  <div style={{ marginTop: '0.1rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (dailyBudgetUsed / dailyBudgetLimit) * 100)}%`,
                      background: dailyBudgetUsed > dailyBudgetLimit ? '#ef4444' : '#10b981',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Gastado hoy: <strong style={{ color: dailyBudgetUsed > dailyBudgetLimit ? '#ef4444' : 'var(--text-primary)' }}>{formatCurrency(dailyBudgetUsed, currency)}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: dailyBudget > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {dailyBudget > 0 ? `Disponible: ${formatCurrency(dailyBudget, currency)}` : 'Límite superado'}
                    </span>
                  </div>
                </>
              ) : (
                <p style={{ marginTop: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Registrá un ingreso o configurá tu presupuesto mensual</span>
                </p>
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

      <div className="glass-panel chart-container">
        <h3>Gastos por Día (Mes Completo)</h3>
        {dailyBudgetLimit > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
            — Línea: límite diario {formatCurrency(dailyBudgetLimit, currency)}
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expensesByDay} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
            <YAxis
              stroke="#94a3b8"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={v => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              content={({active, payload}) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                      <p style={{ color: '#fff', fontSize: '0.9rem' }}>{`${payload[0].payload.date}: ${formatCurrency(payload[0].value, currency)}`}</p>
                      {dailyBudgetLimit > 0 && (
                        <p style={{ color: payload[0].value > dailyBudgetLimit ? '#ef4444' : '#10b981', fontSize: '0.78rem' }}>
                          {payload[0].value > dailyBudgetLimit ? '⚠ Superó el límite' : `✓ Dentro del límite`}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="amount"
              radius={[4, 4, 0, 0]}
              fill="var(--accent-secondary)"
            />
            {dailyBudgetLimit > 0 && (
              <ReferenceLine
                y={dailyBudgetLimit}
                stroke="#10b981"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={false}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 6-Month Trend Chart */}
      {sixMonthTrend && sixMonthTrend.some(m => m.Ingresos > 0 || m.Gastos > 0) && (
        <div className="glass-panel chart-container">
          <h3>Tendencia 6 Meses</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sixMonthTrend}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                content={({active, payload, label}) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                        <p style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.3rem' }}>{label}</p>
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color, fontSize: '0.82rem' }}>{p.name}: {formatCurrency(p.value, currency)}</p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="bottom" height={28} iconType="circle" />
              <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
