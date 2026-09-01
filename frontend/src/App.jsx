import { NavLink, Route, Routes } from "react-router-dom";

import { navItems } from "./components/navigation";
import { PagePlaceholder } from "./components/PagePlaceholder";
import { ProtectedRoute, RoleRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { AIRiskAnalysis } from "./pages/AIRiskAnalysis";
import { Dashboard } from "./pages/Dashboard";
import { DatasetManagement } from "./pages/DatasetManagement";
import { Projects } from "./pages/Projects";
import { RiskAlerts } from "./pages/RiskAlerts";
import { Reports } from "./pages/Reports";
import { SmartInsights } from "./pages/SmartInsights";
import { UserManagement } from "./pages/UserManagement";
import { AuthProvider, useAuth } from "./context/AuthContext";

function Navigation({ role }) {
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      {navItems
        .filter((item) => !item.requiredRoles || item.requiredRoles.includes(role))
        .map((item) => (
        <NavLink
          className={({ isActive }) =>
            `nav-item${isActive ? " nav-item-active" : ""}`
          }
          key={item.path}
          to={item.path}
        >
          <span className="nav-item-icon" aria-hidden="true">
            {item.shortLabel}
          </span>
          <span>{item.label}</span>
        </NavLink>
        ))}
    </nav>
  );
}

function AppShell() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            MS
          </div>
          <div>
            <p className="brand-name">MPLADS Sentinel</p>
            <p className="brand-subtitle">Government Analytics</p>
          </div>
        </div>

      <Navigation role={user.role} />

        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>{user.role}</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">MPLADS PROGRAMME MONITORING</p>
            <p className="topbar-context">Sentinel AI workspace</p>
          </div>
          <div className="topbar-account">
            <div className="topbar-user">
              <strong>{user.full_name}</strong>
              <span>{user.email} · {user.role}</span>
            </div>
            <button className="text-button" onClick={logout} type="button">
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={roleElement("/", <Dashboard />)} />
            <Route
              path="/ai-risk-analysis"
              element={roleElement("/ai-risk-analysis", <AIRiskAnalysis />)}
            />
            <Route path="/alerts" element={roleElement("/alerts", <RiskAlerts />)} />
            <Route path="/reports" element={roleElement("/reports", <Reports />)} />
            <Route
              path="/smart-insights"
              element={roleElement("/smart-insights", <SmartInsights />)}
            />
            {navItems
              .filter(
                (item) =>
                  item.path !== "/" &&
                  item.path !== "/projects" &&
                  item.path !== "/ai-risk-analysis" &&
                  item.path !== "/alerts" &&
                  item.path !== "/reports" &&
                  item.path !== "/smart-insights" &&
                  item.path !== "/dataset-management" &&
                  item.path !== "/users",
              )
              .map((item) => (
                <Route
                  element={roleElement(
                    item.path,
                    <PagePlaceholder
                      description={item.description}
                      label={item.label}
                    />,
                  )}
                  key={item.path}
                  path={item.path}
                />
              ))}
            <Route path="/projects" element={roleElement("/projects", <Projects />)} />
            <Route
              path="/dataset-management"
              element={roleElement("/dataset-management", <DatasetManagement />)}
            />
            <Route path="/users" element={roleElement("/users", <UserManagement />)} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function roleElement(path, element) {
  const item = navItems.find((navItem) => navItem.path === path);
  return <RoleRoute allowedRoles={item?.requiredRoles}>{element}</RoleRoute>;
}

function AuthenticatedApp() {
  const { isLoading, user } = useAuth();
  if (isLoading) {
    return <div className="auth-loading">Restoring secure session…</div>;
  }
  if (!user) {
    return <AuthPage />;
  }
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}