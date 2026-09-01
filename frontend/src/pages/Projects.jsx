import { useEffect, useState } from "react";

import { ProjectForm } from "../components/ProjectForm";
import { useAuth } from "../context/AuthContext";
import { createProject, getProjects } from "../lib/api";

const amountFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function formatAmount(amount) {
  if (amount === null || amount === undefined) {
    return "—";
  }
  return `₹${amountFormatter.format(Number(amount))}`;
}

export function Projects() {
  const { user } = useAuth();
  const canCreate = ["Admin", "Government Officer"].includes(user.role);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects() {
    setIsLoading(true);
    setError("");
    try {
      setProjects(await getProjects());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreated(payload) {
    const project = await createProject(payload);
    setProjects((current) => [project, ...current]);
    setIsFormOpen(false);
    return project;
  }

  return (
    <section className="page-section" aria-labelledby="projects-title">
      <div className="page-heading">
        <div>
          <p className="section-kicker">PROJECT REGISTER</p>
          <h1 id="projects-title">Projects</h1>
          <p className="page-description">
            Maintain the core project register used for future programme
            monitoring and analysis.
          </p>
        </div>
        {canCreate && (
          <button
            className="primary-button"
            onClick={() => setIsFormOpen(true)}
            type="button"
          >
            Add project
          </button>
        )}
      </div>

      {isFormOpen && (
        <ProjectForm
          onCancel={() => setIsFormOpen(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="project-list-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">PROJECT RECORDS</p>
            <h2>Project list</h2>
          </div>
          <span className="panel-meta">
            {isLoading ? "Loading…" : `${projects.length} records`}
          </span>
        </div>

        {error && (
          <div className="list-error" role="alert">
            <strong>Unable to load projects</strong>
            <span>{error}</span>
            <button className="text-button" onClick={loadProjects} type="button">
              Retry
            </button>
          </div>
        )}

        {isLoading && !error && (
          <div className="list-state">Loading project records…</div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <div className="list-state">
            <strong>No projects recorded</strong>
            <span>Add a project to begin the project register.</span>
          </div>
        )}

        {!isLoading && !error && projects.length > 0 && (
          <div className="table-wrap">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Constituency</th>
                  <th>State</th>
                  <th>Sanctioned</th>
                  <th>Utilized</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <strong>{project.project_name}</strong>
                      <span>{project.district}</span>
                    </td>
                    <td>{project.constituency}</td>
                    <td>{project.state}</td>
                    <td>{formatAmount(project.sanctioned_amount)}</td>
                    <td>{formatAmount(project.utilized_amount)}</td>
                    <td>
                      <span
                        className={`project-status status-${project.project_status.toLowerCase()}`}
                      >
                        {project.project_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}