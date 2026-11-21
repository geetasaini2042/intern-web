import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  instructions: "",
  program_id: "",
  batch_id: "",
  deadline: "",
  max_marks: 100,
  status: "active",
  project_type: "Individual",
  submission_url: "",
};

const getId = (item) => item?.id || item?._id || "";

const getName = (item) =>
  item?.name || item?.title || item?.program_name || item?.batch_name || "Untitled";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatDate = (date) => {
  if (!date) return "No deadline";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [projectData, programData, batchData] = await Promise.all([
        apiGet("/admin/projects"),
        apiGet("/admin/programs"),
        apiGet("/admin/batches"),
      ]);

      setProjects(normalizeList(projectData));
      setPrograms(normalizeList(programData));
      setBatches(normalizeList(batchData));
    } catch (err) {
      console.error("Projects loading error:", err);
      setError(err?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const text = `${project.title || ""} ${project.description || ""} ${
        project.project_type || ""
      }`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (project.status || "active").toLowerCase() === statusFilter;

      const matchesProgram =
        programFilter === "all" ||
        String(project.program_id || "") === programFilter;

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [projects, search, statusFilter, programFilter]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(
        (p) => (p.status || "active").toLowerCase() === "active"
      ).length,
      completed: projects.filter(
        (p) => (p.status || "").toLowerCase() === "completed"
      ).length,
      inactive: projects.filter(
        (p) => (p.status || "").toLowerCase() !== "active"
      ).length,
    };
  }, [projects]);

  const getProgramName = (id) => {
    const program = programs.find((p) => String(getId(p)) === String(id));
    return program ? getName(program) : "All Programs";
  };

  const getBatchName = (id) => {
    const batch = batches.find((b) => String(getId(b)) === String(id));
    return batch ? getName(batch) : "All Batches";
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);

    setForm({
      title: project.title || "",
      description: project.description || "",
      instructions: project.instructions || "",
      program_id: project.program_id ? String(project.program_id) : "",
      batch_id: project.batch_id ? String(project.batch_id) : "",
      deadline: project.deadline
        ? String(project.deadline).slice(0, 16)
        : "",
      max_marks: project.max_marks ?? 100,
      status: project.status || "active",
      project_type: project.project_type || "Individual",
      submission_url: project.submission_url || "",
    });

    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Project title is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      program_id: form.program_id || null,
      batch_id: form.batch_id || null,
      deadline: form.deadline || null,
      max_marks: Number(form.max_marks) || 100,
      status: form.status,
      project_type: form.project_type,
      submission_url: form.submission_url.trim(),
    };

    try {
      if (editingProject) {
        await apiPut(`/admin/projects/${getId(editingProject)}`, payload);
        setSuccess("Project updated successfully.");
      } else {
        await apiPost("/admin/projects", payload);
        setSuccess("Project created successfully.");
      }

      setModalOpen(false);
      setEditingProject(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      console.error("Project save error:", err);
      setError(err?.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    if (
      !window.confirm(
        `Delete "${project.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiDelete(`/admin/projects/${getId(project)}`);
      setSuccess("Project deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Project deletion error:", err);
      setError(err?.message || "Failed to delete project.");
    }
  };

  const toggleStatus = async (project) => {
    const newStatus =
      (project.status || "active").toLowerCase() === "active"
        ? "inactive"
        : "active";

    try {
      await apiPut(`/admin/projects/${getId(project)}`, {
        ...project,
        status: newStatus,
      });

      await loadData();
    } catch (err) {
      console.error("Project status update error:", err);
      setError(err?.message || "Failed to update project status.");
    }
  };

  const statusBadge = (status) => {
    const value = (status || "active").toLowerCase();

    const styles = {
      active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      completed: "bg-blue-50 text-blue-700 ring-blue-200",
      inactive: "bg-gray-100 text-gray-600 ring-gray-200",
      pending: "bg-amber-50 text-amber-700 ring-amber-200",
    };

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
          styles[value] || styles.inactive
        }`}
      >
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </span>
    );
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Projects
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage student projects, assignments and deadlines.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <span className="text-lg leading-none">+</span>
            Create Project
          </button>
        </div>

        {error && !modalOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
            <button
              onClick={() => setSuccess("")}
              className="ml-3 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total Projects",
              value: stats.total,
              color: "text-indigo-600",
            },
            {
              label: "Active",
              value: stats.active,
              color: "text-emerald-600",
            },
            {
              label: "Completed",
              value: stats.completed,
              color: "text-blue-600",
            },
            {
              label: "Inactive",
              value: stats.inactive,
              color: "text-gray-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-xs font-medium text-gray-500 sm:text-sm">
                {stat.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className={inputClass}
              />
            </div>

            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className={`${inputClass} lg:w-56`}
            >
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={getId(program)} value={String(getId(program))}>
                  {getName(program)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} lg:w-44`}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">
                  Loading projects...
                </p>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                📁
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                No projects found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a project or change your filters.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      {[
                        "Project",
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
                          className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((project) => (
                      <tr
                        key={getId(project)}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-xs">
                            <p className="font-semibold text-gray-900">
                              {project.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {project.description || "No description"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {getProgramName(project.program_id)}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {getBatchName(project.batch_id)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                            {project.project_type || "Individual"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                          {formatDate(project.deadline)}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-gray-700">
                          {project.max_marks ?? 100}
                        </td>

                        <td className="px-5 py-4">
                          {statusBadge(project.status)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(project)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => toggleStatus(project)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              {project.status === "active"
                                ? "Disable"
                                : "Activate"}
                            </button>

                            <button
                              onClick={() => handleDelete(project)}
                              className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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

              <div className="divide-y divide-gray-100 lg:hidden">
                {filteredProjects.map((project) => (
                  <div key={getId(project)} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {project.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {project.description || "No description"}
                        </p>
                      </div>
                      {statusBadge(project.status)}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Program</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {getProgramName(project.program_id)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Batch</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {getBatchName(project.batch_id)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Deadline</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {formatDate(project.deadline)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Maximum Marks</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {project.max_marks ?? 100}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => openEdit(project)}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleStatus(project)}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {project.status === "active" ? "Disable" : "Activate"}
                      </button>

                      <button
                        onClick={() => handleDelete(project)}
                        className="rounded-xl border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 sm:px-5">
                Showing {filteredProjects.length} of {projects.length} projects
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingProject ? "Edit Project" : "Create Project"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Configure project details and assignment.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto px-5 py-5 sm:px-6"
            >
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Project Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="Enter project title"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Describe the project..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Instructions</label>
                  <textarea
                    rows={4}
                    value={form.instructions}
                    onChange={(e) => setField("instructions", e.target.value)}
                    placeholder="Project requirements and instructions..."
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Program</label>
                    <select
                      value={form.program_id}
                      onChange={(e) => setField("program_id", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">All Programs</option>
                      {programs.map((program) => (
                        <option key={getId(program)} value={getId(program)}>
                          {getName(program)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Batch</label>
                    <select
                      value={form.batch_id}
                      onChange={(e) => setField("batch_id", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">All Batches</option>
                      {batches.map((batch) => (
                        <option key={getId(batch)} value={getId(batch)}>
                          {getName(batch)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Project Type</label>
                    <select
                      value={form.project_type}
                      onChange={(e) => setField("project_type", e.target.value)}
                      className={inputClass}
                    >
                      <option value="Individual">Individual</option>
                      <option value="Group">Group</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Maximum Marks</label>
                    <input
                      type="number"
                      min="0"
                      value={form.max_marks}
                      onChange={(e) => setField("max_marks", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Submission Deadline</label>
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(e) => setField("deadline", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Submission URL (Optional)</label>
                  <input
                    type="url"
                    value={form.submission_url}
                    onChange={(e) => setField("submission_url", e.target.value)}
                    placeholder="https://example.com/submit"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingProject
                    ? "Update Project"
                    : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
