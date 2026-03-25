export type TransactionType = "income" | "expense" | "transfer";
export type CategoryType = "income" | "expense";
export type AccountType = "bank" | "credit-card" | "cash" | "savings";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon?: string;
  archived?: boolean;
  system?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  institutionName: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  transferAccountId?: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId?: string;
  note?: string;
  merchant: string;
  paymentMethod: string;
  tags: string[];
}

export interface Budget {
  id: string;
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  alertThresholdPercent: number;
  actualSpent?: number;
  percentageUsed?: number;
  alertState?: "HEALTHY" | "WARNING" | "EXCEEDED" | "CRITICAL";
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  linkedAccountId?: string;
  color: string;
  status: "active" | "completed";
}

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  autoCreateTransaction: boolean;
  status: "active" | "paused";
}

export interface NotificationItem {
  id: string;
  kind: "warning" | "success" | "info";
  title: string;
  detail: string;
}
