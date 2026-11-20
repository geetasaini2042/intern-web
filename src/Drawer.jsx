
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  GraduationCap,
  ChartNoAxesColumnIncreasing,
  FolderKanban,
  Upload,
  Megaphone,
  Award,
  UserRound,
  Settings,
  LogOut,
  X,
  Menu,
  ChevronDown,
  Building2
} from "lucide-react";
import { apiGet } from "./lib/api";

const navigation = [
  {
    title: "MAIN",
    items: [
      { label: "Overview", path: "/dash", icon: LayoutDashboard }
    ]
  },
  {
    title: "MY INTERNSHIP",
    items: [
      { label: "Attendance", path: "/dash/attendance", icon: CalendarCheck },
      { label: "Tasks", path: "/dash/tasks", icon: ClipboardList },
      { label: "Daily Logbook", path: "/dash/logbook", icon: BookOpen }
    ]
  },
  {
    title: "LEARNING",
    items: [
      { label: "Learn", path: "/dash/learn", icon: GraduationCap },
      { label: "My Skills", path: "/dash/skills", icon: ChartNoAxesColumnIncreasing }
    ]
  },
  {
    title: "PROJECTS",
    items: [
      { label: "Assigned Projects", path: "/dash/projects", icon: FolderKanban },
      { label: "Project Submission", path: "/dash/submission", icon: Upload }
    ]
  },
  {
    title: "OTHER",
    items: [
      { label: "Announcements", path: "/dash/announcements", icon: Megaphone },
      { label: "Certificates", path: "/dash/certificates", icon: Award }
    ]
  }
];

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("intern_user");
    if (!raw) return {};

    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
};

const getName = user =>
  user?.full_name ||
  user?.name ||
  user?.student_name ||
  user?.username ||
  user?.first_name ||
  user?.display_name ||
  "";

const getPhoto = user =>
  user?.profile_photo ||
  user?.profile_image ||
  user?.photo_url ||
  user?.photo ||
  user?.avatar ||
  user?.image ||
  user?.picture ||
  user?.profile?.photo ||
  user?.profile?.avatar ||
  "";

const getInitials = name => {
  if (!name) return "I";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
};

export default function Drawer({ open, onClose }) {
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState({});
  const [user, setUser] = useState(getStoredUser);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const stored = getStoredUser();

      setUser(stored);
      setPhotoError(false);

      try {
        let profile;

        try {
          profile = await apiGet("/intern/profile");
        } catch {
          profile = await apiGet("/intern/me");
        }

        const actualProfile =
          profile?.user ||
          profile?.student ||
          profile?.profile ||
          profile?.data ||
          profile;

        if (active && actualProfile) {
          setUser(prev => ({
            ...prev,
            ...actualProfile
          }));

          localStorage.setItem(
            "intern_user",
            JSON.stringify({
              ...stored,
              ...actualProfile
            })
          );
        }
      } catch {
        if (active) {
          setUser(stored);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const toggleSection = title => {
    setExpanded(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const logout = () => {
    localStorage.removeItem("intern_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("intern_email");
    localStorage.removeItem("intern_user");

    navigate("/login", { replace: true });
    onClose?.();
  };

  const close = () => onClose?.();

  const name =
    getName(user) ||
    localStorage.getItem("intern_email")?.split("@")[0] ||
    "Intern";

  const photo = getPhoto(user);

  const email =
    user?.email ||
    user?.email_address ||
    localStorage.getItem("intern_email") ||
    "Student Account";

  const role =
    user?.role ||
    user?.designation ||
    user?.program ||
    "Intern";

  return (
    <>
      <button
        onClick={() => onClose?.(!open)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 lg:hidden"
        aria-label="Open menu"
      >
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>

      {open && (
        <button
          onClick={close}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Close drawer"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Singodiya Technologies"
              className="h-10 w-10 rounded-lg object-contain"
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />

            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold tracking-tight text-slate-900">
                Singodiya Technologies
              </h2>
              <p className="text-xs text-slate-500">Intern Portal</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dash/profile")}
            className="mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50/50"
          >
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-indigo-100">
              {photo && !photoError ? (
                <img
                  src={photo}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-indigo-700">
                  {getInitials(name)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {email}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-600">
                {role}
              </p>
            </div>

            <UserRound size={16} className="shrink-0 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {navigation.map(group => (
            <div key={group.title} className="mb-5">
              <button
                onClick={() => toggleSection(group.title)}
                className="mb-2 flex w-full items-center justify-between px-3 text-[10px] font-bold tracking-[1.2px] text-slate-400"
              >
                {group.title}

                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    expanded[group.title] ? "-rotate-90" : ""
                  }`}
                />
              </button>

              {!expanded[group.title] && (
                <div className="space-y-1">
                  {group.items.map(item => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/dash"}
                        onClick={close}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              size={18}
                              strokeWidth={isActive ? 2.3 : 1.8}
                            />
                            <span>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold tracking-[1.2px] text-slate-400">
              ACCOUNT
            </p>

            <NavLink
              to="/dash/profile"
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <UserRound size={18} />
              My Profile
            </NavLink>

            <NavLink
              to="/dash/settings"
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <Settings size={18} />
              Settings
            </NavLink>
          </div>
        </div>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
            <Building2 size={17} className="text-slate-500" />

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">
                Internship Program
              </p>
              <p className="text-[10px] text-slate-500">
                Singodiya Technologies
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
