
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiGet,
  apiPut,
  apiPost
} from "../../lib/api";

import {
  ArrowLeft,
  Phone,
  GraduationCap,
  Building2,
  Layers,
  CalendarDays,
  Clock,
  ClipboardList,
  BookOpen,
  FolderKanban,
  NotebookPen,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  KeyRound,
  ChevronRight,
  Loader2,
  Download,
  ShieldCheck,
  Activity,
  FileText,
  X
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "logbook", label: "Logbook", icon: NotebookPen },
  { id: "certificates", label: "Certificates", icon: Award }
];

const STATUS = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  suspended: "bg-red-50 text-red-700",
  completed: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700"
};

function getObject(response) {
  return (
    response?.student ||
    response?.data?.student ||
    response?.data ||
    response ||
    {}
  );
}

function getArray(response, keys = []) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  if (Array.isArray(response?.data)) return response.data;

  return [];
}

function getItemId(item) {
  return String(
    item?.id ||
    item?._id ||
    item?.program_id ||
    item?.batch_id ||
    ""
  );
}

function getItemName(item) {
  return (
    item?.name ||
    item?.title ||
    item?.program_name ||
    item?.batch_name ||
    "Untitled"
  );
}

function getBatchProgramId(batch) {
  return String(
    batch?.program_id ||
    batch?.program?._id ||
    batch?.program?.id ||
    ""
  );
}

function normalizeStudent(data) {
  return {
    ...data,

    id: data.id || data._id || data.student_id || "",

    full_name:
      data.full_name ||
      data.name ||
      data.student_name ||
      "Student",

    email: data.email || "",

    phone: data.phone || data.mobile || "",

    enrollment_id:
      data.enrollment_id ||
      data.roll_number ||
      data.registration_number ||
      "",

    college:
      data.college ||
      data.college_name ||
      data.university ||
      "",

    department:
      data.department ||
      data.course ||
      data.branch ||
      "",

    program_id: String(
      data.program_id ||
      data.program?._id ||
      data.program?.id ||
      ""
    ),

    batch_id: String(
      data.batch_id ||
      data.batch?._id ||
      data.batch?.id ||
      ""
    ),

    internship_program:
      data.internship_program ||
      data.program_name ||
      data.program?.name ||
      (typeof data.program === "string" ? data.program : "") ||
      "",

    batch:
      data.batch_name ||
      data.batch?.name ||
      (typeof data.batch === "string" ? data.batch : "") ||
      "",

    status: String(data.status || "active").toLowerCase(),

    profile_photo:
      data.profile_photo ||
      data.profile_image ||
      data.photo ||
      data.avatar ||
      "",

    created_at:
      data.created_at ||
      data.joined_at ||
      "",

    internship_start:
      data.internship_start ||
      data.start_date ||
      "",

    internship_end:
      data.internship_end ||
      data.end_date ||
      "",

    required_hours: Number(
      data.required_hours ||
      data.total_required_hours ||
      data.internship_hours ||
      120
    ),

    completed_hours: Number(
      data.completed_hours ||
      data.total_hours ||
      data.hours_completed ||
      0
    ),

    payment_status: data.payment_status || "unknown"
  };
}

function formatDate(value) {
  if (!value) return "—";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return value;
  }
}

function getStatus(status) {
  const normalized = String(status || "pending")
    .toLowerCase()
    .replaceAll(" ", "_");

  return STATUS[normalized] || "bg-slate-100 text-slate-600";
}

function Status({ value }) {
  const text = String(value || "Pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatus(value)}`}
    >
      {text}
    </span>
  );
}

