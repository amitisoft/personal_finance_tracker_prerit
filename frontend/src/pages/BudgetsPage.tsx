import { FormEvent, useEffect, useMemo, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import SectionCard from "../components/SectionCard";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency } from "../utils/formatters";

export default function BudgetsPage() {
  const {
    budgetScope,
    budgets,
    categories,
    isLoadingData,
    loadBudgets,
    upsertBudget,
  } = useFinance();
  const [viewMonth, setViewMonth] = useState(String(budgetScope.month));
  const [viewYear, setViewYear] = useState(String(budgetScope.year));
  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    month: String(budgetScope.month),
    year: String(budgetScope.year),
    alertThresholdPercent: "80",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setViewMonth(String(budgetScope.month));
    setViewYear(String(budgetScope.year));
    setForm((current) => ({
      ...current,
      month: String(budgetScope.month),
      year: String(budgetScope.year),
    }));
  }, [budgetScope.month, budgetScope.year]);

  const budgetRows = useMemo(
    () =>
      budgets.map((budget) => {
        const category = categories.find((item) => item.id === budget.categoryId);

        return {
          ...budget,
          category,
          spent: budget.actualSpent ?? 0,
          percent: budget.percentageUsed ?? 0,
        };
      }),
    [budgets, categories],
  );

  const handleViewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const month = Number(viewMonth);
    const year = Number(viewYear);

    if (month < 1 || month > 12 || year < 2000) {
      setFormError("Please select a valid month and year.");
      return;
    }

    try {
      await loadBudgets(month, year);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to load budgets.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.categoryId || Number(form.amount) <= 0) {
      setFormError("Please select category and amount.");
      return;
    }

    setIsSubmitting(true);

    try {
      await upsertBudget({
        categoryId: form.categoryId,
        amount: Number(form.amount),
        month: Number(form.month),
        year: Number(form.year),
        alertThresholdPercent: Number(form.alertThresholdPercent),
      });

      setForm({
        categoryId: "",
        amount: "",
        month: form.month,
        year: form.year,
        alertThresholdPercent: "80",
      });
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to save budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="two-column-layout">
      <SectionCard title="Monthly budgets" subtitle="Budget vs actual spending with threshold awareness">
        <form className="filters-grid filters-grid-wide" onSubmit={handleViewSubmit}>
          <label>
            Month
            <input
              max="12"
              min="1"
              type="number"
              value={viewMonth}
              onChange={(event) => setViewMonth(event.target.value)}
            />
          </label>
          <label>
            Year
            <input
              min="2000"
              type="number"
              value={viewYear}
              onChange={(event) => setViewYear(event.target.value)}
            />
          </label>
          <button className="ghost-button" type="submit">
            Load
          </button>
        </form>

        {isLoadingData ? <p>Refreshing budgets...</p> : null}

        <div className="list-stack">
          {budgetRows.map((budget) => (
            <article key={budget.id} className="budget-card">
              <div className="metric-row">
                <div>
                  <strong>{budget.category?.name}</strong>
                  <span>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <span
                  className={`status-pill ${
                    budget.percent >= 100 ? "status-danger" : budget.percent >= 80 ? "status-warning" : "status-info"
                  }`}
                >
                  {budget.percent}%
                </span>
              </div>
              <ProgressBar
                value={budget.percent}
                tone={budget.percent >= 100 ? "red" : budget.percent >= 80 ? "amber" : "blue"}
              />
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Set or update budget" subtitle="One budget per category per month">
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(event) =>
                setForm((current) => ({ ...current, categoryId: event.target.value }))
              }
            >
              <option value="">Select category</option>
              {categories
                .filter((category) => category.type === "expense")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Amount
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
            />
          </label>
          <label>
            Month
            <input
              max="12"
              min="1"
              type="number"
              value={form.month}
              onChange={(event) =>
                setForm((current) => ({ ...current, month: event.target.value }))
              }
            />
          </label>
          <label>
            Year
            <input
              min="2000"
              type="number"
              value={form.year}
              onChange={(event) =>
                setForm((current) => ({ ...current, year: event.target.value }))
              }
            />
          </label>
          <label>
            Alert threshold
            <select
              value={form.alertThresholdPercent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  alertThresholdPercent: event.target.value,
                }))
              }
            >
              <option value="80">80%</option>
              <option value="100">100%</option>
              <option value="120">120%</option>
            </select>
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save budget"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
