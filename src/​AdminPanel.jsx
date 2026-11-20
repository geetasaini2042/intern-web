import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  RefreshCw,
  Loader2,
  KeyRound,
  LogOut,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import { API } from "./lib/api";
const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  domain: "",
  batch: "",
  start_date: "",
  end_date: "",
  mentor: "",
  mentor_email: "",
};

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState(
    () => sessionStorage.getItem("singodiya_admin_key") || ""
  );
  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(
    () => Boolean(sessionStorage.getItem("singodiya_admin_key"))
  );

  const [form, setForm] = useState(initialForm);
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);

  const [interns, setInterns] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchInterns = async (keyToUse = adminKey) => {
    if (!keyToUse) return;
    setLoadingList(true);
    setError("");

    try {
      const res = await fetch(`${API}/admin/interns`, {
        headers: { "x-admin-key": keyToUse },
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        sessionStorage.removeItem("singodiya_admin_key");
        setUnlocked(false);
        setAdminKey("");
        throw new Error("Invalid admin key.");
      }

      if (!res.ok) {
        throw new Error(data.detail || "Unable to load interns.");
      }

      setInterns(data.interns || []);
      setUnlocked(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (unlocked && adminKey) {
      fetchInterns(adminKey);
    }
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setError("Please enter the admin key.");
      return;
    }
    sessionStorage.setItem("singodiya_admin_key", trimmed);
    setAdminKey(trimmed);
    await fetchInterns(trimmed);
  };

  const handleLock = () => {
    sessionStorage.removeItem("singodiya_admin_key");
    setAdminKey("");
    setKeyInput("");
    setUnlocked(false);
    setInterns([]);
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pass }));
    setShowPass(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Name, Email, and Password are required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API}/admin/create-intern`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to create intern.");
      }

      setSuccess(`Intern created: ${data.email}`);
      setForm(initialForm);
      fetchInterns(adminKey);
    } catch (err) {
      setError(err.message || "Unable to create intern.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Delete intern account (${email})?`)) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/admin/interns/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Delete failed.");
      }

      setInterns((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Intern deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete intern.");
    } finally {
      setDeletingId("");
    }
  };

  const filteredInterns = interns.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(q) ||
      (item.email || "").toLowerCase().includes(q) ||
      (item.domain || "").toLowerCase().includes(q) ||
      (item.batch || "").toLowerCase().includes(q)
    );
  });

  // --- एडमिन की लॉक स्क्रीन ---
  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">Singodiya Technologies</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Admin Secret Key
              </label>
              <div className="relative">
                <KeyRound
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter x-admin-key"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingList}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loadingList ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                "Unlock Admin Panel"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- मुख्य एडमिन डैशबोर्ड ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Intern Account Manager
              </h1>
              <p className="text-xs text-slate-500">
                Create & manage intern login credentials
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInterns(adminKey)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={handleLock}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <LogOut size={14} />
              Lock
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Create Intern Form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
            <div className="mb-5 flex items-center gap-2.5">
              <UserPlus size={19} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Create New Intern</h2>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Full Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Manish Kumar"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="intern@example.com"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Sparkles size={12} />
                    Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-10 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Domain
                  </label>
                  <input
                    name="domain"
                    value={form.domain}
                    onChange={handleChange}
                    placeholder="Web Development"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Batch
                  </label>
                  <input
                    name="batch"
                    value={form.batch}
                    onChange={handleChange}
                    placeholder="Nov 2026"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Mentor Name
                  </label>
                  <input
                    name="mentor"
                    value={form.mentor}
                    onChange={handleChange}
                    placeholder="Mentor name"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Create Intern Account
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Interns List */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users size={19} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-900">
                  All Interns ({filteredInterns.length})
                </h2>
              </div>

              <div className="relative w-full sm:w-60">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, domain..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {loadingList ? (
              <div className="flex py-16 items-center justify-center">
                <Loader2 size={26} className="animate-spin text-indigo-600" />
              </div>
            ) : filteredInterns.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No interns found.
              </p>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {filteredInterns.map((intern) => (
                  <div
                    key={intern.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {intern.name || "Unnamed Intern"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {intern.email}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {intern.domain && (
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {intern.domain}
                          </span>
                        )}
                        {intern.batch && (
                          <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[11px] text-slate-600">
                            {intern.batch}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(intern.id, intern.email)}
                      disabled={deletingId === intern.id}
                      className="shrink-0 rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Delete Intern"
                    >
                      {deletingId === intern.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
