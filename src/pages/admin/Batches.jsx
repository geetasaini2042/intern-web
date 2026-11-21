import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  name: "",
  program_id: "",
  description: "",
  start_date: "",
  end_date: "",
  capacity: "",
  status: "active",
};

const getId = (item) => item.id || item._id;

const getBatchName = (batch) => batch.name || batch.title || "Untitled Batch";

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [batchRes, programRes] = await Promise.all([
        apiGet("/admin/batches"),
        apiGet("/admin/programs"),
      ]);

      const batchList = Array.isArray(batchRes)
        ? batchRes
        : batchRes?.batches || batchRes?.items || batchRes?.data || [];

      const programList = Array.isArray(programRes)
        ? programRes
        : programRes?.programs || programRes?.items || programRes?.data || [];

      setBatches(Array.isArray(batchList) ? batchList : []);
      setPrograms(Array.isArray(programList) ? programList : []);
    } catch (err) {
      console.error("Batches loading error:", err);
      setError(err.message || "Unable to load batches.");
    } finally {
      setLoading(false);
    }
  };

  const getProgram = (batch) => {
    const programId = batch.program_id || batch.program || batch.programId;

    if (typeof programId === "object" && programId !== null) {
      return programId.name || programId.title || "Unknown Program";
    }

    const found = programs.find(
      (p) => String(getId(p)) === String(programId)
    );

    return found ? found.name || found.title : "Unknown Program";
  };

  const filteredBatches = batches.filter((batch) => {
    const q = search.toLowerCase();

    const matchesSearch =
      getBatchName(batch).toLowerCase().includes(q) ||
      getProgram(batch).toLowerCase().includes(q) ||
      (batch.description || "").toLowerCase().includes(q);

    const batchProgramId =
      typeof batch.program_id === "object"
        ? getId(batch.program_id)
        : batch.program_id || batch.programId || batch.program;

    const matchesProgram =
      !programFilter ||
      String(batchProgramId) === String(programFilter);

    return matchesSearch && matchesProgram;
  });

  const activeCount = batches.filter(
    (b) => String(b.status || "active").toLowerCase() === "active"
  ).length;

  const totalStudents = batches.reduce(
    (total, batch) =>
      total +
      Number(
        batch.students_count ||
          batch.enrolled_count ||
          batch.total_students ||
          0
      ),
    0
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (batch) => {
    setEditing(batch);

    const programId =
      typeof batch.program_id === "object"
        ? getId(batch.program_id)
        : batch.program_id || batch.programId || batch.program || "";

    setForm({
      name: batch.name || batch.title || "",
      program_id: programId ? String(programId) : "",
      description: batch.description || "",
      start_date: batch.start_date || batch.startDate || "",
      end_date: batch.end_date || batch.endDate || "",
      capacity: batch.capacity ?? batch.max_students ?? "",
      status: batch.status || "active",
    });

    setError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Batch name is required.");
      return;
    }

    if (!form.program_id) {
      setError("Please select a program.");
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError("End date cannot be before start date.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      program_id: form.program_id,
      description: form.description,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      capacity: form.capacity === "" ? null : Number(form.capacity),
      status: form.status,
    };

    try {
      if (editing) {
        await apiPut(`/admin/batches/${getId(editing)}`, payload);
        setNotice("Batch updated successfully.");
      } else {
        await apiPost("/admin/batches", payload);
        setNotice("Batch created successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      console.error("Batch save error:", err);
      setError(err.message || "Unable to save batch.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Delete "${getBatchName(batch)}"?`)) return;

    try {
      await apiDelete(`/admin/batches/${getId(batch)}`);
      setNotice("Batch deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Batch delete error:", err);
      setError(err.message || "Unable to delete batch.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Batches
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Organize programs into batches and manage student enrollment.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Create Batch
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}

        {error && !modalOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Batches" value={batches.length} color="indigo" />
          <StatCard title="Active Batches" value={activeCount} color="emerald" />
          <StatCard title="Enrolled Students" value={totalStudents} color="blue" />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search batch or program..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 sm:w-64"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={getId(program)} value={getId(program)}>
                  {program.name || program.title}
                </option>
              ))}
            </select>

            <button
              onClick={loadData}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">Loading batches...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600">
              B
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {search || programFilter
                ? "No batches found"
                : "No batches created yet"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a batch under one of your programs.
            </p>

            {!search && !programFilter && (
              <button
                onClick={openCreate}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create Batch
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
                      {[
                        "Batch",
                        "Program",
                        "Dates",
                        "Students",
                        "Capacity",
                        "Status",
                        "Actions",
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
                    {filteredBatches.map((batch) => (
                      <tr
                        key={getId(batch)}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {getBatchName(batch)}
                          </div>
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {batch.description || "No description"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getProgram(batch)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          <div>{batch.start_date || batch.startDate || "—"}</div>
                          <div className="text-xs text-slate-400">
                            to {batch.end_date || batch.endDate || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {batch.students_count ||
                            batch.enrolled_count ||
                            batch.total_students ||
                            0}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {batch.capacity ?? batch.max_students ?? "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={batch.status || "active"} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(batch)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(batch)}
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
              {filteredBatches.map((batch) => (
                <div
                  key={getId(batch)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {getBatchName(batch)}
                      </h3>
                      <p className="mt-1 text-sm text-indigo-600">
                        {getProgram(batch)}
                      </p>
                    </div>

                    <StatusBadge status={batch.status || "active"} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {batch.description || "No description available."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <InfoBox
                      label="Start Date"
                      value={batch.start_date || batch.startDate || "—"}
                    />
                    <InfoBox
                      label="End Date"
                      value={batch.end_date || batch.endDate || "—"}
                    />
                    <InfoBox
                      label="Students"
                      value={
                        batch.students_count ||
                        batch.enrolled_count ||
                        batch.total_students ||
                        0
                      }
                    />
                    <InfoBox
                      label="Capacity"
                      value={batch.capacity ?? batch.max_students ?? "—"}
                    />
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(batch)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(batch)}
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Batch" : "Create Batch"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure batch details
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
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
                  Batch Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="NEP Internship 2026 - Batch 01"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Program *
                </label>
                <select
                  name="program_id"
                  value={form.program_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select Program</option>
                  {programs.map((program) => (
                    <option key={getId(program)} value={getId(program)}>
                      {program.name || program.title}
                    </option>
                  ))}
                </select>

                {programs.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Create a program first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    min={form.start_date || undefined}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Student Capacity
                </label>
                <input
                  type="number"
                  min="0"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  placeholder="Maximum students"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Batch details..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
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
                  disabled={saving || programs.length === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <div className={`mt-3 h-1 w-12 rounded-full ${colors[color]}`} />
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status).toLowerCase();

  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    inactive: "bg-slate-100 text-slate-600",
    completed: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[normalized] || styles.inactive
      }`}
    >
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
}