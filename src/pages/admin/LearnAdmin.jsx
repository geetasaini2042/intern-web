import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  content: "",
  resource_url: "",
  program_id: "",
  batch_id: "",
  material_type: "Notes",
  status: "active",
};

const getId = (item) => item?.id || item?._id;

const getTitle = (item) => item.title || item.name || "Untitled Material";

const normalizeList = (res, key) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export default function LearnAdmin() {
  const [materials, setMaterials] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

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
      const [materialRes, programRes, batchRes] = await Promise.all([
        apiGet("/admin/learn"),
        apiGet("/admin/programs"),
        apiGet("/admin/batches"),
      ]);

      setMaterials(normalizeList(materialRes, "materials"));
      setPrograms(normalizeList(programRes, "programs"));
      setBatches(normalizeList(batchRes, "batches"));
    } catch (err) {
      console.error("Learning materials load error:", err);
      setError(err.message || "Unable to load learning materials.");
    } finally {
      setLoading(false);
    }
  };

  const getProgramId = (item) =>
    item.program_id || item.programId || item.program || "";

  const getBatchId = (item) =>
    item.batch_id || item.batchId || item.batch || "";

  const getProgramName = (programId) => {
    if (programId && typeof programId === "object") {
      return programId.name || programId.title || "Unknown Program";
    }

    const program = programs.find(
      (p) => String(getId(p)) === String(programId)
    );

    return program?.name || program?.title || "All Programs";
  };

  const getBatchName = (batchId) => {
    if (batchId && typeof batchId === "object") {
      return batchId.name || batchId.title || "Unknown Batch";
    }

    const batch = batches.find(
      (b) => String(getId(b)) === String(batchId)
    );

    return batch?.name || batch?.title || "All Batches";
  };

  const filteredBatches = batches.filter((batch) => {
    if (!form.program_id) return true;

    const batchProgramId =
      typeof batch.program_id === "object"
        ? getId(batch.program_id)
        : batch.program_id || batch.programId || batch.program;

    return String(batchProgramId) === String(form.program_id);
  });

  const filteredMaterials = materials.filter((item) => {
    const query = search.toLowerCase();

    const matchesSearch =
      getTitle(item).toLowerCase().includes(query) ||
      (item.description || "").toLowerCase().includes(query) ||
      (item.material_type || item.type || "").toLowerCase().includes(query);

    const itemProgramId = getProgramId(item);
    const itemBatchId = getBatchId(item);

    const matchesProgram =
      !programFilter ||
      String(
        typeof itemProgramId === "object"
          ? getId(itemProgramId)
          : itemProgramId
      ) === String(programFilter);

    const matchesBatch =
      !batchFilter ||
      String(
        typeof itemBatchId === "object"
          ? getId(itemBatchId)
          : itemBatchId
      ) === String(batchFilter);

    const matchesType =
      !typeFilter ||
      String(item.material_type || item.type || "").toLowerCase() ===
        typeFilter.toLowerCase();

    return matchesSearch && matchesProgram && matchesBatch && matchesType;
  });

  const activeCount = materials.filter(
    (item) => String(item.status || "active").toLowerCase() === "active"
  ).length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    const programId = getProgramId(item);
    const batchId = getBatchId(item);

    setEditing(item);

    setForm({
      title: item.title || item.name || "",
      description: item.description || "",
      content: item.content || item.notes || "",
      resource_url: item.resource_url || item.url || "",
      program_id:
        typeof programId === "object"
          ? String(getId(programId) || "")
          : String(programId || ""),
      batch_id:
        typeof batchId === "object"
          ? String(getId(batchId) || "")
          : String(batchId || ""),
      material_type: item.material_type || item.type || "Notes",
      status: item.status || "active",
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
      setError("Material title is required.");
      return;
    }

    if (form.resource_url && !/^https?:\/\/.+/i.test(form.resource_url)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      description: form.description,
      content: form.content,
      resource_url: form.resource_url.trim(),
      program_id: form.program_id || null,
      batch_id: form.batch_id || null,
      material_type: form.material_type,
      status: form.status,
    };

    try {
      if (editing) {
        await apiPut(`/admin/learn/${getId(editing)}`, payload);
        setNotice("Learning material updated successfully.");
      } else {
        await apiPost("/admin/learn", payload);
        setNotice("Learning material created successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      console.error("Learning material save error:", err);
      setError(err.message || "Unable to save learning material.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${getTitle(item)}"?`)) return;

    try {
      await apiDelete(`/admin/learn/${getId(item)}`);
      setNotice("Learning material deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Learning material delete error:", err);
      setError(err.message || "Unable to delete learning material.");
    }
  };

  const getTypeLabel = (item) =>
    item.material_type || item.type || "Notes";

  const getTypeStyle = (type) => {
    const styles = {
      PDF: "bg-red-50 text-red-700",
      Video: "bg-purple-50 text-purple-700",
      Link: "bg-blue-50 text-blue-700",
      Notes: "bg-emerald-50 text-emerald-700",
      Document: "bg-amber-50 text-amber-700",
    };

    return styles[type] || "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Learning Materials
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage study notes, PDFs, videos and learning resources.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Add Material
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
          <StatCard title="Total Materials" value={materials.length} color="indigo" />
          <StatCard title="Active Materials" value={activeCount} color="emerald" />
          <StatCard
            title="Resource Types"
            value={[...new Set(materials.map(getTypeLabel))].length}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Search materials..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">All Types</option>
              <option value="PDF">PDF</option>
              <option value="Video">Video</option>
              <option value="Link">Link</option>
              <option value="Notes">Notes</option>
              <option value="Document">Document</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearch("");
              setProgramFilter("");
              setBatchFilter("");
              setTypeFilter("");
            }}
            className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Clear filters
          </button>
        </div>

        {/* Materials List */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">
              Loading learning materials...
            </p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600">
              L
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {search || programFilter || batchFilter || typeFilter
                ? "No materials found"
                : "No learning materials yet"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add your first learning material for students.
            </p>

            {!search && !programFilter && !batchFilter && !typeFilter && (
              <button
                onClick={openCreate}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Add Your First Material
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
                        "Material",
                        "Type",
                        "Program",
                        "Batch",
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
                    {filteredMaterials.map((item) => (
                      <tr
                        key={getId(item)}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {getTitle(item)}
                          </div>
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {item.description || "No description"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${getTypeStyle(
                              getTypeLabel(item)
                            )}`}
                          >
                            {getTypeLabel(item)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getProgramName(getProgramId(item))}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getBatchName(getBatchId(item))}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={item.status || "active"} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {item.resource_url && (
                              <a
                                href={item.resource_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                              >
                                Open
                              </a>
                            )}

                            <button
                              onClick={() => openEdit(item)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(item)}
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
              {filteredMaterials.map((item) => (
                <div
                  key={getId(item)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {getTitle(item)}
                      </h3>
                      <p className="mt-1 text-sm text-indigo-600">
                        {getProgramName(getProgramId(item))}
                      </p>
                    </div>

                    <StatusBadge status={item.status || "active"} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.description || "No description available."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${getTypeStyle(
                        getTypeLabel(item)
                      )}`}
                    >
                      {getTypeLabel(item)}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {getBatchName(getBatchId(item))}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    {item.resource_url && (
                      <a
                        href={item.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-xl border border-blue-100 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Open Resource
                      </a>
                    )}

                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(item)}
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
                  {editing ? "Edit Material" : "Add Learning Material"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add educational content and resources
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
                  Material Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Introduction to HTML"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Material Type
                </label>
                <select
                  name="material_type"
                  value={form.material_type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="Notes">Notes</option>
                  <option value="PDF">PDF</option>
                  <option value="Video">Video</option>
                  <option value="Link">Link</option>
                  <option value="Document">Document</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Program */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Program
                </label>
                <select
                  name="program_id"
                  value={form.program_id}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="">All Programs</option>
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
                  Batch
                </label>
                <select
                  name="batch_id"
                  value={form.batch_id}
                  onChange={handleChange}
                  disabled={!form.program_id}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">All Batches</option>
                  {filteredBatches.map((batch) => (
                    <option key={getId(batch)} value={getId(batch)}>
                      {batch.name || batch.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Resource URL
                </label>
                <input
                  type="url"
                  name="resource_url"
                  value={form.resource_url}
                  onChange={handleChange}
                  placeholder="https://example.com/resource.pdf"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Link to PDF, video, document or external resource.
                </p>
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
                  placeholder="Brief description of this material..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              {/* Content */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Content / Notes
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write learning content here..."
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
                </select>
              </div>

              {/* Actions */}
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
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Add Material"}
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