function Avatar({ student, size = "lg" }) {
  const dimensions =
    size === "lg"
      ? "h-16 w-16 text-xl"
      : "h-10 w-10 text-sm";

  const initials = String(student.full_name || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 font-bold text-blue-700 ${dimensions}`}
    >
      {student.profile_photo ? (
        <img
          src={student.profile_photo}
          alt={student.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials || "ST"
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-500">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-700">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  description
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function EditStudentModal({
  student,
  onClose,
  onSave,
  saving
}) {
  const [form, setForm] = useState({});
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!student) return;

    setForm({
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      enrollment_id: student.enrollment_id || "",
      college: student.college || "",
      department: student.department || "",
      program_id: student.program_id || "",
      batch_id: student.batch_id || "",
      status: student.status || "active"
    });

    setError("");
  }, [student]);

  useEffect(() => {
    if (!student) return;

    let cancelled = false;

    const loadOptions = async () => {
      setLoadingOptions(true);
      setError("");

      try {
        const [programResponse, batchResponse] = await Promise.all([
          apiGet("/admin/programs"),
          apiGet("/admin/batches")
        ]);

        if (cancelled) return;

        const programList = getArray(programResponse, [
          "programs",
          "items",
          "results"
        ]);

        const batchList = getArray(batchResponse, [
          "batches",
          "items",
          "results"
        ]);

        setPrograms(programList);
        setBatches(batchList);
      } catch (err) {
        console.error("Program and Batch loading failed:", err);

        if (!cancelled) {
          setError(
            "Unable to load Programs and Batches. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [student]);

  if (!student) return null;

  const change = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const selectedBatches = batches.filter(
    (batch) =>
      getBatchProgramId(batch) === String(form.program_id || "")
  );

  const fieldClass =
    "w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

  const fields = [
    ["full_name", "Full Name", "text"],
    ["email", "Email", "email"],
    ["phone", "Phone", "tel"],
    ["enrollment_id", "Enrollment ID", "text"],
    ["college", "College", "text"],
    ["department", "Department / Course", "text"]
  ];

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.program_id) {
      setError("Please select a Program.");
      return;
    }

    if (!form.batch_id) {
      setError("Please select a Batch.");
      return;
    }

    const selectedProgram = programs.find(
      (item) => getItemId(item) === String(form.program_id)
    );

    const selectedBatch = batches.find(
      (item) => getItemId(item) === String(form.batch_id)
    );

    if (!selectedProgram || !selectedBatch) {
      setError("Invalid Program or Batch selection.");
      return;
    }

    if (
      getBatchProgramId(selectedBatch) !== String(form.program_id)
    ) {
      setError("Selected Batch does not belong to this Program.");
      return;
    }

    try {
      await onSave({
        ...form,
        program_id: form.program_id,
        batch_id: form.batch_id,
        internship_program: getItemName(selectedProgram),
        batch_name: getItemName(selectedBatch)
      });
    } catch (err) {
      setError(err.message || "Unable to update student.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-bold text-slate-900">
              Edit Student
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Update student information
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="max-h-[65vh] overflow-y-auto p-5">

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">

              {fields.map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    {label}
                  </label>

                  <input
                    type={type}
                    value={form[key] || ""}
                    onChange={(event) =>
                      change(key, event.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Internship Program
                </label>

                <select
                  value={form.program_id || ""}
                  disabled={loadingOptions}
                  onChange={(event) => {
                    const programId = event.target.value;

                    setForm((previous) => ({
                      ...previous,
                      program_id: programId,
                      batch_id: ""
                    }));
                  }}
                  className={fieldClass}
                >
                  <option value="">
                    {loadingOptions
                      ? "Loading Programs..."
                      : "Select Program"}
                  </option>

                  {programs.map((program) => (
                    <option
                      key={getItemId(program)}
                      value={getItemId(program)}
                    >
                      {getItemName(program)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Batch
                </label>

                <select
                  value={form.batch_id || ""}
                  disabled={!form.program_id || loadingOptions}
                  onChange={(event) =>
                    change("batch_id", event.target.value)
                  }
                  className={fieldClass}
                >
                  <option value="">
                    {!form.program_id
                      ? "Select Program First"
                      : loadingOptions
                      ? "Loading Batches..."
                      : "Select Batch"}
                  </option>

                  {selectedBatches.map((batch) => (
                    <option
                      key={getItemId(batch)}
                      value={getItemId(batch)}
                    >
                      {getItemName(batch)}
                    </option>
                  ))}
                </select>

                {form.program_id &&
                  !loadingOptions &&
                  selectedBatches.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No batches available for this Program.
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Account Status
                </label>

                <select
                  value={form.status || "active"}
                  onChange={(event) =>
                    change("status", event.target.value)
                  }
                  className={fieldClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-2 border-t bg-slate-50 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingOptions}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && (
                <Loader2 size={15} className="animate-spin" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({
  student,
  onClose,
  onSave,
  saving
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPassword("");
    setError("");
  }, [student]);

  if (!student) return null;

  const submit = async (event) => {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setError("");
      await onSave(password);
    } catch (err) {
      setError(err.message || "Password reset failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Reset Password
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {student.full_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            New Password
          </label>

          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />

          {error && (
            <p className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptySection({ title, description }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div className="rounded-2xl bg-slate-100 p-4">
        <FileText size={24} className="text-slate-400" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription
}) {
  if (!rows.length) {
    return (
      <EmptySection
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[650px]">
        <thead>
          <tr className="border-b bg-slate-50">
            {columns.map((column) => (
              <th
                key={column.label}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id || row._id || index}
              className="border-b border-slate-50 hover:bg-slate-50/70"
            >
              {columns.map((column) => (
                <td
                  key={column.label}
                  className="px-4 py-4 text-sm text-slate-700"
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview({ student, sectionData }) {
  const attendance = sectionData.attendance || {};
  const tasks = getArray(sectionData.tasks, ["tasks", "items"]);
  const projects = getArray(sectionData.projects, ["projects", "items"]);
  const learn = sectionData.learn || {};
  const logbook = getArray(sectionData.logbook, ["logbook", "entries"]);
  const certificates = getArray(sectionData.certificates, ["certificates", "items"]);

  const required = student.required_hours || 120;
  const completed = student.completed_hours || 0;

  const progress = required > 0
    ? Math.min(100, Math.round((completed / required) * 100))
    : 0;

  return (
    <div className="space-y-5">

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Internship Hours"
          value={`${completed} / ${required}`}
          description="Hours completed"
          icon={Clock}
          color="bg-blue-50 text-blue-600"
        />

        <MetricCard
          label="Attendance"
          value={
            attendance.percentage != null
              ? `${attendance.percentage}%`
              : "—"
          }
          description="Attendance percentage"
          icon={CalendarDays}
          color="bg-emerald-50 text-emerald-600"
        />

        <MetricCard
          label="Tasks"
          value={tasks.length}
          description="Assigned tasks"
          icon={ClipboardList}
          color="bg-violet-50 text-violet-600"
        />

        <MetricCard
          label="Projects"
          value={projects.length}
          description="Assigned projects"
          icon={FolderKanban}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                Internship Progress
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Overall completion
              </p>
            </div>

            <span className="text-xl font-bold text-blue-600">
              {progress}%
            </span>
          </div>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>{completed} hours completed</span>
            <span>
              {Math.max(0, required - completed)} hours remaining
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <InfoItem
              icon={CalendarDays}
              label="Internship Start"
              value={formatDate(student.internship_start)}
            />

            <InfoItem
              icon={CalendarDays}
              label="Internship End"
              value={formatDate(student.internship_end)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">
            Account Overview
          </h3>

          <div className="mt-4 space-y-4">
            <InfoItem
              icon={ShieldCheck}
              label="Account Status"
              value={<Status value={student.status} />}
            />

            <InfoItem
              icon={GraduationCap}
              label="Program"
              value={student.internship_program}
            />

            <InfoItem
              icon={Layers}
              label="Batch"
              value={student.batch}
            />

            <InfoItem
              icon={CalendarDays}
              label="Joined"
              value={formatDate(student.created_at)}
            />

            <InfoItem
              icon={CheckCircle2}
              label="Payment"
              value={<Status value={student.payment_status} />}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-slate-900">
            Learning Progress
          </h3>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <BookOpen size={24} />
            </div>

            <div>
              <p className="text-2xl font-bold text-slate-900">
                {learn.progress ?? learn.completion_percentage ?? 0}%
              </p>

              <p className="text-xs text-slate-500">
                Learn program progress
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-500"
              style={{
                width: `${Math.min(
                  100,
                  learn.progress ?? learn.completion_percentage ?? 0
                )}%`
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-slate-900">
            Activity Summary
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Logbook Entries", logbook.length],
              ["Certificates", certificates.length]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">
                  {value}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceSection({ data }) {
  const rows = getArray(data, [
    "attendance",
    "records",
    "items",
    "history"
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Present Days"
          value={data?.present_days ?? data?.present ?? 0}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />

        <MetricCard
          label="Absent Days"
          value={data?.absent_days ?? data?.absent ?? 0}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />

        <MetricCard
          label="Total Hours"
          value={data?.total_hours ?? data?.hours ?? 0}
          icon={Clock}
          color="bg-blue-50 text-blue-600"
        />
      </div>

      <DataTable
        rows={rows}
        emptyTitle="No attendance records"
        emptyDescription="Attendance records will appear here."
        columns={[
          {
            label: "Date",
            render: (row) =>
              formatDate(row.date || row.check_in_date)
          },
          {
            label: "Check In",
            render: (row) =>
              row.check_in || row.check_in_time || "—"
          },
          {
            label: "Check Out",
            render: (row) =>
              row.check_out || row.check_out_time || "—"
          },
          {
            label: "Hours",
            render: (row) =>
              row.hours ?? row.duration ?? "—"
          },
          {
            label: "Status",
            render: (row) => <Status value={row.status} />
          }
        ]}
      />
    </div>
  );
}

function TasksSection({ data }) {
  const rows = getArray(data, [
    "tasks",
    "items",
    "assignments"
  ]);

  return (
    <DataTable
      rows={rows}
      emptyTitle="No assigned tasks"
      emptyDescription="Tasks assigned to this student will appear here."
      columns={[
        {
          label: "Task",
          render: (row) => (
            <div>
              <p className="font-semibold text-slate-800">
                {row.title || row.task_name || "Untitled Task"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {row.description || ""}
              </p>
            </div>
          )
        },
        {
          label: "Deadline",
          render: (row) =>
            formatDate(row.deadline || row.due_date)
        },
        {
          label: "Submitted",
          render: (row) =>
            formatDate(row.submitted_at)
        },
        {
          label: "Status",
          render: (row) => <Status value={row.status} />
        }
      ]}
    />
  );
}

function LearnSection({ data }) {
  const rows = getArray(data, [
    "learn",
    "programs",
    "courses",
    "items"
  ]);

  return (
    <DataTable
      rows={rows}
      emptyTitle="No learning programs assigned"
      emptyDescription="Assigned Learn programs and progress will appear here."
      columns={[
        {
          label: "Program",
          render: (row) => (
            <div>
              <p className="font-semibold text-slate-800">
                {row.title ||
                  row.program_name ||
                  row.name ||
                  "Learning Program"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {row.modules_count ?? row.total_modules ?? "—"} modules
              </p>
            </div>
          )
        },
        {
          label: "Progress",
          render: (row) => {
            const progress =
              row.progress ??
              row.completion_percentage ??
              row.completed_percentage ??
              0;

            return (
              <div className="min-w-[120px]">
                <div className="mb-1 flex justify-between text-xs">
                  <span>{progress}%</span>
                </div>

                <div className="h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${Math.min(100, progress)}%`
                    }}
                  />
                </div>
              </div>
            );
          }
        },
        {
          label: "Completed",
          render: (row) =>
            `${row.completed_lessons ?? row.completed ?? 0} / ${row.total_lessons ?? row.total ?? 0}`
        },
        {
          label: "Status",
          render: (row) => <Status value={row.status} />
        }
      ]}
    />
  );
}

