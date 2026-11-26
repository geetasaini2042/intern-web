import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  FolderKanban,
  FileText,
  Megaphone,
  Award,
  UserRound,
  ArrowUpRight,
  ArrowRight,
  Clock3,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  BriefcaseBusiness,
  Bell,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

import { API_BASE } from "./lib/api";

const API_ENDPOINT = `${API_BASE}/intern/dashboard`;

const quickLinks = [
  {
    title: "My Skills",
    description: "Explore your technical and professional skills",
    icon: GraduationCap,
    path: "/dash/skills",
    color: "blue",
  },
  {
    title: "My Projects",
    description: "View projects and milestones",
    icon: FolderKanban,
    path: "/dash/projects",
    color: "violet",
  },
  {
    title: "Submit Daily Report",
    description: "Update your internship activity log",
    icon: FileText,
    path: "/dash/logbook",
    color: "emerald",
  },
  {
    title: "Training Materials",
    description: "Continue your learning journey",
    icon: BookOpen,
    path: "/dash/training",
    color: "amber",
  },
];

const colorStyles = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

function getToken() {
  return (
    localStorage.getItem("intern_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getInitials(name = "Intern") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {value}
          </h3>
          <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        </div>

        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          {action}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState("");

  const [intern, setIntern] = useState({
    name: "Intern",
    email: "",
    domain: "Internship",
    designation: "Intern",
    avatar: "",
  });

  const [stats, setStats] = useState({
    progress: 0,
    completedDays: 0,
    totalDays: 0,
    attendance: 0,
    completedTasks: 0,
    totalTasks: 0,
    pendingTasks: 0,
  });

  const [tasks, setTasks] = useState([]);
  const [skills, setSkills] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setApiError("");

    try {
      const token = getToken();

      const response = await fetch(API_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please login again."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Dashboard API endpoint not found. Please configure the correct API endpoint."
          );
        }

        throw new Error(`API request failed (${response.status})`);
      }

      const result = await response.json();
      const dashboard = result.dashboard || result.data || result;

      const profile = dashboard.intern || dashboard.profile || {};

      setIntern({
        name:
          profile.name ||
          profile.full_name ||
          dashboard.name ||
          "Intern",
        email: profile.email || dashboard.email || "",
        domain:
          profile.domain ||
          profile.internship_domain ||
          dashboard.domain ||
          "Internship",
        designation: profile.designation || profile.role || "Intern",
        avatar: profile.avatar || profile.photo || "",
      });

      const overview = dashboard.stats || dashboard.overview || {};

      const completedDays = Number(
        overview.completed_days ??
        dashboard.completed_days ??
        0
      );

      const totalDays = Number(
        overview.total_days ??
        dashboard.total_days ??
        0
      );

      const progress = Number(
        overview.progress ??
        dashboard.progress ??
        (totalDays ? (completedDays / totalDays) * 100 : 0)
      );

      const attendance = Number(
        overview.attendance ??
        overview.attendance_percentage ??
        dashboard.attendance_percentage ??
        0
      );

      const completedTasks = Number(
        overview.completed_tasks ??
        dashboard.completed_tasks ??
        0
      );

      const totalTasks = Number(
        overview.total_tasks ??
        dashboard.total_tasks ??
        0
      );

      const pendingTasks = Number(
        overview.pending_tasks ??
        dashboard.pending_tasks ??
        Math.max(totalTasks - completedTasks, 0)
      );

      setStats({
        progress: Math.min(Math.max(progress, 0), 100),
        completedDays,
        totalDays,
        attendance,
        completedTasks,
        totalTasks,
        pendingTasks,
      });

      setTasks(
        Array.isArray(dashboard.tasks)
          ? dashboard.tasks
          : Array.isArray(dashboard.recent_tasks)
          ? dashboard.recent_tasks
          : []
      );

      setSkills(
        Array.isArray(dashboard.skills)
          ? dashboard.skills
          : Array.isArray(profile.skills)
          ? profile.skills
          : []
      );

      setAnnouncements(
        Array.isArray(dashboard.announcements)
          ? dashboard.announcements
          : []
      );

    } catch (error) {
      console.error("Dashboard API error:", error);
      setApiError(error.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const rememberedEmail = localStorage.getItem("intern_email");

    if (rememberedEmail) {
      setIntern((previous) => ({
        ...previous,
        email: previous.email || rememberedEmail,
      }));
    }
  }, []);

  const goTo = (path) => navigate(path);

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const completedTask = (task) =>
    ["completed", "complete", "done"].includes(
      String(task.status || "").toLowerCase()
    );

  const taskTitle = (task) =>
    task.title || task.name || task.task_name || "Untitled task";

  const taskStatus = (task) => task.status || "Pending";

  const taskDeadline = (task) =>
    task.deadline || task.due_date || task.date || "";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">

      <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1500px] mx-auto">

        {/* Welcome */}
        <section className="mb-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">
                {greeting},
              </p>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {intern.name}
              </h1>

              <p className="text-sm text-slate-500 mt-2">
                Here's what's happening with your internship today.
              </p>
            </div>

            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </section>

        {/* API Error */}
        {apiError && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle size={20} className="text-amber-600 shrink-0" />

            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Unable to load live dashboard data
              </p>
              <p className="text-xs text-amber-800 mt-1">
                {apiError}
              </p>
            </div>

            <button
              onClick={() => fetchDashboard(true)}
              className="text-xs font-semibold text-amber-900 border border-amber-300 rounded-lg px-3 py-2 hover:bg-amber-100"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 size={22} className="animate-spin text-blue-600" />
              <span className="text-sm">
                Loading your dashboard...
              </span>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
              <StatCard
                title="Internship Progress"
                value={`${Math.round(stats.progress)}%`}
                subtitle={
                  stats.totalDays
                    ? `${stats.completedDays} of ${stats.totalDays} days completed`
                    : "Progress overview"
                }
                icon={BriefcaseBusiness}
                color="bg-blue-50 text-blue-600"
              />

              <StatCard
                title="Attendance"
                value={`${stats.attendance}%`}
                subtitle="Overall attendance"
                icon={CalendarCheck}
                color="bg-emerald-50 text-emerald-600"
              />

              <StatCard
                title="Tasks Completed"
                value={`${stats.completedTasks}/${stats.totalTasks}`}
                subtitle="Your assigned tasks"
                icon={CheckCircle2}
                color="bg-violet-50 text-violet-600"
              />

              <StatCard
                title="Pending Tasks"
                value={stats.pendingTasks}
                subtitle="Tasks awaiting completion"
                icon={Clock3}
                color="bg-amber-50 text-amber-600"
              />
            </section>

            {/* Progress + Tasks */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-7">

              {/* Progress Card */}
              <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <SectionHeading
                  title="Internship Progress"
                  subtitle="Your overall journey"
                />

                <div className="mt-6 flex justify-center">
                  <div className="relative w-40 h-40">
                    <svg
                      viewBox="0 0 160 160"
                      className="w-full h-full -rotate-90"
                    >
                      <circle
                        cx="80"
                        cy="80"
                        r="66"
                        fill="none"
                        stroke="#e9eef5"
                        strokeWidth="12"
                      />

                      <circle
                        cx="80"
                        cy="80"
                        r="66"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 66}`}
                        strokeDashoffset={
                          2 * Math.PI * 66 *
                          (1 - stats.progress / 100)
                        }
                        className="transition-all duration-700"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">
                        {Math.round(stats.progress)}%
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    {stats.completedDays} / {stats.totalDays || "—"} Days
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Internship duration
                  </p>
                </div>

                <button
                  onClick={() => goTo("/dash/attendance")}
                  className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition-colors"
                >
                  View attendance
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Tasks */}
              <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <SectionHeading
                  title="Recent Tasks"
                  subtitle="Keep track of your assignments"
                  action="View all"
                  onAction={() => goTo("/dash/tasks")}
                />

                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                      <ClipboardList size={22} className="text-slate-400" />
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      No tasks available
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Your assignments will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tasks.slice(0, 5).map((task, index) => (
                      <div
                        key={task.id || task._id || index}
                        className="py-4 flex items-center gap-3"
                      >
                        <div className="shrink-0">
                          {completedTask(task) ? (
                            <CheckCircle2
                              size={19}
                              className="text-emerald-500"
                            />
                          ) : (
                            <Circle
                              size={19}
                              className="text-slate-300"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {taskTitle(task)}
                          </p>

                          {taskDeadline(task) && (
                            <p className="text-xs text-slate-500 mt-1">
                              Due: {taskDeadline(task)}
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${
                            completedTask(task)
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {taskStatus(task)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Quick Access */}
            <section className="mb-7">
              <SectionHeading
                title="Quick Access"
                subtitle="Continue where you left off"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {quickLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorStyles[item.color]}`}>
                          <Icon size={21} />
                        </div>

                        <ArrowUpRight
                          size={17}
                          className="text-slate-300 group-hover:text-blue-600 transition-colors"
                        />
                      </div>

                      <h3 className="font-semibold text-sm text-slate-900 mt-4">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 leading-5">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Skills */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm mb-7">
              <SectionHeading
                title="My Skills"
                subtitle="Skills you're developing during your internship"
                action="View all Skills"
                onAction={() => goTo("/dash/skills")}
              />

              {skills.length === 0 ? (
                <div className="py-8 text-center">
                  <GraduationCap
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="text-sm font-semibold text-slate-700 mt-3">
                    Skills not added yet
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Your skill profile will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.slice(0, 6).map((skill, index) => {
                    const name =
                      typeof skill === "string"
                        ? skill
                        : skill.name || skill.title || "Skill";

                    const level =
                      typeof skill === "object"
                        ? Number(skill.progress || skill.level || 0)
                        : 0;

                    return (
                      <div
                        key={skill.id || skill._id || index}
                        className="border border-slate-100 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {name}
                          </p>

                          {level > 0 && (
                            <span className="text-xs font-medium text-blue-600">
                              {level}%
                            </span>
                          )}
                        </div>

                        {level > 0 && (
                          <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${Math.min(level, 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Announcements */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm mb-7">
              <SectionHeading
                title="Announcements"
                subtitle="Latest updates from your organization"
                action="View all"
                onAction={() => goTo("/dash/announcements")}
              />

              {announcements.length === 0 ? (
                <div className="py-8 text-center">
                  <Megaphone
                    size={26}
                    className="mx-auto text-slate-300"
                  />

                  <p className="text-sm font-semibold text-slate-700 mt-3">
                    No announcements
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Important updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 4).map((announcement, index) => {
                    const announcementId =
                      announcement.id || announcement._id;

                    return (
                      <button
                        key={announcementId || index}
                        onClick={() => {
                          if (announcementId) {
                            goTo(`/dash/announcements/${announcementId}`);
                          } else {
                            goTo("/dash/announcements");
                          }
                        }}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Megaphone size={17} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {announcement.title ||
                              announcement.heading ||
                              "Announcement"}
                          </p>

                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {announcement.message ||
                              announcement.description ||
                              announcement.content ||
                              ""}
                          </p>

                          {announcement.date && (
                            <p className="text-[10px] text-slate-400 mt-2">
                              {announcement.date}
                            </p>
                          )}
                        </div>

                        <ChevronRight
                          size={17}
                          className="text-slate-400 mt-1"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Bottom Info */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

              {/* Profile Card */}
              <div className="bg-[#101b35] rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      size={22}
                      className="text-blue-400"
                    />

                    <h3 className="font-semibold text-sm">
                      Internship Profile
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 mt-3">
                    Your internship information
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-400">Domain</span>
                      <span className="text-slate-200 font-medium text-right">
                        {intern.domain}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-400">Designation</span>
                      <span className="text-slate-200 font-medium">
                        {intern.designation}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-400">Email</span>
                      <span className="text-slate-200 font-medium truncate">
                        {intern.email || "—"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => goTo("/dash/profile")}
                    className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    View profile
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Certificate Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award size={22} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">
                      Internship Certificate
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Your completion certificate
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-5 mt-4">
                  Complete your internship requirements to become eligible
                  for your official certificate.
                </p>

                <button
                  onClick={() => goTo("/dash/certificates")}
                  className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  View certificates
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 pt-5 pb-3 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-[11px] text-slate-400 text-center">
                © {new Date().getFullYear()} Singodiya Technologies
              </p>

              <button
                onClick={() => goTo("/dash/help")}
                className="text-[11px] text-slate-500 hover:text-blue-600"
              >
                Help & Support
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;