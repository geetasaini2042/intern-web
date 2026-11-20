
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Code2,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X
} from "lucide-react";

import { API_BASE } from "./lib/api";
const API_URL = `${API_BASE}/intern/skills`;

const levelColors = {
  Beginner: "bg-slate-100 text-slate-700",
  Basic: "bg-slate-100 text-slate-700",
  Intermediate: "bg-blue-50 text-blue-700",
  Advanced: "bg-violet-50 text-violet-700",
  Expert: "bg-emerald-50 text-emerald-700"
};

const categories = ["All Skills", "Technical", "Professional", "Tools"];

function getToken() {
  return (
    localStorage.getItem("intern_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function normalizeSkills(data) {
  const root = data?.data || data?.skills_data || data;

  const skills = Array.isArray(root)
    ? root
    : root?.skills || root?.items || root?.skill_list || [];

  return skills.map((skill, index) => ({
    id: skill.id || skill._id || skill.skill_id || `skill-${index}`,
    name: skill.name || skill.title || skill.skill_name || "Untitled Skill",
    category: skill.category || skill.type || "Technical",
    level: skill.level || skill.proficiency || "Beginner",
    progress: Number(skill.progress ?? skill.percentage ?? skill.score ?? 0),
    required: Boolean(skill.required ?? skill.is_required ?? false),
    description: skill.description || skill.details || "",
    completed: Boolean(skill.completed ?? skill.is_completed ?? false),
    modules: Number(skill.modules ?? skill.modules_count ?? 0),
    completedModules: Number(
      skill.completed_modules ?? skill.completed_count ?? 0
    ),
    relatedModules: skill.related_modules || skill.learning_modules || []
  }));
}

function SkillIcon({ category }) {
  if (category === "Professional") return <Award size={19} />;
  if (category === "Tools") return <Layers3 size={19} />;
  return <Code2 size={19} />;
}

function SkillCard({ skill, onClick }) {
  const progress = Math.max(0, Math.min(100, skill.progress));

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <SkillIcon category={skill.category} />
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            levelColors[skill.level] || levelColors.Beginner
          }`}
        >
          {skill.level}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">
          {skill.name}
        </h3>

        <p className="mt-1 line-clamp-2 min-h-[36px] text-xs leading-5 text-slate-500">
          {skill.description || "Build and improve this skill through learning and practice."}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-slate-500">Skill progress</span>
        <span className="font-semibold text-slate-800">{progress}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress >= 100 ? "bg-emerald-500" : "bg-indigo-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {skill.modules > 0
            ? `${skill.completedModules}/${skill.modules} modules`
            : skill.category}
        </span>

        {skill.required && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Required
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        {skill.completed ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 size={15} />
            Completed
          </span>
        ) : (
          <span className="text-xs font-medium text-indigo-600">
            View skill
          </span>
        )}

        <ArrowRight
          size={16}
          className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"
        />
      </div>
    </button>
  );
}

export default function Skills() {
  const navigate = useNavigate();

  const [skills, setSkills] = useState([]);
  const [student, setStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Skills");
  const [selectedSkill, setSelectedSkill] = useState(null);

  const fetchSkills = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please login again.");
        }

        throw new Error(`Unable to load skills (${response.status}).`);
      }

      const result = await response.json();

      setStudent(result.student || result.intern || result.profile || {});
      setSkills(normalizeSkills(result));
    } catch (err) {
      setError(err.message || "Something went wrong while loading skills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const matchesCategory =
        category === "All Skills" || skill.category === category;

      const matchesSearch =
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.description.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [skills, category, search]);

  const totalSkills = skills.length;

  const completedSkills = skills.filter(
    (skill) => skill.completed || skill.progress >= 100
  ).length;

  const averageProgress = totalSkills
    ? Math.round(
        skills.reduce(
          (total, skill) => total + Math.max(0, Math.min(100, skill.progress)),
          0
        ) / totalSkills
      )
    : 0;

  const requiredSkills = skills.filter((skill) => skill.required).length;

  const requiredCompleted = skills.filter(
    (skill) => skill.required && (skill.completed || skill.progress >= 100)
  ).length;

  const currentSkill = skills
    .filter((skill) => !skill.completed && skill.progress > 0)
    .sort((a, b) => b.progress - a.progress)[0];

  const recommendedSkills = skills
    .filter((skill) => !skill.completed && skill.progress === 0)
    .slice(0, 3);

  const openLearning = (skill) => {
    setSelectedSkill(null);
    navigate("/dash/learn", {
      state: {
        skillId: skill.id,
        skillName: skill.name
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Skills
            </h1>
            <Sparkles size={19} className="text-indigo-500" />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Track your skill development throughout your internship.
          </p>
        </div>

        <button
          onClick={fetchSkills}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {student?.internship_domain && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
          <Target size={17} className="text-indigo-600" />
          <span className="text-sm text-slate-600">
            Your domain:
          </span>
          <span className="text-sm font-semibold text-indigo-700">
            {student.internship_domain}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <CircleHelp className="mt-0.5 text-red-600" size={19} />

            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Skills could not be loaded
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>

              <button
                onClick={fetchSkills}
                className="mt-3 text-sm font-semibold text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && skills.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <BookOpen size={25} />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No skills assigned yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Your learning skills will appear here once your internship learning path
            has been assigned.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        </div>
      ) : (
        !error &&
        skills.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                label="Total Skills"
                value={totalSkills}
                icon={<Layers3 size={19} />}
                color="indigo"
              />

              <StatCard
                label="Completed"
                value={completedSkills}
                icon={<CheckCircle2 size={19} />}
                color="emerald"
              />

              <StatCard
                label="Average Progress"
                value={`${averageProgress}%`}
                icon={<TrendingUp size={19} />}
                color="blue"
              />

              <StatCard
                label="Required Skills"
                value={`${requiredCompleted}/${requiredSkills}`}
                icon={<Target size={19} />}
                color="amber"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Skill Development
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Your overall competency progress
                    </p>
                  </div>

                  <div className="rounded-xl bg-indigo-50 px-3 py-2 text-lg font-bold text-indigo-700">
                    {averageProgress}%
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                    style={{ width: `${averageProgress}%` }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>{completedSkills} skills mastered</span>
                  <span>{totalSkills} total skills</span>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <TrendingUp size={20} />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Keep growing
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Continue practicing to improve your skill levels and complete
                  your internship roadmap.
                </p>

                <button
                  onClick={() => navigate("/dash/learn")}
                  className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Explore learning <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {currentSkill && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen size={20} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-indigo-600">
                        Continue developing
                      </p>

                      <h3 className="mt-1 font-semibold text-slate-900">
                        {currentSkill.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {currentSkill.progress}% completed
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openLearning(currentSkill)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Continue Learning <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {recommendedSkills.length > 0 && (
              <div>
                <div className="mb-3">
                  <h2 className="font-semibold text-slate-900">
                    Recommended Skills
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Skills you have not started yet
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendedSkills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => openLearning(skill)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <SkillIcon category={skill.category} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {skill.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {skill.category}
                        </p>
                      </div>

                      <ArrowRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    All Skills
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your assigned competencies and development progress
                  </p>
                </div>

                <div className="relative w-full sm:max-w-xs">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />

                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                      category === item
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {filteredSkills.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <Search size={24} className="mx-auto text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No matching skills
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try changing your search or category.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      onClick={() => setSelectedSkill(skill)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )
      )}

      {selectedSkill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <SkillIcon category={selectedSkill.category} />
              </div>

              <button
                onClick={() => setSelectedSkill(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {selectedSkill.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {selectedSkill.category} · {selectedSkill.level}
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {selectedSkill.description ||
                "Practice this skill through the assigned learning modules and practical activities."}
            </p>

            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Your progress</span>
                <span className="font-semibold text-slate-900">
                  {selectedSkill.progress}%
                </span>
              </div>

              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, selectedSkill.progress)
                    )}%`
                  }}
                />
              </div>
            </div>

            {selectedSkill.modules > 0 && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">
                  Learning modules
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSkill.completedModules} completed out of{" "}
                  {selectedSkill.modules}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => openLearning(selectedSkill)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <BookOpen size={16} />
                Learn this skill
              </button>

              <button
                onClick={() => setSelectedSkill(null)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
