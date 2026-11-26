import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  Link2,
  ListChecks,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  StickyNote,
  Target,
  Video,
  X
} from "lucide-react";

import { API_BASE } from "./lib/api";

const LEARN_API = `${API_BASE}/intern/learn`;
const PROGRESS_API = `${API_BASE}/intern/learn/progress`;

function getToken() {
  return (
    localStorage.getItem("intern_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getHeaders() {
  const token = getToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function formatDuration(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) || (/^\//.test(trimmed) && !/^\/\//.test(trimmed));
}

function isInternalPath(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  return /^\//.test(trimmed) && !/^\/\//.test(trimmed);
}

function toEmbedUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
    }

    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return url;
  }

  return url;
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || "");
}

function isLessonCompleted(lesson) {
  return (
    lesson.completed === true ||
    lesson.is_completed === true ||
    lesson.status === "completed"
  );
}

function buildBlocks(lesson) {
  if (Array.isArray(lesson.blocks) && lesson.blocks.length) {
    return lesson.blocks;
  }

  const blocks = [];

  if (lesson.video_url) {
    blocks.push({ type: "video", url: lesson.video_url });
  }

  if (lesson.content) {
    blocks.push({ type: "text", content: lesson.content });
  }

  if (lesson.code) {
    blocks.push({
      type: "code",
      language: lesson.language || "text",
      code: lesson.code
    });
  }

  if (lesson.pdf_url) {
    blocks.push({ type: "pdf", url: lesson.pdf_url, title: lesson.title });
  }

  if (Array.isArray(lesson.questions) && lesson.questions.length) {
    blocks.push({ type: "quiz", questions: lesson.questions });
  }

  const link = lesson.url || lesson.link || lesson.content_url;
  if (link) {
    blocks.push({ type: "link", url: link, title: lesson.title });
  }

  return blocks;
}

function normalizeLesson(lesson, index) {
  return {
    ...lesson,
    id: lesson.id || lesson.lesson_id || `lesson-${index + 1}`,
    title: lesson.title || lesson.name || `Lesson ${index + 1}`,
    type: String(lesson.type || lesson.content_type || "reading").toLowerCase(),
    section: lesson.section || lesson.chapter || "",
    duration: lesson.duration || lesson.duration_minutes,
    completed: isLessonCompleted(lesson),
    blocks: buildBlocks(lesson)
  };
}

function normalizeModule(raw) {
  const rawLessons = Array.isArray(raw.lessons)
    ? raw.lessons
    : Array.isArray(raw.content)
    ? raw.content
    : [];

  return {
    ...raw,
    id: raw.id || raw.module_id,
    title: raw.title || raw.name || "Learning Module",
    description: raw.description || raw.subtitle || "",
    category: raw.category || raw.skill || "",
    lessons: rawLessons.map(normalizeLesson),
    assignment: raw.assignment || null
  };
}

function lessonIcon(type) {
  if (type.includes("video")) return Video;
  if (type.includes("quiz")) return HelpCircle;
  if (type.includes("pdf")) return FileText;
  if (type.includes("code") || type.includes("practice")) return Code2;
  return BookOpen;
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function renderInline(text, keyPrefix = "i") {
  const parts = String(text).split(
    /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  );

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;  if (/^`[^`]+`$/.test(part)) {
      return (
        <code
          key={key}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={key} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return isSafeUrl(link[2]) ? (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 underline underline-offset-2"
        >
          {link[1]}
        </a>
      ) : (
        <span key={key}>{link[1]}</span>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function Markdown({ content }) {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const nodes = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      nodes.push(
        <CodeBlock
          key={k++}
          block={{ language: fence[1] || "text", code: code.join("\n") }}
        />
      );
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level === 1
          ? "mt-6 text-2xl font-bold text-slate-900"
          : level === 2
          ? "mt-6 text-xl font-bold text-slate-900"
          : "mt-5 text-base font-semibold text-slate-900";
      nodes.push(
        <h3 key={k++} className={cls}>
          {renderInline(heading[2], `h${k}`)}
        </h3>
      );
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={k++} className="mt-3 list-disc space-y-1.5 pl-6">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `u${k}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={k++} className="mt-3 list-decimal space-y-1.5 pl-6">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `o${k}-${idx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      nodes.push(
        <blockquote
          key={k++}
          className="mt-4 border-l-4 border-indigo-200 bg-indigo-50/60 px-4 py-2 text-slate-700"
        >
          {renderInline(quote.join(" "), `q${k}`)}
        </blockquote>
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(```|#{1,4}\s|\s*[-*]\s|\s*\d+\.\s|>)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    nodes.push(
      <p key={k++} className="mt-3 leading-7">
        {renderInline(para.join(" "), `p${k}`)}
      </p>
    );
  }

  return <div className="text-[15px] text-slate-700">{nodes}</div>;
}

