import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../../lib/api";

const getId = (item) => item?.id || item?._id || "";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.approvals)) return data.approvals;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getStudentName = (item) =>
  item.student_name ||
  item.intern_name ||
  item.student?.name ||
  item.name ||
  item.full_name ||
  "Unknown Student";

const getStudentEmail = (item) =>
  item.student_email ||
  item.intern_email ||
  item.student?.email ||
  item.email ||
  "";

const getTitle = (item) =>
  item.title ||
  item.task_title ||
  item.project_title ||
  item.submission_title ||
  item.leave_type ||
  item.name ||
  "Untitled Request";

const getRawType = (item) =>
  String(
    item.category ||
      item.approval_type ||
      item.type ||
      item.submission_type ||
      ""
  )
    .toLowerCase()
    .trim();

const getSectionKey = (item) => {
  const t = getRawType(item);
  if (t.includes("leave") || item.leave_type || item.from_date || item.to_date) {
    return "leave";
  }
  if (t.includes("project") || item.project_title || item.project_id) {
    return "project";
  }
  if (
    t.includes("task") ||
    t.includes("assignment") ||
    t.includes("code") ||
    t.includes("text") ||
    item.task_id ||
    item.admin_task_id ||
    item.task_title
  ) {
    return "task";
  }
  return "other";
};

const getTypeLabel = (item) => {
  const section = getSectionKey(item);
  if (section === "task") return item.task_type || "Task Submission";
  if (section === "leave") return item.leave_type || "Leave Request";
  if (section === "project") return "Project Submission";
  return item.type || item.approval_type || "Request";
};

const formatDate = (date) => {
  if (!date) return "Not available";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatOnlyDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status) => {
  const s = String(status || "pending")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

  if (["submitted", "under_review", "pending"].includes(s)) return "pending";
  if (["approved", "completed", "accepted", "graded"].includes(s))
    return "approved";
  if (["revision_required", "revision"].includes(s)) return "revision_required";
  if (["rejected", "declined"].includes(s)) return "rejected";
  return s;
};

