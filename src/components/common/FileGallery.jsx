import React, { useEffect, useState, useRef } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import {
  FileChip,
  ImageCarousel,
  getDisplayImageInfo,
  getFileIdFromLink,
  getFileIcon,
  uploadFileToDrive,
} from "../../helpers/file_helper";

/**
 * FileGallery
 * Props:
 * - productPicture: string|array - JSON-string or array or single URL describing pictures
 * - allowRemove: boolean - whether to show remove controls
 * - repoConfig: object - optional repository connection info (not used by display)
 * - onChange: function(jsonString) - called whenever the picture list changes
 */
const FileGallery = ({
  productPicture,
  allowRemove = true,
  allowAdd = true,
  repoConfig = null,
  onChange = () => {},
}) => {
  const [files, setFiles] = useState([]);
  const [driveReady, setDriveReady] = useState(false);
  const [driveToken, setDriveToken] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const { t } = useTranslation();
  const tokenClientRef = useRef(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);

  useEffect(() => {
    try {
      const pic = productPicture;
      let parsed = pic;
      if (typeof pic === "string") {
        try {
          parsed = JSON.parse(pic);
        } catch (e) {
          parsed = pic;
        }
      }
      const arr = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      const norm = arr
        .filter(Boolean)
        .map((p) => (typeof p === "string" ? { url: p } : p));
      setFiles(norm);
      // parsed incoming prop -> normalized files
    } catch (err) {
      setFiles([]);
    }
  }, [productPicture]);

  // Google Drive init + auth
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

    const initGoogleDrive = async () => {
      if (!googleClientId || !googleApiKey) return;
      try {
        await loadScript("https://apis.google.com/js/api.js");
        await loadScript("https://accounts.google.com/gsi/client");
        await new Promise((resolve) => window.gapi.load("client", resolve));
        await window.gapi.client.init({
          apiKey: googleApiKey,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
          ],
        });

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: () => {},
        });
        // expose a lightweight global holder so other components can reuse token/client
        window.__GDriveAuth = window.__GDriveAuth || {};
        window.__GDriveAuth.tokenClient = tokenClientRef.current;
        window.__GDriveAuth.gapi = window.gapi;
        setDriveReady(true);
      } catch (err) {
        console.error("Error initializing Google Drive in FileGallery", err);
      }
    };

    initGoogleDrive();
  }, []);

  // Cross-tab/session token sharing: listen for tokens published via BroadcastChannel or localStorage
  useEffect(() => {
    // read any already published global token
    try {
      if (window.__GDriveAuth?.accessToken) {
        setDriveToken(window.__GDriveAuth.accessToken);
      } else {
        // localStorage fallback (other tabs may write a key to notify)
        const saved = localStorage.getItem("__GDriveAuth:accessToken");
        if (saved) setDriveToken(saved);
      }
    } catch (e) {
      // ignore
    }

    let bc;
    try {
      bc = new BroadcastChannel("gdrive-auth");
      bc.onmessage = (ev) => {
        const data = ev.data || {};
        if (data?.accessToken) {
          window.__GDriveAuth = window.__GDriveAuth || {};
          window.__GDriveAuth.accessToken = data.accessToken;
          setDriveToken(data.accessToken);
        }
      };
    } catch (e) {
      // BroadcastChannel may not be available; listen to localStorage events instead
      const onStorage = (ev) => {
        if (ev.key === "__GDriveAuth:accessToken" && ev.newValue) {
          window.__GDriveAuth = window.__GDriveAuth || {};
          window.__GDriveAuth.accessToken = ev.newValue;
          setDriveToken(ev.newValue);
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    return () => {
      try {
        bc?.close();
      } catch (e) {}
    };
  }, []);

  const requestDriveToken = (autoOpenPicker = false) =>
    new Promise((resolve, reject) => {
      if (!tokenClientRef.current) {
        reject(new Error("Token client not ready"));
        return;
      }
      tokenClientRef.current.callback = (tokenResponse) => {
        if (tokenResponse.error) {
          reject(tokenResponse);
          return;
        }
        const accessToken = tokenResponse.access_token;
        setDriveToken(accessToken);
        // keep global copy and notify other tabs
        window.__GDriveAuth = window.__GDriveAuth || {};
        window.__GDriveAuth.accessToken = accessToken;
        try {
          const bc = new BroadcastChannel("gdrive-auth");
          bc.postMessage({ accessToken });
          bc.close();
        } catch (e) {
          try {
            localStorage.setItem("__GDriveAuth:accessToken", accessToken);
            // write+remove to trigger storage event in some browsers
            localStorage.setItem(
              "__GDriveAuth:accessToken:ts",
              String(Date.now()),
            );
          } catch (e) {}
        }
        resolve(accessToken);
      };
      tokenClientRef.current.requestAccessToken({
        prompt: driveToken ? "" : "consent",
      });
    });

  // file input for add action
  const fileInputRef = useRef(null);

  // Explicit authorize button handler: this must be called from a user gesture.
  const handleAuthorize = () => {
    if (!tokenClientRef.current) {
      setUploadError("Authorization client not ready");
      return;
    }
    tokenClientRef.current.callback = (tokenResponse) => {
      if (tokenResponse.error) {
        setUploadError(tokenResponse.error);
        return;
      }
      const accessToken = tokenResponse.access_token;
      setDriveToken(accessToken);
      window.__GDriveAuth = window.__GDriveAuth || {};
      window.__GDriveAuth.accessToken = accessToken;
      try {
        const bc = new BroadcastChannel("gdrive-auth");
        bc.postMessage({ accessToken });
        bc.close();
      } catch (e) {
        try {
          localStorage.setItem("__GDriveAuth:accessToken", accessToken);
          localStorage.setItem(
            "__GDriveAuth:accessToken:ts",
            String(Date.now()),
          );
        } catch (e) {}
      }
    };
    // open the consent dialog / popup immediately from the user click
    tokenClientRef.current.requestAccessToken({
      prompt: driveToken ? "" : "consent",
    });
  };

  // Open file chooser synchronously from user click when token already present
  const handleOpenFileChooser = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const googleDriveFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
      const fileLink = await uploadFileToDrive(
        file,
        driveToken,
        googleDriveFolderId,
      );
      const fileId = getFileIdFromLink(fileLink);
      const newFile = {
        id: fileId || null,
        url: fileLink,
        name: file.name,
        mimeType: file.type || "",
        uploadedAt: new Date().toISOString(),
      };
      setFiles((prev) => {
        const next = [...(prev || []), newFile];
        // emit normalized metadata (no URLs) after render to avoid setState-in-render
        const normalized = next.map((f) => ({
          id: f.id || getFileIdFromLink(f.url) || null,
          name: f.name || "",
          mimeType: f.mimeType || f.type || "",
          uploadedAt: f.uploadedAt || new Date().toISOString(),
        }));
        try {
          setTimeout(() => {
            try {
              onChange(
                normalized.length > 0 ? JSON.stringify(normalized) : null,
              );
            } catch (e) {}
          }, 0);
        } catch (e) {}
        return next;
      });
    } catch (err) {
      console.error("Upload failed in FileGallery", err);
      setUploadError(err?.message || "Upload failed");
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          const newFile = {
            id: null,
            url: dataUrl,
            name: file.name,
            mimeType: file.type || "",
            uploadedAt: new Date().toISOString(),
          };
          setFiles((prev) => {
            const next = [...(prev || []), newFile];
            const normalized = next.map((f) => ({
              id: f.id || null,
              name: f.name || "",
              mimeType: f.mimeType || f.type || "",
              uploadedAt: f.uploadedAt || new Date().toISOString(),
            }));
            try {
              setTimeout(() => {
                try {
                  onChange(
                    normalized.length > 0 ? JSON.stringify(normalized) : null,
                  );
                } catch (e) {}
              }, 0);
            } catch (e) {}
            return next;
          });
        };
        reader.readAsDataURL(file);
      } catch (e) {
        console.error("Preview fallback failed", e);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Emit changes to parent only when user actions occur (e.g. remove)
  // This prevents prop -> state -> emit -> parent set -> prop loop.

  const handleRemove = (idx) => {
    // remove locally first to keep UI responsive
    let removed = null;
    setFiles((prev) => {
      const next = prev.filter((_, i) => {
        if (i === idx) return false;
        return true;
      });
      removed = prev[idx];
      const normalized = (next || []).map((f) => ({
        id: f.id || getFileIdFromLink(f.url) || null,
        name: f.name || "",
        mimeType: f.mimeType || f.type || "",
        uploadedAt: f.uploadedAt || new Date().toISOString(),
      }));
      try {
        setTimeout(() => {
          try {
            onChange(normalized.length > 0 ? JSON.stringify(normalized) : null);
          } catch (e) {}
        }, 0);
      } catch (e) {}
      return next;
    });

    // attempt background deletion from Google Drive if we have an id
    (async () => {
      try {
        const fileId = removed?.id || getFileIdFromLink(removed?.url);
        const token = window.__GDriveAuth?.accessToken || driveToken;
        if (!fileId || !token) return;
        const resp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!resp.ok) {
          const text = await resp.text();
          console.warn("Drive delete failed:", resp.status, text);
          setUploadError(t("basic.failed") + ": " + (text || resp.statusText));
        }
      } catch (err) {
        console.error("Error deleting file from Drive", err);
        setUploadError(err?.message || "Delete failed");
      }
    })();
  };

  const buildImages = (filesArr) => {
    if (!filesArr || filesArr.length === 0) return [];
    return filesArr
      .map((f) => getDisplayImageInfo(f.url || f))
      .filter((info) => info && info.imageUrl)
      .map((info) => ({
        displayUrl: info.imageUrl,
        viewUrl: info.meta?.viewUrl || null,
        title: info.meta?.name || "",
      }));
  };

  const openCarousel = (startIndex) => {
    const imgs = buildImages(files);
    if (!imgs || imgs.length === 0) return;
    setCarouselImages(imgs);
    setCarouselStart(startIndex || 0);
    setCarouselOpen(true);
  };

  return (
    <Box>
      {/* Upload status and errors */}
      <Box
        sx={{
          mb: 1,
          display: "flex",
          gap: 1,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {isUploading && (
          <div className="upload-status">
            {t("staffManagement.uploadingFile")}
          </div>
        )}
        {uploadError && <div className="upload-error">{uploadError}</div>}
        {allowAdd && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />
            {!driveToken ? (
              <Button
                variant="outlined"
                size="small"
                onClick={handleAuthorize}
                startIcon={<span>🔐</span>}
                disabled={!driveReady || isUploading}
              >
                {t("staffManagement.authorizeAndUpload")}
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenFileChooser}
                startIcon={<span>＋</span>}
                disabled={isUploading}
              >
                {isUploading
                  ? t("staffManagement.uploading")
                  : t("staffManagement.addFile")}
              </Button>
            )}
          </>
        )}
      </Box>

      <Box
        sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
      >
        {files && files.length > 0 ? (
          files.map((f, idx) => {
            try {
              return (
                <Box key={f.id || f.url || idx} sx={{ position: "relative" }}>
                  <FileChip
                    file={f}
                    size={56}
                    onClick={() => {
                      openCarousel(idx);
                    }}
                    onRemove={allowRemove ? () => handleRemove(idx) : undefined}
                  />
                </Box>
              );
            } catch (e) {
              const info = getDisplayImageInfo(f.url || f);
              const imageUrl = info?.imageUrl || f.url || null;
              const meta = info?.meta || {};
              return (
                <Box key={f.id || f.url || idx} sx={{ position: "relative" }}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={meta.name || f.name || `img-${idx}`}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "cover",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                      onClick={() => openCarousel(idx)}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getFileIcon(
                        meta.mimeType || f.mimeType,
                        meta.name || f.name,
                      )}
                    </Box>
                  )}
                  {allowRemove && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemove(idx)}
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        bgcolor: "background.paper",
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
              );
            }
          })
        ) : (
          <Box
            sx={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">📦</Typography>
          </Box>
        )}
      </Box>

      {carouselOpen && (
        <ImageCarousel
          images={carouselImages}
          open={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          startIndex={carouselStart}
        />
      )}
    </Box>
  );
};

export default FileGallery;
