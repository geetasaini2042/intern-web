import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  instructions: "",
  program_id: "",
  batch_id: "",
  task_type: "Assignment",
  submission_type: "text",
  allowed_formats: "",
  max_file_size: "10",
  multiple_files: false,
  submission_required: true,
  code_language: "",
  starter_code: "",
  requirements: "",
  resources: "",
  grading_criteria: "",
  start_date: "",
  due_date: "",
  allow_late_submission: false,
  late_days: "0",
  allow_resubmission: true,
  max_attempts: "3",
  estimated_hours: "",
  difficulty: "Medium",
  max_marks: "",
  status: "active",
};

const getId = (item) => item?.id || item?._id || "";

const getTaskTitle = (task) => task?.title || task?.name || "Untitled Task";

const normalizeList = (res, key) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.[key])) return res.data[key];
  return [];
};

const toDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const listToText = (list) => {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) =>
      typeof item === "string"
        ? item
        : item.title || item.text || item.name || ""
    )
    .filter(Boolean)
    .join("\n");
};

const resourcesToText = (list) => {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) => {
      if (typeof item === "string") return item;
      return `${item.title || item.name || ""}|${item.url || item.link || ""}|${item.type || "Link"}`;
    })
    .join("\n");
};

const parseResources = (value) => {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        title: parts[0] || "Resource",
        url: parts[1] || "",
        type: parts[2] || "Link",
      };
    });
};

const formatsToText = (val, fallback) => {
  const target = val ?? fallback;
  if (Array.isArray(target)) return target.join(", ");
  return target ? String(target) : "";
};

const SUBMISSION_TYPES = [
  { value: "text", label: "Text Answer", description: "Written answer or explanation" },
  { value: "code", label: "Code", description: "Programming code submission" },
  { value: "image", label: "Image", description: "Image upload" },
  { value: "pdf", label: "PDF Document", description: "PDF file submission" },
  { value: "file", label: "File Upload", description: "Any allowed document/file" },
  { value: "link", label: "Website / Link", description: "URL submission" },
  { value: "github", label: "GitHub Repository", description: "Repository link" },
  { value: "multiple", label: "Multiple Formats", description: "Text, files, links etc." },
];

