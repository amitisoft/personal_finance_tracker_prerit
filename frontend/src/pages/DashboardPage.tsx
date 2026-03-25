import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleBarChart from "../components/SimpleBarChart";
import SimpleTrendChart from "../components/SimpleTrendChart";
import SummaryCard from "../components/SummaryCard";
import { useFinance } from "../context/FinanceContext";
import { financeApi, type DashboardData, type IncomeExpensePoint } from "../services/financeApi";
import { toErrorMessage } from "../services/apiClient";
import { formatCompactCurrency, formatCurrency, formatShortDate } from "../utils/formatters";

function formatMonthLabel(period: string) {
  const [year, month] = period.split("-");
  const value = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(value);
}

function previousMonthsStart(monthCount: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthCount);
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { categories, isLoadingData } = useFinance();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<Array<{ label: string; income: number; expense: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const [dashboardData, trendPoints] = await Promise.all([
          financeApi.getDashboard(),
          financeApi.getIncomeVsExpenseReport({
            dateFrom: previousMonthsStart(5),
          }),
        ]);

        if (cancelled) {
          return;
        }

        setDashboard(dashboardData);
        setTrendData(
          trendPoints.map((item: IncomeExpensePoint) => ({
            label: formatMonthLabel(item.period),
            income: item.income,
            expense: item.expense,
          })),
        );
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(toErrorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const categorySpend = useMemo(
    () =>
      (dashboard?.categorySpending ?? [])
        .map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          return {
            label: category?.name ?? "Uncategorized",
            value: item.amount,
            color: category?.color ?? "#3b82f6",
          };
        })
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, 5),
    [categories, dashboard?.categorySpending],
  );

  const alerts = useMemo(() => {
    if (!dashboard) {
      return [] as Array<{ id: string; kind: "warning" | "success" | "info"; title: string; detail: string }>;
    }

    const budgetAlerts = dashboard.budgets
      .filter((budget) => budget.alertState && budget.alertState !== "HEALTHY")
      .slice(0, 2)
      .map((budget) => {
        const category = categories.find((item) => item.id === budget.categoryId);
        const detail = `${category?.name ?? "Category"} is at ${budget.percentageUsed ?? 0}% this month`;

        return {
          id: `budget-${budget.id}`,
          kind: "warning" as const,
          title: "Budget threshold reached",
          detail,
        };
      });

    const goalAlerts = dashboard.goals
      .filter((goal) => goal.status === "completed")
      .slice(0, 1)
      .map((goal) => ({
        id: `goal-${goal.id}`,
        kind: "success" as const,
        title: "Goal completed",
        detail: `${goal.name} has reached the target amount.`,
      }));

    const recurringAlerts = dashboard.upcomingRecurring.slice(0, 1).map((item) => ({
      id: `rec-${item.id}`,
      kind: "info" as const,
      title: "Upcoming recurring payment",
      detail: `${item.title} is scheduled on ${formatShortDate(item.nextRunDate)}.`,
    }));

    return [...budgetAlerts, ...goalAlerts, ...recurringAlerts];
  }, [categories, dashboard]);

  if (loading || isLoadingData) {
    return (
      <div className="page-grid">
        <SectionCard title="Dashboard" subtitle="Loading current summary from APIs">
          <p>Syncing dashboard data...</p>
        </SectionCard>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page-grid">
        <SectionCard title="Dashboard" subtitle="Unable to load dashboard data">
          <p>{error ?? "Failed to load dashboard."}</p>
        </SectionCard>
      </div>
    );
  }

  const accountBalance = dashboard.netBalance;

  return (
    <div className="page-grid">
      <div className="summary-grid">
        <SummaryCard
          title="Balance"
          value={formatCurrency(accountBalance)}
          tone="positive"
          trend={`${dashboard.budgets.length} tracked budgets`}
        />
        <SummaryCard
          title="Income this month"
          value={formatCurrency(dashboard.monthIncome)}
          tone="default"
          trend="Salary, freelance, and bonus ready"
        />
        <SummaryCard
          title="Expense this month"
          value={formatCurrency(dashboard.monthExpense)}
          tone="warning"
          trend={`${dashboard.recentTransactions.filter((item) => item.type === "expense").length} outgoing entries`}
        />
        <SummaryCard
          title="Savings goals"
          value={`${dashboard.goals.length} active`}
          tone="default"
          trend={`${formatCompactCurrency(dashboard.netBalance)} net available this month`}
        />
      </div>

      <div className="dashboard-grid dashboard-grid-wide">
        <SectionCard title="Spending by category" subtitle="Current month expense breakdown">
          <SimpleBarChart data={categorySpend} />
        </SectionCard>

        <SectionCard title="Income vs expense trend" subtitle="Pulled from reports API">
          <SimpleTrendChart data={trendData} />
        </SectionCard>

        <SectionCard
          title="Recent transactions"
          subtitle="Latest money movement"
          action={<Link to="/transactions">View all</Link>}
        >
          <div className="list-stack">
            {dashboard.recentTransactions.map((item) => (
              <div key={item.id} className="metric-row">
                <div>
                  <strong>{item.merchant}</strong>
                  <span>{formatShortDate(item.date)}</span>
                </div>
                <span className={item.type === "income" ? "amount-positive" : "amount-negative"}>
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Upcoming recurring payments" subtitle="Subscriptions, salary, and fixed bills">
          <div className="list-stack">
            {dashboard.upcomingRecurring.slice(0, 4).map((item) => (
              <div key={item.id} className="metric-row">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.frequency} recurring item</span>
                </div>
                <span>
                  {formatCurrency(item.amount)} on {formatShortDate(item.nextRunDate)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Budget status" subtitle="Budget vs actual spending">
          <div className="list-stack">
            {dashboard.budgets.map((budget) => {
              const category = categories.find((item) => item.id === budget.categoryId);
              const percent = budget.percentageUsed ?? 0;

              return (
                <div key={budget.id} className="metric-row">
                  <div>
                    <strong>{category?.name}</strong>
                    <span>
                      {formatCurrency(budget.actualSpent ?? 0)} / {formatCurrency(budget.amount)}
                    </span>
                  </div>
                  <span
                    className={`status-pill ${
                      percent >= 100 ? "status-danger" : percent >= 80 ? "status-warning" : "status-info"
                    }`}
                  >
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Alerts and nudges" subtitle="Budget, billing, and goal status">
          <div className="list-stack">
            {alerts.map((item) => (
              <div key={item.id} className="notification-card">
                <div className={`notification-dot notification-${item.kind}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
