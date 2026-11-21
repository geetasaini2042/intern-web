
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "./lib/api";
import {
  Search,
  Filter,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  BookOpen,
  RefreshCw,
  FileText,
  Trophy,
  X,
  ChevronDown,
  ListTodo
} from "lucide-react";

const getTasksArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getId = (task) => task?._id || task?.id || task?.task_id;

const getTitle = (task) =>
  task?.title || task?.name || task?.task_name || "Untitled Task";

const getDescription = (task) =>
  task?.description || task?.details || task?.instructions || "";

const getDueDate = (task) =>
  task?.due_date || task?.deadline || task?.dueDate || task?.end_date || null;

const getStartDate = (task) =>
  task?.start_date || task?.startDate || task?.available_from || null;

const getSubject = (task) =>
  task?.subject ||
  task?.course ||
  task?.course_name ||
  task?.category ||
  "General";

const getMarks = (task) =>
  task?.total_marks ??
  task?.marks ??
  task?.max_marks ??
  task?.points ??
  null;

const getSubmission = (task) =>
  task?.submission ||
  task?.my_submission ||
  task?.student_submission ||
  null;

const isSubmitted = (task) => {
  const submission = getSubmission(task);

  if (submission) return true;

  return (
    task?.submitted === true ||
    task?.is_submitted === true ||
    task?.status === "submitted" ||
    task?.status === "completed" ||
    task?.status === "graded"
  );
};

const isGraded = (task) =>
  task?.status === "graded" ||
  task?.status === "completed" ||
  task?.graded === true ||
  task?.is_graded === true;

const isOverdue = (task) => {
  const due = getDueDate(task);

  if (!due || isSubmitted(task)) return false;

  return new Date(due).getTime() < Date.now();
};

const formatDate = (date) => {
  if (!date) return "No deadline";

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) return "No deadline";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatTime = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getTimeRemaining = (date) => {
  if (!date) return "No deadline";

  const difference = new Date(date).getTime() - Date.now();

  if (difference <= 0) return "Deadline passed";

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;

  const minutes = Math.floor(difference / (1000 * 60));

  return `${Math.max(minutes, 1)}m remaining`;
};

const getTaskStatus = (task) => {
  if (isGraded(task)) return "graded";
  if (isSubmitted(task)) return "submitted";
  if (isOverdue(task)) return "overdue";

  const startDate = getStartDate(task);

  if (startDate && new Date(startDate).getTime() > Date.now()) {
    return "upcoming";
  }

  return "pending";
};

const statusInfo = {
  pending: {
    label: "Pending",
    color: "#f59e0b",
    background: "rgba(245,158,11,0.10)"
  },
  submitted: {
    label: "Submitted",
    color: "#38bdf8",
    background: "rgba(56,189,248,0.10)"
  },
  graded: {
    label: "Completed",
    color: "#34d399",
    background: "rgba(52,211,153,0.10)"
  },
  overdue: {
    label: "Overdue",
    color: "#f87171",
    background: "rgba(248,113,113,0.10)"
  },
  upcoming: {
    label: "Upcoming",
    color: "#a78bfa",
    background: "rgba(167,139,250,0.10)"
  }
};

