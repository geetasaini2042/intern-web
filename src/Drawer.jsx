
import React, { useState } from "react";
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

export default function Drawer({ open, onClose }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const toggleSection = (title) => {
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
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Singodiya Technologies"
              className="h-10 w-10 rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Singodiya Technologies
              </h2>
              <p className="text-xs text-slate-500">Intern Portal</p>
            </div>
          </div>

          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {navigation.map((group) => (
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
                  {group.items.map((item) => {
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
