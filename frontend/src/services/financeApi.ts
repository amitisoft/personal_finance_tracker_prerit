import {
  Account,
  AccountType,
  Budget,
  Category,
  CategoryType,
  Goal,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "../types/finance";
import {
  apiRequest,
  setAuthSession,
  type AuthSession,
} from "./apiClient";

type BackendCategoryType = "INCOME" | "EXPENSE";
type BackendTransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
type BackendAccountType = "BANK_ACCOUNT" | "CREDIT_CARD" | "CASH_WALLET" | "SAVINGS_ACCOUNT";
type BackendRecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type BackendRecurringStatus = "ACTIVE" | "PAUSED";
type BackendGoalStatus = "ACTIVE" | "COMPLETED";

interface BackendPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

interface BackendTransactionResponse {
  id: string;
  type: BackendTransactionType;
  amount: number;
  date: string;
  accountId: string;
  categoryId: string | null;
  destinationAccountId: string | null;
  merchant: string | null;
  note: string | null;
  paymentMethod: string | null;
  recurringTransactionId: string | null;
  tags: string[] | null;
}

interface BackendCategoryResponse {
  id: string;
  name: string;
  type: BackendCategoryType;
  color: string | null;
  icon: string | null;
  archived: boolean;
  system: boolean;
}

interface BackendAccountResponse {
  id: string;
  name: string;
  type: BackendAccountType;
  openingBalance: number;
  currentBalance: number;
  institutionName: string | null;
}

interface BackendBudgetResponse {
  id: string;
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  actualSpent: number;
  percentageUsed: number;
  alertState: "HEALTHY" | "WARNING" | "EXCEEDED" | "CRITICAL";
}

interface BackendGoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  linkedAccountId: string | null;
  icon: string | null;
  color: string | null;
  status: BackendGoalStatus;
  progressPercent: number;
}

interface BackendRecurringResponse {
  id: string;
  title: string;
  type: BackendTransactionType;
  amount: number;
  categoryId: string | null;
  accountId: string;
  frequency: BackendRecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  autoCreateTransaction: boolean;
  status: BackendRecurringStatus;
}

interface BackendDashboardResponse {
  monthIncome: number;
  monthExpense: number;
  netBalance: number;
  budgets: BackendBudgetResponse[];
  categorySpending: Array<{ categoryId: string; amount: number }>;
  recentTransactions: BackendTransactionResponse[];
  upcomingRecurring: BackendRecurringResponse[];
  goals: BackendGoalResponse[];
}

interface BackendCategorySpendReport {
  categoryId: string;
  amount: number;
}

interface BackendIncomeExpensePoint {
  period: string;
  income: number;
  expense: number;
}

interface BackendAccountBalancePoint {
  period: string;
  accountId: string;
  netChange: number;
}

export interface TransactionInput {
  accountId: string;
  transferAccountId?: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId?: string;
  merchant: string;
  paymentMethod: string;
  note?: string;
  tags: string[];
}

export interface BudgetInput {
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  alertThresholdPercent: number;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  linkedAccountId?: string;
  color: string;
}

export interface RecurringInput {
  title: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  autoCreateTransaction: boolean;
  status?: "active" | "paused";
}

export interface AccountInput {
  name: string;
  type: AccountType;
  openingBalance: number;
  institutionName: string;
}

export interface TransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  color: string;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
}

export interface DashboardData {
  monthIncome: number;
  monthExpense: number;
  netBalance: number;
  budgets: Budget[];
  categorySpending: Array<{ categoryId: string; amount: number }>;
  recentTransactions: Transaction[];
  upcomingRecurring: RecurringTransaction[];
  goals: Goal[];
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
}

export interface CategorySpendReport {
  categoryId: string;
  amount: number;
}

export interface IncomeExpensePoint {
  period: string;
  income: number;
  expense: number;
}

