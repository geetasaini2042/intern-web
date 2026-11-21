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
  X,
  CheckSquare,
  Square,
  ChevronDown,
  GraduationCap,
  Layers,
  UserRound,
  Eye,
  EyeOff,
} from "lucide-react";

const getId = (item) => item?._id || item?.id || "";

const getName = (item) =>
  item?.name ||
  item?.title ||
  item?.full_name ||
  item?.program_name ||
  item?.batch_name ||
  "";

const normalizeList = (res, key) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const getProgramId = (item) =>
  item?.program_id ||
  item?.internship_program_id ||
  item?.program?._id ||
  item?.program?.id ||
  "";

const getProgramName = (item) =>
  item?.program_name ||
  item?.internship_program ||
  (typeof item?.program === "string" ? item.program : "") ||
  item?.program?.name ||
  item?.program?.title ||
  "";

const getBatchName = (item) =>
  item?.name ||
  item?.title ||
  item?.batch_name ||
  item?.batch ||
  "";

const getBatchProgramId = (item) =>
  item?.program_id ||
  item?.internship_program_id ||
  item?.program?._id ||
  item?.program?.id ||
  "";

const getBatchProgramName = (item) =>
  item?.program_name ||
  item?.internship_program ||
  (typeof item?.program === "string" ? item.program : "") ||
  item?.program?.name ||
  item?.program?.title ||
  "";

const getMentorName = (item) =>
  item?.name ||
  item?.full_name ||
  item?.mentor_name ||
  item?.username ||
  item?.email ||
  "";

const getMentorId = (item) =>
  item?._id || item?.id || item?.mentor_id || "";

const EMPTY_FORM = {
  program_id: "",
  internship_program: "",
  batch_id: "",
  batch: "",
  mentor_id: "",
  mentor: "",
  email: "",
  password: "",
};

