import { NavLink, Route, Routes } from "react-router-dom";

import { navItems } from "./components/navigation";
import { PagePlaceholder } from "./components/PagePlaceholder";
import { AIRiskAnalysis } from "./pages/AIRiskAnalysis";
import { Dashboard } from "./pages/Dashboard";
import { DatasetManagement } from "./pages/DatasetManagement";
import { Projects } from "./pages/Projects";
import { RiskAlerts } from "./pages/RiskAlerts";

function Navigation() {
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
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

        <Navigation />

        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>Foundation environment</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">MPLADS PROGRAMME MONITORING</p>
            <p className="topbar-context">Sentinel AI workspace</p>
          </div>
          <div className="environment-badge">
            <span className="environment-dot" aria-hidden="true" />
            Development
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ai-risk-analysis" element={<AIRiskAnalysis />} />
            <Route path="/alerts" element={<RiskAlerts />} />
            {navItems
              .filter(
                (item) =>
                  item.path !== "/" &&
                  item.path !== "/projects" &&
                  item.path !== "/ai-risk-analysis" &&
                  item.path !== "/alerts" &&
                  item.path !== "/dataset-management",
              )
              .map((item) => (
                <Route
                  element={
                    <PagePlaceholder
                      description={item.description}
                      label={item.label}
                    />
                  }
                  key={item.path}
                  path={item.path}
                />
              ))}
            <Route path="/projects" element={<Projects />} />
            <Route
              path="/dataset-management"
              element={<DatasetManagement />}
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}