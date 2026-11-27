import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import Login from "./Login";
import Dash from "./Dash";
import Drawer from "./Drawer";
import Learn from "./Learn";
import LearnDetails from "./LearnDetails";
import Skills from "./Skills";
import Attendance from "./Attendance";
import Profile from "./Profile";
import AdminPanel from "./AdminPanel";
import Tasks from "./Tasks";
import TaskDetail from "./pages/student/TaskDetail";
import Logbook from "./Logbook";
import Projects from "./Projects";
import Certificates from "./Certificates";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/admin/Students";
import StudentDetails from "./pages/admin/StudentDetails";
import Programs from "./pages/admin/Programs";
import Batches from "./pages/admin/Batches";
import Mentors from "./pages/admin/Mentors";
import TasksAdmin from "./pages/admin/TasksAdmin";
import LearnAdmin from "./pages/admin/LearnAdmin";
import ProjectsAdmin from "./pages/admin/ProjectsAdmin";
import Approvals from "./pages/admin/Approvals";
import AttendanceAdmin from "./pages/admin/AttendanceAdmin";
import LogbookAdmin from "./pages/admin/LogbookAdmin";
import CertificatesAdmin from "./pages/admin/CertificatesAdmin";
import AnnouncementsAdmin from "./pages/admin/AnnouncementsAdmin";
import AdminSettings from "./pages/admin/AdminSettings";

import MentorOverview from "./pages/mentor/MentorOverview";
import MentorBatches from "./pages/mentor/MentorBatches";
import MentorStudents from "./pages/mentor/MentorStudents";
import MentorTasks from "./pages/mentor/MentorTasks";
import MentorLogbooks from "./pages/mentor/MentorLogbooks";
import MentorAttendance from "./pages/mentor/MentorAttendance";
import MentorProjects from "./pages/mentor/MentorProjects";
import MentorProfile from "./pages/mentor/MentorProfile";

import { apiGet } from "./lib/api";

const pageTitles = {
  "/dash": "Overview",
  "/dash/attendance": "Attendance",
  "/dash/tasks": "Tasks",
  "/dash/logbook": "Daily Logbook",
  "/dash/learn": "Learn",
  "/dash/skills": "My Skills",
  "/dash/projects": "Assigned Projects",
  "/dash/submission": "Project Submission",
  "/dash/announcements": "Announcements",
  "/dash/certificates": "Certificates",
  "/dash/profile": "My Profile",
  "/dash/settings": "Settings"
};

const mentorPageTitles = {
  "/mentor": "Mentor Overview",
  "/mentor/dashboard": "Mentor Overview",
  "/mentor/batches": "My Batches",
  "/mentor/students": "My Students",
  "/mentor/tasks": "Task Reviews",
  "/mentor/logbook": "Student Logbooks",
  "/mentor/attendance": "Attendance",
  "/mentor/projects": "Projects",
  "/mentor/profile": "My Profile"
};

const mentorNavItems = [
  { label: "Overview", path: "/mentor" },
  { label: "My Batches", path: "/mentor/batches" },
  { label: "My Students", path: "/mentor/students" },
  { label: "Task Reviews", path: "/mentor/tasks" },
  { label: "Logbooks", path: "/mentor/logbook" },
  { label: "Attendance", path: "/mentor/attendance" },
  { label: "Projects", path: "/mentor/projects" },
  { label: "Profile", path: "/mentor/profile" }
];

const getAdminToken = () =>
  localStorage.getItem("admin_token") || "";

const getMentorToken = () =>
  localStorage.getItem("mentor_token") || "";

const getStudentToken = () =>
  localStorage.getItem("intern_token") ||
  localStorage.getItem("access_token") ||
  "";

