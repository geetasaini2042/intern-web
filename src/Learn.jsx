
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  PlayCircle,
  Lock,
  GraduationCap,
  ArrowRight,
  ChevronRight,
  Layers3,
  Target,
  RefreshCw,
  FileText,
  Video,
  ExternalLink,
  X,
  Trophy,
  Bookmark,
  CircleDot,
  Loader2
} from "lucide-react";

import { API_BASE } from "./lib/api";

const LEARN_API = `${API_BASE}/intern/learn`;
const PROGRESS_API = `${API_BASE}/intern/learn/progress`;

function getToken() {
  return (
    localStorage.getItem("intern_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getHeaders() {
  const token = getToken();

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function formatDuration(value) {
  if (!value) return "Self-paced";

  if (typeof value === "string") return value;

  const minutes = Number(value);

  if (!Number.isFinite(minutes)) return "Self-paced";

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function getStatus(module) {
  const status = String(module.status || "").toLowerCase();

  if (
    status === "completed" ||
    module.completed === true ||
    module.is_completed === true
  ) {
    return "completed";
  }

  if (
    status === "in_progress" ||
    status === "in-progress" ||
    status === "ongoing" ||
    module.progress > 0
  ) {
    return "in_progress";
  }

  if (
    status === "locked" ||
    module.locked === true ||
    module.is_locked === true
  ) {
    return "locked";
  }

  return "available";
}

function normalizeModule(module, index) {
  const lessons = Array.isArray(module.lessons)
    ? module.lessons
    : Array.isArray(module.content)
    ? module.content
    : [];

  const completedLessons = lessons.filter(
    lesson =>
      lesson.completed === true ||
      lesson.is_completed === true ||
      lesson.status === "completed"
  ).length;

  const calculatedProgress = lessons.length
    ? Math.round((completedLessons / lessons.length) * 100)
    : 0;

  return {
    ...module,
    id: module.id || module.module_id || `module-${index + 1}`,
    title: module.title || module.name || `Module ${index + 1}`,
    description:
      module.description ||
      module.subtitle ||
      "Explore learning materials and complete the activities.",
    order: Number(module.order || module.sequence || index + 1),
    category: module.category || module.skill || "Learning",
    lessons,
    lessonCount:
      module.total_lessons ||
      module.lessons_count ||
      lessons.length,
    duration:
      module.duration ||
      module.estimated_duration ||
      module.duration_minutes,
    progress: Number(module.progress ?? calculatedProgress),
    status: getStatus(module),
    thumbnail: module.thumbnail || module.image || module.cover || "",
    skills: Array.isArray(module.skills) ? module.skills : [],
    assignment: module.assignment || null
  };
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    in_progress: "bg-indigo-50 text-indigo-700 border-indigo-100",
    available: "bg-slate-100 text-slate-600 border-slate-200",
    locked: "bg-amber-50 text-amber-700 border-amber-100"
  };

  const labels = {
    completed: "Completed",
    in_progress: "In Progress",
    available: "Available",
    locked: "Locked"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] || styles.available
      }`}
    >
      {labels[status] || "Available"}
    </span>
  );
}

function ModuleCard({ module, onOpen }) {
  const status = module.status;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-100 sm:h-40">
        {module.thumbnail ? (
          <img
            src={module.thumbnail}
            alt={module.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/70 bg-white/70 text-indigo-500 shadow-sm">
            <BookOpen size={34} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span className="rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 backdrop-blur">
            Module {module.order}
          </span>
        </div>

        {status === "locked" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 backdrop-blur-[1px]">
            <div className="rounded-full bg-white p-3 shadow-lg">
              <Lock size={22} className="text-slate-500" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
            {module.title}
          </h3>
          <StatusBadge status={status} />
        </div>

        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
          {module.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <BookOpen size={14} />
            {module.lessonCount} lessons
          </span>

          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {formatDuration(module.duration)}
          </span>
        </div>

        {status === "in_progress" && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-slate-500">Progress</span>
              <span className="font-medium text-indigo-600">
                {module.progress}%
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(module.progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onOpen(module)}
          disabled={status === "locked"}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            status === "locked"
              ? "cursor-not-allowed bg-slate-100 text-slate-400"
              : status === "completed"
              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "bg-slate-900 text-white hover:bg-indigo-700"
          }`}
        >
          {status === "locked" ? (
            <>
              <Lock size={15} />
              Locked
            </>
          ) : status === "completed" ? (
            <>
              Review Module
              <ArrowRight size={15} />
            </>
          ) : status === "in_progress" ? (
            <>
              Continue Learning
              <ArrowRight size={15} />
            </>
          ) : (
            <>
              Start Learning
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function LessonItem({ lesson, index, onOpen, busy }) {
  const completed =
    lesson.completed === true ||
    lesson.is_completed === true ||
    lesson.status === "completed";

  const type = String(
    lesson.type || lesson.content_type || "reading"
  ).toLowerCase();

  const Icon =
    type.includes("video")
      ? Video
      : type.includes("quiz")
      ? Target
      : type.includes("pdf")
      ? FileText
      : BookOpen;

  return (
    <button
      onClick={() => onOpen(lesson)}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          completed
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {completed ? <CheckCircle2 size={19} /> : <Icon size={19} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">
          {lesson.title || lesson.name || `Lesson ${index + 1}`}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {lesson.duration
            ? formatDuration(lesson.duration)
            : type.replace(/_/g, " ")}
        </p>
      </div>

      {busy ? (
        <Loader2 size={16} className="animate-spin text-indigo-500" />
      ) : completed ? (
        <CheckCircle2 size={17} className="text-emerald-500" />
      ) : (
        <ChevronRight size={17} className="text-slate-400" />
      )}
    </button>
  );
}

export default function Learn() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [student, setStudent] = useState({});
  const [path, setPath] = useState({});
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyLesson, setBusyLesson] = useState("");

  const loadLearn = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(LEARN_API, {
        method: "GET",
        headers: getHeaders()
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.detail || "Unable to load learning data."
        );
      }

      const data =
        result.learning ||
        result.data?.learning ||
        result.data ||
        result;

      const rawModules =
        data.modules ||
        data.learning_path?.modules ||
        data.path?.modules ||
        [];

      const normalized = rawModules
        .map(normalizeModule)
        .sort((a, b) => a.order - b.order);

      setStudent(
        data.student ||
        data.intern ||
        data.profile ||
        result.student ||
        {}
      );

      setPath(
        data.learning_path ||
        data.path ||
        {
          title: data.title || "Your Learning Path",
          description: data.description || ""
        }
      );

      setModules(normalized);

      if (selectedModule) {
        const updatedSelected = normalized.find(
          m => m.id === selectedModule.id
        );

        setSelectedModule(updatedSelected || null);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLearn();
  }, []);

  const completedModules = modules.filter(
    module => module.status === "completed"
  ).length;

  const activeModules = modules.filter(
    module => module.status === "in_progress"
  ).length;

  const totalLessons = modules.reduce(
    (total, module) => total + Number(module.lessonCount || 0),
    0
  );

  const overallProgress = Number(
    path.progress ??
    path.completion_percentage ??
    path.completion ??
    (modules.length
      ? Math.round(
          modules.reduce(
            (total, module) =>
              total +
              (module.status === "completed"
                ? 100
                : module.status === "in_progress"
                ? module.progress
                : 0),
            0
          ) / modules.length
        )
      : 0)
  );

  const filteredModules = useMemo(() => {
    return modules.filter(module => {
      const matchesSearch =
        module.title.toLowerCase().includes(search.toLowerCase()) ||
        module.description.toLowerCase().includes(search.toLowerCase()) ||
        module.category.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        module.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [modules, search, filter]);

  const continueModule =
    modules.find(module => module.status === "in_progress") ||
    modules.find(module => module.status === "available");

  const openLesson = lesson => {
    const url =
      lesson.url ||
      lesson.link ||
      lesson.video_url ||
      lesson.content_url ||
      lesson.pdf_url;

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    if (lesson.route) {
      navigate(lesson.route);
      return;
    }

    if (lesson.content) {
      setSelectedModule(prev => ({
        ...prev,
        activeLesson: lesson
      }));
      return;
    }

    alert("Learning content will be available soon.");
  };

  const markLessonComplete = async lesson => {
    const lessonId = lesson.id || lesson.lesson_id;

    if (!lessonId || busyLesson) return;

    setBusyLesson(String(lessonId));

    try {
      const response = await fetch(PROGRESS_API, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          module_id: selectedModule.id,
          lesson_id: lessonId,
          status: "completed"
        })
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.message ||
          result.detail ||
          "Unable to save progress."
        );
      }

      await loadLearn(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyLesson("");
    }
  };

  const closeModule = () => {
    setSelectedModule(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(item => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(item => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white sm:p-7 lg:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-indigo-200">
              <GraduationCap size={15} />
              Personalized Learning
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {student.name
                ? `Keep growing, ${student.name.split(" ")[0]}`
                : "Your Learning Journey"}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              {path.description ||
                "Build practical skills, complete learning modules and prepare for your internship projects."}
            </p>

            {student.internship_domain && (
              <div className="mt-4 inline-flex rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-200">
                <span className="text-slate-400">Domain:&nbsp;</span>
                {student.internship_domain}
              </div>
            )}

            <button
              onClick={() =>
                continueModule && setSelectedModule(continueModule)
              }
              disabled={!continueModule}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <PlayCircle size={17} />
              {continueModule
                ? continueModule.status === "in_progress"
                  ? "Continue Learning"
                  : "Start Learning"
                : "No modules available"}
              {continueModule && <ArrowRight size={16} />}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Learning Progress</p>
              <Trophy size={18} className="text-amber-300" />
            </div>

            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-bold">
                {overallProgress}%
              </span>
              <span className="pb-1 text-sm text-slate-400">
                completed
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-700"
                style={{
                  width: `${Math.min(
                    Math.max(overallProgress, 0),
                    100
                  )}%`
                }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {completedModules} of {modules.length} modules completed
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Unable to load learning content
              </p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>

            <button
              onClick={() => loadLearn()}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Total Modules"
          value={modules.length}
          description="Assigned learning modules"
        />

        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completedModules}
          description="Successfully completed modules"
        />

        <StatCard
          icon={PlayCircle}
          label="In Progress"
          value={activeModules}
          description="Modules currently being studied"
        />

        <StatCard
          icon={BookOpen}
          label="Total Lessons"
          value={totalLessons}
          description="Lessons available in your path"
        />
      </section>

      {continueModule && (
        <section className="rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <PlayCircle size={26} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                Recommended for you
              </p>

              <h3 className="mt-1 font-semibold text-slate-900">
                {continueModule.title}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {continueModule.description}
              </p>
            </div>

            <button
              onClick={() => setSelectedModule(continueModule)}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Open Module
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Learning Modules
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Explore your assigned courses and learning activities.
            </p>
          </div>

          <button
            onClick={() => loadLearn(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search modules, skills..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ["all", "All Modules"],
              ["in_progress", "In Progress"],
              ["available", "Available"],
              ["completed", "Completed"],
              ["locked", "Locked"]
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  filter === value
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredModules.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <BookOpen
              size={34}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-800">
              {modules.length === 0
                ? "No learning modules assigned yet"
                : "No modules found"}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              {modules.length === 0
                ? "Your mentor or administrator will assign your learning path here."
                : "Try changing your search or filter."}
            </p>

            {modules.length === 0 && (
              <button
                onClick={() => loadLearn(true)}
                className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map(module => (
              <ModuleCard
                key={module.id}
                module={module}
                onOpen={setSelectedModule}
              />
            ))}
          </div>
        )}
      </section>

      {selectedModule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-5">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                  Module {selectedModule.order}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedModule.title}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {selectedModule.description}
                </p>
              </div>

              <button
                onClick={closeModule}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {selectedModule.skills.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Skills Covered
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {selectedModule.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
                      >
                        {typeof skill === "string"
                          ? skill
                          : skill.name || skill.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Lessons & Activities
                </h3>

                <span className="text-xs text-slate-500">
                  {selectedModule.lessons.length} lessons
                </span>
              </div>

              {selectedModule.lessons.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <BookOpen
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Lessons will be added soon
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Your mentor is preparing learning content.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedModule.lessons.map((lesson, index) => (
                    <LessonItem
                      key={lesson.id || lesson.lesson_id || index}
                      lesson={lesson}
                      index={index}
                      onOpen={openLesson}
                      busy={busyLesson === String(lesson.id || lesson.lesson_id)}
                    />
                  ))}
                </div>
              )}

              {selectedModule.activeLesson && (
                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      {selectedModule.activeLesson.title}
                    </h3>

                    <button
                      onClick={() =>
                        setSelectedModule(prev => ({
                          ...prev,
                          activeLesson: null
                        }))
                      }
                      className="rounded-lg p-1 hover:bg-indigo-100"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-slate-700">
                    {selectedModule.activeLesson.content}
                  </div>

                  <button
                    onClick={() =>
                      markLessonComplete(selectedModule.activeLesson)
                    }
                    disabled={busyLesson !== ""}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Mark as Completed
                  </button>
                </div>
              )}

              {selectedModule.assignment && (
                <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-slate-900">
                      Module Assignment
                    </h3>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {selectedModule.assignment.title ||
                      selectedModule.assignment.description ||
                      "Complete the assigned practical task."}
                  </p>

                  {selectedModule.assignment.url && (
                    <a
                      href={selectedModule.assignment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600"
                    >
                      View Assignment
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
              <StatusBadge status={selectedModule.status} />

              <button
                onClick={closeModule}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
