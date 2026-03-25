import { FormEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import { useFinance } from "../context/FinanceContext";
import { Transaction, TransactionType } from "../types/finance";
import { formatCurrency, formatDate } from "../utils/formatters";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const createDefaultForm = () => ({
  type: "expense" as TransactionType,
  amount: "",
  date: todayIsoDate(),
  accountId: "",
  transferAccountId: "",
  categoryId: "",
  merchant: "",
  paymentMethod: "UPI",
  note: "",
  tags: "",
});

export default function TransactionsPage() {
  const {
    accounts,
    addTransaction,
    categories,
    deleteTransaction,
    isLoadingData,
    transactions,
    updateTransaction,
  } = useFinance();
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    accountId: "all",
    categoryId: "all",
    startDate: "",
    endDate: "",
  });
  const [form, setForm] = useState(createDefaultForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTransactions = useMemo(
    () =>
      transactions
        .filter((item) => {
          const matchesSearch =
            !filters.search ||
            item.merchant.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.note?.toLowerCase().includes(filters.search.toLowerCase());
          const matchesType = filters.type === "all" || item.type === filters.type;
          const matchesAccount =
            filters.accountId === "all" ||
            item.accountId === filters.accountId ||
            item.transferAccountId === filters.accountId;
          const matchesCategory =
            filters.categoryId === "all" || item.categoryId === filters.categoryId;
          const matchesStartDate = !filters.startDate || item.date >= filters.startDate;
          const matchesEndDate = !filters.endDate || item.date <= filters.endDate;

          return (
            matchesSearch &&
            matchesType &&
            matchesAccount &&
            matchesCategory &&
            matchesStartDate &&
            matchesEndDate
          );
        })
        .sort((left, right) => right.date.localeCompare(left.date)),
    [filters, transactions],
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm(createDefaultForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      date: transaction.date,
      accountId: transaction.accountId,
      transferAccountId: transaction.transferAccountId ?? "",
      categoryId: transaction.categoryId ?? "",
      merchant: transaction.merchant,
      paymentMethod: transaction.paymentMethod,
      note: transaction.note ?? "",
      tags: transaction.tags.join(", "),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(createDefaultForm());
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const isTransfer = form.type === "transfer";

    if (!form.accountId || amount <= 0 || !form.date || !form.merchant.trim()) {
      setFormError("Please provide account, amount, date, and merchant.");
      return;
    }

    if (isTransfer && (!form.transferAccountId || form.transferAccountId === form.accountId)) {
      setFormError("Select a valid destination account for transfer.");
      return;
    }

    if (!isTransfer && !form.categoryId) {
      setFormError("Please select a category.");
      return;
    }

    const payload = {
      accountId: form.accountId,
      transferAccountId: isTransfer ? form.transferAccountId : undefined,
      type: form.type,
      amount,
      date: form.date,
      categoryId: isTransfer ? undefined : form.categoryId || undefined,
      merchant: form.merchant.trim(),
      paymentMethod: form.paymentMethod.trim(),
      note: form.note.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateTransaction(editingId, payload);
      } else {
        await addTransaction(payload);
      }

      closeModal();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to save transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    setFormError(null);

    try {
      await deleteTransaction(transactionId);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to delete transaction.");
    }
  };

  return (
    <div className="page-grid">
      <SectionCard
        title="Transactions list"
        subtitle="Filter by date, type, category, account, or keyword just like the spec wireframe"
        action={
          <button className="primary-button" type="button" onClick={openCreateModal}>
            Add transaction
          </button>
        }
      >
        <div className="filters-grid filters-grid-wide">
          <input
            placeholder="Search merchant or note"
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
          />
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={filters.categoryId}
            onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filters.accountId}
            onChange={(event) => setFilters((current) => ({ ...current, accountId: event.target.value }))}
          >
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {isLoadingData ? <p>Refreshing transactions...</p> : null}
        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Account</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const account = accounts.find((item) => item.id === transaction.accountId);
                const transferAccount = accounts.find((item) => item.id === transaction.transferAccountId);
                const category = categories.find((item) => item.id === transaction.categoryId);

                return (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      <strong>{transaction.merchant}</strong>
                      <p>{transaction.note}</p>
                    </td>
                    <td>{category?.name ?? "Transfer"}</td>
                    <td>
                      {transaction.type === "transfer" && transferAccount
                        ? `${account?.name} -> ${transferAccount.name}`
                        : account?.name}
                    </td>
                    <td>
                      <span className="status-pill status-info">{transaction.type}</span>
                    </td>
                    <td className={transaction.type === "income" ? "amount-positive" : "amount-negative"}>
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button className="ghost-button" type="button" onClick={() => openEditModal(transaction)}>
                          Edit
                        </button>
                        <button
                          className="ghost-button danger-button"
                          type="button"
                          onClick={() => {
                            void handleDelete(transaction.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-card-header">
              <div>
                <h2>{editingId ? "Edit transaction" : "Add transaction"}</h2>
                <p>Use the same capture fields described in the product spec.</p>
              </div>
              <button className="ghost-button" type="button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <div className="form-grid-two">
                <label>
                  Type
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as TransactionType,
                        categoryId: event.target.value === "transfer" ? "" : current.categoryId,
                        transferAccountId: event.target.value === "transfer" ? current.transferAccountId : "",
                      }))
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
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
                  Date
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>

                <label>
                  Source account
                  <select
                    value={form.accountId}
                    onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                {form.type === "transfer" ? (
                  <label>
                    Destination account
                    <select
                      value={form.transferAccountId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, transferAccountId: event.target.value }))
                      }
                    >
                      <option value="">Select destination</option>
                      {accounts
                        .filter((account) => account.id !== form.accountId)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : (
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
                )}

                <label>
                  Merchant
                  <input
                    type="text"
                    placeholder="Employer Inc or Grocery Mart"
                    value={form.merchant}
                    onChange={(event) => setForm((current) => ({ ...current, merchant: event.target.value }))}
                  />
                </label>

                <label>
                  Payment method
                  <input
                    type="text"
                    value={form.paymentMethod}
                    onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                  />
                </label>

                <label>
                  Tags
                  <input
                    type="text"
                    placeholder="family, weekly"
                    value={form.tags}
                    onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  />
                </label>
              </div>

              <label>
                Note
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <div className="inline-actions align-end">
                <button className="ghost-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? editingId
                      ? "Updating..."
                      : "Saving..."
                    : editingId
                      ? "Update transaction"
                      : "Save transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
