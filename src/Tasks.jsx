import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  BookOpen,
  Code2,
  FileText,
  ClipboardList,
  Clock,
  CalendarDays,
  CheckCircle2,
  Circle,
  ArrowRight,
  Play,
  Target,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  ChevronRight,
  Layers3,
  Sparkles
} from "lucide-react";

import { API } from "./lib/api";
const demoTasks = [
  {
    id: "task-1",
    title: "Introduction to Your Internship Domain",
    description: "Understand your internship domain, its scope, tools and practical applications.",
    category: "Learn",
    type: "learning",
    status: "in_progress",
    priority: "high",
    progress: 40,
    due_date: "2026-11-23",
    estimated_time: "2 hours",
    skills: ["Fundamentals", "Industry Overview"],
    lesson_id: "intro-domain"
  },
  {
    id: "task-2",
    title: "Professional Communication",
    description: "Learn professional email writing, workplace communication and collaboration.",
    category: "Learn",
    type: "learning",
    status: "pending",
    priority: "medium",
    progress: 0,
    due_date: "2026-11-25",
    estimated_time: "1.5 hours",
    skills: ["Communication", "Professional Skills"],
    lesson_id: "professional-communication"
  },
  {
    id: "task-3",
    title: "Research & Documentation",
    description: "Learn how to research topics and create structured professional documentation.",
    category: "Learn",
    type: "learning",
    status: "pending",
    priority: "medium",
    progress: 0,
    due_date: "2026-11-27",
    estimated_time: "2 hours",
    skills: ["Research", "Documentation"],
    lesson_id: "research-documentation"
  },
  {
    id: "task-4",
    title: "Complete Domain Fundamentals",
    description: "Complete the foundational learning modules assigned for your internship.",
    category: "Learning Path",
    type: "learning",
    status: "pending",
    priority: "high",
    progress: 0,
    due_date: "2026-11-29",
    estimated_time: "4 hours",
    skills: ["Fundamentals"],
    lesson_id: "domain-fundamentals"
  },
  {
    id: "task-5",
    title: "Prepare Internship Introduction",
    description: "Create a brief introduction covering your background, goals and internship expectations.",
    category: "Assignment",
    type: "assignment",
    status: "pending",
    priority: "low",
    progress: 0,
    due_date: "2026-11-30",
    estimated_time: "1 hour",
    skills: ["Communication"],
    lesson_id: null
  },
  {
    id: "task-6",
    title: "Weekly Progress Report",
    description: "Prepare and submit your weekly progress report to your mentor.",
    category: "Submission",
    type: "submission",
    status: "completed",
    progress: 100,
    priority: "medium",
    due_date: "2026-11-19",
    estimated_time: "30 minutes",
    skills: ["Reporting"],
    lesson_id: null
  },
  {
    id: "task-7",
    title: "Explore Required Tools",
    description: "Familiarize yourself with the essential tools used in your internship domain.",
    category: "Learn",
    type: "learning",
    status: "in_progress",
    progress: 65,
    priority: "medium",
    due_date: "2026-11-26",
    estimated_time: "3 hours",
    skills: ["Tools", "Practical Skills"],
    lesson_id: "required-tools"
  },
  {
    id: "task-8",
    title: "Submit Daily Logbook",
    description: "Update your daily activities and submit your internship logbook entry.",
    category: "Logbook",
    type: "logbook",
    status: "pending",
    progress: 0,
    priority: "high",
    due_date: "2026-11-21",
    estimated_time: "15 minutes",
    skills: ["Documentation"],
    lesson_id: null
  }
];

function getToken() {
  return localStorage.getItem("intern_token") || localStorage.getItem("access_token");
}

function normalizeTasks(data) {
  const list = Array.isArray(data)
    ? data
    : data?.tasks || data?.data?.tasks || data?.data || data?.items || [];

  return list.map((task, index) => ({
    ...task,
    id: task.id || task._id || `task-${index}`,
    title: task.title || task.name || "Untitled Task",
    description: task.description || task.details || "",
    category: task.category || task.type || "General",
    type: task.type || task.category || "assignment",
    status: (task.status || "pending").toLowerCase().replace(/\s+/g, "_"),
    priority: (task.priority || "medium").toLowerCase(),
    progress: Number(task.progress || 0),
    due_date: task.due_date || task.deadline || "",
    estimated_time: task.estimated_time || task.duration || "",
    skills: task.skills || [],
    lesson_id: task.lesson_id || task.learning_id || null
  }));
}