export interface AccountBalancePoint {
  period: string;
  accountId: string;
  netChange: number;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toBackendCategoryType(type: CategoryType): BackendCategoryType {
  return type.toUpperCase() as BackendCategoryType;
}

function fromBackendCategoryType(type: BackendCategoryType): CategoryType {
  return type.toLowerCase() as CategoryType;
}

function toBackendTransactionType(type: TransactionType): BackendTransactionType {
  return type.toUpperCase() as BackendTransactionType;
}

function fromBackendTransactionType(type: BackendTransactionType): TransactionType {
  return type.toLowerCase() as TransactionType;
}

function toBackendAccountType(type: AccountType): BackendAccountType {
  switch (type) {
    case "bank":
      return "BANK_ACCOUNT";
    case "credit-card":
      return "CREDIT_CARD";
    case "cash":
      return "CASH_WALLET";
    case "savings":
      return "SAVINGS_ACCOUNT";
  }
}

function fromBackendAccountType(type: BackendAccountType): AccountType {
  switch (type) {
    case "BANK_ACCOUNT":
      return "bank";
    case "CREDIT_CARD":
      return "credit-card";
    case "CASH_WALLET":
      return "cash";
    case "SAVINGS_ACCOUNT":
      return "savings";
  }
}

function toBackendRecurringFrequency(frequency: RecurringFrequency): BackendRecurringFrequency {
  return frequency.toUpperCase() as BackendRecurringFrequency;
}

function fromBackendRecurringFrequency(frequency: BackendRecurringFrequency): RecurringFrequency {
  return frequency.toLowerCase() as RecurringFrequency;
}

function toBackendRecurringStatus(status: "active" | "paused" | undefined): BackendRecurringStatus | undefined {
  if (!status) {
    return undefined;
  }

  return status.toUpperCase() as BackendRecurringStatus;
}

function fromBackendRecurringStatus(status: BackendRecurringStatus): "active" | "paused" {
  return status.toLowerCase() as "active" | "paused";
}

function mapAuthResponse(response: BackendAuthResponse): AuthSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    refreshExpiresAt: response.refreshExpiresAt,
    user: response.user,
  };
}

function mapTransaction(response: BackendTransactionResponse): Transaction {
  return {
    id: response.id,
    accountId: response.accountId,
    transferAccountId: response.destinationAccountId ?? undefined,
    type: fromBackendTransactionType(response.type),
    amount: Number(response.amount),
    date: response.date,
    categoryId: response.categoryId ?? undefined,
    merchant: response.merchant ?? "Transaction",
    paymentMethod: response.paymentMethod ?? "",
    note: response.note ?? undefined,
    tags: response.tags ?? [],
  };
}

function mapCategory(response: BackendCategoryResponse): Category {
  return {
    id: response.id,
    name: response.name,
    type: fromBackendCategoryType(response.type),
    color: response.color ?? (response.type === "INCOME" ? "#16a34a" : "#2563eb"),
    icon: response.icon ?? undefined,
    archived: response.archived,
    system: response.system,
  };
}

function mapAccount(response: BackendAccountResponse): Account {
  return {
    id: response.id,
    name: response.name,
    type: fromBackendAccountType(response.type),
    openingBalance: Number(response.openingBalance),
    currentBalance: Number(response.currentBalance),
    institutionName: response.institutionName ?? "Personal",
  };
}

function mapBudget(response: BackendBudgetResponse): Budget {
  return {
    id: response.id,
    categoryId: response.categoryId,
    month: response.month,
    year: response.year,
    amount: Number(response.amount),
    alertThresholdPercent: 80,
    actualSpent: Number(response.actualSpent),
    percentageUsed: response.percentageUsed,
    alertState: response.alertState,
  };
}

function mapGoal(response: BackendGoalResponse): Goal {
  return {
    id: response.id,
    name: response.name,
    targetAmount: Number(response.targetAmount),
    currentAmount: Number(response.currentAmount),
    targetDate: response.targetDate ?? todayIsoDate(),
    linkedAccountId: response.linkedAccountId ?? undefined,
    color: response.color ?? "#2563eb",
    status: response.status.toLowerCase() as "active" | "completed",
  };
}

function mapRecurring(response: BackendRecurringResponse): RecurringTransaction {
  return {
    id: response.id,
    title: response.title,
    type: fromBackendTransactionType(response.type),
    amount: Number(response.amount),
    categoryId: response.categoryId ?? undefined,
    accountId: response.accountId,
    frequency: fromBackendRecurringFrequency(response.frequency),
    nextRunDate: response.nextRunDate,
    autoCreateTransaction: response.autoCreateTransaction,
    status: fromBackendRecurringStatus(response.status),
  };
}

function transactionPayload(input: TransactionInput) {
  return {
    type: toBackendTransactionType(input.type),
    amount: input.amount,
    date: input.date,
    accountId: input.accountId,
    categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
    destinationAccountId: input.type === "transfer" ? input.transferAccountId ?? null : null,
    merchant: input.merchant,
    note: input.note ?? null,
    paymentMethod: input.paymentMethod,
    recurringTransactionId: null,
    tags: input.tags,
  };
}

function recurringPayload(input: RecurringInput) {
  return {
    title: input.title,
    type: toBackendTransactionType(input.type),
    amount: input.amount,
    categoryId: input.categoryId ?? null,
    accountId: input.accountId,
    frequency: toBackendRecurringFrequency(input.frequency),
    startDate: input.nextRunDate,
    endDate: null,
    autoCreateTransaction: input.autoCreateTransaction,
    status: toBackendRecurringStatus(input.status),
  };
}

