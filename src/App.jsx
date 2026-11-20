
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation
} from "react-router-dom";

import Login from "./Login";
import Dash from "./Dash";
import Drawer from "./Drawer";
import Learn from "./Learn";
import Skills from "./Skills";
function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

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

  const title = pageTitles[location.pathname] || "Intern Portal";

  return (
    <div className="min-h-screen bg-slate-50">
      <Drawer
        open={drawerOpen}
        onClose={setDrawerOpen}
      />

      <main className="min-h-screen lg:ml-[280px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-md sm:px-8">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-lg font-semibold text-slate-900">
              {title}
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Internship Management Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">
                Intern
              </p>
              <p className="text-xs text-slate-500">
                Student Account
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              I
            </div>
          </div>
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
          onClick={() => window.history.back()}
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
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dash" element={<DashboardLayout />}>
          <Route index element={<Dash />} />

          <Route path="attendance" element={<PlaceholderPage />} />
          <Route path="/dash/learn" element={<Learn />} />
          <Route path="tasks" element={<PlaceholderPage />} />
          <Route path="logbook" element={<PlaceholderPage />} />

          <Route path="learn" element={<Learn />} />
          <Route path="skills" element={<Skills />} />

          <Route path="projects" element={<PlaceholderPage />} />
          <Route path="submission" element={<PlaceholderPage />} />

          <Route path="announcements" element={<PlaceholderPage />} />
          <Route path="certificates" element={<PlaceholderPage />} />

          <Route path="profile" element={<PlaceholderPage />} />
          <Route path="settings" element={<PlaceholderPage />} />

          <Route path="*" element={<Navigate to="/dash" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