function formatDate(date) {
  if (!date) return "No deadline";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isOverdue(task) {
  if (!task.due_date || task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function getStatus(status) {
  if (status === "completed") {
    return {
      label: "Completed",
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      icon: CheckCircle2
    };
  }

  if (status === "in_progress") {
    return {
      label: "In Progress",
      color: "text-blue-700 bg-blue-50 border-blue-100",
      icon: Play
    };
  }

  return {
    label: "Pending",
    color: "text-slate-600 bg-slate-100 border-slate-200",
    icon: Circle
  };
}

function getPriority(priority) {
  const p = priority?.toLowerCase();

  if (p === "high") return "text-red-600";
  if (p === "low") return "text-slate-500";
  return "text-amber-600";
}

function getTaskIcon(task) {
  const type = (task.type || task.category || "").toLowerCase();

  if (type.includes("learn") || type.includes("lesson")) return BookOpen;
  if (type.includes("project")) return Code2;
  if (type.includes("submission")) return FileText;
  if (type.includes("logbook")) return ClipboardList;

  return Target;
}

function TaskCard({ task, onClick }) {
  const Status = getStatus(task.status);
  const StatusIcon = Status.icon;
  const Icon = getTaskIcon(task);
  const overdue = isOverdue(task);

  return (
    <button
      onClick={() => onClick(task)}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              {task.category}
            </span>

            {task.priority && (
              <span className={`text-[11px] font-semibold ${getPriority(task.priority)}`}>
                {task.priority.toUpperCase()} PRIORITY
              </span>
            )}
          </div>

          <h3 className="mt-2 font-semibold leading-5 text-slate-900 group-hover:text-indigo-700">
            {task.title}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-500">
            {task.description}
          </p>
        </div>

        <ChevronRight
          size={18}
          className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"
        />
      </div>

      {task.status === "in_progress" && task.progress > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Progress</span>
            <span className="font-semibold text-slate-700">{task.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${Math.min(task.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${Status.color}`}>
          <StatusIcon size={13} />
          {Status.label}
        </span>

        <span className={`flex items-center gap-1.5 text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-500"}`}>
          <CalendarDays size={14} />
          {overdue ? "Overdue · " : ""}
          {formatDate(task.due_date)}
        </span>
      </div>

      {task.estimated_time && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <Clock size={13} />
          {task.estimated_time}
        </div>
      )}
    </button>
  );
}

function TaskModal({ task, onClose, onOpenLearn }) {
  if (!task) return null;

  const Status = getStatus(task.status);
  const StatusIcon = Status.icon;
  const Icon = getTaskIcon(task);
  const learnTask = task.type === "learning" || task.category?.toLowerCase().includes("learn");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon size={22} />
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${Status.color}`}>
            <StatusIcon size={13} />
            {Status.label}
          </span>
          <span className={`text-xs font-semibold ${getPriority(task.priority)}`}>
            {task.priority?.toUpperCase()} PRIORITY
          </span>
          {isOverdue(task) && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
              Overdue
            </span>
          )}
        </div>

        <h2 className="mt-3 text-xl font-bold text-slate-900">{task.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{task.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-500">Deadline</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(task.due_date)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-500">Estimated time</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {task.estimated_time || "Not specified"}
            </p>
          </div>
        </div>

        {task.skills?.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-800">Skills covered</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {task.skills.map((skill, index) => (
                <span key={index} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                  {typeof skill === "string" ? skill : skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {task.status === "in_progress" && (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500">Task progress</span>
              <span className="font-semibold text-slate-800">{task.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {learnTask ? (
            <button
              onClick={() => onOpenLearn(task)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <BookOpen size={17} />
              Open Learning
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                if (task.type === "logbook" || task.category?.toLowerCase().includes("logbook")) {
                  window.location.href = "/dash/logbook";
                } else if (task.type === "submission" || task.category?.toLowerCase().includes("submission")) {
                  window.location.href = "/dash/submission";
                } else {
                  window.location.href = "/dash/projects";
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Open Task
              <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/intern/tasks`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!res.ok) throw new Error("Tasks API is not available.");

      const data = await res.json();
      setTasks(normalizeTasks(data));
    } catch (err) {
      setTasks(demoTasks);
      setError("Showing sample tasks. Live task data is not available yet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const overdue = tasks.filter(isOverdue).length;

    return { total: tasks.length, completed, inProgress, pending, overdue };
  }, [tasks]);

  const categories = useMemo(() => {
    return ["all", ...new Set(tasks.map(t => t.category).filter(Boolean))];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        `${task.title} ${task.description} ${task.category}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        task.status === filter ||
        (filter === "overdue" && isOverdue(task));

      const matchesCategory =
        category === "all" || task.category === category;

      return matchesSearch && matchesFilter && matchesCategory;
    });
  }, [tasks, search, filter, category]);

  const openTask = (task) => {
    const isLearn = task.type === "learning" || task.category?.toLowerCase().includes("learn");

    if (isLearn) {
      navigate("/dash/learn", {
        state: {
          taskId: task.id,
          lessonId: task.lesson_id,
          taskTitle: task.title,
          taskDescription: task.description,
          fromTasks: true
        }
      });
      return;
    }

    setSelectedTask(task);
  };

  const openLearnFromModal = (task) => {
    setSelectedTask(null);
    navigate("/dash/learn", {
      state: {
        taskId: task.id,
        lessonId: task.lesson_id,
        taskTitle: task.title,
        taskDescription: task.description,
        fromTasks: true
      }
    });
  };

  const filters = [
    { value: "all", label: "All Tasks" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "overdue", label: "Overdue" }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-5 text-white sm:p-7">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-100">
              <Layers3 size={17} />
              <span className="text-xs font-semibold uppercase tracking-wider">Task Center</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Your Tasks</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
              Stay organized, complete your learning activities and keep your internship progress on track.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-xs text-indigo-100">Overall Completion</p>
              <p className="text-2xl font-bold">
                {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          description="Assigned activities"
          icon={ClipboardList}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          description="Currently working"
          icon={Play}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          description="Successfully finished"
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          description="Past deadline"
          icon={AlertCircle}
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
            />
          </div>

          <div className="relative sm:w-52">
            <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchTasks}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map(item => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                filter === item.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
              {item.value === "all" && (
                <span className="ml-1.5 opacity-75">{stats.total}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-100" />
                <div className="flex-1">
                  <div className="h-3 w-20 rounded bg-slate-100" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                </div>
              </div>
              <div className="mt-6 h-8 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ClipboardList size={25} />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">No tasks found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Try changing your filters or search query.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
              setCategory("all");
            }}
            className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={openTask} />
          ))}
        </div>
      )}

      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onOpenLearn={openLearnFromModal}
      />
    </div>
  );
}
