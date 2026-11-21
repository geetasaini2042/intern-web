import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiGet,
  apiPost,
  apiPut
} from "../../lib/api";

import {
  Search,
  Plus,
  Users,
  GraduationCap,
  UserCheck,
  UserX,
  MoreHorizontal,
  Eye,
  Edit,
  KeyRound,
  RefreshCw,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  Calendar,
  Building2,
  Layers,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

const INITIAL_FORM = {
  full_name: "",
  email: "",
  phone: "",
  enrollment_id: "",
  college: "",
  department: "",
  internship_program: "",
  batch: "",
  status: "active"
};

const STATUS_CONFIG = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
  },
  inactive: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600 ring-slate-500/20"
  },
  suspended: {
    label: "Suspended",
    className: "bg-red-50 text-red-700 ring-red-600/20"
  },
  completed: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20"
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20"
  }
};

function getArray(response) {
  if (Array.isArray(response)) return response;

  return (
    response?.students ||
    response?.items ||
    response?.data?.students ||
    response?.data?.items ||
    response?.data ||
    []
  );
}

function normalizeStudent(student) {
  return {
    ...student,
    id:
      student.id ||
      student._id ||
      student.student_id ||
      student.user_id ||
      "",
    full_name:
      student.full_name ||
      student.name ||
      student.student_name ||
      student.username ||
      "Unnamed Student",
    email: student.email || student.student_email || "",
    phone: student.phone || student.mobile || student.phone_number || "",
    enrollment_id:
      student.enrollment_id ||
      student.roll_number ||
      student.registration_number ||
      student.student_id ||
      "",
    college:
      student.college ||
      student.college_name ||
      student.university ||
      "",
    department:
      student.department ||
      student.branch ||
      student.course ||
      "",
    internship_program:
      student.internship_program ||
      student.program_name ||
      student.program ||
      "",
    batch:
      student.batch_name ||
      student.batch ||
      student.batch_id ||
      "",
    status: String(student.status || student.account_status || "active")
      .toLowerCase(),
    created_at:
      student.created_at ||
      student.joined_at ||
      student.registration_date ||
      "",
    profile_photo:
      student.profile_photo ||
      student.profile_image ||
      student.photo ||
      student.avatar ||
      ""
  };
}

