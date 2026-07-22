import React, { useState, useEffect, useMemo } from "react";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import InventoryIcon from "@mui/icons-material/Inventory";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LogoutIcon from "@mui/icons-material/Logout";
import { QRCodeSVG } from "qrcode.react";
import { getPdaUser } from "../common/pda_user_helper";
import { signEntity } from "../../../helpers/qr_token_helper";
import { request } from "../../../helpers/axios_helper";
import { AuthContext } from "../../../context/authContext";

const toApiDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const normalizeDateValue = (value) => {
  if (!value) return "";
  return toApiDate(value);
};

const getTaskStatusColor = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "in progress") return "warning";
  if (normalized === "not started") return "default";
  if (normalized === "cancelled") return "error";
  return "default";
};

const toProgressPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const isSiteLeaderRole = (row) => {
  const candidates = [row?.roleName, row?.operationRole, row?.role, row?.name];
  return candidates.some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    return normalized === "siteleader";
  });
};

/**
 * PdaMe — profile tab.
 *
 * Shows:
 *   - Staff name and mobile number (from pda_user_info in localStorage)
 *   - Placeholder section for assigned assets (data not yet available)
 */
export default function PdaMe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const user = useMemo(() => getPdaUser() || {}, []);

  const displayName =
    user.staffName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.login ||
    "—";

  const [qrToken, setQrToken] = useState(null);
  useEffect(() => {
    if (user.staffId) {
      signEntity(user.staffId).then(setQrToken);
    }
  }, [user.staffId]);

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [scheduleRows, setScheduleRows] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const handleLogout = () => {
    // Reuse the same main-app logout action, then clear PDA-only payload.
    logout();
    localStorage.removeItem("pda_user_info");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!displayName) return;
    setAssetsLoading(true);
    setAssetsError("");
    request("GET", "/api/stockviews")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        // Group by stockId, summing stockMoved for rows at this location
        const map = new Map();
        rows
          .filter((r) => String(r.location || "").trim() === displayName.trim())
          .forEach((r) => {
            const id = String(r.stockId || r.stockCode || "");
            if (!id) return;
            const moved =
              r.stockMoved !== undefined &&
              r.stockMoved !== null &&
              r.stockMoved !== ""
                ? Number(r.stockMoved)
                : Number(r.qty || r.quantity || 0) *
                  Number(r.stockModifier || 0);
            if (map.has(id)) {
              map.get(id).qty += moved;
            } else {
              map.set(id, {
                id,
                stockCode: String(r.stockCode || id),
                productName: String(r.productName || ""),
                uom: String(r.uom || ""),
                qty: moved,
              });
            }
          });
        const result = Array.from(map.values())
          .filter((s) => s.qty > 0)
          .sort((a, b) => a.stockCode.localeCompare(b.stockCode));
        setAssets(result);
      })
      .catch(() => setAssetsError(t("pda.me.assetsError")))
      .finally(() => setAssetsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  useEffect(() => {
    if (!user.staffId) return;

    setScheduleLoading(true);
    setScheduleError("");

    Promise.allSettled([
      request("GET", "/api/projectmanpowers"),
      request("GET", "/api/projecttasks"),
      request("GET", "/api/projectstreams"),
      request("GET", "/api/projects"),
      request("GET", "/api/staffs"),
      request("GET", "/api/projecttaskprogresses"),
      request("GET", "/api/operationstaffs"),
    ])
      .then(
        ([
          manpowerRes,
          tasksRes,
          streamsRes,
          projectsRes,
          staffRes,
          progressesRes,
          operationStaffRes,
        ]) => {
          if (manpowerRes.status !== "fulfilled") {
            setScheduleRows([]);
            setScheduleError(
              t("pda.me.scheduleLoadFailed", "Failed to load schedule."),
            );
            return;
          }

          const manpowers = Array.isArray(manpowerRes.value?.data)
            ? manpowerRes.value.data
            : [];
          const tasks =
            tasksRes.status === "fulfilled" &&
            Array.isArray(tasksRes.value?.data)
              ? tasksRes.value.data
              : [];
          const streams =
            streamsRes.status === "fulfilled" &&
            Array.isArray(streamsRes.value?.data)
              ? streamsRes.value.data
              : [];
          const projects =
            projectsRes.status === "fulfilled" &&
            Array.isArray(projectsRes.value?.data)
              ? projectsRes.value.data
              : [];
          const staffs =
            staffRes.status === "fulfilled" &&
            Array.isArray(staffRes.value?.data)
              ? staffRes.value.data
              : [];
          const progresses =
            progressesRes.status === "fulfilled" &&
            Array.isArray(progressesRes.value?.data)
              ? progressesRes.value.data
              : [];
          const operationStaffs =
            operationStaffRes.status === "fulfilled" &&
            Array.isArray(operationStaffRes.value?.data)
              ? operationStaffRes.value.data
              : [];

          const taskById = tasks.reduce((acc, task) => {
            acc[String(task?.projectTaskId || "")] = task;
            return acc;
          }, {});

          const streamById = streams.reduce((acc, stream) => {
            acc[String(stream?.projectStreamId || "")] = stream;
            return acc;
          }, {});

          const projectByCode = projects.reduce((acc, project) => {
            const code = String(project?.projectCode || "").trim();
            if (!code) return acc;
            acc[code] = project;
            return acc;
          }, {});

          const staffById = staffs.reduce((acc, staff) => {
            const id = String(staff?.staffId || "").trim();
            if (!id) return acc;
            const name = String(
              staff?.staffName ||
                [staff?.firstName, staff?.lastName].filter(Boolean).join(" "),
            ).trim();
            acc[id] = name || id;
            return acc;
          }, {});

          const progressByTaskDate = {};
          progresses.forEach((row) => {
            const taskId = String(row?.projectTaskId || "").trim();
            const date = normalizeDateValue(row?.progressDate);
            if (!taskId || !date) return;
            const key = `${taskId}__${date}`;
            const prev = progressByTaskDate[key];
            const prevId = Number(prev?.projectTaskProgressId || 0);
            const nextId = Number(row?.projectTaskProgressId || 0);
            if (!prev || nextId >= prevId) {
              progressByTaskDate[key] = row;
            }
          });

          const today = toApiDate(new Date());
          const currentStaffId = String(user.staffId || "").trim();
          const hasSiteLeader = operationStaffs
            .filter(
              (row) => String(row?.staffId || "").trim() === currentStaffId,
            )
            .some(isSiteLeaderRole);

          const assignments = manpowers
            .map((row) => {
              const date = normalizeDateValue(
                row?.manpowerDate || row?.workDate,
              );
              const assignedStaffId = String(row?.staffId || "").trim();
              const taskId = String(row?.projectTaskId || "");
              const task = taskById[taskId];
              const streamId = String(task?.projectStreamId || "").trim();
              const stream = streamById[streamId] || null;
              const projectCode = String(
                task?.projectCode || stream?.projectCode || "",
              ).trim();
              const project = projectByCode[projectCode] || null;
              const progressRow =
                progressByTaskDate[`${taskId}__${date}`] || null;
              const executedBy = String(progressRow?.executedBy || "").trim();
              const marker = String(progressRow?.marker || "").trim();

              return {
                date,
                projectTaskId: taskId,
                assignedStaffId,
                assignedStaffName:
                  staffById[assignedStaffId] || assignedStaffId,
                projectCode,
                projectName: String(project?.projectName || projectCode || ""),
                streamId,
                streamName: String(stream?.streamName || streamId || ""),
                taskName: String(task?.taskName || taskId),
                taskStartDate: String(task?.taskStartDate || ""),
                taskEndDate: String(task?.taskEndDate || ""),
                actualStartDate: String(task?.actualStartDate || ""),
                actualEndDate: String(task?.actualEndDate || ""),
                taskStatus: String(task?.taskStatus || ""),
                progress: task?.progress,
                executedBy,
                executedByName: staffById[executedBy] || executedBy,
                marker,
              };
            })
            .filter(
              (row) =>
                row.date &&
                row.projectTaskId &&
                row.assignedStaffId &&
                row.date >= today &&
                row.marker !== "U",
            )
            .filter((row) =>
              hasSiteLeader ? true : row.assignedStaffId === currentStaffId,
            );

          const uniqueMap = new Map();
          assignments.forEach((row) => {
            const key = `${row.date}__${row.projectTaskId}__${row.assignedStaffId}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, row);
          });
          const uniqueAssignments = Array.from(uniqueMap.values()).sort(
            (a, b) => {
              if (hasSiteLeader) {
                const aOwn =
                  a.executedBy && a.executedBy === currentStaffId ? 0 : 1;
                const bOwn =
                  b.executedBy && b.executedBy === currentStaffId ? 0 : 1;
                if (aOwn !== bOwn) return aOwn - bOwn;
              }

              const byStaff = String(a.assignedStaffName).localeCompare(
                String(b.assignedStaffName),
              );
              if (byStaff !== 0) return byStaff;

              const byProject = String(a.projectName).localeCompare(
                String(b.projectName),
              );
              if (byProject !== 0) return byProject;

              const byStream = String(a.streamName).localeCompare(
                String(b.streamName),
              );
              if (byStream !== 0) return byStream;

              const byDate = String(a.date).localeCompare(String(b.date));
              if (byDate !== 0) return byDate;

              return String(a.taskName).localeCompare(String(b.taskName));
            },
          );

          const staffMap = new Map();
          uniqueAssignments.forEach((item) => {
            if (!staffMap.has(item.assignedStaffId)) {
              staffMap.set(item.assignedStaffId, {
                staffId: item.assignedStaffId,
                staffName: item.assignedStaffName,
                executedOwnFirst:
                  hasSiteLeader &&
                  item.executedBy &&
                  item.executedBy === currentStaffId,
                dates: new Map(),
              });
            }
            const staffGroup = staffMap.get(item.assignedStaffId);
            if (
              hasSiteLeader &&
              item.executedBy &&
              item.executedBy === currentStaffId
            ) {
              staffGroup.executedOwnFirst = true;
            }

            if (!staffGroup.dates.has(item.date)) {
              staffGroup.dates.set(item.date, {
                date: item.date,
                projects: new Map(),
              });
            }
            const dateGroup = staffGroup.dates.get(item.date);

            if (!dateGroup.projects.has(item.projectCode)) {
              dateGroup.projects.set(item.projectCode, {
                projectCode: item.projectCode,
                projectName: item.projectName,
                streams: new Map(),
              });
            }
            const projectGroup = dateGroup.projects.get(item.projectCode);

            if (!projectGroup.streams.has(item.streamId)) {
              projectGroup.streams.set(item.streamId, {
                streamId: item.streamId,
                streamName: item.streamName,
                tasks: [],
              });
            }

            projectGroup.streams.get(item.streamId).tasks.push(item);
          });

          const normalized = Array.from(staffMap.values())
            .sort((a, b) => {
              if (hasSiteLeader) {
                const aRank = a.executedOwnFirst ? 0 : 1;
                const bRank = b.executedOwnFirst ? 0 : 1;
                if (aRank !== bRank) return aRank - bRank;
              }
              return String(a.staffName).localeCompare(String(b.staffName));
            })
            .map((staffGroup) => ({
              staffId: staffGroup.staffId,
              staffName: staffGroup.staffName,
              executedOwnFirst: staffGroup.executedOwnFirst,
              dates: Array.from(staffGroup.dates.values())
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
                .map((dateGroup) => ({
                  date: dateGroup.date,
                  projects: Array.from(dateGroup.projects.values())
                    .sort((a, b) =>
                      String(a.projectName).localeCompare(
                        String(b.projectName),
                      ),
                    )
                    .map((projectGroup) => ({
                      projectCode: projectGroup.projectCode,
                      projectName: projectGroup.projectName,
                      streams: Array.from(projectGroup.streams.values())
                        .sort((a, b) =>
                          String(a.streamName).localeCompare(
                            String(b.streamName),
                          ),
                        )
                        .map((streamGroup) => ({
                          streamId: streamGroup.streamId,
                          streamName: streamGroup.streamName,
                          tasks: [...streamGroup.tasks].sort((a, b) => {
                            const byStart = String(
                              a.actualStartDate || a.taskStartDate || "",
                            ).localeCompare(
                              String(
                                b.actualStartDate || b.taskStartDate || "",
                              ),
                            );
                            if (byStart !== 0) return byStart;
                            return String(a.taskName).localeCompare(
                              String(b.taskName),
                            );
                          }),
                        })),
                    })),
                })),
            }));

          setScheduleRows(normalized);
        },
      )
      .catch(() => {
        setScheduleRows([]);
        setScheduleError(
          t("pda.me.scheduleLoadFailed", "Failed to load schedule."),
        );
      })
      .finally(() => setScheduleLoading(false));
  }, [t, user.staffId]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Profile card */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: "primary.main",
                flexShrink: 0,
              }}
            >
              <PersonIcon fontSize="large" />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.25 }}
              >
                {t("pda.me.nameLabel")}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {displayName}
                </Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  sx={{ flexShrink: 0 }}
                >
                  {t("pda.me.logout")}
                </Button>
              </Stack>

              {user.mobileNumber && (
                <Box
                  sx={{
                    mt: 0.75,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                  }}
                >
                  <PhoneAndroidIcon
                    sx={{
                      fontSize: 15,
                      color: "text.secondary",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ minWidth: 0 }}
                  >
                    {t("pda.me.mobileLabel")}: {user.mobileNumber}
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* QR code card — staff ID */}
      {user.staffId && (
        <Card variant="outlined">
          <CardContent
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={600}
              color="text.secondary"
            >
              {t("pda.me.staffQr")}
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#fff",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                display: "inline-flex",
              }}
            >
              <QRCodeSVG
                value={qrToken || String(user.staffId)}
                size={160}
                level="M"
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "monospace" }}
            >
              {user.staffId}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Schedule placeholder */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <CalendarMonthIcon sx={{ color: "text.secondary" }} />
            <Typography variant="subtitle2" fontWeight={600}>
              {t("pda.nav.schedule")}
            </Typography>
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {scheduleLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : scheduleError ? (
            <Typography variant="body2" color="error" sx={{ py: 1 }}>
              {scheduleError}
            </Typography>
          ) : scheduleRows.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
              <CalendarMonthIcon sx={{ fontSize: 40, opacity: 0.35, mb: 1 }} />
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {t(
                  "pda.me.scheduleEmpty",
                  "No current or upcoming assignments",
                )}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {scheduleRows.map((staffRow) => (
                <Box
                  key={staffRow.staffId}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.8,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {staffRow.staffName || staffRow.staffId}
                    </Typography>
                    {staffRow.executedOwnFirst && (
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {t("pda.me.executedByMeFirst", "Executed by me")}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      bgcolor: "background.default",
                    }}
                  >
                    {staffRow.dates.map((dateRow) => (
                      <Box
                        key={`${staffRow.staffId}-${dateRow.date}`}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.paper",
                          px: 1,
                          py: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color="text.primary"
                          sx={{ mb: 0.75 }}
                        >
                          {dateRow.date}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.85,
                          }}
                        >
                          {dateRow.projects.map((project) => (
                            <Box
                              key={`${staffRow.staffId}-${dateRow.date}-${project.projectCode || "none"}`}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1,
                                bgcolor: "background.paper",
                                px: 1,
                                py: 0.9,
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color="text.primary"
                                sx={{ mb: 0.75 }}
                              >
                                {project.projectName || project.projectCode}
                              </Typography>

                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.85,
                                }}
                              >
                                {project.streams.map((stream) => (
                                  <Box
                                    key={`${project.projectCode || "none"}-${stream.streamId || "none"}`}
                                    sx={{
                                      borderLeft: "4px solid",
                                      borderColor: "primary.main",
                                      borderRadius: "0 6px 6px 0",
                                      bgcolor: "background.paper",
                                      px: 1.1,
                                      py: 0.8,
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      color="primary.main"
                                      sx={{ mb: 0.65 }}
                                    >
                                      {stream.streamName}
                                    </Typography>

                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 0.75,
                                      }}
                                    >
                                      {stream.tasks.map((task) =>
                                        (() => {
                                          const hasStatus =
                                            String(
                                              task.taskStatus || "",
                                            ).trim() !== "";
                                          const progressPercent =
                                            toProgressPercent(task.progress);
                                          const hasProgress =
                                            progressPercent !== null;

                                          return (
                                            <Box
                                              key={`${task.projectTaskId}-${task.date}`}
                                              sx={{
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                                px: 1,
                                                py: 0.9,
                                                bgcolor: "background.paper",
                                              }}
                                            >
                                              <Typography
                                                variant="body2"
                                                fontWeight={600}
                                              >
                                                {task.taskName}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                              >
                                                {task.actualStartDate ||
                                                  task.taskStartDate ||
                                                  ""}
                                                {" - "}
                                                {task.actualEndDate ||
                                                  task.taskEndDate ||
                                                  ""}
                                              </Typography>
                                              {task.executedByName && (
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                  display="block"
                                                  sx={{ mt: 0.2 }}
                                                >
                                                  {t(
                                                    "pda.me.assignedBy",
                                                    "Assigned By",
                                                  )}
                                                  : {task.executedByName}
                                                </Typography>
                                              )}
                                              {(hasStatus || hasProgress) && (
                                                <Box
                                                  sx={{
                                                    mt: 0.45,
                                                    mb: 0.1,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.75,
                                                    flexWrap: "wrap",
                                                  }}
                                                >
                                                  {hasStatus && (
                                                    <Chip
                                                      size="small"
                                                      color={getTaskStatusColor(
                                                        task.taskStatus,
                                                      )}
                                                      label={task.taskStatus}
                                                    />
                                                  )}
                                                  {hasProgress && (
                                                    <Typography
                                                      variant="caption"
                                                      color="text.secondary"
                                                    >
                                                      {t(
                                                        "pda.me.progress",
                                                        "Progress",
                                                      )}
                                                      : {progressPercent}%
                                                    </Typography>
                                                  )}
                                                </Box>
                                              )}
                                            </Box>
                                          );
                                        })(),
                                      )}
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Assigned assets */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <InventoryIcon sx={{ color: "text.secondary" }} />
            <Typography variant="subtitle2" fontWeight={600}>
              {t("pda.me.assets")}
            </Typography>
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {assetsLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!assetsLoading && assetsError && (
            <Typography variant="body2" color="error" sx={{ py: 1 }}>
              {assetsError}
            </Typography>
          )}

          {!assetsLoading && !assetsError && assets.length === 0 && (
            <Box sx={{ textAlign: "center", py: 3, color: "text.disabled" }}>
              <InventoryIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">
                {t("pda.me.assetsPlaceholder")}
              </Typography>
            </Box>
          )}

          {!assetsLoading && assets.length > 0 && (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 44px",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  bgcolor: "grey.100",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  {t("pda.me.assetsColProduct")}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    textAlign: "center",
                  }}
                >
                  {t("pda.me.assetsColCode")}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    textAlign: "right",
                  }}
                >
                  {t("pda.me.assetsQty")}
                </Typography>
              </Box>

              {/* Rows */}
              {assets.map((item, idx) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 44px",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderTop: idx === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Typography variant="body2" noWrap>
                    {item.productName || "—"}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 0.75,
                      fontFamily: "monospace",
                      color: "text.secondary",
                      textAlign: "center",
                    }}
                  >
                    {item.stockCode}
                  </Typography>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="primary.main"
                      lineHeight={1.2}
                      component="div"
                    >
                      {item.qty}
                    </Typography>
                    {item.uom && (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        display="block"
                        lineHeight={1.2}
                      >
                        {item.uom}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
