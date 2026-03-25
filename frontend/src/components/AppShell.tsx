import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useFinance } from "../context/FinanceContext";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/categories", label: "Categories" },
  { to: "/budgets", label: "Budgets" },
  { to: "/goals", label: "Goals" },
  { to: "/reports", label: "Reports" },
  { to: "/recurring", label: "Recurring" },
  { to: "/accounts", label: "Accounts" },
  { to: "/settings", label: "Settings" },
];

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/categories": "Categories",
  "/budgets": "Budgets",
  "/goals": "Savings Goals",
  "/reports": "Reports",
  "/recurring": "Recurring Payments",
  "/accounts": "Accounts",
  "/settings": "Settings",
};

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { clearError, error, logout, user, theme, toggleTheme } = useFinance();
  const title = routeTitles[location.pathname] ?? "Personal Finance Tracker";

  const toggleSidebar = () => setIsCollapsed((value) => !value);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`app-shell ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label="Toggle navigation">
          {isCollapsed ? ">>" : "<<"}
        </button>
        <div className="brand">
          <span className="brand-badge">PF</span>
          <div>
            <p>Personal Finance</p>
            <strong>Tracker</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>{user?.displayName ?? "Personal workspace"}</p>
          <span>{user?.email ?? "Track budgets, spending, and goals"}</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hackathon V1</p>
            <h1>{title}</h1>
          </div>

          <div className="topbar-actions">
            <button className="theme-button" type="button" onClick={toggleTheme}>
              {theme === "dark" ? "Light Theme" : "Dark Theme"}
            </button>
            <input
              className="search-input"
              aria-label="Search"
              placeholder="Search merchant, note, or category"
              type="search"
            />
            <NavLink to="/transactions" className="primary-button">
              Add Transaction
            </NavLink>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              Logout
            </button>
            <div className="profile-chip">
              <span>{user?.displayName?.slice(0, 1).toUpperCase() ?? "U"}</span>
              <strong>{user?.displayName ?? "User"}</strong>
            </div>
          </div>
        </header>

        {error ? (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="ghost-button" type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        <main className="page-content">
          <Outlet />
        </main>

        <nav className="mobile-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-link${isActive ? " mobile-link-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}



