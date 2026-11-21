
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate
} from "react-router-dom";

import Login from "./Login";
import Dash from "./Dash";
import Drawer from "./Drawer";
import Learn from "./Learn";
import Skills from "./Skills";
import Attendance from "./Attendance";
import Profile from "./Profile";
import AdminPanel from "./AdminPanel";
import Tasks from "./Tasks";
import Logbook from "./Logbook";
import Projects from "./Projects";
import Certificates from "./Certificates";

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

const getStoredUser = () => {
  try {
    const value = localStorage.getItem("intern_user");
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const getUserName = user =>
  user?.full_name ||
  user?.name ||
  user?.student_name ||
  user?.username ||
  user?.first_name ||
  user?.display_name ||
  "";

const getUserPhoto = user =>
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
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
};

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
    getUserName(user) ||
    localStorage.getItem("intern_email")?.split("@")[0] ||
    "Intern";

  const photo = getUserPhoto(user);

  const email =
    user?.email ||
    user?.email_address ||
    localStorage.getItem("intern_email") ||
    "Student Account";

  const role =
    user?.role ||
    user?.designation ||
    "Intern";

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
                  {getInitials(name)}
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
    .replace(/\b\w/g, c => c.toUpperCase());

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
        {/* Root */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Admin Panel */}
        <Route
          path="/admin"
          element={<AdminPanel />}
        >
          {/* Admin Dashboard */}
          <Route
            index
            element={<AdminDashboard />}
          />

          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          {/* Students */}
          <Route
            path="students"
            element={<Students />}
          />

          <Route
            path="students/:studentId"
            element={<StudentDetails />}
          />

          {/* Programs */}
          <Route
            path="programs"
            element={<Programs />}
          />

          {/* Batches */}
          <Route
            path="batches"
            element={<Batches />}
          />

          {/* Task Management */}
          <Route
            path="tasks"
            element={<TasksAdmin />}
          />

          {/* Learn Programs */}
          <Route
            path="learn"
            element={<LearnAdmin />}
          />

          {/* Projects */}
          <Route
            path="projects"
            element={<ProjectsAdmin />}
          />

          {/* Approvals */}
          <Route
            path="approvals"
            element={<Approvals />}
          />

          {/* Attendance */}
          <Route
            path="attendance"
            element={<AttendanceAdmin />}
          />

          {/* Logbook */}
          <Route
            path="logbook"
            element={<LogbookAdmin />}
          />

          {/* Certificates */}
          <Route
            path="certificates"
            element={<CertificatesAdmin />}
          />

          {/* Announcements */}
          <Route
            path="announcements"
            element={<AnnouncementsAdmin />}
          />

          {/* Settings */}
          <Route
            path="settings"
            element={<AdminSettings />}
          />

          {/* Unknown admin route */}
          <Route
            path="*"
            element={<Navigate to="/admin" replace />}
          />
        </Route>

        {/* Student Dashboard */}
        <Route
          path="/dash"
          element={<DashboardLayout />}
        >
          <Route
            index
            element={<Dash />}
          />

          <Route
            path="attendance"
            element={<Attendance />}
          />

          <Route
            path="tasks"
            element={<Tasks />}
          />

          <Route
            path="logbook"
            element={<Logbook />}
          />

          <Route
            path="learn"
            element={<Learn />}
          />

          <Route
            path="skills"
            element={<Skills />}
          />

          <Route
            path="projects"
            element={<Projects />}
          />

          <Route
            path="submission"
            element={<PlaceholderPage />}
          />

          <Route
            path="announcements"
            element={<PlaceholderPage />}
          />

          <Route
            path="certificates"
            element={<Certificates />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

          <Route
            path="settings"
            element={<PlaceholderPage />}
          />

          {/* Unknown student route */}
          <Route
            path="*"
            element={<Navigate to="/dash" replace />}
          />
        </Route>

        {/* Global fallback */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