function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.code || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      return;
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs text-slate-400">
          {block.title || block.language || "code"}
        </span>

        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        >
          {copied ? <Check size="{13}"/> : <Copy size="{13}"/>}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code className="font-mono">{block.code}</code>
      </pre>

      {block.output && (
        <div className="border-t border-white/10 bg-black/30 px-4 py-3">
          <p className="mb-1 text-xs text-slate-400">Output</p>
          <pre className="overflow-x-auto font-mono text-sm text-emerald-300">
            {block.output}
          </pre>
        </div>
      )}
    </div>
  );
}

function VideoBlock({ block }) {
  if (!isSafeUrl(block.url)) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black">
      {isDirectVideo(block.url) ? (
        <video controls className="aspect-video w-full" src={block.url} />
      ) : (
        <iframe
          title={block.title || "Video"}
          src={toEmbedUrl(block.url)}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}

function PdfBlock({ block }) {
  if (!isSafeUrl(block.url)) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <iframe
        title={block.title || "Document"}
        src={block.url}
        className="h-[480px] w-full bg-slate-50"
      />
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-3 py-2">
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600"
        >
          Open in new tab
          <ExternalLink size="{14}"/>
        </a>
      </div>
    </div>
  );
}

function ImageBlock({ block }) {
  if (!isSafeUrl(block.url)) return null;

  return (
    <figure className="mt-4">
      <img
        src={block.url}
        alt={block.caption || ""}
        className="w-full rounded-xl border border-slate-200"
      />
      {block.caption && (
        <figcaption className="mt-2 text-center text-xs text-slate-500">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function LinkBlock({ block }) {
  if (!isSafeUrl(block.url)) return null;

  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Link2 size="{18}"/>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {block.title || block.url}
        </p>
        {block.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
            {block.description}
          </p>
        )}
      </div>

      <ExternalLink className="shrink-0 text-slate-400" size="{16}"/>
    </a>
  );
}

function EmbedBlock({ block }) {
  if (!isSafeUrl(block.url)) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <iframe
        title={block.title || "Live example"}
        src={block.url}
        className="w-full bg-white"
        style={{ height: block.height || 420 }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

function CalloutBlock({ block }) {
  const tones = {
    info: "border-indigo-100 bg-indigo-50 text-indigo-900",
    tip: "border-emerald-100 bg-emerald-50 text-emerald-900",
    warning: "border-amber-100 bg-amber-50 text-amber-900"
  };

  return (
    <div
      className={`mt-4 flex gap-3 rounded-xl border p-4 text-sm ${
        tones[block.tone] || tones.info
      }`}
    >
      <Info className="mt-0.5 shrink-0" size="{18}"/>
      <div>
        {block.title && <p className="font-semibold">{block.title}</p>}
        <p className={block.title ? "mt-1" : ""}>
          {renderInline(block.content || "")}
        </p>
      </div>
    </div>
  );
}

function isOptionCorrect(question, option, optionIndex) {
  if (typeof question.answer === "number") {
    return question.answer === optionIndex;
  }
  const numericAnswer = Number(question.answer);
  if (question.answer !== "" && question.answer !== null && !Number.isNaN(numericAnswer)) {
    return numericAnswer === optionIndex;
  }
  return String(question.answer || "").trim() === String(option || "").trim();
}

function QuizBlock({ block, storageKey }) {
  const questions = Array.isArray(block.questions) ? block.questions : [];
  const saved = readStorage(storageKey, { answers: {}, submitted: false });
  const [answers, setAnswers] = useState(saved.answers || {});
  const [submitted, setSubmitted] = useState(Boolean(saved.submitted));

  useEffect(() => {
    const nextSaved = readStorage(storageKey, { answers: {}, submitted: false });
    setAnswers(nextSaved.answers || {});
    setSubmitted(Boolean(nextSaved.submitted));
  }, [storageKey]);

  const updateState = (nextAnswers, nextSubmitted) => {
    setAnswers(nextAnswers);
    setSubmitted(nextSubmitted);
    writeStorage(storageKey, { answers: nextAnswers, submitted: nextSubmitted });
  };

  const score = questions.reduce((total, q, index) => {
    const selectedIdx = answers[index];
    if (selectedIdx === undefined) return total;
    const selectedOpt = (q.options || [])[selectedIdx];
    return total + (isOptionCorrect(q, selectedOpt, selectedIdx) ? 1 : 0);
  }, 0);

  if (!questions.length) return null;

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <HelpCircle className="text-indigo-600" size="{18}"/>
        <h4 className="font-semibold text-slate-900">
          {block.title || "Quick Quiz"}
        </h4>
      </div>

      <div className="mt-4 space-y-5">
        {questions.map((q, qi) => (
          <div key={qi}>
            <p className="text-sm font-medium text-slate-800">
              {qi + 1}. {q.question}
            </p>

            <div className="mt-2 space-y-2">
              {(q.options || []).map((option, oi) => {
                const selected = answers[qi] === oi;
                const correct = isOptionCorrect(q, option, oi);

                let style =
                  "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50";

                if (selected && !submitted) {
                  style = "border-indigo-500 bg-indigo-50";
                }

                if (submitted && correct) {
                  style = "border-emerald-400 bg-emerald-50";
                } else if (submitted && selected && !correct) {
                  style = "border-red-300 bg-red-50";
                }

                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() =>
                      updateState({ ...answers, [qi]: oi }, submitted)
                    }
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm text-slate-700 transition ${style}`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[11px] font-medium">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {submitted && q.explanation && (
              <p className="mt-2 text-xs text-slate-500">{q.explanation}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            onClick={() => updateState(answers, true)}
            disabled={Object.keys(answers).length < questions.length}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Check answers
          </button>
        ) : (
          <>
            <span className="text-sm font-semibold text-slate-900">
              Score: {score}/{questions.length}
            </span>
            <button
              onClick={() => updateState({}, false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ChecklistBlock({ block, storageKey }) {
  const items = Array.isArray(block.items) ? block.items : [];
  const [done, setDone] = useState(() => readStorage(storageKey, {}));

  useEffect(() => {
    setDone(readStorage(storageKey, {}));
  }, [storageKey]);

  const toggle = index => {
    const next = { ...done, [index]: !done[index] };
    setDone(next);
    writeStorage(storageKey, next);
  };

  if (!items.length) return null;

  return (
    <div className="mt-5 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="text-indigo-600" size="{18}"/>
        <h4 className="font-semibold text-slate-900">
          {block.title || "Practice checklist"}
        </h4>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <label
            key={index}
            className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={!!done[index]}
              onChange={() => toggle(index)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span className={done[index] ? "text-slate-400 line-through" : ""}>
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function BlockRenderer({ block, storageKey }) {
  switch (block.type) {
    case "text":
    case "markdown":
      return <Markdown content="{block.content}"/>;
    case "code":
      return <CodeBlock block="{block}"/>;
    case "video":
      return <VideoBlock block="{block}"/>;
    case "pdf":
      return <PdfBlock block="{block}"/>;
    case "image":
      return <ImageBlock block="{block}"/>;
    case "link":
      return <LinkBlock block="{block}"/>;
    case "embed":
      return <EmbedBlock block="{block}"/>;
    case "callout":
      return <CalloutBlock block="{block}"/>;
    case "quiz":
      return <QuizBlock block="{block}" storageKey="{storageKey}"/>;
    case "checklist":
      return <ChecklistBlock block="{block}" storageKey="{storageKey}"/>;
    default:
      return null;
  }
}

function LessonNotes({ storageKey }) {
  const [note, setNote] = useState(() => readStorage(storageKey, ""));
  const [savedAt, setSavedAt] = useState(false);

  useEffect(() => {
    setNote(readStorage(storageKey, ""));
    setSavedAt(false);
  }, [storageKey]);

  const handleChange = e => {
    const val = e.target.value;
    setNote(val);
    writeStorage(storageKey, val);
    setSavedAt(true);
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StickyNote className="text-indigo-600" size="{16}"/>
          <h3 className="text-sm font-semibold text-slate-900">My Notes</h3>
        </div>
        {savedAt && (
          <span className="text-xs text-emerald-600">Saved locally</span>
        )}
      </div>
      <textarea
        value={note}
        onChange={handleChange}
        rows={3}
        placeholder="Write key points or doubts for revision..."
        className="mt-2.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
      />
    </div>
  );
}

function LessonList({
  lessons,
  activeId,
  bookmarks,
  onSelect
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons
      .map((lesson, index) => ({ lesson, index }))
      .filter(({ lesson }) => {
        if (filter === "saved" && !bookmarks[lesson.id]) return false;
        if (filter === "pending" && lesson.completed) return false;
        if (q && !lesson.title.toLowerCase().includes(q) && !lesson.section.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
  }, [lessons, query, filter, bookmarks]);

  const groups = useMemo(() => {
    const map = [];
    filtered.forEach(item => {
      const name = item.lesson.section || "";
      let group = map.find(g => g.name === name);
      if (!group) {
        group = { name, items: [] };
        map.push(group);
      }
      group.items.push(item);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="{14}"/>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search lessons..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs">
        {[
          { id: "all", label: "All" },
          { id: "pending", label: "Pending" },
          { id: "saved", label: "Saved" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-lg py-1 font-medium transition ${
              filter === tab.id
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No matching lessons found.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.name || "default"}>
              {group.name && (
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.name}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map(({ lesson, index }) => {
                  const Icon = lessonIcon(lesson.type);
                  const active = lesson.id === activeId;
                  const saved = Boolean(bookmarks[lesson.id]);

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => onSelect(lesson.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-indigo-50 ring-1 ring-indigo-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="shrink-0 text-emerald-500" size="{18}"/>
                      ) : (
                        <Circle className="shrink-0 text-slate-300" size="{18}"/>
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            active
                              ? "font-semibold text-indigo-900"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {index + 1}. {lesson.title}
                        </p>

                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <Icon size="{12}"/>
                          <span className="capitalize">
                            {lesson.type.replace(/_/g, " ")}
                          </span>
                          {formatDuration(lesson.duration) && (
                            <span>· {formatDuration(lesson.duration)}</span>
                          )}
                        </p>
                      </div>

                      {saved && (
                        <Bookmark className="shrink-0 fill-amber-400 text-amber-500" size="{14}"/>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [module, setModule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showList, setShowList] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [bookmarks, setBookmarks] = useState(() =>
    readStorage(`learn_bookmarks_${id}`, {})
  );

  useEffect(() => {
    setBookmarks(readStorage(`learn_bookmarks_${id}`, {}));
  }, [id]);

  const handleUnauthorized = () => navigate("/login", { replace: true });

  const loadModule = async signal => {
    setLoading(true);
    setError("");
    setActionError("");

    try {
      let response = await fetch(`${LEARN_API}/${id}`, {
        headers: getHeaders(),
        signal
      });

      if (response.status === 401) return handleUnauthorized();

      let result = null;

      if (response.ok) {
        result = await response.json();
        const data =
          result.module || result.data?.module || result.data || result;
        setModule(normalizeModule(data));
        return;
      }

      response = await fetch(LEARN_API, { headers: getHeaders(), signal });

      if (response.status === 401) return handleUnauthorized();

      result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.detail || "Unable to load this module."
        );
      }

      const data =
        result.learning || result.data?.learning || result.data || result;

      const rawModules =
        data.modules ||
        data.learning_path?.modules ||
        data.path?.modules ||
        [];

      const found = rawModules.find(
        m => String(m.id || m.module_id) === String(id)
      );

      if (!found) throw new Error("Module not found.");

      setModule(normalizeModule(found));
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Something went wrong.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadModule(controller.signal);
    return () => controller.abort();
  }, [id]);

  const lessons = module?.lessons || [];

  useEffect(() => {
    if (!lessons.length) {
      setActiveLessonId("");
      return;
    }
    const fromUrl = searchParams.get("lesson");
    const byUrl = lessons.find(l => String(l.id) === String(fromUrl));
    if (byUrl) {
      setActiveLessonId(byUrl.id);
      return;
    }
    setActiveLessonId(prev => {
      if (prev && lessons.some(l => l.id === prev)) return prev;
      const firstPending = lessons.find(l => !l.completed);
      return (firstPending || lessons[0]).id;
    });
  }, [lessons, searchParams]);

  const activeLesson = useMemo(() => {
    if (!lessons.length) return null;
    return lessons.find(l => l.id === activeLessonId) || lessons[0];
  }, [lessons, activeLessonId]);

  const activeIndex = activeLesson
    ? lessons.findIndex(l => l.id === activeLesson.id)
    : -1;

  const completedCount = lessons.filter(l => l.completed).length;
  const progress = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0;

  const selectLesson = lessonId => {
    setActiveLessonId(lessonId);
    setSearchParams({ lesson: String(lessonId) });
    setShowList(false);
    setActionError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleBookmark = lessonId => {
    setBookmarks(prev => {
      const next = { ...prev, [lessonId]: !prev[lessonId] };
      if (!next[lessonId]) delete next[lessonId];
      writeStorage(`learn_bookmarks_${id}`, next);
      return next;
    });
  };

  const saveProgress = async lesson => {
    if (saving) return false;
    setSaving(true);
    setActionError("");

    setModule(prev => ({
      ...prev,
      lessons: prev.lessons.map(l =>
        l.id === lesson.id ? { ...l, completed: true } : l
      )
    }));

    try {
      const response = await fetch(PROGRESS_API, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: module.id,
          lesson_id: lesson.id,
          status: "completed"
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.message || result.detail || "Unable to save progress."
        );
      }

      return true;
    } catch (err) {
      setModule(prev => ({
        ...prev,
        lessons: prev.lessons.map(l =>
          l.id === lesson.id ? { ...l, completed: lesson.completed } : l
        )
      }));
      setActionError(err.message || "Unable to save progress.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const completeAndNext = async () => {
    if (!activeLesson) return;

    if (!activeLesson.completed) {
      const ok = await saveProgress(activeLesson);
      if (!ok) return;
    }

    const next = lessons[activeIndex + 1];
    if (next) {
      selectLesson(next.id);
    } else if (activeLesson.completed) {
      navigate("/dash/learn");
    }
  };

  const goPrev = () => {
    const prev = lessons[activeIndex - 1];
    if (prev) selectLesson(prev.id);
  };

  const openAssignment = () => {
    if (!module?.assignment) return;
    if (module.assignment.task_id) {
      navigate(`/dash/task/${module.assignment.task_id}`);
      return;
    }
    if (isInternalPath(module.assignment.url)) {
      navigate(module.assignment.url);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">Unable to open module</p>
        <p className="mt-1 text-sm text-red-600">
          {error || "Module not found."}
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => navigate("/dash/learn")}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Back to Learn
          </button>
          <button
            onClick={() => loadModule()}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <RefreshCw size="{15}"/>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isLast = activeIndex === lessons.length - 1;
  const isBookmarked = activeLesson ? Boolean(bookmarks[activeLesson.id]) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-20 sm:pb-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate("/dash/learn")}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size="{16}"/>
            All modules
          </button>

          <button
            onClick={() => setFocusMode(v => !v)}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 lg:inline-flex"
          >
            {focusMode ? <Minimize2 size="{14}"/> : <Maximize2 size="{14}"/>}
            {focusMode ? "Show sidebar" : "Focus mode"}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {module.category && (
              <p className="text-xs font-medium text-indigo-600">
                {module.category}
              </p>
            )}

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {module.title}
            </h1>

            {module.description && (
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {module.description}
              </p>
            )}
          </div>

          <div className="w-full shrink-0 sm:w-64">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-slate-500">
                {completedCount} of {lessons.length} lessons done
              </span>
              <span className="font-semibold text-indigo-600">
                {progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError("")}
            className="rounded p-1 hover:bg-red-100"
          >
            <X size="{15}"/>
          </button>
        </div>
      )}

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <BookOpen className="mx-auto text-slate-300" size="{34}"/>
          <h3 className="mt-4 font-semibold text-slate-800">
            Lessons will be added soon
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Your mentor is preparing the learning content.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-5 ${
            focusMode ? "grid-cols-1" : "lg:grid-cols-[320px_1fr]"
          }`}
        >
          {!focusMode && (
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <button
                onClick={() => setShowList(v => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 lg:hidden"
              >
                <span>Lessons ({lessons.length})</span>
                <ChevronRight ""}`} "rotate-90" ${showList : ? className="{`transition" size="{16}"/>
              </button>

              <div
                className={`mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 lg:mt-0 lg:block ${
                  showList ? "block" : "hidden"
                }`}
              >
                <LessonList activeId="{activeLesson?.id}" bookmarks="{bookmarks}" lessons="{lessons}" onSelect="{selectLesson}"/>
              </div>
            </aside>
          )}

          <main className="min-w-0 space-y-5">
            {progress === 100 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Award size="{20}"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900">
                      Module Completed!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      You have finished all lessons in {module.title}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dash/learn")}
                  className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  Explore More Modules
                </button>
              </div>
            )}

            {activeLesson && (
              <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      Lesson {activeIndex + 1} of {lessons.length}
                      {activeLesson.section
                        ? ` · ${activeLesson.section}`
                        : ""}
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                      {activeLesson.title}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(activeLesson.id)}
                      title={isBookmarked ? "Remove bookmark" : "Save for revision"}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        isBookmarked
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Bookmark ""} "fill-amber-400 : ? className="{isBookmarked" size="{13}" text-amber-500"/>
                      <span className="hidden sm:inline">
                        {isBookmarked ? "Saved" : "Save"}
                      </span>
                    </button>

                    {activeLesson.completed && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size="{13}"/>
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                {activeLesson.description && (
                  <p className="mt-2 text-sm text-slate-500">
                    {activeLesson.description}
                  </p>
                )}

                <div className="mt-2">
                  {activeLesson.blocks.length === 0 ? (
                    <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      Content for this lesson is not available yet.
                    </p>
                  ) : (
                    activeLesson.blocks.map((block, index) => (
                      <BlockRenderer block="{block}" key="{`${activeLesson.id}-${index}`}" storageKey="{`learn_block_${id}_${activeLesson.id}_${index}`}"/>
                    ))
                  )}
                </div>

                <LessonNotes storageKey="{`learn_note_${id}_${activeLesson.id}`}"/>

                {isLast && module.assignment && (
                  <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-center gap-2">
                      <Target className="text-amber-600" size="{18}"/>
                      <h3 className="font-semibold text-slate-900">
                        Module Assignment
                      </h3>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {module.assignment.title ||
                        module.assignment.description ||
                        "Complete the assigned practical task."}
                    </p>

                    {module.assignment.task_id ||
                    isInternalPath(module.assignment.url) ? (
                      <button
                        onClick={openAssignment}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Open Assignment
                        <ArrowRight size="{14}"/>
                      </button>
                    ) : (
                      isSafeUrl(module.assignment.url) && (
                        <a
                          href={module.assignment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                        >
                          View Assignment
                          <ExternalLink size="{14}"/>
                        </a>
                      )
                    )}
                  </div>
                )}

                <div className="mt-8 hidden items-center justify-between border-t border-slate-100 pt-5 sm:flex">
                  <button
                    onClick={goPrev}
                    disabled={activeIndex <= 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size="{16}"/>
                    Previous
                  </button>

                  <button
                    onClick={completeAndNext}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size="{16}"/>
                    ) : activeLesson.completed ? (
                      <ArrowRight size="{16}"/>
                    ) : (
                      <CheckCircle2 size="{16}"/>
                    )}

                    {activeLesson.completed
                      ? isLast
                        ? "Back to modules"
                        : "Next lesson"
                      : isLast
                      ? "Complete module"
                      : "Complete & next"}
                  </button>
                </div>
              </article>
            )}
          </main>
        </div>
      )}

      {activeLesson && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
          <button
            onClick={goPrev}
            disabled={activeIndex <= 0}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft size="{16}"/>
            Prev
          </button>

          <button
            onClick={completeAndNext}
            disabled={saving}
            className="inline-flex flex-[1.5] items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size="{16}"/>
            ) : activeLesson.completed ? (
              <ArrowRight size="{16}"/>
            ) : (
              <CheckCircle2 size="{16}"/>
            )}
            {activeLesson.completed
              ? isLast
                ? "All modules"
                : "Next"
              : isLast
              ? "Complete"
              : "Complete & next"}
          </button>
        </div>
      )}
    </div>
  );
}
