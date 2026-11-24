import React, { useEffect, useRef, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  ShieldCheck,
  Save,
  Loader2,
  RefreshCw,
  Award,
  Lock,
  Image as ImageIcon,
  Upload,
  Trash2,
  Users,
  X
} from "lucide-react";

import { API } from "./lib/api";

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  college: "",
  course: "",
  year: "",
  enrollment: "",
  domain: "",
  batch: "",
  start_date: "",
  end_date: "",
  mentor: "",
  mentor_email: "",
  profile_image: "",
  bio: ""
};

// केवल ये फ़ील्ड्स स्टूडेंट भर सकता है (वह भी तब जब ये खाली हों)
const STUDENT_FILLABLE_FIELDS = [
  "phone",
  "dob",
  "gender",
  "city",
  "state",
  "address",
  "college",
  "course",
  "year",
  "enrollment",
  "bio"
];

const LOGO_MAX_MB = 3;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function getToken() {
  return localStorage.getItem("intern_token") || localStorage.getItem("access_token");
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  const detail = data.message || data.detail;
  return typeof detail === "string" && detail ? detail : fallback;
}

function isEmpty(value) {
  return !value || !value.toString().trim();
}

function normalizeProfile(data) {
  const p = data?.profile || data?.student || data?.data || data || {};
  return {
    ...emptyProfile,
    ...p,
    name: p.name || p.full_name || p.student_name || "",
    email: p.email || p.student_email || "",
    phone: p.phone || p.mobile || p.phone_number || "",
    college: p.college || p.college_name || "",
    course: p.course || p.degree || "",
    domain: p.domain || p.internship_domain || "",
    enrollment: p.enrollment || p.enrollment_number || p.roll_number || "",
    start_date: p.start_date || p.internship_start || "",
    end_date: p.end_date || p.internship_end || "",
    mentor: p.mentor || p.mentor_name || "",
    profile_image: p.profile_image || p.avatar || p.photo || "",
    address: p.address || "",
    city: p.city || "",
    state: p.state || "",
    bio: p.bio || ""
  };
}

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function Field({
  label,
  value,
  displayValue,
  icon: Icon,
  canFill,
  name,
  onChange,
  type = "text",
  options
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        {canFill && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            Required / Fillable
          </span>
        )}
      </div>

      <div
        className={`flex min-h-[46px] items-center gap-3 rounded-xl border px-3.5 ${
          canFill
            ? "border-indigo-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        {Icon && <Icon size={17} className="shrink-0 text-slate-400" />}

        {canFill ? (
          options ? (
            <select
              name={name}
              value={value || ""}
              onChange={onChange}
              className="w-full bg-transparent py-2 text-sm text-slate-800 outline-none"
            >
              <option value="">Select {label}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              name={name}
              value={value || ""}
              onChange={onChange}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="w-full bg-transparent py-2 text-sm text-slate-800 outline-none"
            />
          )
        ) : (
          <p className="break-all py-2 text-sm font-medium text-slate-800">
            {displayValue || value || "Not specified"}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, badge, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Lock size={12} />
            {badge}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
        {children}
      </div>
    </section>
  );
}

// College / University logo: add, update, remove, ya classmate se copy
function LogoSection() {
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showClassmates, setShowClassmates] = useState(false);
  const [classmates, setClassmates] = useState([]);
  const [classmatesLoading, setClassmatesLoading] = useState(false);
  const [classmatesNote, setClassmatesNote] = useState("");
  const [copyingId, setCopyingId] = useState("");

  const fileInputRef = useRef(null);

  const fetchLogo = async () => {
    try {
      const res = await fetch(`${API}/intern/tasks/report/logo`, {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error("Unable to load logo.");
      const data = await res.json();
      setLogo(data.has_logo ? data.logo : "");
    } catch (err) {
      setError(err.message || "Unable to load logo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogo();
  }, []);

  // object URL cleanup
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearPending = () => {
    setPendingFile(null);
    setPreviewUrl("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setMessage("");

    if (file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) {
      setError("Only PNG files are allowed.");
      return;
    }

    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      setError(`Logo must be smaller than ${LOGO_MAX_MB} MB.`);
      return;
    }

    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!PNG_SIGNATURE.every((byte, i) => header[i] === byte)) {
      setError("This file is not a valid PNG image.");
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveLogo = async () => {
    if (!pendingFile) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      const res = await fetch(`${API}/intern/tasks/report/logo`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });

      if (!res.ok) throw new Error(await readError(res, "Logo upload failed."));

      clearPending();
      await fetchLogo();
      setMessage("Logo saved successfully.");
    } catch (err) {
      setError(err.message || "Logo upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm("Remove your college logo?")) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API}/intern/tasks/report/logo`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!res.ok) throw new Error(await readError(res, "Unable to remove logo."));

      setLogo("");
      clearPending();
      setMessage("Logo removed.");
    } catch (err) {
      setError(err.message || "Unable to remove logo.");
    } finally {
      setBusy(false);
    }
  };

  const toggleClassmates = async () => {
    if (showClassmates) {
      setShowClassmates(false);
      return;
    }

    setShowClassmates(true);
    setClassmatesLoading(true);
    setClassmatesNote("");
    setError("");

    try {
      const res = await fetch(`${API}/intern/tasks/report/logo/classmates`, {
        headers: authHeaders()
      });

      if (!res.ok) throw new Error(await readError(res, "Unable to load classmates."));

      const data = await res.json();
      setClassmates(data.students || []);

      if (data.reason === "college_missing") {
        setClassmatesNote("Add your college name first, then you can copy a logo from a classmate.");
      } else if (!data.students?.length) {
        setClassmatesNote("No student from your college has added a logo yet.");
      }
    } catch (err) {
      setError(err.message || "Unable to load classmates.");
      setShowClassmates(false);
    } finally {
      setClassmatesLoading(false);
    }
  };

  const copyFromClassmate = async (student) => {
    setCopyingId(student.id);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API}/intern/tasks/report/logo/copy`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ student_id: student.id })
      });

      if (!res.ok) throw new Error(await readError(res, "Unable to copy logo."));

      clearPending();
      await fetchLogo();
      setShowClassmates(false);
      setMessage(`Logo copied from ${student.name}.`);
    } catch (err) {
      setError(err.message || "Unable to copy logo.");
    } finally {
      setCopyingId("");
    }
  };

  const shownImage = previewUrl || logo;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ImageIcon size={19} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">College / University Logo</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Shown on your internship report cover and page headers
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
            {loading ? (
              <Loader2 size={22} className="animate-spin text-slate-400" />
            ) : shownImage ? (
              <img
                src={shownImage}
                alt="College logo"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="px-3 text-center text-xs text-slate-400">No logo added</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              onChange={handleFileChange}
              className="hidden"
            />

            {pendingFile ? (
              <>
                <p className="truncate text-sm font-medium text-slate-800">{pendingFile.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Preview only. Click Save Logo to use it in your report.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveLogo}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {busy ? "Saving..." : "Save Logo"}
                  </button>
                  <button
                    onClick={clearPending}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <X size={15} />
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Upload a PNG file, up to {LOGO_MAX_MB} MB. A square logo with a transparent
                  background looks best.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <Upload size={15} />
                    {logo ? "Update Logo" : "Upload PNG Logo"}
                  </button>

                  <button
                    onClick={toggleClassmates}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Users size={15} />
                    Copy from classmate
                  </button>

                  {logo && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {showClassmates && !pendingFile && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Logos from students of your college
              </h3>
              <button
                onClick={() => setShowClassmates(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {classmatesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-indigo-600" />
              </div>
            ) : classmates.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">
                {classmatesNote || "No logos available."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {classmates.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                      <img
                        src={student.logo}
                        alt={`${student.name}'s college logo`}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {student.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{student.college}</p>
                    </div>

                    <button
                      onClick={() => copyFromClassmate(student)}
                      disabled={Boolean(copyingId)}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {copyingId === student.id ? "Copying..." : "Use this"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/intern/profile`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!res.ok) throw new Error("Unable to load profile.");

      const data = await res.json();
      const normalized = normalizeProfile(data);

      setProfile(normalized);
      setForm(normalized);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // चेक करता है कि क्या यह फ़ील्ड स्टूडेंट भर सकता है (अनुमति हो और पहले से खाली हो)
  const canStudentFill = (fieldName) => {
    return STUDENT_FILLABLE_FIELDS.includes(fieldName) && isEmpty(profile[fieldName]);
  };

  // कौन-कौन से स्टूडेंट फ़ील्ड्स अभी भरे गए हैं जिन्हें सेव करना है
  const filledUpdates = STUDENT_FILLABLE_FIELDS.reduce((acc, key) => {
    if (isEmpty(profile[key]) && !isEmpty(form[key])) {
      acc[key] = form[key].toString().trim();
    }
    return acc;
  }, {});

  const hasEmptyStudentFields = STUDENT_FILLABLE_FIELDS.some((key) => isEmpty(profile[key]));
  const hasUnsavedChanges = Object.keys(filledUpdates).length > 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!canStudentFill(name)) return;
    setSuccess("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/intern/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        // केवल स्टूडेंट द्वारा भरे गए नए फ़ील्ड्स ही भेजें (एडमिन फ़ील्ड्स नहीं)
        body: JSON.stringify(filledUpdates)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Profile update failed.");
      }

      const updated = normalizeProfile(data.profile || data.data || { ...profile, ...filledUpdates });
      setProfile(updated);
      setForm(updated);
      setSuccess("Missing details saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save details.");
    } finally {
      setSaving(false);
    }
  };

  const completionFields = [
    "name",
    "email",
    "phone",
    "dob",
    "college",
    "course",
    "domain",
    "enrollment",
    "mentor"
  ];

  const completedFields = completionFields.filter((key) => !isEmpty(profile[key])).length;
  const completion = Math.round((completedFields / completionFields.length) * 100);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={fetchProfile} className="shrink-0 font-semibold">
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 sm:h-40" />

        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-indigo-100 shadow-md sm:h-28 sm:w-28">
                {profile.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-indigo-700">
                    {(profile.name || "I").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {profile.name || "Intern"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {profile.domain || "Internship Student"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <ShieldCheck size={13} />
                    Intern Account
                  </span>
                  {profile.batch && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {profile.batch}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasEmptyStudentFields && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {saving ? "Saving..." : "Save Missing Details"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Mail size={18} className="text-indigo-500" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Email Address</p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {profile.email || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Phone size={18} className="text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Mobile Number</p>
                <p className="text-sm font-medium text-slate-800">
                  {profile.phone || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <BriefcaseBusiness size={18} className="text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Internship Domain</p>
                <p className="text-sm font-medium text-slate-800">
                  {profile.domain || "Not assigned"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Personal Information"
            subtitle="Empty fields can be filled once by you"
            icon={User}
          >
            <Field label="Full Name" name="name" value={profile.name} icon={User} canFill={false} />
            <Field label="Email Address" name="email" value={profile.email} icon={Mail} canFill={false} />
            <Field
              label="Phone Number"
              name="phone"
              value={form.phone}
              icon={Phone}
              canFill={canStudentFill("phone")}
              onChange={handleChange}
            />
            <Field
              label="Date of Birth"
              name="dob"
              value={form.dob}
              displayValue={formatDate(profile.dob)}
              icon={CalendarDays}
              canFill={canStudentFill("dob")}
              onChange={handleChange}
              type="date"
            />
            <Field
              label="Gender"
              name="gender"
              value={form.gender}
              icon={User}
              canFill={canStudentFill("gender")}
              onChange={handleChange}
              options={["Male", "Female", "Other", "Prefer not to say"]}
            />
            <Field
              label="City"
              name="city"
              value={form.city}
              icon={MapPin}
              canFill={canStudentFill("city")}
              onChange={handleChange}
            />
            <Field
              label="State"
              name="state"
              value={form.state}
              icon={MapPin}
              canFill={canStudentFill("state")}
              onChange={handleChange}
            />
            <Field
              label="Address"
              name="address"
              value={form.address}
              icon={MapPin}
              canFill={canStudentFill("address")}
              onChange={handleChange}
            />
          </Section>

          <Section
            title="Academic Information"
            subtitle="Your college and educational details"
            icon={GraduationCap}
          >
            <Field
              label="College / University"
              name="college"
              value={form.college}
              icon={Building2}
              canFill={canStudentFill("college")}
              onChange={handleChange}
            />
            <Field
              label="Course / Degree"
              name="course"
              value={form.course}
              icon={GraduationCap}
              canFill={canStudentFill("course")}
              onChange={handleChange}
            />
            <Field
              label="Academic Year"
              name="year"
              value={form.year}
              icon={CalendarDays}
              canFill={canStudentFill("year")}
              onChange={handleChange}
            />
            <Field
              label="Enrollment / Roll Number"
              name="enrollment"
              value={form.enrollment}
              icon={ShieldCheck}
              canFill={canStudentFill("enrollment")}
              onChange={handleChange}
            />
          </Section>

          <LogoSection />

          <Section
            title="Internship Information"
            subtitle="Assigned by your admin or mentor"
            icon={BriefcaseBusiness}
            badge="Admin Managed"
          >
            <Field label="Internship Domain" name="domain" value={profile.domain} icon={BriefcaseBusiness} canFill={false} />
            <Field label="Batch" name="batch" value={profile.batch} icon={Award} canFill={false} />
            <Field
              label="Start Date"
              name="start_date"
              value={formatDate(profile.start_date)}
              icon={CalendarDays}
              canFill={false}
            />
            <Field
              label="End Date"
              name="end_date"
              value={formatDate(profile.end_date)}
              icon={CalendarDays}
              canFill={false}
            />
            <Field label="Mentor Name" name="mentor" value={profile.mentor} icon={User} canFill={false} />
            <Field label="Mentor Email" name="mentor_email" value={profile.mentor_email} icon={Mail} canFill={false} />
          </Section>

          <Section title="About Me" subtitle="A short introduction" icon={User}>
            <div className="sm:col-span-2">
              {canStudentFill("bio") ? (
                <textarea
                  name="bio"
                  value={form.bio || ""}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Write a short introduction about yourself..."
                  className="w-full resize-y rounded-xl border border-indigo-300 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="text-sm leading-7 text-slate-600">
                  {profile.bio || "No introduction added."}
                </p>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Profile Completion</h3>
            <p className="mt-1 text-sm text-slate-500">Complete your missing details</p>

            <div className="mt-5 flex items-center justify-center">
              <div
                className="relative flex h-36 w-36 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#4f46e5 ${completion}%, #e2e8f0 ${completion}% 100%)`
                }}
              >
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-3xl font-bold text-slate-900">{completion}%</span>
                  <span className="text-xs text-slate-500">Complete</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {completionFields.map((key) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">{key.replace(/_/g, " ")}</span>
                  {!isEmpty(profile[key]) ? (
                    <span className="text-emerald-600">Completed</span>
                  ) : (
                    <span className="text-amber-600">Missing</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Internship Timeline</h3>
            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Internship Started</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(profile.start_date)}</p>
                </div>
              </div>
              <div className="ml-1.5 h-5 border-l-2 border-dashed border-slate-200" />
              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Expected Completion</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(profile.end_date)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
            <div className="flex gap-3">
              <ShieldCheck className="shrink-0 text-indigo-600" size={21} />
              <div>
                <h3 className="text-sm font-semibold text-indigo-900">Account Information</h3>
                <p className="mt-2 text-xs leading-5 text-indigo-700">
                  Only missing personal or academic details can be filled here. For any correction in internship or locked details, please contact your admin or mentor. Your college logo can be added or changed any time.
                </p>
              </div>
            </div>
          </section>

          <button
            onClick={fetchProfile}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Refresh Profile
          </button>
        </div>
      </div>
    </div>
  );
}
