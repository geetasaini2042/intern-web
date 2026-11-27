import React, { useEffect, useState } from "react";
import {
  Layers,
  Users,
  CalendarDays,
  Clock3,
  RefreshCw,
  Pencil,
  X,
  Search,
  Mail,
  Phone,
  GraduationCap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save
} from "lucide-react";
import { API } from "../../lib/api";

const EMPTY_EDIT_FORM = {
  mode: "Online",
  duration_hours: "",
  start_date: "",
  end_date: "",
  status: "active",
  description: ""
};

function getMentorToken() {
  return localStorage.getItem("mentor_token") || "";
}

function getId(item) {
  return item?.id || item?._id || "";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function MentorBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [studentsModalBatch, setStudentsModalBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const [editBatch, setEditBatch] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchBatches = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`${API}/mentor/batches`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load assigned batches.");
      }

      const list = Array.isArray(data)
        ? data
        : data.batches || data.items || data.data || [];
      setBatches(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openStudentsModal = async (batch) => {
    setStudentsModalBatch(batch);
    setStudentSearch("");
    setError("");

    if (Array.isArray(batch.students)) {
      setBatchStudents(batch.students);
      setStudentsLoading(false);
      return;
    }

    setBatchStudents([]);
    setStudentsLoading(true);

    try {
      const res = await fetch(`${API}/mentor/batches/${getId(batch)}/students`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load batch students.");
      }

      const list = Array.isArray(data)
        ? data
        : data.students || data.items || data.data || [];
      setBatchStudents(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Unable to load students.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const openEditModal = (batch) => {
    setEditBatch(batch);
    setEditForm({
      mode: batch.mode || "Online",
      duration_hours: batch.duration_hours ?? "",
      start_date: batch.start_date || "",
      end_date: batch.end_date || "",
      status: String(batch.status || "active").toLowerCase(),
      description: batch.description || ""
    });
    setModalError("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!editBatch) return;

    if (
      editForm.start_date &&
      editForm.end_date &&
      editForm.end_date < editForm.start_date
    ) {
      setModalError("End date cannot be before start date.");
      return;
    }

    setSaving(true);
    setModalError("");

    const payload = {
      mode: editForm.mode || "Online",
      duration_hours:
        editForm.duration_hours === "" ? null : Number(editForm.duration_hours),
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
      status: editForm.status || "active",
      description: editForm.description.trim()
    };

    try {
      const res = await fetch(`${API}/mentor/batches/${getId(editBatch)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to update batch details.");
      }

      setEditBatch(null);
      setNotice("Batch details updated successfully.");
      await fetchBatches(true);
    } catch (err) {
      setModalError(err.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const filteredBatches = batches.filter((batch) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (batch.name || "").toLowerCase().includes(q) ||
      (batch.domain || "").toLowerCase().includes(q) ||
      (batch.program_name || "").toLowerCase().includes(q) ||
      (batch.description || "").toLowerCase().includes(q);

    const status = String(batch.status || "active").toLowerCase();
    const matchesStatus = !statusFilter || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = batches.filter(
    (b) => String(b.status || "active").toLowerCase() === "active"
  ).length;

  const totalStudents = batches.reduce(
    (sum, b) => sum + Number(b.students_count ?? (Array.isArray(b.students) ? b.students.length : 0)),
    0
  );

  const filteredModalStudents = batchStudents.filter((student) => {
    const q = studentSearch.toLowerCase();
    return (
      (student.name || "").toLowerCase().includes(q) ||
      (student.email || "").toLowerCase().includes(q) ||
      (student.phone || "").toLowerCase().includes(q) ||
      (student.college || "").toLowerCase().includes(q) ||
      (student.enrollment || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading your batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            My Batches
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View your assigned batches, inspect enrolled students, and update basic batch details.
          </p>
        </div>

        <button
          onClick={() => fetchBatches(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:self-center"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchBatches(true)} className="shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Assigned Batches" value={batches.length} icon={Layers} tone="indigo" />
        <StatCard title="Active Batches" value={activeCount} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Total Students" value={totalStudents} icon={Users} tone="blue" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search batch name, domain or program..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 sm:w-48"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Layers className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-4 font-semibold text-slate-900">
            {search || statusFilter ? "No matching batches found" : "No batches assigned yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {search || statusFilter
              ? "Try adjusting your search or status filter."
              : "Batches assigned to you by the admin will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredBatches.map((batch) => {
            const studentsCount =
              batch.students_count ?? (Array.isArray(batch.students) ? batch.students.length : 0);

            return (
              <div
                key={getId(batch)}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-slate-900">
                        {batch.name || "Untitled Batch"}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-indigo-600">
                        {batch.domain || "General Domain"}
                      </p>
                      {batch.program_name && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Program: {batch.program_name}
                        </p>
                      )}
                    </div>
                    <StatusPill status={batch.status || "active"} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                    {batch.description || "No batch description added yet."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <InfoTile
                      icon={Users}
                      label="Students"
                      value={
                        batch.capacity
                          ? `${studentsCount} / ${batch.capacity}`
                          : `${studentsCount}`
                      }
                    />
                    <InfoTile
                      icon={Layers}
                      label="Mode"
                      value={batch.mode || "Online"}
                    />
                    <InfoTile
                      icon={Clock3}
                      label="Duration"
                      value={batch.duration_hours ? `${batch.duration_hours} hrs` : "—"}
                    />
                    <InfoTile
                      icon={CalendarDays}
                      label="Start"
                      value={formatDate(batch.start_date)}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                    <span>Duration Window</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(batch.start_date)} – {formatDate(batch.end_date)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => openStudentsModal(batch)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Users size={16} />
                    View Students ({studentsCount})
                  </button>

                  <button
                    onClick={() => openEditModal(batch)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil size={15} />
                    Edit Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {studentsModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {studentsModalBatch.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {batchStudents.length} enrolled student{batchStudents.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={() => setStudentsModalBatch(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student by name, email, phone, college or enrollment..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {studentsLoading ? (
                <div className="py-14 text-center">
                  <Loader2 className="mx-auto animate-spin text-indigo-600" size={26} />
                  <p className="mt-3 text-sm text-slate-500">Loading students...</p>
                </div>
              ) : filteredModalStudents.length === 0 ? (
                <div className="py-14 text-center">
                  <Users className="mx-auto text-slate-300" size={30} />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {studentSearch ? "No matching students found" : "No students enrolled in this batch"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredModalStudents.map((student) => (
                    <div
                      key={getId(student)}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                          {(student.name || "S").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {student.name || "Student"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {student.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail size={12} />
                                {student.email}
                              </span>
                            )}
                            {student.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone size={12} />
                                {student.phone}
                              </span>
                            )}
                          </div>
                          {(student.college || student.course) && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                              <GraduationCap size={12} />
                              {[student.college, student.course].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {student.enrollment && (
                        <span className="self-start rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 sm:self-center">
                          {student.enrollment}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Basic Batch Details
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editBatch.name}
                </p>
              </div>
              <button
                onClick={() => setEditBatch(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4 p-5">
              {modalError && (
                <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Internship Mode
                  </label>
                  <select
                    name="mode"
                    value={editForm.mode}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="duration_hours"
                    value={editForm.duration_hours}
                    onChange={handleEditChange}
                    placeholder="e.g. 120"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={editForm.start_date}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={editForm.end_date}
                    onChange={handleEditChange}
                    min={editForm.start_date || undefined}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Batch Status
                </label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description / Notes
                </label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                  placeholder="Add batch instructions or schedule notes..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditBatch(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600"
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          tones[tone] || tones.indigo
        }`}
      >
        <Icon size={20} />
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Icon size={12} className="text-indigo-500" />
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status).toLowerCase();
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    completed: "bg-blue-50 text-blue-700",
    inactive: "bg-slate-100 text-slate-600"
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[normalized] || styles.inactive
      }`}
    >
      {normalized}
    </span>
  );
}
