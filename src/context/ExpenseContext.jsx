import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

const ExpenseContext = createContext();

export const useExpenses = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
  const { user } = useAuth();

  const LS_KEY_TX = `lumina_txs_${user?.username}`;
  const LS_KEY_ACCOUNTS = `lumina_accs_${user?.username}`;
  const LS_KEY_ACTIVE_ACC = `lumina_active_acc_${user?.username}`;
  const LS_KEY_GOALS = `lumina_goals_${user?.username}`;
  const LS_KEY_SUBS = `lumina_subs_${user?.username}`;
  const LS_KEY_BUDGET = `lumina_budget_${user?.username}`;
  const LS_KEY_CATS = `lumina_cats_${user?.username}`;

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const [accounts, setAccounts] = useState(() => {
    if (!user) return [];
    const saved = localStorage.getItem(LS_KEY_ACCOUNTS);
    if (saved) return JSON.parse(saved);
    return [{ id: 'default', name: 'Cuenta Personal', currency: 'ARS' }];
  });

  const [activeAccountId, setActiveAccountId] = useState(() => {
    if (!user) return 'default';
    return localStorage.getItem(LS_KEY_ACTIVE_ACC) || 'default';
  });

  const [transactions, setTransactions] = useState(() => {
    if (!user) return [];
    const saved = localStorage.getItem(LS_KEY_TX);
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [goals, setGoals] = useState(() => {
    if (!user) return [];
    const saved = localStorage.getItem(LS_KEY_GOALS);
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [subscriptions, setSubscriptions] = useState(() => {
    if (!user) return [];
    const saved = localStorage.getItem(LS_KEY_SUBS);
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [monthlyBudget, setMonthlyBudgetState] = useState(() => {
    if (!user) return 0;
    const saved = localStorage.getItem(LS_KEY_BUDGET);
    return saved ? parseFloat(saved) : 0;
  });

  const [customCategories, setCustomCategories] = useState(() => {
    if (!user) return [];
    const saved = localStorage.getItem(LS_KEY_CATS);
    return saved ? JSON.parse(saved) : [];
  });

  // Live exchange rate (ARS blue)
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
      setExchangeRateLoading(true);
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue');
        const data = await res.json();
        setExchangeRate({ buy: data.compra, sell: data.venta, updated: data.fechaActualizacion });
      } catch {
        // Silently fail - not critical
      } finally {
        setExchangeRateLoading(false);
      }
    };
    fetchRate();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(LS_KEY_TX, JSON.stringify(transactions));
      localStorage.setItem(LS_KEY_ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(LS_KEY_ACTIVE_ACC, activeAccountId);
      localStorage.setItem(LS_KEY_GOALS, JSON.stringify(goals));
      localStorage.setItem(LS_KEY_SUBS, JSON.stringify(subscriptions));
      localStorage.setItem(LS_KEY_CATS, JSON.stringify(customCategories));
    }
  }, [transactions, accounts, activeAccountId, goals, subscriptions, customCategories, user]);

  const setMonthlyBudget = (amount) => {
    const val = parseFloat(amount) || 0;
    setMonthlyBudgetState(val);
    localStorage.setItem(LS_KEY_BUDGET, val);
  };

  const addCustomCategory = (name) => {
    setCustomCategories(prev => prev.includes(name) ? prev : [...prev, name]);
  };

  const deleteCustomCategory = (name) => {
    setCustomCategories(prev => prev.filter(c => c !== name));
  };

  const addTransaction = (transaction) => {
    const installments = parseInt(transaction.installments || 1);

    // Handle account transfer
    if (transaction.type === 'transfer' && transaction.transferToAccountId) {
      const txOut = {
        ...transaction,
        id: uuidv4(),
        date: transaction.date || new Date().toISOString(),
        accountId: activeAccountId,
        type: 'expense',
        category: 'Transferencia',
      };
      const txIn = {
        ...transaction,
        id: uuidv4(),
        date: transaction.date || new Date().toISOString(),
        accountId: transaction.transferToAccountId,
        type: 'income',
        category: 'Transferencia',
        description: transaction.description,
      };
      setTransactions(prev => [txOut, txIn, ...prev]);
      return;
    }

    if (installments > 1 && transaction.type === 'expense') {
      const installmentAmount = transaction.amount / installments;
      const baseDate = new Date(transaction.date || new Date().toISOString());

      const newTransactions = [];
      for (let i = 0; i < installments; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        newTransactions.push({
          ...transaction,
          id: uuidv4(),
          amount: installmentAmount,
          description: `${transaction.description} (Cuota ${i + 1}/${installments})`,
          date: d.toISOString(),
          accountId: activeAccountId
        });
      }
      setTransactions(prev => [...newTransactions.reverse(), ...prev]);
    } else {
      setTransactions(prev => [{
        ...transaction,
        id: uuidv4(),
        date: transaction.date || new Date().toISOString(),
        accountId: activeAccountId
      }, ...prev]);
    }
  };

  const updateTransaction = (id, updates) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addAccount = (name, currency = 'ARS') => {
    const newAcc = { id: uuidv4(), name, currency };
    setAccounts(prev => [...prev, newAcc]);
    setActiveAccountId(newAcc.id);
  };

  const switchAccount = (id) => setActiveAccountId(id);

  const addGoal = (goal) => {
    setGoals(prev => [...prev, { ...goal, id: uuidv4(), saved: 0, accountId: activeAccountId }]);
  };

  const contributeToGoal = (goalId, amount) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    addTransaction({
      description: `Aporte a Meta: ${goal.name}`,
      amount,
      type: 'expense',
      category: 'Otros',
      date: new Date().toISOString()
    });
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, saved: g.saved + amount } : g));
  };

  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const addSubscription = (sub) => {
    setSubscriptions(prev => [...prev, { ...sub, id: uuidv4(), accountId: activeAccountId }]);
  };

  const deleteSubscription = (id) => setSubscriptions(prev => prev.filter(s => s.id !== id));

  const isSameMonth = (date1, date2) =>
    date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();

  const accountTransactions = transactions.filter(t => (t.accountId || 'default') === activeAccountId);
  const currentMonthTransactions = accountTransactions.filter(t => isSameMonth(new Date(t.date), currentMonthDate));

  const prevMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  const prevMonthTransactions = accountTransactions.filter(t => isSameMonth(new Date(t.date), prevMonthDate));

  const balance = currentMonthTransactions.reduce((acc, curr) =>
    curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);

  const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const prevIncome = prevMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const prevExpense = prevMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  // 6-month trend data
  const sixMonthTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - (5 - i), 1);
    const monthTxs = accountTransactions.filter(t => isSameMonth(new Date(t.date), d));
    const inc = monthTxs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
    const exp = monthTxs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    return {
      name: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d),
      Ingresos: inc,
      Gastos: exp,
    };
  });

  const today = new Date();
  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();

  let dailyBudget = 0;
  let dailyBudgetUsed = 0;
  let dailyBudgetLimit = 0;
  let dailyBudgetSource = 'none'; // 'manual' | 'income' | 'none'

  const todayExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && isSameMonth(new Date(t.date), today) && new Date(t.date).getDate() === today.getDate())
    .reduce((acc, t) => acc + t.amount, 0);

  if (monthlyBudget > 0) {
    dailyBudgetSource = 'manual';
    dailyBudgetLimit = monthlyBudget / daysInMonth;
    dailyBudgetUsed = todayExpenses;
    dailyBudget = Math.max(0, dailyBudgetLimit - dailyBudgetUsed);
  } else if (income > 0 && isSameMonth(currentMonthDate, today)) {
    dailyBudgetSource = 'income';
    dailyBudgetLimit = income / daysInMonth;
    dailyBudgetUsed = todayExpenses;
    dailyBudget = Math.max(0, dailyBudgetLimit - dailyBudgetUsed);
  }

  const changeMonth = (offset) => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <ExpenseContext.Provider value={{
      transactions: currentMonthTransactions,
      accounts,
      activeAccountId,
      activeAccount: accounts.find(a => a.id === activeAccountId),
      addAccount,
      switchAccount,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      balance,
      income,
      expense,
      prevIncome,
      prevExpense,
      dailyBudget,
      dailyBudgetLimit,
      dailyBudgetUsed,
      dailyBudgetSource,
      monthlyBudget,
      setMonthlyBudget,
      currentMonthDate,
      changeMonth,
      sixMonthTrend,
      exchangeRate,
      exchangeRateLoading,
      goals: goals.filter(g => (g.accountId || 'default') === activeAccountId),
      addGoal,
      contributeToGoal,
      deleteGoal,
      subscriptions: subscriptions.filter(s => (s.accountId || 'default') === activeAccountId),
      addSubscription,
      deleteSubscription,
      customCategories,
      addCustomCategory,
      deleteCustomCategory,
      allTransactions: accountTransactions
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};
