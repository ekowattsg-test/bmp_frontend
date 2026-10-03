import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { ThumbnailImg, ImageCarousel } from "../../helpers/file_helper";

const toDisplayDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const getPhotoInfos = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .filter(Boolean)
      .map((item) => ({
        id: item.id || null,
        viewUrl: item.viewUrl || item.url || "",
        provider: item.provider || null,
        name: item.name || "",
      }))
      .filter((item) => item.viewUrl);
  } catch {
    return value
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
      .map((url) => ({ id: null, viewUrl: url, provider: null, name: "" }));
  }
};

export default function ProjectProgressHistoryDialog({
  open,
  onClose,
  task,
  staffNameById,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressRecords, setProgressRecords] = useState([]);
  const [manpowers, setManpowers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);

  const taskId = String(task?.projectTaskId || "").trim();

  useEffect(() => {
    if (!open) return;
    setErrorMsg("");
    setCurrentIndex(0);
    if (!taskId) {
      setLoading(false);
      setErrorMsg(
        t(
          "projectProgressInspection.historyLoadFailed",
          "Failed to load task progress history.",
        ),
      );
      return;
    }
    setLoading(true);

    const requestConfig = { timeout: 15000 };

    Promise.all([
      request(
        "GET",
        `/api/projecttaskprogresses?projectTaskId=${taskId}`,
        null,
        requestConfig,
      ).catch(() => ({ data: [] })),
      request(
        "GET",
        `/api/projectmanpowers/task/${taskId}`,
        null,
        requestConfig,
      ).catch(() => ({ data: [] })),
    ])
      .then(([progressRes, manpowerRes]) => {
        const records = Array.isArray(progressRes?.data) ? progressRes.data : [];
        records.sort((a, b) =>
          String(b.progressDate || "").localeCompare(String(a.progressDate || "")),
        );
        setProgressRecords(records);
        setManpowers(Array.isArray(manpowerRes?.data) ? manpowerRes.data : []);
      })
      .catch(() => {
        setErrorMsg(
          t(
            "projectProgressInspection.historyLoadFailed",
            "Failed to load task progress history.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [open, taskId, t]);

  const currentRecord = progressRecords[currentIndex] || null;

  const manpowerForRecord = useMemo(() => {
    if (!currentRecord) return [];
    const date = String(currentRecord.progressDate || "").trim();
    return manpowers.filter(
      (m) =>
        String(m.manpowerDate || "").trim() === date ||
        String(m.workDate || "").trim() === date,
    );
  }, [currentRecord, manpowers]);

  const workers = useMemo(() => {
    return manpowerForRecord.filter(
      (m) => String(m.role || "").toLowerCase() === "worker",
    );
  }, [manpowerForRecord]);

  const leader = useMemo(() => {
    const supervisor = manpowerForRecord.find(
      (m) => String(m.role || "").toLowerCase() === "supervisor",
    );
    if (supervisor) return supervisor;
    const reportedBy = String(currentRecord?.reportedBy || "").trim();
    if (reportedBy) {
      return {
        staffId: reportedBy,
        role: "leader",
      };
    }
    return null;
  }, [manpowerForRecord, currentRecord]);

  const inspectionPhotos = useMemo(() => {
    return getPhotoInfos(currentRecord?.inspectionPhotos);
  }, [currentRecord]);

  const openPhotoCarousel = (idx) => {
    if (inspectionPhotos.length === 0) return;
    setCarouselImages(
      inspectionPhotos.map((photo) => ({
        displayUrl: photo.viewUrl,
        viewUrl: photo.viewUrl,
        title: photo.name,
        provider: photo.provider,
        meta: photo,
      })),
    );
    setCarouselStart(idx);
    setCarouselOpen(true);
  };

  const handlePrev = () => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : progressRecords.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i < progressRecords.length - 1 ? i + 1 : 0));
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: "75vh",
            maxHeight: "75vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 2,
            flexShrink: 0,
          }}
        >
          <Typography variant="h6" component="span" fontWeight={600}>
            {t("projectProgressInspection.historyTitle", "Task Progress History")}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            p: 0,
            "&:last-child": { pb: 0 },
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : errorMsg ? (
            <Typography color="error.main" sx={{ p: 2 }}>
              {errorMsg}
            </Typography>
          ) : progressRecords.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              {t(
                "projectProgressInspection.noHistory",
                "No progress records found for this task.",
              )}
            </Typography>
          ) : (
            <>
              {/* Fixed header: base task details + navigation */}
              <Box sx={{ p: 2, flexShrink: 0 }}>
                {/* Base task details */}
                <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {task?.taskName || "-"}
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      {t("projectProgressInspection.plannedStart", "Planned Start")}
                    </Typography>
                    <Typography variant="body2">
                      {toDisplayDate(task?.taskStartDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      {t("projectProgressInspection.plannedEnd", "Planned End")}
                    </Typography>
                    <Typography variant="body2">
                      {toDisplayDate(task?.taskEndDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      {t("projectProgressInspection.actualStart", "Actual Start")}
                    </Typography>
                    <Typography variant="body2">
                      {toDisplayDate(task?.actualStartDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      {t("projectProgressInspection.actualEnd", "Actual End")}
                    </Typography>
                    <Typography variant="body2">
                      {toDisplayDate(task?.actualEndDate)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Record navigation */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <IconButton onClick={handlePrev} disabled={progressRecords.length <= 1}>
                  <ArrowBackIosNewIcon />
                </IconButton>
                <Typography variant="body2" fontWeight={600}>
                  {t("projectProgressInspection.recordOf", "Record {{current}} of {{total}}", {
                    current: currentIndex + 1,
                    total: progressRecords.length,
                  })}
                </Typography>
                <IconButton onClick={handleNext} disabled={progressRecords.length <= 1}>
                  <ArrowForwardIosIcon />
                </IconButton>
              </Box>
              </Box>

              {/* Scrollable progress / inspection details */}
              <Box
                sx={{
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  px: 2,
                  pb: 2,
                }}
              >
              {currentRecord && (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t("projectProgressInspection.progressDate", "Execution Date")}
                      </Typography>
                      <Typography variant="body2">
                        {currentRecord.progressDate || "-"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t("projectProgressInspection.reportedProgress", "Reported Progress")}
                      </Typography>
                      <Box>
                        <Chip
                          label={`${Number(currentRecord.reportedProgress || 0)}%`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t("projectProgressInspection.progress", "Progress")}
                      </Typography>
                      <Box>
                        <Chip
                          label={`${Number(currentRecord.progress || 0)}%`}
                          size="small"
                          color={Number(currentRecord.completed) ? "success" : "primary"}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t("projectProgressInspection.executedBy", "Executed By")}
                      </Typography>
                      <Typography variant="body2">
                        {staffNameById[String(currentRecord.executedBy || "")] ||
                          currentRecord.executedBy ||
                          "-"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t("projectProgressInspection.reportedBy", "Reported By")}
                      </Typography>
                      <Typography variant="body2">
                        {staffNameById[String(currentRecord.reportedBy || "")] ||
                          currentRecord.reportedBy ||
                          "-"}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Workers */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      {t("projectProgressInspection.workers", "Workers")}
                    </Typography>
                    {workers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t("projectProgressInspection.noWorkers", "No workers recorded.")}
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {workers.map((w, idx) => (
                          <Chip
                            key={idx}
                            label={
                              staffNameById[String(w.staffId || "")] || w.staffId || "-"
                            }
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Leader */}
                  {leader && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        {t("projectProgressInspection.leader", "Leader")}
                      </Typography>
                      <Chip
                        label={
                          staffNameById[String(leader.staffId || "")] ||
                          leader.staffId ||
                          "-"
                        }
                        size="small"
                        color="primary"
                      />
                    </Box>
                  )}

                  {/* Inspection details */}
                  {currentRecord.inspectionDate && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                          {t("projectProgressInspection.inspectionDetails", "Inspection")}
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">
                              {t("projectProgressInspection.inspectionDate", "Inspection Date")}
                            </Typography>
                            <Typography variant="body2">
                              {currentRecord.inspectionDate || "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">
                              {t("projectProgressInspection.verifiedProgress", "Verified Progress")}
                            </Typography>
                            <Box>
                              <Chip
                                label={`${Number(currentRecord.verifiedProgress || 0)}%`}
                                size="small"
                                color="success"
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">
                              {t("projectProgressInspection.inspectedBy", "Inspected By")}
                            </Typography>
                            <Typography variant="body2">
                              {staffNameById[String(currentRecord.inspectedBy || "")] ||
                                currentRecord.inspectedBy ||
                                "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">
                              {t("projectProgressInspection.remark", "Remark")}
                            </Typography>
                            <Typography variant="body2">
                              {currentRecord.inspectionRemark || "-"}
                            </Typography>
                          </Grid>
                        </Grid>

                        {inspectionPhotos.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              {t("projectProgressInspection.photos", "Photos")}
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                              {inspectionPhotos.map((photo, idx) =>
                                photo.id ? (
                                  <Box
                                    key={idx}
                                    onClick={() => openPhotoCarousel(idx)}
                                    sx={{ cursor: "pointer" }}
                                  >
                                    <ThumbnailImg
                                      fileId={photo.id}
                                      viewUrl={photo.viewUrl}
                                      provider={photo.provider}
                                      width={72}
                                      height={72}
                                      alt={photo.name || `photo-${idx + 1}`}
                                      style={{
                                        borderRadius: 4,
                                        border: "1px solid var(--color-gray-300)",
                                      }}
                                    />
                                  </Box>
                                ) : (
                                  <Box
                                    key={idx}
                                    component="img"
                                    src={photo.viewUrl}
                                    alt={photo.name || `photo-${idx + 1}`}
                                    onClick={() => openPhotoCarousel(idx)}
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
                                ),
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                </Box>
              )}
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </>
  );
}
