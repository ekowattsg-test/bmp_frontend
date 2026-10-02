import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";
import {
  uploadFileToDrive,
  ImageCarousel,
  normalizeFileMetadata,
  ThumbnailImg,
} from "../../../helpers/file_helper";

const toApiDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const toProgressValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const isSiteInspectRole = (roleRow) => {
  const candidates = [
    roleRow?.roleName,
    roleRow?.operationRole,
    roleRow?.role,
    roleRow?.name,
  ];
  return candidates.some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    return normalized === "siteinspect";
  });
};

export default function PdaProgressInspection() {
  const { t } = useTranslation();

  const [hasRole, setHasRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [streamsById, setStreamsById] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [photosById, setPhotosById] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [remarkById, setRemarkById] = useState({});
  const [verifiedById, setVerifiedById] = useState({});
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselStart, setCarouselStart] = useState(0);
  const [carouselImages, setCarouselImages] = useState([]);

  const currentStaffId = useMemo(() => {
    try {
      const info = JSON.parse(localStorage.getItem("pda_user_info") || "{}");
      return String(info.staffId || "");
    } catch {
      return "";
    }
  }, []);

  const today = useMemo(() => toApiDate(new Date()), []);

  useEffect(() => {
    if (!currentStaffId) {
      setHasRole(false);
      setLoading(false);
      return;
    }

    request(
      "GET",
      `/api/operationroles?staffId=${encodeURIComponent(currentStaffId)}`,
    )
      .then((res) => {
        const roles = Array.isArray(res?.data) ? res.data : [];
        setHasRole(roles.some(isSiteInspectRole));
      })
      .catch(() => setHasRole(false));
  }, [currentStaffId]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const [progressRes, tasksRes, streamsRes] = await Promise.all([
        request("GET", "/api/projecttaskprogresses"),
        request("GET", "/api/projecttasks"),
        request("GET", "/api/projectstreams").catch(() => ({ data: [] })),
      ]);

      const progresses = Array.isArray(progressRes?.data)
        ? progressRes.data
        : [];
      const tasks = Array.isArray(tasksRes?.data) ? tasksRes.data : [];

      const taskById = tasks.reduce((acc, task) => {
        acc[String(task.projectTaskId)] = task;
        return acc;
      }, {});

      const streamMap = (
        Array.isArray(streamsRes?.data) ? streamsRes.data : []
      ).reduce((acc, stream) => {
        const streamId = String(stream?.projectStreamId || "").trim();
        if (!streamId) return acc;
        acc[streamId] = {
          streamName: String(stream?.streamName || "").trim(),
          projectCode: String(stream?.projectCode || "").trim(),
        };
        return acc;
      }, {});

      // Keep only in-progress tasks whose latest progress record is
      // marker="U" (progress updated) and has not been inspected yet.
      const latestByTask = {};
      progresses.forEach((p) => {
        const taskId = String(p.projectTaskId || "").trim();
        if (!taskId) return;
        const existing = latestByTask[taskId];
        const existingId = Number(existing?.projectTaskProgressId || 0);
        const nextId = Number(p?.projectTaskProgressId || 0);
        if (!existing || nextId >= existingId) {
          latestByTask[taskId] = p;
        }
      });

      const filtered = Object.values(latestByTask).filter((p) => {
        const task = taskById[String(p.projectTaskId)];
        if (String(task?.taskStatus || "").trim() !== "In Progress") {
          return false;
        }
        if (String(p.marker || "").trim() !== "U") return false;
        if (p.inspectionDate) return false;
        return true;
      });

      filtered.sort((a, b) => {
        const ta = taskById[String(a.projectTaskId)];
        const tb = taskById[String(b.projectTaskId)];
        const byStream = String(ta?.projectStreamId || "").localeCompare(
          String(tb?.projectStreamId || ""),
          undefined,
          { numeric: true },
        );
        if (byStream !== 0) return byStream;

        const byDate = String(a.progressDate || "").localeCompare(
          String(b.progressDate || ""),
        );
        if (byDate !== 0) return byDate;

        return String(ta?.taskName || "").localeCompare(
          String(tb?.taskName || ""),
        );
      });

      setRows(
        filtered.map((progress) => ({
          progress,
          task: taskById[String(progress.projectTaskId)] || null,
        })),
      );
      setStreamsById(streamMap);
      setExpandedId(null);
      setPhotosById({});
      setRemarkById({});
      setVerifiedById({});
    } catch {
      setErrorMsg(
        t(
          "pda.progressInspection.loadFailed",
          "Failed to load task progress records.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (hasRole === true) {
      loadRows();
    }
  }, [hasRole, loadRows]);

  const groupedRows = useMemo(() => {
    const streamMap = new Map();
    rows.forEach((row) => {
      const streamId = String(row?.task?.projectStreamId || "").trim();
      if (!streamMap.has(streamId)) {
        streamMap.set(streamId, []);
      }
      streamMap.get(streamId).push(row);
    });

    return Array.from(streamMap.entries())
      .sort((a, b) =>
        String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }),
      )
      .map(([streamId, items]) => ({
        streamId,
        streamName: streamsById[streamId]?.streamName || "",
        projectCode:
          streamsById[streamId]?.projectCode ||
          String(items?.[0]?.task?.projectCode || "").trim(),
        items: [...items].sort((a, b) => {
          const byDate = String(a?.progress?.progressDate || "").localeCompare(
            String(b?.progress?.progressDate || ""),
          );
          if (byDate !== 0) return byDate;
          return String(a?.task?.taskName || "").localeCompare(
            String(b?.task?.taskName || ""),
          );
        }),
      }));
  }, [rows, streamsById]);

  const getDisplayTaskDates = (task) => {
    const startDate = task?.actualStartDate || task?.taskStartDate || "";
    const endDate = task?.taskEndDate || "";
    return { startDate, endDate };
  };

  const handleExpand = (row) => {
    const progressId = String(row.progress.projectTaskProgressId);
    setVerifiedById((prev) => ({
      ...prev,
      [progressId]: String(row.progress.progress || ""),
    }));
    setExpandedId((prev) => (prev === progressId ? null : progressId));
  };

  const handleVerifiedProgress = (progressId, value) => {
    const raw = String(value ?? "").replace(/[^\d]/g, "");
    const parsed = raw === "" ? "" : String(Math.min(100, Number(raw)));
    setVerifiedById((prev) => ({ ...prev, [progressId]: parsed }));
  };

  const handleRemark = (progressId, value) => {
    setRemarkById((prev) => ({ ...prev, [progressId]: value }));
  };

  const handlePhotoAdd = async (progressId, file) => {
    setPhotoUploading(true);
    setErrorMsg("");
    try {
      const metadata = await uploadFileToDrive(file, null, null);
      setPhotosById((prev) => ({
        ...prev,
        [progressId]: [...(prev[progressId] || []), { metadata, localUrl: null }],
      }));
    } catch {
      setErrorMsg(
        t("pda.progressInspection.photoError", "Failed to upload photo."),
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoRemove = (progressId, idx) => {
    setPhotosById((prev) => {
      const current = prev[progressId] || [];
      const updated = [...current];
      updated.splice(idx, 1);
      return { ...prev, [progressId]: updated };
    });
  };

  const openCarousel = (photos, idx) => {
    setCarouselImages(
      photos.map((ph) => ({
        displayUrl: ph.metadata?.viewUrl || ph.metadata?.url || ph.localUrl || null,
        viewUrl: ph.metadata?.viewUrl || null,
        title: ph.metadata?.name || "",
        provider: ph.metadata?.provider || null,
        meta: ph.metadata || null,
      })),
    );
    setCarouselStart(idx);
    setCarouselOpen(true);
  };

  const handleSaveInspection = async (row) => {
    const progressId = String(row.progress.projectTaskProgressId || "");
    if (!progressId) return;

    const photos = photosById[progressId] || [];
    if (photos.length === 0) {
      setErrorMsg(
        t(
          "pda.progressInspection.photoRequired",
          "At least one inspection photo is required.",
        ),
      );
      return;
    }

    const verifiedProgress = toProgressValue(verifiedById[progressId]);
    if (verifiedProgress <= 0) {
      setErrorMsg(
        t(
          "pda.progressInspection.progressRequired",
          "Please enter the verified progress percentage.",
        ),
      );
      return;
    }

    const inspectionPhotos =
      photos.length > 0
        ? JSON.stringify(
            photos.map((p) =>
              normalizeFileMetadata(p.metadata, {
                provider: p.metadata?.provider,
                uploadedAt: new Date().toISOString(),
              }),
            ),
          )
        : "";

    setSavingId(progressId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await request("PUT", `/api/projecttaskprogresses/${progressId}`, {
        ...row.progress,
        verifiedProgress,
        inspectionRemark: String(remarkById[progressId] || "").trim(),
        inspectionDate: today,
        inspectedBy: currentStaffId,
        inspectionPhotos,
      });
      setSuccessMsg(
        t(
          "pda.progressInspection.saveSuccess",
          "Inspection record saved successfully.",
        ),
      );
      await loadRows();
    } catch {
      setErrorMsg(
        t(
          "pda.progressInspection.saveFailed",
          "Failed to save inspection record.",
        ),
      );
    } finally {
      setSavingId("");
    }
  };

  if (hasRole === null || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasRole) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t(
          "pda.progressInspection.noAccess",
          "This function is only available to Site Inspectors.",
        )}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        {t("pda.progressInspection.title", "Progress Inspection")}
      </Typography>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMsg("")}
        >
          {successMsg}
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <Alert severity="info">
          {t(
            "pda.progressInspection.noItems",
            "No task progress records require inspection.",
          )}
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {groupedRows.map((stream) => (
            <Box
              key={`stream-${stream.streamId || "blank"}`}
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.8,
                  bgcolor: "primary.main",
                  color: "common.white",
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {stream.projectCode
                    ? `${stream.projectCode} - ${stream.streamName}`
                    : stream.streamName}
                </Typography>
              </Box>

              <Box sx={{ p: 1, bgcolor: "primary.light" }}>
                {stream.items.map((row) => {
                  const progressId = String(
                    row.progress.projectTaskProgressId || "",
                  );
                  const expanded = expandedId === progressId;
                  const reportedProgress = toProgressValue(
                    row?.progress?.progress,
                  );
                  const { startDate, endDate } = getDisplayTaskDates(row.task);
                  const verifiedRaw = verifiedById[progressId] ?? "";
                  const photos = photosById[progressId] || [];
                  const remark = remarkById[progressId] || "";

                  return (
                    <Box
                      key={progressId}
                      sx={{
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid",
                        borderColor: expanded ? "primary.main" : "divider",
                        overflow: "hidden",
                        mb: 0.75,
                        "&:last-child": { mb: 0 },
                      }}
                    >
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => handleExpand(row)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleExpand(row);
                          }
                        }}
                        sx={{
                          px: 1.25,
                          py: 1,
                          display: "grid",
                          gridTemplateColumns: "minmax(0,1fr) auto",
                          gridTemplateRows: "auto auto auto",
                          columnGap: 1,
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Box
                          sx={{
                            gridColumn: "2 / 3",
                            gridRow: "1 / 4",
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            minWidth: 24,
                          }}
                        >
                          <IconButton
                            size="small"
                            sx={{ p: 0.25 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpand(row);
                            }}
                            aria-label={t(
                              "pda.progressInspection.expandRow",
                              "Inspect task progress",
                            )}
                          >
                            {expanded ? (
                              <CheckCircleOutlineIcon
                                fontSize="small"
                                color="primary"
                              />
                            ) : (
                              <RadioButtonUncheckedIcon
                                fontSize="small"
                                color="disabled"
                              />
                            )}
                          </IconButton>
                        </Box>

                        <Box
                          sx={{
                            gridColumn: "1 / 2",
                            gridRow: "1 / 2",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 0,
                            mb: 0.25,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ textAlign: "left", minWidth: 0 }}
                          >
                            {row.task?.taskName || ""}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="success.main"
                            fontWeight={700}
                            sx={{ flexShrink: 0 }}
                          >
                            {`${reportedProgress}%`}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            gridColumn: "1 / 2",
                            gridRow: "2 / 3",
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ textAlign: "left" }}
                          >
                            {startDate || ""} - {endDate || ""}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            gridColumn: "1 / 2",
                            gridRow: "3 / 4",
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ textAlign: "left" }}
                          >
                            {t("pda.progressInspection.reportedDate", "Reported")}:{" "}
                            {row.progress.progressDate || ""}
                          </Typography>
                        </Box>
                      </Box>

                      {expanded ? (
                        <Box
                          sx={{
                            px: 1.25,
                            pb: 1.25,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            borderTop: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box sx={{ pt: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mb: 0.5 }}
                            >
                              {t(
                                "pda.progressInspection.reportedProgress",
                                "Reported progress",
                              )}
                              : {reportedProgress}%
                            </Typography>
                            <TextField
                              size="small"
                              label={t(
                                "pda.progressInspection.verifiedProgress",
                                "Verified progress",
                              )}
                              type="tel"
                              value={verifiedRaw}
                              onChange={(e) =>
                                handleVerifiedProgress(
                                  progressId,
                                  e.target.value,
                                )
                              }
                              inputProps={{
                                inputMode: "numeric",
                                pattern: "[0-9]*",
                              }}
                              disabled={savingId === progressId}
                              fullWidth
                            />
                          </Box>

                          <TextField
                            size="small"
                            label={t(
                              "pda.progressInspection.remark",
                              "Observation / remark",
                            )}
                            value={remark}
                            onChange={(e) =>
                              handleRemark(progressId, e.target.value)
                            }
                            disabled={savingId === progressId}
                            multiline
                            rows={3}
                            fullWidth
                          />

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mb: 0.5 }}
                            >
                              {t(
                                "pda.progressInspection.photos",
                                "Inspection photos",
                              )}
                              {" "}
                              <Typography
                                component="span"
                                variant="caption"
                                color="error.main"
                              >
                                *
                              </Typography>
                            </Typography>
                            <Box
                              sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                            >
                              {photos.map((p, i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    position: "relative",
                                    width: 72,
                                    height: 72,
                                  }}
                                >
                                  {p.metadata?.id ? (
                                    <Box
                                      onClick={() => openCarousel(photos, i)}
                                      sx={{ cursor: "pointer" }}
                                    >
                                      <ThumbnailImg
                                        fileId={p.metadata.id}
                                        viewUrl={
                                          p.metadata.viewUrl ||
                                          p.metadata.url ||
                                          ""
                                        }
                                        provider={p.metadata.provider || null}
                                        width={72}
                                        height={72}
                                        alt={p.metadata.name || `photo-${i + 1}`}
                                        style={{
                                          borderRadius: 4,
                                          border: "1px solid var(--color-gray-300)",
                                        }}
                                      />
                                    </Box>
                                  ) : (
                                    <Box
                                      component="img"
                                      src={
                                        p.metadata?.viewUrl ||
                                        p.metadata?.url ||
                                        p.localUrl
                                      }
                                      onClick={() => openCarousel(photos, i)}
                                      sx={{
                                        width: 72,
                                        height: 72,
                                        objectFit: "cover",
                                        borderRadius: 1,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        cursor: "pointer",
                                      }}
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handlePhotoRemove(progressId, i)
                                    }
                                    disabled={savingId === progressId}
                                    sx={{
                                      position: "absolute",
                                      top: -8,
                                      right: -8,
                                      bgcolor: "background.paper",
                                      p: 0.25,
                                    }}
                                  >
                                    <DeleteOutlineIcon
                                      fontSize="small"
                                      sx={{ color: "error.main" }}
                                    />
                                  </IconButton>
                                </Box>
                              ))}
                              <Box
                                component="label"
                                sx={{
                                  width: 72,
                                  height: 72,
                                  border: "2px dashed",
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: photoUploading
                                    ? "default"
                                    : "pointer",
                                  color: "text.disabled",
                                }}
                              >
                                {photoUploading ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <CameraAltIcon />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  hidden
                                  disabled={
                                    photoUploading || savingId === progressId
                                  }
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handlePhotoAdd(progressId, file);
                                    e.target.value = "";
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>

                          <Button
                            variant="contained"
                            size="small"
                            disabled={
                              savingId === progressId || photoUploading
                            }
                            onClick={() => handleSaveInspection(row)}
                          >
                            {savingId === progressId ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              t("pda.progressInspection.save", "Save inspection")
                            )}
                          </Button>
                        </Box>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </Box>
  );
}
