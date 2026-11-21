import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import {
  Search,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  Layers,
  X,
  CheckSquare,
  Square
} from "lucide-react";

export default function ImportLegacyStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(false);
  const [singleStudent, setSingleStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    internship_program: "",
    batch: "",
    mentor: "",
    email: "",
    password: ""
  });

  const loadLegacy = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/admin/legacy-students");
      setStudents(res?.students || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message || "Failed to load legacy students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegacy();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      if (onlyPending && s.already_imported) return false;
      if (!q) return true;
      return [
        s.full_name,
        s.registration_number,
        s.email,
        s.mobile_number,
        s.college_name,
        s.domain
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, search, onlyPending]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openSingleModal = (student) => {
    setSingleStudent(student);
    setForm({
      internship_program: student.domain || "",
      batch: "",
      mentor: "",
      email: student.email || "",
      password: ""
    });
  };

  const openBulkModal = () => {
    setBulkModal(true);
    setForm({
      internship_program: "",
      batch: "",
      mentor: "",
      email: "",
      password: ""
    });
  };

  const handleSingleImport = async (e) => {
    e.preventDefault();
    if (!singleStudent) return;
    setSubmitting(true);
    setError("");

    try {
      await apiPost("/admin/legacy-students/import", {
        legacy_student_id: singleStudent.id,
        internship_program: form.internship_program,
        batch: form.batch,
        mentor: form.mentor,
        email: form.email || undefined,
        password: form.password || undefined
      });

      setSingleStudent(null);
      showToast("Student imported to new portal.");
      await loadLegacy();
    } catch (err) {
      setError(err.message || "Import failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!selectedIds.length) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await apiPost("/admin/legacy-students/bulk-import", {
        legacy_student_ids: selectedIds,
        internship_program: form.internship_program,
        batch: form.batch,
        mentor: form.mentor,
        password: form.password || undefined
      });

      setBulkModal(false);
      showToast(res.message || "Bulk import completed.");
      await loadLegacy();
    } catch (err) {
      setError(err.message || "Bulk import failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-4 top-20 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2 size={17} className="text-emerald-400" />
          {toast}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Import Old Students
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select students from the old database and assign them a batch and internship program.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={openBulkModal}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <DownloadCloud size={16} />
              Import Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={loadLegacy}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, reg no, email, college..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-600"
            />
            Show only not-imported
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 size={26} className="animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={26} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No students found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((student) => {
              const checked = selectedIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    {!student.already_imported && (
                      <button
                        onClick={() => toggleSelect(student.id)}
                        className="mt-1 text-slate-400 hover:text-blue-600"
                      >
                        {checked ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {student.full_name}
                        </p>
                        {student.registration_number && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {student.registration_number}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {student.email || "No email"} · {student.mobile_number || "No phone"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {student.college_name || "—"} {student.domain ? `· ${student.domain}` : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    {student.already_imported ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={13} />
                        Imported
                      </span>
                    ) : (
                      <button
                        onClick={() => openSingleModal(student)}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <DownloadCloud size={14} />
                        Import
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Single / Bulk Import Modal */}
      {(singleStudent || bulkModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {bulkModal
                    ? `Import ${selectedIds.length} Students`
                    : `Import ${singleStudent.full_name}`}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Assign internship program and batch
                </p>
              </div>
              <button
                onClick={() => {
                  setSingleStudent(null);
                  setBulkModal(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={bulkModal ? handleBulkImport : handleSingleImport}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Internship Program *
                </label>
                <input
                  required
                  value={form.internship_program}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, internship_program: e.target.value }))
                  }
                  placeholder="e.g. 120 Hours NEP Internship"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Batch *
                </label>
                <input
                  required
                  value={form.batch}
                  onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                  placeholder="e.g. NEP-2026-A"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Mentor Name (Optional)
                </label>
                <input
                  value={form.mentor}
                  onChange={(e) => setForm((p) => ({ ...p, mentor: e.target.value }))}
                  placeholder="Mentor name"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {!bulkModal && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Login Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Leave blank to use existing email"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Initial Password (Optional)
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Default: Singodiya@123"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSingleStudent(null);
                    setBulkModal(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  Confirm Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