const TaskCard = ({ task, onClick }) => {
  const status = getTaskStatus(task);
  const info = statusInfo[status];
  const dueDate = getDueDate(task);
  const marks = getMarks(task);

  return (
    <article className="st-card" onClick={onClick}>
      <div className="st-card-top">
        <div className="st-subject">
          <BookOpen size={14} />
          <span>{getSubject(task)}</span>
        </div>

        <div
          className="st-status"
          style={{
            color: info.color,
            background: info.background
          }}
        >
          <span className="st-status-dot" />
          {info.label}
        </div>
      </div>

      <div className="st-card-content">
        <h3>{getTitle(task)}</h3>

        <p className="st-description">
          {getDescription(task) || "Complete this task and submit your work."}
        </p>
      </div>

      <div className="st-card-meta">
        <div className="st-meta-item">
          <CalendarDays size={15} />
          <span>
            {dueDate ? formatDate(dueDate) : "No deadline"}
          </span>
        </div>

        {marks !== null && marks !== undefined && (
          <div className="st-meta-item">
            <Trophy size={15} />
            <span>{marks} marks</span>
          </div>
        )}
      </div>

      {status === "pending" && dueDate && (
        <div className="st-deadline">
          <Clock size={14} />
          <span>{getTimeRemaining(dueDate)}</span>
        </div>
      )}

      {status === "overdue" && (
        <div className="st-deadline overdue">
          <AlertCircle size={14} />
          <span>Deadline has passed</span>
        </div>
      )}

      {status === "submitted" && (
        <div className="st-deadline submitted">
          <CheckCircle2 size={14} />
          <span>Submission received</span>
        </div>
      )}

      {status === "graded" && (
        <div className="st-deadline graded">
          <Trophy size={14} />
          <span>Task evaluated</span>
        </div>
      )}

      <div className="st-card-footer">
        <span>
          {status === "graded"
            ? "View result"
            : status === "submitted"
            ? "View submission"
            : "Open task"}
        </span>

        <ArrowRight size={17} className="st-arrow" />
      </div>
    </article>
  );
};

