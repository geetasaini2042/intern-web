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
  item.student?.name ||
  item.name ||
  item.full_name ||
  "Unknown Student";

const getStudentEmail = (item) =>
  item.student_email || item.student?.email || item.email || "";

const getTitle = (item) =>
  item.title ||
  item.project_title ||
  item.task_title ||
  item.submission_title ||
  item.name ||
  "Untitled Submission";

const getType = (item) =>
  item.type ||
  item.approval_type ||
  item.submission_type ||
  item.category ||
  "Submission";

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

const normalizeStatus = (status) =>
  String(status || "pending").toLowerCase();

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");

  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
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

  const stats = useMemo(() => {
    return {
      total: approvals.length,
      pending: approvals.filter(
        (a) => normalizeStatus(a.status) === "pending"
      ).length,
      approved: approvals.filter(
        (a) => normalizeStatus(a.status) === "approved"
      ).length,
      rejected: approvals.filter(
        (a) => normalizeStatus(a.status) === "rejected"
      ).length,
    };
  }, [approvals]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      const searchable = [
        getStudentName(item),
        getStudentEmail(item),
        getTitle(item),
        getType(item),
        item.program_name,
        item.batch_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        normalizeStatus(item.status) === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        getType(item).toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [approvals, search, statusFilter, typeFilter]);

  const openDetails = (item) => {
    setSelected(item);
    setFeedback(item.admin_feedback || item.feedback || "");
    setError("");
  };

  const closeDetails = () => {
    if (updating) return;
    setSelected(null);
    setFeedback("");
  };

  const updateApproval = async (item, newStatus) => {
    const id = getId(item);

    if (!id) {
      setError("Approval ID is missing.");
      return;
    }

    if (
      newStatus === "rejected" &&
      !feedback.trim() &&
      !window.confirm("Reject this submission without feedback?")
    ) {
      return;
    }

    setUpdating(id);
    setError("");
    setSuccess("");

    try {
      await apiPut(`/admin/approvals/${id}`, {
        status: newStatus,
        feedback: feedback.trim(),
        admin_feedback: feedback.trim(),
      });

      setSuccess(
        newStatus === "approved"
          ? "Submission approved successfully."
          : newStatus === "rejected"
          ? "Submission rejected."
          : "Approval updated."
      );

      setSelected(null);
      setFeedback("");
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
      reviewed: "bg-blue-50 text-blue-700 ring-blue-200",
    };

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
          styles[value] || "bg-gray-100 text-gray-600 ring-gray-200"
        }`}
      >
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </span>
    );
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const cardClass =
    "rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Approvals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review student submissions and manage approval requests.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
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
              label: "Total Requests",
              value: stats.total,
              color: "text-indigo-600",
            },
            {
              label: "Pending",
              value: stats.pending,
              color: "text-amber-600",
            },
            {
              label: "Approved",
              value: stats.approved,
              color: "text-emerald-600",
            },
            {
              label: "Rejected",
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
              placeholder="Search student, email or submission..."
              className={`${inputClass} flex-1`}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} lg:w-48`}
            >
              <option value="pending">Pending</option>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${inputClass} lg:w-48`}
            >
              <option value="all">All Types</option>
              {[...new Set(approvals.map(getType))].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              onClick={loadApprovals}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
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
              No approvals found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no requests matching the current filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredApprovals.map((item) => (
              <div key={getId(item)} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                      {getType(item)}
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
                    <p className="text-xs text-gray-500">Program</p>
                    <p className="mt-1 truncate text-sm font-medium text-gray-800">
                      {item.program_name ||
                        item.program?.name ||
                        "Not specified"}
                    </p>
                  </div>
                </div>

                {item.submission_url && (
                  <a
                    href={item.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View Submission ↗
                  </a>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openDetails(item)}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Review Details
                  </button>

                  {normalizeStatus(item.status) === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setFeedback("");
                          updateApproval(item, "approved");
                        }}
                        disabled={updating === getId(item)}
                        className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
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
            ))}
          </div>
        )}

        {!loading && filteredApprovals.length > 0 && (
          <p className="text-center text-xs text-gray-500">
            Showing {filteredApprovals.length} of {approvals.length} requests
          </p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Review Submission
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Submission details and approval decision
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
                      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                        {getType(selected)}
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

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Submission ID</p>
                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                      {getId(selected)}
                    </p>
                  </div>
                </div>

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

                {selected.submission_text && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Submission Content
                    </h4>
                    <div className="whitespace-pre-wrap rounded-xl border border-gray-100 p-3 text-sm leading-6 text-gray-600">
                      {selected.submission_text}
                    </div>
                  </div>
                )}

                {selected.submission_url && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Submission File / Link
                    </h4>
                    <a
                      href={selected.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      {selected.submission_url}
                    </a>
                  </div>
                )}

                {selected.file_url && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Uploaded File
                    </h4>
                    <a
                      href={selected.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      Open Uploaded File
                    </a>
                  </div>
                )}

                {selected.admin_feedback && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Previous Feedback
                    </h4>
                    <div className="whitespace-pre-wrap rounded-xl border border-gray-100 p-3 text-sm text-gray-600">
                      {selected.admin_feedback}
                    </div>
                  </div>
                )}

                {normalizeStatus(selected.status) === "pending" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                      Admin Feedback
                    </label>
                    <textarea
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Write feedback for the student (optional for approval)..."
                      className={inputClass}
                    />
                  </div>
                )}
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

                {normalizeStatus(selected.status) === "pending" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() =>
                        updateApproval(selected, "rejected")
                      }
                      disabled={!!updating}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {updating ? "Processing..." : "Reject"}
                    </button>

                    <button
                      onClick={() =>
                        updateApproval(selected, "approved")
                      }
                      disabled={!!updating}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updating ? "Processing..." : "Approve Submission"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
