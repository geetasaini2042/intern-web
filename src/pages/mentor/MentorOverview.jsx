import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Layers,
  ClipboardCheck,
  BookOpen,
  RefreshCw,
  ArrowRight,
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderKanban,
  UserCheck
} from "lucide-react";
import { API } from "../../lib/api";

const EMPTY_OVERVIEW = {
  mentor: {},
  stats: {
    total_batches: 0,
    active_batches: 0,
    total_students: 0,
    pending_tasks: 0,
    pending_logbooks: 0,
    today_attendance: 0
  },
  batches: [],
  pending_submissions: [],
  recent_logbooks: []
};

function getMentorToken() {
  return localStorage.getItem("mentor_token") || "";
}

function getStoredMentor() {
  try {
    const raw = localStorage.getItem("mentor_profile");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function MentorOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const storedMentor = getStoredMentor();

  const fetchOverview = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`${API}/mentor/overview`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.detail || json.message || "Unable to load mentor overview.");
      }

      setData({
        mentor: json.mentor || storedMentor,
        stats: { ...EMPTY_OVERVIEW.stats, ...(json.stats || {}) },
        batches: Array.isArray(json.batches) ? json.batches : [],
        pending_submissions: Array.isArray(json.pending_submissions)
          ? json.pending_submissions
          : [],
        recent_logbooks: Array.isArray(json.recent_logbooks)
          ? json.recent_logbooks
          : []
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const mentor = data.mentor?.name ? data.mentor : storedMentor;
  const mentorName = mentor?.name || mentor?.full_name || "Mentor";
  const stats = data.stats;

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading mentor workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-[#101b35] via-[#172554] to-[#1e3a8a] p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
              <CalendarDays size={13} />
              {todayLabel}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {mentorName}
            </h2>
            <p className="mt-1.5 text-sm text-blue-100/80">
              {mentor?.designation || "Internship Mentor"}
              {mentor?.domain ? ` · ${mentor.domain}` : ""}
            </p>
          </div>

          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60 sm:self-center"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchOverview(true)}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Batches"
          value={stats.total_batches}
          subtext={`${stats.active_batches} active`}
          icon={Layers}
          tone="indigo"
          onClick={() => navigate("/mentor/batches")}
        />
        <StatCard
          title="Total Students"
          value={stats.total_students}
          subtext="Across your batches"
          icon={Users}
          tone="blue"
          onClick={() => navigate("/mentor/students")}
        />
        <StatCard
          title="Pending Task Reviews"
          value={stats.pending_tasks}
          subtext="Awaiting evaluation"
          icon={ClipboardCheck}
          tone="amber"
          onClick={() => navigate("/mentor/tasks")}
        />
        <StatCard
          title="Pending Logbooks"
          value={stats.pending_logbooks}
          subtext="Needs verification"
          icon={BookOpen}
          tone="emerald"
          onClick={() => navigate("/mentor/logbook")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">Assigned Batches</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Batches currently under your mentorship
                </p>
              </div>
              <button
                onClick={() => navigate("/mentor/batches")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all
                <ArrowRight size={14} />
              </button>
            </div>

            {data.batches.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Layers className="mx-auto text-slate-300" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  No batches assigned yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Batches assigned to you by the admin will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.batches.slice(0, 5).map((batch) => (
                  <div
                    key={batch.id || batch._id}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {batch.name || "Untitled Batch"}
                        </p>
                        <StatusPill status={batch.status || "active"} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {batch.domain || "General"} · {batch.mode || "Online"}
                        {batch.duration_hours ? ` · ${batch.duration_hours} hrs` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-slate-800">
                          {batch.students_count ?? 0} Students
                        </p>
                        <p className="mt-0.5 text-slate-400">
                          {formatDate(batch.start_date)} – {formatDate(batch.end_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Pending Task Submissions
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Recent student work waiting for your review
                </p>
              </div>
              <button
                onClick={() => navigate("/mentor/tasks")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Review all
                <ArrowRight size={14} />
              </button>
            </div>

            {data.pending_submissions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CheckCircle2 className="mx-auto text-emerald-400" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  All caught up
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  No pending task submissions right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.pending_submissions.slice(0, 6).map((item) => (
                  <div
                    key={item.id || item._id}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.task_title || "Task Submission"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.student_name || "Student"}
                        {item.batch ? ` · ${item.batch}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock3 size={13} />
                        {formatDate(item.submitted_at)}
                      </span>
                      <button
                        onClick={() => navigate("/mentor/tasks")}
                        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            <p className="mt-1 text-xs text-slate-500">
              Jump directly to your daily mentoring tasks
            </p>

            <div className="mt-4 space-y-2.5">
              <QuickActionButton
                icon={ClipboardCheck}
                label="Evaluate Task Submissions"
                onClick={() => navigate("/mentor/tasks")}
              />
              <QuickActionButton
                icon={BookOpen}
                label="Verify Daily Logbooks"
                onClick={() => navigate("/mentor/logbook")}
              />
              <QuickActionButton
                icon={UserCheck}
                label="Check Student Attendance"
                onClick={() => navigate("/mentor/attendance")}
              />
              <QuickActionButton
                icon={FolderKanban}
                label="Review Student Projects"
                onClick={() => navigate("/mentor/projects")}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Recent Logbooks</h3>
              <button
                onClick={() => navigate("/mentor/logbook")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all
              </button>
            </div>

            {data.recent_logbooks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-500">No recent logbook entries.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recent_logbooks.slice(0, 5).map((entry) => (
                  <div key={entry.id || entry._id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {entry.student_name || "Student"}
                      </p>
                      <StatusPill status={entry.status || "pending"} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {entry.summary || entry.work_done || "Daily logbook entry"}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {formatDate(entry.date || entry.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, icon: Icon, tone, onClick }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600"
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{subtext}</p>
      </div>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          tones[tone] || tones.indigo
        }`}
      >
        <Icon size={20} />
      </div>
    </button>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
    >
      <span className="flex items-center gap-3">
        <Icon size={17} className="text-indigo-600" />
        {label}
      </span>
      <ArrowRight size={15} className="text-slate-400" />
    </button>
  );
}

function StatusPill({ status }) {
  const normalized = String(status).toLowerCase();
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    approved: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    completed: "bg-blue-50 text-blue-700",
    inactive: "bg-slate-100 text-slate-600"
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
        styles[normalized] || styles.inactive
      }`}
    >
      {normalized}
    </span>
  );
}
