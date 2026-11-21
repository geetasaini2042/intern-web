
import React, { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { useNavigate } from "react-router-dom";

const getList = (res, keys = []) => {
  if (Array.isArray(res)) return res;

  for (const key of keys) {
    if (Array.isArray(res?.[key])) return res[key];
  }

  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;

  return [];
};

const getCount = (res, keys = []) => {
  if (typeof res === "number") return res;

  for (const key of keys) {
    if (res?.[key] !== undefined && res?.[key] !== null) {
      return Number(res[key]) || 0;
    }
  }

  return null;
};

const getId = (item) => item?.id || item?._id || "";

const getName = (student) =>
  student?.name ||
  student?.full_name ||
  student?.student_name ||
  student?.username ||
  "Unnamed Student";

const getStatus = (item) =>
  String(item?.status || item?.approval_status || "").toLowerCase();

const formatDate = (date) => {
  if (!date) return "—";

  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const EMPTY_STATS = {
  students: 0,
  activeStudents: 0,
  programs: 0,
  batches: 0,
  pendingApprovals: 0,
  tasks: 0,
  projects: 0,
  attendance: 0,
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const endpoints = [
      { key: "students", url: "/admin/students" },
      { key: "programs", url: "/admin/programs" },
      { key: "batches", url: "/admin/batches" },
      { key: "tasks", url: "/admin/tasks" },
      { key: "projects", url: "/admin/projects" },
      { key: "approvals", url: "/admin/approvals" },
      { key: "attendance", url: "/admin/attendance" },
    ];

    const results = await Promise.allSettled(
      endpoints.map((item) => apiGet(item.url))
    );

    const data = {};

    results.forEach((result, index) => {
      const key = endpoints[index].key;

      if (result.status === "fulfilled") {
        data[key] = result.value;
      } else {
        data[key] = null;
        console.error(
          `Dashboard ${key} fetch error:`,
          result.reason
        );
      }
    });

    const students = getList(data.students, [
      "students",
      "results",
      "users",
    ]);

    const programs = getList(data.programs, [
      "programs",
    ]);

    const batches = getList(data.batches, [
      "batches",
    ]);

    const tasks = getList(data.tasks, [
      "tasks",
      "assignments",
    ]);

    const projects = getList(data.projects, [
      "projects",
    ]);

    const approvals = getList(data.approvals, [
      "approvals",
      "pending",
      "submissions",
      "items",
      "requests",
    ]);

    const attendance = getList(data.attendance, [
      "attendance",
      "records",
      "items",
    ]);

    const activeStudents = students.filter((student) => {
      const status = String(student.status || "active").toLowerCase();
      return status === "active";
    }).length;

    const pendingApprovals = approvals.filter((item) => {
      const status = getStatus(item);

      return (
        status === "pending" ||
        status === "submitted" ||
        status === "under_review"
      );
    });

    const pendingTasks = tasks.filter((item) => {
      const status = getStatus(item);

      return (
        status === "pending" ||
        status === "submitted" ||
        status === "under_review"
      );
    });

    const pendingProjects = projects.filter((item) => {
      const status = getStatus(item);

      return (
        status === "pending" ||
        status === "submitted" ||
        status === "under_review"
      );
    });

    const totalStudents =
      getCount(data.students, [
        "total",
        "total_students",
        "count",
      ]) ?? students.length;

    const totalPrograms =
      getCount(data.programs, [
        "total",
        "total_programs",
        "count",
      ]) ?? programs.length;

    const totalBatches =
      getCount(data.batches, [
        "total",
        "total_batches",
        "count",
      ]) ?? batches.length;

    const totalTasks =
      getCount(data.tasks, [
        "total",
        "total_tasks",
        "count",
      ]) ?? tasks.length;

    const totalProjects =
      getCount(data.projects, [
        "total",
        "total_projects",
        "count",
      ]) ?? projects.length;

    const totalAttendance =
      getCount(data.attendance, [
        "total",
        "total_attendance",
        "count",
      ]) ?? attendance.length;

    const serverPending =
      getCount(data.approvals, [
        "pending_count",
        "pending",
        "total_pending",
      ]);

    const calculatedPending =
      pendingApprovals.length +
      pendingTasks.length +
      pendingProjects.length;

    const finalPending =
      serverPending !== null
        ? serverPending
        : calculatedPending;

    setStats({
      students: totalStudents,
      activeStudents,
      programs: totalPrograms,
      batches: totalBatches,
      pendingApprovals: finalPending,
      tasks: totalTasks,
      projects: totalProjects,
      attendance: totalAttendance,
    });

    setRecentStudents(
      [...students]
        .sort((a, b) => {
          const dateA = new Date(
            a.created_at || a.createdAt || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || b.createdAt || 0
          ).getTime();

          return dateB - dateA;
        })
        .slice(0, 5)
    );

    const allPending = [
      ...pendingApprovals.map((item) => ({
        ...item,
        type: item.type || item.category || "Submission",
      })),
      ...pendingTasks.map((item) => ({
        ...item,
        type: "Task",
      })),
      ...pendingProjects.map((item) => ({
        ...item,
        type: "Project",
      })),
    ];

    setPendingItems(allPending.slice(0, 5));
    setLastUpdated(new Date());

    const failedCount = results.filter(
      (result) => result.status === "rejected"
    ).length;

    if (failedCount === endpoints.length) {
      setError("Unable to connect to the admin APIs.");
    } else if (failedCount > 0) {
      setError(
        `${failedCount} dashboard section(s) could not be loaded. Some statistics may be incomplete.`
      );
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.students,
      subtitle: `${stats.activeStudents} active students`,
      icon: "ST",
      color: "blue",
      route: "/admin/students",
    },
    {
      title: "Programs",
      value: stats.programs,
      subtitle: "Available programs",
      icon: "PR",
      color: "violet",
      route: "/admin/programs",
    },
    {
      title: "Batches",
      value: stats.batches,
      subtitle: "Created batches",
      icon: "BT",
      color: "cyan",
      route: "/admin/batches",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      subtitle: "Require your review",
      icon: "AP",
      color: "amber",
      route: "/admin/approvals",
    },
    {
      title: "Tasks",
      value: stats.tasks,
      subtitle: "Assigned tasks",
      icon: "TK",
      color: "emerald",
      route: "/admin/tasks",
    },
    {
      title: "Projects",
      value: stats.projects,
      subtitle: "Student projects",
      icon: "PJ",
      color: "rose",
      route: "/admin/projects",
    },
    {
      title: "Attendance Records",
      value: stats.attendance,
      subtitle: "Attendance entries",
      icon: "AT",
      color: "indigo",
      route: "/admin/attendance",
    },
  ];

  const quickActions = [
    {
      title: "Add Student",
      description: "Register a new intern",
      icon: "+",
      route: "/admin/students",
      color: "blue",
    },
    {
      title: "Create Program",
      description: "Manage internship programs",
      icon: "P",
      route: "/admin/programs",
      color: "violet",
    },
    {
      title: "Manage Batches",
      description: "Create and organize batches",
      icon: "B",
      route: "/admin/batches",
      color: "cyan",
    },
    {
      title: "Assign Tasks",
      description: "Assign work to students",
      icon: "T",
      route: "/admin/tasks",
      color: "emerald",
    },
    {
      title: "Review Projects",
      description: "Check student submissions",
      icon: "R",
      route: "/admin/projects",
      color: "rose",
    },
    {
      title: "Approvals",
      description: "Review pending submissions",
      icon: "A",
      route: "/admin/approvals",
      color: "amber",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              ADMINISTRATION
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage students, programs, batches and internship activities.
            </p>

            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>

          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <span className={refreshing ? "animate-spin" : ""}>
              ↻
            </span>
            {refreshing ? "Refreshing..." : "Refresh Dashboard"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.title}
              {...card}
              loading={loading}
              onClick={() => navigate(card.route)}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Common administrative tasks
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.route)}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${actionColors[action.color]}`}
                >
                  {action.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">
                    {action.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {action.description}
                  </p>
                </div>

                <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Recent Students */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Recent Students
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Recently registered students
                </p>
              </div>

              <button
                onClick={() => navigate("/admin/students")}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <LoadingList />
            ) : recentStudents.length === 0 ? (
              <EmptyState message="No students found." />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentStudents.map((student) => (
                  <button
                    key={getId(student)}
                    onClick={() =>
                      navigate(
                        `/admin/students/${getId(student)}`
                      )
                    }
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <Avatar student={student} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getName(student)}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {student.email ||
                          student.college ||
                          student.program_name ||
                          "Student"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {formatDate(
                          student.created_at ||
                            student.createdAt ||
                            student.registration_date
                        )}
                      </p>

                      <StatusPill
                        status={student.status || "active"}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Pending Reviews */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Pending Reviews
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Items waiting for review
                </p>
              </div>

              <button
                onClick={() => navigate("/admin/approvals")}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <LoadingList />
            ) : pendingItems.length === 0 ? (
              <EmptyState message="No pending reviews." />
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingItems.map((item, index) => (
                  <button
                    key={getId(item) || index}
                    onClick={() =>
                      navigate(
                        item.type === "Project"
                          ? "/admin/projects"
                          : item.type === "Task"
                          ? "/admin/tasks"
                          : "/admin/approvals"
                      )
                    }
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-600">
                      !
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.title ||
                          item.name ||
                          item.task_name ||
                          item.project_name ||
                          item.type}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.student_name ||
                          item.name_of_student ||
                          item.student?.name ||
                          item.type}
                      </p>
                    </div>

                    <StatusPill status="pending" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Overview */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">
              System Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current administrative records
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <OverviewItem
              label="Students"
              value={stats.students}
              onClick={() => navigate("/admin/students")}
            />

            <OverviewItem
              label="Programs"
              value={stats.programs}
              onClick={() => navigate("/admin/programs")}
            />

            <OverviewItem
              label="Batches"
              value={stats.batches}
              onClick={() => navigate("/admin/batches")}
            />

            <OverviewItem
              label="Tasks"
              value={stats.tasks}
              onClick={() => navigate("/admin/tasks")}
            />
          </div>
        </section>

        {/* Footer */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
          <p>Internship Management Administration</p>
          <p>Dashboard Overview</p>
        </div>
      </div>
    </div>
  );
}

const actionColors = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  loading,
  onClick,
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    cyan: "bg-cyan-50 text-cyan-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              Number(value).toLocaleString("en-IN")
            )}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${colors[color]}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs font-medium text-slate-400">
          View details
        </span>

        <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500">
          →
        </span>
      </div>
    </button>
  );
}

function Avatar({ student }) {
  const image =
    student.profile_image ||
    student.avatar ||
    student.photo ||
    student.image;

  const name = getName(student);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
      {initials || "S"}
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || "active").toLowerCase();

  const isActive =
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "completed";

  const isPending =
    normalized === "pending" ||
    normalized === "submitted" ||
    normalized === "under_review";

  const classes = isActive
    ? "bg-emerald-50 text-emerald-700"
    : isPending
    ? "bg-amber-50 text-amber-700"
    : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${classes}`}
    >
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

function LoadingList() {
  return (
    <div className="space-y-4 p-5">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />

          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-lg font-bold text-slate-400">
        —
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

function OverviewItem({ label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
    >
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {Number(value).toLocaleString("en-IN")}
      </p>
    </button>
  );
}
