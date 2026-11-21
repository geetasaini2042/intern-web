
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../../lib/api";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://api.singodiyatechnologies.tech";

const getToken = () =>
  localStorage.getItem("intern_token") ||
  localStorage.getItem("access_token") ||
  "";

const getData = (response) =>
  response?.task ||
  response?.data?.task ||
  response?.data ||
  response;

const getArray = (value) =>
  Array.isArray(value) ? value : [];

const formatDate = (value) => {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  });
};

const normalizeType = (type) =>
  String(type || "text").toLowerCase().trim();

const isFileType = (type) =>
  ["file", "upload", "document", "pdf", "image"].includes(type);

const getSubmissionConfig = (task) =>
  task?.submission_config || {};

const getSubmissionType = (task) =>
  normalizeType(task?.submission_type);

const extractUrl = (response) => {
  const data =
    response?.data ||
    response?.result ||
    response;

  if (typeof data === "string") {
    return data;
  }

  return (
    data?.url ||
    data?.file_url ||
    data?.document_url ||
    data?.uploaded_url ||
    data?.public_url ||
    data?.path ||
    data?.data?.url ||
    data?.data?.file_url ||
    ""
  );
};

const getStatusColor = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    ["approved", "completed", "accepted"].includes(value)
  ) {
    return "#16a34a";
  }

  if (
    ["revision_required", "rejected", "late"].includes(value)
  ) {
    return "#dc2626";
  }

  if (
    ["submitted", "under_review", "review"].includes(value)
  ) {
    return "#d97706";
  }

  return "#64748b";
};