const SECTIONS = [
  { key: "all", label: "All Requests" },
  { key: "task", label: "Task Submissions" },
  { key: "leave", label: "Leave Requests" },
  { key: "project", label: "Projects" },
  { key: "other", label: "Other" },
];

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");

  const [activeSection, setActiveSection] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [marks, setMarks] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadApprovals = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiGet("/admin/approvals");
      setApprovals(normalizeList(data));
    } catch (err) {
      console.error("Approvals loading error:", err);
      setError(err?.message || "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const sectionCounts = useMemo(() => {
    const counts = { all: 0, task: 0, leave: 0, project: 0, other: 0 };
    const pendingCounts = { all: 0, task: 0, leave: 0, project: 0, other: 0 };

    approvals.forEach((item) => {
      const sec = getSectionKey(item);
      counts.all += 1;
      counts[sec] += 1;

      if (normalizeStatus(item.status) === "pending") {
        pendingCounts.all += 1;
        pendingCounts[sec] += 1;
      }
    });

    return { total: counts, pending: pendingCounts };
  }, [approvals]);

  const sectionItems = useMemo(() => {
    if (activeSection === "all") return approvals;
    return approvals.filter((item) => getSectionKey(item) === activeSection);
  }, [approvals, activeSection]);

  const stats = useMemo(() => {
    return {
      total: sectionItems.length,
      pending: sectionItems.filter(
        (a) => normalizeStatus(a.status) === "pending"
      ).length,
      approved: sectionItems.filter(
        (a) => normalizeStatus(a.status) === "approved"
      ).length,
      rejected: sectionItems.filter((a) =>
        ["rejected", "revision_required"].includes(normalizeStatus(a.status))
      ).length,
    };
  }, [sectionItems]);

  const filteredApprovals = useMemo(() => {
    return sectionItems.filter((item) => {
      const searchable = [
        getStudentName(item),
        getStudentEmail(item),
        getTitle(item),
        getTypeLabel(item),
        item.program_name,
        item.batch_name,
        item.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(search.toLowerCase());

      const itemStatus = normalizeStatus(item.status);
      const matchesStatus =
        statusFilter === "all" || itemStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sectionItems, search, statusFilter]);

  const openDetails = (item) => {
    setSelected(item);
    setFeedback(item.admin_feedback || item.feedback || "");
    setMarks(
      item.marks !== null && item.marks !== undefined ? String(item.marks) : ""
    );
    setError("");
  };

  const closeDetails = () => {
    if (updating) return;
    setSelected(null);
    setFeedback("");
    setMarks("");
  };

  const updateApproval = async (item, newStatus, customFeedback = null) => {
    const id = getId(item);

    if (!id) {
      setError("Approval ID is missing.");
      return;
    }

    const finalFeedback =
      customFeedback !== null ? customFeedback : feedback.trim();

    if (
      ["rejected", "revision_required"].includes(newStatus) &&
      !finalFeedback &&
      !window.confirm("Proceed without writing feedback?")
    ) {
      return;
    }

    setUpdating(id);
    setError("");
    setSuccess("");

    const payload = {
      status: newStatus,
      category: getSectionKey(item),
      type: item.type || item.approval_type || getSectionKey(item),
      feedback: finalFeedback,
      admin_feedback: finalFeedback,
    };

    if (marks !== "" && !Number.isNaN(Number(marks))) {
      payload.marks = Number(marks);
    }

    try {
      await apiPut(`/admin/approvals/${id}`, payload);

      setSuccess(
        newStatus === "approved"
          ? "Request approved successfully."
          : newStatus === "revision_required"
          ? "Revision requested from student."
          : newStatus === "rejected"
          ? "Request rejected."
          : "Approval updated."
      );

      setSelected(null);
      setFeedback("");
      setMarks("");
      await loadApprovals();
    } catch (err) {
      console.error("Approval update error:", err);
      setError(err?.message || "Failed to update approval.");
    } finally {
      setUpdating("");
    }
  };

  const statusBadge = (status) => {
    const value = normalizeStatus(status);

    const styles = {
      pending: "bg-amber-50 text-amber-700 ring-amber-200",
      approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      rejected: "bg-red-50 text-red-700 ring-red-200",
      revision_required: "bg-orange-50 text-orange-700 ring-orange-200",
    };

    const labels = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      revision_required: "Revision",
    };

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
          styles[value] || "bg-gray-100 text-gray-600 ring-gray-200"
        }`}
      >
        {labels[value] || value}
      </span>
    );
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const cardClass =
    "rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5";

  const getSubmissionAnswer = (item) =>
    item?.answer ||
    item?.submission_text ||
    item?.text ||
    item?.submission_data?.answer ||
    "";

  const getSubmissionCode = (item) =>
    item?.code || item?.submission_data?.code || "";

  const getSubmissionLinks = (item) => {
    const links = [];
    const mainUrl =
      item?.url || item?.submission_url || item?.submission_data?.url;
    const ghUrl = item?.github_url || item?.submission_data?.github_url;

    if (mainUrl) links.push({ label: "Live / Submission URL", url: mainUrl });
    if (ghUrl && ghUrl !== mainUrl) {
      links.push({ label: "GitHub Repository", url: ghUrl });
    }
    return links;
  };

  const getSubmissionFiles = (item) => {
    const files = Array.isArray(item?.files)
      ? item.files
      : Array.isArray(item?.submission_data?.files)
      ? item.submission_data.files
      : [];

    const normalized = files
      .map((f, idx) =>
        typeof f === "string"
          ? { name: `Attachment ${idx + 1}`, url: f }
          : {
              name: f?.name || f?.file_name || `Attachment ${idx + 1}`,
              url: f?.url || f?.file_url || "",
            }
      )
      .filter((f) => f.url);

    if (
      item?.file_url &&
      !normalized.some((f) => f.url === item.file_url)
    ) {
      normalized.push({
        name: item.file_name || "Uploaded File",
        url: item.file_url,
      });
    }

    return normalized;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Approvals Center
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review student task submissions, leave requests, projects and
              other approvals.
            </p>
          </div>

          <button
            onClick={loadApprovals}
            disabled={loading}
            className="self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 sm:self-auto"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.key;
            const pendingCount = sectionCounts.pending[sec.key] || 0;

            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{sec.label}</span>
                {pendingCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="ml-3 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="ml-3 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total in Section",
              value: stats.total,
              color: "text-indigo-600",
            },
            {
              label: "Pending Review",
              value: stats.pending,
              color: "text-amber-600",
            },
            {
              label: "Approved",
              value: stats.approved,
              color: "text-emerald-600",
            },
            {
              label: "Rejected / Revision",
              value: stats.rejected,
              color: "text-red-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-xs font-medium text-gray-500 sm:text-sm">
                {stat.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, email, task, leave reason..."
              className={`${inputClass} flex-1`}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} lg:w-52`}
            >
              <option value="pending">Pending Review</option>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="revision_required">Revision Required</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-500">
                Loading approvals...
              </p>
            </div>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
              ✓
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">
              No requests found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no items matching the current section and filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredApprovals.map((item) => {
              const sec = getSectionKey(item);
              const isPending = normalizeStatus(item.status) === "pending";

              return (
                <div key={getId(item)} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {getTypeLabel(item)}
                      </p>
                      <h3 className="mt-1 truncate text-base font-semibold text-gray-900">
                        {getTitle(item)}
                      </h3>
                    </div>
                    {statusBadge(item.status)}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-700">
                      {getStudentName(item)
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {getStudentName(item)}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {getStudentEmail(item) || "No email provided"}
                      </p>
                    </div>
                  </div>

                  {sec === "leave" ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Leave Duration</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {formatOnlyDate(item.from_date || item.start_date)} –{" "}
                          {formatOnlyDate(item.to_date || item.end_date)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Reason</p>
                        <p className="mt-1 truncate text-sm font-medium text-gray-800">
                          {item.reason || "Not specified"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {formatDate(
                            item.submitted_at ||
                              item.created_at ||
                              item.createdAt
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          {item.marks != null ? "Marks" : "Batch / Program"}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-gray-800">
                          {item.marks != null
                            ? `${item.marks}${
                                item.max_marks != null
                                  ? ` / ${item.max_marks}`
                                  : ""
                              }`
                            : item.batch_name ||
                              item.program_name ||
                              "Not specified"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openDetails(item)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Review Details
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => updateApproval(item, "approved", "")}
                          disabled={updating === getId(item)}
                          className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Quick Approve
                        </button>

                        <button
                          onClick={() => openDetails(item)}
                          className="flex-1 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredApprovals.length > 0 && (
          <p className="text-center text-xs text-gray-500">
            Showing {filteredApprovals.length} of {sectionItems.length} requests
          </p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Review Request
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Verify details, assign marks or feedback and take action
                </p>
              </div>

              <button
                onClick={closeDetails}
                disabled={!!updating}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {getTypeLabel(selected)}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">
                        {getTitle(selected)}
                      </h3>
                    </div>
                    {statusBadge(selected.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Student</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {getStudentName(selected)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                      {getStudentEmail(selected) || "Not provided"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Program</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {selected.program_name ||
                        selected.program?.name ||
                        "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Batch</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {selected.batch_name ||
                        selected.batch?.name ||
                        "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Submitted At</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(
                        selected.submitted_at ||
                          selected.created_at ||
                          selected.createdAt
                      )}
                    </p>
                  </div>

                  {getSectionKey(selected) === "leave" ? (
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500">Leave Dates</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatOnlyDate(
                          selected.from_date || selected.start_date
                        )}{" "}
                        to{" "}
                        {formatOnlyDate(selected.to_date || selected.end_date)}
                        {selected.days ? ` (${selected.days} days)` : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500">Request ID</p>
                      <p className="mt-1 break-all text-sm font-medium text-gray-900">
                        {getId(selected)}
                      </p>
                    </div>
                  )}
                </div>

                {selected.reason && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Leave Reason
                    </h4>
                    <div className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                      {selected.reason}
                    </div>
                  </div>
                )}

                {selected.description && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Description
                    </h4>
                    <div className="whitespace-pre-wrap rounded-xl border border-gray-100 p-3 text-sm leading-6 text-gray-600">
                      {selected.description}
                    </div>
                  </div>
                )}

                {getSubmissionAnswer(selected) &&
                  getSubmissionAnswer(selected) !==
                    getSubmissionCode(selected) && (
                    <div>
                      <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                        Submitted Answer
                      </h4>
                      <div className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-sm leading-6 text-gray-700">
                        {getSubmissionAnswer(selected)}
                      </div>
                    </div>
                  )}

                {getSubmissionCode(selected) && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800">
                        Submitted Code
                      </h4>
                      {selected.language && (
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200">
                          {selected.language}
                        </span>
                      )}
                    </div>
                    <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-6 text-emerald-300">
                      {getSubmissionCode(selected)}
                    </pre>
                  </div>
                )}

                {getSubmissionLinks(selected).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Submitted Links
                    </h4>
                    {getSubmissionLinks(selected).map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        {link.label}: {link.url} ↗
                      </a>
                    ))}
                  </div>
                )}

                {getSubmissionFiles(selected).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Uploaded Files
                    </h4>
                    {getSubmissionFiles(selected).map((file, i) => (
                      <a
                        key={i}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        {file.name} ↗
                      </a>
                    ))}
                  </div>
                )}

                {["task", "project"].includes(getSectionKey(selected)) && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                      Marks{" "}
                      {selected.max_marks != null
                        ? `(Out of ${selected.max_marks})`
                        : "(Optional)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selected.max_marks || undefined}
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      placeholder="Enter obtained marks"
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                    Admin Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Write feedback for the student..."
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  onClick={closeDetails}
                  disabled={!!updating}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {["task", "project"].includes(getSectionKey(selected)) && (
                    <button
                      onClick={() =>
                        updateApproval(selected, "revision_required")
                      }
                      disabled={!!updating}
                      className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {updating ? "Saving..." : "Request Revision"}
                    </button>
                  )}

                  <button
                    onClick={() => updateApproval(selected, "rejected")}
                    disabled={!!updating}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Reject"}
                  </button>

                  <button
                    onClick={() => updateApproval(selected, "approved")}
                    disabled={!!updating}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
