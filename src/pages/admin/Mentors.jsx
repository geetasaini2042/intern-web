import React, { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  designation: "",
  domain: "",
  experience: "",
  qualification: "",
  linkedin: "",
  bio: "",
  status: "active",
};

const getId = (item) => item.id || item._id;

const getMentorName = (mentor) =>
  mentor.name || mentor.full_name || mentor.mentor_name || "Unnamed Mentor";

function generateStrongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  let pass = "";
  for (let i = 0; i < 10; i += 1) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await apiGet("/admin/mentors");
      const list = Array.isArray(res)
        ? res
        : res?.mentors || res?.items || res?.data || [];
      setMentors(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Unable to load mentors.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = mentors.filter((mentor) => {
    const q = search.toLowerCase();
    const matchesSearch =
      getMentorName(mentor).toLowerCase().includes(q) ||
      (mentor.email || "").toLowerCase().includes(q) ||
      (mentor.phone || "").toLowerCase().includes(q) ||
      (mentor.domain || "").toLowerCase().includes(q) ||
      (mentor.designation || "").toLowerCase().includes(q);

    const status = String(mentor.status || "active").toLowerCase();
    const matchesStatus = !statusFilter || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = mentors.filter(
    (m) => String(m.status || "active").toLowerCase() === "active"
  ).length;

  const inactiveCount = mentors.length - activeCount;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (mentor) => {
    setEditing(mentor);
    setForm({
      name: getMentorName(mentor),
      email: mentor.email || "",
      phone: mentor.phone || mentor.mobile || "",
      password: "",
      designation: mentor.designation || "",
      domain: mentor.domain || mentor.expertise || "",
      experience: mentor.experience || "",
      qualification: mentor.qualification || "",
      linkedin: mentor.linkedin || "",
      bio: mentor.bio || "",
      status: String(mentor.status || "active").toLowerCase(),
    });
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGeneratePassword = () => {
    setForm((prev) => ({
      ...prev,
      password: generateStrongPassword(),
    }));
    setShowPassword(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Mentor name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!editing && !form.password.trim()) {
      setError("Password is required for mentor login.");
      return;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      designation: form.designation.trim(),
      domain: form.domain.trim(),
      experience: form.experience.trim(),
      qualification: form.qualification.trim(),
      linkedin: form.linkedin.trim(),
      bio: form.bio.trim(),
      status: form.status,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      if (editing) {
        await apiPut(`/admin/mentors/${getId(editing)}`, payload);
        setNotice("Mentor updated successfully.");
      } else {
        await apiPost("/admin/mentors", payload);
        setNotice("Mentor registered successfully.");
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadMentors();
    } catch (err) {
      setError(err.message || "Unable to save mentor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mentor) => {
    if (!window.confirm(`Delete mentor "${getMentorName(mentor)}"?`)) return;

    try {
      await apiDelete(`/admin/mentors/${getId(mentor)}`);
      setNotice("Mentor deleted successfully.");
      await loadMentors();
    } catch (err) {
      setError(err.message || "Unable to delete mentor.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Mentors
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Register mentors, manage login credentials, and maintain mentor profiles.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Register Mentor
          </button>
        </div>

        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="font-bold">
              ×
            </button>
          </div>
        )}

        {error && !modalOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Mentors" value={mentors.length} color="indigo" />
          <StatCard title="Active Mentors" value={activeCount} color="emerald" />
          <StatCard title="Inactive Mentors" value={inactiveCount} color="slate" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search name, email, phone, domain or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 sm:w-52"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={loadMentors}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">Loading mentors...</p>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600">
              M
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              {search || statusFilter ? "No mentors found" : "No mentors registered yet"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Register a mentor to assign them to internship batches.
            </p>
            {!search && !statusFilter && (
              <button
                onClick={openCreate}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Register Mentor
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Mentor",
                        "Contact",
                        "Domain & Role",
                        "Experience",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredMentors.map((mentor) => (
                      <tr key={getId(mentor)} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {getMentorName(mentor)}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {mentor.qualification || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          <div className="text-slate-800">{mentor.email || "—"}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {mentor.phone || mentor.mobile || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          <div className="font-medium text-slate-800">
                            {mentor.domain || mentor.expertise || "—"}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {mentor.designation || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {mentor.experience || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={mentor.status || "active"} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(mentor)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(mentor)}
                              className="rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
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
            </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredMentors.map((mentor) => (
                <div
                  key={getId(mentor)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {getMentorName(mentor)}
                      </h3>
                      <p className="mt-0.5 text-sm text-indigo-600">
                        {mentor.designation || "Mentor"}
                      </p>
                      {(mentor.domain || mentor.expertise) && (
                        <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {mentor.domain || mentor.expertise}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={mentor.status || "active"} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <InfoBox label="Email" value={mentor.email || "—"} />
                    <InfoBox label="Phone" value={mentor.phone || mentor.mobile || "—"} />
                    <InfoBox label="Experience" value={mentor.experience || "—"} />
                    <InfoBox label="Qualification" value={mentor.qualification || "—"} />
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(mentor)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(mentor)}
                      className="flex-1 rounded-xl border border-red-100 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "Edit Mentor" : "Register Mentor"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editing
                    ? "Update mentor profile or reset login password"
                    : "Create mentor account with login credentials"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address (Login ID) *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="mentor@singodiya.tech"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Login Password {editing ? "(Optional)" : "*"}
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <KeyRound size={13} />
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required={!editing}
                      placeholder={editing ? "Leave blank to keep current" : "Minimum 6 characters"}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-3.5 pr-10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Designation / Role
                  </label>
                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="e.g. Senior Full-Stack Developer"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Domain / Expertise
                  </label>
                  <input
                    name="domain"
                    value={form.domain}
                    onChange={handleChange}
                    placeholder="e.g. Web Development, Python, AI"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Experience
                  </label>
                  <input
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    placeholder="e.g. 5 Years"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Qualification
                  </label>
                  <input
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    placeholder="e.g. B.Tech CSE, MCA"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    LinkedIn / Portfolio URL
                  </label>
                  <input
                    type="url"
                    name="linkedin"
                    value={form.linkedin}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Account Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Short Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief background about the mentor..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Register Mentor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-200 text-slate-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <div className={`mt-3 h-1 w-12 rounded-full ${colors[color]}`} />
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status).toLowerCase();
  const isActive = normalized === "active";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
