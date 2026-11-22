import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE, apiGet, apiPost } from "../../lib/api";

const getArray = (value) => (Array.isArray(value) ? value : []);

const formatDate = (date) => {
  if (!date) return "No deadline";

  const d = new Date(date);

  if (isNaN(d.getTime())) return date;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const formatDateTime = (date) => {
  if (!date) return "Not specified";

  const d = new Date(date);

  if (isNaN(d.getTime())) return date;

  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const normalizeStatus = (status) =>
  String(status || "pending")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();

const statusStyle = (status) => {
  const s = normalizeStatus(status);

  if (["approved", "completed", "accepted"].includes(s))
    return { color: "#15803d", bg: "#dcfce7" };

  if (["submitted", "under review"].includes(s))
    return { color: "#1d4ed8", bg: "#dbeafe" };

  if (["revision required", "rejected"].includes(s))
    return { color: "#b45309", bg: "#fef3c7" };

  if (["late"].includes(s))
    return { color: "#dc2626", bg: "#fee2e2" };

  return { color: "#64748b", bg: "#f1f5f9" };
};

const normalizeType = (type) =>
  String(type || "text")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

const normalizeFileType = (type) => {
  const t = normalizeType(type);

  if (["upload", "document", "file_upload"].includes(t)) return "file";
  if (["pdf_upload"].includes(t)) return "pdf";
  if (["image_upload"].includes(t)) return "image";
  if (["link", "web_url"].includes(t)) return "url";
  if (["github_url", "repository"].includes(t)) return "github";

  return t;
};

const getToken = () =>
  localStorage.getItem("intern_token") ||
  localStorage.getItem("access_token") ||
  "";

const getTaskData = (res) =>
  res?.task || res?.data?.task || res?.data || res;

const getSubmissionData = (res, task) =>
  res?.submission ||
  res?.data?.submission ||
  task?.submission ||
  task?.latest_submission ||
  null;

const getConfig = (task) => task?.submission_config || {};

const getSubmissionType = (task) =>
  normalizeFileType(task?.submission_type || task?.submit_type || "text");

const getRequirements = (task) =>
  getArray(task?.requirements || task?.checklist);

const getResources = (task) =>
  getArray(task?.resources || task?.attachments);

const getSubmissionHistory = (submission, task) => {
  const history =
    submission?.history ||
    task?.submission_history ||
    task?.submissions ||
    [];

  if (Array.isArray(history) && history.length) return history;

  return submission ? [submission] : [];
};

const getUploadUrl = (response) => {
  if (typeof response === "string") {
    return response;
  }

  return (
    response?.url ||
    response?.file_url ||
    response?.document_url ||
    response?.uploaded_url ||
    response?.public_url ||
    response?.path ||
    response?.data?.url ||
    response?.data?.file_url ||
    response?.result?.url ||
    ""
  );
};

const getFileExtension = (file) =>
  file?.name?.split(".").pop()?.toLowerCase() || "";

const EMPTY_FIELDS = {};

const STYLES = `
  .td-page {
    min-height: 100vh;
    background: #f5f7fb;
    color: #172033;
    padding: 26px;
    font-family: Inter, system-ui, sans-serif;
  }

  .td-container {
    max-width: 1150px;
    margin: auto;
  }

  .td-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-bottom: 22px;
  }

  .td-back:hover {
    color: #2563eb;
  }

  .td-header {
    background: white;
    border: 1px solid #e7ebf2;
    border-radius: 18px;
    padding: 26px;
    margin-bottom: 20px;
  }

  .td-header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .td-title {
    font-size: 28px;
    font-weight: 750;
    letter-spacing: -0.6px;
    margin: 0 0 10px;
    color: #111827;
    line-height: 1.3;
  }

  .td-subtitle {
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
  }

  .td-badge {
    display: inline-flex;
    padding: 7px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .td-meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 24px;
  }

  .td-meta-item {
    background: #f8fafc;
    border: 1px solid #edf0f5;
    padding: 14px;
    border-radius: 12px;
  }

  .td-meta-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 6px;
  }

  .td-meta-value {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
  }

  .td-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
    gap: 20px;
  }

  .td-main, .td-sidebar {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .td-card {
    background: white;
    border: 1px solid #e7ebf2;
    border-radius: 16px;
    padding: 22px;
  }

  .td-card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 750;
    margin: 0 0 18px;
    color: #172033;
  }

  .td-card-title-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #eff6ff;
    color: #2563eb;
    font-size: 16px;
  }

  .td-description {
    color: #475569;
    font-size: 14px;
    line-height: 1.85;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .td-description p {
    margin: 0 0 12px;
  }

  .td-description p:last-child {
    margin-bottom: 0;
  }

  .td-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .td-list li {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    color: #475569;
    font-size: 14px;
    line-height: 1.65;
  }

  .td-check {
    width: 18px;
    height: 18px;
    border: 1.5px solid #cbd5e1;
    border-radius: 5px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .td-checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 0;
    border-bottom: 1px solid #edf0f5;
    color: #475569;
    font-size: 14px;
    line-height: 1.65;
  }

  .td-checklist-item input {
    accent-color: #2563eb;
    margin-top: 4px;
  }

  .td-resource {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #edf0f5;
    border-radius: 11px;
    margin-bottom: 10px;
    text-decoration: none;
    color: inherit;
    transition: .15s;
  }

  .td-resource:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  .td-resource-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #eff6ff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2563eb;
    font-size: 16px;
    flex-shrink: 0;
  }

  .td-resource-name {
    font-size: 13px;
    font-weight: 650;
    color: #1e293b;
    overflow-wrap: anywhere;
  }

  .td-resource-type {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }

  .td-form-group {
    margin-bottom: 18px;
  }

  .td-label {
    display: block;
    font-size: 13px;
    font-weight: 650;
    margin-bottom: 8px;
    color: #334155;
  }

  .td-required {
    color: #dc2626;
    margin-left: 4px;
  }

  .td-input, .td-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #dce2ea;
    border-radius: 10px;
    padding: 12px 14px;
    background: #fff;
    font: inherit;
    font-size: 14px;
    color: #172033;
    outline: none;
    transition: .15s;
  }

  .td-input:focus, .td-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,.1);
  }

  .td-textarea {
    min-height: 170px;
    resize: vertical;
    line-height: 1.7;
  }

  .td-code-editor {
    width: 100%;
    box-sizing: border-box;
    min-height: 260px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #253044;
    background: #111827;
    color: #d1fae5;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.65;
    resize: vertical;
    outline: none;
  }

  .td-code-meta {
    background: #f1f5f9;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 15px;
    font-size: 13px;
  }

  .td-starter-code {
    overflow: auto;
    background: #111827;
    color: #d1d5db;
    border-radius: 10px;
    padding: 15px;
    font-size: 12px;
    line-height: 1.6;
  }

  .td-character-count {
    text-align: right;
    color: #94a3b8;
    font-size: 12px;
    margin-top: 6px;
  }

  .td-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }

  .td-tab {
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    padding: 9px 13px;
    background: white;
    color: #64748b;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .td-tab.active {
    border-color: #2563eb;
    color: #2563eb;
    background: #eff6ff;
  }

  .td-file {
    border: 1.5px dashed #cbd5e1;
    border-radius: 12px;
    padding: 26px;
    text-align: center;
    background: #f8fafc;
  }

  .td-file-icon {
    font-size: 26px;
    color: #2563eb;
    margin-bottom: 8px;
  }

  .td-file input {
    max-width: 100%;
    margin-top: 10px;
  }

  .td-selected-files {
    margin-top: 10px;
  }

  .td-selected-file {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e5eaf2;
    border-radius: 10px;
    margin-bottom: 8px;
  }

  .td-selected-file-info {
    min-width: 0;
  }

  .td-selected-file strong {
    display: block;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .td-selected-file small {
    display: block;
    margin-top: 4px;
    color: #64748b;
  }

  .td-selected-file button {
    color: #dc2626;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .td-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    width: 100%;
    transition: .15s;
  }

  .td-button:hover {
    background: #1d4ed8;
  }

  .td-button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .td-alert {
    padding: 13px 15px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.6;
    margin-bottom: 15px;
  }

  .td-alert.error {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  .td-alert.success {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .td-alert.warning {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .td-kv {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid #edf0f5;
    font-size: 13px;
  }

  .td-kv:last-child {
    border-bottom: none;
  }

  .td-kv-label {
    color: #64748b;
  }

  .td-kv-value {
    color: #1e293b;
    font-weight: 650;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .td-feedback {
    background: #f8fafc;
    border: 1px solid #edf0f5;
    padding: 15px;
    border-radius: 11px;
    color: #475569;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .td-feedback-mark {
    font-size: 24px;
    font-weight: 800;
    color: #2563eb;
    margin-bottom: 8px;
  }

  .td-history-item {
    border-left: 2px solid #dbeafe;
    padding-left: 14px;
    margin-bottom: 18px;
  }

  .td-history-item:last-child {
    margin-bottom: 0;
  }

  .td-history-title {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
  }

  .td-history-date {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }

  .td-history-body {
    font-size: 13px;
    color: #64748b;
    margin-top: 8px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .td-loading {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    gap: 14px;
  }

  .td-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #dbeafe;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: tdspin .8s linear infinite;
  }

  @keyframes tdspin {
    to { transform: rotate(360deg); }
  }

  .td-error-card {
    max-width: 500px;
    margin: 10vh auto;
    padding: 30px;
    text-align: center;
    background: white;
    border-radius: 16px;
    border: 1px solid #e7ebf2;
  }

  .td-error-card button {
    border: 0;
    border-radius: 9px;
    padding: 11px 16px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-weight: 650;
  }

  .td-muted {
    color: #94a3b8;
    font-size: 13px;
  }

  @media (max-width: 900px) {
    .td-grid {
      grid-template-columns: 1fr;
    }

    .td-sidebar {
      order: -1;
    }

    .td-meta {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .td-page {
      padding: 14px;
    }

    .td-header {
      padding: 19px;
    }

    .td-title {
      font-size: 22px;
    }

    .td-header-top {
      flex-direction: column;
    }

    .td-meta {
      gap: 9px;
    }

    .td-meta-item {
      padding: 12px;
    }

    .td-card {
      padding: 17px;
    }

    .td-card-title {
      font-size: 15px;
    }

    .td-tabs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }

    .td-tab {
      text-align: center;
    }
  }
`;

export default function TaskDetail() {
  const { taskId, id } = useParams();
  const currentTaskId = taskId || id;
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [submission, setSubmission] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const [submissionType, setSubmissionType] = useState("text");

  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");

  const [submissionUrl, setSubmissionUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [mixedFields, setMixedFields] = useState(EMPTY_FIELDS);
  const [mixedFiles, setMixedFiles] = useState(EMPTY_FIELDS);

  const [checkedRequirements, setCheckedRequirements] = useState({});

  const loadTask = async () => {
    if (!currentTaskId) {
      setLoading(false);
      setError("Invalid task ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiGet(`/dash/tasks/${currentTaskId}`);

      const data = getTaskData(res);
      const sub = getSubmissionData(res, data);

      setTask(data);
      setSubmission(sub);

      const savedData = sub?.submission_data || sub?.data || sub || {};

      setAnswer(savedData.answer || savedData.text || savedData.content || "");
      setCode(savedData.code || "");
      setSubmissionUrl(savedData.url || savedData.submission_url || "");
      setGithubUrl(savedData.github_url || savedData.github || "");
      setMixedFields(savedData.fields || {});

      let resolvedType = normalizeFileType(
        sub?.submission_type ||
          data?.submission_type ||
          data?.submit_type ||
          "text"
      );

      if (resolvedType === "multiple") {
        const cfg = getConfig(data);
        const configured =
          cfg.accepted_submission_modes ||
          cfg.allowed_submission_types ||
          cfg.types;

        if (Array.isArray(configured) && configured.length) {
          resolvedType = normalizeFileType(configured[0]);
        } else {
          resolvedType = "text";
        }
      }

      setSubmissionType(resolvedType);
    } catch (e) {
      console.error("Task loading error:", e);
      setError(e?.message || "Unable to load task details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [currentTaskId]);

  const config = useMemo(() => getConfig(task), [task]);
  const resources = useMemo(() => getResources(task), [task]);
  const requirements = useMemo(() => getRequirements(task), [task]);
  const history = useMemo(
    () => getSubmissionHistory(submission, task),
    [submission, task]
  );

  const currentStatus =
    submission?.status ||
    task?.student_status ||
    task?.submission_status ||
    "Pending";

  const status = statusStyle(currentStatus);
  const normalizedStatus = normalizeStatus(currentStatus);

  const isApproved = ["approved", "completed", "accepted"].includes(
    normalizedStatus
  );
  const isRevision = ["revision required", "revision"].includes(
    normalizedStatus
  );
  const isSubmitted = ["submitted", "under review"].includes(normalizedStatus);
  const isLocked = isApproved;

  const baseType = getSubmissionType(task);

  const availableTypes = useMemo(() => {
    if (baseType === "multiple") {
      const configured =
        config.accepted_submission_modes ||
        config.allowed_submission_types ||
        config.types;

      if (Array.isArray(configured) && configured.length) {
        return configured.map(normalizeFileType);
      }

      return ["text", "url", "github", "file"];
    }

    if (baseType === "mixed") {
      return ["mixed"];
    }

    return [baseType];
  }, [baseType, config]);

  const fieldsConfig = useMemo(() => {
    const fields = config.fields || config.submission_fields || [];
    return Array.isArray(fields) ? fields : [];
  }, [config]);

  const attemptsUsed = history.length || (submission ? 1 : 0);

  const maxAttempts =
    task?.max_attempts == null ? 0 : Number(task.max_attempts);

  const attemptsRemaining =
    maxAttempts > 0 ? Math.max(maxAttempts - attemptsUsed, 0) : Infinity;

  const allowResubmission = Boolean(task?.allow_resubmission);
  const canResubmit = isRevision || allowResubmission;

  const startDate = task?.start_date ? new Date(task.start_date) : null;
  const dueDate = task?.due_date ? new Date(task.due_date) : null;
  const now = Date.now();

  const notStarted =
    startDate && !isNaN(startDate.getTime()) && startDate.getTime() > now;

  const deadlinePassed =
    dueDate && !isNaN(dueDate.getTime()) && dueDate.getTime() < now;

  const lateDays = Number(task?.late_days || 0);

  const lateDeadline =
    dueDate && lateDays > 0
      ? new Date(dueDate.getTime() + lateDays * 24 * 60 * 60 * 1000)
      : dueDate;

  const lateAllowed =
    Boolean(task?.allow_late_submission) &&
    lateDeadline &&
    now <= lateDeadline.getTime();

  const lateBlocked = deadlinePassed && !lateAllowed;

  const taskInactive =
    String(task?.status || "active").toLowerCase() !== "active";

  const noAttempts =
    maxAttempts > 0 && attemptsRemaining <= 0 && !isRevision;

  const shouldShowForm =
    !isLocked &&
    !taskInactive &&
    !notStarted &&
    !lateBlocked &&
    (!submission || canResubmit) &&
    !noAttempts;

  const taskType = task?.task_type || task?.type || "Assignment";

  const updateMixedField = (name, value) => {
    setMixedFields((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const validateFile = (file, fileConfig = {}) => {
    const allowedFormats =
      fileConfig.allowed_formats || config.allowed_formats || [];

    const formats = Array.isArray(allowedFormats)
      ? allowedFormats.map((f) => String(f).toLowerCase().replace(".", ""))
      : [];

    const maxSize = Number(
      fileConfig.max_file_size || config.max_file_size || 10
    );

    if (file.size > maxSize * 1024 * 1024) {
      return `${file.name} exceeds the ${maxSize} MB file limit.`;
    }

    if (formats.length) {
      const ext = getFileExtension(file);

      if (!formats.includes(ext)) {
        return `Invalid file format for ${file.name}. Allowed formats: ${formats.join(", ")}`;
      }
    }

    const fieldType = normalizeFileType(
      fileConfig.type || fileConfig.field_type || submissionType
    );

    if (fieldType === "pdf" && file.type !== "application/pdf") {
      return "Only PDF files are allowed.";
    }

    if (fieldType === "image" && !file.type.startsWith("image/")) {
      return "Only image files are allowed.";
    }

    return "";
  };

  const handleFileChange = (event, fieldName = null, fileConfig = {}) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const validationError = files
      .map((file) => validateFile(file, fileConfig))
      .find(Boolean);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    const multiple = Boolean(
      fileConfig.multiple_files ?? config.multiple_files
    );

    if (fieldName) {
      setMixedFiles((previous) => ({
        ...previous,
        [fieldName]: multiple
          ? [...(previous[fieldName] || []), ...files]
          : files.slice(0, 1)
      }));
    } else {
      setSelectedFiles((previous) =>
        multiple ? [...previous, ...files] : files.slice(0, 1)
      );
    }

    event.target.value = "";
  };

  const removeFile = (index, fieldName = null) => {
    if (fieldName) {
      setMixedFiles((previous) => ({
        ...previous,
        [fieldName]: (previous[fieldName] || []).filter((_, i) => i !== index)
      }));
    } else {
      setSelectedFiles((previous) => previous.filter((_, i) => i !== index));
    }
  };

  const uploadFile = async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/intern/upload-doc`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });

    let result = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.detail || result?.message || `Upload failed for ${file.name}`
      );
    }

    const url = getUploadUrl(result);

    if (!url) {
      throw new Error(
        `Upload successful but URL was not returned for ${file.name}`
      );
    }

    return {
      name: file.name,
      url,
      file_url: url,
      size: file.size,
      type: file.type
    };
  };

  const uploadFiles = async (files, label = "") => {
    const result = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setUploadMessage(
        `Uploading ${label ? label + ": " : ""}${file.name} (${i + 1}/${files.length})...`
      );

      const uploaded = await uploadFile(file);
      result.push(uploaded);
    }

    return result;
  };

  const validateSubmission = () => {
    if (config.require_requirements && requirements.length) {
      const incomplete = requirements.some(
        (_, index) => !checkedRequirements[index]
      );

      if (incomplete) {
        return "Please complete all required checklist items.";
      }
    }

    if (submissionType === "text") {
      if (!answer.trim()) {
        return "Please enter your answer before submitting.";
      }

      if (config.min_length && answer.trim().length < Number(config.min_length)) {
        return `Minimum ${config.min_length} characters required.`;
      }

      if (config.max_length && answer.trim().length > Number(config.max_length)) {
        return `Maximum ${config.max_length} characters allowed.`;
      }
    }

    if (submissionType === "code") {
      if (!code.trim()) {
        return "Please enter your code before submitting.";
      }
    }

    if (submissionType === "url") {
      if (!submissionUrl.trim()) {
        return "Please enter your submission link.";
      }

      if (!/^https?:\/\/.+/i.test(submissionUrl.trim())) {
        return "Enter a valid URL beginning with https:// or http://";
      }
    }

    if (submissionType === "github") {
      if (!githubUrl.trim()) {
        return "Please enter your GitHub repository link.";
      }

      if (!/^https?:\/\/(www\.)?github\.com\/.+/i.test(githubUrl.trim())) {
        return "Enter a valid GitHub repository URL.";
      }
    }

    if (
      ["file", "pdf", "image"].includes(submissionType) &&
      selectedFiles.length === 0
    ) {
      return "Please select a file to upload.";
    }

    if (submissionType === "mixed") {
      const requiredFields = fieldsConfig.filter((field) => field.required);

      for (const field of requiredFields) {
        const name = field.name || field.id;
        const fieldType = normalizeFileType(field.type || field.field_type);

        if (["file", "pdf", "image"].includes(fieldType)) {
          if (!(mixedFiles[name] || []).length) {
            return `${field.label || name} is required.`;
          }
        } else if (!String(mixedFields[name] || "").trim()) {
          return `${field.label || name} is required.`;
        }
      }

      if (
        config.require_one_field &&
        !fieldsConfig.some((field) => {
          const name = field.name || field.id;
          const fieldType = normalizeFileType(field.type || field.field_type);

          return ["file", "pdf", "image"].includes(fieldType)
            ? (mixedFiles[name] || []).length > 0
            : String(mixedFields[name] || "").trim();
        })
      ) {
        return "Please complete at least one submission field.";
      }
    }

    if (submissionType === "multiple") {
      return "Please select a submission method.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setUploadMessage("");

    if (!shouldShowForm) {
      setError("Submission is currently unavailable.");
      return;
    }

    const validationError = validateSubmission();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      let uploadedFiles = [];
      let filesByField = {};

      if (selectedFiles.length) {
        uploadedFiles = await uploadFiles(selectedFiles);
      }

      if (submissionType === "mixed") {
        for (const field of fieldsConfig) {
          const name = field.name || field.id;
          const files = mixedFiles[name] || [];

          if (files.length) {
            filesByField[name] = await uploadFiles(files, field.label || name);
          }
        }
      }

      setUploadMessage("");

      const uploadedFileUrls = uploadedFiles.map((file) => file.url);
      const fileUrl = uploadedFiles[0]?.url || "";

      const data = {
        answer:
          submissionType === "text"
            ? answer
            : submissionType === "code"
            ? code
            : "",
        text: submissionType === "text" ? answer : "",
        code: submissionType === "code" ? code : "",
        url: submissionType === "url" ? submissionUrl : "",
        github_url: submissionType === "github" ? githubUrl : "",
        github: submissionType === "github" ? githubUrl : "",
        file_url: fileUrl,
        file_name: uploadedFiles[0]?.name || "",
        files: uploadedFiles,
        file_urls: uploadedFileUrls,
        fields: mixedFields,
        files_by_field: filesByField
      };

      const payload = {
        submission_type: submissionType,
        answer: data.answer,
        text: data.text,
        code: data.code,
        url: data.url,
        github_url: data.github_url,
        github: data.github,
        file_url: data.file_url,
        file_name: data.file_name,
        files: data.files,
        file_urls: data.file_urls,
        fields: data.fields,
        files_by_field: data.files_by_field,
        submission_data: data,
        submitted_at: new Date().toISOString()
      };

      const res = await apiPost(
        `/dash/tasks/${currentTaskId}/submit`,
        payload
      );

      setSubmission(
        res?.submission || res?.data?.submission || res?.data || payload
      );

      setSuccess(
        res?.message || "Your task has been submitted successfully."
      );

      setSelectedFiles([]);
      setMixedFiles({});
      setCheckedRequirements({});

      await loadTask();
    } catch (e) {
      console.error("Submission error:", e);
      setError(e?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadMessage("");
    }
  };

  const fileAccept = (fileConfig = {}) => {
    const formats = fileConfig.allowed_formats || config.allowed_formats || [];

    if (Array.isArray(formats) && formats.length) {
      return formats
        .map((format) => {
          const f = String(format).trim();
          if (f.startsWith(".") || f.includes("/")) return f;
          return `.${f}`;
        })
        .join(",");
    }

    const type = normalizeFileType(
      fileConfig.type || fileConfig.field_type || submissionType
    );

    if (type === "pdf") return ".pdf";
    if (type === "image") return "image/*";

    return undefined;
  };

  const renderSelectedFiles = (files, fieldName = null) => {
    if (!files?.length) return null;

    return (
      <div className="td-selected-files">
        {files.map((file, index) => (
          <div className="td-selected-file" key={`${file.name}-${index}`}>
            <div className="td-selected-file-info">
              <strong>{file.name}</strong>
              <small>{(file.size / 1024).toFixed(1)} KB</small>
            </div>

            <button
              type="button"
              onClick={() => removeFile(index, fieldName)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderFileInput = (
    label,
    fieldName = null,
    fileConfig = {},
    keyProp = undefined
  ) => {
    const files = fieldName ? mixedFiles[fieldName] || [] : selectedFiles;
    const multiple = Boolean(
      fileConfig.multiple_files ?? config.multiple_files
    );

    return (
      <div className="td-form-group" key={keyProp}>
        <label className="td-label">
          {label}
          {fileConfig.required && <span className="td-required">*</span>}
        </label>

        <div className="td-file">
          <div className="td-file-icon">↑</div>

          <strong>Select file{multiple ? "s" : ""}</strong>

          <p className="td-muted">
            {multiple
              ? "Multiple files can be uploaded."
              : "Select one file from your device."}
          </p>

          <p className="td-muted">
            Maximum size:{" "}
            {fileConfig.max_file_size || config.max_file_size || 10} MB
          </p>

          {config.allowed_formats?.length > 0 && (
            <p className="td-muted">
              Allowed: {config.allowed_formats.join(", ")}
            </p>
          )}

          <input
            type="file"
            accept={fileAccept(fileConfig)}
            multiple={multiple}
            onChange={(event) => handleFileChange(event, fieldName, fileConfig)}
          />
        </div>

        {renderSelectedFiles(files, fieldName)}
      </div>
    );
  };

  const renderMixedField = (field, index) => {
    const name = field.name || field.id || `field_${index}`;
    const label = field.label || name;
    const fieldType = normalizeFileType(
      field.type || field.field_type || "text"
    );
    const required = Boolean(field.required);

    if (["file", "pdf", "image"].includes(fieldType)) {
      return renderFileInput(
        label,
        name,
        { ...field, type: fieldType },
        name
      );
    }

    if (fieldType === "code") {
      return (
        <div className="td-form-group" key={name}>
          <label className="td-label">
            {label}
            {required && <span className="td-required">*</span>}
          </label>

          <textarea
            className="td-code-editor"
            value={mixedFields[name] || ""}
            onChange={(event) => updateMixedField(name, event.target.value)}
            placeholder={field.placeholder || ""}
            spellCheck="false"
          />
        </div>
      );
    }

    if (["url", "github"].includes(fieldType)) {
      return (
        <div className="td-form-group" key={name}>
          <label className="td-label">
            {label}
            {required && <span className="td-required">*</span>}
          </label>

          <input
            className="td-input"
            type="url"
            value={mixedFields[name] || ""}
            onChange={(event) => updateMixedField(name, event.target.value)}
            placeholder={field.placeholder || "https://"}
          />
        </div>
      );
    }

    if (fieldType === "number") {
      return (
        <div className="td-form-group" key={name}>
          <label className="td-label">
            {label}
            {required && <span className="td-required">*</span>}
          </label>

          <input
            className="td-input"
            type="number"
            value={mixedFields[name] || ""}
            onChange={(event) => updateMixedField(name, event.target.value)}
            placeholder={field.placeholder || ""}
          />
        </div>
      );
    }

    if (["textarea", "text", "answer"].includes(fieldType)) {
      return (
        <div className="td-form-group" key={name}>
          <label className="td-label">
            {label}
            {required && <span className="td-required">*</span>}
          </label>

          <textarea
            className="td-textarea"
            rows={field.rows || 5}
            value={mixedFields[name] || ""}
            onChange={(event) => updateMixedField(name, event.target.value)}
            placeholder={field.placeholder || ""}
          />
        </div>
      );
    }

    return (
      <div className="td-form-group" key={name}>
        <label className="td-label">
          {label}
          {required && <span className="td-required">*</span>}
        </label>

        <input
          className="td-input"
          type="text"
          value={mixedFields[name] || ""}
          onChange={(event) => updateMixedField(name, event.target.value)}
          placeholder={field.placeholder || ""}
        />
      </div>
    );
  };

  const renderSubmissionForm = () => {
    switch (submissionType) {
      case "text":
        return (
          <div className="td-form-group">
            <label className="td-label">Your Answer / Work</label>

            <textarea
              className="td-textarea"
              placeholder="Write your solution, explanation or work here..."
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              minLength={config.min_length || undefined}
              maxLength={config.max_length || undefined}
            />

            <div className="td-character-count">
              {answer.length}
              {config.max_length ? ` / ${config.max_length}` : " characters"}
            </div>
          </div>
        );

      case "code":
        return (
          <>
            <div className="td-code-meta">
              <span>
                Language:{" "}
                <strong>{config.code_language || "Not specified"}</strong>
              </span>
            </div>

            {config.starter_code && (
              <div className="td-form-group">
                <label className="td-label">Starter Code</label>
                <pre className="td-starter-code">{config.starter_code}</pre>
              </div>
            )}

            <div className="td-form-group">
              <label className="td-label">Your Code</label>

              <textarea
                className="td-code-editor"
                placeholder="Write or paste your code here..."
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck="false"
              />
            </div>
          </>
        );

      case "file":
        return renderFileInput("Upload your submission");

      case "pdf":
        return renderFileInput("Upload PDF document", null, { type: "pdf" });

      case "image":
        return renderFileInput("Upload image", null, { type: "image" });

      case "url":
        return (
          <div className="td-form-group">
            <label className="td-label">Submission URL</label>

            <input
              className="td-input"
              type="url"
              placeholder="https://"
              value={submissionUrl}
              onChange={(event) => setSubmissionUrl(event.target.value)}
            />
          </div>
        );

      case "github":
        return (
          <div className="td-form-group">
            <label className="td-label">GitHub Repository URL</label>

            <input
              className="td-input"
              type="url"
              placeholder="https://github.com/username/repository"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
            />
          </div>
        );

      case "mixed":
        return (
          <>
            {fieldsConfig.map((field, index) => renderMixedField(field, index))}

            {!fieldsConfig.length && (
              <div className="td-alert warning">
                Submission fields have not been configured by the administrator.
              </div>
            )}
          </>
        );

      default:
        return (
          <>
            <div className="td-form-group">
              <label className="td-label">Your Answer</label>

              <textarea
                className="td-textarea"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Enter your submission..."
              />
            </div>

            {renderFileInput("Attach file")}
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="td-page">
        <style>{STYLES}</style>
        <div className="td-loading">
          <div className="td-spinner" />
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="td-page">
        <style>{STYLES}</style>
        <div className="td-error-card">
          <h2>Task not found</h2>
          <p>{error || "The task may have been removed or is unavailable."}</p>

          <button onClick={() => navigate("/dash/tasks")}>
            Back to My Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="td-page">
      <style>{STYLES}</style>

      <div className="td-container">
        <button className="td-back" onClick={() => navigate("/dash/tasks")}>
          ← Back to My Tasks
        </button>

        <header className="td-header">
          <div className="td-header-top">
            <div>
              <h1 className="td-title">
                {task.title || task.name || "Task Details"}
              </h1>

              <p className="td-subtitle">
                {task.program_name ||
                  task.program?.title ||
                  "Internship Program"}
                {task.batch_name || task.batch?.name
                  ? ` · ${task.batch_name || task.batch?.name}`
                  : ""}
              </p>
            </div>

            <span
              className="td-badge"
              style={{
                color: status.color,
                background: status.bg
              }}
            >
              {currentStatus}
            </span>
          </div>

          <div className="td-meta">
            <div className="td-meta-item">
              <div className="td-meta-label">Task Type</div>
              <div className="td-meta-value">{taskType}</div>
            </div>

            <div className="td-meta-item">
              <div className="td-meta-label">Due Date</div>
              <div className="td-meta-value">{formatDate(task.due_date)}</div>
            </div>

            <div className="td-meta-item">
              <div className="td-meta-label">Maximum Marks</div>
              <div className="td-meta-value">
                {task.max_marks ?? task.marks ?? "—"}
              </div>
            </div>

            <div className="td-meta-item">
              <div className="td-meta-label">Submission</div>
              <div className="td-meta-value">
                {task.submission_type || task.submit_type || "Any Format"}
              </div>
            </div>
          </div>
        </header>

        <div className="td-grid">
          <div className="td-main">
            <section className="td-card">
              <h2 className="td-card-title">
                <span className="td-card-title-icon">≡</span>
                Task Description
              </h2>

              <div className="td-description">
                {task.description || "No description provided."}
              </div>
            </section>

            <section className="td-card">
              <h2 className="td-card-title">
                <span className="td-card-title-icon">✎</span>
                Instructions
              </h2>

              <div className="td-description">
                {task.instructions || "No additional instructions provided."}
              </div>
            </section>

            {requirements.length > 0 && (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">✓</span>
                  Requirements
                </h2>

                {requirements.map((item, index) => (
                  <label className="td-checklist-item" key={index}>
                    <input
                      type="checkbox"
                      checked={Boolean(checkedRequirements[index])}
                      onChange={(event) =>
                        setCheckedRequirements((previous) => ({
                          ...previous,
                          [index]: event.target.checked
                        }))
                      }
                    />

                    <span>
                      {typeof item === "string"
                        ? item
                        : item.title || item.text || item.description}
                    </span>
                  </label>
                ))}
              </section>
            )}

            {resources.length > 0 && (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">↗</span>
                  Learning Resources
                </h2>

                {resources.map((resource, index) => {
                  const url =
                    typeof resource === "string"
                      ? resource
                      : resource.url ||
                        resource.link ||
                        resource.file_url ||
                        "#";

                  const title =
                    typeof resource === "string"
                      ? resource
                      : resource.title ||
                        resource.name ||
                        `Resource ${index + 1}`;

                  const resourceType =
                    typeof resource === "string"
                      ? "Reference"
                      : resource.type || "Reference Resource";

                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="td-resource"
                    >
                      <div className="td-resource-icon">
                        {resourceType.toLowerCase().includes("video")
                          ? "▶"
                          : resourceType.toLowerCase().includes("pdf")
                          ? "▤"
                          : "↗"}
                      </div>

                      <div>
                        <div className="td-resource-name">{title}</div>
                        <div className="td-resource-type">{resourceType}</div>
                      </div>
                    </a>
                  );
                })}
              </section>
            )}

            {task.grading_criteria?.length > 0 && (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">◎</span>
                  Evaluation Criteria
                </h2>

                <ul className="td-list">
                  {task.grading_criteria.map((criteria, index) => (
                    <li key={index}>
                      <span className="td-check" />

                      <span>
                        {typeof criteria === "string"
                          ? criteria
                          : criteria.title ||
                            criteria.name ||
                            criteria.description}
                        {criteria.marks != null
                          ? ` — ${criteria.marks} marks`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {shouldShowForm && (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">↑</span>
                  Submit Your Work
                </h2>

                {isSubmitted && (
                  <div className="td-alert warning">
                    Your submission is currently under review.
                    {canResubmit
                      ? " You may submit an updated version."
                      : " Resubmission is not enabled."}
                  </div>
                )}

                {isRevision && (
                  <div className="td-alert warning">
                    Your mentor has requested changes. Review the feedback below
                    and submit your updated work.
                  </div>
                )}

                {deadlinePassed && lateAllowed && (
                  <div className="td-alert warning">
                    Late submission is enabled for this task.
                  </div>
                )}

                {error && <div className="td-alert error">{error}</div>}
                {success && <div className="td-alert success">{success}</div>}
                {uploadMessage && (
                  <div className="td-alert warning">{uploadMessage}</div>
                )}

                <form onSubmit={handleSubmit}>
                  {availableTypes.length > 1 && (
                    <div className="td-tabs">
                      {availableTypes.map((type) => (
                        <button
                          type="button"
                          key={type}
                          className={`td-tab ${
                            submissionType === type ? "active" : ""
                          }`}
                          onClick={() => {
                            setSubmissionType(type);
                            setError("");
                          }}
                        >
                          {type === "text"
                            ? "Written Answer"
                            : type === "code"
                            ? "Code"
                            : type === "url"
                            ? "Link"
                            : type === "github"
                            ? "GitHub"
                            : type === "file"
                            ? "File Upload"
                            : type === "pdf"
                            ? "PDF"
                            : type === "image"
                            ? "Image"
                            : type}
                        </button>
                      ))}
                    </div>
                  )}

                  {submissionType === "mixed" && (
                    <div className="td-alert warning">
                      Complete the submission fields configured by your
                      administrator.
                    </div>
                  )}

                  {renderSubmissionForm()}

                  <button
                    type="submit"
                    className="td-button"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Submitting..."
                      : isRevision
                      ? "Resubmit Assignment"
                      : "Submit Assignment"}
                  </button>
                </form>
              </section>
            )}

            {!shouldShowForm && !isLocked && (
              <section className="td-card">
                <h2 className="td-card-title">Submission Status</h2>

                {taskInactive && (
                  <div className="td-alert warning">
                    This task is currently inactive.
                  </div>
                )}

                {notStarted && (
                  <div className="td-alert warning">
                    This task will be available from{" "}
                    {formatDateTime(task.start_date)}.
                  </div>
                )}

                {lateBlocked && (
                  <div className="td-alert error">
                    The submission deadline has passed and late submissions are
                    not allowed.
                  </div>
                )}

                {noAttempts && (
                  <div className="td-alert warning">
                    You have reached the maximum number of submission attempts.
                  </div>
                )}

                {submission && !canResubmit && (
                  <div className="td-alert warning">
                    Your submission has already been submitted. Resubmission is
                    not allowed.
                  </div>
                )}
              </section>
            )}

            {isLocked && (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">✓</span>
                  Task Completed
                </h2>

                <div className="td-alert success">
                  This task has been approved. Your submission is complete.
                </div>
              </section>
            )}

            {submission && (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">▤</span>
                  Your Submission
                </h2>

                <div className="td-kv">
                  <span className="td-kv-label">Status</span>

                  <span
                    className="td-kv-value"
                    style={{ color: status.color }}
                  >
                    {currentStatus}
                  </span>
                </div>

                <div className="td-kv">
                  <span className="td-kv-label">Submitted At</span>

                  <span className="td-kv-value">
                    {formatDateTime(
                      submission.submitted_at || submission.created_at
                    )}
                  </span>
                </div>

                {submission.marks != null && (
                  <div className="td-kv">
                    <span className="td-kv-label">Marks</span>

                    <span className="td-kv-value">
                      {submission.marks}
                      {task.max_marks != null ? ` / ${task.max_marks}` : ""}
                    </span>
                  </div>
                )}

                {(submission.answer ||
                  submission.text ||
                  submission.submission_data?.answer) && (
                  <div style={{ marginTop: 16 }}>
                    <div className="td-label">Submitted Answer</div>

                    <div className="td-feedback">
                      {submission.answer ||
                        submission.text ||
                        submission.submission_data?.answer}
                    </div>
                  </div>
                )}

                {(submission.code || submission.submission_data?.code) && (
                  <div style={{ marginTop: 16 }}>
                    <div className="td-label">Submitted Code</div>

                    <pre className="td-starter-code">
                      {submission.code || submission.submission_data?.code}
                    </pre>
                  </div>
                )}

                {(submission.url ||
                  submission.github_url ||
                  submission.submission_data?.url ||
                  submission.submission_data?.github_url) && (
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={
                        submission.url ||
                        submission.github_url ||
                        submission.submission_data?.url ||
                        submission.submission_data?.github_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#2563eb",
                        fontWeight: 650,
                        fontSize: 13,
                        overflowWrap: "anywhere"
                      }}
                    >
                      Open Submitted Link ↗
                    </a>
                  </div>
                )}

                {(
                  submission.files ||
                  submission.submission_data?.files ||
                  []
                ).map((file, index) => (
                  <div key={index} style={{ marginTop: 12 }}>
                    <a
                      href={typeof file === "string" ? file : file.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#2563eb",
                        fontWeight: 650,
                        fontSize: 13,
                        overflowWrap: "anywhere"
                      }}
                    >
                      {typeof file === "string"
                        ? `Uploaded File ${index + 1}`
                        : file.name || `Uploaded File ${index + 1}`}{" "}
                      ↗
                    </a>
                  </div>
                ))}

                {submission.file_url && (
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#2563eb",
                        fontWeight: 650,
                        fontSize: 13
                      }}
                    >
                      Open Submitted File ↗
                    </a>
                  </div>
                )}
              </section>
            )}

            {submission?.feedback ||
            submission?.review_comment ||
            task?.feedback ? (
              <section className="td-card">
                <h2 className="td-card-title">
                  <span className="td-card-title-icon">✦</span>
                  Mentor Feedback
                </h2>

                {submission?.marks != null && (
                  <div className="td-feedback-mark">
                    {submission.marks} / {task.max_marks || task.marks || "—"}
                  </div>
                )}

                <div className="td-feedback">
                  {submission?.feedback ||
                    submission?.review_comment ||
                    task?.feedback}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="td-sidebar">
            <section className="td-card">
              <h2 className="td-card-title">Task Overview</h2>

              <div className="td-kv">
                <span className="td-kv-label">Status</span>

                <span
                  className="td-kv-value"
                  style={{ color: status.color }}
                >
                  {currentStatus}
                </span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Start Date</span>
                <span className="td-kv-value">
                  {formatDate(task.start_date)}
                </span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Deadline</span>
                <span className="td-kv-value">{formatDate(task.due_date)}</span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Marks</span>
                <span className="td-kv-value">
                  {task.max_marks ?? task.marks ?? "Not specified"}
                </span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Task Type</span>
                <span className="td-kv-value">{taskType}</span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Difficulty</span>
                <span className="td-kv-value">
                  {task.difficulty || "Not specified"}
                </span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Estimated Time</span>
                <span className="td-kv-value">
                  {task.estimated_hours
                    ? `${task.estimated_hours} hours`
                    : "Not specified"}
                </span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Program</span>
                <span className="td-kv-value">
                  {task.program_name || task.program?.title || "—"}
                </span>
              </div>

              <div className="td-kv">
                <span className="td-kv-label">Batch</span>
                <span className="td-kv-value">
                  {task.batch_name || task.batch?.name || "—"}
                </span>
              </div>
            </section>

            <section className="td-card">
              <h2 className="td-card-title">Submission Rules</h2>

              <div className="td-kv">
                <span className="td-kv-label">Resubmission</span>
                <span className="td-kv-value">
                  {task.allow_resubmission ? "Allowed" : "Not Allowed"}
                </span>
              </div>

              {maxAttempts > 0 && (
                <div className="td-kv">
                  <span className="td-kv-label">Attempts</span>
                  <span className="td-kv-value">
                    {attemptsUsed} / {maxAttempts}
                  </span>
                </div>
              )}

              <div className="td-kv">
                <span className="td-kv-label">Late Submission</span>
                <span className="td-kv-value">
                  {task.allow_late_submission
                    ? `Allowed (${lateDays} days)`
                    : "Not Allowed"}
                </span>
              </div>

              {config.max_file_size && (
                <div className="td-kv">
                  <span className="td-kv-label">Maximum File Size</span>
                  <span className="td-kv-value">
                    {config.max_file_size} MB
                  </span>
                </div>
              )}

              {config.allowed_formats?.length > 0 && (
                <div className="td-kv">
                  <span className="td-kv-label">Allowed Formats</span>
                  <span className="td-kv-value">
                    {config.allowed_formats.join(", ")}
                  </span>
                </div>
              )}
            </section>

            {submission?.marks != null && (
              <section className="td-card">
                <h2 className="td-card-title">Your Score</h2>

                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
                      color: "#2563eb"
                    }}
                  >
                    {submission.marks}
                  </div>

                  <div className="td-muted">
                    out of {task.max_marks || task.marks || "—"} marks
                  </div>
                </div>
              </section>
            )}

            {history.length > 0 && (
              <section className="td-card">
                <h2 className="td-card-title">Submission History</h2>

                {history.map((item, index) => (
                  <div
                    className="td-history-item"
                    key={item.id || item._id || index}
                  >
                    <div className="td-history-title">
                      Attempt {history.length - index}
                    </div>

                    <div className="td-history-date">
                      {formatDateTime(item.submitted_at || item.created_at)}
                    </div>

                    <div className="td-history-body">
                      {item.status || "Submitted"}
                      {item.marks != null ? ` · Marks: ${item.marks}` : ""}
                    </div>

                    {item.feedback && (
                      <div className="td-history-body">
                        Feedback: {item.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section className="td-card">
              <h2 className="td-card-title">Need Help?</h2>

              <p className="td-description">
                If you have any questions regarding this task, contact your
                mentor or internship coordinator.
              </p>

              <button
                className="td-button"
                style={{
                  marginTop: 12,
                  background: "#eef2f7",
                  color: "#334155"
                }}
                onClick={() => navigate("/dash/tasks")}
              >
                Back to Tasks
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