const LANGUAGES = [
  "Python",
  "Java",
  "C",
  "C++",
  "JavaScript",
  "TypeScript",
  "HTML/CSS",
  "PHP",
  "SQL",
  "Bash",
  "Other",
];

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
  const [submissionFilter, setSubmissionFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [taskRes, programRes, batchRes] = await Promise.allSettled([
        apiGet("/admin/tasks"),
        apiGet("/admin/programs"),
        apiGet("/admin/batches"),
      ]);

      const errors = [];

      if (taskRes.status === "fulfilled") {
        setTasks(normalizeList(taskRes.value, "tasks"));
      } else {
        console.error("Tasks API error:", taskRes.reason);
        errors.push(taskRes.reason?.message || "Failed to load tasks");
      }

      if (programRes.status === "fulfilled") {
        setPrograms(normalizeList(programRes.value, "programs"));
      } else {
        console.error("Programs API error:", programRes.reason);
        errors.push(programRes.reason?.message || "Failed to load programs");
      }

      if (batchRes.status === "fulfilled") {
        setBatches(normalizeList(batchRes.value, "batches"));
      } else {
        console.error("Batches API error:", batchRes.reason);
        errors.push(batchRes.reason?.message || "Failed to load batches");
      }

      if (errors.length) {
        setError(errors[0]);
      }
    } catch (err) {
      console.error("Tasks loading error:", err);
      setError(err?.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    task?.program_id || task?.programId || task?.program || "";

  const getTaskBatchId = (task) =>
    task?.batch_id || task?.batchId || task?.batch || "";

  const filteredBatches = batches.filter((batch) => {
    if (!form.program_id) return true;

    const batchProgramId =
      typeof batch.program_id === "object"
        ? getId(batch.program_id)
        : batch.program_id || batch.programId || batch.program;

    return String(batchProgramId) === String(form.program_id);
  });

  const filterBatches = batches.filter((batch) => {
    if (!programFilter) return true;

    const batchProgramId =
      typeof batch.program_id === "object"
        ? getId(batch.program_id)
        : batch.program_id || batch.programId || batch.program;

    return String(batchProgramId) === String(programFilter);
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

    const matchesSubmission =
      !submissionFilter ||
      String(task.submission_type || "text").toLowerCase() ===
        submissionFilter.toLowerCase();

    return (
      matchesSearch &&
      matchesProgram &&
      matchesBatch &&
      matchesStatus &&
      matchesSubmission
    );
  });

  const activeCount = tasks.filter(
    (task) => String(task.status || "active").toLowerCase() === "active"
  ).length;

  const draftCount = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "draft"
  ).length;

  const submissionCount = tasks.filter((task) => task.submission_type).length;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);

    const programId = getTaskProgramId(task);
    const batchId = getTaskBatchId(task);

    const config = task.submission_config || {};
    const settings = task.settings || {};

    setForm({
      ...EMPTY_FORM,
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
      submission_type: task.submission_type || config.type || "text",
      allowed_formats: formatsToText(
        task.allowed_formats,
        config.allowed_formats
      ),
      max_file_size: String(
        task.max_file_size || config.max_file_size || 10
      ),
      multiple_files: Boolean(
        task.multiple_files ?? config.multiple_files ?? false
      ),
      submission_required: Boolean(
        task.submission_required ?? config.required ?? true
      ),
      code_language:
        task.code_language || config.code_language || config.language || "",
      starter_code: task.starter_code || config.starter_code || "",
      requirements: listToText(task.requirements || task.checklist || []),
      resources: resourcesToText(task.resources || task.attachments || []),
      grading_criteria: listToText(task.grading_criteria || task.rubric || []),
      start_date: toDateInput(task.start_date),
      due_date: toDateInput(task.due_date || task.deadline),
      allow_late_submission: Boolean(
        task.allow_late_submission ?? settings.allow_late_submission ?? false
      ),
      late_days: String(task.late_days ?? settings.late_days ?? 0),
      allow_resubmission: Boolean(
        task.allow_resubmission ?? settings.allow_resubmission ?? true
      ),
      max_attempts: String(task.max_attempts ?? settings.max_attempts ?? 3),
      estimated_hours:
        task.estimated_hours != null ? String(task.estimated_hours) : "",
      difficulty: task.difficulty || "Medium",
      max_marks:
        task.max_marks != null
          ? String(task.max_marks)
          : task.marks != null
          ? String(task.marks)
          : "",
      status: task.status || "active",
    });

    setError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

    if (form.start_date && form.due_date && form.start_date > form.due_date) {
      setError("Due date cannot be earlier than the start date.");
      return;
    }

    if (
      ["image", "pdf", "file", "multiple"].includes(form.submission_type) &&
      Number(form.max_file_size) <= 0
    ) {
      setError("Maximum file size must be greater than zero.");
      return;
    }

    if (form.submission_type === "code" && !form.code_language) {
      setError("Please select a programming language.");
      return;
    }

    setSaving(true);
    setError("");

    const allowedFormats = String(form.allowed_formats || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .map((x) => (x.startsWith(".") ? x : `.${x}`));

    const requirements = String(form.requirements || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const resources = parseResources(form.resources);

    const gradingCriteria = String(form.grading_criteria || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      description: form.description,
      instructions: form.instructions,
      program_id: form.program_id,
      batch_id: form.batch_id,
      task_type: form.task_type,
      submission_type: form.submission_type,
      submission_config: {
        type: form.submission_type,
        allowed_formats: allowedFormats,
        max_file_size: Number(form.max_file_size) || 10,
        multiple_files: form.multiple_files,
        required: form.submission_required,
        language: form.code_language || null,
        code_language: form.code_language || null,
        starter_code: form.starter_code || null,
      },
      allowed_formats: allowedFormats,
      max_file_size: Number(form.max_file_size) || 10,
      multiple_files: form.multiple_files,
      submission_required: form.submission_required,
      code_language: form.code_language || null,
      starter_code: form.starter_code || null,
      requirements,
      checklist: requirements,
      resources,
      grading_criteria: gradingCriteria,
      rubric: gradingCriteria,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      allow_late_submission: form.allow_late_submission,
      late_days: Number(form.late_days) || 0,
      allow_resubmission: form.allow_resubmission,
      max_attempts: Number(form.max_attempts) || 1,
      settings: {
        allow_late_submission: form.allow_late_submission,
        late_days: Number(form.late_days) || 0,
        allow_resubmission: form.allow_resubmission,
        max_attempts: Number(form.max_attempts) || 1,
      },
      estimated_hours:
        form.estimated_hours === "" ? null : Number(form.estimated_hours),
      difficulty: form.difficulty,
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
      setForm({ ...EMPTY_FORM });
      await loadData();
    } catch (err) {
      console.error("Task save error:", err);
      setError(err?.message || "Unable to save task.");
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
      setError(err?.message || "Unable to delete task.");
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

  const submissionLabel = (type) =>
    SUBMISSION_TYPES.find((t) => t.value === type)?.label || type || "Text";

  const showFileSettings = ["image", "pdf", "file", "multiple"].includes(
    form.submission_type
  );

  const showCodeSettings = ["code", "multiple"].includes(form.submission_type);

  const showLinkSettings = ["link", "github", "multiple"].includes(
    form.submission_type
  );

  const showTextSettings = ["text", "multiple"].includes(form.submission_type);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tasks & Assignments
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, configure, assign and manage student tasks.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Create Task
          </button>
        </div>

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Tasks" value={tasks.length} color="indigo" />
          <StatCard title="Active Tasks" value={activeCount} color="emerald" />
          <StatCard title="Draft Tasks" value={draftCount} color="amber" />
          <StatCard
            title="Configured Tasks"
            value={submissionCount}
            color="blue"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">All Batches</option>
              {filterBatches.map((batch) => (
                <option key={getId(batch)} value={getId(batch)}>
                  {batch.name || batch.title}
                </option>
              ))}
            </select>

            <select
              value={submissionFilter}
              onChange={(e) => setSubmissionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">All Submission Types</option>
              {SUBMISSION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
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
              setSubmissionFilter("");
            }}
            className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Clear filters
          </button>
        </div>

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
              {search ||
              programFilter ||
              batchFilter ||
              statusFilter ||
              submissionFilter
                ? "No tasks found"
                : "No tasks created yet"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a task and configure its submission requirements.
            </p>

            {!search &&
              !programFilter &&
              !batchFilter &&
              !statusFilter &&
              !submissionFilter && (
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
                        "Submission",
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

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {submissionLabel(task.submission_type)}
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
                      {task.task_type || "Assignment"}
                    </span>
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                      {submissionLabel(task.submission_type)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Task" : "Create Task"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure task, submission, evaluation and student settings
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="max-h-[85vh] space-y-6 overflow-y-auto p-5"
            >
              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <FormSection
                title="1. Basic Information"
                description="Task identity and batch assignment"
              >
                <Field label="Task Title *">
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    placeholder="Assignment 01 - HTML Basics"
                    className="form-input"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Program *">
                    <select
                      name="program_id"
                      value={form.program_id}
                      onChange={handleChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select Program</option>
                      {programs.map((program) => (
                        <option key={getId(program)} value={getId(program)}>
                          {program.name || program.title}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Batch *">
                    <select
                      name="batch_id"
                      value={form.batch_id}
                      onChange={handleChange}
                      required
                      disabled={!form.program_id}
                      className="form-input disabled:bg-slate-50"
                    >
                      <option value="">Select Batch</option>
                      {filteredBatches.map((batch) => (
                        <option key={getId(batch)} value={getId(batch)}>
                          {batch.name || batch.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Task Type">
                    <select
                      name="task_type"
                      value={form.task_type}
                      onChange={handleChange}
                      className="form-input"
                    >
                      <option value="Assignment">Assignment</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Practical">Practical</option>
                      <option value="Report">Report</option>
                      <option value="Presentation">Presentation</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                  <Field label="Difficulty">
                    <select
                      name="difficulty"
                      value={form.difficulty}
                      onChange={handleChange}
                      className="form-input"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </Field>

                  <Field label="Estimated Hours">
                    <input
                      name="estimated_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.estimated_hours}
                      onChange={handleChange}
                      placeholder="e.g. 4"
                      className="form-input"
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief task overview and learning objective..."
                    className="form-input"
                  />
                </Field>

                <Field label="Detailed Instructions">
                  <textarea
                    name="instructions"
                    value={form.instructions}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Explain what students must do step-by-step..."
                    className="form-input"
                  />
                </Field>
              </FormSection>

              <FormSection
                title="2. Submission Configuration"
                description="Choose what students must submit"
              >
                <Field label="Submission Type *">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {SUBMISSION_TYPES.map((type) => (
                      <button
                        type="button"
                        key={type.value}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            submission_type: type.value,
                          }))
                        }
                        className={`rounded-xl border p-3 text-left transition ${
                          form.submission_type === type.value
                            ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-800">
                          {type.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {type.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>

                {showFileSettings && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                      File Upload Settings
                    </h3>

                    <Field label="Allowed Formats">
                      <input
                        name="allowed_formats"
                        value={form.allowed_formats}
                        onChange={handleChange}
                        placeholder=".pdf, .jpg, .png, .zip"
                        className="form-input"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Comma-separated extensions. Leave empty to use system
                        defaults.
                      </p>
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Maximum File Size (MB)">
                        <input
                          name="max_file_size"
                          type="number"
                          min="1"
                          value={form.max_file_size}
                          onChange={handleChange}
                          className="form-input"
                        />
                      </Field>

                      <Field label="Files">
                        <Checkbox
                          name="multiple_files"
                          checked={form.multiple_files}
                          onChange={handleChange}
                          label="Allow multiple files"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {showCodeSettings && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Code Submission Settings
                    </h3>

                    <Field label="Programming Language">
                      <select
                        name="code_language"
                        value={form.code_language}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Select Language</option>
                        {LANGUAGES.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Starter Code (Optional)">
                      <textarea
                        name="starter_code"
                        value={form.starter_code}
                        onChange={handleChange}
                        rows={7}
                        placeholder="Provide starter code for students..."
                        className="form-input font-mono"
                      />
                    </Field>
                  </div>
                )}

                {showLinkSettings && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      Link Submission
                    </h3>
                    <p className="text-sm text-slate-500">
                      Students will submit a URL. For GitHub type, the
                      repository URL will be requested. For Link type, a live
                      demo or reference URL can be submitted.
                    </p>
                  </div>
                )}

                {showTextSettings && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      Text Submission
                    </h3>
                    <p className="text-sm text-slate-500">
                      Students will receive a written-answer editor.
                    </p>
                  </div>
                )}

                <Checkbox
                  name="submission_required"
                  checked={form.submission_required}
                  onChange={handleChange}
                  label="Submission is required to complete this task"
                />
              </FormSection>

              <FormSection
                title="3. Requirements & Resources"
                description="Checklist and learning material"
              >
                <Field label="Task Requirements / Checklist">
                  <textarea
                    name="requirements"
                    value={form.requirements}
                    onChange={handleChange}
                    rows={5}
                    placeholder={
                      "Create the required page\nUse responsive layout\nSubmit source code"
                    }
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter one requirement per line. These can appear as a
                    checklist for students.
                  </p>
                </Field>

                <Field label="Reference Resources">
                  <textarea
                    name="resources"
                    value={form.resources}
                    onChange={handleChange}
                    rows={5}
                    placeholder={
                      "HTML Documentation|https://developer.mozilla.org|Documentation\nTutorial|https://example.com/tutorial|Video"
                    }
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    One resource per line: Title | URL | Type
                  </p>
                </Field>
              </FormSection>

              <FormSection
                title="4. Schedule & Submission Rules"
                description="Availability, deadlines and attempts"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Start Date">
                    <input
                      name="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </Field>

                  <Field label="Deadline">
                    <input
                      name="due_date"
                      type="date"
                      value={form.due_date}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </Field>
                </div>

                <Checkbox
                  name="allow_late_submission"
                  checked={form.allow_late_submission}
                  onChange={handleChange}
                  label="Allow late submissions"
                />

                {form.allow_late_submission && (
                  <Field label="Late Submission Grace Period (Days)">
                    <input
                      name="late_days"
                      type="number"
                      min="0"
                      value={form.late_days}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </Field>
                )}

                <Checkbox
                  name="allow_resubmission"
                  checked={form.allow_resubmission}
                  onChange={handleChange}
                  label="Allow students to resubmit after submission"
                />

                {form.allow_resubmission && (
                  <Field label="Maximum Attempts">
                    <input
                      name="max_attempts"
                      type="number"
                      min="1"
                      value={form.max_attempts}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </Field>
                )}
              </FormSection>

              <FormSection
                title="5. Evaluation"
                description="Marks and grading criteria"
              >
                <Field label="Maximum Marks">
                  <input
                    name="max_marks"
                    type="number"
                    min="0"
                    value={form.max_marks}
                    onChange={handleChange}
                    placeholder="100"
                    className="form-input"
                  />
                </Field>

                <Field label="Grading Criteria / Rubric">
                  <textarea
                    name="grading_criteria"
                    value={form.grading_criteria}
                    onChange={handleChange}
                    rows={5}
                    placeholder={
                      "Code correctness - 40\nDesign - 20\nDocumentation - 20\nPresentation - 20"
                    }
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter one grading criterion per line.
                  </p>
                </Field>
              </FormSection>

              <FormSection
                title="6. Publishing"
                description="Control task visibility"
              >
                <Field label="Task Status">
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="draft">Draft — Hidden from students</option>
                    <option value="active">Active — Visible to students</option>
                    <option value="inactive">Inactive — Disabled</option>
                    <option value="completed">Completed</option>
                  </select>
                </Field>
              </FormSection>

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
                  disabled={
                    saving || programs.length === 0 || batches.length === 0
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Task Changes"
                    : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .form-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          padding: 11px 13px;
          font-size: 14px;
          color: #334155;
          outline: none;
          transition: border .15s, box-shadow .15s;
        }
        .form-input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99,102,241,.1);
        }
        .form-input::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({ name, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-indigo-600"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    indigo: "bg-indigo-50",
    emerald: "bg-emerald-50",
    amber: "bg-amber-50",
    blue: "bg-blue-50",
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
