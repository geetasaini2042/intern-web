import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { API } from "./lib/api";

const ADMIN_EMAIL = "admin@st.tech";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    () => localStorage.getItem("intern_email") || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      if (cleanEmail === ADMIN_EMAIL) {
        const res = await fetch(`${API}/admin/certificates`, {
          method: "GET",
          headers: {
            "X-Admin-Key": password,
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? "Invalid admin password."
              : data.detail || "Admin verification failed."
          );
        }

        localStorage.setItem("admin_token", password);
        localStorage.setItem("admin_email", ADMIN_EMAIL);

        localStorage.removeItem("intern_token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("intern_user");
        localStorage.removeItem("intern_profile");

        if (remember) {
          localStorage.setItem("intern_email", cleanEmail);
        } else {
          localStorage.removeItem("intern_email");
        }

        navigate("/admin", { replace: true });
        return;
      }

      const res = await fetch(`${API}/intern/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.detail || data.message || "Invalid email or password."
        );
      }

      if (!data.access_token) {
        throw new Error("Authentication token not received.");
      }

      localStorage.setItem("intern_token", data.access_token);

      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_email");

      if (data.profile) {
        localStorage.setItem(
          "intern_profile",
          JSON.stringify(data.profile)
        );
      }

      if (remember) {
        localStorage.setItem("intern_email", cleanEmail);
      } else {
        localStorage.removeItem("intern_email");
      }

      navigate("/dash", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f5f7fb] flex flex-col lg:flex-row">

      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] bg-[#101b35] relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-white">

        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full border border-white/5" />
        <div className="absolute -top-24 -left-24 w-[350px] h-[350px] rounded-full border border-white/5" />
        <div className="absolute bottom-[-180px] right-[-150px] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Singodiya Technologies"
            className="w-14 h-14 object-contain rounded-xl bg-white p-1.5"
          />

          <div>
            <h2 className="text-lg font-bold tracking-wide">
              Singodiya Technologies
            </h2>
            <p className="text-xs text-slate-400 tracking-[2px] mt-1">
              TECHNOLOGY · TRAINING · CAREER
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 border border-blue-400/20 bg-blue-400/10 px-3 py-2 rounded-full mb-7">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs font-medium text-blue-200">
              Internship Portal
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.2] tracking-tight">
            Build your skills.
            <br />
            <span className="text-blue-400">Shape your future.</span>
          </h1>

          <p className="mt-6 text-slate-400 text-base xl:text-lg leading-8 max-w-md">
            Welcome to your internship workspace. Access your training,
            assignments, progress, and professional learning resources
            from one place.
          </p>

          <div className="mt-10 space-y-5">
            {[
              "Track your internship progress",
              "Access tasks and learning resources",
              "Stay connected with your training program",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-blue-400" />
                </div>
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} Singodiya Technologies. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">

        <div className="w-full max-w-[440px]">

          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <img
              src="/logo.png"
              alt="Singodiya Technologies"
              className="w-12 h-12 object-contain rounded-xl bg-white p-1 shadow-sm"
            />

            <div>
              <h2 className="text-base font-bold text-[#14213d]">
                Singodiya Technologies
              </h2>
              <p className="text-[10px] tracking-[1.8px] text-slate-500 mt-1">
                TECHNOLOGY · TRAINING · CAREER
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-[0_15px_60px_-20px_rgba(15,23,42,0.12)] p-6 sm:p-9">

            <div className="mb-8">
              <div className="text-xs font-bold tracking-[2px] uppercase text-blue-600 mb-3">
                {isAdminEmail ? "Admin Portal" : "Intern Portal"}
              </div>

              <h1 className="text-2xl sm:text-[30px] font-bold text-[#14213d] tracking-tight">
                Welcome back
              </h1>

              <p className="text-sm text-slate-500 mt-2 leading-6">
                {isAdminEmail
                  ? "Sign in to access the administration dashboard."
                  : "Sign in to continue to your internship dashboard."}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    autoComplete="username"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  {isAdminEmail ? "Admin Key" : "Password"}
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder={
                      isAdminEmail
                        ? "Enter admin key"
                        : "Enter your password"
                    }
                    autoComplete="current-password"
                    className="w-full h-12 pl-11 pr-12 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                  />

                  <span className="text-xs sm:text-sm text-slate-600">
                    Remember me
                  </span>
                </label>

                {!isAdminEmail && (
                  <button
                    type="button"
                    onClick={() =>
                      setError(
                        "Please contact your internship coordinator to reset your password."
                      )
                    }
                    className="text-xs sm:text-sm text-blue-600 font-semibold hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-xs sm:text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-[0.99] transition-all text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    {isAdminEmail ? "Sign in as Administrator" : "Sign in to portal"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-[11px] sm:text-xs">
                  Secure access to your account
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 space-y-2">
            <p className="text-xs text-slate-400">
              Need assistance accessing your account?
            </p>

            <a
              href="mailto:support@singodiyatechnologies.tech"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Contact Support
            </a>
          </div>

          <div className="lg:hidden text-center mt-8 text-[10px] text-slate-400">
            © {new Date().getFullYear()} Singodiya Technologies
          </div>
        </div>
      </div>
    </div>
  );
}