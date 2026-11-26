import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createEmptyBlock = (type = "text") => {
  switch (type) {
    case "code":
      return { type: "code", title: "", language: "javascript", code: "", output: "" };
    case "video":
      return { type: "video", title: "", url: "" };
    case "pdf":
      return { type: "pdf", title: "", url: "" };
    case "image":
      return { type: "image", url: "", caption: "" };
    case "link":
      return { type: "link", title: "", url: "", description: "" };
    case "embed":
      return { type: "embed", title: "", url: "", height: 420 };
    case "callout":
      return { type: "callout", tone: "info", title: "", content: "" };
    case "quiz":
      return {
        type: "quiz",
        title: "Quick Quiz",
        questions: [{ question: "", options: ["", "", "", ""], answer: 0, explanation: "" }]
      };
    case "checklist":
      return { type: "checklist", title: "Practice Checklist", items: [""] };
    default:
      return { type: "text", content: "" };
  }
};

const createEmptyLesson = (index = 0) => ({
  id: createId("lesson"),
  title: `Lesson ${index + 1}`,
  type: "reading",
  section: "",
  duration: "",
  description: "",
  blocks: [createEmptyBlock("text")]
});

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  program_id: "",
  batch_id: "",
  order: 1,
  status: "active",
  assignment: {
    title: "",
    description: "",
    url: "",
    task_id: ""
  },
  lessons: [createEmptyLesson(0)]
};

const getId = (item) => item?.id || item?._id || item?.module_id || "";

const getTitle = (item) => item?.title || item?.name || "Untitled Module";

