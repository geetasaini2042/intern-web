import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Pencil,
  X,
  Mail,
  Phone,
  GraduationCap,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  FileText
} from "lucide-react";
import { API } from "../../lib/api";

const EMPTY_EDIT_FORM = {
  name: "",
  phone: "",
  college: "",
  course: "",
  year: "",
  enrollment: "",
  status: "active",
  mentor_remarks: ""
};

function getMentorToken() {
  return localStorage.getItem("mentor_token") || "";
}

function getId(item) {
  return item?.id || item?._id || "";
}

export default function MentorStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchStudents = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`${API}/mentor/students`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load students.");
      }

      const studentList = Array.isArray(data)
        ? data
        : data.students || data.items || data.data || [];
      const batchList = Array.isArray(data.batches) ? data.batches : [];

      setStudents(Array.isArray(studentList) ? studentList : []);
      setBatches(batchList);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openEditModal = (student) => {
    setEditingStudent(student);
    setForm({
      name: student.name || "",
      phone: student.phone || "",
      college: student.college || "",
      course: student.course || "",
      year: student.year || "",
      enrollment: student.enrollment || "",
      status: String(student.status || "active").toLowerCase(),
      mentor_remarks: student.mentor_remarks || ""
    });
    setModalError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!form.name.trim()) {
      setModalError("Student name is required.");
      return;
    }

    setSaving(true);
    setModalError("");

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      college: form.college.trim(),
      course: form.course.trim(),
      year: form.year.trim(),
      enrollment: form.enrollment.trim(),
      status: form.status || "active",
      mentor_remarks: form.mentor_remarks.trim()
    };

    try {
      const res = await fetch(`${API}/mentor/students/${getId(editingStudent)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to update student details.");
      }

      setEditingStudent(null);
      setNotice("Student details updated successfully.");
      await fetchStudents(true);
    } catch (err) {
      setModalError(err.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const batchOptions =
    batches.length > 0
      ? batches
      : Array.from(
          new Set(students.map((s) => (s.batch || "").trim()).filter(Boolean))
        ).map((name) => ({ id: name, name }));

  const filteredStudents = students.filter((student) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (student.name || "").toLowerCase().includes(q) ||
      (student.email || "").toLowerCase().includes(q) ||
      (student.phone || "").toLowerCase().includes(q) ||
      (student.college || "").toLowerCase().includes(q) ||
      (student.enrollment || "").toLowerCase().includes(q) ||
      (student.batch || "").toLowerCase().includes(q);

    const matchesBatch =
      !batchFilter ||
      String(student.batch_id || "") === String(batchFilter) ||
      String(student.batch || "") === String(batchFilter);

    const status = String(student.status || "active").toLowerCase();
    const matchesStatus = !statusFilter || status === statusFilter;

    return matchesSearch && matchesBatch && matchesStatus;
  });

  const activeCount = students.filter(
    (s) => String(s.status || "active").toLowerCase() === "active"
  ).length;

  const completedCount = students.filter(
    (s) => String(s.status || "").toLowerCase() === "completed"
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading your students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            My Students
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            All interns across your assigned batches. You can review and update their basic details.
          </p>
        </div>

        <button
          onClick={() => fetchStudents(true)}
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
          <button
            onClick={() => fetchStudents(true)}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Students" value={students.length} icon={Users} tone="indigo" />
        <StatCard title="Active Interns" value={activeCount} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Completed" value={completedCount} icon={Layers} tone="blue" />
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
              placeholder="Search name, email, phone, college, enrollment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 sm:w-56"
          >
            <option value="">All Assigned Batches</option>
            {batchOptions.map((batch) => (
              <option key={batch.id || batch.name} value={batch.id || batch.name}>
                {batch.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 sm:w-44"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Users className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-4 font-semibold text-slate-900">
            {search || batchFilter || statusFilter
              ? "No matching students found"
              : "No students assigned under you yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {search || batchFilter || statusFilter
              ? "Try changing your search or filter criteria."
              : "Students enrolled in your assigned batches will appear here automatically."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Student",
                      "Contact",
                      "Batch",
                      "Academic",
                      "Status",
                      "Action"
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={getId(student)}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {(student.name || "S").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {student.name || "Student"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {student.enrollment || "No enrollment"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <p className="text-slate-800">{student.email || "—"}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {student.phone || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <p className="font-medium text-slate-800">
                          {student.batch || "—"}
                        </p>
                        {student.domain && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {student.domain}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <p className="max-w-[200px] truncate text-slate-800">
                          {student.college || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[student.course, student.year].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusPill status={student.status || "active"} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEditModal(student)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredStudents.map((student) => (
              <div
                key={getId(student)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {(student.name || "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {student.name || "Student"}
                      </h3>
                      <p className="truncate text-xs text-indigo-600">
                        {student.batch || "No batch"}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={student.status || "active"} />
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {student.email && (
                    <p className="flex items-center gap-2">
                      <Mail size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">{student.email}</span>
                    </p>
                  )}
                  {student.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={13} className="shrink-0 text-slate-400" />
                      <span>{student.phone}</span>
                    </p>
                  )}
                  {(student.college || student.course) && (
                    <p className="flex items-center gap-2">
                      <GraduationCap size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {[student.college, student.course, student.year]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                  )}
                  {student.mentor_remarks && (
                    <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-slate-600">
                      <FileText size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                      <span className="line-clamp-2">{student.mentor_remarks}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-500">
                    {student.enrollment || "No enrollment"}
                  </span>
                  <button
                    onClick={() => openEditModal(student)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Pencil size={13} />
                    Edit Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Student Details
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {editingStudent.email} · {editingStudent.batch || "Assigned Student"}
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="max-h-[80vh] space-y-4 overflow-y-auto p-5"
            >
              {modalError && (
                <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  College / University
                </label>
                <input
                  name="college"
                  value={form.college}
                  onChange={handleChange}
                  placeholder="College or university name"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Course / Degree
                  </label>
                  <input
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    placeholder="e.g. B.Sc, BCA, B.Tech"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Academic Year
                  </label>
                  <input
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    placeholder="e.g. Final Year, 3rd Year"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Enrollment / Roll Number
                  </label>
                  <input
                    name="enrollment"
                    value={form.enrollment}
                    onChange={handleChange}
                    placeholder="University roll number"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Internship Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mentor Remarks / Feedback
                </label>
                <textarea
                  name="mentor_remarks"
                  value={form.mentor_remarks}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Performance notes or feedback for this student..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
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
