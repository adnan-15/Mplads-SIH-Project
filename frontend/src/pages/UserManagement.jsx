import { useEffect, useState } from "react";

import { createManagedUser, getUsers, updateUserRole } from "../lib/api";

const ROLES = ["Admin", "Government Officer", "Analyst", "Viewer"];

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "Viewer",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    setIsLoading(true);
    setError("");
    try {
      setUsers(await getUsers());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const created = await createManagedUser({
        email: form.email,
        full_name: form.fullName,
        password: form.password,
        role: form.role,
      });
      setUsers((current) => [...current, created]);
      setForm({ email: "", fullName: "", password: "", role: "Viewer" });
      setSuccess("User account created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRoleChange(userId, role) {
    setError("");
    setSuccess("");
    try {
      const updated = await updateUserRole(userId, role);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("User role updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="page-section" aria-labelledby="users-title">
      <div className="page-heading">
        <div>
          <p className="section-kicker">ACCESS GOVERNANCE</p>
          <h1 id="users-title">User Management</h1>
          <p className="page-description">
            Create workspace accounts and control the role assigned to each user.
          </p>
        </div>
        <span className="phase-badge">Phase 13</span>
      </div>

      {error && <div className="list-error" role="alert"><strong>Account action failed</strong><span>{error}</span></div>}
      {success && <div className="processing-success" role="status">{success}</div>}

      <div className="user-management-grid">
        <form className="dashboard-panel user-create-panel" onSubmit={handleCreate}>
          <div className="dashboard-panel-header">
            <div>
              <p className="panel-kicker">NEW ACCOUNT</p>
              <h2>Create managed user</h2>
            </div>
          </div>
          <div className="user-form-fields">
            <label className="form-field">
              <span>Full name</span>
              <input name="fullName" onChange={updateField} required value={form.fullName} />
            </label>
            <label className="form-field">
              <span>Email address</span>
              <input name="email" onChange={updateField} required type="email" value={form.email} />
            </label>
            <label className="form-field">
              <span>Temporary password</span>
              <input minLength="8" name="password" onChange={updateField} required type="password" value={form.password} />
            </label>
            <label className="form-field">
              <span>Role</span>
              <select name="role" onChange={updateField} value={form.role}>
                {ROLES.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
          </div>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? "Creating…" : "Create user"}
          </button>
        </form>

        <article className="dashboard-panel user-list-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="panel-kicker">REGISTERED USERS</p>
              <h2>Workspace access</h2>
            </div>
            <span className="panel-meta">{isLoading ? "Loading…" : `${users.length} users`}</span>
          </div>
          {isLoading ? (
            <div className="table-loading">Loading user accounts…</div>
          ) : users.length === 0 ? (
            <div className="table-empty">No active user accounts found.</div>
          ) : (
            <div className="user-list">
              {users.map((item) => (
                <div className="user-row" key={item.id}>
                  <div>
                    <strong>{item.full_name}</strong>
                    <span>{item.email}</span>
                  </div>
                  <select
                    aria-label={`Role for ${item.full_name}`}
                    onChange={(event) => handleRoleChange(item.id, event.target.value)}
                    value={item.role}
                  >
                    {ROLES.map((role) => <option key={role}>{role}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}