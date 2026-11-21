import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  student_id: "",
  batch_id: "",
  date: new Date().toISOString().slice(0, 10),
  status: "present",
  check_in: "",
  check_out: "",
  remarks: "",
};

const getId = (item) => item?.id || item?._id || "";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.attendance)) return data.attendance;
  if (Array.isArray(data?.students)) return data.students;
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

const getStatus = (item) => String(item.status || "present").toLowerCase();

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

export default function AttendanceAdmin() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [attendanceData, studentData, batchData] = await Promise.all([
        apiGet("/admin/attendance"),
        apiGet("/admin/students"),
        apiGet("/admin/batches"),
      ]);

      setRecords(normalizeList(attendanceData));
      setStudents(normalizeList(studentData));
      setBatches(normalizeList(batchData));
    } catch (err) {
      console.error("Attendance loading error:", err);
      setError(err?.message || "Failed to load attendance data.");
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

  const getStudentById = (id) =>
    students.find((s) => String(getId(s)) === String(id));

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const name = getStudentName(record);
      const email = getStudentEmail(record);
      const studentId = record.student_id || record.student?.id || "";
      const batchId = record.batch_id || record.batch?.id || "";

      const searchable = `${name} ${email} ${studentId}`.toLowerCase();

      const matchesSearch = searchable.includes(search.toLowerCase());

      const matchesDate =
        !dateFilter ||
        String(record.date || record.attendance_date || "").slice(0, 10) ===
          dateFilter;

      const matchesBatch =
        batchFilter === "all" || String(batchId) === batchFilter;

      const matchesStatus =
        statusFilter === "all" || getStatus(record) === statusFilter;

      return matchesSearch && matchesDate && matchesBatch && matchesStatus;
    });
  }, [records, search, dateFilter, batchFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;

    const present = filteredRecords.filter(
      (r) => getStatus(r) === "present"
    ).length;

    const absent = filteredRecords.filter(
      (r) => getStatus(r) === "absent"
    ).length;

    const late = filteredRecords.filter(
      (r) => getStatus(r) === "late"
    ).length;

    const leave = filteredRecords.filter(
      (r) => ["leave", "holiday", "excused"].includes(getStatus(r))
    ).length;

    return {
      total,
      present,
      absent,
      late,
      leave,
      percentage: total ? Math.round((present / total) * 100) : 0,
    };
  }, [filteredRecords]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingRecord(null);
    setForm({
      ...EMPTY_FORM,
      date: dateFilter || new Date().toISOString().slice(0, 10),
    });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);

    setForm({
      student_id: String(
        record.student_id || record.student?.id || ""
      ),
      batch_id: String(record.batch_id || record.batch?.id || ""),
      date: String(record.date || record.attendance_date || "").slice(0, 10),
      status: getStatus(record),
      check_in: record.check_in || record.check_in_time || "",
      check_out: record.check_out || record.check_out_time || "",
      remarks: record.remarks || record.notes || "",
    });

    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.student_id) {
      setError("Please select a student.");
      return;
    }

    if (!form.date) {
      setError("Please select attendance date.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const student = getStudentById(form.student_id);

    const payload = {
      student_id: form.student_id,
      student_name: student?.name || student?.full_name || "",
      student_email: student?.email || "",
      batch_id: form.batch_id || student?.batch_id || null,
      date: form.date,
      attendance_date: form.date,
      status: form.status,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      remarks: form.remarks.trim(),
    };

    try {
      if (editingRecord) {
        await apiPut(`/admin/attendance/${getId(editingRecord)}`, payload);
        setSuccess("Attendance updated successfully.");
      } else {
        await apiPost("/admin/attendance", payload);
        setSuccess("Attendance marked successfully.");
      }

      setModalOpen(false);
      setEditingRecord(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      console.error("Attendance save error:", err);
      setError(err?.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete attendance for ${getStudentName(record)}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiDelete(`/admin/attendance/${getId(record)}`);
      setSuccess("Attendance record deleted.");
      await loadData();
    } catch (err) {
      console.error("Attendance deletion error:", err);
      setError(err?.message || "Failed to delete attendance.");
    }
  };

  const statusBadge = (status) => {
    const value = getStatus({ status });

    const styles = {
      present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      absent: "bg-red-50 text-red-700 ring-red-200",
      late: "bg-amber-50 text-amber-700 ring-amber-200",
      leave: "bg-blue-50 text-blue-700 ring-blue-200",
      holiday: "bg-purple-50 text-purple-700 ring-purple-200",
      excused: "bg-blue-50 text-blue-700 ring-blue-200",
    };

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
          styles[value] || "bg-gray-100 text-gray-600 ring-gray-200"
        }`}
      >
        {value}
      </span>
    );
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Attendance
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track, manage and update student attendance records.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <span className="text-lg leading-none">+</span>
            Mark Attendance
          </button>
        </div>

        {error && !modalOpen && (
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            {
              label: "Total Records",
              value: stats.total,
              color: "text-indigo-600",
            },
            {
              label: "Present",
              value: stats.present,
              color: "text-emerald-600",
            },
            {
              label: "Absent",
              value: stats.absent,
              color: "text-red-600",
            },
            {
              label: "Late",
              value: stats.late,
              color: "text-amber-600",
            },
            {
              label: "Attendance Rate",
              value: `${stats.percentage}%`,
              color: "text-blue-600",
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className={inputClass}
            />

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={inputClass}
            />

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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">Leave</option>
              <option value="holiday">Holiday</option>
              <option value="excused">Excused</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setBatchFilter("all");
                setStatusFilter("all");
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            >
              Clear Filters
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              Refresh Records
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">
                  Loading attendance...
                </p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                📋
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                No attendance records
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing filters or mark attendance for a student.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Mark Attendance
              </button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      {[
                        "Student",
                        "Batch",
                        "Date",
                        "Check In",
                        "Check Out",
                        "Status",
                        "Remarks",
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
                    {filteredRecords.map((record) => (
                      <tr
                        key={getId(record)}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {getStudentName(record)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {getStudentEmail(record)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {record.batch_name ||
                            record.batch?.name ||
                            getBatchName(record.batch_id)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                          {formatDate(
                            record.date || record.attendance_date
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {record.check_in || record.check_in_time || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {record.check_out || record.check_out_time || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {statusBadge(record.status)}
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-40 truncate text-sm text-gray-500">
                            {record.remarks || record.notes || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(record)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(record)}
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

              <div className="divide-y divide-gray-100 lg:hidden">
                {filteredRecords.map((record) => (
                  <div key={getId(record)} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                          {getStudentName(record)
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {getStudentName(record)}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {getStudentEmail(record)}
                          </p>
                        </div>
                      </div>

                      {statusBadge(record.status)}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {formatDate(
                            record.date || record.attendance_date
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Batch</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {record.batch_name ||
                            record.batch?.name ||
                            getBatchName(record.batch_id)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Check In</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {record.check_in || record.check_in_time || "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Check Out</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {record.check_out || record.check_out_time || "—"}
                        </p>
                      </div>
                    </div>

                    {record.remarks && (
                      <p className="mt-3 text-sm text-gray-500">
                        {record.remarks}
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEdit(record)}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(record)}
                        className="flex-1 rounded-xl border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 sm:px-5">
                Showing {filteredRecords.length} of {records.length} records
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingRecord ? "Edit Attendance" : "Mark Attendance"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Update student attendance details.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto px-5 py-5 sm:px-6"
            >
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Student *</label>
                  <select
                    required
                    value={form.student_id}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      const student = getStudentById(studentId);

                      setForm((prev) => ({
                        ...prev,
                        student_id: studentId,
                        batch_id: student?.batch_id
                          ? String(student.batch_id)
                          : prev.batch_id,
                      }));
                    }}
                    disabled={!!editingRecord}
                    className={inputClass}
                  >
                    <option value="">Select Student</option>
                    {students.map((student) => (
                      <option key={getId(student)} value={getId(student)}>
                        {student.name || student.full_name || "Unnamed Student"}
                        {student.email ? ` — ${student.email}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Batch</label>
                  <select
                    value={form.batch_id}
                    onChange={(e) => setField("batch_id", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {batches.map((batch) => (
                      <option key={getId(batch)} value={getId(batch)}>
                        {batch.name || batch.title || "Unnamed Batch"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Attendance Date *</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setField("date", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Status *</label>
                    <select
                      required
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value)}
                      className={inputClass}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="leave">Leave</option>
                      <option value="holiday">Holiday</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Check In</label>
                    <input
                      type="time"
                      value={form.check_in}
                      onChange={(e) => setField("check_in", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Check Out</label>
                    <input
                      type="time"
                      value={form.check_out}
                      onChange={(e) => setField("check_out", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Remarks</label>
                  <textarea
                    rows={3}
                    value={form.remarks}
                    onChange={(e) => setField("remarks", e.target.value)}
                    placeholder="Optional remarks..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingRecord
                    ? "Update Attendance"
                    : "Mark Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
