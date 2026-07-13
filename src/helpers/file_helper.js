/**
 * File Helper - AI assistant mediated file storage operations
 * All uploads/deletes/lists/downloads are routed through AI assistant webhooks.
 * The browser never directly touches Google Drive or OneDrive APIs.
 *
 * Webhook convention (configured via VITE_N8N_IMAGE_URL + VITE_STORAGE_PROVIDER):
 *   Base URL is called directly (no extra path segments appended by frontend).
 *   Action/provider are sent in request payload for API operations.
 *   sessionNumber is managed internally by this helper and sent on every
 *   AI assistant action request.
 *
 * FileMetadata shape:
 *   { id, name, mimeType, uploadedAt, url, viewUrl, provider }
 *
 * Auth: token is sent via X-N8N-Token header.
 */

const STORAGE_PROVIDER_GOOGLE = "google";
const STORAGE_PROVIDER_ONEDRIVE = "onedrive";
const SUPPORTED_STORAGE_PROVIDERS = [
  STORAGE_PROVIDER_GOOGLE,
  STORAGE_PROVIDER_ONEDRIVE,
];
const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".tif",
  ".tiff",
  ".avif",
  ".heic",
  ".heif",
];

// ─── AI assistant config ───────────────────────────────────────────────────

const getN8nBaseUrl = () =>
  (import.meta.env.VITE_N8N_IMAGE_URL || "").replace(/\/$/, "");

const getN8nSecret = () => import.meta.env.VITE_N8N_SECRET || "";

const n8nActionUrl = () => getN8nBaseUrl();

const getN8nHeaderName = () =>
  (import.meta.env.VITE_N8N_HEADER_NAME || "X-N8N-Token").trim();

const getN8nHeaders = () => ({
  [getN8nHeaderName()]: getN8nSecret(),
});

let activeFileSessionNumber = null;

const hasSessionNumber = (sessionNumber) =>
  sessionNumber !== null &&
  sessionNumber !== undefined &&
  String(sessionNumber).trim() !== "";

