import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";
import {
  ArrowLeft,
  UserRound,
  Mail,
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
  MoreHorizontal,
  ChevronRight,
  Loader2,
  Download,
  ExternalLink,
  ShieldCheck,
  Activity,
  FileText,
  Plus,
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
    college: data.college || data.college_name || data.university || "",
    department: data.department || data.course || data.branch || "",
    internship_program:
      data.internship_program ||
      data.program_name ||
      data.program ||
      "",
    batch: data.batch_name || data.batch || "",
    status: String(data.status || "active").toLowerCase(),
    profile_photo:
      data.profile_photo ||
      data.profile_image ||
      data.photo ||
      data.avatar ||
      "",
    created_at: data.created_at || data.joined_at || "",
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
    return new Date(value).toLocaleDateString("en-IN", {
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
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

  const initials = student.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
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
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          )}
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function EditStudentModal({ student, onClose, onSave, saving }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (student) {
      setForm({
        full_name: student.full_name || "",
        email: student.email || "",
        phone: student.phone || "",
        enrollment_id: student.enrollment_id || "",
        college: student.college || "",
        department: student.department || "",
        internship_program: student.internship_program || "",
        batch: student.batch || "",
        status: student.status || "active"
      });
    }
  }, [student]);

  if (!student) return null;

  const change = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      await onSave(form);
    } catch (err) {
      setError(err.message || "Unable to update student.");
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-bold text-slate-900">Edit Student</h2>
            <p className="mt-1 text-xs text-slate-500">
              Update student information
            </p>
          </div>

          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
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
              {[
                ["full_name", "Full Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["enrollment_id", "Enrollment ID"],
                ["college", "College"],
                ["department", "Department / Course"],
                ["internship_program", "Program"],
                ["batch", "Batch"]
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    {label}
                  </label>

                  <input
                    value={form[key] || ""}
                    onChange={(e) => change(key, e.target.value)}
                    className={fieldClass}
                  />
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Account Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
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
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({ student, onClose, onSave, saving }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!student) return null;

  const submit = async (e) => {
    e.preventDefault();

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
            <h2 className="font-bold text-slate-900">Reset Password</h2>
            <p className="mt-1 text-xs text-slate-500">
              {student.full_name}
            </p>
          </div>

          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
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
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
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

      <h3 className="mt-4 text-sm font-semibold text-slate-800">{title}</h3>

      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
    </div>
  );
}

function DataTable({ columns, rows, emptyTitle, emptyDescription }) {
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
                <td key={column.label} className="px-4 py-4 text-sm text-slate-700">
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
  const tasks = sectionData.tasks || [];
  const projects = sectionData.projects || [];
  const learn = sectionData.learn || {};
  const logbook = sectionData.logbook || [];
  const certificates = sectionData.certificates || [];

  const required = student.required_hours || 120;
  const completed = student.completed_hours || 0;
  const progress = Math.min(100, Math.round((completed / required) * 100));

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
          value={attendance.percentage != null ? `${attendance.percentage}%` : "—"}
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
            <span>{Math.max(0, required - completed)} hours remaining</span>
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
          <h3 className="font-semibold text-slate-900">Account Overview</h3>

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
          <h3 className="mb-4 font-semibold text-slate-900">Learning Progress</h3>

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
          <h3 className="mb-4 font-semibold text-slate-900">Activity Summary</h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Logbook Entries", logbook.length],
              ["Certificates", certificates.length]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}