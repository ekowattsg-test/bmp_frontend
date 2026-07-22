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
    ])
      .then(([manpowerRes, tasksRes, streamsRes]) => {
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
          tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value?.data)
            ? tasksRes.value.data
            : [];
        const streams =
          streamsRes.status === "fulfilled" &&
          Array.isArray(streamsRes.value?.data)
            ? streamsRes.value.data
            : [];

        const taskById = tasks.reduce((acc, task) => {
          acc[String(task?.projectTaskId || "")] = task;
          return acc;
        }, {});

        const streamById = streams.reduce((acc, stream) => {
          acc[String(stream?.projectStreamId || "")] = stream;
          return acc;
        }, {});

        const today = toApiDate(new Date());
        const staffId = String(user.staffId);

        const assignments = manpowers
          .filter((row) => String(row?.staffId || "") === staffId)
          .map((row) => {
            const date = normalizeDateValue(row?.manpowerDate || row?.workDate);
            return {
              date,
              projectTaskId: String(row?.projectTaskId || ""),
            };
          })
          .filter((row) => row.date && row.projectTaskId && row.date >= today);

        const uniqueMap = new Map();
        assignments.forEach((row) => {
          const key = `${row.date}__${row.projectTaskId}`;
          if (!uniqueMap.has(key)) uniqueMap.set(key, row);
        });
        const uniqueAssignments = Array.from(uniqueMap.values());

        const groupedByDate = new Map();
        uniqueAssignments.forEach((assignment) => {
          const task = taskById[assignment.projectTaskId];
          const streamId = String(task?.projectStreamId || "");
          const stream = streamById[streamId] || null;
          const streamName = String(stream?.streamName || streamId);

          if (!groupedByDate.has(assignment.date)) {
            groupedByDate.set(assignment.date, new Map());
          }
          const streamMap = groupedByDate.get(assignment.date);
          if (!streamMap.has(streamId)) {
            streamMap.set(streamId, {
              streamId,
              streamName,
              tasks: [],
            });
          }

          streamMap.get(streamId).tasks.push({
            projectTaskId: assignment.projectTaskId,
            taskName: String(task?.taskName || assignment.projectTaskId),
            taskStartDate: String(task?.taskStartDate || ""),
            taskEndDate: String(task?.taskEndDate || ""),
            actualStartDate: String(task?.actualStartDate || ""),
            actualEndDate: String(task?.actualEndDate || ""),
            taskStatus: String(task?.taskStatus || ""),
            progress: task?.progress,
          });
        });

        const normalized = Array.from(groupedByDate.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, streamMap]) => ({
            date,
            streams: Array.from(streamMap.values())
              .map((stream) => ({
                ...stream,
                tasks: [...stream.tasks].sort((a, b) => {
                  const byStartDate = String(
                    a.actualStartDate || a.taskStartDate || "",
                  ).localeCompare(
                    String(b.actualStartDate || b.taskStartDate || ""),
                  );
                  if (byStartDate !== 0) return byStartDate;
                  return String(a.taskName).localeCompare(String(b.taskName));
                }),
              }))
              .sort((a, b) =>
                String(a.streamName).localeCompare(String(b.streamName)),
              ),
          }));

        setScheduleRows(normalized);
      })
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
              {scheduleRows.map((dateRow) => (
                <Box
                  key={dateRow.date}
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
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {dateRow.date}
                    </Typography>
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
                    {dateRow.streams.map((stream) => (
                      <Box
                        key={`${dateRow.date}-${stream.streamId || "none"}`}
                        sx={{
                          borderLeft: "4px solid",
                          borderColor: "primary.main",
                          borderRadius: "0 6px 6px 0",
                          bgcolor: "background.paper",
                          px: 1.25,
                          py: 0.9,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color="primary.main"
                          sx={{ mb: 0.75 }}
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
                                String(task.taskStatus || "").trim() !== "";
                              const progressPercent = toProgressPercent(
                                task.progress,
                              );
                              const hasProgress = progressPercent !== null;

                              return (
                                <Box
                                  key={task.projectTaskId}
                                  sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    px: 1,
                                    py: 0.9,
                                    bgcolor: "background.paper",
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={600}>
                                    {task.taskName}
                                  </Typography>
                                  {(hasStatus || hasProgress) && (
                                    <Box
                                      sx={{
                                        mt: 0.5,
                                        mb: 0.25,
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
                                          {t("pda.me.progress", "Progress")}:{" "}
                                          {progressPercent}%
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
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
