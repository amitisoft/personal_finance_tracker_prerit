import { FormEvent, useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { useFinance } from "../context/FinanceContext";
import { RecurringFrequency, TransactionType } from "../types/finance";
import { formatCurrency, formatDate } from "../utils/formatters";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

interface RecurringFormState {
  title: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  autoCreateTransaction: boolean;
}

export default function RecurringPage() {
  const {
    accounts,
    addRecurring,
    categories,
    deleteRecurring,
    isLoadingData,
    recurringTransactions,
    toggleRecurringStatus,
  } = useFinance();
  const [form, setForm] = useState<RecurringFormState>({
    title: "",
    type: "expense",
    amount: "",
    categoryId: "",
    accountId: accounts[0]?.id ?? "",
    frequency: "monthly",
    nextRunDate: todayIsoDate(),
    autoCreateTransaction: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      accountId: current.accountId || accounts[0]?.id || "",
    }));
  }, [accounts]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim() || !form.accountId || Number(form.amount) <= 0) {
      setFormError("Title, account, and amount are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addRecurring({
        title: form.title.trim(),
        type: form.type,
        amount: Number(form.amount),
        categoryId: form.categoryId || undefined,
        accountId: form.accountId,
        frequency: form.frequency,
        nextRunDate: form.nextRunDate,
        autoCreateTransaction: form.autoCreateTransaction,
      });

      setForm({
        title: "",
        type: "expense",
        amount: "",
        categoryId: "",
        accountId: accounts[0]?.id ?? "",
        frequency: "monthly",
        nextRunDate: todayIsoDate(),
        autoCreateTransaction: true,
      });
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to save recurring item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleRecurringStatus(id);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to update recurring status.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurring(id);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to delete recurring item.");
    }
  };

  return (
    <div className="two-column-layout">
      <SectionCard title="Recurring screen" subtitle="Upcoming subscriptions, salaries, and fixed bills">
        {isLoadingData ? <p>Refreshing recurring items...</p> : null}

        <div className="list-stack">
          {recurringTransactions.map((item) => {
            const account = accounts.find((entry) => entry.id === item.accountId);
            const category = categories.find((entry) => entry.id === item.categoryId);

            return (
              <article key={item.id} className="recurring-card">
                <div className="metric-row">
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.frequency} via {account?.name}
                    </span>
                  </div>
                  <span className={`status-pill ${item.status === "active" ? "status-info" : "status-warning"}`}>
                    {item.status}
                  </span>
                </div>
                <p>
                  {category?.name ?? "Uncategorized"} · {formatCurrency(item.amount)} · Next run {formatDate(item.nextRunDate)}
                </p>
                <div className="inline-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      void handleToggleStatus(item.id);
                    }}
                  >
                    {item.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    onClick={() => {
                      void handleDelete(item.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="New recurring item" subtitle="Create subscription, bill, or recurring salary">
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              placeholder="Spotify or House Rent"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as TransactionType,
                }))
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label>
            Amount
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </label>
          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Select category</option>
              {categories
                .filter((category) => category.type === (form.type === "income" ? "income" : "expense"))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Account
            <select
              value={form.accountId}
              onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Frequency
            <select
              value={form.frequency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  frequency: event.target.value as RecurringFrequency,
                }))
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label>
            Next run date
            <input
              type="date"
              value={form.nextRunDate}
              onChange={(event) => setForm((current) => ({ ...current, nextRunDate: event.target.value }))}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.autoCreateTransaction}
              onChange={(event) =>
                setForm((current) => ({ ...current, autoCreateTransaction: event.target.checked }))
              }
            />
            Auto-create transaction
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save recurring item"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
