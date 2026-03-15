/**
 * File Helper - Google Drive file operations
 * Handles file uploads, viewing, downloading, and icon display
 */

/**
 * Upload a file to Google Drive
 * @param {File} file - The file to upload
 * @param {string} accessToken - Google Drive API access token
 * @param {string} folderId - Optional Google Drive folder ID for parent folder
 * @returns {Promise<string>} - URL to the uploaded file on Google Drive
 */
export const uploadFileToDrive = async (file, accessToken, folderId = null) => {
  const metadata = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody = new Blob([
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    file,
    closeDelimiter,
  ]);

  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    },
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(errorText || "Upload failed");
  }

  const result = await uploadResponse.json();

  // Set file permissions to public (anyone with link)
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${result.id}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      },
    );
  } catch (error) {
    console.warn("Unable to set file permission:", error);
  }

  return (
    result.webViewLink ||
    result.webContentLink ||
    `https://drive.google.com/file/d/${result.id}/view`
  );
};

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

  // Convert Google Drive view link to download link
  let downloadLink = driveLink;

  // If it's a Google Drive sharing link, convert to direct download
  if (driveLink.includes("drive.google.com")) {
    const fileId = driveLink.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (fileId) {
      downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  // Create a temporary anchor element and trigger download
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
 * Extract file ID from Google Drive URL
 * @param {string} driveLink - Google Drive URL
 * @returns {string|null} - File ID or null if not found
 */
export const getFileIdFromLink = (driveLink) => {
  if (!driveLink) return null;
  const match = driveLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];

  const queryMatch = driveLink.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (queryMatch) return queryMatch[1];

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
  const fileId = getFileIdFromLink(driveLink);
  if (!fileId) return driveLink;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}-h${height}`;
};

/**
 * Normalize picture metadata and compute a usable image URL and file meta
 * @param {string|object|array} pic - productPicture value (JSON-string, object, or array)
 * @returns {{imageUrl: string|null, meta: {id?:string, name?:string, mimeType?:string}|null}}
 */
export const getDisplayImageInfo = (pic) => {
  if (!pic) return { imageUrl: null, meta: null };

  let parsed = pic;
  if (typeof pic === "string") {
    // try parse JSON; if not JSON and looks like URL return directly
    try {
      parsed = JSON.parse(pic);
    } catch (e) {
      if (pic.startsWith("http")) return { imageUrl: pic, meta: null };
      parsed = pic;
    }
  }

  // If array, take first
  if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];

  if (typeof parsed === "object" && parsed !== null) {
    const urlCandidates = [
      parsed.url,
      parsed.webContentLink,
      parsed.webViewLink,
      parsed.link,
      parsed.fileUrl,
      parsed.driveLink,
      parsed.previewLink,
    ];
    for (const c of urlCandidates) {
      if (c && typeof c === "string") {
        // prefer returning an embedable thumbnail link when we can extract an ID
        const id = getFileIdFromLink(c);
        if (id) {
          const thumb = `https://drive.google.com/thumbnail?id=${id}&sz=w120-h120`;
          const view =
            parsed.webViewLink ||
            parsed.webContentLink ||
            c ||
            `https://drive.google.com/file/d/${id}/view`;
          return {
            imageUrl: thumb,
            meta: {
              id: parsed.id || id,
              name: parsed.name || parsed.title || "",
              mimeType: parsed.mimeType || parsed.type || "",
              viewUrl: view,
            },
          };
        }
        // otherwise return as-is
        return {
          imageUrl: c,
          meta: {
            id: parsed.id || null,
            name: parsed.name || parsed.title || "",
            mimeType: parsed.mimeType || parsed.type || "",
          },
        };
      }
    }
    // if contains id only, return embedable thumbnail and include a view URL
    if (parsed.id) {
      const thumb = `https://drive.google.com/thumbnail?id=${parsed.id}&sz=w120-h120`;
      const view =
        parsed.webViewLink ||
        parsed.webContentLink ||
        `https://drive.google.com/file/d/${parsed.id}/view`;
      return {
        imageUrl: thumb,
        meta: {
          id: parsed.id,
          name: parsed.name || "",
          mimeType: parsed.mimeType || parsed.type || "",
          viewUrl: view,
        },
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
  const imageUrl = info?.imageUrl || null;
  const meta = info?.meta || {};

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
          (() => {
            const item = images[idx] || {};
            const id =
              getFileIdFromLink(item.displayUrl || item.viewUrl || item.url) ||
              item.meta?.id;
            const candidates = [];
            // prefer explicit fullImageUrl
            if (item.fullImageUrl) candidates.push(item.fullImageUrl);
            // construct uc direct view if id exists
            if (id)
              candidates.push(
                `https://drive.google.com/uc?export=view&id=${id}`,
              );
            // try a large thumbnail
            if (id)
              candidates.push(
                `https://drive.google.com/thumbnail?id=${id}&sz=w1200-h1200`,
              );
            // fallbacks
            if (item.webContentLink) candidates.push(item.webContentLink);
            if (item.thumbnailUrl) candidates.push(item.thumbnailUrl);
            if (item.displayUrl) candidates.push(item.displayUrl);
            if (item.url) candidates.push(item.url);

            // dedupe
            const seen = new Set();
            const filtered = candidates.filter((c) => {
              if (!c) return false;
              if (seen.has(c)) return false;
              seen.add(c);
              return true;
            });

            const keyId = id || item.meta?.id || idx;
            return (
              <img
                key={`carousel-img-${keyId}-${idx}`}
                src={filtered[0]}
                alt={item.title || `Image ${idx + 1}`}
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const cur = e.currentTarget;
                  const attempt = Number(cur.dataset.attempt || "0");
                  const next = attempt + 1;
                  if (next < filtered.length) {
                    cur.dataset.attempt = String(next);
                    cur.src = filtered[next];
                    return;
                  }
                  cur.style.display = "none";
                  setBrokenIndex(idx);
                }}
              />
            );
          })()
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