const EMPTY_SUBMISSION = {
  text: "",
  code: "",
  url: "",
  github: "",
  files: [],
  fields: {},
};

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [submission, setSubmission] = useState(EMPTY_SUBMISSION);
  const [requirementsChecked, setRequirementsChecked] =
    useState({});

  const [history, setHistory] = useState([]);
  const [uploadProgress, setUploadProgress] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadTask();
  }, [taskId]);

  async function loadTask() {
    try {
      setLoading(true);
      setError("");

      const response = await apiGet(
        `/dash/tasks/${taskId}`
      );

      const data = getData(response);

      setTask(data);

      setHistory(
        data?.submissions ||
        data?.submission_history ||
        []
      );

      if (data?.latest_submission) {
        setHistory((previous) => {
          if (
            previous.some(
              (item) =>
                item.id === data.latest_submission.id
            )
          ) {
            return previous;
          }

          return [
            data.latest_submission,
            ...previous
          ];
        });
      }
    } catch (err) {
      console.error("Task loading error:", err);

      setError(
        err?.message ||
        "Unable to load task details."
      );
    } finally {
      setLoading(false);
    }
  }

  const config = useMemo(
    () => getSubmissionConfig(task),
    [task]
  );

  const submissionType = useMemo(
    () => getSubmissionType(task),
    [task]
  );

  const requirements = useMemo(
    () => getArray(task?.requirements),
    [task]
  );

  const resources = useMemo(
    () => getArray(task?.resources),
    [task]
  );

  const gradingCriteria = useMemo(
    () => getArray(task?.grading_criteria),
    [task]
  );

  const mixedFields = useMemo(() => {
    return getArray(
      config.fields ||
      config.submission_fields ||
      config.accepted_submission_modes
    );
  }, [config]);

  const latestSubmission = history[0] || null;

  const taskStatus = latestSubmission?.status || "Pending";

  const alreadySubmitted = Boolean(latestSubmission);

  const isCompleted = [
    "approved",
    "completed",
    "accepted",
  ].includes(String(taskStatus).toLowerCase());

  const isRevision = [
    "revision_required",
    "revision",
  ].includes(String(taskStatus).toLowerCase());

  const isLocked =
    isCompleted ||
    (
      alreadySubmitted &&
      !task?.allow_resubmission &&
      !isRevision
    );

  const maxAttempts =
    Number(task?.max_attempts || 0);

  const attemptsUsed = history.length;

  const attemptsRemaining =
    maxAttempts > 0
      ? Math.max(maxAttempts - attemptsUsed, 0)
      : Infinity;

  const canSubmit =
    !isLocked &&
    (
      !alreadySubmitted ||
      task?.allow_resubmission ||
      isRevision
    ) &&
    (
      maxAttempts <= 0 ||
      attemptsRemaining > 0
    );

  const updateSubmission = (key, value) => {
    setSubmission((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateField = (key, value) => {
    setSubmission((previous) => ({
      ...previous,
      fields: {
        ...previous.fields,
        [key]: value,
      },
    }));
  };

  const uploadDocument = async (file) => {
    const token = getToken();

    const formData = new FormData();

    formData.append("file", file);

    setUploadProgress(`Uploading ${file.name}...`);

    const response = await fetch(
      `${API_BASE}/intern/upload-doc`,
      {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
        body: formData,
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      throw new Error(
        result?.detail ||
        result?.message ||
        `Upload failed: ${file.name}`
      );
    }

    const url = extractUrl(result);

    if (!url) {
      throw new Error(
        `Upload API did not return a URL for ${file.name}`
      );
    }

    return {
      name: file.name,
      url,
      size: file.size,
      type: file.type,
    };
  };

  const validateFile = (file) => {
    const maxSize =
      Number(config.max_file_size || 10);

    if (file.size > maxSize * 1024 * 1024) {
      return `${file.name} exceeds ${maxSize} MB limit.`;
    }

    const formats = getArray(
      config.allowed_formats
    ).map((item =>
      String(item).toLowerCase().replace(".", "")
    ));

    if (formats.length) {
      const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

      if (!formats.includes(extension)) {
        return `${file.name} format is not allowed. Allowed: ${formats.join(", ")}`;
      }
    }

    if (
      submissionType === "pdf" &&
      file.type !== "application/pdf"
    ) {
      return "Only PDF files are allowed.";
    }

    if (
      submissionType === "image" &&
      !file.type.startsWith("image/")
    ) {
      return "Only image files are allowed.";
    }

    return "";
  };

  const handleFileSelection = (
    event,
    target = "files"
  ) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (!selectedFiles.length) return;

    const errorMessage = selectedFiles
      .map(validateFile)
      .find(Boolean);

    if (errorMessage) {
      setError(errorMessage);
      event.target.value = "";
      return;
    }

    setError("");

    setSubmission((previous) => ({
      ...previous,
      [target]: config.multiple_files
        ? [
            ...(previous[target] || []),
            ...selectedFiles,
          ]
        : selectedFiles.slice(0, 1),
    }));

    event.target.value = "";
  };

  const removeFile = (index, target = "files") => {
    setSubmission((previous) => ({
      ...previous,
      [target]: previous[target].filter(
        (_, fileIndex) => fileIndex !== index
      ),
    }));
  };

  const uploadFiles = async (files) => {
    const uploaded = [];

    for (const file of files) {
      const result = await uploadDocument(file);
      uploaded.push(result);
    }

    return uploaded;
  };

  const validateSubmission = () => {
    if (requirements.length) {
      const incomplete = requirements.some(
        (_, index) => !requirementsChecked[index]
      );

      if (incomplete) {
        return "Please complete all task requirements before submitting.";
      }
    }

    if (submissionType === "text") {
      const text = submission.text.trim();

      if (!text) {
        return "Please enter your answer.";
      }

      if (
        config.min_length &&
        text.length < Number(config.min_length)
      ) {
        return `Minimum ${config.min_length} characters required.`;
      }

      if (
        config.max_length &&
        text.length > Number(config.max_length)
      ) {
        return `Maximum ${config.max_length} characters allowed.`;
      }
    }

    if (submissionType === "code") {
      if (!submission.code.trim()) {
        return "Please submit your code.";
      }
    }

    if (
      ["url", "link"].includes(submissionType)
    ) {
      if (!submission.url.trim()) {
        return "Please provide your link.";
      }

      if (!/^https?:\/\/.+/i.test(submission.url)) {
        return "Please enter a valid URL starting with http:// or https://";
      }
    }

    if (
      ["github", "github_url"].includes(submissionType)
    ) {
      if (!submission.github.trim()) {
        return "Please provide your GitHub repository.";
      }

      if (
        !/^https?:\/\/(www\.)?github\.com\/.+/i.test(
          submission.github
        )
      ) {
        return "Please enter a valid GitHub repository URL.";
      }
    }

    if (isFileType(submissionType)) {
      if (!submission.files.length) {
        return "Please select a file to upload.";
      }
    }

    if (submissionType === "mixed") {
      if (
        !submission.text.trim() &&
        !submission.code.trim() &&
        !submission.url.trim() &&
        !submission.github.trim() &&
        !submission.files.length &&
        !Object.values(submission.fields).some(
          (value) => String(value || "").trim()
        )
      ) {
        return "Please complete at least one submission field.";
      }
    }

    for (const field of mixedFields) {
      if (
        field.required &&
        !submission.fields[field.name]?.trim()
      ) {
        return `${field.label || field.name} is required.`;
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const validation = validateSubmission();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSubmitting(true);

      let uploadedFiles = [];

      if (submission.files.length) {
        uploadedFiles = await uploadFiles(
          submission.files
        );
      }

      setUploadProgress("");

      const submissionData = {
        text: submission.text,
        code: submission.code,
        url: submission.url,
        github: submission.github,
        fields: submission.fields,
        files: uploadedFiles,
      };

      const payload = {
        task_id: taskId,
        submission_type: submissionType,
        submission_data: submissionData,
        submitted_at: new Date().toISOString(),
      };

      const response = await apiPost(
        `/dash/tasks/${taskId}/submit`,
        payload
      );

      setSuccessMessage(
        response?.message ||
        "Task submitted successfully!"
      );

      setSubmission(EMPTY_SUBMISSION);
      setRequirementsChecked({});

      await loadTask();
    } catch (err) {
      console.error("Task submission error:", err);

      setError(
        err?.message ||
        "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  const renderFileInput = (
    label = "Upload file",
    target = "files"
  ) => {
    const selectedFiles = submission[target] || [];

    const accept =
      config.allowed_formats?.length
        ? config.allowed_formats
            .map((format) => `.${String(format).replace(".", "")}`)
            .join(",")
        : submissionType === "pdf"
        ? ".pdf"
        : submissionType === "image"
        ? "image/*"
        : undefined;

    return (
      <div className="td-field">
        <label className="td-label">{label}</label>

        <label className="td-upload">
          <div className="td-upload-icon">↑</div>
          <strong>Click to select files</strong>
          <span>
            {config.multiple_files
              ? "Multiple files allowed"
              : "Single file upload"}
          </span>

          <span className="td-upload-hint">
            Maximum {config.max_file_size || 10} MB
          </span>

          <input
            type="file"
            accept={accept}
            multiple={Boolean(config.multiple_files)}
            onChange={(event) =>
              handleFileSelection(event, target)
            }
          />
        </label>

        {selectedFiles.length > 0 && (
          <div className="td-selected-files">
            {selectedFiles.map((file, index) => (
              <div
                className="td-selected-file"
                key={`${file.name}-${index}`}
              >
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index, target)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubmissionField = (field) => {
    const type = normalizeType(
      field.type || field.field_type
    );

    const name = field.name || field.id;
    const label = field.label || name;
    const required = Boolean(field.required);

    if (isFileType(type)) {
      return renderFileInput(label, name);
    }

    if (
      ["code", "textarea", "text"].includes(type)
    ) {
      return (
        <div className="td-field" key={name}>
          <label className="td-label">
            {label}
            {required && <span className="td-required">*</span>}
          </label>

          <textarea
            className="td-textarea"
            value={submission.fields[name] || ""}
            onChange={(event) =>
              updateField(name, event.target.value)
            }
            required={required}
            rows={type === "code" ? 10 : 5}
            placeholder={field.placeholder || ""}
          />
        </div>
      );
    }

    if (
      ["url", "link", "github"].includes(type)
    ) {
      return (
        <div className="td-field" key={name}>
          <label className="td-label">
            {label}
            {required && <span className="td-required">*</span>}
          </label>

          <input
            className="td-input"
            type="url"
            value={submission.fields[name] || ""}
            onChange={(event) =>
              updateField(name, event.target.value)
            }
            required={required}
            placeholder={
              field.placeholder ||
              "https://"
            }
          />
        </div>
      );
    }

    return (
      <div className="td-field" key={name}>
        <label className="td-label">
          {label}
          {required && <span className="td-required">*</span>}
        </label>

        <input
          className="td-input"
          type={type === "number" ? "number" : "text"}
          value={submission.fields[name] || ""}
          onChange={(event) =>
            updateField(name, event.target.value)
          }
          required={required}
          placeholder={field.placeholder || ""}
        />
      </div>
    );
  };

  const renderSubmissionForm = () => {
    switch (submissionType) {
      case "text":
        return (
          <div className="td-field">
            <label className="td-label">
              Your Answer
            </label>

            <textarea
              className="td-textarea"
              rows={8}
              value={submission.text}
              onChange={(event) =>
                updateSubmission(
                  "text",
                  event.target.value
                )
              }
              placeholder="Write your answer here..."
              required
            />

            <div className="td-character-count">
              {submission.text.length}
              {config.max_length
                ? ` / ${config.max_length}`
                : " characters"}
            </div>
          </div>
        );

      case "code":
        return (
          <>
            <div className="td-code-meta">
              <span>
                Language:{" "}
                <strong>
                  {config.code_language || "Not specified"}
                </strong>
              </span>
            </div>

            {config.starter_code && (
              <div className="td-starter">
                <label className="td-label">
                  Starter Code
                </label>

                <pre>
                  {config.starter_code}
                </pre>
              </div>
            )}

            <div className="td-field">
              <label className="td-label">
                Your Code
              </label>

              <textarea
                className="td-code-editor"
                value={submission.code}
                onChange={(event) =>
                  updateSubmission(
                    "code",
                    event.target.value
                  )
                }
                placeholder="Write or paste your code here..."
                spellCheck="false"
                required
              />
            </div>
          </>
        );

      case "file":
      case "upload":
      case "document":
        return renderFileInput("Upload your submission");

      case "pdf":
        return renderFileInput("Upload PDF document");

      case "image":
        return renderFileInput("Upload image");

      case "url":
      case "link":
        return (
          <div className="td-field">
            <label className="td-label">
              Submission URL
            </label>

            <input
              className="td-input"
              type="url"
              value={submission.url}
              onChange={(event) =>
                updateSubmission(
                  "url",
                  event.target.value
                )
              }
              placeholder="https://"
              required
            />
          </div>
        );

      case "github":
      case "github_url":
        return (
          <div className="td-field">
            <label className="td-label">
              GitHub Repository
            </label>

            <input
              className="td-input"
              type="url"
              value={submission.github}
              onChange={(event) =>
                updateSubmission(
                  "github",
                  event.target.value
                )
              }
              placeholder="https://github.com/username/repository"
              required
            />
          </div>
        );

      case "mixed":
        return (
          <>
            {mixedFields.map((field, index) => (
              <div key={field.name || field.id || index}>
                {renderSubmissionField(field)}
              </div>
            ))}

            {!mixedFields.length && (
              <div className="td-warning">
                Admin has not configured mixed submission
                fields for this task.
              </div>
            )}
          </>
        );

      default:
        return (
          <div className="td-field">
            <label className="td-label">
              Your Submission
            </label>

            <textarea
              className="td-textarea"
              rows={6}
              value={submission.text}
              onChange={(event) =>
                updateSubmission(
                  "text",
                  event.target.value
                )
              }
              placeholder="Enter your submission..."
            />

            {renderFileInput("Attach files")}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="td-page">
        <div className="td-loading">
          <div className="td-spinner" />
          <p>Loading task...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="td-page">
        <div className="td-error-box">
          <h2>Unable to load task</h2>
          <p>{error}</p>

          <button
            className="td-primary"
            onClick={loadTask}
          >
            Retry
          </button>

          <button
            className="td-secondary"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="td-page">
      <style>{`
        .td-page {
          min-height: 100vh;
          background: #f5f7fb;
          color: #172033;
          padding: 24px;
          font-family: Inter, system-ui, sans-serif;
        }

        .td-container {
          max-width: 1050px;
          margin: auto;
        }

        .td-back {
          border: none;
          background: transparent;
          color: #475569;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 20px;
          padding: 5px 0;
        }

        .td-header {
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 18px;
          padding: 25px;
          margin-bottom: 20px;
        }

        .td-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .td-title {
          font-size: 27px;
          line-height: 1.3;
          margin: 0 0 10px;
          font-weight: 750;
          color: #111827;
        }

        .td-subtitle {
          color: #64748b;
          font-size: 14px;
        }

        .td-badge {
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          background: #eef2ff;
          color: #4338ca;
          white-space: nowrap;
        }

        .td-meta {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 22px;
        }

        .td-meta-card {
          padding: 13px;
          border: 1px solid #edf0f5;
          border-radius: 12px;
          background: #fafbfc;
        }

        .td-meta-card small {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 6px;
        }

        .td-meta-card strong {
          font-size: 14px;
        }

        .td-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 20px;
          align-items: start;
        }

        .td-main,
        .td-side {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .td-card {
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 16px;
          padding: 22px;
        }

        .td-card h2 {
          margin: 0 0 15px;
          font-size: 17px;
          font-weight: 700;
        }

        .td-content {
          color: #475569;
          line-height: 1.75;
          font-size: 14px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .td-field {
          margin-bottom: 18px;
        }

        .td-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;
        }

        .td-required {
          color: #dc2626;
          margin-left: 4px;
        }

        .td-input,
        .td-textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 13px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          outline: none;
          background: white;
          font-size: 14px;
          color: #172033;
          font-family: inherit;
        }

        .td-input:focus,
        .td-textarea:focus {
          border-color: #6478f5;
          box-shadow: 0 0 0 3px rgba(99,102,241,.1);
        }

        .td-textarea {
          resize: vertical;
          line-height: 1.6;
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

        .td-starter {
          margin-bottom: 18px;
        }

        .td-starter pre {
          overflow: auto;
          background: #111827;
          color: #d1d5db;
          border-radius: 10px;
          padding: 15px;
          font-size: 12px;
          line-height: 1.6;
        }

        .td-upload {
          border: 2px dashed #cbd5e1;
          border-radius: 13px;
          padding: 25px 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 7px;
          cursor: pointer;
          background: #fafcff;
        }

        .td-upload:hover {
          background: #f1f5ff;
          border-color: #818cf8;
        }

        .td-upload input {
          display: none;
        }

        .td-upload-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 25px;
          margin-bottom: 4px;
        }

        .td-upload strong {
          font-size: 14px;
        }

        .td-upload span {
          font-size: 12px;
          color: #64748b;
        }

        .td-upload-hint {
          color: #94a3b8 !important;
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

        .td-selected-file strong {
          display: block;
          font-size: 13px;
          word-break: break-word;
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

        .td-character-count {
          color: #94a3b8;
          text-align: right;
          font-size: 12px;
          margin-top: 5px;
        }

        .td-requirement {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
          line-height: 1.5;
        }

        .td-requirement input {
          margin-top: 3px;
          accent-color: #4f46e5;
        }

        .td-resource {
          display: flex;
          flex-direction: column;
          gap: 5px;
          border-bottom: 1px solid #f1f5f9;
          padding: 12px 0;
        }

        .td-resource a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          word-break: break-word;
        }

        .td-resource small {
          color: #64748b;
        }

        .td-primary,
        .td-secondary {
          border: none;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .td-primary {
          background: #4f46e5;
          color: white;
          width: 100%;
        }

        .td-primary:hover {
          background: #4338ca;
        }

        .td-primary:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }

        .td-secondary {
          background: #eef2f7;
          color: #334155;
          width: 100%;
          margin-top: 10px;
        }

        .td-alert {
          border-radius: 10px;
          padding: 13px;
          font-size: 13px;
          margin-bottom: 14px;
          line-height: 1.5;
        }

        .td-error {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .td-success {
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .td-warning {
          color: #92400e;
          background: #fffbeb;
          border: 1px solid #fde68a;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
        }

        .td-status {
          display: inline-block;
          border-radius: 30px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .td-history-item {
          border: 1px solid #e5eaf2;
          border-radius: 12px;
          padding: 14px;
          margin-top: 10px;
        }

        .td-history-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .td-history-item p {
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          margin: 10px 0 0;
        }

        .td-history-item a {
          color: #4f46e5;
          font-size: 13px;
          word-break: break-word;
        }

        .td-list {
          padding-left: 20px;
          color: #475569;
          line-height: 1.8;
          font-size: 14px;
        }

        .td-loading {
          min-height: 65vh;
          display: grid;
          place-items: center;
          align-content: center;
          color: #64748b;
        }

        .td-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: td-spin .8s linear infinite;
        }

        @keyframes td-spin {
          to { transform: rotate(360deg); }
        }

        .td-error-box {
          max-width: 450px;
          margin: 80px auto;
          padding: 25px;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 15px;
        }

        .td-error-box p {
          color: #64748b;
          line-height: 1.6;
        }

        @media(max-width: 800px) {
          .td-grid {
            grid-template-columns: 1fr;
          }

          .td-meta {
            grid-template-columns: repeat(2, 1fr);
          }

          .td-page {
            padding: 15px;
          }

          .td-header {
            padding: 18px;
          }

          .td-title {
            font-size: 22px;
          }
        }

        @media(max-width: 480px) {
          .td-header-top {
            flex-direction: column;
          }

          .td-meta {
            gap: 8px;
          }

          .td-meta-card {
            padding: 10px;
          }

          .td-card {
            padding: 16px;
          }
        }
      `}</style>

      <div className="td-container">
        <button
          className="td-back"
          onClick={() => navigate(-1)}
        >
          ← Back to Tasks
        </button>

        <header className="td-header">
          <div className="td-header-top">
            <div>
              <h1 className="td-title">
                {task.title}
              </h1>

              <div className="td-subtitle">
                {task.task_type || "Assignment"}
                {task.difficulty
                  ? ` · ${task.difficulty}`
                  : ""}
              </div>
            </div>

            <span className="td-badge">
              {task.status || "Active"}
            </span>
          </div>

          <div className="td-meta">
            <div className="td-meta-card">
              <small>Deadline</small>
              <strong>
                {formatDate(task.due_date)}
              </strong>
            </div>

            <div className="td-meta-card">
              <small>Maximum Marks</small>
              <strong>
                {task.max_marks ?? "Not specified"}
              </strong>
            </div>

            <div className="td-meta-card">
              <small>Estimated Time</small>
              <strong>
                {task.estimated_hours
                  ? `${task.estimated_hours} hours`
                  : "Not specified"}
              </strong>
            </div>

            <div className="td-meta-card">
              <small>Submission Type</small>
              <strong>
                {submissionType}
              </strong>
            </div>
          </div>
        </header>

        <div className="td-grid">
          <main className="td-main">
            <section className="td-card">
              <h2>Task Description</h2>

              <div className="td-content">
                {task.description ||
                  "No description provided."}
              </div>
            </section>

            <section className="td-card">
              <h2>Instructions</h2>

              <div className="td-content">
                {task.instructions ||
                  "No additional instructions."}
              </div>
            </section>

            {requirements.length > 0 && (
              <section className="td-card">
                <h2>Requirements</h2>

                {requirements.map((item, index) => {
                  const text =
                    typeof item === "string"
                      ? item
                      : item?.title ||
                        item?.text ||
                        item?.description ||
                        "";

                  return (
                    <label
                      className="td-requirement"
                      key={index}
                    >
                      <input
                        type="checkbox"
                        checked={
                          Boolean(
                            requirementsChecked[index]
                          )
                        }
                        onChange={(event) =>
                          setRequirementsChecked(
                            (previous) => ({
                              ...previous,
                              [index]: event.target.checked,
                            })
                          )
                        }
                      />

                      <span>{text}</span>
                    </label>
                  );
                })}
              </section>
            )}

            {resources.length > 0 && (
              <section className="td-card">
                <h2>Learning Resources</h2>

                {resources.map((resource, index) => {
                  const url =
                    typeof resource === "string"
                      ? resource
                      : resource.url || resource.link || "";

                  const title =
                    typeof resource === "string"
                      ? resource
                      : resource.title || url;

                  return (
                    <div
                      className="td-resource"
                      key={index}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {title}
                      </a>

                      {resource.description && (
                        <small>
                          {resource.description}
                        </small>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {gradingCriteria.length > 0 && (
              <section className="td-card">
                <h2>Evaluation Criteria</h2>

                <ul className="td-list">
                  {gradingCriteria.map(
                    (criteria, index) => (
                      <li key={index}>
                        {typeof criteria === "string"
                          ? criteria
                          : criteria.title ||
                            criteria.name ||
                            criteria.description}
                        {criteria.marks != null
                          ? ` — ${criteria.marks} marks`
                          : ""}
                      </li>
                    )
                  )}
                </ul>
              </section>
            )}

            <section className="td-card">
              <h2>Submit Your Work</h2>

              {isCompleted && (
                <div className="td-alert td-success">
                  This task has been approved/completed.
                </div>
              )}

              {!canSubmit && !isCompleted && (
                <div className="td-warning">
                  Submission is currently locked.
                  {maxAttempts > 0 &&
                    ` Maximum attempts: ${maxAttempts}.`}
                </div>
              )}

              {error && task && (
                <div className="td-alert td-error">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="td-alert td-success">
                  {successMessage}
                </div>
              )}

              {uploadProgress && (
                <div className="td-alert td-warning">
                  {uploadProgress}
                </div>
              )}

              {canSubmit && (
                <form onSubmit={handleSubmit}>
                  {renderSubmissionForm()}

                  <button
                    type="submit"
                    className="td-primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Task"}
                  </button>
                </form>
              )}

              {alreadySubmitted && (
                <div className="td-alert td-warning">
                  Previous submission status:{" "}
                  <strong>{taskStatus}</strong>
                  {task.allow_resubmission
                    ? " — Resubmission is allowed."
                    : ""}
                </div>
              )}

              {maxAttempts > 0 && (
                <p className="td-subtitle">
                  Attempts used: {attemptsUsed} / {maxAttempts}
                </p>
              )}

              {task.allow_late_submission && (
                <p className="td-subtitle">
                  Late submission allowed up to{" "}
                  {task.late_days || 0} days.
                </p>
              )}
            </section>

            {history.length > 0 && (
              <section className="td-card">
                <h2>Submission History</h2>

                {history.map((item, index) => (
                  <div
                    className="td-history-item"
                    key={item.id || item._id || index}
                  >
                    <div className="td-history-top">
                      <strong>
                        Attempt {history.length - index}
                      </strong>

                      <span
                        className="td-status"
                        style={{
                          background: `${getStatusColor(item.status)}15`,
                          color: getStatusColor(item.status),
                        }}
                      >
                        {item.status || "Submitted"}
                      </span>
                    </div>

                    <p>
                      Submitted:{" "}
                      {formatDate(
                        item.submitted_at ||
                        item.created_at
                      )}
                    </p>

                    {item.marks != null && (
                      <p>
                        Marks: {item.marks}
                        {task.max_marks != null
                          ? ` / ${task.max_marks}`
                          : ""}
                      </p>
                    )}

                    {item.feedback && (
                      <p>
                        <strong>Feedback:</strong>{" "}
                        {item.feedback}
                      </p>
                    )}

                    {item.submission_data?.text && (
                      <p>
                        <strong>Answer:</strong>{" "}
                        {item.submission_data.text}
                      </p>
                    )}

                    {item.submission_data?.url && (
                      <p>
                        <a
                          href={item.submission_data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View submitted link
                        </a>
                      </p>
                    )}

                    {item.submission_data?.github && (
                      <p>
                        <a
                          href={item.submission_data.github}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View GitHub Repository
                        </a>
                      </p>
                    )}

                    {getArray(
                      item.submission_data?.files
                    ).map((file, fileIndex) => (
                      <p key={fileIndex}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file.name || "View uploaded file"}
                        </a>
                      </p>
                    ))}
                  </div>
                ))}
              </section>
            )}
          </main>

          <aside className="td-side">
            <section className="td-card">
              <h2>Task Status</h2>

              <div>
                <span
                  className="td-status"
                  style={{
                    background: `${getStatusColor(taskStatus)}15`,
                    color: getStatusColor(taskStatus),
                  }}
                >
                  {taskStatus}
                </span>
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="td-subtitle">
                  Submission Attempts
                </div>

                <strong>
                  {attemptsUsed}
                  {maxAttempts
                    ? ` / ${maxAttempts}`
                    : ""}
                </strong>
              </div>

              {latestSubmission?.marks != null && (
                <div style={{ marginTop: 18 }}>
                  <div className="td-subtitle">
                    Your Marks
                  </div>

                  <strong>
                    {latestSubmission.marks}
                    {task.max_marks != null
                      ? ` / ${task.max_marks}`
                      : ""}
                  </strong>
                </div>
              )}
            </section>

            <section className="td-card">
              <h2>Submission Rules</h2>

              <ul className="td-list">
                <li>
                  {task.allow_resubmission
                    ? "Resubmission is allowed."
                    : "Resubmission is not allowed."}
                </li>

                {maxAttempts > 0 && (
                  <li>
                    Maximum attempts: {maxAttempts}
                  </li>
                )}

                <li>
                  {task.allow_late_submission
                    ? `Late submissions allowed (${task.late_days || 0} days).`
                    : "Late submissions are not allowed."}
                </li>

                {config.max_file_size && (
                  <li>
                    Maximum file size:{" "}
                    {config.max_file_size} MB
                  </li>
                )}

                {config.allowed_formats?.length > 0 && (
                  <li>
                    Accepted formats:{" "}
                    {config.allowed_formats.join(", ")}
                  </li>
                )}
              </ul>
            </section>

            <section className="td-card">
              <h2>Need Help?</h2>

              <p className="td-content">
                Review the instructions and learning
                resources carefully before submitting
                your work.
              </p>

              <button
                className="td-secondary"
                onClick={() => navigate(-1)}
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
