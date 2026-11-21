import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";
const EMPTY_FORM = {
  name: "",
  title: "",
  description: "",
  duration_hours: "",
  duration_days: "",
  program_type: "Internship",
  status: "active",
};

const getProgramName = (p) => p.name || p.title || "Untitled Program";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPrograms = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await apiGet("/admin/programs");

      const list = Array.isArray(res)
        ? res
        : res?.programs || res?.items || res?.data || [];

      setPrograms(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Programs load error:", err);
      setError(err.message || "Unable to load programs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const filteredPrograms = programs.filter((program) => {
    const query = search.toLowerCase();

    return (
      getProgramName(program).toLowerCase().includes(query) ||
      (program.description || "").toLowerCase().includes(query) ||
      (program.program_type || "").toLowerCase().includes(query)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (program) => {
    setEditing(program);

    setForm({
      name: program.name || "",
      title: program.title || "",
      description: program.description || "",
      duration_hours: program.duration_hours ?? "",
      duration_days: program.duration_days ?? "",
      program_type: program.program_type || "Internship",
      status: program.status || "active",
    });

    setError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const programName = form.name.trim() || form.title.trim();

    if (!programName) {
      setError("Program name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      ...form,
      name: programName,
      title: programName,
      duration_hours:
        form.duration_hours === "" ? null : Number(form.duration_hours),
      duration_days:
        form.duration_days === "" ? null : Number(form.duration_days),
    };

    try {
      if (editing) {
        const id = editing.id || editing._id;
        await apiPut(`/admin/programs/${id}`, payload);
        setNotice("Program updated successfully.");
      } else {
        await apiPost("/admin/programs", payload);
        setNotice("Program created successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadPrograms();
    } catch (err) {
      console.error("Program save error:", err);
      setError(err.message || "Unable to save program.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (program) => {
    const id = program.id || program._id;

    if (!window.confirm(`Delete "${getProgramName(program)}"?`)) return;

    try {
      await apiDelete(`/admin/programs/${id}`);
      setNotice("Program deleted successfully.");
      await loadPrograms();
    } catch (err) {
      console.error("Program delete error:", err);
      setError(err.message || "Unable to delete program.");
    }
  };

  const activeCount = programs.filter(
    (p) => (p.status || "active").toLowerCase() === "active"
  ).length;

  const totalStudents = programs.reduce(
    (total, p) =>
      total + Number(p.students_count || p.enrolled_count || p.total_students || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Programs
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage internship programs, training programs and enrollment.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <span className="text-lg">+</span>
            Create Program
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              className="ml-3 text-emerald-700"
            >
              ×
            </button>
          </div>
        )}

        {error && !modalOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Programs"
            value={programs.length}
            icon="P"
            color="indigo"
          />
          <StatCard
            title="Active Programs"
            value={activeCount}
            icon="A"
            color="emerald"
          />
          <StatCard
            title="Total Enrollments"
            value={totalStudents}
            icon="S"
            color="blue"
          />
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search programs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              onClick={loadPrograms}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Programs */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">Loading programs...</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600">
              P
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {search ? "No programs found" : "No programs created yet"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try searching with another keyword."
                : "Create your first program to get started."}
            </p>

            {!search && (
              <button
                onClick={openCreate}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create your first program
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Program
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Type
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Duration
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Students
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredPrograms.map((program) => (
                      <tr
                        key={program.id || program._id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {getProgramName(program)}
                          </div>
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {program.description || "No description"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {program.program_type || "Internship"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {program.duration_hours
                            ? `${program.duration_hours} Hours`
                            : program.duration_days
                            ? `${program.duration_days} Days`
                            : "Not specified"}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {program.students_count ||
                            program.enrolled_count ||
                            program.total_students ||
                            0}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={program.status || "active"} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(program)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(program)}
                              className="rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredPrograms.map((program) => (
                <div
                  key={program.id || program._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {getProgramName(program)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {program.program_type || "Internship"}
                      </p>
                    </div>

                    <StatusBadge status={program.status || "active"} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {program.description || "No description available."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {program.duration_hours
                          ? `${program.duration_hours} Hours`
                          : program.duration_days
                          ? `${program.duration_days} Days`
                          : "Not specified"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Students</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {program.students_count ||
                          program.enrolled_count ||
                          program.total_students ||
                          0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(program)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit Program
                    </button>

                    <button
                      onClick={() => handleDelete(program)}
                      className="flex-1 rounded-xl border border-red-100 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Program" : "Create Program"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Enter program details below
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Program Name *
                </label>
                <input
                  name="name"
                  value={form.name || form.title}
                  onChange={handleChange}
                  required
                  placeholder="120 Hours NEP Internship Program"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Program Type
                </label>
                <select
                  name="program_type"
                  value={form.program_type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Internship">Internship</option>
                  <option value="Training">Training</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Course">Course</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="duration_hours"
                    value={form.duration_hours}
                    onChange={handleChange}
                    placeholder="120"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="duration_days"
                    value={form.duration_days}
                    onChange={handleChange}
                    placeholder="30"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe this program..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
            colors[color] || colors.indigo
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const active = String(status).toLowerCase() === "active";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}