const getStoredUser = () => {
  try {
    const value = localStorage.getItem("intern_user");
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const getStoredMentor = () => {
  try {
    const value = localStorage.getItem("mentor_profile");
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const isAdminLoggedIn = () => Boolean(getAdminToken());

const isMentorLoggedIn = () => Boolean(getMentorToken());

const isStudentLoggedIn = () => Boolean(getStudentToken());

const getHomeRoute = () => {
  if (isAdminLoggedIn()) {
    return "/admin";
  }

  if (isMentorLoggedIn()) {
    return "/mentor";
  }

  if (isStudentLoggedIn()) {
    return "/dash";
  }

  return "/login";
};

function RequireAdmin() {
  const location = useLocation();

  if (!isAdminLoggedIn()) {
    if (isMentorLoggedIn()) {
      return <Navigate to="/mentor" replace />;
    }

    if (isStudentLoggedIn()) {
      return <Navigate to="/dash" replace />;
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

function RequireMentor() {
  const location = useLocation();

  if (!isMentorLoggedIn()) {
    if (isAdminLoggedIn()) {
      return <Navigate to="/admin" replace />;
    }

    if (isStudentLoggedIn()) {
      return <Navigate to="/dash" replace />;
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

function RequireStudent() {
  const location = useLocation();

  if (!isStudentLoggedIn()) {
    if (isAdminLoggedIn()) {
      return <Navigate to="/admin" replace />;
    }

    if (isMentorLoggedIn()) {
      return <Navigate to="/mentor" replace />;
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

function GuestOnly() {
  if (isAdminLoggedIn()) {
    return <Navigate to="/admin" replace />;
  }

  if (isMentorLoggedIn()) {
    return <Navigate to="/mentor" replace />;
  }

  if (isStudentLoggedIn()) {
    return <Navigate to="/dash" replace />;
  }

  return <Login />;
}

function MentorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mentor = getStoredMentor();
  const location = useLocation();
  const navigate = useNavigate();

  const title = mentorPageTitles[location.pathname] || "Mentor Portal";
  const name =
    mentor?.name ||
    mentor?.full_name ||
    localStorage.getItem("mentor_email")?.split("@")[0] ||
    "Mentor";

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("mentor_token");
    localStorage.removeItem("mentor_profile");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-5">
          <div>
            <p className="text-sm font-bold text-slate-900">Mentor Portal</p>
            <p className="text-[11px] text-slate-500">Singodiya Technologies</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mentorNavItems.map((item) => {
            const active =
              item.path === "/mentor"
                ? location.pathname === "/mentor" ||
                  location.pathname === "/mentor/dashboard"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[260px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-700 lg:hidden"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Mentor Workspace
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/mentor/profile")}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50 sm:gap-3"
          >
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-medium text-slate-800">
                {name}
              </p>
              <p className="max-w-[180px] truncate text-xs text-slate-500">
                {mentor?.designation || "Mentor Account"}
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-indigo-100 text-sm font-bold text-indigo-700">
              {initials || "M"}
            </div>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser);
  const [photoError, setPhotoError] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const title = pageTitles[location.pathname] || "Intern Portal";

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const stored = getStoredUser();

      setUser(stored);
      setPhotoError(false);

      if (!getStudentToken()) return;

      try {
        let response;

        try {
          response = await apiGet("/intern/profile");
        } catch {
          response = await apiGet("/intern/me");
        }

        const profile =
          response?.user ||
          response?.student ||
          response?.profile ||
          response?.data ||
          response;

        if (!active || !profile) return;

        const merged = {
          ...stored,
          ...profile
        };

        setUser(merged);

        localStorage.setItem(
          "intern_user",
          JSON.stringify(merged)
        );
      } catch (err) {
        console.error("Profile load error:", err);

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

  const name =
    user?.full_name ||
    user?.name ||
    user?.student_name ||
    user?.username ||
    user?.first_name ||
    user?.display_name ||
    localStorage.getItem("intern_email")?.split("@")[0] ||
    "Intern";

  const photo =
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

  const role =
    user?.role ||
    user?.designation ||
    "Intern";

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <Drawer
        open={drawerOpen}
        onClose={setDrawerOpen}
      />

      <main className="min-h-screen lg:ml-[280px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-8">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-lg font-semibold text-slate-900">
              {title}
            </h1>

            <p className="hidden text-xs text-slate-500 sm:block">
              Internship Management Portal
            </p>
          </div>

          <button
            onClick={() => navigate("/dash/profile")}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50 sm:gap-3"
          >
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-medium text-slate-800">
                {name}
              </p>

              <p className="max-w-[180px] truncate text-xs text-slate-500">
                {role === "Intern" ? "Student Account" : role}
              </p>
            </div>

            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-indigo-100">
              {photo && !photoError ? (
                <img
                  src={photo}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-indigo-700">
                  {initials || "I"}
                </div>
              )}
            </div>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const pageName = location.pathname
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <div className="h-5 w-5 rounded-md border-2 border-current" />
        </div>

        <h2 className="text-xl font-semibold text-slate-900">
          {pageName}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          This section is being prepared. It will be available soon.
        </p>

        <button
          onClick={() => navigate(-1)}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestOnly />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPanel />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:studentId" element={<StudentDetails />} />
            <Route path="programs" element={<Programs />} />
            <Route path="batches" element={<Batches />} />
            <Route path="mentors" element={<Mentors />} />
            <Route path="tasks" element={<TasksAdmin />} />
            <Route path="learn" element={<LearnAdmin />} />
            <Route path="projects" element={<ProjectsAdmin />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="attendance" element={<AttendanceAdmin />} />
            <Route path="logbook" element={<LogbookAdmin />} />
            <Route path="certificates" element={<CertificatesAdmin />} />
            <Route path="announcements" element={<AnnouncementsAdmin />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>

        <Route element={<RequireMentor />}>
          <Route path="/mentor" element={<MentorLayout />}>
            <Route index element={<MentorOverview />} />
            <Route path="dashboard" element={<MentorOverview />} />
            <Route path="batches" element={<MentorBatches />} />
            <Route path="students" element={<MentorStudents />} />
            <Route path="tasks" element={<MentorTasks />} />
            <Route path="logbook" element={<MentorLogbooks />} />
            <Route path="attendance" element={<MentorAttendance />} />
            <Route path="projects" element={<MentorProjects />} />
            <Route path="profile" element={<MentorProfile />} />
            <Route path="*" element={<Navigate to="/mentor" replace />} />
          </Route>
        </Route>

        <Route element={<RequireStudent />}>
          <Route path="/dash" element={<DashboardLayout />}>
            <Route index element={<Dash />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="task/:taskId" element={<TaskDetail />} />
            <Route path="logbook" element={<Logbook />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:id" element={<LearnDetails />} />
            <Route path="skills" element={<Skills />} />
            <Route path="projects" element={<Projects />} />
            <Route path="submission" element={<PlaceholderPage />} />
            <Route path="announcements" element={<PlaceholderPage />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<PlaceholderPage />} />
            <Route path="*" element={<Navigate to="/dash" replace />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
        <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
