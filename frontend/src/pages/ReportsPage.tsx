import { useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import SimpleBarChart from "../components/SimpleBarChart";
import SimpleTrendChart from "../components/SimpleTrendChart";
import { useFinance } from "../context/FinanceContext";
import { financeApi } from "../services/financeApi";
import { toErrorMessage } from "../services/apiClient";
import { TransactionType } from "../types/finance";
import { formatCurrency } from "../utils/formatters";

const reportRanges = {
  "this-month": 31,
  "last-90": 90,
  "last-180": 180,
};

function formatMonthLabel(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
  }).format(date);
}

function resolveDateRange(range: keyof typeof reportRanges) {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);

  if (range === "this-month") {
    const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { dateFrom, dateTo };
  }

  const dateFrom = new Date(now);
  dateFrom.setDate(now.getDate() - reportRanges[range]);
  return {
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo,
  };
}

export default function ReportsPage() {
  const { accounts, categories } = useFinance();
  const [range, setRange] = useState<keyof typeof reportRanges>("this-month");
  const [accountId, setAccountId] = useState("all");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    Array<{ label: string; color: string; value: number }>
  >([]);
  const [monthlyTrend, setMonthlyTrend] = useState<Array<{ label: string; income: number; expense: number }>>([]);

  const reportFilters = useMemo(() => {
    const dateRange = resolveDateRange(range);

    return {
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
      accountId: accountId === "all" ? undefined : accountId,
      type: type === "all" ? undefined : type,
    };
  }, [accountId, range, type]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const [categoryResponse, trendResponse] = await Promise.all([
          financeApi.getCategorySpendReport(reportFilters),
          financeApi.getIncomeVsExpenseReport(reportFilters),
        ]);

        if (cancelled) {
          return;
        }

        const mappedCategoryBreakdown = categoryResponse
          .map((item) => {
            const category = categories.find((entry) => entry.id === item.categoryId);
            return {
              label: category?.name ?? "Uncategorized",
              color: category?.color ?? "#3b82f6",
              value: item.amount,
            };
          })
          .filter((item) => item.value > 0)
          .sort((left, right) => right.value - left.value);

        const mappedTrend = trendResponse.map((item) => ({
          label: formatMonthLabel(item.period),
          income: item.income,
          expense: item.expense,
        }));

        setCategoryBreakdown(mappedCategoryBreakdown);
        setMonthlyTrend(mappedTrend);
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(toErrorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [categories, reportFilters]);

  const totalIncome = monthlyTrend.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = monthlyTrend.reduce((sum, item) => sum + item.expense, 0);

  const filteredIncome = type === "expense" ? 0 : totalIncome;
  const filteredExpense = type === "income" ? 0 : totalExpense;

  const exportCsv = async () => {
    setIsExporting(true);

    try {
      const csvBlob = await financeApi.exportTransactionsCsv({
        dateFrom: reportFilters.dateFrom,
        dateTo: reportFilters.dateTo,
        accountId: reportFilters.accountId,
        type: reportFilters.type,
      });

      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-report-${range}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setError(null);
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-grid">
      <SectionCard
        title="Reports screen"
        subtitle="Date filters update charts and summary data, with CSV export for the filtered dataset"
        action={
          <button className="ghost-button" type="button" onClick={() => void exportCsv()} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        }
      >
        <div className="filters-grid filters-grid-wide">
          <select value={range} onChange={(event) => setRange(event.target.value as keyof typeof reportRanges)}>
            <option value="this-month">This month</option>
            <option value="last-90">Last 90 days</option>
            <option value="last-180">Last 180 days</option>
          </select>
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value as "all" | TransactionType)}>
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="summary-grid summary-grid-three">
          <div className="mini-summary">
            <span>Income</span>
            <strong>{formatCurrency(filteredIncome)}</strong>
          </div>
          <div className="mini-summary">
            <span>Expense</span>
            <strong>{formatCurrency(filteredExpense)}</strong>
          </div>
          <div className="mini-summary">
            <span>Net</span>
            <strong>{formatCurrency(filteredIncome - filteredExpense)}</strong>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
      </SectionCard>

      {isLoading ? (
        <SectionCard title="Reports" subtitle="Loading charts from reports APIs">
          <p>Refreshing report data...</p>
        </SectionCard>
      ) : (
        <>
          <div className="dashboard-grid">
            <SectionCard title="Category spend" subtitle="Expense concentration by category">
              <SimpleBarChart data={categoryBreakdown} />
            </SectionCard>

            <SectionCard title="Income vs expense" subtitle="Trend view for reporting module">
              <SimpleTrendChart data={monthlyTrend} />
            </SectionCard>
          </div>

          <SectionCard title="Top categories" subtitle="Fast summary from the filtered report set">
            <div className="list-stack compact-stack">
              {categoryBreakdown.slice(0, 5).map((item) => (
                <div key={item.label} className="metric-row">
                  <div className="category-meta">
                    <span className="category-dot" aria-hidden="true" style={{ backgroundColor: item.color }} />
                    <strong>{item.label}</strong>
                  </div>
                  <span>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
