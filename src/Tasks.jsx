
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "./lib/api";
import {
  Search,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  BookOpen,
  RefreshCw,
  Trophy,
  X,
  Filter,
  ListTodo
} from "lucide-react";

const getTasks = (res) => {
  if (Array.isArray(res)) return res;
  return res?.tasks || res?.data?.tasks || res?.data || [];
};

const taskId = (task) => task?.id || task?._id || task?.task_id;

const taskTitle = (task) => task?.title || "Untitled Task";

const taskDescription = (task) =>
  task?.description || task?.instructions || "No description available.";

const taskSubject = (task) =>
  task?.program_name ||
  task?.batch_name ||
  task?.category ||
  task?.task_type ||
  "Assignment";

const taskStatus = (task) => {
  const status = String(
    task?.student_status || task?.status || "pending"
  ).toLowerCase().replace(/\s+/g, "_");

  if (status === "approved" || status === "graded") return "completed";
  if (status === "submitted") return "submitted";
  if (status === "completed") return "completed";
  if (status === "in_progress" || status === "inprogress") return "in_progress";

  const due = task?.due_date;
  if (due && new Date(due).getTime() < Date.now()) {
    return "overdue";
  }

  const start = task?.start_date;
  if (start && new Date(start).getTime() > Date.now()) {
    return "upcoming";
  }

  return "pending";
};

