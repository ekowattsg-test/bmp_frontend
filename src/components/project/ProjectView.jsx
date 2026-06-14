import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Chip,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  Assignment as AssignmentIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { request } from "../../helpers/axios_helper";

const toRoleCode = (row) => {
  const raw = String(
    row?.projectRole || row?.role || row?.roleName || row?.leaderRole || "",
  )
    .trim()
    .toUpperCase();

  if (raw === "M" || raw === "L" || raw === "C") return raw;
  if (raw === "MANAGER") return "M";
  if (raw === "LEADER") return "L";
  if (raw === "CO-LEADER" || raw === "COLEADER") return "C";
  return "";
};

const getLeaderStaffId = (row) =>
  row?.projectLeaderStaffId ||
  row?.staffId ||
  row?.leaderId ||
  row?.staffID ||
  "";

const ProjectView = ({ project, customerName, onClose }) => {
  const { t } = useTranslation();
  const [leadershipLoading, setLeadershipLoading] = useState(true);
  const [leadershipError, setLeadershipError] = useState("");
  const [leadershipRows, setLeadershipRows] = useState([]);

  const statusColor = {
    PLAN: "info",
    ACTIVE: "success",
    COMPLETE: "primary",
    CLOSE: "default",
  };

  const statusLabel = {
    PLAN: t("project.statusPlan"),
    ACTIVE: t("project.statusActive"),
    COMPLETE: t("project.statusComplete"),
    CLOSE: t("project.statusClose"),
  };

  useEffect(() => {
    let mounted = true;

    setLeadershipLoading(true);
    setLeadershipError("");

    Promise.all([
      request("GET", `/api/projectleaders/project/${project.projectCode}`),
      request("GET", "/api/staffs"),
    ])
      .then(([leadersRes, staffRes]) => {
        if (!mounted) return;

        const leaders = Array.isArray(leadersRes?.data) ? leadersRes.data : [];
        const staff = Array.isArray(staffRes?.data) ? staffRes.data : [];

        const staffMap = new Map();
        staff.forEach((item) => {
          const displayName =
            item.staffName ||
            [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
            String(item.staffId || "");
          staffMap.set(String(item.staffId), displayName);
        });

        const activeLeaders = leaders.filter(
          (row) => !row?.roleEndDate && String(row?.active ?? 1) !== "0",
        );

        setLeadershipRows(
          activeLeaders.map((row) => {
            const staffId = String(getLeaderStaffId(row) || "");
            const name =
              row?.staffName ||
              row?.leaderName ||
              staffMap.get(staffId) ||
              staffId ||
              "-";
            return {
              role: toRoleCode(row),
              name,
            };
          }),
        );
      })
      .catch(() => {
        if (!mounted) return;
        setLeadershipError(
          t("projectLeader.loadFailed", "Failed to load project leaders."),
        );
        setLeadershipRows([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLeadershipLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [project.projectCode, t]);

  const currentLeadership = useMemo(() => {
    const manager = leadershipRows.filter((row) => row.role === "M");
    const leader = leadershipRows.filter((row) => row.role === "L");
    const coLeader = leadershipRows.filter((row) => row.role === "C");

    return {
      manager: manager.map((row) => row.name).join(", "),
      leader: leader.map((row) => row.name).join(", "),
      coLeader: coLeader.map((row) => row.name).join(", "),
    };
  }, [leadershipRows]);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AssignmentIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                {t("project.viewTitle", "Project Details")}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              backgroundColor: "var(--color-gray-100)",
              p: 2,
              borderRadius: 1,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t("project.detailsHeading", "Project Details")}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("project.projectCode")}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {project.projectCode || "-"}
                    </Typography>
                    <Chip
                      label={
                        statusLabel[project.status] || project.status || "-"
                      }
                      color={statusColor[project.status] || "default"}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("project.projectName")}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {project.projectName || "-"}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("project.customerId")}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {customerName || t("project.noCustomer")}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t("project.startDate")}
                    </Typography>
                    <Typography variant="body1">
                      {project.startDate || "-"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {t("project.endDate")}
                    </Typography>
                    <Typography variant="body1">
                      {project.endDate || "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("project.projectDescription")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {project.projectDescription || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("project.projectLocation")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {project.projectLocation || "-"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              backgroundColor: "var(--color-gray-100)",
              p: 2,
              borderRadius: 1,
              mt: 2,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t(
                "project.currentLeadershipHeading",
                "Current Project Leadership",
              )}
            </Typography>

            {leadershipLoading ? (
              <Typography variant="body2" color="text.secondary">
                {t("projectLeader.loading", "Loading project leaders...")}
              </Typography>
            ) : leadershipError ? (
              <Typography variant="body2" color="error.main">
                {leadershipError}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("projectLeader.roleManager", "Manager")}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {currentLeadership.manager || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("projectLeader.roleLeader", "Leader")}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {currentLeadership.leader || "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("projectLeader.roleCoLeader", "Co-Leader")}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {currentLeadership.coLeader || "-"}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

ProjectView.propTypes = {
  project: PropTypes.shape({
    projectCode: PropTypes.string,
    projectName: PropTypes.string,
    projectDescription: PropTypes.string,
    customerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    projectLocation: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  customerName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default ProjectView;
