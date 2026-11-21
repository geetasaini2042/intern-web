import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  student_id: "",
  program: "",
  certificate_type: "Internship Certificate",
  issue_date: new Date().toISOString().split("T")[0],
  certificate_id: "",
  status: "issued",
};

const getId = (item) => item?._id || item?.id || item?.certificate_id;

const getStudentName = (item) =>
  item?.student_name ||
  item?.name ||
  item?.student?.name ||
  item?.student?.full_name ||
  "Unknown Student";

const getCertificateId = (item) =>
  item?.certificate_id || item?.verification_id || item?.certificate_no || item?.id || item?._id || "—";

const getProgramName = (item) =>
  item?.program_name || item?.program || item?.course_name || "—";

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.certificates)) return res.certificates;
  if (Array.isArray(res?.students)) return res.students;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export default function CertificatesAdmin() {
  const [certificates, setCertificates] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [certificateRes, studentRes] = await Promise.all([
        apiGet("/admin/certificates"),
        apiGet("/admin/students"),
      ]);

      setCertificates(normalizeList(certificateRes));
      setStudents(normalizeList(studentRes));
    } catch (err) {
      console.error("Certificates loading error:", err);
      setError(err?.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, certificate_id: "" });
    setMessage("");
    setModalOpen(true);
  };

  const openEdit = (certificate) => {
    setEditing(certificate);
    setForm({
      student_id: certificate.student_id || certificate.student?._id || "",
      program: getProgramName(certificate) === "—" ? "" : getProgramName(certificate),
      certificate_type: certificate.certificate_type || certificate.type || "Internship Certificate",
      issue_date: certificate.issue_date || certificate.issued_at?.split("T")[0] || "",
      certificate_id: getCertificateId(certificate) === "—" ? "" : getCertificateId(certificate),
      status: certificate.status || "issued",
    });
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
        student_id: form.student_id,
      };

      if (editing) {
        await apiPut(`/admin/certificates/${getId(editing)}`, payload);
        setMessage("Certificate updated successfully.");
      } else {
        await apiPost("/admin/certificates", payload);
        setMessage("Certificate issued successfully.");
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Certificate save error:", err);
      setError(err?.message || "Unable to save certificate.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (certificate) => {
    const certId = getCertificateId(certificate);

    if (!window.confirm(`Delete certificate ${certId}? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiDelete(`/admin/certificates/${getId(certificate)}`);
      setCertificates((prev) =>
        prev.filter((item) => getId(item) !== getId(certificate))
      );
      setMessage("Certificate deleted successfully.");
    } catch (err) {
      console.error("Certificate delete error:", err);
      setError(err?.message || "Unable to delete certificate.");
    }
  };

  const changeStatus = async (certificate, status) => {
    try {
      await apiPut(`/admin/certificates/${getId(certificate)}`, {
        status,
      });

      setCertificates((prev) =>
        prev.map((item) =>
          getId(item) === getId(certificate) ? { ...item, status } : item
        )
      );
    } catch (err) {
      console.error("Certificate status error:", err);
      setError(err?.message || "Unable to update certificate status.");
    }
  };

  const filtered = certificates.filter((certificate) => {
    const student = getStudentName(certificate);
    const certId = getCertificateId(certificate);
    const program = getProgramName(certificate);
    const status = certificate.status || "issued";

    const matchesSearch =
      `${student} ${certId} ${program} ${certificate.certificate_type || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || status.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const issuedCount = certificates.filter(
    (c) => (c.status || "issued").toLowerCase() === "issued"
  ).length;

  const revokedCount = certificates.filter(
    (c) => (c.status || "").toLowerCase() === "revoked"
  ).length;

  const pendingCount = certificates.filter(
    (c) => (c.status || "").toLowerCase() === "pending"
  ).length;

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return date;
    }
  };

  const statusClass = (status) => {
    const s = (status || "issued").toLowerCase();
    if (s === "issued") return "cert-status-issued";
    if (s === "revoked") return "cert-status-revoked";
    if (s === "pending") return "cert-status-pending";
    return "cert-status-other";
  };

  return (
    <div className="cert-admin">
      <style>{`
        .cert-admin {
          color: #e8edf5;
          font-family: inherit;
          width: 100%;
        }
        .cert-admin * { box-sizing: border-box; }
        .cert-header {
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:16px;
          margin-bottom:24px;
        }
        .cert-header h1 {
          font-size:26px;
          font-weight:700;
          margin:0;
          color:inherit;
        }
        .cert-header p {
          margin:6px 0 0;
          color:#929db0;
          font-size:14px;
        }
        .cert-primary-btn {
          background:#6366f1;
          color:white;
          border:none;
          border-radius:10px;
          padding:11px 17px;
          font-weight:600;
          cursor:pointer;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .cert-primary-btn:hover { background:#5558e8; }
        .cert-stats {
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:14px;
          margin-bottom:22px;
        }
        .cert-stat {
          border:1px solid rgba(255,255,255,.09);
          background:rgba(255,255,255,.035);
          border-radius:14px;
          padding:18px;
        }
        .cert-stat-label {
          color:#929db0;
          font-size:13px;
          margin-bottom:12px;
        }
        .cert-stat-value {
          font-size:26px;
          font-weight:700;
          color:#f3f6fb;
        }
        .cert-toolbar {
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:16px;
        }
        .cert-search {
          flex:1;
          min-width:200px;
          position:relative;
        }
        .cert-search input {
          width:100%;
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.1);
          border-radius:10px;
          padding:12px 14px;
          color:inherit;
          outline:none;
        }
        .cert-search input:focus,
        .cert-toolbar select:focus {
          border-color:#6366f1;
        }
        .cert-toolbar select {
          background:#171b25;
          color:inherit;
          border:1px solid rgba(255,255,255,.1);
          border-radius:10px;
          padding:11px 14px;
          min-width:140px;
          outline:none;
        }
        .cert-table-wrap {
          overflow-x:auto;
          border:1px solid rgba(255,255,255,.09);
          border-radius:14px;
          background:rgba(255,255,255,.025);
        }
        .cert-table {
          width:100%;
          border-collapse:collapse;
          min-width:850px;
        }
        .cert-table th {
          color:#929db0;
          text-align:left;
          font-size:12px;
          font-weight:600;
          padding:14px 16px;
          border-bottom:1px solid rgba(255,255,255,.08);
          white-space:nowrap;
        }
        .cert-table td {
          padding:15px 16px;
          border-bottom:1px solid rgba(255,255,255,.055);
          font-size:14px;
        }
        .cert-table tr:last-child td { border-bottom:none; }
        .cert-student-name { font-weight:600; color:#f1f4fa; }
        .cert-id {
          color:#a5b4fc;
          font-family:monospace;
          font-size:13px;
          word-break:break-all;
        }
        .cert-status {
          display:inline-flex;
          align-items:center;
          padding:5px 9px;
          border-radius:20px;
          font-size:11px;
          font-weight:700;
          text-transform:capitalize;
        }
        .cert-status-issued { background:rgba(34,197,94,.12); color:#4ade80; }
        .cert-status-revoked { background:rgba(239,68,68,.12); color:#f87171; }
        .cert-status-pending { background:rgba(245,158,11,.12); color:#fbbf24; }
        .cert-status-other { background:rgba(148,163,184,.12); color:#cbd5e1; }
        .cert-actions {
          display:flex;
          gap:7px;
          align-items:center;
        }
        .cert-action-btn {
          border:1px solid rgba(255,255,255,.1);
          background:rgba(255,255,255,.04);
          color:#dce3ed;
          padding:7px 10px;
          border-radius:8px;
          cursor:pointer;
          font-size:12px;
        }
        .cert-action-btn:hover { background:rgba(255,255,255,.09); }
        .cert-action-delete { color:#f87171; }
        .cert-empty {
          padding:48px 20px;
          text-align:center;
          color:#929db0;
        }
        .cert-alert {
          border-radius:10px;
          padding:12px 14px;
          margin-bottom:15px;
          font-size:13px;
        }
        .cert-alert-error {
          background:rgba(239,68,68,.1);
          color:#fca5a5;
          border:1px solid rgba(239,68,68,.18);
        }
        .cert-alert-success {
          background:rgba(34,197,94,.1);
          color:#86efac;
          border:1px solid rgba(34,197,94,.18);
        }
        .cert-modal-overlay {
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
        .cert-modal {
          width:100%;
          max-width:520px;
          max-height:90vh;
          overflow:auto;
          background:#171b25;
          border:1px solid rgba(255,255,255,.1);
          border-radius:18px;
          padding:24px;
          box-shadow:0 24px 80px rgba(0,0,0,.4);
        }
        .cert-modal-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:22px;
        }
        .cert-modal-header h2 {
          margin:0;
          font-size:20px;
        }
        .cert-close {
          border:none;
          background:transparent;
          color:#9ca3af;
          font-size:24px;
          cursor:pointer;
        }
        .cert-form {
          display:grid;
          gap:15px;
        }
        .cert-field {
          display:grid;
          gap:7px;
        }
        .cert-field label {
          font-size:13px;
          font-weight:600;
          color:#cbd5e1;
        }
        .cert-field input,
        .cert-field select {
          width:100%;
          background:#0f131b;
          border:1px solid rgba(255,255,255,.1);
          border-radius:9px;
          padding:11px 12px;
          color:#f1f5f9;
          outline:none;
        }
        .cert-field input:focus,
        .cert-field select:focus { border-color:#6366f1; }
        .cert-modal-footer {
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:8px;
        }
        .cert-secondary-btn {
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
          color:#dce3ed;
          border-radius:9px;
          padding:10px 15px;
          cursor:pointer;
        }
        .cert-loading { padding:40px; text-align:center; color:#929db0; }
        @media(max-width:800px) {
          .cert-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:500px) {
          .cert-header h1 { font-size:22px; }
          .cert-stats { gap:9px; }
          .cert-stat { padding:14px; }
          .cert-stat-value { font-size:22px; }
          .cert-toolbar select { flex:1; }
          .cert-modal { padding:18px; }
        }
      `}</style>

      <div className="cert-header">
        <div>
          <h1>Certificates</h1>
          <p>Issue, manage and verify student certificates.</p>
        </div>
        <button className="cert-primary-btn" onClick={openCreate}>
          <span>＋</span> Issue Certificate
        </button>
      </div>

      {error && <div className="cert-alert cert-alert-error">{error}</div>}
      {message && <div className="cert-alert cert-alert-success">{message}</div>}

      <div className="cert-stats">
        <div className="cert-stat">
          <div className="cert-stat-label">Total Certificates</div>
          <div className="cert-stat-value">{certificates.length}</div>
        </div>
        <div className="cert-stat">
          <div className="cert-stat-label">Issued</div>
          <div className="cert-stat-value">{issuedCount}</div>
        </div>
        <div className="cert-stat">
          <div className="cert-stat-label">Pending</div>
          <div className="cert-stat-value">{pendingCount}</div>
        </div>
        <div className="cert-stat">
          <div className="cert-stat-label">Revoked</div>
          <div className="cert-stat-value">{revokedCount}</div>
        </div>
      </div>

      <div className="cert-toolbar">
        <div className="cert-search">
          <input
            type="text"
            placeholder="Search student, certificate ID or program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="issued">Issued</option>
          <option value="pending">Pending</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {loading ? (
        <div className="cert-loading">Loading certificates...</div>
      ) : (
        <div className="cert-table-wrap">
          <table className="cert-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Certificate ID</th>
                <th>Program</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((certificate) => (
                <tr key={getId(certificate)}>
                  <td>
                    <div className="cert-student-name">
                      {getStudentName(certificate)}
                    </div>
                  </td>
                  <td>
                    <div className="cert-id">{getCertificateId(certificate)}</div>
                  </td>
                  <td>{getProgramName(certificate)}</td>
                  <td>{formatDate(certificate.issue_date || certificate.issued_at)}</td>
                  <td>
                    <span className={`cert-status ${statusClass(certificate.status)}`}>
                      {certificate.status || "issued"}
                    </span>
                  </td>
                  <td>
                    <div className="cert-actions">
                      <button
                        className="cert-action-btn"
                        onClick={() => openEdit(certificate)}
                      >
                        Edit
                      </button>
                      {certificate.status !== "revoked" ? (
                        <button
                          className="cert-action-btn"
                          onClick={() => changeStatus(certificate, "revoked")}
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          className="cert-action-btn"
                          onClick={() => changeStatus(certificate, "issued")}
                        >
                          Restore
                        </button>
                      )}
                      <button
                        className="cert-action-btn cert-action-delete"
                        onClick={() => handleDelete(certificate)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="cert-empty">
              No certificates found.
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div
          className="cert-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="cert-modal">
            <div className="cert-modal-header">
              <h2>{editing ? "Edit Certificate" : "Issue Certificate"}</h2>
              <button
                className="cert-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="cert-form" onSubmit={handleSubmit}>
              <div className="cert-field">
                <label>Student *</label>
                <select
                  required
                  value={form.student_id}
                  onChange={(e) =>
                    setForm({ ...form, student_id: e.target.value })
                  }
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={getId(student)} value={getId(student)}>
                      {getStudentName(student)}
                      {student.email ? ` — ${student.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cert-field">
                <label>Program / Internship *</label>
                <input
                  required
                  value={form.program}
                  onChange={(e) =>
                    setForm({ ...form, program: e.target.value })
                  }
                  placeholder="e.g. Web Development Internship"
                />
              </div>

              <div className="cert-field">
                <label>Certificate Type</label>
                <select
                  value={form.certificate_type}
                  onChange={(e) =>
                    setForm({ ...form, certificate_type: e.target.value })
                  }
                >
                  <option>Internship Certificate</option>
                  <option>Completion Certificate</option>
                  <option>Training Certificate</option>
                  <option>Achievement Certificate</option>
                  <option>Participation Certificate</option>
                </select>
              </div>

              <div className="cert-field">
                <label>Certificate ID / Verification ID</label>
                <input
                  value={form.certificate_id}
                  onChange={(e) =>
                    setForm({ ...form, certificate_id: e.target.value })
                  }
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div className="cert-field">
                <label>Issue Date *</label>
                <input
                  required
                  type="date"
                  value={form.issue_date}
                  onChange={(e) =>
                    setForm({ ...form, issue_date: e.target.value })
                  }
                />
              </div>

              <div className="cert-field">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option value="issued">Issued</option>
                  <option value="pending">Pending</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>

              <div className="cert-modal-footer">
                <button
                  type="button"
                  className="cert-secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cert-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Update Certificate"
                    : "Issue Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}