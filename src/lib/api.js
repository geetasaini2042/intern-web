export const API_BASE = "https://internapi.singodiyatechnologies.tech";
// export const API_BASE = "http://0.0.0.0:8000";

export const API = API_BASE;

const getAdminToken = () =>
  localStorage.getItem("admin_token") || "";

const getStudentToken = () =>
  localStorage.getItem("intern_token") ||
  localStorage.getItem("access_token") ||
  "";

const getAuthHeaders = () => {
  const adminToken = getAdminToken();

  if (adminToken) {
    return {
      "X-Admin-Key": adminToken
    };
  }

  const studentToken = getStudentToken();

  if (studentToken) {
    return {
      Authorization: `Bearer ${studentToken}`
    };
  }

  return {};
};

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : options.body
        ? { "Content-Type": "application/json" }
        : {}),
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch (error) {
      console.error("API error response:", error);
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function apiDownload(path, fallbackName = "download.pdf") {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;

    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch (error) {
      console.error("Download error:", error);
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  const disposition =
    response.headers.get("content-disposition") || "";

  const match = disposition.match(
    /filename\*?=(?:UTF-8''|"?)([^";]+)/i
  );

  const filename = match
    ? decodeURIComponent(match[1].replace(/"/g, "").trim())
    : fallbackName;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export const apiGet = (path) =>
  apiRequest(path, { method: "GET" });

export const apiPost = (path, data) =>
  apiRequest(path, {
    method: "POST",
    body: JSON.stringify(data)
  });

export const apiPut = (path, data) =>
  apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(data)
  });

export const apiPatch = (path, data) =>
  apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

export const apiDelete = (path) =>
  apiRequest(path, { method: "DELETE" });

export default API_BASE;