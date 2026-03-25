import { FormEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import { useFinance } from "../context/FinanceContext";
import { CategoryType } from "../types/finance";

interface CategoryFormState {
  name: string;
  type: CategoryType;
  color: string;
}

const defaultForm: CategoryFormState = {
  name: "",
  type: "expense",
  color: "#3b82f6",
};

export default function CategoriesPage() {
  const {
    addCategory,
    budgets,
    categories,
    deleteCategory,
    isLoadingData,
    recurringTransactions,
    transactions,
    updateCategory,
  } = useFinance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categoryRows = useMemo(
    () =>
      categories.map((category) => {
        const transactionCount = transactions.filter((item) => item.categoryId === category.id).length;
        const budgetCount = budgets.filter((item) => item.categoryId === category.id).length;
        const recurringCount = recurringTransactions.filter((item) => item.categoryId === category.id).length;

        return {
          ...category,
          usageCount: transactionCount + budgetCount + recurringCount,
        };
      }),
    [budgets, categories, recurringTransactions, transactions],
  );

  const groupedRows = useMemo(
    () => ({
      income: categoryRows.filter((category) => category.type === "income"),
      expense: categoryRows.filter((category) => category.type === "expense"),
    }),
    [categoryRows],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      color: form.color,
    };

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await addCategory(payload);
      }

      setEditingId(null);
      setForm(defaultForm);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to save category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);

    if (!category) {
      return;
    }

    setEditingId(categoryId);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color,
    });
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to delete category.");
    }
  };

  return (
    <div className="two-column-layout">
      <SectionCard
        title="Categories"
        subtitle="Manage income and expense labels used across transactions, budgets, and recurring items"
      >
        {isLoadingData ? <p>Refreshing categories...</p> : null}

        <div className="list-stack">
          {(["expense", "income"] as const).map((group) => (
            <div key={group} className="category-group">
              <div className="metric-row">
                <div>
                  <strong>{group === "expense" ? "Expense categories" : "Income categories"}</strong>
                  <span>
                    {group === "expense"
                      ? "Default spend buckets for the dashboard, budgets, and reports"
                      : "Income sources for salary, freelance work, and bonuses"}
                  </span>
                </div>
                <span className="status-pill status-info">{groupedRows[group].length}</span>
              </div>

              <div className="list-stack compact-stack">
                {groupedRows[group].map((category) => (
                  <article key={category.id} className="category-card">
                    <div className="metric-row">
                      <div className="category-meta">
                        <span
                          className="category-dot"
                          aria-hidden="true"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <strong>{category.name}</strong>
                          <span>{category.usageCount} linked records</span>
                        </div>
                      </div>

                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => startEdit(category.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="ghost-button danger-button"
                          type="button"
                          onClick={() => {
                            void handleDelete(category.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={editingId ? "Edit category" : "Add category"}
        subtitle="Spec-aligned category CRUD for finance tagging"
      >
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              placeholder="Food"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as CategoryType,
                }))
              }
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>

          <label>
            Color
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            />
          </label>

          {formError ? <p className="form-error">{formError}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : editingId ? "Update category" : "Save category"}
          </button>

          {editingId ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(defaultForm);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </form>
      </SectionCard>
    </div>
  );
}