const dateFormat = (value) => {
  if (!value) return "No deadline";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "No deadline";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const remainingTime = (value) => {
  if (!value) return "No deadline";

  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Deadline passed";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  if (days > 0) return `${days} days ${hours} hours remaining`;
  if (hours > 0) return `${hours} hours remaining`;

  const minutes = Math.max(1, Math.floor(diff / 60000));
  return `${minutes} minutes remaining`;
};

const statusStyles = {
  pending: {
    label: "Pending",
    color: "#b7791f",
    bg: "#fff7e6"
  },
  in_progress: {
    label: "In Progress",
    color: "#2563eb",
    bg: "#eff6ff"
  },
  submitted: {
    label: "Submitted",
    color: "#0284c7",
    bg: "#eaf7ff"
  },
  completed: {
    label: "Completed",
    color: "#15803d",
    bg: "#eaf8ef"
  },
  overdue: {
    label: "Overdue",
    color: "#dc2626",
    bg: "#fff0f0"
  },
  upcoming: {
    label: "Upcoming",
    color: "#7c3aed",
    bg: "#f5f0ff"
  }
};

function TaskCard({ task, onClick }) {
  const status = taskStatus(task);
  const style = statusStyles[status] || statusStyles.pending;
  const deadline = task.due_date;
  const marks = task.max_marks;
  const progress = Number(task.progress || 0);

  return (
    <article className="task-card" onClick={onClick}>
      <div className="task-card-top">
        <span className="task-category">
          <BookOpen size={14} />
          {taskSubject(task)}
        </span>

        <span
          className="task-status"
          style={{
            color: style.color,
            background: style.bg
          }}
        >
          <span className="task-status-dot" />
          {style.label}
        </span>
      </div>

      <h3>{taskTitle(task)}</h3>

      <p className="task-description">
        {taskDescription(task)}
      </p>

      <div className="task-meta">
        <div>
          <CalendarDays size={15} />
          <span>{dateFormat(deadline)}</span>
        </div>

        {marks !== null && marks !== undefined && (
          <div>
            <Trophy size={15} />
            <span>{marks} Marks</span>
          </div>
        )}
      </div>

      {status === "pending" && deadline && (
        <div className="task-deadline">
          <Clock size={14} />
          {remainingTime(deadline)}
        </div>
      )}

      {status === "overdue" && (
        <div className="task-deadline overdue">
          <AlertCircle size={14} />
          Deadline has passed
        </div>
      )}

      {status === "submitted" && (
        <div className="task-deadline submitted">
          <CheckCircle2 size={14} />
          Submission received
        </div>
      )}

      {status === "completed" && (
        <div className="task-deadline completed">
          <Trophy size={14} />
          Task completed
        </div>
      )}

      {status === "in_progress" && (
        <div className="task-progress-wrap">
          <div className="task-progress-info">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>

          <div className="task-progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="task-card-footer">
        <span>
          {status === "submitted"
            ? "View submission"
            : status === "completed"
            ? "View task"
            : "Open task"}
        </span>

        <ArrowRight size={17} />
      </div>
    </article>
  );
}

export default function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("deadline");

  const loadTasks = async (showLoading = true) => {
    try {
      setError("");

      if (showLoading) setLoading(true);

      const response = await apiGet("/intern/tasks");
      setTasks(getTasks(response));
    } catch (e) {
      console.error("Tasks API error:", e);
      setError(e?.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    loadTasks(false);
  };

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(t =>
        ["pending", "in_progress"].includes(taskStatus(t))
      ).length,
      submitted: tasks.filter(t => taskStatus(t) === "submitted").length,
      completed: tasks.filter(t => taskStatus(t) === "completed").length,
      overdue: tasks.filter(t => taskStatus(t) === "overdue").length
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];

    if (filter !== "all") {
      list = list.filter(t => taskStatus(t) === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();

      list = list.filter(t =>
        [
          task.title,
          task.description,
          task.instructions,
          task.category,
          task.task_type,
          task.program_name,
          task.batch_name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (sort === "deadline") {
      list.sort((a, b) => {
        const da = a.due_date
          ? new Date(a.due_date).getTime()
          : Infinity;

        const db = b.due_date
          ? new Date(b.due_date).getTime()
          : Infinity;

        return da - db;
      });
    } else if (sort === "newest") {
      list.sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    } else if (sort === "oldest") {
      list.sort((a, b) =>
        new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
    }

    return list;
  }, [tasks, filter, search, sort]);

  const openTask = (task) => {
    const id = taskId(task);
    if (!id) return;

    navigate(`/dash/tasks/${id}`);
  };

  const filters = [
    { key: "all", label: "All Tasks", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "in_progress", label: "In Progress", count: tasks.filter(t => taskStatus(t) === "in_progress").length },
    { key: "submitted", label: "Submitted", count: stats.submitted },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "overdue", label: "Overdue", count: stats.overdue }
  ];

  const completion = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="tasks-page">
      <style>{`
        .tasks-page {
          min-height: 100vh;
          background: #f7f8fc;
          color: #202938;
          padding: 28px;
          font-family: Inter, system-ui, sans-serif;
        }

        .tasks-page * {
          box-sizing: border-box;
        }

        .tasks-container {
          max-width: 1250px;
          margin: auto;
        }

        .tasks-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 26px;
        }

        .tasks-header h1 {
          margin: 0 0 8px;
          font-size: 29px;
          font-weight: 750;
          letter-spacing: -0.7px;
          color: #172033;
        }

        .tasks-header p {
          margin: 0;
          font-size: 14px;
          color: #758096;
        }

        .tasks-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 14px;
          border: 1px solid #e1e5ee;
          background: #fff;
          border-radius: 10px;
          color: #344054;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }

        .tasks-refresh:hover {
          background: #f1f4f9;
        }

        .tasks-refresh:disabled {
          opacity: .6;
          cursor: wait;
        }

        .tasks-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 23px;
        }

        .tasks-stat {
          background: #fff;
          border: 1px solid #e8ebf2;
          border-radius: 14px;
          padding: 19px;
          box-shadow: 0 2px 7px rgba(20,30,50,.025);
        }

        .tasks-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .tasks-stat-label {
          color: #758096;
          font-size: 12px;
          font-weight: 600;
        }

        .tasks-stat-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
        }

        .tasks-stat-value {
          font-size: 27px;
          font-weight: 750;
          color: #202938;
        }

        .tasks-stat-sub {
          margin-top: 5px;
          color: #98a1b2;
          font-size: 11px;
        }

        .tasks-completion {
          background: #fff;
          border: 1px solid #e8ebf2;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .tasks-completion-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 650;
        }

        .tasks-completion-head span:last-child {
          color: #5b67d8;
        }

        .tasks-completion-track {
          height: 8px;
          border-radius: 20px;
          background: #edf0f6;
          overflow: hidden;
        }

        .tasks-completion-fill {
          height: 100%;
          background: #6475e8;
          border-radius: 20px;
          transition: width .3s;
        }

        .tasks-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .tasks-search {
          position: relative;
          flex: 1;
          max-width: 380px;
          min-width: 200px;
        }

        .tasks-search input {
          width: 100%;
          height: 44px;
          background: #fff;
          border: 1px solid #e1e5ee;
          border-radius: 10px;
          outline: none;
          padding: 0 38px;
          color: #202938;
          font-size: 13px;
        }

        .tasks-search input:focus {
          border-color: #8995ee;
          box-shadow: 0 0 0 3px rgba(100,117,232,.08);
        }

        .tasks-search input::placeholder {
          color: #9ba4b3;
        }

        .tasks-search-icon {
          position: absolute;
          left: 13px;
          top: 14px;
          color: #97a0af;
        }

        .tasks-clear {
          position: absolute;
          right: 11px;
          top: 12px;
          background: none;
          border: 0;
          color: #8b95a5;
          cursor: pointer;
        }

        .tasks-sort {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 44px;
          background: #fff;
          border: 1px solid #e1e5ee;
          border-radius: 10px;
          padding: 0 12px;
          color: #758096;
          font-size: 13px;
        }

        .tasks-sort select {
          background: transparent;
          color: #344054;
          border: 0;
          outline: 0;
          cursor: pointer;
          font-size: 13px;
        }

        .tasks-sort select option {
          background: #fff;
        }

        .tasks-filters {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 5px;
          margin-bottom: 19px;
        }

        .tasks-filter {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          background: #fff;
          border: 1px solid #e3e7ef;
          color: #687387;
          border-radius: 9px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .tasks-filter:hover {
          background: #f3f5fa;
        }

        .tasks-filter.active {
          background: #eef0ff;
          border-color: #c9ceff;
          color: #505fce;
        }

        .tasks-filter-count {
          background: #f0f2f7;
          color: #778196;
          min-width: 19px;
          height: 19px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          font-size: 10px;
        }

        .tasks-filter.active .tasks-filter-count {
          background: #dfe3ff;
          color: #505fce;
        }

        .tasks-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .task-card {
          background: #fff;
          border: 1px solid #e7eaf1;
          border-radius: 14px;
          padding: 19px;
          cursor: pointer;
          transition: .2s ease;
          box-shadow: 0 2px 6px rgba(20,30,50,.025);
        }

        .task-card:hover {
          border-color: #c5cbf7;
          box-shadow: 0 7px 20px rgba(43,55,100,.07);
          transform: translateY(-2px);
        }

        .task-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }

        .task-category {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #5969ce;
          background: #f0f2ff;
          border: 1px solid #e3e6ff;
          padding: 6px 9px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 600;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .task-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
        }

        .task-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .task-card h3 {
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 8px;
          font-weight: 700;
          color: #202938;
          word-break: break-word;
        }

        .task-description {
          font-size: 12px;
          color: #7b8597;
          line-height: 1.7;
          margin: 0;
          min-height: 40px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .task-meta {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .task-meta div {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: #778196;
        }

        .task-meta svg {
          color: #98a2b3;
        }

        .task-deadline {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 13px;
          font-size: 11px;
          color: #b7791f;
        }

        .task-deadline.overdue {
          color: #dc2626;
        }

        .task-deadline.submitted {
          color: #0284c7;
        }

        .task-deadline.completed {
          color: #15803d;
        }

        .task-progress-wrap {
          margin-top: 15px;
        }

        .task-progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #758096;
          margin-bottom: 7px;
        }

        .task-progress-bar {
          height: 6px;
          background: #edf0f6;
          border-radius: 20px;
          overflow: hidden;
        }

        .task-progress-bar div {
          height: 100%;
          background: #6480e8;
          border-radius: 20px;
        }

        .task-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #edf0f5;
          margin-top: 17px;
          padding-top: 14px;
          color: #5969ce;
          font-size: 12px;
          font-weight: 650;
        }

        .task-card-footer svg {
          transition: transform .2s;
        }

        .task-card:hover .task-card-footer svg {
          transform: translateX(4px);
        }

        .tasks-empty {
          background: #fff;
          border: 1px dashed #dce1eb;
          border-radius: 14px;
          padding: 55px 20px;
          text-align: center;
        }

        .tasks-empty-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f2ff;
          border-radius: 15px;
          color: #6675dc;
        }

        .tasks-empty h3 {
          font-size: 16px;
          margin: 0 0 8px;
          color: #344054;
        }

        .tasks-empty p {
          font-size: 13px;
          color: #8b95a5;
          margin: 0;
        }

        .tasks-error {
          padding: 14px;
          background: #fff1f1;
          border: 1px solid #ffdada;
          border-radius: 10px;
          color: #c24141;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .tasks-error button {
          background: #fff;
          border: 1px solid #f2caca;
          border-radius: 7px;
          padding: 7px 11px;
          color: #b33c3c;
          cursor: pointer;
        }

        .tasks-loading {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .tasks-skeleton {
          height: 230px;
          background: linear-gradient(
            90deg,
            #fff 25%,
            #f0f2f7 50%,
            #fff 75%
          );
          background-size: 200% 100%;
          border: 1px solid #e8ebf2;
          border-radius: 14px;
          animation: tasks-shimmer 1.4s infinite;
        }

        @keyframes tasks-shimmer {
          to { background-position: -200% 0; }
        }

        .tasks-result-count {
          font-size: 12px;
          color: #8b95a5;
          margin-bottom: 13px;
        }

        @media (max-width: 900px) {
          .tasks-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .tasks-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .tasks-page {
            padding: 17px 13px;
          }

          .tasks-header h1 {
            font-size: 24px;
          }

          .tasks-header p {
            font-size: 12px;
            line-height: 1.6;
          }

          .tasks-refresh {
            width: 42px;
            padding: 0;
            justify-content: center;
            font-size: 0;
          }

          .tasks-stats {
            gap: 10px;
          }

          .tasks-stat {
            padding: 14px;
          }

          .tasks-stat-value {
            font-size: 23px;
          }

          .tasks-completion {
            padding: 16px;
          }

          .tasks-toolbar {
            align-items: stretch;
          }

          .tasks-search {
            max-width: none;
            width: 100%;
          }

          .tasks-sort {
            width: 100%;
            justify-content: space-between;
          }

          .tasks-card {
            padding: 15px;
          }

          .tasks-loading {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="tasks-container">

        <header className="tasks-header">
          <div>
            <h1>My Tasks</h1>
            <p>Manage assignments, track progress and submit your work.</p>
          </div>

          <button
            className="tasks-refresh"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="tasks-stats">

          <div className="tasks-stat">
            <div className="tasks-stat-top">
              <span className="tasks-stat-label">Total Tasks</span>
              <div className="tasks-stat-icon" style={{ background: "#eef0ff", color: "#6675dc" }}>
                <ClipboardList size={17} />
              </div>
            </div>
            <div className="tasks-stat-value">{stats.total}</div>
            <div className="tasks-stat-sub">Assigned to you</div>
          </div>

          <div className="tasks-stat">
            <div className="tasks-stat-top">
              <span className="tasks-stat-label">Pending</span>
              <div className="tasks-stat-icon" style={{ background: "#fff6e8", color: "#d99024" }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="tasks-stat-value">{stats.pending}</div>
            <div className="tasks-stat-sub">To be completed</div>
          </div>

          <div className="tasks-stat">
            <div className="tasks-stat-top">
              <span className="tasks-stat-label">Submitted</span>
              <div className="tasks-stat-icon" style={{ background: "#eaf7ff", color: "#1591cf" }}>
                <ClipboardList size={17} />
              </div>
            </div>
            <div className="tasks-stat-value">{stats.submitted}</div>
            <div className="tasks-stat-sub">Awaiting evaluation</div>
          </div>

          <div className="tasks-stat">
            <div className="tasks-stat-top">
              <span className="tasks-stat-label">Completed</span>
              <div className="tasks-stat-icon" style={{ background: "#eaf8ef", color: "#219653" }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="tasks-stat-value">{stats.completed}</div>
            <div className="tasks-stat-sub">Successfully completed</div>
          </div>

        </section>

        <section className="tasks-completion">
          <div className="tasks-completion-head">
            <span>Task Completion</span>
            <span>{completion}%</span>
          </div>

          <div className="tasks-completion-track">
            <div
              className="tasks-completion-fill"
              style={{ width: `${completion}%` }}
            />
          </div>
        </section>

        {error && (
          <div className="tasks-error">
            <span>{error}</span>
            <button onClick={() => loadTasks()}>Retry</button>
          </div>
        )}

        <div className="tasks-toolbar">
          <div className="tasks-search">
            <Search size={16} className="tasks-search-icon" />

            <input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button className="tasks-clear" onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="tasks-sort">
            <Filter size={15} />
            <span>Sort by</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="deadline">Deadline</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        <div className="tasks-filters">
          {filters.map(item => (
            <button
              key={item.key}
              className={`tasks-filter ${filter === item.key ? "active" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              <span className="tasks-filter-count">{item.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="tasks-loading">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="tasks-skeleton" />
            ))}
          </div>
        ) : filtered.length ? (
          <>
            <div className="tasks-result-count">
              Showing {filtered.length} of {tasks.length} tasks
            </div>

            <div className="tasks-grid">
              {filtered.map((task, index) => (
                <TaskCard
                  key={taskId(task) || index}
                  task={task}
                  onClick={() => openTask(task)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="tasks-empty">
            <div className="tasks-empty-icon">
              <ListTodo size={25} />
            </div>

            <h3>
              {search || filter !== "all"
                ? "No matching tasks"
                : "No tasks assigned"}
            </h3>

            <p>
              {search || filter !== "all"
                ? "Try changing the search or filter."
                : "Tasks assigned to you will appear here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