function ProjectsSection({ data }) {
  const rows = getArray(data, [
    "projects",
    "items",
    "assignments"
  ]);

  return (
    <DataTable
      rows={rows}
      emptyTitle="No projects assigned"
      emptyDescription="Projects assigned to this student will appear here."
      columns={[
        {
          label: "Project",
          render: (row) => (
            <div>
              <p className="font-semibold text-slate-800">
                {row.title || row.project_name || "Untitled Project"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {row.technology || row.tech_stack || ""}
              </p>
            </div>
          )
        },
        {
          label: "Deadline",
          render: (row) =>
            formatDate(row.deadline || row.due_date)
        },
        {
          label: "Submitted",
          render: (row) =>
            formatDate(row.submitted_at)
        },
        {
          label: "Status",
          render: (row) => <Status value={row.status} />
        }
      ]}
    />
  );
}

function LogbookSection({ data }) {
  const rows = getArray(data, [
    "logbook",
    "entries",
    "items"
  ]);

  return (
    <DataTable
      rows={rows}
      emptyTitle="No logbook entries"
      emptyDescription="Student's submitted daily logbook entries will appear here."
      columns={[
        {
          label: "Date",
          render: (row) => formatDate(row.date)
        },
        {
          label: "Activity",
          render: (row) => (
            <div>
              <p className="font-semibold text-slate-800">
                {row.title || row.activity || "Daily Activity"}
              </p>

              <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                {row.description || row.work_done || ""}
              </p>
            </div>
          )
        },
        {
          label: "Hours",
          render: (row) =>
            row.hours ?? row.duration ?? "—"
        },
        {
          label: "Status",
          render: (row) => <Status value={row.status} />
        }
      ]}
    />
  );
}

function CertificatesSection({ data }) {
  const rows = getArray(data, [
    "certificates",
    "items"
  ]);

  return (
    <DataTable
      rows={rows}
      emptyTitle="No certificates"
      emptyDescription="Certificates issued to this student will appear here."
      columns={[
        {
          label: "Certificate",
          render: (row) => (
            <div>
              <p className="font-semibold text-slate-800">
                {row.certificate_name ||
                  row.program_name ||
                  row.title ||
                  "Internship Certificate"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {row.certificate_number ||
                  row.certificate_id ||
                  ""}
              </p>
            </div>
          )
        },
        {
          label: "Issued",
          render: (row) =>
            formatDate(row.issued_at || row.issue_date)
        },
        {
          label: "Status",
          render: (row) =>
            <Status value={row.status || "issued"} />
        },
        {
          label: "Action",
          render: (row) =>
            row.download_url ? (
              <a
                href={row.download_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
              >
                <Download size={14} />
                Download
              </a>
            ) : (
              "—"
            )
        }
      ]}
    />
  );
}

export default function StudentDetails() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [sectionData, setSectionData] = useState({});
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [toast, setToast] = useState("");

  const loadStudent = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await apiGet(
        `/admin/students/${studentId}`
      );

      const result = getObject(response);

      setStudent(normalizeStudent(result));
    } catch (error) {
      console.error("Student details load failed:", error);

      setLoadError(
        error.message || "Unable to load student details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const showToast = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 3500);
  };

  const loadSection = async (tab, force = false) => {
    if (tab === "overview") return;
    if (!force && sectionData[tab]) return;

    const endpoints = {
      attendance: `/admin/students/${studentId}/attendance`,
      tasks: `/admin/students/${studentId}/tasks`,
      learn: `/admin/students/${studentId}/learn`,
      projects: `/admin/students/${studentId}/projects`,
      logbook: `/admin/students/${studentId}/logbook`,
      certificates: `/admin/students/${studentId}/certificates`
    };

    if (!endpoints[tab]) return;

    setSectionLoading(true);
    setSectionError("");

    try {
      const response = await apiGet(endpoints[tab]);

      setSectionData((previous) => ({
        ...previous,
        [tab]: response?.data ?? response
      }));
    } catch (error) {
      console.error(`${tab} loading failed:`, error);

      setSectionError(
        error.message || `Unable to load ${tab}.`
      );
    } finally {
      setSectionLoading(false);
    }
  };

  useEffect(() => {
    loadSection(activeTab);
  }, [activeTab, studentId]);

  const handleEditSave = async (form) => {
    setEditSaving(true);

    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        enrollment_id: form.enrollment_id,
        college: form.college,
        department: form.department,
        program_id: form.program_id,
        batch_id: form.batch_id,
        internship_program: form.internship_program,
        batch_name: form.batch_name,
        status: form.status
      };

      await apiPut(
        `/admin/students/${studentId}`,
        payload
      );

      setEditOpen(false);

      await loadStudent();

      showToast("Student profile updated.");
    } catch (error) {
      console.error("Student update failed:", error);
      throw error;
    } finally {
      setEditSaving(false);
    }
  };

  const handlePasswordReset = async (password) => {
    setPasswordSaving(true);

    try {
      await apiPost(
        `/admin/students/${studentId}/reset-password`,
        {
          new_password: password
        }
      );

      setPasswordOpen(false);

      showToast("Student password reset successfully.");
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRefresh = async () => {
    await loadStudent();

    if (activeTab !== "overview") {
      await loadSection(activeTab, true);
    }
  };

  const quickActions = [
    {
      label: "Assign Task",
      icon: ClipboardList,
      route: "/admin/tasks"
    },
    {
      label: "Assign Project",
      icon: FolderKanban,
      route: "/admin/projects"
    },
    {
      label: "Assign Learn",
      icon: BookOpen,
      route: "/admin/learn"
    }
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2
          size={28}
          className="animate-spin text-blue-600"
        />

        <p className="text-sm text-slate-500">
          Loading student profile...
        </p>
      </div>
    );
  }

  if (loadError || !student) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
        <AlertCircle
          className="mx-auto text-red-500"
          size={30}
        />

        <h2 className="mt-3 font-semibold text-slate-900">
          Unable to load student
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {loadError || "Student record not found."}
        </p>

        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => navigate("/admin/students")}
            className="rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Back to Students
          </button>

          <button
            onClick={loadStudent}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {toast && (
        <div className="fixed right-4 top-20 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2
            size={17}
            className="text-emerald-400"
          />
          {toast}
        </div>
      )}

      <button
        onClick={() => navigate("/admin/students")}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Back to Students
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 sm:h-32" />

        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">

            <div className="flex items-end gap-3 sm:gap-4">
              <div className="rounded-2xl border-4 border-white shadow-sm">
                <Avatar student={student} size="lg" />
              </div>

              <div className="min-w-0 pb-1">
                <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
                  {student.full_name}
                </h1>

                <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                  {student.email}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Status value={student.status} />

                  {student.enrollment_id && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {student.enrollment_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:pb-1">
              <button
                onClick={() => setPasswordOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <KeyRound size={15} />
                Reset Password
              </button>

              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Edit size={15} />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <InfoItem
              icon={Phone}
              label="Phone"
              value={student.phone}
            />

            <InfoItem
              icon={GraduationCap}
              label="Program"
              value={student.internship_program}
            />

            <InfoItem
              icon={Layers}
              label="Batch"
              value={student.batch}
            />

            <InfoItem
              icon={Building2}
              label="College"
              value={student.college}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              onClick={() =>
                navigate(`${action.route}?studentId=${studentId}`)
              }
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <Icon size={18} />
                </div>

                <span className="text-sm font-semibold text-slate-700">
                  {action.label}
                </span>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-400"
              />
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

        <div className="border-b border-slate-200">
          <div className="flex gap-1 overflow-x-auto px-2 pt-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition sm:px-4 ${
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </h2>

            <button
              onClick={handleRefresh}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {sectionLoading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
              <Loader2
                size={25}
                className="animate-spin text-blue-600"
              />

              <p className="text-xs text-slate-500">
                Loading data...
              </p>
            </div>
          ) : sectionError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertCircle size={17} />
                Unable to load data
              </div>

              <p className="mt-1 text-xs text-red-600">
                {sectionError}
              </p>

              <button
                onClick={() => loadSection(activeTab, true)}
                className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <Overview
                  student={student}
                  sectionData={sectionData}
                />
              )}

              {activeTab === "attendance" && (
                <AttendanceSection
                  data={sectionData.attendance || {}}
                />
              )}

              {activeTab === "tasks" && (
                <TasksSection
                  data={sectionData.tasks || []}
                />
              )}

              {activeTab === "learn" && (
                <LearnSection
                  data={sectionData.learn || []}
                />
              )}

              {activeTab === "projects" && (
                <ProjectsSection
                  data={sectionData.projects || []}
                />
              )}

              {activeTab === "logbook" && (
                <LogbookSection
                  data={sectionData.logbook || []}
                />
              )}

              {activeTab === "certificates" && (
                <CertificatesSection
                  data={sectionData.certificates || []}
                />
              )}
            </>
          )}
        </div>
      </div>

      <EditStudentModal
        student={editOpen ? student : null}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
        saving={editSaving}
      />

      <PasswordModal
        student={passwordOpen ? student : null}
        onClose={() => setPasswordOpen(false)}
        onSave={handlePasswordReset}
        saving={passwordSaving}
      />

    </div>
  );
}
