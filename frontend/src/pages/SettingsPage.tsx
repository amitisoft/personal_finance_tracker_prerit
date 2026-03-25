import SectionCard from "../components/SectionCard";
import { useFinance } from "../context/FinanceContext";

export default function SettingsPage() {
  const { isAuthenticated, user } = useFinance();

  return (
    <div className="page-grid">
      <SectionCard
        title="Security and profile"
        subtitle="Session and authentication status from Spring Boot auth APIs"
      >
        <div className="list-stack">
          <div className="metric-row">
            <div>
              <strong>Email and password</strong>
              <span>Sign up, login, forgot password, and reset password are API-integrated.</span>
            </div>
            <span className="status-pill status-info">Integrated</span>
          </div>
          <div className="metric-row">
            <div>
              <strong>Session handling</strong>
              <span>JWT access token + refresh token are persisted and refreshed automatically.</span>
            </div>
            <span className="status-pill status-info">Active</span>
          </div>
          <div className="metric-row">
            <div>
              <strong>Current user</strong>
              <span>{user ? `${user.displayName} (${user.email})` : "No active session"}</span>
            </div>
            <span className={`status-pill ${isAuthenticated ? "status-info" : "status-warning"}`}>
              {isAuthenticated ? "Signed in" : "Signed out"}
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
