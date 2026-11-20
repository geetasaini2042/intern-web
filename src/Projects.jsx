import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban, Search, RefreshCw, CalendarDays, Clock,
  ChevronRight, X, ExternalLink, CheckCircle2, Circle,
  AlertCircle, Code2, Target, ListChecks, FileText,
  Send, Loader2, Briefcase, Filter, Users
} from "lucide-react";
import { apiGet } from "./lib/api";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (value) => {
  if (!value) return "Not specified";

  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const normalizeStatus = (value = "") =>
  String(value).toLowerCase().replaceAll("_", " ").trim();

const statusConfig = (status) => {
  const s = normalizeStatus(status);

  if (["completed", "complete", "finished"].includes(s))
    return {
      label: "Completed",
      style: "bg-green-50 text-green-700 border-green-200"
    };

  if (["in progress", "ongoing", "active"].includes(s))
    return {
      label: "In Progress",
      style: "bg-blue-50 text-blue-700 border-blue-200"
    };

  if (["submitted", "under review", "review"].includes(s))
    return {
      label: "Under Review",
      style: "bg-violet-50 text-violet-700 border-violet-200"
    };

  if (["overdue", "delayed"].includes(s))
    return {
      label: "Overdue",
      style: "bg-red-50 text-red-700 border-red-200"
    };

  if (["cancelled", "canceled"].includes(s))
    return {
      label: "Cancelled",
      style: "bg-slate-100 text-slate-600 border-slate-200"
    };

  return {
    label: "Not Started",
    style: "bg-amber-50 text-amber-700 border-amber-200"
  };
};

const normalizeProject = (item) => {
  const milestones = item?.milestones || item?.steps || item?.tasks || [];

  const progressValue =
    item?.progress ??
    item?.completion_percentage ??
    item?.completion ??
    item?.progress_percent ??
    null;

  const progress = progressValue === null
    ? null
    : Math.max(0, Math.min(100, Number(progressValue) || 0));

  return {
    ...item,
    id: item?.id || item?._id || item?.project_id || item?.assignment_id,
    title: item?.title || item?.name || item?.project_name || "Untitled Project",
    description: item?.description || item?.overview || item?.summary || "",
    status: normalizeStatus(item?.status || item?.project_status || "assigned"),
    priority: String(item?.priority || "medium").toLowerCase(),
    progress,
    startDate: item?.start_date || item?.assigned_date || item?.created_at?.slice?.(0, 10) || "",
    dueDate: item?.due_date || item?.deadline || item?.end_date || "",
    domain: item?.domain || item?.category || item?.project_type || "",
    technologies: item?.technologies || item?.tech_stack || item?.tools || [],
    objectives: item?.objectives || item?.goals || [],
    milestones: Array.isArray(milestones) ? milestones : [],
    mentor: item?.mentor_name || item?.mentor || "",
    mentorNotes: item?.mentor_notes || item?.feedback || "",
    repoUrl: item?.repository_url || item?.github_url || item?.repo_url || "",
    demoUrl: item?.demo_url || item?.live_url || "",
    instructions: item?.instructions || item?.requirements || "",
    submissionStatus: item?.submission_status || "",
    duration: item?.duration || item?.duration_days || null
  };
};

const getPriority = (priority) => {
  const p = String(priority || "medium").toLowerCase();

  if (p === "high" || p === "urgent")
    return { label: p === "urgent" ? "Urgent" : "High", style: "bg-red-50 text-red-700" };

  if (p === "low")
    return { label: "Low", style: "bg-slate-100 text-slate-600" };

  return { label: "Medium", style: "bg-amber-50 text-amber-700" };
};

const arrayValue = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }
  return [];
};

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const loadProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiGet("/intern/projects");

      const raw =
        data?.projects ||
        data?.assigned_projects ||
        data?.items ||
        data?.data ||
        [];

      setProjects(Array.isArray(raw) ? raw.map(normalizeProject) : []);
    } catch (e) {
      setProjects([]);
      setError(e.message || "Unable to load assigned projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p =>
        ["in progress", "ongoing", "active"].includes(p.status)
      ).length,
      completed: projects.filter(p =>
        ["completed", "complete", "finished"].includes(p.status)
      ).length,
      pending: projects.filter(p =>
        ["assigned", "pending", "not started"].includes(p.status)
      ).length
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const status = normalizeStatus(project.status);

      if (filter === "active" && !["in progress", "ongoing", "active"].includes(status))
        return false;

      if (filter === "completed" && !["completed", "complete", "finished"].includes(status))
        return false;

      if (filter === "pending" && !["assigned", "pending", "not started"].includes(status))
        return false;

      if (filter === "overdue" && !(
        project.dueDate &&
        project.dueDate < today() &&
        !["completed", "complete", "finished", "cancelled"].includes(status)
      )) return false;

      const text = [
        project.title,
        project.description,
        project.domain,
        project.mentor,
        ...arrayValue(project.technologies)
      ].join(" ").toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [projects, search, filter]);

  const overdueCount = projects.filter(p =>
    p.dueDate &&
    p.dueDate < today() &&
    !["completed", "complete", "finished", "cancelled"].includes(p.status)
  ).length;

  const openSubmission = (project) => {
    navigate("/dash/submission", {
      state: {
        projectId: project.id,
        projectTitle: project.title,
        project,
        fromProjects: true
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Briefcase size={16} />
              Internship
              <span>/</span>
              Projects
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Assigned Projects
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View your projects, track progress and manage deliverables.
            </p>
          </div>

          <button
            onClick={loadProjects}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Unable to load projects</p>
              <p className="mt-1">{error}</p>
            </div>
            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Projects" value={stats.total} icon={FolderKanban} color="blue" />
          <StatCard label="In Progress" value={stats.active} icon={Clock} color="purple" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="green" />
          <StatCard label="Pending" value={stats.pending} icon={Circle} color="amber" />
        </div>

        {overdueCount > 0 && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={17} />
            <span>
              You have {overdueCount} project{overdueCount > 1 ? "s" : ""} past the deadline.
            </span>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, skills or technologies..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 sm:w-auto"
              >
                <option value="all">All Projects</option>
                <option value="active">In Progress</option>
                <option value="pending">Not Started</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              Your Projects
            </h2>
            <span className="text-xs text-slate-500">
              {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={26} className="animate-spin text-blue-500" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderKanban size={25} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                {projects.length === 0 ? "No projects assigned yet" : "No matching projects"}
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {projects.length === 0
                  ? "Your assigned projects will appear here once your mentor assigns them."
                  : "Try changing your search or filter."}
              </p>

              {search || filter !== "all" ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => setSelected(project)}
                  onSubmit={() => openSubmission(project)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ProjectModal
          project={selected}
          onClose={() => setSelected(null)}
          onSubmit={() => {
            const project = selected;
            setSelected(null);
            openSubmission(project);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onOpen, onSubmit }) {
  const status = statusConfig(project.status);
  const priority = getPriority(project.priority);

  const overdue =
    project.dueDate &&
    project.dueDate < today() &&
    !["completed", "complete", "finished", "cancelled"].includes(project.status);

  const technologies = arrayValue(project.technologies);
  const milestones = project.milestones;
  const completedMilestones = milestones.filter(m =>
    ["completed", "complete", "done", "verified"].includes(
      normalizeStatus(typeof m === "string" ? "" : m?.status)
    ) || m?.completed === true
  ).length;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FolderKanban size={21} />
        </div>

        <div className="flex flex-wrap justify-end gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.style}`}>
            {overdue ? "Overdue" : status.label}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${priority.style}`}>
            {priority.label} Priority
          </span>
        </div>
      </div>

      <h3 className="mt-4 line-clamp-2 text-base font-semibold text-slate-900">
        {project.title}
      </h3>

      {project.domain && (
        <span className="mt-2 inline-flex w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {project.domain}
        </span>
      )}

      <p className="mt-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-500">
        {project.description || "No project description available."}
      </p>

      {technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {technologies.slice(0, 4).map((tech, i) => (
            <span
              key={`${tech}-${i}`}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
            >
              {tech}
            </span>
          ))}

          {technologies.length > 4 && (
            <span className="px-1 py-1 text-[10px] text-slate-400">
              +{technologies.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold text-slate-700">
            {project.progress === null ? "Not tracked" : `${project.progress}%`}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              project.status === "completed" ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${project.progress ?? 0}%` }}
          />
        </div>

        {milestones.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-500">
            {completedMilestones} of {milestones.length} milestones completed
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} />
          <span>Deadline: </span>
          <span className={`font-medium ${overdue ? "text-red-600" : "text-slate-700"}`}>
            {formatDate(project.dueDate)}
          </span>
        </div>

        {project.mentor && (
          <div className="flex items-center gap-2">
            <Users size={14} />
            <span>Mentor: {project.mentor}</span>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={onOpen}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Details
          <ChevronRight size={15} />
        </button>

        <button
          onClick={onSubmit}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Send size={15} />
          Submit
        </button>
      </div>
    </div>
  );
}

function ProjectModal({ project, onClose, onSubmit }) {
  const status = statusConfig(project.status);
  const priority = getPriority(project.priority);

  const technologies = arrayValue(project.technologies);
  const objectives = arrayValue(project.objectives);
  const milestones = project.milestones || [];

  const isCompleted = ["completed", "complete", "finished"].includes(project.status);

  const progress = project.progress ?? (
    milestones.length
      ? Math.round(
          (milestones.filter(m =>
            ["completed", "complete", "done", "verified"].includes(
              normalizeStatus(typeof m === "string" ? "" : m?.status)
            ) || m?.completed === true
          ).length / milestones.length) * 100
        )
      : 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.style}`}>
                {status.label}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.style}`}>
                {priority.label} Priority
              </span>
            </div>

            <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              {project.title}
            </h2>

            {project.domain && (
              <p className="mt-1 text-sm text-slate-500">{project.domain}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText size={17} className="text-blue-600" />
              Project Overview
            </h3>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {project.description || "No description provided."}
            </p>

            {project.instructions && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-700">Instructions</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {project.instructions}
                </p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoBox label="Assigned Date" value={formatDate(project.startDate)} icon={CalendarDays} />
            <InfoBox label="Deadline" value={formatDate(project.dueDate)} icon={Clock} />
            <InfoBox label="Mentor" value={project.mentor || "Not assigned"} icon={Users} />
          </div>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Target size={17} className="text-blue-600" />
                Project Progress
              </h3>

              <span className="text-sm font-semibold text-slate-700">
                {project.progress === null && !milestones.length
                  ? "Not tracked"
                  : `${progress}%`}
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${isCompleted ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          {objectives.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Target size={17} className="text-blue-600" />
                Objectives
              </h3>

              <div className="mt-3 space-y-2">
                {objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <p className="text-sm leading-5 text-slate-600">
                      {typeof objective === "string"
                        ? objective
                        : objective?.title || objective?.description || JSON.stringify(objective)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {milestones.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks size={17} className="text-blue-600" />
                Milestones
              </h3>

              <div className="mt-3 space-y-2">
                {milestones.map((milestone, index) => {
                  const completed =
                    milestone?.completed === true ||
                    ["completed", "complete", "done", "verified"].includes(
                      normalizeStatus(typeof milestone === "string" ? "" : milestone?.status)
                    );

                  const title = typeof milestone === "string"
                    ? milestone
                    : milestone?.title || milestone?.name || milestone?.description || `Milestone ${index + 1}`;

                  return (
                    <div
                      key={milestone?.id || index}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      {completed
                        ? <CheckCircle2 size={17} className="mt-0.5 text-green-600" />
                        : <Circle size={17} className="mt-0.5 text-slate-400" />}

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${completed ? "text-slate-500 line-through" : "font-medium text-slate-700"}`}>
                          {title}
                        </p>

                        {milestone?.due_date && (
                          <p className="mt-1 text-xs text-slate-400">
                            Due: {formatDate(milestone.due_date)}
                          </p>
                        )}
                      </div>

                      <span className={`text-xs ${completed ? "text-green-600" : "text-slate-400"}`}>
                        {completed ? "Completed" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {technologies.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Code2 size={17} className="text-blue-600" />
                Technologies & Tools
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {technologies.map((technology, index) => (
                  <span
                    key={index}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    {technology}
                  </span>
                ))}
              </div>
            </section>
          )}

          {project.mentorNotes && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800">Mentor Feedback</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {project.mentorNotes}
              </p>
            </section>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Repository
                <ExternalLink size={15} />
              </a>
            )}

            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Live Demo
                <ExternalLink size={15} />
              </a>
            )}

            <button
              onClick={onSubmit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Submit Project
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
