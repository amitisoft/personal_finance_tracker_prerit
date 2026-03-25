import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <p>The route you requested is not part of this finance tracker prototype.</p>
      <Link to="/dashboard" className="primary-button">
        Back to dashboard
      </Link>
    </div>
  );
}
