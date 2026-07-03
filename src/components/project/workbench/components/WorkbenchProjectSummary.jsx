import React from "react";
import { Box, Button, Chip, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "react-i18next";

const WorkbenchProjectSummary = ({
  project,
  projectCode,
  customerDisplayName,
  formatDate,
  statusLabel,
  toStatusColor,
  onBack,
  onHelp,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "96px 1fr" },
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={onBack}
            sx={{ minWidth: 0, px: 1 }}
          >
            {t("basic.back", "Back")}
          </Button>
        </Box>

        <Box>
          <Box
            sx={{
              mb: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography variant="h6">
              {t("projectPlanning.projectSummary", "Project Planning")}
            </Typography>
            <IconButton
              size="small"
              aria-label={t(
                "projectPlanning.workbenchHelp",
                "Project Workbench Help",
              )}
              onClick={onHelp}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <Typography variant="body2">
              <strong>{t("project.projectCode", "Project Code")}:</strong>{" "}
              {project?.projectCode || projectCode}
            </Typography>
            <Typography variant="body2">
              <strong>{t("project.projectName", "Project Name")}:</strong>{" "}
              {project?.projectName || "-"}
            </Typography>
            <Typography variant="body2">
              <strong>{t("project.customerName", "Customer Name")}:</strong>{" "}
              {customerDisplayName}
            </Typography>
            <Typography variant="body2">
              <strong>{t("project.startDate", "Start Date")}:</strong>{" "}
              {formatDate(project?.startDate)}
            </Typography>
            <Typography variant="body2">
              <strong>{t("project.endDate", "End Date")}:</strong>{" "}
              {formatDate(project?.endDate)}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <strong>{t("project.status", "Status")}:</strong>
              <Chip
                label={
                  statusLabel[String(project?.status || "").toUpperCase()] ||
                  project?.status ||
                  "-"
                }
                color={toStatusColor(project?.status)}
                size="small"
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default WorkbenchProjectSummary;