export const financeApi = {
  async register(payload: { email: string; password: string; displayName: string }) {
    const response = await apiRequest<BackendAuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { auth: false },
    );

    const session = mapAuthResponse(response);
    setAuthSession(session);
    return session;
  },

  async login(payload: { email: string; password: string }) {
    const response = await apiRequest<BackendAuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { auth: false },
    );

    const session = mapAuthResponse(response);
    setAuthSession(session);
    return session;
  },

  async forgotPassword(email: string) {
    return apiRequest<{ message: string }>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
      { auth: false },
    );
  },

  async resetPassword(payload: { token: string; newPassword: string }) {
    return apiRequest<{ message: string }>(
      "/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { auth: false },
    );
  },

  async getDashboard(): Promise<DashboardData> {
    const response = await apiRequest<BackendDashboardResponse>("/api/dashboard");

    return {
      monthIncome: Number(response.monthIncome),
      monthExpense: Number(response.monthExpense),
      netBalance: Number(response.netBalance),
      budgets: response.budgets.map(mapBudget),
      categorySpending: response.categorySpending.map((item) => ({
        categoryId: item.categoryId,
        amount: Number(item.amount),
      })),
      recentTransactions: response.recentTransactions.map(mapTransaction),
      upcomingRecurring: response.upcomingRecurring.map(mapRecurring),
      goals: response.goals.map(mapGoal),
    };
  },

  async listTransactionsPage(filters: TransactionFilters & { page?: number; size?: number } = {}) {
    const query = buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId,
      categoryId: filters.categoryId,
      type: filters.type ? toBackendTransactionType(filters.type) : undefined,
      search: filters.search,
      page: filters.page ?? 0,
      size: filters.size ?? 100,
    });

    const response = await apiRequest<BackendPageResponse<BackendTransactionResponse>>(
      `/api/transactions${query}`,
    );

    return {
      items: response.content.map(mapTransaction),
      totalElements: response.totalElements,
      totalPages: response.totalPages,
      page: response.page,
      size: response.size,
    };
  },

  async listAllTransactions(filters: TransactionFilters = {}) {
    const first = await this.listTransactionsPage({ ...filters, page: 0, size: 100 });

    if (first.totalPages <= 1) {
      return first.items;
    }

    const pages = await Promise.all(
      Array.from({ length: first.totalPages - 1 }, (_, index) =>
        this.listTransactionsPage({ ...filters, page: index + 1, size: 100 }),
      ),
    );

    return [first.items, ...pages.map((page) => page.items)].flat();
  },

  async createTransaction(input: TransactionInput) {
    const response = await apiRequest<BackendTransactionResponse>(
      "/api/transactions",
      {
        method: "POST",
        body: JSON.stringify(transactionPayload(input)),
      },
    );

    return mapTransaction(response);
  },

  async updateTransaction(id: string, input: TransactionInput) {
    const response = await apiRequest<BackendTransactionResponse>(
      `/api/transactions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(transactionPayload(input)),
      },
    );

    return mapTransaction(response);
  },

  async deleteTransaction(id: string) {
    await apiRequest<void>(
      `/api/transactions/${id}`,
      {
        method: "DELETE",
      },
    );
  },

  async listCategories() {
    const response = await apiRequest<BackendCategoryResponse[]>("/api/categories");
    return response.map(mapCategory).filter((category) => !category.archived);
  },

  async createCategory(input: CategoryInput) {
    const response = await apiRequest<BackendCategoryResponse>(
      "/api/categories",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          type: toBackendCategoryType(input.type),
          color: input.color,
          icon: null,
        }),
      },
    );

    return mapCategory(response);
  },

  async updateCategory(id: string, input: CategoryInput) {
    const response = await apiRequest<BackendCategoryResponse>(
      `/api/categories/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: input.name,
          type: toBackendCategoryType(input.type),
          color: input.color,
          icon: null,
        }),
      },
    );

    return mapCategory(response);
  },

  async deleteCategory(id: string) {
    await apiRequest<void>(
      `/api/categories/${id}`,
      {
        method: "DELETE",
      },
    );
  },

  async listAccounts() {
    const response = await apiRequest<BackendAccountResponse[]>("/api/accounts");
    return response.map(mapAccount);
  },

  async createAccount(input: AccountInput) {
    const response = await apiRequest<BackendAccountResponse>(
      "/api/accounts",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          type: toBackendAccountType(input.type),
          openingBalance: input.openingBalance,
          institutionName: input.institutionName,
        }),
      },
    );

    return mapAccount(response);
  },

  async updateAccount(id: string, input: AccountInput) {
    const response = await apiRequest<BackendAccountResponse>(
      `/api/accounts/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: input.name,
          type: toBackendAccountType(input.type),
          openingBalance: input.openingBalance,
          institutionName: input.institutionName,
        }),
      },
    );

    return mapAccount(response);
  },

  async transferFunds(input: TransferInput) {
    await apiRequest<BackendAccountResponse>(
      "/api/accounts/transfer",
      {
        method: "POST",
        body: JSON.stringify({
          fromAccountId: input.sourceAccountId,
          toAccountId: input.destinationAccountId,
          amount: input.amount,
        }),
      },
    );
  },

  async listBudgets(month: number, year: number) {
    const query = buildQuery({ month, year });
    const response = await apiRequest<BackendBudgetResponse[]>(`/api/budgets${query}`);
    return response.map(mapBudget);
  },

  async createBudget(input: BudgetInput) {
    const response = await apiRequest<BackendBudgetResponse>(
      "/api/budgets",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return mapBudget(response);
  },

  async updateBudget(id: string, input: BudgetInput) {
    const response = await apiRequest<BackendBudgetResponse>(
      `/api/budgets/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );

    return mapBudget(response);
  },

  async deleteBudget(id: string) {
    await apiRequest<void>(`/api/budgets/${id}`, { method: "DELETE" });
  },

  async listGoals() {
    const response = await apiRequest<BackendGoalResponse[]>("/api/goals");
    return response.map(mapGoal);
  },

  async createGoal(input: GoalInput) {
    const response = await apiRequest<BackendGoalResponse>(
      "/api/goals",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          targetAmount: input.targetAmount,
          targetDate: input.targetDate,
          linkedAccountId: input.linkedAccountId ?? null,
          icon: null,
          color: input.color,
        }),
      },
    );

    return mapGoal(response);
  },

  async updateGoal(id: string, input: GoalInput) {
    const response = await apiRequest<BackendGoalResponse>(
      `/api/goals/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: input.name,
          targetAmount: input.targetAmount,
          targetDate: input.targetDate,
          linkedAccountId: input.linkedAccountId ?? null,
          icon: null,
          color: input.color,
        }),
      },
    );

    return mapGoal(response);
  },

  async contributeToGoal(goalId: string, amount: number, accountId?: string) {
    const response = await apiRequest<BackendGoalResponse>(
      `/api/goals/${goalId}/contribute`,
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          accountId: accountId ?? null,
        }),
      },
    );

    return mapGoal(response);
  },

  async withdrawFromGoal(goalId: string, amount: number, accountId?: string) {
    const response = await apiRequest<BackendGoalResponse>(
      `/api/goals/${goalId}/withdraw`,
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          accountId: accountId ?? null,
        }),
      },
    );

    return mapGoal(response);
  },

  async listRecurring() {
    const response = await apiRequest<BackendRecurringResponse[]>("/api/recurring");
    return response.map(mapRecurring);
  },

  async createRecurring(input: RecurringInput) {
    const response = await apiRequest<BackendRecurringResponse>(
      "/api/recurring",
      {
        method: "POST",
        body: JSON.stringify(recurringPayload(input)),
      },
    );

    return mapRecurring(response);
  },

  async updateRecurring(id: string, input: RecurringInput) {
    const response = await apiRequest<BackendRecurringResponse>(
      `/api/recurring/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(recurringPayload(input)),
      },
    );

    return mapRecurring(response);
  },

  async deleteRecurring(id: string) {
    await apiRequest<void>(`/api/recurring/${id}`, { method: "DELETE" });
  },

  async getCategorySpendReport(filters: ReportFilters) {
    const query = buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId,
    });

    const response = await apiRequest<BackendCategorySpendReport[]>(
      `/api/reports/category-spend${query}`,
    );

    return response.map((item) => ({
      categoryId: item.categoryId,
      amount: Number(item.amount),
    }));
  },

  async getIncomeVsExpenseReport(filters: ReportFilters) {
    const query = buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId,
    });

    const response = await apiRequest<BackendIncomeExpensePoint[]>(
      `/api/reports/income-vs-expense${query}`,
    );

    return response.map((item) => ({
      period: item.period,
      income: Number(item.income),
      expense: Number(item.expense),
    }));
  },

  async getAccountBalanceTrendReport(filters: ReportFilters) {
    const query = buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });

    const response = await apiRequest<BackendAccountBalancePoint[]>(
      `/api/reports/account-balance-trend${query}`,
    );

    return response.map((item) => ({
      period: item.period,
      accountId: item.accountId,
      netChange: Number(item.netChange),
    }));
  },

  async exportTransactionsCsv(filters: ReportFilters) {
    const query = buildQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      accountId: filters.accountId,
      categoryId: filters.categoryId,
      type: filters.type ? toBackendTransactionType(filters.type) : undefined,
      format: "csv",
    });

    return apiRequest<Blob>(
      `/api/reports/transactions/export${query}`,
      {
        method: "GET",
      },
      {
        responseType: "blob",
      },
    );
  },
};
