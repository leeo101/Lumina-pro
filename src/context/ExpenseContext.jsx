import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ExpenseContext = createContext();
export const useExpenses = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
  const { user } = useAuth();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [accounts, setAccounts] = useState([{ id: 'default', name: 'Cuenta Personal', currency: 'ARS' }]);
  const [activeAccountId, setActiveAccountId] = useState('default');
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [monthlyBudget, setMonthlyBudgetState] = useState(0);
  const [customCategories, setCustomCategories] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);

  // Ref to guard against saving before data is loaded from Firestore
  const readyToSave = useRef(false);

  // ── Load data from Firestore when user changes ──────────────────────────────
  useEffect(() => {
    if (!user) {
      readyToSave.current = false;
      setDataLoading(false);
      return;
    }

    readyToSave.current = false;
    setDataLoading(true);

    const load = async () => {
      try {
        const uid = user.uid;
        const [txSnap, accSnap, goalsSnap, subsSnap, settingsSnap] = await Promise.all([
          getDoc(doc(db, 'users', uid, 'appdata', 'transactions')),
          getDoc(doc(db, 'users', uid, 'appdata', 'accounts')),
          getDoc(doc(db, 'users', uid, 'appdata', 'goals')),
          getDoc(doc(db, 'users', uid, 'appdata', 'subs')),
          getDoc(doc(db, 'users', uid, 'appdata', 'settings')),
        ]);

        if (txSnap.exists())      setTransactions(txSnap.data().items || []);
        if (accSnap.exists()) {
          setAccounts(accSnap.data().items || [{ id: 'default', name: 'Cuenta Personal', currency: 'ARS' }]);
          setActiveAccountId(accSnap.data().activeAccountId || 'default');
        }
        if (goalsSnap.exists())   setGoals(goalsSnap.data().items || []);
        if (subsSnap.exists())    setSubscriptions(subsSnap.data().items || []);
        if (settingsSnap.exists()) {
          setMonthlyBudgetState(settingsSnap.data().monthlyBudget || 0);
          setCustomCategories(settingsSnap.data().customCategories || []);
        }
      } catch (e) {
        console.error('Error cargando datos desde Firestore:', e);
      } finally {
        setDataLoading(false);
        // Allow saving after a tick so the above setters have flushed
        setTimeout(() => { readyToSave.current = true; }, 200);
      }
    };

    load();
  }, [user?.uid]);

  // ── Save data to Firestore (debounced 1.5 s) ────────────────────────────────
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!user || !readyToSave.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const uid = user.uid;
        await Promise.all([
          setDoc(doc(db, 'users', uid, 'appdata', 'transactions'), { items: transactions }),
          setDoc(doc(db, 'users', uid, 'appdata', 'accounts'),     { items: accounts, activeAccountId }),
          setDoc(doc(db, 'users', uid, 'appdata', 'goals'),        { items: goals }),
          setDoc(doc(db, 'users', uid, 'appdata', 'subs'),         { items: subscriptions }),
          setDoc(doc(db, 'users', uid, 'appdata', 'settings'),     { monthlyBudget, customCategories }),
        ]);
      } catch (e) {
        console.error('Error guardando en Firestore:', e);
      }
    }, 1500);

    return () => clearTimeout(saveTimer.current);
  }, [transactions, accounts, activeAccountId, goals, subscriptions, monthlyBudget, customCategories, user]);

  // ── Exchange rate ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRates = async () => {
      setExchangeRateLoading(true);
      try {
        const [blueRes, oficialRes] = await Promise.all([
          fetch('https://dolarapi.com/v1/dolares/blue'),
          fetch('https://dolarapi.com/v1/dolares/oficial')
        ]);
        const blueData = await blueRes.json();
        const oficialData = await oficialRes.json();
        
        setExchangeRate({
          blue: { buy: blueData.compra, sell: blueData.venta },
          oficial: { buy: oficialData.compra, sell: oficialData.venta },
          updated: oficialData.fechaActualizacion
        });
      } catch { /* silently fail */ } finally {
        setExchangeRateLoading(false);
      }
    };
    fetchRates();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setMonthlyBudget = (amount) => setMonthlyBudgetState(parseFloat(amount) || 0);

  const addCustomCategory  = (name) => setCustomCategories(prev => prev.includes(name) ? prev : [...prev, name]);
  const deleteCustomCategory = (name) => setCustomCategories(prev => prev.filter(c => c !== name));

  const addTransaction = (transaction) => {
    const installments = parseInt(transaction.installments || 1);

    if (transaction.type === 'transfer' && transaction.transferToAccountId) {
      const base = { ...transaction, date: transaction.date || new Date().toISOString(), accountId: activeAccountId };
      setTransactions(prev => [
        { ...base, id: uuidv4(), type: 'expense', category: 'Transferencia' },
        { ...base, id: uuidv4(), type: 'income',  category: 'Transferencia', accountId: transaction.transferToAccountId },
        ...prev,
      ]);
      return;
    }

    if (installments > 1 && transaction.type === 'expense') {
      const amt  = transaction.amount / installments;
      const base = new Date(transaction.date || new Date().toISOString());
      const newTxs = Array.from({ length: installments }, (_, i) => {
        const d = new Date(base);
        d.setMonth(d.getMonth() + i);
        return { ...transaction, id: uuidv4(), amount: amt, description: `${transaction.description} (Cuota ${i+1}/${installments})`, date: d.toISOString(), accountId: activeAccountId };
      });
      setTransactions(prev => [...newTxs.reverse(), ...prev]);
    } else {
      setTransactions(prev => [{ ...transaction, id: uuidv4(), date: transaction.date || new Date().toISOString(), accountId: activeAccountId }, ...prev]);
    }
  };

  const updateTransaction = (id, updates) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTransaction  = (id) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addAccount    = (name, currency = 'ARS') => { const a = { id: uuidv4(), name, currency }; setAccounts(prev => [...prev, a]); setActiveAccountId(a.id); };
  const switchAccount = (id) => setActiveAccountId(id);

  const addGoal         = (goal)          => setGoals(prev => [...prev, { ...goal, id: uuidv4(), saved: 0, accountId: activeAccountId }]);
  const deleteGoal      = (id)            => setGoals(prev => prev.filter(g => g.id !== id));
  const contributeToGoal = (goalId, amt) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    addTransaction({ description: `Aporte a Meta: ${goal.name}`, amount: amt, type: 'expense', category: 'Otros', date: new Date().toISOString() });
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, saved: g.saved + amt } : g));
  };

  const addSubscription    = (sub) => setSubscriptions(prev => [...prev, { ...sub, id: uuidv4(), accountId: activeAccountId }]);
  const deleteSubscription = (id)  => setSubscriptions(prev => prev.filter(s => s.id !== id));

  const changeMonth = (offset) => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

  // ── Derived values ───────────────────────────────────────────────────────────
  const isSameMonth = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

  const accountTransactions = transactions.filter(t => (t.accountId || 'default') === activeAccountId);
  const currentMonthTransactions = accountTransactions.filter(t => isSameMonth(new Date(t.date), currentMonthDate));
  const prevMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  const prevMonthTransactions = accountTransactions.filter(t => isSameMonth(new Date(t.date), prevMonthDate));

  const balance    = currentMonthTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  const income     = currentMonthTransactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense    = currentMonthTransactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const prevIncome = prevMonthTransactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const prevExpense= prevMonthTransactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  const sixMonthTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - (5 - i), 1);
    const mTxs = accountTransactions.filter(t => isSameMonth(new Date(t.date), d));
    return {
      name: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d),
      Ingresos: mTxs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
      Gastos:   mTxs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    };
  });

  const today = new Date();
  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  let dailyBudget = 0, dailyBudgetUsed = 0, dailyBudgetLimit = 0, dailyBudgetSource = 'none';

  const todayExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && isSameMonth(new Date(t.date), today) && new Date(t.date).getDate() === today.getDate())
    .reduce((a, t) => a + t.amount, 0);

  if (monthlyBudget > 0) {
    dailyBudgetSource = 'manual';
    dailyBudgetLimit  = monthlyBudget / daysInMonth;
    dailyBudgetUsed   = todayExpenses;
    dailyBudget       = Math.max(0, dailyBudgetLimit - dailyBudgetUsed);
  } else if (income > 0 && isSameMonth(currentMonthDate, today)) {
    dailyBudgetSource = 'income';
    dailyBudgetLimit  = income / daysInMonth;
    dailyBudgetUsed   = todayExpenses;
    dailyBudget       = Math.max(0, dailyBudgetLimit - dailyBudgetUsed);
  }

  return (
    <ExpenseContext.Provider value={{
      transactions: currentMonthTransactions,
      allTransactions: accountTransactions,
      accounts,
      activeAccountId,
      activeAccount: accounts.find(a => a.id === activeAccountId),
      addAccount, switchAccount,
      addTransaction, updateTransaction, deleteTransaction,
      balance, income, expense, prevIncome, prevExpense,
      dailyBudget, dailyBudgetLimit, dailyBudgetUsed, dailyBudgetSource,
      monthlyBudget, setMonthlyBudget,
      currentMonthDate, changeMonth,
      sixMonthTrend,
      exchangeRate, exchangeRateLoading,
      goals: goals.filter(g => (g.accountId || 'default') === activeAccountId),
      addGoal, contributeToGoal, deleteGoal,
      subscriptions: subscriptions.filter(s => (s.accountId || 'default') === activeAccountId),
      addSubscription, deleteSubscription,
      customCategories, addCustomCategory, deleteCustomCategory,
      dataLoading,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};
