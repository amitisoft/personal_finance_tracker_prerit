import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiClientError,
  clearAuthSession,
  getAuthSession,
  toErrorMessage,
  type SessionUser,
} from "../services/apiClient";
import {
  financeApi,
  type AccountInput,
  type BudgetInput,
  type CategoryInput,
  type GoalInput,
  type RecurringInput,
  type TransactionInput,
  type TransferInput,
} from "../services/financeApi";
import {
  Account,
  Budget,
  Category,
  Goal,
  RecurringTransaction,
  Transaction,
} from "../types/finance";

interface FinanceContextValue {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurringTransactions: RecurringTransaction[];
  user: SessionUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isLoadingData: boolean;
  error: string | null;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  budgetScope: {
    month: number;
    year: number;
  };
  clearError: () => void;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => void;
  refreshData: () => Promise<void>;
  loadBudgets: (month: number, year: number) => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (transactionId: string, input: TransactionInput) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  upsertBudget: (input: BudgetInput) => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number) => Promise<void>;
  addRecurring: (input: RecurringInput) => Promise<void>;
  toggleRecurringStatus: (recurringId: string) => Promise<void>;
  deleteRecurring: (recurringId: string) => Promise<void>;
  addAccount: (input: AccountInput) => Promise<void>;
  transferFunds: (input: TransferInput) => Promise<void>;
  addCategory: (input: CategoryInput) => Promise<void>;
  updateCategory: (categoryId: string, input: CategoryInput) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function getCurrentBudgetScope() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function FinanceProvider({ children }: PropsWithChildren) {
  const initialSession = getAuthSession();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [user, setUser] = useState<SessionUser | null>(initialSession?.user ?? null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(initialSession));
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const [budgetScope, setBudgetScope] = useState(getCurrentBudgetScope());

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const clearLocalData = useCallback(() => {
    setCategories([]);
    setAccounts([]);
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setRecurringTransactions([]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const handleError = useCallback(
    (cause: unknown) => {
      setError(toErrorMessage(cause));

      if (cause instanceof ApiClientError && cause.status === 401) {
        clearAuthSession();
        setUser(null);
        clearLocalData();
      }
    },
    [clearLocalData],
  );

  const loadAllData = useCallback(
    async (month: number, year: number) => {
      const [
        nextCategories,
        nextAccounts,
        nextTransactions,
        nextBudgets,
        nextGoals,
        nextRecurringTransactions,
      ] = await Promise.all([
        financeApi.listCategories(),
        financeApi.listAccounts(),
        financeApi.listAllTransactions(),
        financeApi.listBudgets(month, year),
        financeApi.listGoals(),
        financeApi.listRecurring(),
      ]);

      setCategories(nextCategories);
      setAccounts(nextAccounts);
      setTransactions(nextTransactions);
      setBudgets(nextBudgets);
      setGoals(nextGoals);
      setRecurringTransactions(nextRecurringTransactions);
      setBudgetScope({ month, year });
      setError(null);
    },
    [],
  );

  const refreshData = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingData(true);

    try {
      await loadAllData(budgetScope.month, budgetScope.year);
    } catch (cause) {
      handleError(cause);
      throw cause;
    } finally {
      setIsLoadingData(false);
    }
  }, [budgetScope.month, budgetScope.year, handleError, loadAllData, user]);

  const loadBudgets = useCallback(
    async (month: number, year: number) => {
      try {
        const nextBudgets = await financeApi.listBudgets(month, year);
        setBudgets(nextBudgets);
        setBudgetScope({ month, year });
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  useEffect(() => {
    if (!user) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    setIsBootstrapping(true);
    setIsLoadingData(true);

    loadAllData(budgetScope.month, budgetScope.year)
      .catch((cause) => {
        if (!cancelled) {
          handleError(cause);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingData(false);
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [budgetScope.month, budgetScope.year, handleError, loadAllData, user]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      setIsBootstrapping(true);

      try {
        const session = await financeApi.login(input);
        setUser(session.user);
        await loadAllData(budgetScope.month, budgetScope.year);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      } finally {
        setIsBootstrapping(false);
      }
    },
    [budgetScope.month, budgetScope.year, handleError, loadAllData],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      setIsBootstrapping(true);

      try {
        const session = await financeApi.register(input);
        setUser(session.user);
        await loadAllData(budgetScope.month, budgetScope.year);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      } finally {
        setIsBootstrapping(false);
      }
    },
    [budgetScope.month, budgetScope.year, handleError, loadAllData],
  );

  const forgotPassword = useCallback(
    async (email: string) => {
      try {
        const response = await financeApi.forgotPassword(email);
        setError(null);
        return response.message;
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    clearLocalData();
    setError(null);
    setBudgetScope(getCurrentBudgetScope());
  }, [clearLocalData]);

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      try {
        await financeApi.createTransaction(input);

        const [nextTransactions, nextAccounts, nextBudgets] = await Promise.all([
          financeApi.listAllTransactions(),
          financeApi.listAccounts(),
          financeApi.listBudgets(budgetScope.month, budgetScope.year),
        ]);

        setTransactions(nextTransactions);
        setAccounts(nextAccounts);
        setBudgets(nextBudgets);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [budgetScope.month, budgetScope.year, handleError],
  );

  const updateTransaction = useCallback(
    async (transactionId: string, input: TransactionInput) => {
      try {
        await financeApi.updateTransaction(transactionId, input);

        const [nextTransactions, nextAccounts, nextBudgets] = await Promise.all([
          financeApi.listAllTransactions(),
          financeApi.listAccounts(),
          financeApi.listBudgets(budgetScope.month, budgetScope.year),
        ]);

        setTransactions(nextTransactions);
        setAccounts(nextAccounts);
        setBudgets(nextBudgets);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [budgetScope.month, budgetScope.year, handleError],
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      try {
        await financeApi.deleteTransaction(transactionId);

        const [nextTransactions, nextAccounts, nextBudgets] = await Promise.all([
          financeApi.listAllTransactions(),
          financeApi.listAccounts(),
          financeApi.listBudgets(budgetScope.month, budgetScope.year),
        ]);

        setTransactions(nextTransactions);
        setAccounts(nextAccounts);
        setBudgets(nextBudgets);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [budgetScope.month, budgetScope.year, handleError],
  );

  const upsertBudget = useCallback(
    async (input: BudgetInput) => {
      try {
        const monthBudgets = await financeApi.listBudgets(input.month, input.year);
        const existing = monthBudgets.find((budget) => budget.categoryId === input.categoryId);

        if (existing) {
          await financeApi.updateBudget(existing.id, input);
        } else {
          await financeApi.createBudget(input);
        }

        await loadBudgets(input.month, input.year);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError, loadBudgets],
  );

  const addGoal = useCallback(
    async (input: GoalInput) => {
      try {
        const createdGoal = await financeApi.createGoal(input);

        if (input.currentAmount > 0) {
          await financeApi.contributeToGoal(createdGoal.id, input.currentAmount);
        }

        const nextGoals = await financeApi.listGoals();
        setGoals(nextGoals);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const contributeToGoal = useCallback(
    async (goalId: string, amount: number) => {
      try {
        await financeApi.contributeToGoal(goalId, amount);
        const [nextGoals, nextAccounts] = await Promise.all([
          financeApi.listGoals(),
          financeApi.listAccounts(),
        ]);

        setGoals(nextGoals);
        setAccounts(nextAccounts);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const addRecurring = useCallback(
    async (input: RecurringInput) => {
      try {
        await financeApi.createRecurring(input);
        const nextRecurring = await financeApi.listRecurring();
        setRecurringTransactions(nextRecurring);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const toggleRecurringStatus = useCallback(
    async (recurringId: string) => {
      const recurring = recurringTransactions.find((item) => item.id === recurringId);

      if (!recurring) {
        return;
      }

      try {
        await financeApi.updateRecurring(recurringId, {
          title: recurring.title,
          type: recurring.type,
          amount: recurring.amount,
          categoryId: recurring.categoryId,
          accountId: recurring.accountId,
          frequency: recurring.frequency,
          nextRunDate: recurring.nextRunDate,
          autoCreateTransaction: recurring.autoCreateTransaction,
          status: recurring.status === "active" ? "paused" : "active",
        });

        const nextRecurring = await financeApi.listRecurring();
        setRecurringTransactions(nextRecurring);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError, recurringTransactions],
  );

  const deleteRecurring = useCallback(
    async (recurringId: string) => {
      try {
        await financeApi.deleteRecurring(recurringId);
        const nextRecurring = await financeApi.listRecurring();
        setRecurringTransactions(nextRecurring);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const addAccount = useCallback(
    async (input: AccountInput) => {
      try {
        const nextAccount = await financeApi.createAccount(input);
        setAccounts((current) => [nextAccount, ...current]);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const transferFunds = useCallback(
    async (input: TransferInput) => {
      try {
        await financeApi.transferFunds(input);
        const nextAccounts = await financeApi.listAccounts();
        setAccounts(nextAccounts);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const addCategory = useCallback(
    async (input: CategoryInput) => {
      try {
        const nextCategory = await financeApi.createCategory(input);
        setCategories((current) => [nextCategory, ...current]);
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const updateCategory = useCallback(
    async (categoryId: string, input: CategoryInput) => {
      try {
        const nextCategory = await financeApi.updateCategory(categoryId, input);
        setCategories((current) =>
          current.map((category) => (category.id === categoryId ? nextCategory : category)),
        );
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      try {
        await financeApi.deleteCategory(categoryId);
        const nextCategories = await financeApi.listCategories();
        setCategories(nextCategories);
        setBudgets((current) => current.filter((budget) => budget.categoryId !== categoryId));
        setError(null);
      } catch (cause) {
        handleError(cause);
        throw cause;
      }
    },
    [handleError],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      categories,
      accounts,
      transactions,
      budgets,
      goals,
      recurringTransactions,
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      isLoadingData,
      error,
      theme,
      setTheme,
      toggleTheme,
      budgetScope,
      clearError: () => setError(null),
      login,
      register,
      forgotPassword,
      logout,
      refreshData,
      loadBudgets,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      upsertBudget,
      addGoal,
      contributeToGoal,
      addRecurring,
      toggleRecurringStatus,
      deleteRecurring,
      addAccount,
      transferFunds,
      addCategory,
      updateCategory,
      deleteCategory,
    }),
    [
      categories,
      accounts,
      transactions,
      budgets,
      goals,
      recurringTransactions,
      user,
      isBootstrapping,
      isLoadingData,
      error,
      theme,
      setTheme,
      toggleTheme,
      budgetScope,
      login,
      register,
      forgotPassword,
      logout,
      refreshData,
      loadBudgets,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      upsertBudget,
      addGoal,
      contributeToGoal,
      addRecurring,
      toggleRecurringStatus,
      deleteRecurring,
      addAccount,
      transferFunds,
      addCategory,
      updateCategory,
      deleteCategory,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error("useFinance must be used inside FinanceProvider");
  }

  return context;
}
