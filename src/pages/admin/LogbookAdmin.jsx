import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut, apiDelete } from "../../lib/api";

const getId = (item) => item?.id || item?._id || "";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.logbooks)) return data.logbooks;
  if (Array.isArray(data?.entries)) return data.entries;
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

const getStatus = (item) => String(item.status || "pending").toLowerCase();

const formatDate = (date) => {
  if (!date) return "—";

  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LogbookAdmin() {
  const [entries, setEntries] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [reviewHours, setReviewHours] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [logbookData, studentData, batchData] = await Promise.all([
        apiGet("/admin/logbook"),
        apiGet("/admin/students"),
        apiGet("/admin/batches"),
      ]);

      setEntries(normalizeList(logbookData));
      setStudents(normalizeList(studentData));
      setBatches(normalizeList(batchData));
    } catch (err) {
      console.error("Logbook loading error:", err);
      setError(err?.message || "Failed to load logbook entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getBatchName = (id) => {
    const batch = batches.find((b) => String(getId(b)) === String(id));
    return batch?.name || batch?.title || "Unassigned";
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const name = getStudentName(entry);
      const email = getStudentEmail(entry);

      const searchable = [
        name,
        email,
        entry.title,
        entry.activity,
        entry.description,
        entry.tasks_completed,
        entry.technology,
        entry.day,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || getStatus(entry) === statusFilter;

      const batchId = entry.batch_id || entry.batch?.id || "";

      const matchesBatch =
        batchFilter === "all" || String(batchId) === batchFilter;

      const entryDate = String(
        entry.date || entry.entry_date || entry.created_at || ""
      ).slice(0, 10);

      const matchesDate = !dateFilter || entryDate === dateFilter;

      return matchesSearch && matchesStatus && matchesBatch && matchesDate;
    });
  }, [entries, search, statusFilter, batchFilter, dateFilter]);

  const stats = useMemo(() => {
    const pending = entries.filter(
      (e) => getStatus(e) === "pending"
    ).length;

    const approved = entries.filter(
      (e) => getStatus(e) === "approved"
    ).length;

    const rejected = entries.filter(
      (e) => getStatus(e) === "rejected"
    ).length;

    const approvedHours = entries
      .filter((e) => getStatus(e) === "approved")
      .reduce(
        (total, e) =>
          total + Number(e.approved_hours ?? e.hours ?? e.duration_hours ?? 0),
        0
      );

    const submittedHours = entries.reduce(
      (total, e) => total + Number(e.hours ?? e.duration_hours ?? 0),
      0
    );

    return {
      total: entries.length,
      pending,
      approved,
      rejected,
      approvedHours,
      submittedHours,
    };
  }, [entries]);

  const openReview = (entry) => {
    setSelected(entry);
    setFeedback(entry.admin_feedback || entry.feedback || "");
    setReviewHours(
      String(entry.approved_hours ?? entry.hours ?? entry.duration_hours ?? "")
    );
    setError("");
  };

  const closeReview = () => {
    if (updating) return;
    setSelected(null);
    setFeedback("");
    setReviewHours("");
  };

  const updateEntry = async (entry, newStatus) => {
    const id = getId(entry);

    if (!id) {
      setError("Logbook entry ID is missing.");
      return;
    }

    if (newStatus === "approved" && Number(reviewHours) <= 0) {
      setError("Approved hours must be greater than zero.");
      return;
    }

    setUpdating(id);
    setError("");
    setSuccess("");

    try {
      await apiPut(`/admin/logbook/${id}`, {
        status: newStatus,
        feedback: feedback.trim(),
        admin_feedback: feedback.trim(),
        approved_hours:
          newStatus === "approved" ? Number(reviewHours) : 0,
      });

      setSuccess(
        newStatus === "approved"
          ? "Logbook entry approved."
          : newStatus === "rejected"
          ? "Logbook entry rejected."
          : "Logbook entry updated."
      );

      setSelected(null);
      setFeedback("");
      setReviewHours("");
      await loadData();
    } catch (err) {
      console.error("Logbook review error:", err);
      setError(err?.message || "Failed to update logbook entry.");
    } finally {
      setUpdating("");
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm("Delete this logbook entry permanently?")) return;

    setError("");
    setSuccess("");

    try {
      await apiDelete(`/admin/logbook/${getId(entry)}`);
      setSuccess("Logbook entry deleted.");
      await loadData();
    } catch (err) {
      console.error("Logbook deletion error:", err);
      setError(err?.message || "Failed to delete entry.");
    }
  };

  const statusBadge = (status) => {
    const value = getStatus({ status });

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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Internship Logbook
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review daily activities, verify hours and approve student logbooks.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh Records
          </button>
        </div>

        {error && !selected && (
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: "Total Entries",
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
              label: "Rejected",
              value: stats.rejected,
              color: "text-red-600",
            },
            {
              label: "Approved Hours",
              value: stats.approvedHours,
              color: "text-blue-600",
            },
            {
              label: "Submitted Hours",
              value: stats.submittedHours,
              color: "text-gray-700",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-xs font-medium text-gray-500">
                {stat.label}
              </p>
              <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or activity..."
              className={inputClass}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="pending">Pending Review</option>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All Batches</option>
              {batches.map((batch) => (
                <option key={getId(batch)} value={String(getId(batch))}>
                  {batch.name || batch.title || "Unnamed Batch"}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setBatchFilter("all");
              setDateFilter("");
            }}
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-500">
                Loading logbook entries...
              </p>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
              📖
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">
              No logbook entries found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No entries match your current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {[
                      "Student",
                      "Day",
                      "Activity",
                      "Date",
                      "Hours",
                      "Batch",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={getId(entry)}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {getStudentName(entry)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {getStudentEmail(entry)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {entry.day || entry.day_number || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-800">
                            {entry.title || entry.activity || "Daily Activity"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            {entry.description ||
                              entry.tasks_completed ||
                              "No description"}
                          </p>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {formatDate(
                          entry.date || entry.entry_date || entry.created_at
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                        {entry.hours ?? entry.duration_hours ?? 0}h
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {entry.batch_name ||
                          entry.batch?.name ||
                          getBatchName(entry.batch_id)}
                      </td>

                      <td className="px-5 py-4">
                        {statusBadge(entry.status)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openReview(entry)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Review
                          </button>

                          <button
                            onClick={() => handleDelete(entry)}
                            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredEntries.map((entry) => (
                <div key={getId(entry)} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {getStudentName(entry)}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {getStudentEmail(entry)}
                      </p>
                    </div>
                    {statusBadge(entry.status)}
                  </div>

                  <div className="mt-4">
                    <p className="font-medium text-gray-800">
                      {entry.title || entry.activity || "Daily Activity"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-gray-500">
                      {entry.description ||
                        entry.tasks_completed ||
                        "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Day</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {entry.day || entry.day_number || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Hours</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {entry.hours ?? entry.duration_hours ?? 0} hours
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formatDate(
                          entry.date || entry.entry_date || entry.created_at
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Batch</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {entry.batch_name ||
                          entry.batch?.name ||
                          getBatchName(entry.batch_id)}
                      </p>
                    </div>
                  </div>

                  {entry.technology && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Technologies</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {entry.technology}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openReview(entry)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Review
                    </button>

                    <button
                      onClick={() => handleDelete(entry)}
                      className="rounded-xl border border-red-100 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-500">
              Showing {filteredEntries.length} of {entries.length} entries
            </p>
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Review Logbook
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Review activity and verify submitted hours.
                </p>
              </div>

              <button
                onClick={closeReview}
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
                      <h3 className="font-bold text-gray-900">
                        {getStudentName(selected)}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {getStudentEmail(selected)}
                      </p>
                    </div>
                    {statusBadge(selected.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Day Number</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selected.day || selected.day_number || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Submitted Date</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDate(
                        selected.date ||
                          selected.entry_date ||
                          selected.created_at
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Submitted Hours</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selected.hours ?? selected.duration_hours ?? 0} hours
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Batch</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selected.batch_name ||
                        selected.batch?.name ||
                        getBatchName(selected.batch_id)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                    Activity Title
                  </h4>
                  <div className="rounded-xl border border-gray-100 p-3 text-sm font-medium text-gray-800">
                    {selected.title || selected.activity || "Daily Activity"}
                  </div>
                </div>

                <div>
                  <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                    Activity Description
                  </h4>
                  <div className="whitespace-pre-wrap rounded-xl border border-gray-100 p-3 text-sm leading-6 text-gray-600">
                    {selected.description ||
                      selected.tasks_completed ||
                      "No description provided."}
                  </div>
                </div>

                {selected.technology && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Technologies Used
                    </h4>
                    <div className="rounded-xl border border-gray-100 p-3 text-sm text-gray-600">
                      {selected.technology}
                    </div>
                  </div>
                )}

                {selected.attachment_url && (
                  <div>
                    <h4 className="mb-1.5 text-sm font-semibold text-gray-800">
                      Attachment
                    </h4>
                    <a
                      href={selected.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      View Attachment
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
                      Open File
                    </a>
                  </div>
                )}

                {getStatus(selected) === "pending" && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                        Approved Hours
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        max={Number(
                          selected.hours ?? selected.duration_hours ?? 9999
                        )}
                        value={reviewHours}
                        onChange={(e) => setReviewHours(e.target.value)}
                        className={inputClass}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Submitted: {selected.hours ?? selected.duration_hours ?? 0} hours
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                        Admin Feedback
                      </label>
                      <textarea
                        rows={4}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Write feedback for the student..."
                        className={inputClass}
                      />
                    </div>
                  </>
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
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  onClick={closeReview}
                  disabled={!!updating}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>

                {getStatus(selected) === "pending" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => updateEntry(selected, "rejected")}
                      disabled={!!updating}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {updating ? "Processing..." : "Reject"}
                    </button>

                    <button
                      onClick={() => updateEntry(selected, "approved")}
                      disabled={!!updating}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updating ? "Processing..." : "Approve Entry"}
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
