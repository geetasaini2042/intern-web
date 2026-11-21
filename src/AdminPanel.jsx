import React, { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
  useNavigate,
  useLocation
} from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  ClipboardList,
  UserPlus,
  BookOpen,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  NotebookPen,
  Award,
  Megaphone,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  ShieldCheck,
  UserRound
} from "lucide-react";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/admin/Students";
import StudentDetails from "./pages/admin/StudentDetails";
import Programs from "./pages/admin/Programs";
import Batches from "./pages/admin/Batches";
import TasksAdmin from "./pages/admin/TasksAdmin";
import LearnAdmin from "./pages/admin/LearnAdmin";
import ProjectsAdmin from "./pages/admin/ProjectsAdmin";
import Approvals from "./pages/admin/Approvals";
import AttendanceAdmin from "./pages/admin/AttendanceAdmin";
import LogbookAdmin from "./pages/admin/LogbookAdmin";
import CertificatesAdmin from "./pages/admin/CertificatesAdmin";
import AnnouncementsAdmin from "./pages/admin/AnnouncementsAdmin";
import AdminSettings from "./pages/admin/AdminSettings";
import ImportLegacyStudents from "./pages/admin/ImportLegacyStudents";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        path: "",
        icon: LayoutDashboard
      }
    ]
  },
  {
    title: "STUDENTS",
    items: [
      {
        label: "Students",
        path: "students",
        icon: Users
      },
      {
        label: "Programs",
        path: "programs",
        icon: GraduationCap
      },
      {
        label: "Batches",
        path: "batches",
        icon: Layers
      }
    ]
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        label: "Tasks",
        path: "tasks",
        icon: ClipboardList
      },
      {
        label: "Import Students",
        path: "import-students",
        icon: UserPlus
      },
      {
        label: "Learn Programs",
        path: "learn",
        icon: BookOpen
      },
      {
        label: "Projects",
        path: "projects",
        icon: FolderKanban
      },
      {
        label: "Approvals",
        path: "approvals",
        icon: CheckSquare,
        badge: true
      }
    ]
  },
  {
    title: "INTERNSHIP",
    items: [
      {
        label: "Attendance",
        path: "attendance",
        icon: CalendarDays
      },
      {
        label: "Logbook",
        path: "logbook",
        icon: NotebookPen
      },
      {
        label: "Certificates",
        path: "certificates",
        icon: Award
      }
    ]
  },
  {
    title: "COMMUNICATION",
    items: [
      {
        label: "Announcements",
        path: "announcements",
        icon: Megaphone
      }
    ]
  },
  {
    title: "SYSTEM",
    items: [
      {
        label: "Settings",
        path: "settings",
        icon: Settings
      }
    ]
  }
];

const pageTitles = {
  admin: "Dashboard",
  students: "Students Management",
  programs: "Internship Programs",
  batches: "Batch Management",
  tasks: "Task Management",
  "import-students": "Import Students",
  learn: "Learn Programs",
  projects: "Project Management",
  approvals: "Submission Approvals",
  attendance: "Attendance Management",
  logbook: "Logbook Management",
  certificates: "Certificates",
  announcements: "Announcements",
  settings: "Admin Settings"
};

function AdminSidebar({ open, setOpen }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("intern_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("intern_user");

    navigate("/login", { replace: true });
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[270px] flex-col
          border-r border-slate-200
          bg-white
          transition-transform duration-300
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Singodiya Technologies"
              className="h-10 w-10 rounded-xl object-contain"
            />

            <div>
              <h1 className="text-[14px] font-bold tracking-tight text-slate-900">
                SINGODIYA
              </h1>

              <p className="text-[10px] font-medium tracking-[2px] text-slate-500">
                TECHNOLOGIES
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck size={18} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-800">
                Administration
              </p>

              <p className="text-[11px] text-slate-500">
                Internship Management
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {navigation.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[1.5px] text-slate-400">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === ""}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => `
                        group flex items-center justify-between
                        rounded-xl px-3 py-2.5
                        text-[13px] font-medium
                        transition-all
                        ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={17} strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                          !
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
            Logout
          </button>

          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center">
            <p className="text-[10px] text-slate-400">
              Internship Management Portal
            </p>

            <p className="text-[10px] font-medium text-slate-500">
              © Singodiya Technologies
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function AdminHeader({ setOpen }) {
  const location = useLocation();

  const currentPath = location.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  const title = pageTitles[currentPath] || "Administration";

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          <p className="hidden text-xs text-slate-500 sm:block">
            Manage your internship operations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 md:flex"
        >
          <Search size={15} />
          <span>Search</span>

          <span className="rounded border bg-slate-50 px-1.5 py-0.5 text-[10px]">
            /
          </span>
        </button>

        <button
          className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
        >
          <Bell size={18} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <UserRound size={17} />
          </div>

          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">
              Administrator
            </p>

            <p className="text-[10px] text-slate-500">
              Admin Account
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <AdminSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <div className="min-h-screen lg:pl-[270px]">
        <AdminHeader setOpen={setSidebarOpen} />

        <main className="min-h-[calc(100vh-70px)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />

        <Route path="students" element={<Students />} />
        <Route path="students/:studentId" element={<StudentDetails />} />

        <Route path="programs" element={<Programs />} />
        <Route path="batches" element={<Batches />} />

        <Route path="tasks" element={<TasksAdmin />} />
        <Route path="import-students" element={<ImportLegacyStudents />} />
        <Route path="learn" element={<LearnAdmin />} />
        <Route path="projects" element={<ProjectsAdmin />} />

        <Route path="approvals" element={<Approvals />} />

        <Route path="attendance" element={<AttendanceAdmin />} />
        <Route path="logbook" element={<LogbookAdmin />} />

        <Route path="certificates" element={<CertificatesAdmin />} />
        <Route path="announcements" element={<AnnouncementsAdmin />} />
        <Route path="settings" element={<AdminSettings />} />

        <Route
          path="*"
          element={<Navigate to="/admin" replace />}
        />
      </Route>
    </Routes>
  );
}