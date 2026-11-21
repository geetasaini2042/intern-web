import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  title: "",
  message: "",
  audience: "all",
  batch_id: "",
  status: "draft",
  publish_at: "",
};

const getId = (item) => item?._id || item?.id;

const normalizeList = (res, key) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export default function AnnouncementsAdmin() {
  const [announcements, setAnnouncements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [announcementRes, batchRes] = await Promise.all([
        apiGet("/admin/announcements"),
        apiGet("/admin/batches"),
      ]);

      setAnnouncements(normalizeList(announcementRes, "announcements"));
      setBatches(normalizeList(batchRes, "batches"));
    } catch (err) {
      console.error("Announcements loading error:", err);
      setError(err?.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setMessage("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      message: item.message || item.content || item.description || "",
      audience: item.audience || "all",
      batch_id: item.batch_id || item.batch?._id || "",
      status: item.status || "draft",
      publish_at: item.publish_at
        ? item.publish_at.slice(0, 16)
        : item.scheduled_at
        ? item.scheduled_at.slice(0, 16)
        : "",
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        batch_id: form.audience === "batch" ? form.batch_id : "",
        publish_at: form.publish_at || null,
      };

      if (editing) {
        await apiPut(`/admin/announcements/${getId(editing)}`, payload);
      } else {
        await apiPost("/admin/announcements", payload);
      }

      setMessage(editing ? "Announcement updated." : "Announcement created.");
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Announcement save error:", err);
      setError(err?.message || "Unable to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    const current = item.status || "draft";
    const next = current === "published" ? "draft" : "published";

    try {
      await apiPut(`/admin/announcements/${getId(item)}`, {
        status: next,
      });

      setAnnouncements((prev) =>
        prev.map((a) =>
          getId(a) === getId(item) ? { ...a, status: next } : a
        )
      );

      setMessage(`Announcement ${next === "published" ? "published" : "unpublished"}.`);
    } catch (err) {
      console.error("Announcement status error:", err);
      setError(err?.message || "Unable to change announcement status.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiDelete(`/admin/announcements/${getId(item)}`);
      setAnnouncements((prev) =>
        prev.filter((a) => getId(a) !== getId(item))
      );
      setMessage("Announcement deleted.");
    } catch (err) {
      console.error("Announcement delete error:", err);
      setError(err?.message || "Unable to delete announcement.");
    }
  };

  const filtered = announcements.filter((item) => {
    const text = `${item.title || ""} ${item.message || item.content || ""} ${
      item.audience || ""
    }`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (item.status || "draft") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const publishedCount = announcements.filter(
    (a) => a.status === "published"
  ).length;

  const draftCount = announcements.filter(
    (a) => (a.status || "draft") === "draft"
  ).length;

  const scheduledCount = announcements.filter(
    (a) => a.status === "scheduled"
  ).length;

  const formatDate = (date) => {
    if (!date) return "—";

    try {
      return new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  };

  const getAudience = (item) => {
    if (item.audience === "batch") {
      const batch =
        batches.find((b) => getId(b) === item.batch_id) ||
        item.batch;

      return batch?.name || batch?.title || "Selected Batch";
    }

    if (item.audience === "students") return "All Students";
    return "Everyone";
  };

  const statusClass = (status) => {
    if (status === "published") return "ann-status-published";
    if (status === "scheduled") return "ann-status-scheduled";
    return "ann-status-draft";
  };

  return (
    <div className="ann-admin">
      <style>{`
        .ann-admin {
          color:#e8edf5;
          width:100%;
          font-family:inherit;
        }
        .ann-admin * { box-sizing:border-box; }
        .ann-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
          gap:16px;
          margin-bottom:24px;
        }
        .ann-header h1 {
          margin:0;
          font-size:26px;
          font-weight:700;
        }
        .ann-header p {
          margin:6px 0 0;
          color:#929db0;
          font-size:14px;
        }
        .ann-btn-primary {
          border:0;
          background:#6366f1;
          color:#fff;
          border-radius:10px;
          padding:11px 16px;
          font-weight:600;
          cursor:pointer;
        }
        .ann-btn-primary:hover { background:#5558e8; }
        .ann-stats {
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:14px;
          margin-bottom:22px;
        }
        .ann-stat {
          border:1px solid rgba(255,255,255,.09);
          background:rgba(255,255,255,.035);
          border-radius:14px;
          padding:18px;
        }
        .ann-stat-label {
          color:#929db0;
          font-size:13px;
          margin-bottom:10px;
        }
        .ann-stat-value {
          font-size:26px;
          font-weight:700;
        }
        .ann-toolbar {
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          margin-bottom:16px;
        }
        .ann-search { flex:1; min-width:200px; }
        .ann-search input {
          width:100%;
          background:rgba(255,255,255,.04);
          color:inherit;
          border:1px solid rgba(255,255,255,.1);
          border-radius:10px;
          padding:12px 14px;
          outline:none;
        }
        .ann-search input:focus,
        .ann-toolbar select:focus {
          border-color:#6366f1;
        }
        .ann-toolbar select {
          min-width:145px;
          background:#171b25;
          color:inherit;
          border:1px solid rgba(255,255,255,.1);
          border-radius:10px;
          padding:11px 14px;
          outline:none;
        }
        .ann-list {
          display:grid;
          gap:12px;
        }
        .ann-card {
          border:1px solid rgba(255,255,255,.09);
          background:rgba(255,255,255,.025);
          border-radius:14px;
          padding:18px;
        }
        .ann-card-top {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:14px;
        }
        .ann-title {
          font-size:16px;
          font-weight:700;
          color:#f1f5f9;
          margin:0 0 8px;
          word-break:break-word;
        }
        .ann-message {
          font-size:14px;
          color:#b7c1d1;
          line-height:1.65;
          white-space:pre-wrap;
          word-break:break-word;
          margin:0;
        }
        .ann-badge {
          flex-shrink:0;
          padding:5px 9px;
          border-radius:20px;
          font-size:11px;
          font-weight:700;
          text-transform:capitalize;
        }
        .ann-status-published {
          background:rgba(34,197,94,.12);
          color:#4ade80;
        }
        .ann-status-draft {
          background:rgba(148,163,184,.12);
          color:#cbd5e1;
        }
        .ann-status-scheduled {
          background:rgba(245,158,11,.12);
          color:#fbbf24;
        }
        .ann-meta {
          display:flex;
          flex-wrap:wrap;
          gap:14px;
          margin-top:15px;
          color:#929db0;
          font-size:12px;
        }
        .ann-card-footer {
          display:flex;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
          gap:12px;
          margin-top:16px;
          padding-top:14px;
          border-top:1px solid rgba(255,255,255,.06);
        }
        .ann-actions {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }
        .ann-action {
          border:1px solid rgba(255,255,255,.1);
          background:rgba(255,255,255,.04);
          color:#dce3ed;
          border-radius:8px;
          padding:8px 11px;
          cursor:pointer;
          font-size:12px;
        }
        .ann-action:hover { background:rgba(255,255,255,.09); }
        .ann-delete { color:#f87171; }
        .ann-empty {
          padding:45px 20px;
          text-align:center;
          color:#929db0;
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
        }
        .ann-alert {
          border-radius:10px;
          padding:12px 14px;
          margin-bottom:15px;
          font-size:13px;
        }
        .ann-error {
          background:rgba(239,68,68,.1);
          color:#fca5a5;
          border:1px solid rgba(239,68,68,.18);
        }
        .ann-success {
          background:rgba(34,197,94,.1);
          color:#86efac;
          border:1px solid rgba(34,197,94,.18);
        }
        .ann-loading {
          text-align:center;
          padding:40px;
          color:#929db0;
        }
        .ann-overlay {
          position:fixed;
          inset:0;
          z-index:9999;
          background:rgba(0,0,0,.65);
          backdrop-filter:blur(4px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:16px;
        }
        .ann-modal {
          width:100%;
          max-width:560px;
          max-height:90vh;
          overflow:auto;
          background:#171b25;
          border:1px solid rgba(255,255,255,.1);
          border-radius:18px;
          padding:24px;
          box-shadow:0 24px 80px rgba(0,0,0,.4);
        }
        .ann-modal-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:22px;
        }
        .ann-modal-header h2 {
          margin:0;
          font-size:20px;
        }
        .ann-close {
          border:0;
          background:transparent;
          color:#9ca3af;
          font-size:24px;
          cursor:pointer;
        }
        .ann-form {
          display:grid;
          gap:15px;
        }
        .ann-field { display:grid; gap:7px; }
        .ann-field label {
          font-size:13px;
          font-weight:600;
          color:#cbd5e1;
        }
        .ann-field input,
        .ann-field select,
        .ann-field textarea {
          width:100%;
          background:#0f131b;
          color:#f1f5f9;
          border:1px solid rgba(255,255,255,.1);
          border-radius:9px;
          padding:11px 12px;
          outline:none;
          font-family:inherit;
        }
        .ann-field textarea {
          min-height:140px;
          resize:vertical;
          line-height:1.6;
        }
        .ann-field input:focus,
        .ann-field select:focus,
        .ann-field textarea:focus { border-color:#6366f1; }
        .ann-modal-footer {
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:8px;
        }
        .ann-btn-secondary {
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
          color:#dce3ed;
          border-radius:9px;
          padding:10px 15px;
          cursor:pointer;
        }
        @media(max-width:800px) {
          .ann-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:500px) {
          .ann-header h1 { font-size:22px; }
          .ann-stats { gap:9px; }
          .ann-stat { padding:14px; }
          .ann-stat-value { font-size:22px; }
          .ann-modal { padding:18px; }
          .ann-card-top { flex-direction:column; }
        }
      `}</style>

      <div className="ann-header">
        <div>
          <h1>Announcements</h1>
          <p>Create and manage announcements for students.</p>
        </div>

        <button className="ann-btn-primary" onClick={openCreate}>
          + New Announcement
        </button>
      </div>

      {error && <div className="ann-alert ann-error">{error}</div>}
      {message && <div className="ann-alert ann-success">{message}</div>}

      <div className="ann-stats">
        <div className="ann-stat">
          <div className="ann-stat-label">Total</div>
          <div className="ann-stat-value">{announcements.length}</div>
        </div>
        <div className="ann-stat">
          <div className="ann-stat-label">Published</div>
          <div className="ann-stat-value">{publishedCount}</div>
        </div>
        <div className="ann-stat">
          <div className="ann-stat-label">Drafts</div>
          <div className="ann-stat-value">{draftCount}</div>
        </div>
        <div className="ann-stat">
          <div className="ann-stat-label">Scheduled</div>
          <div className="ann-stat-value">{scheduledCount}</div>
        </div>
      </div>

      <div className="ann-toolbar">
        <div className="ann-search">
          <input
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {loading ? (
        <div className="ann-loading">Loading announcements...</div>
      ) : filtered.length === 0 ? (
        <div className="ann-empty">No announcements found.</div>
      ) : (
        <div className="ann-list">
          {filtered.map((item) => (
            <div className="ann-card" key={getId(item)}>
              <div className="ann-card-top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="ann-title">{item.title || "Untitled Announcement"}</h3>
                  <p className="ann-message">
                    {item.message || item.content || item.description || "No message"}
                  </p>
                </div>

                <span className={`ann-badge ${statusClass(item.status || "draft")}`}>
                  {item.status || "draft"}
                </span>
              </div>

              <div className="ann-meta">
                <span>Audience: {getAudience(item)}</span>
                <span>
                  Created: {formatDate(item.created_at || item.createdAt)}
                </span>
                {item.publish_at && (
                  <span>Scheduled: {formatDate(item.publish_at)}</span>
                )}
              </div>

              <div className="ann-card-footer">
                <div className="ann-actions">
                  <button
                    className="ann-action"
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </button>

                  <button
                    className="ann-action"
                    onClick={() => toggleStatus(item)}
                  >
                    {item.status === "published" ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    className="ann-action ann-delete"
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="ann-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="ann-modal">
            <div className="ann-modal-header">
              <h2>{editing ? "Edit Announcement" : "New Announcement"}</h2>
              <button
                className="ann-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="ann-form" onSubmit={handleSubmit}>
              <div className="ann-field">
                <label>Title *</label>
                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Announcement title"
                />
              </div>

              <div className="ann-field">
                <label>Message *</label>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  placeholder="Write your announcement..."
                />
              </div>

              <div className="ann-field">
                <label>Audience</label>
                <select
                  value={form.audience}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      audience: e.target.value,
                      batch_id: "",
                    })
                  }
                >
                  <option value="all">Everyone</option>
                  <option value="students">All Students</option>
                  <option value="batch">Specific Batch</option>
                </select>
              </div>

              {form.audience === "batch" && (
                <div className="ann-field">
                  <label>Select Batch *</label>
                  <select
                    required
                    value={form.batch_id}
                    onChange={(e) =>
                      setForm({ ...form, batch_id: e.target.value })
                    }
                  >
                    <option value="">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={getId(batch)} value={getId(batch)}>
                        {batch.name || batch.title || "Unnamed Batch"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ann-field">
                <label>Publish Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) =>
                    setForm({ ...form, publish_at: e.target.value })
                  }
                />
              </div>

              <div className="ann-field">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div className="ann-modal-footer">
                <button
                  type="button"
                  className="ann-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ann-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Update Announcement"
                    : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}