import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  instructions: "",
  program_id: "",
  batch_id: "",
  task_type: "Assignment",
  due_date: "",
  max_marks: "",
  status: "active",
};

const getId = (item) => item?.id || item?._id;

const getTaskTitle = (task) => task.title || task.name || "Untitled Task";

const normalizeList = (res, key) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export default function TasksAdmin() {
  const [tasks, setTasks] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [taskRes, programRes, batchRes] = await Promise.all([
        apiGet("/admin/tasks"),
        apiGet("/admin/programs"),
        apiGet("/admin/batches"),
      ]);

      setTasks(normalizeList(taskRes, "tasks"));
      setPrograms(normalizeList(programRes, "programs"));
      setBatches(normalizeList(batchRes, "batches"));
    } catch (err) {
      console.error("Tasks loading error:", err);
      setError(err.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  const getProgramName = (programId) => {
    if (programId && typeof programId === "object") {
      return programId.name || programId.title || "Unknown Program";
    }

    const program = programs.find(
      (p) => String(getId(p)) === String(programId)
    );

    return program?.name || program?.title || "Unknown Program";
  };

  const getBatchName = (batchId) => {
    if (batchId && typeof batchId === "object") {
      return batchId.name || batchId.title || "Unknown Batch";
    }

    const batch = batches.find(
      (b) => String(getId(b)) === String(batchId)
    );

    return batch?.name || batch?.title || "Unknown Batch";
  };

  const getTaskProgramId = (task) =>
    task.program_id || task.programId || task.program || "";

  const getTaskBatchId = (task) =>
    task.batch_id || task.batchId || task.batch || "";

  const filteredBatches = batches.filter((batch) => {
    if (!form.program_id) return true;

    const batchProgramId =
      typeof batch.program_id === "object"
        ? getId(batch.program_id)
        : batch.program_id || batch.programId || batch.program;

    return String(batchProgramId) === String(form.program_id);
  });

  const filteredTasks = tasks.filter((task) => {
    const query = search.toLowerCase();

    const matchesSearch =
      getTaskTitle(task).toLowerCase().includes(query) ||
      (task.description || "").toLowerCase().includes(query) ||
      getProgramName(getTaskProgramId(task)).toLowerCase().includes(query) ||
      getBatchName(getTaskBatchId(task)).toLowerCase().includes(query);

    const taskProgramId = getTaskProgramId(task);
    const taskBatchId = getTaskBatchId(task);

    const matchesProgram =
      !programFilter ||
      String(
        typeof taskProgramId === "object"
          ? getId(taskProgramId)
          : taskProgramId
      ) === String(programFilter);

    const matchesBatch =
      !batchFilter ||
      String(
        typeof taskBatchId === "object"
          ? getId(taskBatchId)
          : taskBatchId
      ) === String(batchFilter);

    const matchesStatus =
      !statusFilter ||
      String(task.status || "active").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesProgram && matchesBatch && matchesStatus;
  });

  const activeCount = tasks.filter(
    (task) => String(task.status || "active").toLowerCase() === "active"
  ).length;

  const draftCount = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "draft"
  ).length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);

    const programId = getTaskProgramId(task);
    const batchId = getTaskBatchId(task);

    setForm({
      title: task.title || task.name || "",
      description: task.description || "",
      instructions: task.instructions || "",
      program_id:
        typeof programId === "object"
          ? String(getId(programId) || "")
          : String(programId || ""),
      batch_id:
        typeof batchId === "object"
          ? String(getId(batchId) || "")
          : String(batchId || ""),
      task_type: task.task_type || task.type || "Assignment",
      due_date: task.due_date || task.deadline || "",
      max_marks: task.max_marks ?? task.marks ?? "",
      status: task.status || "active",
    });

    setError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "program_id" ? { batch_id: "" } : {}),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!form.program_id) {
      setError("Please select a program.");
      return;
    }

    if (!form.batch_id) {
      setError("Please select a batch.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      description: form.description,
      instructions: form.instructions,
      program_id: form.program_id,
      batch_id: form.batch_id,
      task_type: form.task_type,
      due_date: form.due_date || null,
      max_marks: form.max_marks === "" ? null : Number(form.max_marks),
      status: form.status,
    };

    try {
      if (editing) {
        await apiPut(`/admin/tasks/${getId(editing)}`, payload);
        setNotice("Task updated successfully.");
      } else {
        await apiPost("/admin/tasks", payload);
        setNotice("Task created successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      console.error("Task save error:", err);
      setError(err.message || "Unable to save task.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${getTaskTitle(task)}"?`)) return;

    try {
      await apiDelete(`/admin/tasks/${getId(task)}`);
      setNotice("Task deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Task delete error:", err);
      setError(err.message || "Unable to delete task.");
    }
  };

  const isOverdue = (task) => {
    const dueDate = task.due_date || task.deadline;
    if (!dueDate) return false;

    return (
      new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0) &&
      String(task.status).toLowerCase() !== "completed"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tasks & Assignments
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, assign and manage tasks for your batches.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Create Task
          </button>
        </div>

        {/* Alerts */}
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

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Tasks" value={tasks.length} color="indigo" />
          <StatCard title="Active Tasks" value={activeCount} color="emerald" />
          <StatCard title="Draft Tasks" value={draftCount} color="amber" />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <select
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setBatchFilter("");
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={getId(program)} value={getId(program)}>
                  {program.name || program.title}
                </option>
              ))}
            </select>

            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">All Batches</option>
              {batches
                .filter((batch) => {
                  if (!programFilter) return true;

                  const batchProgramId =
                    typeof batch.program_id === "object"
                      ? getId(batch.program_id)
                      : batch.program_id || batch.programId || batch.program;

                  return String(batchProgramId) === String(programFilter);
                })
                .map((batch) => (
                  <option key={getId(batch)} value={getId(batch)}>
                    {batch.name || batch.title}
                  </option>
                ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearch("");
              setProgramFilter("");
              setBatchFilter("");
              setStatusFilter("");
            }}
            className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Clear filters
          </button>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600">
              T
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {search || programFilter || batchFilter || statusFilter
                ? "No tasks found"
                : "No tasks created yet"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a task and assign it to a batch.
            </p>

            {!search && !programFilter && !batchFilter && !statusFilter && (
              <button
                onClick={openCreate}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create your first task
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
                        "Task",
                        "Program",
                        "Batch",
                        "Type",
                        "Deadline",
                        "Marks",
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
                    {filteredTasks.map((task) => (
                      <tr
                        key={getId(task)}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {getTaskTitle(task)}
                          </div>
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {task.description || "No description"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getProgramName(getTaskProgramId(task))}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getBatchName(getTaskBatchId(task))}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {task.task_type || task.type || "Assignment"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          <span
                            className={
                              isOverdue(task)
                                ? "font-medium text-red-600"
                                : "text-slate-600"
                            }
                          >
                            {task.due_date || task.deadline || "No deadline"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {task.max_marks ?? task.marks ?? "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={task.status || "active"} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(task)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(task)}
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
              {filteredTasks.map((task) => (
                <div
                  key={getId(task)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {getTaskTitle(task)}
                      </h3>
                      <p className="mt-1 text-sm text-indigo-600">
                        {getProgramName(getTaskProgramId(task))}
                      </p>
                    </div>

                    <StatusBadge status={task.status || "active"} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {task.description || "No description available."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {task.task_type || task.type || "Assignment"}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {getBatchName(getTaskBatchId(task))}
                    </span>

                    {task.max_marks != null && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {task.max_marks} Marks
                      </span>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Deadline</p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        isOverdue(task) ? "text-red-600" : "text-slate-800"
                      }`}
                    >
                      {task.due_date || task.deadline || "No deadline"}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(task)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(task)}
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

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Task" : "Create Task"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure assignment details
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

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Task Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Assignment 01 - HTML Basics"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Program */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Program *
                </label>
                <select
                  name="program_id"
                  value={form.program_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="">Select Program</option>
                  {programs.map((program) => (
                    <option key={getId(program)} value={getId(program)}>
                      {program.name || program.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Batch *
                </label>
                <select
                  name="batch_id"
                  value={form.batch_id}
                  onChange={handleChange}
                  required
                  disabled={!form.program_id}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Select Batch</option>
                  {filteredBatches.map((batch) => (
                    <option key={getId(batch)} value={getId(batch)}>
                      {batch.name || batch.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type and Marks */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Task Type
                  </label>
                  <select
                    name="task_type"
                    value={form.task_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Project">Project</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Practical">Practical</option>
                    <option value="Report">Report</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="max_marks"
                    value={form.max_marks}
                    onChange={handleChange}
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Deadline
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Task description..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Detailed instructions for students..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              {/* Status */}
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
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Buttons */}
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
                  disabled={saving || programs.length === 0 || batches.length === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Create Task"}
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
    indigo: "bg-indigo-50",
    emerald: "bg-emerald-50",
    amber: "bg-amber-50",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <div className={`mt-3 h-1 w-12 rounded-full ${colors[color]}`} />
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status).toLowerCase();

  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    draft: "bg-amber-50 text-amber-700",
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