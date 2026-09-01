import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  const { isLoading, user } = useAuth();
  if (isLoading) {
    return <div className="auth-loading">Restoring secure session…</div>;
  }
  if (!user) {
    return <Navigate replace to="/" />;
  }
  return children;
}

export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!allowedRoles?.length || allowedRoles.includes(user?.role)) {
    return children;
  }
  return <Navigate replace to="/" />;
}