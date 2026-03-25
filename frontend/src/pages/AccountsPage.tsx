import { FormEvent, useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import SummaryCard from "../components/SummaryCard";
import { useFinance } from "../context/FinanceContext";
import { AccountType } from "../types/finance";
import { formatCurrency } from "../utils/formatters";

interface AccountFormState {
  name: string;
  type: AccountType;
  institutionName: string;
  openingBalance: string;
}

interface TransferFormState {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
}

export default function AccountsPage() {
  const { accounts, addAccount, isLoadingData, transferFunds } = useFinance();
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    name: "",
    type: "bank",
    institutionName: "",
    openingBalance: "0",
  });
  const [transferForm, setTransferForm] = useState<TransferFormState>({
    sourceAccountId: accounts[0]?.id ?? "",
    destinationAccountId: accounts[1]?.id ?? "",
    amount: "",
  });
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setTransferForm((current) => ({
      ...current,
      sourceAccountId: current.sourceAccountId || accounts[0]?.id || "",
      destinationAccountId:
        current.destinationAccountId ||
        accounts.find((account) => account.id !== (current.sourceAccountId || accounts[0]?.id))?.id ||
        "",
    }));
  }, [accounts]);

  const total = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const liquid = accounts
    .filter((account) => account.type !== "credit-card")
    .reduce((sum, account) => sum + account.currentBalance, 0);

  const handleAddAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accountForm.name.trim()) {
      setFormError("Account name is required.");
      return;
    }

    setIsSubmittingAccount(true);

    try {
      await addAccount({
        name: accountForm.name.trim(),
        type: accountForm.type,
        institutionName: accountForm.institutionName.trim() || "Personal",
        openingBalance: Number(accountForm.openingBalance) || 0,
      });

      setAccountForm({
        name: "",
        type: "bank",
        institutionName: "",
        openingBalance: "0",
      });
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to add account.");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !transferForm.sourceAccountId ||
      !transferForm.destinationAccountId ||
      transferForm.sourceAccountId === transferForm.destinationAccountId ||
      Number(transferForm.amount) <= 0
    ) {
      setFormError("Choose source, destination, and amount.");
      return;
    }

    setIsSubmittingTransfer(true);

    try {
      await transferFunds({
        sourceAccountId: transferForm.sourceAccountId,
        destinationAccountId: transferForm.destinationAccountId,
        amount: Number(transferForm.amount),
      });

      setTransferForm((current) => ({
        ...current,
        amount: "",
      }));
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to transfer funds.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  return (
    <div className="page-grid">
      <div className="summary-grid">
        <SummaryCard title="Total balance" value={formatCurrency(total)} tone="positive" />
        <SummaryCard title="Liquid funds" value={formatCurrency(liquid)} tone="default" />
        <SummaryCard
          title="Tracked accounts"
          value={String(accounts.length)}
          tone="default"
          trend="Bank, cash, savings, and card"
        />
      </div>

      <div className="two-column-layout">
        <SectionCard title="Accounts and wallets" subtitle="Balances by bank, cash, savings, and credit source">
          {isLoadingData ? <p>Refreshing accounts...</p> : null}

          <div className="account-grid account-grid-two">
            {accounts.map((account) => (
              <article key={account.id} className="account-card">
                <span className="eyebrow">{account.type}</span>
                <strong>{account.name}</strong>
                <p>{account.institutionName}</p>
                <h3>{formatCurrency(account.currentBalance)}</h3>
                <span>Opening {formatCurrency(account.openingBalance)}</span>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="page-grid compact-grid">
          <SectionCard title="Add account" subtitle="Create a bank, wallet, savings, or credit account">
            <form className="stack-form" onSubmit={handleAddAccount}>
              <label>
                Account name
                <input
                  type="text"
                  placeholder="Salary Account"
                  value={accountForm.name}
                  onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Type
                <select
                  value={accountForm.type}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      type: event.target.value as AccountType,
                    }))
                  }
                >
                  <option value="bank">Bank</option>
                  <option value="credit-card">Credit card</option>
                  <option value="cash">Cash</option>
                  <option value="savings">Savings</option>
                </select>
              </label>
              <label>
                Institution
                <input
                  type="text"
                  placeholder="HDFC Bank"
                  value={accountForm.institutionName}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, institutionName: event.target.value }))
                  }
                />
              </label>
              <label>
                Opening balance
                <input
                  step="0.01"
                  type="number"
                  value={accountForm.openingBalance}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, openingBalance: event.target.value }))
                  }
                />
              </label>
              <button className="primary-button" type="submit" disabled={isSubmittingAccount}>
                {isSubmittingAccount ? "Saving..." : "Save account"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Transfer funds" subtitle="Move money between tracked accounts">
            <form className="stack-form" onSubmit={handleTransfer}>
              <label>
                From
                <select
                  value={transferForm.sourceAccountId}
                  onChange={(event) =>
                    setTransferForm((current) => ({ ...current, sourceAccountId: event.target.value }))
                  }
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                To
                <select
                  value={transferForm.destinationAccountId}
                  onChange={(event) =>
                    setTransferForm((current) => ({ ...current, destinationAccountId: event.target.value }))
                  }
                >
                  {accounts
                    .filter((account) => account.id !== transferForm.sourceAccountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
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
                  value={transferForm.amount}
                  onChange={(event) => setTransferForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <button className="primary-button" type="submit" disabled={isSubmittingTransfer}>
                {isSubmittingTransfer ? "Transferring..." : "Transfer now"}
              </button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
