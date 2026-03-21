import React, { useEffect, useState, useRef } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import {
  deleteFileFromDrive,
  FileChip,
  getActiveStorageProviderConfig,
  getStorageConfig,
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const { t } = useTranslation();
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

  // file input for add action
  const fileInputRef = useRef(null);

  const handleOpenFileChooser = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageProvider = getStorageConfig().provider;
    setIsUploading(true);
    setUploadError("");
    try {
      const activeCfg = getActiveStorageProviderConfig();
      const folderId = activeCfg.folderId;
      const fileLink = await uploadFileToDrive(file, null, folderId);
      const fileId = getFileIdFromLink(fileLink);
      const newFile = {
        id: fileId || null,
        url: fileLink,
        name: file.name,
        mimeType: file.type || "",
        provider: storageProvider,
        uploadedAt: new Date().toISOString(),
      };
      setFiles((prev) => {
        const next = [...(prev || []), newFile];
        // emit normalized metadata (no URLs) after render to avoid setState-in-render
        const normalized = next.map((f) => ({
          id: f.id || getFileIdFromLink(f.url) || null,
          name: f.name || "",
          mimeType: f.mimeType || f.type || "",
          provider: f.provider || storageProvider,
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
              provider: f.provider || storageProvider,
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

    // attempt background deletion via n8n
    (async () => {
      try {
        const fileId = removed?.id || getFileIdFromLink(removed?.url);
        if (!fileId) return;
        const resp = await deleteFileFromDrive(fileId, null, removed?.provider);
        if (resp && !resp.ok) {
          const text = await resp.text();
          console.warn("Delete failed:", resp.status, text);
          setUploadError(t("basic.failed") + ": " + (text || resp.statusText));
        }
      } catch (err) {
        console.error("Error deleting file", err);
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
