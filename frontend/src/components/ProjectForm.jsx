import { useState } from "react";

const INITIAL_FORM = {
  project_name: "",
  constituency: "",
  state: "",
  district: "",
  sanctioned_amount: "",
  utilized_amount: "",
  project_status: "Planned",
  start_date: "",
  expected_completion_date: "",
};

const STATUS_OPTIONS = ["Planned", "Ongoing", "Completed", "Delayed"];

export function ProjectForm({ onCancel, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const payload = {
      ...form,
      sanctioned_amount: Number(form.sanctioned_amount),
      utilized_amount: Number(form.utilized_amount),
      start_date: form.start_date || null,
      expected_completion_date: form.expected_completion_date || null,
    };

    try {
      const project = await onCreated(payload);
      if (project) {
        setForm(INITIAL_FORM);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <div>
          <p className="panel-kicker">NEW RECORD</p>
          <h2>Add project</h2>
        </div>
        <button className="text-button" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="form-grid">
        <label className="form-field form-field-wide">
          <span>Project name</span>
          <input
            name="project_name"
            onChange={updateField}
            required
            value={form.project_name}
          />
        </label>
        <label className="form-field">
          <span>Constituency</span>
          <input
            name="constituency"
            onChange={updateField}
            required
            value={form.constituency}
          />
        </label>
        <label className="form-field">
          <span>State</span>
          <input name="state" onChange={updateField} required value={form.state} />
        </label>
        <label className="form-field">
          <span>District</span>
          <input
            name="district"
            onChange={updateField}
            required
            value={form.district}
          />
        </label>
        <label className="form-field">
          <span>Sanctioned amount</span>
          <input
            min="0"
            name="sanctioned_amount"
            onChange={updateField}
            required
            step="0.01"
            type="number"
            value={form.sanctioned_amount}
          />
        </label>
        <label className="form-field">
          <span>Utilized amount</span>
          <input
            min="0"
            name="utilized_amount"
            onChange={updateField}
            required
            step="0.01"
            type="number"
            value={form.utilized_amount}
          />
        </label>
        <label className="form-field">
          <span>Project status</span>
          <select
            name="project_status"
            onChange={updateField}
            value={form.project_status}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Start date</span>
          <input
            name="start_date"
            onChange={updateField}
            type="date"
            value={form.start_date}
          />
        </label>
        <label className="form-field">
          <span>Expected completion</span>
          <input
            name="expected_completion_date"
            onChange={updateField}
            type="date"
            value={form.expected_completion_date}
          />
        </label>
      </div>

      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving…" : "Save project"}
        </button>
      </div>
    </form>
  );
}