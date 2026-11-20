
import React, { useEffect, useState } from "react";
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
  Pencil,
  Save,
  X,
  Loader2,
  RefreshCw,
  Camera,
  Award,
  Clock3
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

function getToken() {
  return localStorage.getItem("intern_token") || localStorage.getItem("access_token");
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

function Field({ label, value, icon: Icon, editing, name, onChange, type = "text", options }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5">
        {Icon && <Icon size={17} className="shrink-0 text-slate-400" />}
        {editing ? (
          options ? (
            <select
              name={name}
              value={value || ""}
              onChange={onChange}
              className="w-full bg-transparent py-2 text-sm text-slate-800 outline-none"
            >
              <option value="">Select {label}</option>
              {options.map(option => (
                <option key={option} value={option}>{option}</option>
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
            {value || "Not specified"}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon size={19} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
        {children}
      </div>
    </section>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const headers = {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json"
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/intern/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(form)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Profile update failed.");
      }

      const updated = normalizeProfile(data.profile || data.data || form);
      setProfile(updated);
      setForm(updated);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm(profile);
    setEditing(false);
    setError("");
  };

  const fields = [
    "name", "email", "phone", "college", "course",
    "domain", "enrollment", "mentor"
  ];

  const completedFields = fields.filter(key => profile[key]?.toString().trim()).length;
  const completion = Math.round((completedFields / fields.length) * 100);

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
                <div className="absolute bottom-1 right-1 rounded-full bg-white p-1 text-slate-500 shadow">
                  <Camera size={13} />
                </div>
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

            <div className="flex gap-2">
              {!editing ? (
                <button
                  onClick={() => {
                    setEditing(true);
                    setSuccess("");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <Pencil size={15} />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <X size={15} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Mail size={18} className="text-indigo-500" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Email Address</p>
                <p className="truncate text-sm font-medium text-slate-800">{profile.email || "Not specified"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Phone size={18} className="text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Mobile Number</p>
                <p className="text-sm font-medium text-slate-800">{profile.phone || "Not specified"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <BriefcaseBusiness size={18} className="text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Internship Domain</p>
                <p className="text-sm font-medium text-slate-800">{profile.domain || "Not assigned"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">

          <Section
            title="Personal Information"
            subtitle="Your personal and contact details"
            icon={User}
          >
            <Field label="Full Name" name="name" value={form.name} icon={User} editing={editing} onChange={handleChange} />
            <Field label="Email Address" name="email" value={form.email} icon={Mail} editing={editing} onChange={handleChange} type="email" />
            <Field label="Phone Number" name="phone" value={form.phone} icon={Phone} editing={editing} onChange={handleChange} />
            <Field label="Date of Birth" name="dob" value={form.dob} icon={CalendarDays} editing={editing} onChange={handleChange} type="date" />
            <Field label="Gender" name="gender" value={form.gender} icon={User} editing={editing} onChange={handleChange} options={["Male", "Female", "Other", "Prefer not to say"]} />
            <Field label="City" name="city" value={form.city} icon={MapPin} editing={editing} onChange={handleChange} />
            <Field label="State" name="state" value={form.state} icon={MapPin} editing={editing} onChange={handleChange} />
            <Field label="Address" name="address" value={form.address} icon={MapPin} editing={editing} onChange={handleChange} />
          </Section>

          <Section
            title="Academic Information"
            subtitle="Your college and educational details"
            icon={GraduationCap}
          >
            <Field label="College / University" name="college" value={form.college} icon={Building2} editing={editing} onChange={handleChange} />
            <Field label="Course / Degree" name="course" value={form.course} icon={GraduationCap} editing={editing} onChange={handleChange} />
            <Field label="Academic Year" name="year" value={form.year} icon={CalendarDays} editing={editing} onChange={handleChange} />
            <Field label="Enrollment / Roll Number" name="enrollment" value={form.enrollment} icon={ShieldCheck} editing={editing} onChange={handleChange} />
          </Section>

          <Section
            title="Internship Information"
            subtitle="Your assigned internship program"
            icon={BriefcaseBusiness}
          >
            <Field label="Internship Domain" name="domain" value={form.domain} icon={BriefcaseBusiness} editing={editing} onChange={handleChange} />
            <Field label="Batch" name="batch" value={form.batch} icon={Award} editing={editing} onChange={handleChange} />
            <Field label="Start Date" name="start_date" value={form.start_date} icon={CalendarDays} editing={editing} onChange={handleChange} type="date" />
            <Field label="End Date" name="end_date" value={form.end_date} icon={CalendarDays} editing={editing} onChange={handleChange} type="date" />
            <Field label="Mentor Name" name="mentor" value={form.mentor} icon={User} editing={editing} onChange={handleChange} />
            <Field label="Mentor Email" name="mentor_email" value={form.mentor_email} icon={Mail} editing={editing} onChange={handleChange} type="email" />
          </Section>

          <Section
            title="About Me"
            subtitle="A short introduction"
            icon={User}
          >
            <div className="sm:col-span-2">
              {editing ? (
                <textarea
                  name="bio"
                  value={form.bio || ""}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Write a short introduction about yourself..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400"
                />
              ) : (
                <p className="text-sm leading-7 text-slate-600">
                  {profile.bio || "No introduction added yet."}
                </p>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Profile Completion</h3>
            <p className="mt-1 text-sm text-slate-500">Complete your profile information</p>

            <div className="mt-5 flex items-center justify-center">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full"
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
              {fields.map(key => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">{key.replace(/_/g, " ")}</span>
                  {profile[key] ? (
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
                  Your profile details are used for internship records, mentor communication and certificate generation.
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
