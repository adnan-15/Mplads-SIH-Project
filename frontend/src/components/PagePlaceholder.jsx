export function PagePlaceholder({ description, label }) {
  return (
    <section className="page-section" aria-labelledby="placeholder-title">
      <div className="page-heading">
        <div>
          <p className="section-kicker">MODULE PLACEHOLDER</p>
          <h1 id="placeholder-title">{label}</h1>
          <p className="page-description">{description}</p>
        </div>
        <span className="phase-badge">Phase 1</span>
      </div>

      <div className="empty-panel">
        <div className="empty-panel-icon" aria-hidden="true">
          —
        </div>
        <h2>Module not configured yet</h2>
        <p>
          This area is reserved for a future implementation phase. No
          operational records or AI-generated results are displayed.
        </p>
      </div>
    </section>
  );
}