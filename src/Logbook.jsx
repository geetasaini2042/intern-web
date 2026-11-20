import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, CalendarDays, Clock, CheckCircle2, AlertCircle,
  Send, Save, Search, ChevronLeft, ChevronRight, Eye,
  X, Loader2, FileText, GraduationCap, Pencil, RefreshCw,
  Plus, Trash2
} from "lucide-react";
import { API } from "./lib/api";
//const API = "https://api.singodiyatechnologies.tech";
//const API = "http://0.0.0.0:8000";
const getToken = () =>
  localStorage.getItem("intern_token") ||
  localStorage.getItem("access_token") ||
  "";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`
});

async function request(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const monthString = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const dateFromString = (value) => {
  if (!value) return null;
  const p = String(value).slice(0, 10).split("-");
  if (p.length !== 3) return null;
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
};

const formatDate = (value) => {
  const d = dateFromString(value);
  return d
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : value || "—";
};

const formatMonth = (value) => {
  const [y, m] = value.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
};

const toHours = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  const str = String(value).trim();
  if (str.includes(":")) {
    const p = str.split(":").map(Number);
    if (p.length >= 2 && p.every((n) => !Number.isNaN(n))) {
      return p[0] + p[1] / 60;
    }
  }

  const n = Number(str);
  return Number.isNaN(n) ? null : n;
};

const formatHours = (hours) => {
  if (hours === null || hours === undefined || Number.isNaN(Number(hours))) return "—";
  const minutes = Math.round(Number(hours) * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h && !m) return "0m";
  if (!m) return `${h}h`;
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
};

const getDate = (item) =>
  item?.date ||
  item?.attendance_date ||
  item?.day ||
  item?.created_at?.slice?.(0, 10) ||
  "";

const getStatus = (item) =>
  String(item?.status || item?.attendance_status || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim();

function getAttendanceHours(item) {
  const direct =
    item?.working_hours ??
    item?.total_hours ??
    item?.hours ??
    item?.duration_hours ??
    item?.attendance_hours;

  if (direct !== undefined && direct !== null) return toHours(direct);

  const minutes =
    item?.working_minutes ??
    item?.total_minutes ??
    item?.duration_minutes;

  if (minutes !== undefined && minutes !== null) return Number(minutes) / 60;

  const checkIn =
    item?.check_in || item?.checkin || item?.check_in_time || item?.in_time;

  const checkOut =
    item?.check_out || item?.checkout || item?.check_out_time || item?.out_time;

  if (!checkIn || !checkOut) return null;

  const parseTime = (value) => {
    const str = String(value);
    const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;

    let h = Number(match[1]);
    const m = Number(match[2]);
    const s = Number(match[3] || 0);

    if (str.toLowerCase().includes("pm") && h < 12) h += 12;
    if (str.toLowerCase().includes("am") && h === 12) h = 0;

    return h * 3600 + m * 60 + s;
  };

  const start = parseTime(checkIn);
  const end = parseTime(checkOut);
  if (start === null || end === null) return null;

  return (end >= start ? end - start : end + 86400 - start) / 3600;
}

function normalizeAttendance(item) {
  const date = getDate(item);
  const status = getStatus(item);
  const hours = getAttendanceHours(item);

  const absent = ["absent", "leave", "holiday", "rejected"].includes(status);
  const present = ["present", "half day", "halfday", "completed", "verified"].includes(status);

  const checkIn =
    item?.check_in || item?.checkin || item?.check_in_time || item?.in_time;
  const checkOut =
    item?.check_out || item?.checkout || item?.check_out_time || item?.out_time;

  const isComplete =
    item?.is_complete === true ||
    item?.completed === true ||
    Boolean(checkIn && checkOut) ||
    (hours !== null && hours > 0);

  return {
    ...item,
    date,
    status,
    hours,
    id: item?.attendance_id || item?.id || item?._id || item?.record_id || null,
    absent,
    present,
    isComplete
  };
}

function normalizeLogbook(item) {
  return {
    ...item,
    id: item?.id || item?._id,
    date: getDate(item),
    status: String(item?.status || "draft").toLowerCase(),
    hours: toHours(item?.hours ?? item?.working_hours),
    title: item?.title || item?.activity_title || "",
    description: item?.description || item?.activity_description || "",
    outcomes: item?.outcomes || item?.learning_outcomes || "",
    challenges: item?.challenges || "",
    tools: item?.tools || "",
    skills: item?.skills || "",
    mentor_notes: item?.mentor_notes || item?.feedback || ""
  };
}

const statusStyle = (status) => {
  const s = String(status || "").toLowerCase();

  if (["verified", "approved"].includes(s))
    return "bg-green-50 text-green-700 border-green-200";

  if (["submitted", "pending", "under review"].includes(s))
    return "bg-blue-50 text-blue-700 border-blue-200";

  if (s === "rejected")
    return "bg-red-50 text-red-700 border-red-200";

  return "bg-amber-50 text-amber-700 border-amber-200";
};

const emptyForm = {
  date: "",
  title: "",
  description: "",
  outcomes: "",
  challenges: "",
  tools: "",
  skills: ""
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-xs font-medium text-gray-600";

export default function Logbook() {
  const [month, setMonth] = useState(monthString());
  const [entries, setEntries] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState(emptyForm);

  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logbookUnavailable, setLogbookUnavailable] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const startDate =
    profile?.internship_start_date ||
    profile?.start_date ||
    profile?.internship?.start_date ||
    profile?.joining_date ||
    profile?.date_of_joining ||
    "";

  const loadProfile = async () => {
    try {
      const data = await request("/intern/profile");
      setProfile(data?.profile || data?.student || data?.data || data || {});
    } catch {
      try {
        const data = await request("/intern/dashboard");
        setProfile(data?.profile || data?.student || data?.data || data || {});
      } catch {}
    }
  };

  const loadData = async (selectedMonth = month) => {
    setLoading(true);
    setAttendanceLoading(true);
    setError("");
    setAttendanceError("");
    setLogbookUnavailable(false);

    const [attendanceResult, logbookResult] = await Promise.allSettled([
      request(`/intern/attendance?month=${encodeURIComponent(selectedMonth)}`),
      request(`/intern/logbook?month=${encodeURIComponent(selectedMonth)}`)
    ]);

    if (attendanceResult.status === "fulfilled") {
      const raw =
        attendanceResult.value?.attendance ||
        attendanceResult.value?.records ||
        attendanceResult.value?.data ||
        attendanceResult.value?.items ||
        [];

      setAttendance(Array.isArray(raw) ? raw.map(normalizeAttendance) : []);
    } else {
      setAttendance([]);
      setAttendanceError(attendanceResult.reason?.message || "Attendance unavailable.");
    }

    if (logbookResult.status === "fulfilled") {
      const raw =
        logbookResult.value?.entries ||
        logbookResult.value?.logbook ||
        logbookResult.value?.records ||
        logbookResult.value?.data ||
        logbookResult.value?.items ||
        [];

      setEntries(Array.isArray(raw) ? raw.map(normalizeLogbook) : []);
    } else {
      setEntries([]);
      setLogbookUnavailable(true);
      setError(logbookResult.reason?.message || "Logbook unavailable.");
    }

    setLoading(false);
    setAttendanceLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    loadData(month);
  }, [month]);

  const attendanceMap = useMemo(() => {
    const map = {};
    attendance.forEach((item) => {
      if (item.date) map[item.date] = item;
    });
    return map;
  }, [attendance]);

  const eligibleDates = useMemo(() => {
    return attendance
      .filter((item) => {
        if (!item.date || item.date > today()) return false;
        if (item.date.slice(0, 7) !== month) return false;
        if (startDate && item.date < String(startDate).slice(0, 10)) return false;
        if (item.absent || !item.present || !item.isComplete) return false;
        if (item.hours === null || item.hours <= 0) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, month, startDate]);

  const availableDates = useMemo(() => {
    return eligibleDates.filter((item) => {
      const existing = entries.find((entry) => entry.date === item.date);
      if (!existing) return true;

      return editing &&
        existing.id === editing.id &&
        ["draft", "rejected"].includes(existing.status);
    });
  }, [eligibleDates, entries, editing]);

  const selectedAttendance = form.date ? attendanceMap[form.date] : null;
  const selectedHours = selectedAttendance?.hours ?? null;

  const selectedDateEntry = form.date
    ? entries.find((entry) => entry.date === form.date)
    : null;

  const isDateValid =
    Boolean(selectedAttendance) &&
    selectedAttendance.present &&
    !selectedAttendance.absent &&
    selectedAttendance.isComplete &&
    selectedAttendance.hours > 0 &&
    (!startDate || form.date >= String(startDate).slice(0, 10)) &&
    form.date <= today();

  const stats = useMemo(() => {
    const total = entries.length;
    const verified = entries.filter((e) => e.status === "verified").length;
    const pending = entries.filter((e) => e.status === "submitted").length;
    const rejected = entries.filter((e) => e.status === "rejected").length;
    const totalHours = entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    return { total, verified, pending, rejected, totalHours };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        if (filter !== "all" && entry.status !== filter) return false;

        const text = [
          entry.title, entry.description, entry.outcomes,
          entry.skills, entry.tools, entry.date
        ].join(" ").toLowerCase();

        return text.includes(search.toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, search, filter]);

  const monthDays = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const count = new Date(year, monthNumber, 0).getDate();
    return Array.from({ length: count }, (_, i) =>
      `${year}-${String(monthNumber).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    );
  }, [month]);

  const monthVerifiedDays = entries.filter(e => e.status === "verified").length;
  const monthPendingDays = entries.filter(e => e.status === "submitted").length;
  const monthDraftDays = entries.filter(e => e.status === "draft").length;

  const changeMonth = (direction) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setMonth(monthString(d));
    setForm(emptyForm);
    setEditing(null);
    setFormOpen(false);
  };

  const updateForm = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openNewEntry = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const openEdit = (entry) => {
    if (!["draft", "rejected"].includes(entry.status)) {
      setNotice("Only draft or rejected entries can be edited.");
      return;
    }

    setEditing(entry);
    setForm({
      date: entry.date,
      title: entry.title,
      description: entry.description,
      outcomes: entry.outcomes,
      challenges: entry.challenges,
      tools: entry.tools,
      skills: entry.skills
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const validateForm = () => {
    if (!form.date) return "Please select an attendance date.";
    if (!isDateValid) return "Selected date does not have valid attendance.";
    if (selectedDateEntry && !editing) return "An entry already exists for this date.";
    if (!form.title.trim()) return "Activity title is required.";
    if (!form.description.trim()) return "Activity description is required.";
    if (!form.outcomes.trim()) return "Learning outcomes are required.";
    return "";
  };

  const saveEntry = async (submit = false) => {
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const attendanceRecord = attendanceMap[form.date];

    const payload = {
      date: form.date,
      attendance_id: attendanceRecord?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      outcomes: form.outcomes.trim(),
      challenges: form.challenges.trim(),
      tools: form.tools.trim(),
      skills: form.skills.trim(),
      submit,
      status: submit ? "submitted" : "draft"
    };

    try {
      if (editing) {
        await request(`/intern/logbook/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/intern/logbook", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setNotice(submit ? "Entry submitted successfully." : "Draft saved successfully.");
      closeForm();
      await loadData(month);
    } catch (e) {
      setError(e.message || "Unable to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry) => {
    if (!entry || entry.status !== "draft") return;
    if (!window.confirm("Delete this draft entry?")) return;

    try {
      await request(`/intern/logbook/${entry.id}`, { method: "DELETE" });
      setNotice("Draft deleted successfully.");
      await loadData(month);
    } catch (e) {
      setError(e.message || "Unable to delete entry.");
    }
  };

  const refresh = () => loadData(month);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BookOpen size={16} />
              Internship
              <span>/</span>
              Logbook
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Daily Logbook
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record your daily activities and learning progress.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={openNewEntry}
              disabled={attendanceLoading || Boolean(attendanceError)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={17} />
              New Entry
            </button>
          </div>
        </div>

        {notice && (
          <AlertBox type="success" message={notice} onClose={() => setNotice("")} />
        )}

        {!formOpen && error && (
          <AlertBox type="error" message={error} onClose={() => setError("")} />
        )}

        {logbookUnavailable && (
          <AlertBox
            type="warning"
            message="Logbook API unavailable. No entries are currently loaded."
          />
        )}

        {attendanceError && (
          <AlertBox
            type="error"
            message="Attendance data could not be loaded. New entries are disabled to prevent incorrect dates or hours."
          />
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Entries" value={stats.total} icon={FileText} color="blue" />
          <StatCard label="Verified" value={stats.verified} icon={CheckCircle2} color="green" />
          <StatCard label="Under Review" value={stats.pending} icon={Clock} color="purple" />
          <StatCard label="Logged Hours" value={formatHours(stats.totalHours)} icon={CalendarDays} color="amber" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Activity History</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review your submitted daily activities.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="min-w-[125px] text-center text-sm font-medium text-slate-700">
                  {formatMonth(month)}
                </span>

                <button
                  onClick={() => changeMonth(1)}
                  disabled={month >= monthString()}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search entries..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="animate-spin text-blue-500" size={25} />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <BookOpen size={22} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No logbook entries found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Start recording your daily internship activities.
                </p>
                <button
                  onClick={openNewEntry}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Create Entry
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {formatDate(entry.date)}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyle(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>

                        <h3 className="mt-2 font-semibold text-slate-800">
                          {entry.title || "Untitled Entry"}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                          {entry.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} />
                            {formatHours(entry.hours)}
                          </span>

                          {entry.skills && (
                            <span className="inline-flex items-center gap-1.5">
                              <GraduationCap size={13} />
                              {entry.skills}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setSelected(entry)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                          title="View Entry"
                        >
                          <Eye size={16} />
                        </button>

                        {["draft", "rejected"].includes(entry.status) && (
                          <button
                            onClick={() => openEdit(entry)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            title="Edit Entry"
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        {entry.status === "draft" && (
                          <button
                            onClick={() => deleteEntry(entry)}
                            className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                            title="Delete Draft"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {entry.mentor_notes && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                        <p className="text-[11px] font-medium text-blue-700">
                          Mentor Feedback
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {entry.mentor_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Monthly Overview</h3>
                <CalendarDays size={17} className="text-slate-400" />
              </div>

              <p className="mt-1 text-xs text-slate-500">{formatMonth(month)}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat label="Verified" value={monthVerifiedDays} color="green" />
                <MiniStat label="Pending" value={monthPendingDays} color="blue" />
                <MiniStat label="Drafts" value={monthDraftDays} color="amber" />
                <MiniStat label="Total Hours" value={formatHours(stats.totalHours)} color="slate" />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Entry completion</span>
                  <span>{monthDays.length ? Math.round((entries.length / monthDays.length) * 100) : 0}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(100, monthDays.length ? (entries.length / monthDays.length) * 100 : 0)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Entry Status</h3>

              <div className="mt-4 space-y-3">
                <StatusRow label="Verified" count={stats.verified} color="bg-green-500" />
                <StatusRow label="Under Review" count={stats.pending} color="bg-blue-500" />
                <StatusRow label="Rejected" count={stats.rejected} color="bg-red-500" />
                <StatusRow label="Draft" count={entries.filter(e => e.status === "draft").length} color="bg-amber-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Logbook Guidelines</h3>

              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                <li>• Record activities only for valid attendance days.</li>
                <li>• Working hours are fetched from attendance.</li>
                <li>• Submit meaningful activity details.</li>
                <li>• Drafts can be edited before submission.</li>
                <li>• Submitted entries may require mentor verification.</li>
              </ul>
            </div>

          </div>
        </div>
      </div>

      {formOpen && (
        <EntryFormModal
          form={form}
          setForm={setForm}
          editing={editing}
          availableDates={availableDates}
          selectedAttendance={selectedAttendance}
          selectedHours={selectedHours}
          isDateValid={isDateValid}
          selectedDateEntry={selectedDateEntry}
          attendanceLoading={attendanceLoading}
          attendanceError={attendanceError}
          saving={saving}
          error={error}
          onClose={closeForm}
          onSaveDraft={() => saveEntry(false)}
          onSubmit={() => saveEntry(true)}
        />
      )}

      {selected && (
        <EntryModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function AlertBox({ type, message, onClose }) {
  const styles = {
    success: "border-green-200 bg-green-50 text-green-700",
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800"
  };

  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${styles[type]}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-auto">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-violet-50 text-violet-600",
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

function MiniStat({ label, value, color }) {
  const colors = {
    green: "text-green-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    slate: "text-slate-800"
  };

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function StatusRow({ label, count, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-800">{count}</span>
    </div>
  );
}

function EntryFormModal({
  form,
  setForm,
  editing,
  availableDates,
  selectedAttendance,
  selectedHours,
  isDateValid,
  selectedDateEntry,
  attendanceLoading,
  attendanceError,
  saving,
  error,
  onClose,
  onSaveDraft,
  onSubmit
}) {
  const update = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? "Edit Logbook Entry" : "New Logbook Entry"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {editing ? "Update your activity record" : "Create your daily activity record"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4 p-5 sm:p-6"
        >
          {error && (
            <AlertBox type="error" message={error} />
          )}

          {attendanceError && (
            <AlertBox
              type="error"
              message="Attendance records are unavailable. Entry cannot be created."
            />
          )}

          <div>
            <label className={labelClass}>Attendance Date</label>

            <select
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              disabled={attendanceLoading || Boolean(attendanceError)}
              className={inputClass}
            >
              <option value="">Select attendance date</option>

              {availableDates.map((item) => (
                <option key={item.date} value={item.date}>
                  {formatDate(item.date)} · {formatHours(item.hours)}
                </option>
              ))}

              {editing && form.date && !availableDates.some(d => d.date === form.date) && (
                <option value={form.date}>{formatDate(form.date)} · Existing Entry</option>
              )}
            </select>

            <p className="mt-1.5 text-xs text-slate-500">
              Only valid attendance dates are available.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {attendanceLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={15} className="animate-spin" />
                Loading attendance details...
              </div>
            ) : !form.date ? (
              <div className="text-sm text-slate-500">
                Select a date to automatically load attendance hours.
              </div>
            ) : !isDateValid ? (
              <div className="flex items-start gap-2 text-sm text-amber-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>Attendance is incomplete or invalid for this date.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Attendance</span>
                  <span className="text-sm font-medium text-green-700">Present ✓</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Working Hours</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatHours(selectedHours)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Hours Source</span>
                  <span className="text-xs text-slate-500">Attendance Record</span>
                </div>
              </div>
            )}
          </div>

          {selectedDateEntry && !editing && (
            <AlertBox
              type="warning"
              message="An entry already exists for this date. Duplicate entries are not allowed."
            />
          )}

          <div>
            <label className={labelClass}>Activity Title</label>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Frontend Development"
              maxLength={120}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Activity Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe what you worked on today..."
              rows={4}
              className={`${inputClass} resize-y leading-6`}
            />
          </div>

          <div>
            <label className={labelClass}>Learning Outcomes</label>
            <textarea
              value={form.outcomes}
              onChange={(e) => update("outcomes", e.target.value)}
              placeholder="What did you learn today?"
              rows={3}
              className={`${inputClass} resize-y leading-6`}
            />
          </div>

          <div>
            <label className={labelClass}>Challenges Faced</label>
            <textarea
              value={form.challenges}
              onChange={(e) => update("challenges", e.target.value)}
              placeholder="Any challenges or problems faced?"
              rows={2}
              className={`${inputClass} resize-y leading-6`}
            />
          </div>

          <div>
            <label className={labelClass}>Tools / Technologies</label>
            <input
              value={form.tools}
              onChange={(e) => update("tools", e.target.value)}
              placeholder="e.g. React, Python, VS Code"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Skills Practiced</label>
            <input
              value={form.skills}
              onChange={(e) => update("skills", e.target.value)}
              placeholder="e.g. Problem Solving, UI Design"
              className={inputClass}
            />
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving || !isDateValid || Boolean(selectedDateEntry && !editing)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Draft
            </button>

            <button
              type="submit"
              disabled={saving || !isDateValid || Boolean(selectedDateEntry && !editing)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit for Review
            </button>
          </div>

          <p className="text-center text-[11px] leading-5 text-slate-400">
            Hours are fetched from attendance and cannot be edited manually.
          </p>
        </form>
      </div>
    </div>
  );
}

function EntryModal({ entry, onClose }) {
  const fields = [
    ["Activity Description", entry.description],
    ["Learning Outcomes", entry.outcomes],
    ["Challenges Faced", entry.challenges],
    ["Tools / Technologies", entry.tools],
    ["Skills Practiced", entry.skills]
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{formatDate(entry.date)}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {entry.title || "Untitled Entry"}
            </h2>
            <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${statusStyle(entry.status)}`}>
              {entry.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Attendance-linked Hours</span>
            <span className="text-lg font-bold text-slate-900">{formatHours(entry.hours)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {fields.map(([label, value]) => (
            <div key={label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {value || "Not provided"}
              </p>
            </div>
          ))}
        </div>

        {entry.mentor_notes && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-700">Mentor Feedback</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {entry.mentor_notes}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