export default function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    try {
      setError("");
      setLoading(true);

      const response = await apiGet("/dash/tasks");
      const taskList = getTasksArray(response);

      setTasks(taskList);
    } catch (err) {
      console.error("Tasks loading error:", err);
      setError(err?.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  const refreshTasks = async () => {
    try {
      setRefreshing(true);

      const response = await apiGet("/dash/tasks");
      setTasks(getTasksArray(response));
      setError("");
    } catch (err) {
      console.error("Tasks refresh error:", err);
      setError(err?.message || "Unable to refresh tasks.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;

    const completed = tasks.filter(
      (task) => isGraded(task)
    ).length;

    const submitted = tasks.filter(
      (task) => isSubmitted(task) && !isGraded(task)
    ).length;

    const overdue = tasks.filter(
      (task) => isOverdue(task)
    ).length;

    const pending = tasks.filter(
      (task) =>
        !isSubmitted(task) &&
        !isOverdue(task) &&
        getTaskStatus(task) !== "upcoming"
    ).length;

    return {
      total,
      completed,
      submitted,
      overdue,
      pending
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (filter !== "all") {
      result = result.filter(
        (task) => getTaskStatus(task) === filter
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim();

      result = result.filter((task) => {
        const searchable = [
          getTitle(task),
          getDescription(task),
          getSubject(task),
          task?.teacher,
          task?.instructor
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });
    }

    if (sort === "deadline") {
      result.sort((a, b) => {
        const dateA = getDueDate(a)
          ? new Date(getDueDate(a)).getTime()
          : Infinity;

        const dateB = getDueDate(b)
          ? new Date(getDueDate(b)).getTime()
          : Infinity;

        return dateA - dateB;
      });
    }

    if (sort === "newest") {
      result.sort((a, b) => {
        const dateA = new Date(
          a?.created_at || a?.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b?.created_at || b?.createdAt || 0
        ).getTime();

        return dateB - dateA;
      });
    }

    if (sort === "oldest") {
      result.sort((a, b) => {
        const dateA = new Date(
          a?.created_at || a?.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b?.created_at || b?.createdAt || 0
        ).getTime();

        return dateA - dateB;
      });
    }

    return result;
  }, [tasks, filter, search, sort]);

  const openTask = (task) => {
    const id = getId(task);

    if (!id) {
      console.error("Task ID missing:", task);
      return;
    }

    navigate(`/dash/tasks/${id}`);
  };

  const filters = [
    { id: "all", label: "All Tasks", count: stats.total },
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "submitted", label: "Submitted", count: stats.submitted },
    { id: "graded", label: "Completed", count: stats.completed },
    { id: "overdue", label: "Overdue", count: stats.overdue }
  ];

  const completionPercentage =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  return (
    <div className="student-tasks">
      <style>{`
        .student-tasks {
          min-height: 100vh;
          background: #0b0d12;
          color: #f1f5f9;
          padding: 28px;
          font-family: Inter, system-ui, -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .student-tasks * {
          box-sizing: border-box;
        }

        .st-container {
          max-width: 1250px;
          margin: 0 auto;
        }

        .st-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 28px;
        }

        .st-heading h1 {
          font-size: 29px;
          font-weight: 750;
          margin: 0 0 9px;
          letter-spacing: -0.8px;
        }

        .st-heading p {
          margin: 0;
          color: #8993a5;
          font-size: 14px;
          line-height: 1.6;
        }

        .st-refresh {
          height: 42px;
          padding: 0 14px;
          border: 1px solid #252b36;
          border-radius: 10px;
          background: #141821;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: 0.2s;
        }

        .st-refresh:hover {
          border-color: #5265e8;
          color: #fff;
          background: #1a2030;
        }

        .st-refresh:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .st-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 28px;
        }

        .st-stat {
          background: #12161e;
          border: 1px solid #222834;
          border-radius: 15px;
          padding: 19px;
          min-height: 117px;
        }

        .st-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .st-stat-label {
          font-size: 12px;
          color: #939daf;
          font-weight: 600;
        }

        .st-stat-icon {
          width: 33px;
          height: 33px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
        }

        .st-stat-value {
          font-size: 27px;
          font-weight: 750;
          letter-spacing: -0.6px;
        }

        .st-stat-sub {
          font-size: 11px;
          color: #758093;
          margin-top: 5px;
        }

        .st-progress-card {
          border: 1px solid #252c38;
          border-radius: 15px;
          background: linear-gradient(115deg, #141922, #121720);
          padding: 20px 22px;
          margin-bottom: 28px;
        }

        .st-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 13px;
          gap: 15px;
        }

        .st-progress-title {
          font-size: 14px;
          font-weight: 650;
        }

        .st-progress-value {
          font-size: 13px;
          font-weight: 700;
          color: #a5b4fc;
        }

        .st-progress-track {
          height: 8px;
          width: 100%;
          border-radius: 99px;
          background: #252b36;
          overflow: hidden;
        }

        .st-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6577ff, #8b9aff);
          border-radius: 99px;
          transition: width 0.4s;
        }

        .st-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 19px;
          flex-wrap: wrap;
        }

        .st-search {
          position: relative;
          flex: 1;
          max-width: 360px;
          min-width: 200px;
        }

        .st-search input {
          width: 100%;
          height: 44px;
          border-radius: 11px;
          background: #131821;
          border: 1px solid #252c38;
          outline: none;
          padding: 0 40px;
          color: #f1f5f9;
          font-size: 13px;
          transition: border 0.2s;
        }

        .st-search input:focus {
          border-color: #6475ef;
        }

        .st-search input::placeholder {
          color: #687386;
        }

        .st-search-icon {
          position: absolute;
          top: 14px;
          left: 13px;
          color: #748094;
        }

        .st-search-clear {
          position: absolute;
          right: 12px;
          top: 12px;
          border: 0;
          background: transparent;
          color: #8893a5;
          cursor: pointer;
          padding: 2px;
        }

        .st-sort {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #252c38;
          background: #131821;
          border-radius: 11px;
          padding: 0 12px;
          color: #9ba6b7;
          font-size: 13px;
        }

        .st-sort select {
          color: #e2e8f0;
          background: transparent;
          border: none;
          outline: none;
          cursor: pointer;
          font-size: 13px;
        }

        .st-sort select option {
          background: #131821;
        }

        .st-filters {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          margin-bottom: 22px;
          scrollbar-width: thin;
        }

        .st-filter {
          border: 1px solid #252c38;
          background: #12161e;
          border-radius: 9px;
          color: #939daf;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
          transition: 0.2s;
        }

        .st-filter:hover {
          border-color: #475569;
          color: #e2e8f0;
        }

        .st-filter.active {
          background: rgba(99,102,241,0.12);
          border-color: #5969dc;
          color: #a5b4fc;
        }

        .st-filter-count {
          min-width: 19px;
          height: 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #252b36;
          border-radius: 6px;
          font-size: 10px;
          padding: 0 5px;
        }

        .st-filter.active .st-filter-count {
          background: rgba(99,102,241,0.22);
        }

        .st-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .st-card {
          border: 1px solid #252c38;
          background: #12161e;
          border-radius: 15px;
          padding: 19px;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
          min-width: 0;
        }

        .st-card:hover {
          transform: translateY(-2px);
          border-color: #4654a5;
          background: #151a24;
        }

        .st-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 17px;
        }

        .st-subject {
          color: #a5b4fc;
          background: rgba(99,102,241,0.09);
          border: 1px solid rgba(99,102,241,0.17);
          border-radius: 7px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 600;
          min-width: 0;
        }

        .st-subject span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .st-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
        }

        .st-status-dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
        }

        .st-card-content h3 {
          font-size: 17px;
          font-weight: 700;
          line-height: 1.45;
          margin: 0 0 8px;
          color: #e9edf5;
          word-break: break-word;
        }

        .st-description {
          font-size: 12px;
          color: #8994a6;
          line-height: 1.7;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 40px;
        }

        .st-card-meta {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 19px;
          flex-wrap: wrap;
        }

        .st-meta-item {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #929daf;
          font-size: 12px;
        }

        .st-meta-item svg {
          color: #6d7a90;
        }

        .st-deadline {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 13px;
          font-size: 11px;
          color: #fbbf24;
        }

        .st-deadline.overdue {
          color: #f87171;
        }

        .st-deadline.submitted {
          color: #38bdf8;
        }

        .st-deadline.graded {
          color: #34d399;
        }

        .st-card-footer {
          border-top: 1px solid #232a35;
          margin-top: 17px;
          padding-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #a5b4fc;
          font-size: 12px;
          font-weight: 650;
        }

        .st-arrow {
          transition: transform 0.2s;
        }

        .st-card:hover .st-arrow {
          transform: translateX(4px);
        }

        .st-empty {
          border: 1px dashed #303746;
          border-radius: 15px;
          padding: 55px 20px;
          text-align: center;
          background: #11151c;
        }

        .st-empty-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          border-radius: 15px;
          background: #1c2330;
          color: #818cf8;
        }

        .st-empty h3 {
          margin: 0 0 8px;
          font-size: 16px;
        }

        .st-empty p {
          margin: 0;
          color: #7e899b;
          font-size: 13px;
        }

        .st-error {
          border: 1px solid rgba(248,113,113,0.25);
          background: rgba(248,113,113,0.06);
          border-radius: 12px;
          padding: 15px;
          color: #fca5a5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .st-error button {
          border: 1px solid #573333;
          border-radius: 8px;
          background: transparent;
          color: #fca5a5;
          padding: 8px 12px;
          cursor: pointer;
        }

        .st-loading {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .st-skeleton {
          height: 230px;
          border-radius: 15px;
          background: linear-gradient(
            100deg,
            #12161e 20%,
            #1b212b 40%,
            #12161e 60%
          );
          background-size: 200% 100%;
          animation: st-shimmer 1.5s infinite;
          border: 1px solid #222834;
        }

        @keyframes st-shimmer {
          to {
            background-position: -200% 0;
          }
        }

        .st-result-count {
          color: #748094;
          font-size: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .st-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .st-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .student-tasks {
            padding: 18px 14px;
          }

          .st-header {
            margin-bottom: 22px;
          }

          .st-heading h1 {
            font-size: 24px;
          }

          .st-heading p {
            font-size: 12px;
          }

          .st-refresh {
            width: 42px;
            justify-content: center;
            padding: 0;
            font-size: 0;
          }

          .st-stats {
            gap: 10px;
            margin-bottom: 20px;
          }

          .st-stat {
            padding: 14px;
            min-height: 100px;
          }

          .st-stat-value {
            font-size: 23px;
          }

          .st-stat-label {
            font-size: 11px;
          }

          .st-progress-card {
            padding: 16px;
            margin-bottom: 22px;
          }

          .st-toolbar {
            align-items: stretch;
          }

          .st-search {
            max-width: none;
            width: 100%;
          }

          .st-sort {
            width: 100%;
            justify-content: space-between;
          }

          .st-filters {
            margin-bottom: 18px;
          }

          .st-card {
            padding: 16px;
          }

          .st-card-content h3 {
            font-size: 15px;
          }

          .st-description {
            font-size: 12px;
          }

          .st-loading {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="st-container">

        <header className="st-header">
          <div className="st-heading">
            <h1>My Tasks</h1>
            <p>
              Track your assignments, deadlines and submissions.
            </p>
          </div>

          <button
            className="st-refresh"
            onClick={refreshTasks}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "st-spin" : ""}
            />
            Refresh
          </button>
        </header>

        <section className="st-stats">

          <div className="st-stat">
            <div className="st-stat-top">
              <span className="st-stat-label">Total Tasks</span>
              <div
                className="st-stat-icon"
                style={{
                  background: "rgba(129,140,248,0.12)",
                  color: "#818cf8"
                }}
              >
                <ClipboardList size={17} />
              </div>
            </div>

            <div className="st-stat-value">{stats.total}</div>
            <div className="st-stat-sub">Assigned to you</div>
          </div>

          <div className="st-stat">
            <div className="st-stat-top">
              <span className="st-stat-label">Pending</span>
              <div
                className="st-stat-icon"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  color: "#f59e0b"
                }}
              >
                <Clock size={17} />
              </div>
            </div>

            <div className="st-stat-value">{stats.pending}</div>
            <div className="st-stat-sub">Awaiting submission</div>
          </div>

          <div className="st-stat">
            <div className="st-stat-top">
              <span className="st-stat-label">Submitted</span>
              <div
                className="st-stat-icon"
                style={{
                  background: "rgba(56,189,248,0.12)",
                  color: "#38bdf8"
                }}
              >
                <FileText size={17} />
              </div>
            </div>

            <div className="st-stat-value">{stats.submitted}</div>
            <div className="st-stat-sub">Awaiting evaluation</div>
          </div>

          <div className="st-stat">
            <div className="st-stat-top">
              <span className="st-stat-label">Completed</span>
              <div
                className="st-stat-icon"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  color: "#34d399"
                }}
              >
                <CheckCircle2 size={17} />
              </div>
            </div>

            <div className="st-stat-value">{stats.completed}</div>
            <div className="st-stat-sub">Evaluated tasks</div>
          </div>

        </section>

        <section className="st-progress-card">
          <div className="st-progress-top">
            <span className="st-progress-title">
              Overall Completion
            </span>

            <span className="st-progress-value">
              {completionPercentage}%
            </span>
          </div>

          <div className="st-progress-track">
            <div
              className="st-progress-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </section>

        {error && (
          <div className="st-error">
            <span>{error}</span>
            <button onClick={loadTasks}>Retry</button>
          </div>
        )}

        <section className="st-toolbar">
          <div className="st-search">
            <Search size={16} className="st-search-icon" />

            <input
              type="text"
              placeholder="Search tasks or subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                className="st-search-clear"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="st-sort">
            <Filter size={15} />

            <span>Sort:</span>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="deadline">Deadline</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </section>

        <section className="st-filters">
          {filters.map((item) => (
            <button
              key={item.id}
              className={`st-filter ${
                filter === item.id ? "active" : ""
              }`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}

              <span className="st-filter-count">
                {item.count}
              </span>
            </button>
          ))}
        </section>

        {loading ? (
          <div className="st-loading">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="st-skeleton" key={index} />
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <>
            <div className="st-result-count">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>

            <div className="st-grid">
              {filteredTasks.map((task, index) => (
                <TaskCard
                  key={getId(task) || index}
                  task={task}
                  onClick={() => openTask(task)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="st-empty">
            <div className="st-empty-icon">
              <ListTodo size={25} />
            </div>

            <h3>
              {search || filter !== "all"
                ? "No tasks found"
                : "No tasks assigned yet"}
            </h3>

            <p>
              {search || filter !== "all"
                ? "Try changing your search or filters."
                : "Your assignments will appear here when they are assigned."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
