import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { useFinance } from "./context/FinanceContext";
import AccountsPage from "./pages/AccountsPage";
import AuthPage from "./pages/AuthPage";
import BudgetsPage from "./pages/BudgetsPage";
import CategoriesPage from "./pages/CategoriesPage";
import DashboardPage from "./pages/DashboardPage";
import GoalsPage from "./pages/GoalsPage";
import NotFoundPage from "./pages/NotFoundPage";
import RecurringPage from "./pages/RecurringPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import TransactionsPage from "./pages/TransactionsPage";

function ProtectedLayout() {
  const { isAuthenticated } = useFinance();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

function LoginLayout() {
  const { isAuthenticated } = useFinance();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage />;
}

export default function App() {
  const { isBootstrapping } = useFinance();

  if (isBootstrapping) {
    return (
      <div className="auth-page">
        <section className="auth-panel">
          <div className="section-card-header auth-header">
            <div>
              <h2>Loading your workspace...</h2>
              <p>Checking session and syncing finance data from the API.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginLayout />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