export default function ImportLegacyStudents() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [mentors, setMentors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(false);
  const [singleStudent, setSingleStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const loadLegacy = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const res = await apiGet("/admin/legacy-students");
      setStudents(normalizeList(res, "students"));
      setSelectedIds([]);
    } catch (err) {
      console.error("Legacy students loading error:", err);
      setError(err?.message || "Failed to load legacy students.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadOptions = async () => {
    setLoadingOptions(true);

    try {
      const [programRes, batchRes, mentorRes] = await Promise.all([
        apiGet("/admin/programs"),
        apiGet("/admin/batches"),
        apiGet("/admin/mentors").catch(() => null),
      ]);

      const loadedPrograms = normalizeList(programRes, "programs");
      const loadedBatches = normalizeList(batchRes, "batches");
      let loadedMentors = normalizeList(mentorRes, "mentors");

      if (!loadedMentors.length && !mentorRes) {
        try {
          const staffRes = await apiGet("/admin/staff");
          loadedMentors = normalizeList(staffRes, "staff");
        } catch (err) {
          console.warn("Mentor/staff list unavailable:", err);
        }
      }

      if (!loadedMentors.length) {
        const batchMentors = loadedBatches
          .map((b) => {
            const mentor = b.mentor || b.mentor_name || b.assigned_mentor;
            if (!mentor) return null;

            if (typeof mentor === "object") {
              return {
                id: getMentorId(mentor) || getMentorName(mentor),
                name: getMentorName(mentor),
              };
            }

            return {
              id: String(mentor),
              name: String(mentor),
            };
          })
          .filter(Boolean);

        const uniqueMentors = [
          ...new Map(batchMentors.map((m) => [m.id, m])).values(),
        ];

        loadedMentors = uniqueMentors;
      }

      setPrograms(loadedPrograms);
      setBatches(loadedBatches);
      setMentors(loadedMentors);
    } catch (err) {
      console.error("Import options loading error:", err);
      setError(
        err?.message ||
          "Failed to load programs and batches. Please refresh and try again."
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");

    await Promise.all([loadLegacy(false), loadOptions()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
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
        s.domain,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, search, onlyPending]);

  const pendingFiltered = filtered.filter((s) => !s.already_imported);
  const visibleSelectableIds = pendingFiltered.map((s) => s.id);

  const allVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selectedIds.includes(id));

  const selectedStudents = students.filter((s) =>
    selectedIds.includes(s.id)
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !visibleSelectableIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...visibleSelectableIds]),
      ]);
    }
  };

  const batchesForProgram = useMemo(() => {
    if (!form.program_id) return [];

    const selectedProgram = programs.find(
      (p) => getId(p) === form.program_id
    );

    const selectedProgramName = getName(selectedProgram).toLowerCase().trim();

    return batches.filter((batch) => {
      const batchProgramId = getBatchProgramId(batch);
      const batchProgramName = getBatchProgramName(batch).toLowerCase().trim();

      if (batchProgramId) {
        return batchProgramId === form.program_id;
      }

      if (batchProgramName) {
        return batchProgramName === selectedProgramName;
      }

      return true;
    });
  }, [form.program_id, programs, batches]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowPassword(false);
  };

  const selectProgram = (programId) => {
    const program = programs.find((p) => getId(p) === programId);

    setForm((prev) => ({
      ...prev,
      program_id: programId,
      internship_program: getName(program),
      batch_id: "",
      batch: "",
    }));
  };

  const selectBatch = (batchId) => {
    const batch = batchesForProgram.find((b) => getId(b) === batchId);

    setForm((prev) => ({
      ...prev,
      batch_id: batchId,
      batch: getBatchName(batch),
    }));
  };

  const selectMentor = (mentorId) => {
    const mentor = mentors.find((m) => getMentorId(m) === mentorId);

    setForm((prev) => ({
      ...prev,
      mentor_id: mentorId,
      mentor: getMentorName(mentor),
    }));
  };

  const openSingleModal = (student) => {
    setSingleStudent(student);
    setBulkModal(false);

    const matchingProgram = programs.find(
      (p) =>
        getName(p).toLowerCase().trim() ===
        (student.domain || "").toLowerCase().trim()
    );

    setForm({
      ...EMPTY_FORM,
      program_id: matchingProgram ? getId(matchingProgram) : "",
      internship_program: matchingProgram ? getName(matchingProgram) : "",
      email: student.email || "",
    });

    setError("");
    setShowPassword(false);
  };

  const openBulkModal = () => {
    setSingleStudent(null);
    setBulkModal(true);
    resetForm();
    setError("");
  };

  const closeModal = () => {
    if (submitting) return;
    setSingleStudent(null);
    setBulkModal(false);
    resetForm();
  };

  const validateForm = () => {
    if (!form.program_id || !form.internship_program) {
      setError("Please select an internship program.");
      return false;
    }

    if (!form.batch_id || !form.batch) {
      setError("Please select a batch.");
      return false;
    }

    const chosenBatch = batches.find((b) => getId(b) === form.batch_id);
    const batchProgramId = getBatchProgramId(chosenBatch);
    const batchProgramName = getBatchProgramName(chosenBatch)
      .toLowerCase()
      .trim();

    const chosenProgramName = form.internship_program.toLowerCase().trim();

    if (
      batchProgramId &&
      batchProgramId !== form.program_id
    ) {
      setError("The selected batch belongs to a different program.");
      return false;
    }

    if (
      !batchProgramId &&
      batchProgramName &&
      batchProgramName !== chosenProgramName
    ) {
      setError("The selected batch does not match the selected program.");
      return false;
    }

    return true;
  };

  const handleSingleImport = async (e) => {
    e.preventDefault();
    if (!singleStudent || submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        legacy_student_id: singleStudent.id,
        internship_program: form.internship_program,
        program_id: form.program_id,
        batch: form.batch,
        batch_id: form.batch_id,
        mentor: form.mentor || undefined,
        mentor_id: form.mentor_id || undefined,
        email: form.email || undefined,
        password: form.password || undefined,
      };

      const res = await apiPost("/admin/legacy-students/import", payload);

      setSingleStudent(null);
      resetForm();
      showToast(res?.message || `${singleStudent.full_name} imported successfully.`);
      await loadLegacy(false);
    } catch (err) {
      console.error("Single student import error:", err);
      setError(err?.message || "Import failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!selectedIds.length || submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        legacy_student_ids: selectedIds,
        internship_program: form.internship_program,
        program_id: form.program_id,
        batch: form.batch,
        batch_id: form.batch_id,
        mentor: form.mentor || undefined,
        mentor_id: form.mentor_id || undefined,
        password: form.password || undefined,
      };

      const res = await apiPost(
        "/admin/legacy-students/bulk-import",
        payload
      );

      setBulkModal(false);
      resetForm();
      setSelectedIds([]);

      showToast(
        res?.message || `Bulk import completed for ${selectedIds.length} students.`
      );

      await loadLegacy(false);
    } catch (err) {
      console.error("Bulk import error:", err);
      setError(err?.message || "Bulk import failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const programLabel = (program) =>
    getName(program) || "Unnamed Program";

  const batchLabel = (batch) => {
    const name = getBatchName(batch);
    const linkedProgram = getBatchProgramName(batch);
    return linkedProgram ? `${name} · ${linkedProgram}` : `${name} · Unlinked`;
  };

  const mentorLabel = (mentor) =>
    getMentorName(mentor) || "Unnamed Mentor";

  const importedCount = students.filter((s) => s.already_imported).length;
  const pendingCount = students.length - importedCount;

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
            Import students from the old database and assign the correct program,
            batch and mentor.
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
            onClick={loadAll}
            disabled={loading || loadingOptions}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={loading || loadingOptions ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && !bulkModal && !singleStudent && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users size={15} />
            Total Legacy Students
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {students.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <DownloadCloud size={15} />
            Not Imported
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CheckCircle2 size={15} />
            Already Imported
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {importedCount}
          </p>
        </div>
      </div>

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
              placeholder="Search by name, registration, email, college..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => {
                setOnlyPending(e.target.checked);
                setSelectedIds([]);
              }}
              className="h-4 w-4 rounded accent-blue-600"
            />
            Show only not-imported
          </label>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <button
              onClick={toggleSelectAll}
              disabled={!visibleSelectableIds.length}
              className="flex items-center gap-2 text-xs font-semibold text-blue-700 disabled:text-slate-400"
            >
              {allVisibleSelected ? (
                <CheckSquare size={16} />
              ) : (
                <Square size={16} />
              )}
              {allVisibleSelected ? "Deselect visible" : "Select all visible"}
            </button>

            <span className="text-xs text-slate-500">
              {selectedIds.length} selected
            </span>
          </div>
        )}

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
            <p className="mt-1 text-xs text-slate-400">
              Try changing your search or filter.
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
                        aria-label={
                          checked ? "Deselect student" : "Select student"
                        }
                      >
                        {checked ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {student.full_name || "Unnamed Student"}
                        </p>

                        {student.registration_number && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {student.registration_number}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 break-all text-xs text-slate-500">
                        {student.email || "No email"} ·{" "}
                        {student.mobile_number || "No phone"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {student.college_name || "—"}
                        {student.domain ? ` · ${student.domain}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-7 sm:pl-0">
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

      {(singleStudent || bulkModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {bulkModal
                    ? `Import ${selectedIds.length} Students`
                    : `Import ${singleStudent?.full_name || "Student"}`}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Assign a program, batch and mentor from existing records.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loadingOptions ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <form
                onSubmit={bulkModal ? handleBulkImport : handleSingleImport}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <GraduationCap size={15} />
                    Internship Program *
                  </label>

                  <select
                    required
                    value={form.program_id}
                    onChange={(e) => selectProgram(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select program</option>
                    {programs.map((program) => (
                      <option key={getId(program)} value={getId(program)}>
                        {programLabel(program)}
                      </option>
                    ))}
                  </select>

                  {!programs.length && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No programs found. Create a program first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Layers size={15} />
                    Batch *
                  </label>

                  <select
                    required
                    disabled={!form.program_id}
                    value={form.batch_id}
                    onChange={(e) => selectBatch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {form.program_id
                        ? "Select batch"
                        : "Select program first"}
                    </option>

                    {batchesForProgram.map((batch) => (
                      <option key={getId(batch)} value={getId(batch)}>
                        {batchLabel(batch)}
                      </option>
                    ))}
                  </select>

                  {form.program_id && !batchesForProgram.length && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No batches available for this program. Create a batch first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <UserRound size={15} />
                    Mentor (Optional)
                  </label>

                  <select
                    value={form.mentor_id}
                    onChange={(e) => selectMentor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">No mentor assigned</option>

                    {mentors.map((mentor) => (
                      <option
                        key={getMentorId(mentor)}
                        value={getMentorId(mentor)}
                      >
                        {mentorLabel(mentor)}
                        {mentor.email ? ` · ${mentor.email}` : ""}
                      </option>
                    ))}
                  </select>

                  {!mentors.length && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      No mentors available in the system.
                    </p>
                  )}
                </div>

                {!bulkModal && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Login Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="Leave blank to use existing email"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Initial Password (Optional)
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="Leave blank to use backend default"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400">
                    Leave blank to let the backend assign its configured default.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700">
                    Import Summary
                  </div>

                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-medium">Program:</span>{" "}
                      {form.internship_program || "Not selected"}
                    </p>
                    <p>
                      <span className="font-medium">Batch:</span>{" "}
                      {form.batch || "Not selected"}
                    </p>
                    <p>
                      <span className="font-medium">Mentor:</span>{" "}
                      {form.mentor || "Not assigned"}
                    </p>
                    {bulkModal && (
                      <p>
                        <span className="font-medium">Students:</span>{" "}
                        {selectedStudents.length}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !form.program_id ||
                      !form.batch_id ||
                      (bulkModal && selectedIds.length === 0)
                    }
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting && (
                      <Loader2 size={15} className="animate-spin" />
                    )}
                    {submitting ? "Importing..." : "Confirm Import"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}