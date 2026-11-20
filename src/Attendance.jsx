import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  Coffee,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  FileText,
  Timer,
  Send,
  X,
  Sun,
  Moon
} from "lucide-react";

import { API_BASE } from "./lib/api";
const API = {
  attendance: `${API_BASE}/intern/attendance`,
  checkIn: `${API_BASE}/intern/attendance/check-in`,
  checkOut: `${API_BASE}/intern/attendance/check-out`,
  leave: `${API_BASE}/intern/attendance/leave`
};

function getToken() {
  return (
    localStorage.getItem("intern_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(value) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function formatHours(hours) {
  const value = Number(hours || 0);
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);

  return `${h}h ${m}m`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function normalizeStatus(status) {
  const s = String(status || "").toLowerCase().replace(/[_-]/g, " ");

  if (s.includes("present")) return "Present";
  if (s.includes("absent")) return "Absent";
  if (s.includes("holiday")) return "Holiday";
  if (s.includes("leave")) return "Leave";
  if (s.includes("half")) return "Half Day";
  if (s.includes("pending")) return "Pending";
  if (s.includes("working") || s.includes("active")) return "In Progress";

  return status || "Not Marked";
}

function normalizeAttendance(data) {
  const root = data?.data || data?.attendance_data || data;

  const records = Array.isArray(root)
    ? root
    : root?.records || root?.attendance || root?.history || root?.items || [];

  const today = root?.today || root?.today_attendance || null;

  const session =
    root?.current_session ||
    root?.active_session ||
    today?.current_session ||
    today?.active_session ||
    null

  return {
    records: records.map((item, index) => ({
      id: item.id || item._id || `attendance-${index}`,
      date: item.date || item.attendance_date || item.day || "",
      checkIn: item.check_in || item.checkIn || item.checkin || item.in_time || null,
      checkOut: item.check_out || item.checkOut || item.checkout || item.out_time || null,
      hours: Number(item.hours ?? item.total_hours ?? item.duration_hours ?? 0),
      status: normalizeStatus(item.status),
      remark: item.remark || item.remarks || item.note || ""
    })),
    today,
    session,
    summary: root?.summary || root?.stats || root?.statistics || {},
    leaves: root?.leaves || root?.leave_requests || []
  };
}

function getStatusStyle(status) {
  const styles = {
    Present: "bg-emerald-100 text-emerald-700",
    Absent: "bg-red-100 text-red-700",
    Leave: "bg-amber-100 text-amber-700",
    Holiday: "bg-blue-100 text-blue-700",
    "Half Day": "bg-orange-100 text-orange-700",
    "In Progress": "bg-indigo-100 text-indigo-700",
    Pending: "bg-yellow-100 text-yellow-700",
    "Not Marked": "bg-slate-100 text-slate-500"
  };

  return styles[status] || styles["Not Marked"];
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusStyle(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value, icon, color, subtitle }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`rounded-xl p-2 ${colors[color]}`}>{icon}</div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

function CalendarView({ month, records, todayStatus }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const today = localDate();
  const recordMap = {};

  records.forEach(record => {
    if (record.date) recordMap[record.date] = record;
  });

  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  const getDayStatus = (day) => {
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (key === today && todayStatus && !recordMap[key]) {
      return normalizeStatus(todayStatus.status || "Present");
    }

    return recordMap[key]?.status || "";
  };

  const dayColors = {
    Present: "bg-emerald-100 text-emerald-700",
    Absent: "bg-red-100 text-red-700",
    Leave: "bg-amber-100 text-amber-700",
    Holiday: "bg-blue-100 text-blue-700",
    "Half Day": "bg-orange-100 text-orange-700",
    "In Progress": "bg-indigo-100 text-indigo-700"
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div
            key={i}
            className="py-2 text-center text-xs font-semibold text-slate-400"
          >
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const status = getDayStatus(day);
          const isToday = key === today;

          return (
            <div
              key={key}
              className={`flex min-h-[42px] flex-col items-center justify-center rounded-lg text-xs font-medium sm:min-h-[48px] ${
                status
                  ? dayColors[status] || "bg-slate-100 text-slate-700"
                  : "text-slate-600"
              } ${isToday ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
              title={status || "Not marked"}
            >
              {day}
              {status && (
                <span className="mt-0.5 hidden text-[8px] sm:block">
                  {status === "Present"
                    ? "P"
                    : status === "Absent"
                    ? "A"
                    : status === "Leave"
                    ? "L"
                    : status === "Holiday"
                    ? "H"
                    : status === "Half Day"
                    ? "HD"
                    : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
        {[
          ["Present", "bg-emerald-500"],
          ["Absent", "bg-red-500"],
          ["Leave", "bg-amber-500"],
          ["Holiday", "bg-blue-500"],
          ["Half Day", "bg-orange-500"]
        ].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState({});
  const [leaves, setLeaves] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [month, setMonth] = useState(new Date());
  const [timer, setTimer] = useState(0);

  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    start_date: "",
    end_date: "",
    reason: ""
  });

  const today = localDate();

  const fetchAttendance = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

      const response = await fetch(`${API.attendance}?month=${monthKey}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please login again.");
        }

        throw new Error(`Unable to load attendance (${response.status}).`);
      }

      const result = await response.json();
      const normalized = normalizeAttendance(result);

      setRecords(normalized.records);
      setTodayData(normalized.today);
      setSession(normalized.session);
      setSummary(normalized.summary);
      setLeaves(normalized.leaves);
    } catch (err) {
      setError(err.message || "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [month]);

  useEffect(() => {
    if (!session) {
      setTimer(0);
      return;
    }

    const start =
      session.check_in ||
      session.checkIn ||
      session.started_at ||
      session.start_time ||
      todayData?.check_in ||
      todayData?.checkIn;

    if (!start) return;

    const startTime = new Date(start).getTime();

    if (Number.isNaN(startTime)) return;

    const update = () => {
      setTimer(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [session, todayData]);

  const todayRecord = records.find(record => record.date === today);

  const isCheckedIn = Boolean(session);

  const todayCheckIn =
    todayRecord?.checkIn ||
    todayData?.check_in ||
    todayData?.checkIn ||
    session?.check_in ||
    session?.checkIn ||
    null;

  const todayCheckOut =
    todayRecord?.checkOut ||
    todayData?.check_out ||
    todayData?.checkOut ||
    null;

  const todayHours = todayRecord?.hours || Number(todayData?.hours || 0);

  const presentDays = Number(
    summary.present_days ??
      summary.present ??
      records.filter(r => r.status === "Present" || r.status === "In Progress").length
  );

  const absentDays = Number(
    summary.absent_days ??
      summary.absent ??
      records.filter(r => r.status === "Absent").length
  );

  const leaveDays = Number(
    summary.leave_days ??
      summary.leave ??
      records.filter(r => r.status === "Leave").length
  );

  const totalHours = Number(
    summary.total_hours ??
      summary.hours ??
      records.reduce((total, r) => total + r.hours, 0)
  );

  const attendanceRate = Number(
    summary.attendance_percentage ??
      summary.attendance_rate ??
      summary.percentage ??
      (presentDays + absentDays
        ? Math.round((presentDays / (presentDays + absentDays)) * 100)
        : 0)
  );

  const monthName = month.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const changeMonth = (offset) => {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const sendAttendanceAction = async (action) => {
    setActionLoading(action);
    setError("");
    setActionMessage("");

    try {
      const token = getToken();

      const response = await fetch(
        action === "check-in" ? API.checkIn : API.checkOut,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            date: today,
            timestamp: new Date().toISOString()
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.detail ||
            (action === "check-in"
              ? "Check-in failed."
              : "Check-out failed.")
        );
      }

      setActionMessage(
        result.message ||
          (action === "check-in"
            ? "Check-in recorded successfully."
            : "Check-out recorded successfully.")
      );

      await fetchAttendance();
    } catch (err) {
      setError(err.message || "Attendance action failed.");
    } finally {
      setActionLoading("");
    }
  };

  const submitLeaveRequest = async (e) => {
    e.preventDefault();

    setActionLoading("leave");
    setError("");
    setActionMessage("");

    try {
      const token = getToken();

      const response = await fetch(API.leave, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(leaveForm)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || result.detail || "Leave request failed."
        );
      }

      setActionMessage(result.message || "Leave request submitted successfully.");
      setLeaveModal(false);
      setLeaveForm({ start_date: "", end_date: "", reason: "" });

      await fetchAttendance();
    } catch (err) {
      setError(err.message || "Unable to submit leave request.");
    } finally {
      setActionLoading("");
    }
  };

  const getCurrentMonthRecords = records.filter(r => {
    const recordMonth = r.date?.slice(0, 7);
    return recordMonth === `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your internship working hours and attendance.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setLeaveModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText size={16} />
            Request Leave
          </button>

          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle size={19} className="mt-0.5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Attendance error
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchAttendance}
              className="mt-2 text-xs font-semibold text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} />
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Present Days"
              value={presentDays}
              icon={<CalendarCheck size={19} />}
              color="emerald"
              subtitle="This selected month"
            />

            <StatCard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              icon={<CheckCircle2 size={19} />}
              color="indigo"
              subtitle="Overall attendance"
            />

            <StatCard
              label="Working Hours"
              value={formatHours(totalHours)}
              icon={<Clock3 size={19} />}
              color="blue"
              subtitle="Total recorded hours"
            />

            <StatCard
              label="Leaves"
              value={leaveDays}
              icon={<Coffee size={19} />}
              color="amber"
              subtitle="Approved / recorded"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">
                      Today's Attendance
                    </h2>

                    {isCheckedIn && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {new Date().toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>

                {isCheckedIn ? (
                  <button
                    onClick={() => sendAttendanceAction("check-out")}
                    disabled={!!actionLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === "check-out" ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <LogOut size={17} />
                    )}
                    Check Out
                  </button>
                ) : (
                  <button
                    onClick={() => sendAttendanceAction("check-in")}
                    disabled={!!actionLoading || !!todayCheckOut}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {actionLoading === "check-in" ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <LogIn size={17} />
                    )}
                    {todayCheckOut ? "Session Completed" : "Check In"}
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <LogIn size={15} />
                    Check-in
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {formatTime(todayCheckIn)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <LogOut size={15} />
                    Check-out
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {formatTime(todayCheckOut)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Timer size={15} />
                    Working time
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {isCheckedIn
                      ? formatDuration(timer)
                      : formatHours(todayHours)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2">
                  {isCheckedIn ? (
                    <Sun size={17} className="text-amber-500" />
                  ) : (
                    <Moon size={17} className="text-slate-400" />
                  )}

                  <p className="text-xs font-medium text-slate-700">
                    {isCheckedIn
                      ? "Your working session is active. Remember to check out when finished."
                      : todayCheckOut
                      ? "Today's working session is complete."
                      : "Check in when you begin your internship work."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Monthly Calendar
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Attendance overview
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    onClick={() => changeMonth(1)}
                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 text-center text-sm font-semibold text-slate-800">
                {monthName}
              </div>

              <div className="mt-3">
                <CalendarView
                  month={month}
                  records={records}
                  todayStatus={todayData}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Attendance History
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Daily attendance records
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                {monthName}
              </div>
            </div>

            {sortedRecords.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarDays size={25} className="mx-auto text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No attendance records
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Your attendance history will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500">Check-in</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500">Check-out</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500">Working Hours</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500">Status</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500">Remark</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedRecords.map(record => (
                        <tr
                          key={record.id}
                          className="border-b border-slate-50 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-slate-800">
                            {record.date
                              ? new Date(`${record.date}T00:00:00`).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })
                              : "--"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatTime(record.checkIn)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatTime(record.checkOut)}
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-800">
                            {formatHours(record.hours)}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={record.status} />
                          </td>

                          <td className="max-w-[200px] truncate px-5 py-4 text-xs text-slate-500">
                            {record.remark || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {sortedRecords.map(record => (
                    <div key={record.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {record.date
                            ? new Date(`${record.date}T00:00:00`).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })
                            : "--"}
                        </p>

                        <StatusBadge status={record.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400">Check-in</p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {formatTime(record.checkIn)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400">Check-out</p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {formatTime(record.checkOut)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400">Hours</p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {formatHours(record.hours)}
                          </p>
                        </div>
                      </div>

                      {record.remark && (
                        <p className="mt-2 text-xs text-slate-500">
                          {record.remark}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {leaves.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-semibold text-slate-900">Leave Requests</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your leave request history
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {leaves.map((leave, index) => (
                  <div
                    key={leave.id || leave._id || index}
                    className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {leave.start_date || leave.from} — {leave.end_date || leave.to}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {leave.reason || "Leave request"}
                      </p>
                    </div>

                    <StatusBadge status={normalizeStatus(leave.status || "Pending")} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {leaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Request Leave
              </h2>

              <button
                onClick={() => setLeaveModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Submit a leave request for mentor approval.
            </p>

            <form onSubmit={submitLeaveRequest} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Start Date
                </label>

                <input
                  type="date"
                  required
                  min={today}
                  value={leaveForm.start_date}
                  onChange={e =>
                    setLeaveForm(prev => ({
                      ...prev,
                      start_date: e.target.value,
                      end_date: prev.end_date < e.target.value ? e.target.value : prev.end_date
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  End Date
                </label>

                <input
                  type="date"
                  required
                  min={leaveForm.start_date || today}
                  value={leaveForm.end_date}
                  onChange={e =>
                    setLeaveForm(prev => ({
                      ...prev,
                      end_date: e.target.value
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Reason
                </label>

                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={leaveForm.reason}
                  onChange={e =>
                    setLeaveForm(prev => ({
                      ...prev,
                      reason: e.target.value
                    }))
                  }
                  placeholder="Explain why you need leave..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading === "leave"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === "leave" ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Submit Leave Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