const createSessionNumber = () =>
  `${Date.now()}${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;

const resolveSessionNumber = (createIfMissing = false) => {
  if (hasSessionNumber(activeFileSessionNumber)) {
    return String(activeFileSessionNumber).trim();
  }
  if (!createIfMissing) return null;
  activeFileSessionNumber = createSessionNumber();
  return activeFileSessionNumber;
};

const clearCurrentFileSessionNumber = () => {
  activeFileSessionNumber = null;
};

const appendSessionNumber = (form, sessionNumber) => {
  if (!hasSessionNumber(sessionNumber)) {
    throw new Error("sessionNumber is required");
  }
  form.append("sessionNumber", String(sessionNumber).trim());
};

const isImageFile = (file) => {
  if (!file) return false;

  const mimeType = String(file.type || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    return true;
  }

  const fileName = String(file.name || "").toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
};

const resolveThumbnailContext = (value, provider = null) => {
  const inferredProvider = normalizeProvider(provider || getStorageProvider());
  const parsed =
    typeof value === "object" && value !== null
      ? value
      : { viewUrl: typeof value === "string" ? value : "" };

  const rawViewUrl =
    parsed.viewUrl ||
    parsed.url ||
    parsed.webViewLink ||
    parsed.webContentLink ||
    "";
  const fileId =
    parsed.id ||
    getFileIdFromLink(rawViewUrl) ||
    getFileIdFromLink(parsed.link);
  const resolvedProvider = normalizeProvider(
    parsed.provider || inferredProvider,
  );
  const viewUrl = rawViewUrl;

  return { fileId, provider: resolvedProvider, viewUrl };
};

export const normalizeFileMetadata = (value, defaults = {}) => {
  const source =
    typeof value === "object" && value !== null
      ? value
      : { url: typeof value === "string" ? value : "" };

  const viewUrl =
    source.viewUrl ||
    source.url ||
    source.webViewLink ||
    source.webContentLink ||
    source.link ||
    source.fileUrl ||
    defaults.viewUrl ||
    defaults.url ||
    "";
  const url =
    source.url ||
    source.viewUrl ||
    source.webContentLink ||
    source.webViewLink ||
    source.link ||
    source.fileUrl ||
    defaults.url ||
    defaults.viewUrl ||
    "";

  const fileId =
    source.id ||
    getFileIdFromLink(viewUrl) ||
    getFileIdFromLink(url) ||
    defaults.id ||
    null;

  return {
    id: fileId,
    name: source.name || source.title || defaults.name || "",
    mimeType: source.mimeType || source.type || defaults.mimeType || "",
    provider: normalizeProvider(
      source.provider || defaults.provider || getStorageProvider(),
    ),
    uploadedAt:
      source.uploadedAt || defaults.uploadedAt || new Date().toISOString(),
    url,
    viewUrl,
  };
};

export const fetchThumbnailBlobUrl = async (
  fileId,
  viewUrl,
  provider = null,
  w = 120,
  h = 120,
) => {
  const base = getN8nBaseUrl();
  if (!base || !fileId) return null;

  const resolvedProvider = normalizeProvider(provider || getStorageProvider());
  const resolvedSession = resolveSessionNumber(true);
  const form = new FormData();
  form.append("action", "thumbnail");
  form.append("provider", resolvedProvider);
  appendSessionNumber(form, resolvedSession);
  form.append("fileId", String(fileId));
  form.append("w", String(w));
  form.append("h", String(h));
  const resolvedViewUrl = String(viewUrl || "").trim();
  if (resolvedViewUrl) {
    form.append("viewUrl", resolvedViewUrl);
  }

  const resp = await fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });
  if (!resp.ok) return null;
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
};

export const fetchFileBlobUrl = async (
  fileId,
  viewUrl,
  mimeType = "",
  provider = null,
) => {
  const base = getN8nBaseUrl();
  if (!base || !fileId) return null;

  const resolvedProvider = normalizeProvider(provider || getStorageProvider());
  const resolvedSession = resolveSessionNumber(true);
  const form = new FormData();
  form.append("action", "get");
  form.append("provider", resolvedProvider);
  appendSessionNumber(form, resolvedSession);
  form.append("fileId", String(fileId));
  const resolvedViewUrl = String(viewUrl || "").trim();
  if (resolvedViewUrl) {
    form.append("viewUrl", resolvedViewUrl);
  }

  const resp = await fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Get file failed");
  }
  const blob = await resp.blob();
  const resolvedMimeType = String(mimeType || blob.type || "").trim();
  const normalizedBlob = resolvedMimeType
    ? new Blob([blob], { type: resolvedMimeType })
    : blob;
  return URL.createObjectURL(normalizedBlob);
};

export const useThumbnailUrl = (
  fileId,
  viewUrl,
  provider = null,
  w = 120,
  h = 120,
) => {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    setBlobUrl(null);
    if (!fileId) return;
    let cancelled = false;
    let activeBlob = null;

    fetchThumbnailBlobUrl(fileId, viewUrl, provider, w, h)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        activeBlob = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
      if (activeBlob) URL.revokeObjectURL(activeBlob);
    };
  }, [fileId, viewUrl, provider, w, h]);

  return blobUrl;
};

// ─── Storage provider helpers (unchanged public API) ───────────────────────

const normalizeProvider = (value) => {
  const provider = String(value || "")
    .trim()
    .toLowerCase();
  if (SUPPORTED_STORAGE_PROVIDERS.includes(provider)) return provider;
  return STORAGE_PROVIDER_GOOGLE;
};

export const getStorageProvider = () =>
  normalizeProvider(import.meta.env.VITE_STORAGE_PROVIDER || "google");

export const getGoogleDriveConfig = () => ({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  folderId: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID,
  scope: "https://www.googleapis.com/auth/drive.file",
});

export const getOneDriveConfig = () => ({
  clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
  tenantId: import.meta.env.VITE_ONEDRIVE_TENANT_ID || "common",
  folderId: import.meta.env.VITE_ONEDRIVE_FOLDER_ID,
  scope:
    import.meta.env.VITE_ONEDRIVE_SCOPE ||
    "Files.ReadWrite User.Read openid profile",
});

export const getStorageConfig = () => {
  const enabledRaw =
    import.meta.env.VITE_STORAGE_ENABLED || STORAGE_PROVIDER_GOOGLE;
  const enabledProviders = enabledRaw
    .split(",")
    .map((p) => normalizeProvider(p))
    .filter((p, idx, arr) => arr.indexOf(p) === idx);

  return {
    provider: getStorageProvider(),
    enabledProviders,
    google: getGoogleDriveConfig(),
    onedrive: getOneDriveConfig(),
  };
};

export const getActiveStorageProviderConfig = () => {
  const storageConfig = getStorageConfig();
  if (storageConfig.provider === STORAGE_PROVIDER_ONEDRIVE) {
    return storageConfig.onedrive;
  }
  return storageConfig.google;
};

// ─── OAuth stubs (kept for API compatibility – callers need not change) ─────

/**
 * @deprecated No-op stub. Auth is now handled server-side by AI assistant.
 */
export const createGoogleOAuthState = (_flowKey = "default") => "";

/**
 * @deprecated No-op stub.
 */
export const clearGoogleOAuthState = (_flowKey = "default") => {};

/**
 * @deprecated No-op stub – always returns false.
 */
export const verifyGoogleOAuthState = (_receivedState, _flowKey = "default") =>
  false;

/**
 * @deprecated No-op stub. Resolves immediately with null.
 * Token is no longer needed; AI assistant handles auth server-side.
 */
export const requestGoogleAccessTokenWithState = (_params) =>
  Promise.resolve(null);

/**
 * @deprecated No-op stub. Resolves with a dummy no-op token client.
 */
export const initGoogleDriveTokenClient = async (_params = {}) => ({
  tokenClient: { callback: () => {}, requestAccessToken: () => {} },
  gapi: null,
});

/**
 * @deprecated No-op stub. Resolves with a dummy no-op token client.
 */
export const initOneDriveTokenClient = async (_params = {}) => ({
  tokenClient: { callback: () => {}, requestAccessToken: () => {} },
});

/**
 * @deprecated No-op stub. Resolves with a dummy no-op token client.
 */
export const initStorageTokenClient = async (_params = {}) => ({
  tokenClient: { callback: () => {}, requestAccessToken: () => {} },
});

// ─── URL helpers ────────────────────────────────────────────────────────────

// ─── Core AI assistant file operations ─────────────────────────────────────

/**
 * Upload a file via AI assistant webhook.
 * Signature intentionally keeps (file, accessToken, folderId) so existing
 * callers need no changes – accessToken is ignored (auth is in the header).
 * @param {File} file
 * @param {string|null} _accessToken - ignored
 * @param {string|null} folderId - forwarded to AI assistant as a form field
 * @returns {Promise<object>} canonical file metadata returned by AI assistant
 */
export const uploadFileToDrive = async (
  file,
  _accessToken,
  folderId = null,
) => {
  const provider = getStorageProvider();
  const resolvedSession = resolveSessionNumber(true);
  const form = new FormData();
  form.append("file", file);
  form.append("action", "upload");
  form.append("provider", provider);
  appendSessionNumber(form, resolvedSession);
  if (folderId) form.append("folderId", folderId);

  const resp = await fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Upload failed");
  }

  const result = await resp.json();
  return normalizeFileMetadata(result, {
    name: file?.name || "",
    mimeType: file?.type || "",
    provider,
    uploadedAt: new Date().toISOString(),
  });
};

/**
 * Fetch an image from a URL and upload it to Google Drive via AI assistant.
 * @param {string} imageUrl - Publicly accessible image URL to fetch
 * @param {string|null} fileName - Optional filename hint; derived from URL if omitted
 * @param {string|null} folderId - Optional Drive folder ID to upload into
 * @returns {Promise<object>} canonical file metadata returned by AI assistant
 */
export const uploadImageFromUrl = async (
  imageUrl,
  fileName = null,
  folderId = null,
) => {
  const url = String(imageUrl || "").trim();
  if (!url) throw new Error("imageUrl is required");

  // Fetch the image as a blob
  const fetchResp = await fetch(url);
  if (!fetchResp.ok) {
    throw new Error(`Failed to fetch image from URL: ${fetchResp.status}`);
  }

  const blob = await fetchResp.blob();
  const contentType = blob.type || "image/jpeg";

  // Derive a sensible file name
  const resolvedName =
    fileName ||
    (() => {
      try {
        const pathname = new URL(url).pathname;
        const segment = pathname.split("/").pop();
        return segment && segment.includes(".") ? segment : `image.jpg`;
      } catch {
        return "image.jpg";
      }
    })();

  const file = new File([blob], resolvedName, { type: contentType });
  return uploadFileToDrive(file, null, folderId);
};

/**
 * Delete a file via AI assistant webhook.
 * Signature keeps (fileId, accessToken, provider) – accessToken is ignored.
 * @param {string} fileId
 * @param {string|null} _accessToken - ignored
 * @param {string|null} provider
 * @returns {Promise<Response|null>}
 */
export const deleteFileFromDrive = async (
  fileId,
  _accessToken,
  provider = null,
) => {
  if (!fileId) return null;
  const resolvedProvider = normalizeProvider(provider || getStorageProvider());
  const resolvedSession = resolveSessionNumber(true);
  const form = new FormData();
  form.append("action", "delete");
  form.append("provider", resolvedProvider);
  appendSessionNumber(form, resolvedSession);
  form.append("fileId", fileId);

  return fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });
};

/**
 * List files in a folder via AI assistant webhook.
 * @param {string|null} folderId
 * @returns {Promise<Array>} array of FileMetadata objects
 */
export const listFilesFromStorage = async (folderId = null) => {
  const provider = getStorageProvider();
  const resolvedSession = resolveSessionNumber(true);
  const form = new FormData();
  form.append("action", "list");
  form.append("provider", provider);
  appendSessionNumber(form, resolvedSession);
  if (folderId) form.append("folderId", folderId);

  const resp = await fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "List failed");
  }
  return resp.json();
};

/**
 * Download a file via AI assistant webhook; returns the Response so callers can
 * stream or blob() as needed.
 * @param {string} fileId
 * @returns {Promise<Response>}
 */
export const downloadFileFromStorage = async (fileId, provider = null) => {
  const resolvedProvider = normalizeProvider(provider || getStorageProvider());
  const resolvedSession = resolveSessionNumber(true);
  const form = new FormData();
  form.append("action", "download");
  form.append("provider", resolvedProvider);
  appendSessionNumber(form, resolvedSession);
  form.append("fileId", fileId);

  const resp = await fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Download failed");
  }
  return resp;
};

/**
 * Legacy helper retained for compatibility.
 * Drive-backed thumbnails must be fetched through POST FormData via
 * fetchThumbnailBlobUrl/useThumbnailUrl instead of direct provider URLs.
 * @param {string} fileId
 * @param {number} w
 * @param {number} h
 * @returns {string|null}
 */
export const getThumbnailUrl = (fileId, w = 120, h = 120) => {
  void fileId;
  void w;
  void h;
  return null;
};

const parseResponsePayload = async (resp) => {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

const runSessionAction = async (action, provider = null) => {
  const resolvedSession = resolveSessionNumber(true);

  const resolvedProvider = normalizeProvider(provider || getStorageProvider());
  const form = new FormData();
  form.append("action", action);
  form.append("provider", resolvedProvider);
  appendSessionNumber(form, resolvedSession);

  const resp = await fetch(n8nActionUrl(), {
    method: "POST",
    headers: getN8nHeaders(),
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `${action} failed`);
  }

  const payload = await parseResponsePayload(resp);
  if (action === "commit" || action === "abort") {
    clearCurrentFileSessionNumber();
  }
  return payload;
};

export const commit = async (provider = null) =>
  runSessionAction("commit", provider);

export const abort = async (provider = null) =>
  runSessionAction("abort", provider);

/**
 * Get file type icon based on MIME type or file extension
 * @param {string} mimeType - MIME type of the file
 * @param {string} fileName - Name of the file (optional, for extension fallback)
 * @returns {string} - Emoji icon representing the file type
 */
export const getFileIcon = (mimeType, fileName = "") => {
  const mimeStr = (mimeType || "").toLowerCase();
  const nameStr = (fileName || "").toLowerCase();
  // Helper: check extension on filename
  const ext = (nameStr.match(/\.([a-z0-9]+)$/) || [null, ""])[1];

  // Image files
  if (
    mimeStr.includes("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(nameStr)
  )
    return "🖼️";

  // PDF
  if (mimeStr.includes("pdf") || nameStr.endsWith(".pdf")) return "📄";

  // Documents (Word, Google Docs)
  if (
    mimeStr.includes("word") ||
    mimeStr.includes("document") ||
    mimeStr.includes("vnd.openxmlformats-officedocument.wordprocessingml") ||
    /\.(doc|docx|odt)$/i.test(nameStr)
  )
    return "📝";

  // Spreadsheets
  if (
    mimeStr.includes("sheet") ||
    mimeStr.includes("spreadsheet") ||
    mimeStr.includes("vnd.openxmlformats-officedocument.spreadsheetml") ||
    /\.(xls|xlsx|csv|ods)$/i.test(nameStr)
  )
    return "📊";

  // Presentations
  if (
    mimeStr.includes("presentation") ||
    mimeStr.includes("vnd.openxmlformats-officedocument.presentationml") ||
    /\.(ppt|pptx|odp)$/i.test(nameStr)
  )
    return "🎬";

  // Video files
  if (mimeStr.includes("video/") || /\.(mp4|mov|webm|mkv|avi)$/i.test(nameStr))
    return "🎥";

  // Audio files
  if (mimeStr.includes("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(nameStr))
    return "🎵";

  // Archives
  if (
    mimeStr.includes("zip") ||
    mimeStr.includes("rar") ||
    mimeStr.includes("7z") ||
    mimeStr.includes("tar") ||
    mimeStr.includes("gzip") ||
    /\.(zip|rar|7z|tar|gz|tgz)$/i.test(nameStr)
  )
    return "📦";

  // Default file icon
  return "📎";
};

/**
 * Open/show a document by navigating to its Google Drive link
 * @param {string} driveLink - Google Drive URL of the document
 * @param {boolean} newTab - Whether to open in a new tab (default: true)
 */
export const showDocument = (driveLink, newTab = true) => {
  if (!driveLink) {
    console.error("No document link provided");
    return;
  }

  if (newTab) {
    window.open(driveLink, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = driveLink;
  }
};

/**
 * Download a document from Google Drive
 * @param {string} driveLink - Google Drive URL of the document
 * @param {string} fileName - Name for the downloaded file
 */
export const downloadDocument = (driveLink, fileName = "document") => {
  if (!driveLink) {
    console.error("No document link provided");
    return;
  }

  let downloadLink = driveLink;

  if (driveLink.includes("drive.google.com")) {
    const fileId = driveLink.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (fileId) {
      downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  const link = document.createElement("a");
  link.href = downloadLink;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);

  try {
    link.click();
  } catch (error) {
    console.error("Error downloading file:", error);
  } finally {
    document.body.removeChild(link);
  }
};

/**
 * Open a stored document through the standard webhook-backed retrieval flow.
 * This avoids relying on direct provider links that may not be publicly usable.
 * @param {string} fileId
 * @param {string|null} provider
 * @returns {Promise<void>}
 */
export const openStoredDocument = async (
  fileId,
  provider = null,
  viewUrl = "",
  mimeType = "",
) => {
  if (!fileId) {
    throw new Error("fileId is required");
  }

  const blobUrl = await fetchFileBlobUrl(fileId, viewUrl, mimeType, provider);
  if (!blobUrl) {
    throw new Error("Unable to retrieve file");
  }
  window.open(blobUrl, "_blank", "noopener,noreferrer");

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);
};

/**
 * Extract file ID from Google Drive URL
 * @param {string} driveLink - Google Drive URL
 * @returns {string|null} - File ID or null if not found
 */
export const getFileIdFromLink = (driveLink) => {
  if (!driveLink) return null;
  const match = driveLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];

  const oneDriveItemMatch = driveLink.match(/\/items\/([a-zA-Z0-9!._-]+)/);
  if (oneDriveItemMatch) return oneDriveItemMatch[1];

  const queryMatch = driveLink.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (queryMatch) return queryMatch[1];

  const oneDriveResidMatch = driveLink.match(/[?&]resid=([a-zA-Z0-9!._-]+)/);
  if (oneDriveResidMatch) return oneDriveResidMatch[1];

  return null;
};

/**
 * Get Google Drive preview link from file URL
 * @param {string} driveLink - Google Drive file URL
 * @param {string} width - Preview width in pixels (optional)
 * @param {string} height - Preview height in pixels (optional)
 * @returns {string} - Preview link or original link
 */
export const getPreviewLink = (driveLink, width = "400", height = "300") => {
  void width;
  void height;
  return driveLink || null;
};

/**
 * Normalize picture metadata and compute a usable image URL and file meta
 * @param {string|object|array} pic - productPicture value (JSON-string, object, or array)
 * @returns {{imageUrl: string|null, meta: {id?:string, name?:string, mimeType?:string}|null}}
 */
export const getDisplayImageInfo = (pic) => {
  if (!pic) return { imageUrl: null, meta: null };

  const buildMeta = (source = {}, overrides = {}) => ({
    id: source.id || overrides.id || null,
    name: source.name || source.title || overrides.name || "",
    mimeType: source.mimeType || source.type || overrides.mimeType || "",
    provider: source.provider || overrides.provider || null,
    viewUrl:
      source.viewUrl ||
      source.url ||
      source.webViewLink ||
      source.webContentLink ||
      source.link ||
      source.fileUrl ||
      source.driveLink ||
      source.previewLink ||
      overrides.viewUrl ||
      "",
  });

  const asDriveMetadata = (
    value,
    source = {},
    provider = STORAGE_PROVIDER_GOOGLE,
  ) => {
    const fileId = getFileIdFromLink(value || "") || source.id || null;
    if (!fileId || !value) return null;

    return {
      imageUrl: null,
      meta: buildMeta(source, {
        id: fileId,
        provider,
        viewUrl: value,
      }),
    };
  };

  let parsed = pic;
  if (typeof pic === "string") {
    // try parse JSON; if not JSON and looks like URL return directly
    try {
      parsed = JSON.parse(pic);
    } catch (e) {
      if (pic.startsWith("http")) {
        const driveMeta = asDriveMetadata(pic);
        return driveMeta || { imageUrl: pic, meta: null };
      }
      parsed = pic;
    }
  }

  // If array, take first
  if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];

  if (typeof parsed === "object" && parsed !== null) {
    const urlCandidates = [
      parsed.url,
      parsed.viewUrl,
      parsed.webContentLink,
      parsed.webViewLink,
      parsed.link,
      parsed.fileUrl,
      parsed.driveLink,
      parsed.previewLink,
    ];
    for (const c of urlCandidates) {
      if (c && typeof c === "string") {
        const isOneDriveUrl =
          c.includes("onedrive.live.com") ||
          c.includes("1drv.ms") ||
          c.includes("sharepoint.com");
        if (!isOneDriveUrl) {
          const driveMeta = asDriveMetadata(
            c,
            parsed,
            parsed.provider || STORAGE_PROVIDER_GOOGLE,
          );
          if (driveMeta) return driveMeta;
        }

        return {
          imageUrl: c,
          meta: buildMeta(parsed),
        };
      }
    }

    if (parsed.id) {
      const meta = buildMeta(parsed);
      return {
        imageUrl:
          meta.provider === STORAGE_PROVIDER_ONEDRIVE && meta.viewUrl
            ? meta.viewUrl
            : null,
        meta,
      };
    }
  }

  return { imageUrl: null, meta: null };
};

/* React helper components for displaying file icons, removable chips and image carousel */
import React, { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

export const ThumbnailImg = ({
  fileId,
  viewUrl,
  provider = null,
  width = 56,
  height = 56,
  alt = "",
  style = {},
  onClick,
}) => {
  const blobUrl = useThumbnailUrl(fileId, viewUrl, provider, width, height);

  if (!blobUrl) {
    return null;
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      style={{
        width,
        height,
        objectFit: "cover",
        ...style,
      }}
      referrerPolicy="no-referrer"
      onClick={onClick}
    />
  );
};

export const FileIcon = ({ mimeType, fileName, fontSize = 20, sx = {} }) => {
  const icon = getFileIcon(mimeType, fileName);
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...sx,
      }}
    >
      <span style={{ fontSize: fontSize }}>{icon}</span>
    </Box>
  );
};

export const FileChip = ({ file, size = 56, onRemove, onClick }) => {
  const info = getDisplayImageInfo(file);
  const meta = info?.meta || {};
  const thumbCtx = resolveThumbnailContext(
    {
      id: meta.id,
      viewUrl: meta.viewUrl || info?.imageUrl || "",
      provider: meta.provider,
    },
    meta.provider || null,
  );
  const thumbnailUrl = useThumbnailUrl(
    thumbCtx.fileId,
    thumbCtx.viewUrl,
    thumbCtx.provider,
    size,
    size,
  );
  const imageUrl = thumbnailUrl || null;

  return (
    <Box sx={{ position: "relative", width: size, height: size, mr: 1 }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={meta.name || file.name}
          style={{
            width: size,
            height: size,
            objectFit: "cover",
            borderRadius: 6,
            cursor: onClick ? "pointer" : "default",
          }}
          referrerPolicy="no-referrer"
          onClick={() => onClick && onClick(meta.viewUrl || imageUrl)}
        />
      ) : (
        <Box
          sx={{
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          {getFileIcon(meta.mimeType || file.mimeType, meta.name || file.name)}
        </Box>
      )}
      {onRemove && (
        <IconButton
          size="small"
          onClick={() => onRemove(file)}
          sx={{
            position: "absolute",
            top: -8,
            right: -8,
            bgcolor: "background.paper",
          }}
        >
          ×
        </IconButton>
      )}
    </Box>
  );
};

export const ImageCarousel = ({
  images = [],
  open,
  onClose,
  startIndex = 0,
}) => {
  const [idx, setIdx] = useState(startIndex || 0);
  const [brokenIndex, setBrokenIndex] = useState(null);
  useEffect(() => {
    // reset broken flag when user navigates to a different image so we attempt loading again
    setBrokenIndex(null);
  }, [idx]);
  // keep index in range when images array changes (e.g., after deletion)
  useEffect(() => {
    if (!Array.isArray(images)) return;
    if (images.length === 0) {
      setIdx(0);
      return;
    }
    if (idx >= images.length) {
      setIdx(Math.max(0, images.length - 1));
    }
  }, [images, images.length, idx]);
  if (!Array.isArray(images) || images.length === 0) return null;

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  const CarouselImage = ({ item, index }) => {
    const ctx = resolveThumbnailContext(
      {
        id: item?.meta?.id,
        viewUrl: item?.viewUrl || item?.displayUrl || item?.url || "",
        provider: item?.provider || item?.meta?.provider || null,
      },
      item?.provider || item?.meta?.provider || null,
    );
    const blobUrl = useThumbnailUrl(
      ctx.fileId,
      ctx.viewUrl,
      ctx.provider,
      1200,
      1200,
    );

    if (!blobUrl) return null;
    const keyId = ctx.fileId || item?.meta?.id || index;

    return (
      <img
        key={`carousel-img-${keyId}-${index}`}
        src={blobUrl}
        alt={item?.title || `Image ${index + 1}`}
        style={{ maxWidth: "100%", maxHeight: "80vh" }}
        referrerPolicy="no-referrer"
        onError={() => setBrokenIndex(index)}
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 11000 }}
    >
      <DialogContent
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <IconButton
          onClick={prev}
          sx={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>
        {brokenIndex === idx ? (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Unable to display image.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                const current = images[idx] || {};
                const url =
                  current.displayUrl || current.viewUrl || current.url;
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              Open in Drive
            </Button>
          </Box>
        ) : (
          <CarouselImage item={images[idx] || {}} index={idx} />
        )}
        <IconButton
          onClick={next}
          sx={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <ArrowForwardIosIcon />
        </IconButton>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Typography variant="caption">
            {(images[idx] && images[idx].title) ||
              `${idx + 1}/${images.length}`}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
