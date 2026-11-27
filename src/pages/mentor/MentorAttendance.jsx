import React, { useEffect, useState } from "react";
import {
  UserCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  CalendarDays,
  Loader2,
  X,
  CalendarOff
} from "lucide-react";
import { API } from "../../lib/api";

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

export default function MentorAttendance() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [records, setRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [updatingId, setUpdatingId] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [leaveStatus, setLeaveStatus] = useState("approved");
  const [leaveRemarks, setLeaveRemarks] = useState("");
  const [savingLeave, setSavingLeave] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch(`${API}/mentor/attendance`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load attendance data.");
      }

      setRecords(Array.isArray(data.attendance) ? data.attendance : []);
      setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
      setBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (record, newStatus) => {
    const id = getId(record);
    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API}/mentor/attendance/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to update attendance.");
      }

      setNotice("Attendance status updated.");
      await fetchData(true);
    } catch (err) {
      setError(err.message || "Update failed.");
    } finally {
      setUpdatingId("");
    }
  };

  const openLeaveModal = (leave) => {
    setSelectedLeave(leave);
    const current = String(leave.status || "pending").toLowerCase();
    setLeaveStatus(current === "rejected" ? "rejected" : "approved");
    setLeaveRemarks(leave.mentor_remarks || leave.remarks || "");
    setModalError("");
  };

  const handleLeaveReview = async (e) => {
    e.preventDefault();
    if (!selectedLeave) return;

    if (leaveStatus === "rejected" && !leaveRemarks.trim()) {
      setModalError("Please provide a reason for rejecting this leave request.");
      return;
    }

    setSavingLeave(true);
    setModalError("");

    try {
      const res = await fetch(
        `${API}/mentor/attendance/leaves/${getId(selectedLeave)}/review`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getMentorToken()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: leaveStatus,
            remarks: leaveRemarks.trim()
          })
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to review leave request.");
      }

      setSelectedLeave(null);
      setNotice("Leave request updated successfully.");
      await fetchData(true);
    } catch (err) {
      setModalError(err.message || "Review failed.");
    } finally {
      setSavingLeave(false);
    }
  };

  const batchOptions =
    batches.length > 0
      ? batches
      : Array.from(
          new Set(
            [...records, ...leaves]
              .map((item) => (item.batch || "").trim())
              .filter(Boolean)
          )
        ).map((name) => ({ id: name, name }));

  const filteredRecords = records.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (item.student_name || "").toLowerCase().includes(q) ||
      (item.batch || "").toLowerCase().includes(q);

    const matchesBatch =
      !batchFilter ||
      String(item.batch_id || "") === String(batchFilter) ||
      String(item.batch || "") === String(batchFilter);

    const status = String(item.status || "present").toLowerCase();
    const matchesStatus = !statusFilter || status === statusFilter;

    const itemDate = String(item.date || "").slice(0, 10);
    const matchesDate = !dateFilter || itemDate === dateFilter;

    return matchesSearch && matchesBatch && matchesStatus && matchesDate;
  });

  const filteredLeaves = leaves.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (item.student_name || "").toLowerCase().includes(q) ||
      (item.batch || "").toLowerCase().includes(q) ||
      (item.reason || "").toLowerCase().includes(q);

    const matchesBatch =
      !batchFilter ||
      String(item.batch_id || "") === String(batchFilter) ||
      String(item.batch || "") === String(batchFilter);

    const status = String(item.status || "pending").toLowerCase();
    const matchesStatus = !statusFilter || status === statusFilter;

    return matchesSearch && matchesBatch && matchesStatus;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const presentToday = records.filter(
    (r) =>
      String(r.date || "").slice(0, 10) === todayStr &&
      String(r.status || "").toLowerCase() === "present"
  ).length;

  const totalPresent = records.filter(
    (r) => String(r.status || "").toLowerCase() === "present"
  ).length;

  const pendingLeaves = leaves.filter(
    (l) => String(l.status || "pending").toLowerCase() === "pending"
  ).length;

  const approvedLeaves = leaves.filter(
    (l) => String(l.status || "").toLowerCase() === "approved"
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Attendance & Leaves
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor daily attendance and approve leave requests for your assigned batches.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
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
            onClick={() => fetchData(true)}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Present Today" value={presentToday} icon={UserCheck} tone="emerald" />
        <StatCard title="Total Present Logs" value={totalPresent} icon={CheckCircle2} tone="indigo" />
        <StatCard title="Pending Leaves" value={pendingLeaves} icon={Clock3} tone="amber" />
        <StatCard title="Approved Leaves" value={approvedLeaves} icon={CalendarOff} tone="blue" />
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("attendance");
            setStatusFilter("");
          }}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "attendance"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Attendance Records ({records.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("leaves");
            setStatusFilter("");
          }}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "leaves"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Leave Requests
          {pendingLeaves > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {pendingLeaves}
            </span>
          )}
        </button>
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
              placeholder="Search student or batch..."
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
            {activeTab === "attendance" ? (
              <>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="leave">Leave</option>
              </>
            ) : (
              <>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </>
            )}
          </select>

          {activeTab === "attendance" && (
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          )}
        </div>
      </div>

      {activeTab === "attendance" ? (
        filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <UserCheck className="mx-auto text-slate-300" size={32} />
            <h3 className="mt-4 font-semibold text-slate-900">
              No attendance records found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Attendance logs from students in your batches will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {["Student", "Batch", "Date", "Check-in", "Status", "Update"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((item) => {
                    const id = getId(item);
                    const status = String(item.status || "present").toLowerCase();
                    return (
                      <tr key={id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.student_name || "Student"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.student_email || ""}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.batch || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.check_in || item.time || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={status} />
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={status}
                            disabled={updatingId === id}
                            onChange={(e) => handleStatusChange(item, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50"
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="half_day">Half Day</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredLeaves.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <CalendarOff className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-4 font-semibold text-slate-900">
            No leave requests found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Leave applications from your students will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeaves.map((leave) => (
            <div
              key={getId(leave)}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">
                    {leave.student_name || "Student"}
                  </h3>
                  <StatusPill status={leave.status || "pending"} />
                  {leave.batch && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {leave.batch}
                    </span>
                  )}
                </div>

                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                  <CalendarDays size={13} />
                  {formatDate(leave.from_date)} – {formatDate(leave.to_date || leave.from_date)}
                </p>

                <p className="text-sm leading-6 text-slate-600">
                  {leave.reason || "No reason specified."}
                </p>

                {leave.mentor_remarks && (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Remarks: </span>
                    {leave.mentor_remarks}
                  </p>
                )}
              </div>

              <button
                onClick={() => openLeaveModal(leave)}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                {String(leave.status || "pending").toLowerCase() === "pending"
                  ? "Review Request"
                  : "Update Decision"}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Review Leave Request
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedLeave.student_name} · {formatDate(selectedLeave.from_date)} to{" "}
                  {formatDate(selectedLeave.to_date || selectedLeave.from_date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLeaveReview} className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason
                </p>
                <p className="mt-1 leading-6">
                  {selectedLeave.reason || "No reason specified."}
                </p>
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
                  value={leaveStatus}
                  onChange={(e) => setLeaveStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="approved">Approve Leave</option>
                  <option value="rejected">Reject Leave</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Remarks {leaveStatus === "rejected" ? "*" : "(Optional)"}
                </label>
                <textarea
                  value={leaveRemarks}
                  onChange={(e) => setLeaveRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add remarks for the student..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLeave(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLeave}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingLeave ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : leaveStatus === "rejected" ? (
                    <XCircle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {savingLeave ? "Saving..." : "Save Decision"}
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
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600"
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
    present: "bg-emerald-50 text-emerald-700",
    approved: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    late: "bg-amber-50 text-amber-700",
    half_day: "bg-blue-50 text-blue-700",
    leave: "bg-indigo-50 text-indigo-700",
    absent: "bg-rose-50 text-rose-700",
    rejected: "bg-rose-50 text-rose-700"
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[normalized] || "bg-slate-100 text-slate-600"
      }`}
    >
      {normalized.replace("_", " ")}
    </span>
  );
}
