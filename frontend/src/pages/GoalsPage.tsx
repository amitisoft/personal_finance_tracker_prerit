import { FormEvent, useEffect, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import SectionCard from "../components/SectionCard";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency, formatDate } from "../utils/formatters";

function defaultTargetDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export default function GoalsPage() {
  const { accounts, addGoal, contributeToGoal, goals, isLoadingData } = useFinance();
  const [contribution, setContribution] = useState({
    goalId: goals[0]?.id ?? "",
    amount: "5000",
  });
  const [goalForm, setGoalForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    targetDate: defaultTargetDate(),
    linkedAccountId: accounts[0]?.id ?? "",
    color: "#2563eb",
  });
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setContribution((current) => ({
      ...current,
      goalId: current.goalId || goals[0]?.id || "",
    }));
  }, [goals]);

  useEffect(() => {
    setGoalForm((current) => ({
      ...current,
      linkedAccountId: current.linkedAccountId || accounts[0]?.id || "",
    }));
  }, [accounts]);

  const handleGoalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!goalForm.name.trim() || Number(goalForm.targetAmount) <= 0 || !goalForm.targetDate) {
      setFormError("Name, target amount, and target date are required.");
      return;
    }

    setIsSubmittingGoal(true);

    try {
      await addGoal({
        name: goalForm.name.trim(),
        targetAmount: Number(goalForm.targetAmount),
        currentAmount: Number(goalForm.currentAmount) || 0,
        targetDate: goalForm.targetDate,
        linkedAccountId: goalForm.linkedAccountId || undefined,
        color: goalForm.color,
      });

      setGoalForm({
        name: "",
        targetAmount: "",
        currentAmount: "0",
        targetDate: defaultTargetDate(),
        linkedAccountId: accounts[0]?.id ?? "",
        color: "#2563eb",
      });
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to add goal.");
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleContribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!contribution.goalId || Number(contribution.amount) <= 0) {
      setFormError("Select a goal and contribution amount.");
      return;
    }

    setIsSubmittingContribution(true);

    try {
      await contributeToGoal(contribution.goalId, Number(contribution.amount));
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Failed to contribute to goal.");
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  return (
    <div className="two-column-layout">
      <SectionCard title="Goals screen" subtitle="Create savings goals and track progress toward each target">
        {isLoadingData ? <p>Refreshing goals...</p> : null}

        <div className="list-stack">
          {goals.map((goal) => {
            const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            const linkedAccount = accounts.find((account) => account.id === goal.linkedAccountId);

            return (
              <article key={goal.id} className="goal-card">
                <div className="metric-row">
                  <div>
                    <strong>{goal.name}</strong>
                    <span>
                      Due {formatDate(goal.targetDate)}{linkedAccount ? ` · ${linkedAccount.name}` : ""}
                    </span>
                  </div>
                  <span className="status-pill status-info">{goal.status}</span>
                </div>
                <p className="goal-amounts">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </p>
                <ProgressBar value={percent} tone="green" />
              </article>
            );
          })}
        </div>
      </SectionCard>

      <div className="page-grid compact-grid">
        <SectionCard title="Add goal" subtitle="Capture target amount, due date, and linked account">
          <form className="stack-form" onSubmit={handleGoalSubmit}>
            <label>
              Goal name
              <input
                type="text"
                placeholder="Emergency Fund"
                value={goalForm.name}
                onChange={(event) => setGoalForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Target amount
              <input
                min="0"
                step="100"
                type="number"
                value={goalForm.targetAmount}
                onChange={(event) =>
                  setGoalForm((current) => ({ ...current, targetAmount: event.target.value }))
                }
              />
            </label>
            <label>
              Current amount
              <input
                min="0"
                step="100"
                type="number"
                value={goalForm.currentAmount}
                onChange={(event) =>
                  setGoalForm((current) => ({ ...current, currentAmount: event.target.value }))
                }
              />
            </label>
            <label>
              Target date
              <input
                type="date"
                value={goalForm.targetDate}
                onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))}
              />
            </label>
            <label>
              Linked account
              <select
                value={goalForm.linkedAccountId}
                onChange={(event) =>
                  setGoalForm((current) => ({ ...current, linkedAccountId: event.target.value }))
                }
              >
                <option value="">No linked account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accent color
              <input
                type="color"
                value={goalForm.color}
                onChange={(event) => setGoalForm((current) => ({ ...current, color: event.target.value }))}
              />
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            <button className="primary-button" type="submit" disabled={isSubmittingGoal}>
              {isSubmittingGoal ? "Saving..." : "Add goal"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Contribute to goal" subtitle="Prototype contribution flow from the spec">
          <form className="stack-form" onSubmit={handleContribution}>
            <label>
              Goal
              <select
                value={contribution.goalId}
                onChange={(event) => setContribution((current) => ({ ...current, goalId: event.target.value }))}
              >
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                min="0"
                step="100"
                type="number"
                value={contribution.amount}
                onChange={(event) => setContribution((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>
            <button className="primary-button" type="submit" disabled={isSubmittingContribution}>
              {isSubmittingContribution ? "Saving..." : "Contribute now"}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
