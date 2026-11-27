import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Linkedin,
  LockKeyhole,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ShieldCheck
} from "lucide-react";
import { API } from "../../lib/api";

const EMPTY_PROFILE = {
  name: "",
  email: "",
  phone: "",
  designation: "",
  domain: "",
  experience: "",
  qualification: "",
  linkedin: "",
  bio: "",
  status: "active",
  assigned_batches_count: 0,
  created_at: ""
};

const EMPTY_PASSWORD = {
  current_password: "",
  new_password: "",
  confirm_password: ""
};

function getMentorToken() {
  return localStorage.getItem("mentor_token") || "";
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

export default function MentorProfile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setProfileError("");

    try {
      const res = await fetch(`${API}/mentor/profile`, {
        headers: {
          Authorization: `Bearer ${getMentorToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to load profile.");
      }

      const mentor = data.mentor || data;
      const merged = {
        ...EMPTY_PROFILE,
        ...mentor,
        assigned_batches_count:
          data.assigned_batches_count ?? mentor.assigned_batches_count ?? 0
      };
      setProfile(merged);
      localStorage.setItem("mentor_profile", JSON.stringify(merged));
    } catch (err) {
      setProfileError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileNotice("");

    if (!profile.name.trim()) {
      setProfileError("Full name is required.");
      return;
    }

    setSavingProfile(true);

    try {
      const res = await fetch(`${API}/mentor/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: profile.name.trim(),
          phone: (profile.phone || "").trim(),
          designation: (profile.designation || "").trim(),
          domain: (profile.domain || "").trim(),
          experience: (profile.experience || "").trim(),
          qualification: (profile.qualification || "").trim(),
          linkedin: (profile.linkedin || "").trim(),
          bio: (profile.bio || "").trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to update profile.");
      }

      const updated = {
        ...profile,
        ...(data.mentor || {})
      };
      setProfile(updated);
      localStorage.setItem("mentor_profile", JSON.stringify(updated));
      setProfileNotice("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message || "Update failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordNotice("");

    if (!passwordForm.current_password) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch(`${API}/mentor/profile/password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getMentorToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to change password.");
      }

      setPasswordForm(EMPTY_PASSWORD);
      setPasswordNotice("Password updated successfully.");
    } catch (err) {
      setPasswordError(err.message || "Password update failed.");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (profile.name || "M")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-600" size={30} />
          <p className="mt-3 text-sm text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-[#101b35] via-[#172554] to-[#1e3a8a]" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-indigo-600 text-2xl font-bold text-white shadow-md">
                {initials || "M"}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile.name || "Mentor"}
                </h2>
                <p className="text-sm text-slate-500">
                  {profile.designation || "Internship Mentor"}
                  {profile.domain ? ` · ${profile.domain}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                <ShieldCheck size={13} />
                {profile.status || "active"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Layers size={13} />
                {profile.assigned_batches_count} Batches
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400" />
              <span className="truncate">{profile.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400" />
              <span>{profile.phone || "No phone added"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-slate-400" />
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <User size={18} className="text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900">Profile Details</h3>
              <p className="text-xs text-slate-500">
                Update your personal and professional information
              </p>
            </div>
          </div>

          {profileNotice && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{profileNotice}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full Name *
                </label>
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Login Email (Read-only)
                </label>
                <input
                  value={profile.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Designation / Role
                </label>
                <input
                  name="designation"
                  value={profile.designation}
                  onChange={handleProfileChange}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Domain / Expertise
                </label>
                <input
                  name="domain"
                  value={profile.domain}
                  onChange={handleProfileChange}
                  placeholder="e.g. Web Development, Python"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Experience
                </label>
                <input
                  name="experience"
                  value={profile.experience}
                  onChange={handleProfileChange}
                  placeholder="e.g. 5 Years"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Qualification
                </label>
                <div className="relative">
                  <GraduationCap
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="qualification"
                    value={profile.qualification}
                    onChange={handleProfileChange}
                    placeholder="e.g. B.Tech CSE, MCA"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  LinkedIn / Portfolio URL
                </label>
                <div className="relative">
                  <Linkedin
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="url"
                    name="linkedin"
                    value={profile.linkedin}
                    onChange={handleProfileChange}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Short Bio
              </label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleProfileChange}
                rows={3}
                placeholder="Brief introduction about your mentoring experience..."
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <LockKeyhole size={18} className="text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900">Change Password</h3>
              <p className="text-xs text-slate-500">
                Keep your mentor account secure
              </p>
            </div>
          </div>

          {passwordNotice && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{passwordNotice}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  name="current_password"
                  value={passwordForm.current_password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-3.5 pr-10 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-3.5 pr-10 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm New Password *
              </label>
              <input
                type={showNew ? "text" : "password"}
                name="confirm_password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordChange}
                required
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {savingPassword ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LockKeyhole size={15} />
              )}
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
