import React, { useEffect, useState } from "react";
import {
  FolderKanban,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  ExternalLink,
  Github,
  FileText,
  Loader2,
  X,
  RotateCcw,
  Award,
  Layers
} from "lucide-react";
import { API } from "../../lib/api";

const EMPTY_REVIEW = {
  status: "approved",
  score: "",
  feedback: ""
};

function getMentorToken() {
  return localStorage.getItem("mentor_token") || "";
}

function getId(item) {
  return item?.id || item?._id || "";
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

export default function MentorProjects() {
  const [projects, setProjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selected, setSelected] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchProjects = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`${API}/mentor/projects`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load student projects.");
      }

      const list = Array.isArray(data)
        ? data
        : data.projects || data.items || data.data || [];
      setProjects(Array.isArray(list) ? list : []);
      setBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openReviewModal = (item) => {
    setSelected(item);
    const currentStatus = String(item.status || "pending").toLowerCase();
    setReviewForm({
      status:
        currentStatus === "approved" ||
        currentStatus === "rejected" ||
        currentStatus === "revision"
          ? currentStatus
          : "approved",
      score: item.score ?? "",
      feedback: item.feedback || item.mentor_feedback || ""
    });
    setModalError("");
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selected) return;

    const maxScore = selected.max_score ?? 100;
    if (reviewForm.score !== "") {
      const numScore = Number(reviewForm.score);
      if (Number.isNaN(numScore) || numScore < 0 || numScore > maxScore) {
        setModalError(`Score must be between 0 and ${maxScore}.`);
        return;
      }
    }

    if (
      (reviewForm.status === "rejected" || reviewForm.status === "revision") &&
      !reviewForm.feedback.trim()
    ) {
      setModalError("Please provide feedback for revision or rejection.");
      return;
    }

    setSaving(true);
    setModalError("");

    const payload = {
      status: reviewForm.status,
      score: reviewForm.score === "" ? null : Number(reviewForm.score),
      feedback: reviewForm.feedback.trim()
    };

    try {
      const res = await fetch(`${API}/mentor/projects/${getId(selected)}/review`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to save project review.");
      }

      setSelected(null);
      setNotice("Project review saved successfully.");
      await fetchProjects(true);
    } catch (err) {
      setModalError(err.message || "Review failed.");
    } finally {
      setSaving(false);
    }
  };

  const batchOptions =
    batches.length > 0
      ? batches
      : Array.from(
          new Set(projects.map((p) => (p.batch || "").trim()).filter(Boolean))
        ).map((name) => ({ id: name, name }));

  const filtered = projects.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (item.title || "").toLowerCase().includes(q) ||
      (item.student_name || "").toLowerCase().includes(q) ||
      (item.student_email || "").toLowerCase().includes(q) ||
      (item.batch || "").toLowerCase().includes(q) ||
      (item.tech_stack || "").toLowerCase().includes(q);

    const matchesBatch =
      !batchFilter ||
      String(item.batch_id || "") === String(batchFilter) ||
      String(item.batch || "") === String(batchFilter);

    const normalizedStatus = String(item.status || "pending").toLowerCase();
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "pending"
        ? normalizedStatus === "pending" || normalizedStatus === "submitted"
        : normalizedStatus === statusFilter);

    return matchesSearch && matchesBatch && matchesStatus;
  });

  const pendingCount = projects.filter((p) => {
    const st = String(p.status || "pending").toLowerCase();
    return st === "pending" || st === "submitted";
  }).length;

  const approvedCount = projects.filter(
    (p) => String(p.status || "").toLowerCase() === "approved"
  ).length;

  const revisionCount = projects.filter((p) => {
    const st = String(p.status || "").toLowerCase();
    return st === "revision" || st === "rejected";
  }).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading student projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Projects
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review project submissions, inspect repositories, and grade interns in your batches.
          </p>
        </div>

        <button
          onClick={() => fetchProjects(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:self-center"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchProjects(true)}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Projects" value={projects.length} icon={FolderKanban} tone="indigo" />
        <StatCard title="Pending Review" value={pendingCount} icon={Clock3} tone="amber" />
        <StatCard title="Approved" value={approvedCount} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Revision / Rejected" value={revisionCount} icon={RotateCcw} tone="rose" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search project title, student, tech stack or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 sm:w-52"
          >
            <option value="">All Batches</option>
            {batchOptions.map((batch) => (
              <option key={batch.id || batch.name} value={batch.id || batch.name}>
                {batch.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 sm:w-44"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="revision">Revision</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <FolderKanban className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-4 font-semibold text-slate-900">
            {search || batchFilter || statusFilter
              ? "No matching projects found"
              : "No project submissions yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Projects submitted by students in your assigned batches will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={getId(item)}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-900">
                      {item.title || "Untitled Project"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {item.student_name || "Student"}
                      </span>
                      {item.batch ? ` · ${item.batch}` : ""}
                      {item.submitted_at ? ` · ${formatDate(item.submitted_at)}` : ""}
                    </p>
                  </div>
                  <StatusPill status={item.status || "pending"} />
                </div>

                {item.description && (
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {item.tech_stack && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <Layers size={12} />
                      {item.tech_stack}
                    </span>
                  )}
                  {item.score !== null && item.score !== undefined && item.score !== "" && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      <Award size={12} />
                      {item.score} / {item.max_score ?? 100}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  {item.live_url && (
                    <a
                      href={item.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                    >
                      <ExternalLink size={13} />
                      Live Demo
                    </a>
                  )}
                  {item.github_url && (
                    <a
                      href={item.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-slate-700 hover:underline"
                    >
                      <Github size={13} />
                      GitHub Repo
                    </a>
                  )}
                  {item.report_url && (
                    <a
                      href={item.report_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                    >
                      <FileText size={13} />
                      Project Report
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-4">
                <button
                  onClick={() => openReviewModal(item)}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
                >
                  {String(item.status || "pending").toLowerCase() === "pending" ||
                  String(item.status || "pending").toLowerCase() === "submitted"
                    ? "Review Project"
                    : "Update Review"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-slate-900">
                  {selected.title || "Review Project"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selected.student_name || "Student"}
                  {selected.batch ? ` · ${selected.batch}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitReview}
              className="max-h-[82vh] space-y-5 overflow-y-auto p-5"
            >
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project Details
                </p>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {selected.description || "No description provided."}
                </p>

                {selected.tech_stack && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Tech Stack: </span>
                    {selected.tech_stack}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.live_url && (
                    <a
                      href={selected.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      <ExternalLink size={13} />
                      Open Live Demo
                    </a>
                  )}
                  {selected.github_url && (
                    <a
                      href={selected.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Github size={13} />
                      Open GitHub
                    </a>
                  )}
                  {selected.report_url && (
                    <a
                      href={selected.report_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      <FileText size={13} />
                      Open Report
                    </a>
                  )}
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Decision *
                  </label>
                  <select
                    name="status"
                    value={reviewForm.status}
                    onChange={handleReviewChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="approved">Approve</option>
                    <option value="revision">Request Revision</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Score (out of {selected.max_score ?? 100})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selected.max_score ?? 100}
                    name="score"
                    value={reviewForm.score}
                    onChange={handleReviewChange}
                    placeholder="e.g. 90"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mentor Feedback {reviewForm.status !== "approved" ? "*" : "(Optional)"}
                </label>
                <textarea
                  name="feedback"
                  value={reviewForm.feedback}
                  onChange={handleReviewChange}
                  rows={4}
                  placeholder="Write project evaluation notes or requested improvements..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : reviewForm.status === "rejected" ? (
                    <XCircle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {saving ? "Saving..." : "Save Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600"
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          tones[tone] || tones.indigo
        }`}
      >
        <Icon size={20} />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status).toLowerCase();
  const styles = {
    approved: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    submitted: "bg-amber-50 text-amber-700",
    revision: "bg-blue-50 text-blue-700",
    rejected: "bg-rose-50 text-rose-700"
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[normalized] || "bg-slate-100 text-slate-600"
      }`}
    >
      {normalized === "submitted" ? "pending" : normalized}
    </span>
  );
}