function Avatar({ student, size = "md" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg"
  };

  const initials = student.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 font-semibold text-blue-700 ${sizes[size]}`}
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

function StatusBadge({ status }) {
  const config =
    STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StudentModal({
  open,
  onClose,
  onSave,
  saving,
  student
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(student ? {
        full_name: student.full_name || "",
        email: student.email || "",
        phone: student.phone || "",
        enrollment_id: student.enrollment_id || "",
        college: student.college || "",
        department: student.department || "",
        internship_program: student.internship_program || "",
        batch: student.batch || "",
        status: student.status || "active"
      } : INITIAL_FORM);

      setError("");
    }
  }, [open, student]);

  if (!open) return null;

  const update = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Student name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    setError("");

    try {
      await onSave(form);
    } catch (err) {
      setError(err?.message || "Unable to save student.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  const labelClass =
    "mb-1.5 block text-xs font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {student ? "Edit Student" : "Add New Student"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Student account and internship information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="max-h-[calc(92vh-140px)] overflow-y-auto p-5 sm:p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Full Name *</label>
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="Enter student's full name"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Email Address *</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="student@example.com"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91"
                />
              </div>

              <div>
                <label className={labelClass}>Enrollment / Roll Number</label>
                <input
                  className={inputClass}
                  value={form.enrollment_id}
                  onChange={(e) => update("enrollment_id", e.target.value)}
                  placeholder="Enrollment number"
                />
              </div>

              <div>
                <label className={labelClass}>College / University</label>
                <input
                  className={inputClass}
                  value={form.college}
                  onChange={(e) => update("college", e.target.value)}
                  placeholder="College name"
                />
              </div>

              <div>
                <label className={labelClass}>Department / Course</label>
                <input
                  className={inputClass}
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="B.Sc., BCA, etc."
                />
              </div>

              <div>
                <label className={labelClass}>Internship Program</label>
                <input
                  className={inputClass}
                  value={form.internship_program}
                  onChange={(e) => update("internship_program", e.target.value)}
                  placeholder="120 Hours NEP Internship"
                />
              </div>

              <div>
                <label className={labelClass}>Batch</label>
                <input
                  className={inputClass}
                  value={form.batch}
                  onChange={(e) => update("batch", e.target.value)}
                  placeholder="NEP-2026-A"
                />
              </div>

              <div>
                <label className={labelClass}>Account Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {student ? "Save Changes" : "Create Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  student,
  onClose,
  onReset,
  saving
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  if (!student) return null;

  const submit = async (event) => {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");

    try {
      await onReset(password);
    } catch (err) {
      setError(err?.message || "Password reset failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Reset Password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {student.full_name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            New Password
          </label>

          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 pr-16 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Enter new password"
            />

            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}

          <p className="mt-2 text-xs text-slate-400">
            Minimum 8 characters.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionMenu({ student, onView, onEdit, onReset }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <button
              onClick={() => {
                setOpen(false);
                onView(student);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Eye size={15} />
              View Details
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onEdit(student);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Edit size={15} />
              Edit Student
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onReset(student);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <KeyRound size={15} />
              Reset Password
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Students() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  const [resetStudent, setResetStudent] = useState(null);
  const [resetSaving, setResetSaving] = useState(false);

  const [toast, setToast] = useState("");

  const loadStudents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      const response = await apiGet("/admin/students");
      const result = getArray(response);

      if (!Array.isArray(result)) {
        throw new Error("Invalid students API response.");
      }

      setStudents(result.map(normalizeStudent));
    } catch (error) {
      console.error("Students loading failed:", error);
      setLoadError(error.message || "Failed to load students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const programs = useMemo(() => {
    return [...new Set(
      students
        .map((student) => student.internship_program)
        .filter(Boolean)
    )];
  }, [students]);

  const batches = useMemo(() => {
    return [...new Set(
      students
        .map((student) => student.batch)
        .filter(Boolean)
    )];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();

    return students.filter((student) => {
      const searchable = [
        student.full_name,
        student.email,
        student.phone,
        student.enrollment_id,
        student.college,
        student.department,
        student.internship_program,
        student.batch
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        student.status === statusFilter;

      const matchesProgram =
        programFilter === "all" ||
        student.internship_program === programFilter;

      const matchesBatch =
        batchFilter === "all" ||
        student.batch === batchFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProgram &&
        matchesBatch
      );
    });
  }, [
    students,
    search,
    statusFilter,
    programFilter,
    batchFilter
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, programFilter, batchFilter]);

  const stats = useMemo(() => {
    const active = students.filter(
      (s) => s.status === "active"
    ).length;

    const inactive = students.filter(
      (s) => s.status === "inactive"
    ).length;

    const completed = students.filter(
      (s) => s.status === "completed"
    ).length;

    return {
      total: students.length,
      active,
      inactive,
      completed
    };
  }, [students]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };

  const handleSave = async (form) => {
    setSaving(true);

    try {
      if (editingStudent) {
        await apiPut(
          `/admin/students/${editingStudent.id}`,
          form
        );

        showToast("Student updated successfully.");
      } else {
        await apiPost("/admin/students", form);

        showToast("Student created successfully.");
      }

      setModalOpen(false);
      setEditingStudent(null);
      await loadStudents(true);
    } catch (error) {
      console.error("Student save failed:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (password) => {
    if (!resetStudent) return;

    setResetSaving(true);

    try {
      await apiPost(
        `/admin/students/${resetStudent.id}/reset-password`,
        {
          new_password: password
        }
      );

      setResetStudent(null);
      showToast("Password reset successfully.");
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    } finally {
      setResetSaving(false);
    }
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingStudent(null);
    setModalOpen(true);
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Enrollment ID",
      "College",
      "Department",
      "Program",
      "Batch",
      "Status"
    ];

    const rows = filteredStudents.map((student) => [
      student.full_name,
      student.email,
      student.phone,
      student.enrollment_id,
      student.college,
      student.department,
      student.internship_program,
      student.batch,
      student.status
    ]);

    const escapeCell = (value) =>
      `"${String(value || "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(","))
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "students.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-20 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2 size={17} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Page intro */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Students
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage student accounts, internship enrollment and batches.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            disabled={!filteredStudents.length}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.total}
          subtitle="All registered students"
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Active Students"
          value={stats.active}
          subtitle="Currently active accounts"
          icon={UserCheck}
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Inactive Students"
          value={stats.inactive}
          subtitle="Inactive accounts"
          icon={UserX}
          color="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="Completed internship"
          icon={GraduationCap}
          color="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Filters */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students, email, enrollment, college..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[125px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="min-w-[145px] max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500"
              >
                <option value="all">All Programs</option>
                {programs.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>

              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="min-w-[125px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500"
              >
                <option value="all">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>

              <button
                onClick={() => loadStudents(true)}
                disabled={refreshing}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
                title="Refresh"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              <Filter size={13} className="mr-1 inline" />
              {filteredStudents.length} students found
            </p>

            {(search ||
              statusFilter !== "all" ||
              programFilter !== "all" ||
              batchFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setProgramFilter("all");
                  setBatchFilter("all");
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {loadError && (
          <div className="m-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load students</p>
                <p className="mt-1 text-xs">{loadError}</p>
              </div>
            </div>

            <button
              onClick={() => loadStudents()}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-blue-600" />
            <p className="text-sm text-slate-500">Loading students...</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Student
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Enrollment
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Program / Batch
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      College
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar student={student} />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {student.full_name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {student.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-xs font-medium text-slate-700">
                          {student.enrollment_id || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {student.phone || "No phone"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[200px] truncate text-xs font-medium text-slate-700">
                          {student.internship_program || "—"}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <Layers size={12} />
                          {student.batch || "No batch"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[180px] truncate text-xs text-slate-600">
                          {student.college || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {student.department || ""}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={student.status} />
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() =>
                              navigate(`/admin/students/${student.id}`)
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                            title="View student"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => openEdit(student)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Edit student"
                          >
                            <Edit size={16} />
                          </button>

                          <ActionMenu
                            student={student}
                            onView={(s) =>
                              navigate(`/admin/students/${s.id}`)
                            }
                            onEdit={openEdit}
                            onReset={setResetStudent}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {paginatedStudents.map((student) => (
                <div key={student.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar student={student} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {student.full_name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {student.email}
                          </p>
                        </div>

                        <ActionMenu
                          student={student}
                          onView={(s) =>
                            navigate(`/admin/students/${s.id}`)
                          }
                          onEdit={openEdit}
                          onReset={setResetStudent}
                        />
                      </div>

                      <div className="mt-2">
                        <StatusBadge status={student.status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-[10px] font-medium text-slate-400">
                        Enrollment
                      </p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-700">
                        {student.enrollment_id || "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-[10px] font-medium text-slate-400">
                        Batch
                      </p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-700">
                        {student.batch || "—"}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-lg bg-slate-50 p-2.5">
                      <p className="text-[10px] font-medium text-slate-400">
                        Internship Program
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {student.internship_program || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        navigate(`/admin/students/${student.id}`)
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600"
                    >
                      <Eye size={15} />
                      View Details
                    </button>

                    <button
                      onClick={() => openEdit(student)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 py-2.5 text-xs font-semibold text-blue-700"
                    >
                      <Edit size={15} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty */}
            {!loadError && filteredStudents.length === 0 && (
              <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <Users size={25} className="text-slate-400" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                  No students found
                </h3>

                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Try changing your search or filters, or add a new student.
                </p>

                <button
                  onClick={openAdd}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Add Student
                </button>
              </div>
            )}

            {/* Pagination */}
            {filteredStudents.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {(currentPage - 1) * pageSize + 1}
                  </span>
                  {" - "}
                  <span className="font-medium text-slate-700">
                    {Math.min(currentPage * pageSize, filteredStudents.length)}
                  </span>
                  {" of "}
                  <span className="font-medium text-slate-700">
                    {filteredStudents.length}
                  </span>
                  {" students"}
                </p>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <span className="px-2 text-xs text-slate-500">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <StudentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSave}
        saving={saving}
        student={editingStudent}
      />

      {/* Password reset */}
      {resetStudent && (
        <ResetPasswordModal
          student={resetStudent}
          onClose={() => setResetStudent(null)}
          onReset={handleResetPassword}
          saving={resetSaving}
        />
      )}
    </div>
  );
}