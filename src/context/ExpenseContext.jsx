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

  useEffect(() => {
    if (user) {
      localStorage.setItem(LS_KEY_TX, JSON.stringify(transactions));
      localStorage.setItem(LS_KEY_ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(LS_KEY_ACTIVE_ACC, activeAccountId);
      localStorage.setItem(LS_KEY_GOALS, JSON.stringify(goals));
      localStorage.setItem(LS_KEY_SUBS, JSON.stringify(subscriptions));
    }
  }, [transactions, accounts, activeAccountId, goals, subscriptions, user, LS_KEY_TX, LS_KEY_ACCOUNTS, LS_KEY_ACTIVE_ACC, LS_KEY_GOALS, LS_KEY_SUBS]);

  const addTransaction = (transaction) => {
    const installments = parseInt(transaction.installments || 1);
    
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
      setTransactions(prev => [{ ...transaction, id: uuidv4(), date: transaction.date || new Date().toISOString(), accountId: activeAccountId }, ...prev]);
    }
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addAccount = (name, currency = 'ARS') => {
    const newAcc = { id: uuidv4(), name, currency };
    setAccounts(prev => [...prev, newAcc]);
    setActiveAccountId(newAcc.id);
  };

  const switchAccount = (id) => {
    setActiveAccountId(id);
  };

  const addGoal = (goal) => {
    setGoals(prev => [...prev, { ...goal, id: uuidv4(), saved: 0, accountId: activeAccountId }]);
  };

  const contributeToGoal = (goalId, amount) => {
    // Restar del balance activo
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    addTransaction({
      description: `Aporte a Meta: ${goal.name}`,
      amount,
      type: 'expense',
      category: 'Otros',
      date: new Date().toISOString()
    });
    
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return { ...g, saved: g.saved + amount };
      }
      return g;
    }));
  };

  const deleteGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addSubscription = (sub) => {
    setSubscriptions(prev => [...prev, { ...sub, id: uuidv4(), accountId: activeAccountId }]);
  };

  const deleteSubscription = (id) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };

  const isSameMonth = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
  };

  // Filter by active account first
  const accountTransactions = transactions.filter(t => (t.accountId || 'default') === activeAccountId);

  const currentMonthTransactions = accountTransactions.filter(t => isSameMonth(new Date(t.date), currentMonthDate));
  
  const prevMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  const prevMonthTransactions = accountTransactions.filter(t => isSameMonth(new Date(t.date), prevMonthDate));

  const balance = currentMonthTransactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
  }, 0);

  const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  const prevIncome = prevMonthTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const prevExpense = prevMonthTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  const today = new Date();
  let dailyBudget = 0;
  
  if (isSameMonth(currentMonthDate, today)) {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - today.getDate() + 1);
    dailyBudget = balance > 0 ? balance / daysRemaining : 0;
  } else if (currentMonthDate > today) {
    const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
    dailyBudget = balance > 0 ? balance / daysInMonth : 0;
  } else {
    dailyBudget = 0;
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
      deleteTransaction,
      balance,
      income,
      expense,
      prevIncome,
      prevExpense,
      dailyBudget,
      currentMonthDate,
      changeMonth,
      goals: goals.filter(g => (g.accountId || 'default') === activeAccountId),
      addGoal,
      contributeToGoal,
      deleteGoal,
      subscriptions: subscriptions.filter(s => (s.accountId || 'default') === activeAccountId),
      addSubscription,
      deleteSubscription,
      allTransactions: accountTransactions
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};