const normalizeList = (res, keys = []) => {
  if (Array.isArray(res)) return res;
  for (const key of keys) {
    if (Array.isArray(res?.[key])) return res[key];
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const isValidUrlOrPath = (url) => {
  if (!url) return true;
  const trimmed = String(url).trim();
  return /^https?:\/\/.+/i.test(trimmed) || (/^\//.test(trimmed) && !/^\/\//.test(trimmed));
};

const extractLegacyLessons = (item) => {
  if (Array.isArray(item.lessons) && item.lessons.length > 0) {
    return item.lessons.map((lesson, idx) => ({
      id: lesson.id || lesson.lesson_id || createId(`lesson-${idx}`),
      title: lesson.title || lesson.name || `Lesson ${idx + 1}`,
      type: String(lesson.type || lesson.content_type || "reading").toLowerCase(),
      section: lesson.section || lesson.chapter || "",
      duration: lesson.duration || lesson.duration_minutes || "",
      description: lesson.description || "",
      blocks:
        Array.isArray(lesson.blocks) && lesson.blocks.length > 0
          ? lesson.blocks
          : [
              ...(lesson.video_url ? [{ type: "video", title: lesson.title || "", url: lesson.video_url }] : []),
              ...(lesson.content ? [{ type: "text", content: lesson.content }] : []),
              ...(lesson.pdf_url ? [{ type: "pdf", title: lesson.title || "", url: lesson.pdf_url }] : []),
              ...(lesson.url ? [{ type: "link", title: lesson.title || "", url: lesson.url, description: "" }] : [])
            ]
    }));
  }

  const blocks = [];
  const matType = String(item.material_type || item.type || "Notes").toLowerCase();
  const resUrl = item.resource_url || item.url || "";

  if (resUrl) {
    if (matType === "video") blocks.push({ type: "video", title: getTitle(item), url: resUrl });
    else if (matType === "pdf") blocks.push({ type: "pdf", title: getTitle(item), url: resUrl });
    else blocks.push({ type: "link", title: getTitle(item), url: resUrl, description: item.description || "" });
  }
  if (item.content || item.notes) {
    blocks.push({ type: "text", content: item.content || item.notes });
  }

  return [
    {
      id: createId("lesson"),
      title: getTitle(item),
      type: matType === "notes" ? "reading" : matType,
      section: "",
      duration: "",
      description: item.description || "",
      blocks: blocks.length ? blocks : [createEmptyBlock("text")]
    }
  ];
};

export default function LearnAdmin() {
  const [modules, setModules] = useState([]);
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
  const [activeTab, setActiveTab] = useState("details");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [learnRes, programRes, batchRes] = await Promise.all([
        apiGet("/admin/learn"),
        apiGet("/admin/programs"),
        apiGet("/admin/batches")
      ]);

      setModules(normalizeList(learnRes, ["modules", "materials"]));
      setPrograms(normalizeList(programRes, ["programs"]));
      setBatches(normalizeList(batchRes, ["batches"]));
    } catch (err) {
      setError(err.message || "Unable to load learning modules.");
    } finally {
      setLoading(false);
    }
  };

  const getProgramId = (item) => {
    const val = item?.program_id || item?.programId || item?.program || "";
    return typeof val === "object" ? String(getId(val)) : String(val || "");
  };

  const getBatchId = (item) => {
    const val = item?.batch_id || item?.batchId || item?.batch || "";
    return typeof val === "object" ? String(getId(val)) : String(val || "");
  };

  const getProgramName = (programId) => {
    if (!programId) return "All Programs";
    const program = programs.find((p) => String(getId(p)) === String(programId));
    return program?.name || program?.title || "All Programs";
  };

  const getBatchName = (batchId) => {
    if (!batchId) return "All Batches";
    const batch = batches.find((b) => String(getId(b)) === String(batchId));
    return batch?.name || batch?.title || "All Batches";
  };

  const getBatchesForProgram = (progId) => {
    if (!progId) return batches;
    return batches.filter((batch) => {
      const bProgId = getProgramId(batch);
      return !bProgId || String(bProgId) === String(progId);
    });
  };

  const filteredModules = modules.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      getTitle(item).toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q);

    const matchesProgram = !programFilter || getProgramId(item) === String(programFilter);
    const matchesBatch = !batchFilter || getBatchId(item) === String(batchFilter);
    const itemStatus = String(item.status || (item.is_active === false ? "inactive" : "active")).toLowerCase();
    const matchesStatus = !statusFilter || itemStatus === statusFilter;

    return matchesSearch && matchesProgram && matchesBatch && matchesStatus;
  });

  const activeCount = modules.filter(
    (m) => String(m.status || (m.is_active === false ? "inactive" : "active")).toLowerCase() === "active"
  ).length;

  const totalLessonsCount = modules.reduce(
    (sum, m) => sum + (Array.isArray(m.lessons) ? m.lessons.length : 1),
    0
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      order: modules.length + 1,
      lessons: [createEmptyLesson(0)]
    });
    setActiveTab("details");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || item.name || "",
      description: item.description || item.subtitle || "",
      category: item.category || item.skill || item.material_type || "",
      program_id: getProgramId(item),
      batch_id: getBatchId(item),
      order: Number(item.order) || 1,
      status: item.status || (item.is_active === false ? "inactive" : "active"),
      assignment: {
        title: item.assignment?.title || "",
        description: item.assignment?.description || "",
        url: item.assignment?.url || "",
        task_id: item.assignment?.task_id || ""
      },
      lessons: extractLegacyLessons(item)
    });
    setActiveTab("details");
    setError("");
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "order" ? Number(value) || 0 : value,
      ...(name === "program_id" ? { batch_id: "" } : {})
    }));
  };

  const handleAssignmentChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      assignment: { ...prev.assignment, [field]: value }
    }));
  };

  const addLesson = () => {
    setForm((prev) => ({
      ...prev,
      lessons: [...prev.lessons, createEmptyLesson(prev.lessons.length)]
    }));
  };

  const removeLesson = (lessonIndex) => {
    setForm((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((_, idx) => idx !== lessonIndex)
    }));
  };

  const updateLesson = (lessonIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? { ...lesson, [field]: value } : lesson
      )
    }));
  };

  const addBlock = (lessonIndex, type) => {
    setForm((prev) => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex
          ? { ...lesson, blocks: [...(lesson.blocks || []), createEmptyBlock(type)] }
          : lesson
      )
    }));
  };

  const removeBlock = (lessonIndex, blockIndex) => {
    setForm((prev) => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex
          ? { ...lesson, blocks: lesson.blocks.filter((_, bIdx) => bIdx !== blockIndex) }
          : lesson
      )
    }));
  };

  const updateBlock = (lessonIndex, blockIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex
          ? {
              ...lesson,
              blocks: lesson.blocks.map((block, bIdx) =>
                bIdx === blockIndex ? { ...block, [field]: value } : block
              )
            }
          : lesson
      )
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Module title is required.");
      setActiveTab("details");
      return;
    }

    if (form.assignment.url && !isValidUrlOrPath(form.assignment.url)) {
      setError("Assignment URL must start with http://, https://, or /");
      setActiveTab("assignment");
      return;
    }

    const cleanedLessons = form.lessons
      .filter((l) => l.title.trim())
      .map((l, idx) => ({
        id: l.id || createId(`lesson-${idx}`),
        title: l.title.trim(),
        type: l.type || "reading",
        section: l.section.trim(),
        duration: l.duration,
        description: l.description.trim(),
        blocks: (l.blocks || []).filter((b) => {
          if (b.type === "text" || b.type === "markdown") return Boolean(b.content?.trim());
          if (b.type === "code") return Boolean(b.code?.trim());
          if (b.type === "callout") return Boolean(b.content?.trim());
          if (b.type === "quiz") return Array.isArray(b.questions) && b.questions.length > 0;
          if (b.type === "checklist") return Array.isArray(b.items) && b.items.some((i) => i.trim());
          return Boolean(b.url?.trim());
        })
      }));

    const hasAssignment =
      form.assignment.title.trim() ||
      form.assignment.description.trim() ||
      form.assignment.url.trim() ||
      form.assignment.task_id.trim();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      program_id: form.program_id || null,
      batch_id: form.batch_id || null,
      order: Number(form.order) || 1,
      status: form.status,
      is_active: form.status === "active",
      lessons: cleanedLessons,
      assignment: hasAssignment
        ? {
            title: form.assignment.title.trim(),
            description: form.assignment.description.trim(),
            url: form.assignment.url.trim(),
            task_id: form.assignment.task_id.trim()
          }
        : null
    };

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await apiPut(`/admin/learn/${getId(editing)}`, payload);
        setNotice("Learning module updated successfully.");
      } else {
        await apiPost("/admin/learn", payload);
        setNotice("Learning module created successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save learning module.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/admin/learn/${getId(deleteTarget)}`);
      setNotice("Learning module deleted successfully.");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete learning module.");
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Learning Modules
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage structured modules, lessons, videos, quizzes, and assignments.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Add Module
          </button>
        </div>

        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="font-bold">
              ×
            </button>
          </div>
        )}

        {error && !modalOpen && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")} className="font-bold">
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Modules" value={modules.length} color="indigo" />
          <StatCard title="Active Modules" value={activeCount} color="emerald" />
          <StatCard title="Total Lessons" value={totalLessonsCount} color="blue" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Search modules..."
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
              {getBatchesForProgram(programFilter).map((batch) => (
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
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
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

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">Loading learning modules...</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600">
              L
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              {search || programFilter || batchFilter || statusFilter
                ? "No modules found"
                : "No learning modules yet"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first structured learning module for students.
            </p>
            {!search && !programFilter && !batchFilter && !statusFilter && (
              <button
                onClick={openCreate}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Add First Module
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
                      {["Module", "Lessons", "Program", "Batch", "Status", "Actions"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModules.map((item) => (
                      <tr key={getId(item)} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{getTitle(item)}</div>
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {item.category ? `${item.category} · ` : ""}
                            {item.description || "No description"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            {Array.isArray(item.lessons) ? item.lessons.length : 1} Lessons
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getProgramName(getProgramId(item))}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getBatchName(getBatchId(item))}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={item.status || (item.is_active === false ? "inactive" : "active")}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
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
              {filteredModules.map((item) => (
                <div
                  key={getId(item)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{getTitle(item)}</h3>
                      <p className="mt-1 text-xs text-indigo-600">
                        {getProgramName(getProgramId(item))} · {getBatchName(getBatchId(item))}
                      </p>
                    </div>
                    <StatusBadge
                      status={item.status || (item.is_active === false ? "inactive" : "active")}
                    />
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {item.description || "No description available."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      {Array.isArray(item.lessons) ? item.lessons.length : 1} Lessons
                    </span>
                    {item.category && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
          <div className="my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Learning Module" : "Create Learning Module"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Configure module info, lessons, content blocks, and assignment
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
              {[
                { id: "details", label: "Module Details" },
                { id: "lessons", label: `Lessons (${form.lessons.length})` },
                { id: "assignment", label: "Assignment" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {error && (
                  <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Module Title *
                      </label>
                      <input
                        name="title"
                        value={form.title}
                        onChange={handleFieldChange}
                        required
                        placeholder="e.g., React Fundamentals"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Category / Skill
                      </label>
                      <input
                        name="category"
                        value={form.category}
                        onChange={handleFieldChange}
                        placeholder="e.g., Frontend, Python, Git"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Display Order
                      </label>
                      <input
                        type="number"
                        name="order"
                        value={form.order}
                        onChange={handleFieldChange}
                        min={1}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Program
                      </label>
                      <select
                        name="program_id"
                        value={form.program_id}
                        onChange={handleFieldChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      >
                        <option value="">All Programs</option>
                        {programs.map((program) => (
                          <option key={getId(program)} value={getId(program)}>
                            {program.name || program.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Batch
                      </label>
                      <select
                        name="batch_id"
                        value={form.batch_id}
                        onChange={handleFieldChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      >
                        <option value="">All Batches</option>
                        {getBatchesForProgram(form.program_id).map((batch) => (
                          <option key={getId(batch)} value={getId(batch)}>
                            {batch.name || batch.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Status
                      </label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleFieldChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleFieldChange}
                        rows={3}
                        placeholder="Brief overview of what students will learn..."
                        className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "lessons" && (
                  <div className="space-y-4">
                    {form.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id || lIdx}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-800">
                            Lesson {lIdx + 1}
                          </h3>
                          {form.lessons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLesson(lIdx)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Remove Lesson
                            </button>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <input
                            value={lesson.title}
                            onChange={(e) => updateLesson(lIdx, "title", e.target.value)}
                            placeholder="Lesson title"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 sm:col-span-2"
                          />
                          <select
                            value={lesson.type}
                            onChange={(e) => updateLesson(lIdx, "type", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                          >
                            <option value="reading">Reading</option>
                            <option value="video">Video</option>
                            <option value="code">Code</option>
                            <option value="pdf">PDF</option>
                            <option value="quiz">Quiz</option>
                            <option value="practice">Practice</option>
                          </select>
                          <input
                            value={lesson.duration}
                            onChange={(e) => updateLesson(lIdx, "duration", e.target.value)}
                            placeholder="Duration (e.g. 15 min)"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                          />
                          <input
                            value={lesson.section}
                            onChange={(e) => updateLesson(lIdx, "section", e.target.value)}
                            placeholder="Section / Chapter (optional)"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 sm:col-span-2"
                          />
                          <input
                            value={lesson.description}
                            onChange={(e) => updateLesson(lIdx, "description", e.target.value)}
                            placeholder="Short lesson summary"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 sm:col-span-2"
                          />
                        </div>

                        <div className="mt-4 space-y-3">
                          {(lesson.blocks || []).map((block, bIdx) => (
                            <BlockEditor
                              key={bIdx}
                              block={block}
                              onChange={(field, val) => updateBlock(lIdx, bIdx, field, val)}
                              onRemove={() => removeBlock(lIdx, bIdx)}
                            />
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {[
                            "text",
                            "video",
                            "code",
                            "pdf",
                            "image",
                            "link",
                            "callout",
                            "checklist",
                            "quiz"
                          ].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => addBlock(lIdx, type)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium capitalize text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                            >
                              + {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addLesson}
                      className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      + Add New Lesson
                    </button>
                  </div>
                )}

                {activeTab === "assignment" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Assignment Title
                      </label>
                      <input
                        value={form.assignment.title}
                        onChange={(e) => handleAssignmentChange("title", e.target.value)}
                        placeholder="e.g., Build a Counter Component"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        value={form.assignment.description}
                        onChange={(e) => handleAssignmentChange("description", e.target.value)}
                        rows={3}
                        placeholder="Instructions for completing this module assignment..."
                        className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Internal Task ID (optional)
                        </label>
                        <input
                          value={form.assignment.task_id}
                          onChange={(e) => handleAssignmentChange("task_id", e.target.value)}
                          placeholder="Links to /dash/task/:id"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          External or Internal URL (optional)
                        </label>
                        <input
                          value={form.assignment.url}
                          onChange={(e) => handleAssignmentChange("url", e.target.value)}
                          placeholder="https://... or /dash/task/123"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Save Module" : "Create Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Delete Module</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete "{getTitle(deleteTarget)}"?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
          {block.type}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-red-500 hover:underline"
        >
          Remove
        </button>
      </div>

      {(block.type === "text" || block.type === "markdown") && (
        <textarea
          value={block.content || ""}
          onChange={(e) => onChange("content", e.target.value)}
          rows={4}
          placeholder="Write markdown content here..."
          className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      )}

      {block.type === "code" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={block.title || ""}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="Title (optional)"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-indigo-400"
            />
            <input
              value={block.language || ""}
              onChange={(e) => onChange("language", e.target.value)}
              placeholder="Language (e.g. python, js)"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-indigo-400"
            />
          </div>
          <textarea
            value={block.code || ""}
            onChange={(e) => onChange("code", e.target.value)}
            rows={4}
            placeholder="Paste code snippet..."
            className="w-full rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none"
          />
          <input
            value={block.output || ""}
            onChange={(e) => onChange("output", e.target.value)}
            placeholder="Expected output (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {(block.type === "video" || block.type === "pdf" || block.type === "embed") && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={block.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Title"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <input
            value={block.url || ""}
            onChange={(e) => onChange("url", e.target.value)}
            placeholder="URL (https://... or /...)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {block.type === "image" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={block.url || ""}
            onChange={(e) => onChange("url", e.target.value)}
            placeholder="Image URL"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <input
            value={block.caption || ""}
            onChange={(e) => onChange("caption", e.target.value)}
            placeholder="Caption (optional)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {block.type === "link" && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={block.title || ""}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="Link title"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={block.url || ""}
              onChange={(e) => onChange("url", e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <input
            value={block.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Short description"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {block.type === "callout" && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={block.tone || "info"}
              onChange={(e) => onChange("tone", e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="info">Info</option>
              <option value="tip">Tip</option>
              <option value="warning">Warning</option>
            </select>
            <input
              value={block.title || ""}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="Callout title"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <textarea
            value={block.content || ""}
            onChange={(e) => onChange("content", e.target.value)}
            rows={2}
            placeholder="Callout text..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {block.type === "checklist" && (
        <div className="space-y-2">
          <input
            value={block.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Checklist title"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <textarea
            value={(block.items || []).join("\n")}
            onChange={(e) => onChange("items", e.target.value.split("\n"))}
            rows={3}
            placeholder="One checklist item per line..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {block.type === "quiz" && (
        <div className="space-y-3">
          <input
            value={block.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Quiz title"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          {(block.questions || []).map((q, qIdx) => (
            <div key={qIdx} className="space-y-2 rounded-lg bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Question {qIdx + 1}
                </span>
                {(block.questions || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        "questions",
                        block.questions.filter((_, i) => i !== qIdx)
                      )
                    }
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                value={q.question || ""}
                onChange={(e) => {
                  const next = [...block.questions];
                  next[qIdx] = { ...q, question: e.target.value };
                  onChange("questions", next);
                }}
                placeholder="Question text"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none"
              />
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {(q.options || ["", "", "", ""]).map((opt, oIdx) => (
                  <input
                    key={oIdx}
                    value={opt}
                    onChange={(e) => {
                      const next = [...block.questions];
                      const nextOpts = [...(q.options || ["", "", "", ""])];
                      nextOpts[oIdx] = e.target.value;
                      next[qIdx] = { ...q, options: nextOpts };
                      onChange("questions", next);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={Number(q.answer) || 0}
                  onChange={(e) => {
                    const next = [...block.questions];
                    next[qIdx] = { ...q, answer: Number(e.target.value) };
                    onChange("questions", next);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none"
                >
                  <option value={0}>Correct: Option A</option>
                  <option value={1}>Correct: Option B</option>
                  <option value={2}>Correct: Option C</option>
                  <option value={3}>Correct: Option D</option>
                </select>
                <input
                  value={q.explanation || ""}
                  onChange={(e) => {
                    const next = [...block.questions];
                    next[qIdx] = { ...q, explanation: e.target.value };
                    onChange("questions", next);
                  }}
                  placeholder="Explanation (optional)"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange("questions", [
                ...(block.questions || []),
                { question: "", options: ["", "", "", ""], answer: 0, explanation: "" }
              ])
            }
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            + Add Question
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    indigo: "bg-indigo-50",
    emerald: "bg-emerald-50",
    blue: "bg-blue-50"
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
    completed: "bg-blue-50 text-blue-700"
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
