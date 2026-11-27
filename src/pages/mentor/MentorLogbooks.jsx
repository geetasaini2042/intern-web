import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  CalendarDays,
  Loader2,
  X,
  MessageSquare
} from "lucide-react";
import { API } from "../../lib/api";

const EMPTY_REVIEW = {
  status: "approved",
  remarks: ""
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

export default function MentorLogbooks() {
  const [logs, setLogs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selected, setSelected] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW);
  const [saving, setSaving] = useState(false);
  const [quickId, setQuickId] = useState("");
  const [modalError, setModalError] = useState("");

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`${API}/mentor/logbook`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load logbook entries.");
      }

      const list = Array.isArray(data)
        ? data
        : data.logbooks || data.logs || data.items || data.data || [];
      setLogs(Array.isArray(list) ? list : []);
      setBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const openReviewModal = (item) => {
    setSelected(item);
    const currentStatus = String(item.status || "pending").toLowerCase();
    setReviewForm({
      status: currentStatus === "rejected" ? "rejected" : "approved",
      remarks: item.mentor_remarks || item.remarks || ""
    });
    setModalError("");
  };

  const handleQuickApprove = async (item) => {
    const id = getId(item);
    setQuickId(id);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API}/mentor/logbook/${id}/review`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: "approved",
          remarks: item.mentor_remarks || ""
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to approve logbook.");
      }

      setNotice("Logbook entry approved.");
      await fetchLogs(true);
    } catch (err) {
      setError(err.message || "Approval failed.");
    } finally {
      setQuickId("");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selected) return;

    if (reviewForm.status === "rejected" && !reviewForm.remarks.trim()) {
      setModalError("Please add a remark explaining why this entry is rejected.");
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      const res = await fetch(`${API}/mentor/logbook/${getId(selected)}/review`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: reviewForm.status,
          remarks: reviewForm.remarks.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to save review.");
      }

      setSelected(null);
      setNotice("Logbook review saved successfully.");
      await fetchLogs(true);
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
          new Set(logs.map((l) => (l.batch || "").trim()).filter(Boolean))
        ).map((name) => ({ id: name, name }));

  const filtered = logs.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (item.student_name || "").toLowerCase().includes(q) ||
      (item.batch || "").toLowerCase().includes(q) ||
      (item.summary || "").toLowerCase().includes(q) ||
      (item.learning || "").toLowerCase().includes(q);

    const matchesBatch =
      !batchFilter ||
      String(item.batch_id || "") === String(batchFilter) ||
      String(item.batch || "") === String(batchFilter);

    const status = String(item.status || "pending").toLowerCase();
    const matchesStatus = !statusFilter || status === statusFilter;

    const itemDate = String(item.date || "").slice(0, 10);
    const matchesDate = !dateFilter || itemDate === dateFilter;

    return matchesSearch && matchesBatch && matchesStatus && matchesDate;
  });

  const pendingCount = logs.filter(
    (l) => String(l.status || "pending").toLowerCase() === "pending"
  ).length;

  const approvedCount = logs.filter(
    (l) => String(l.status || "").toLowerCase() === "approved"
  ).length;

  const rejectedCount = logs.filter(
    (l) => String(l.status || "").toLowerCase() === "rejected"
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading student logbooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Logbooks
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Verify daily work logs submitted by students in your assigned batches.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
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
            onClick={() => fetchLogs(true)}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Entries" value={logs.length} icon={BookOpen} tone="indigo" />
        <StatCard title="Pending" value={pendingCount} icon={Clock3} tone="amber" />
        <StatCard title="Approved" value={approvedCount} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Rejected" value={rejectedCount} icon={XCircle} tone="rose" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search student or work done..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <BookOpen className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-4 font-semibold text-slate-900">
            {search || batchFilter || statusFilter || dateFilter
              ? "No matching logbook entries found"
              : "No logbook entries yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Daily logbooks submitted by your students will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const id = getId(item);
            const isPending = String(item.status || "pending").toLowerCase() === "pending";

            return (
              <div
                key={id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {item.student_name || "Student"}
                      </h3>
                      <StatusPill status={item.status || "pending"} />
                      {item.batch && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {item.batch}
                        </span>
                      )}
                      {item.hours ? (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {item.hours} hrs
                        </span>
                      ) : null}
                    </div>

                    <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays size={13} />
                      {formatDate(item.date || item.created_at)}
                    </p>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.summary || "No work summary provided."}
                    </p>

                    {item.learning && (
                      <p className="text-xs leading-5 text-slate-500">
                        <span className="font-semibold text-slate-700">Key Learning: </span>
                        {item.learning}
                      </p>
                    )}

                    {item.mentor_remarks && (
                      <div className="inline-flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <MessageSquare size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                        <span>{item.mentor_remarks}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                    {isPending && (
                      <button
                        onClick={() => handleQuickApprove(item)}
                        disabled={quickId === id}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:flex-none"
                      >
                        {quickId === id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Quick Approve
                      </button>
                    )}

                    <button
                      onClick={() => openReviewModal(item)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:flex-none"
                    >
                      {isPending ? "Review / Remark" : "Update Review"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Review Logbook Entry
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selected.student_name} · {formatDate(selected.date || selected.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 p-5">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Work Done
                </p>
                <p className="whitespace-pre-wrap leading-6">
                  {selected.summary || "No summary provided."}
                </p>
                {selected.learning && (
                  <p className="pt-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Learning: </span>
                    {selected.learning}
                  </p>
                )}
              </div>

              {modalError && (
                <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  {modalError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Decision *
                </label>
                <select
                  value={reviewForm.status}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mentor Remarks {reviewForm.status === "rejected" ? "*" : "(Optional)"}
                </label>
                <textarea
                  value={reviewForm.remarks}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  rows={3}
                  placeholder="Add remarks or feedback for the student..."
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
    rejected: "bg-rose-50 text-rose-700"
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[normalized] || "bg-slate-100 text-slate-600"
      }`}
    >
      {normalized}
    </span>
  );
}
