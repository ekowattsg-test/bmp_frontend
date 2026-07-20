import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader } from "../common";
import { AuthContext } from "../../context/authContext";

const ProjectTaskRecalculate = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const userLevel = Number(userInfo?.userLevel ?? userInfo?.level ?? 0);
  const canAccess = userLevel >= 5;

  const [projects, setProjects] = useState([]);
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!canAccess) return;

    setLoadingProjects(true);
    setError("");

    request("GET", "/api/projects")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        setProjects(rows);
        setSelectedProjectCode(String(rows[0]?.projectCode || ""));
      })
      .catch(() => {
        setProjects([]);
        setSelectedProjectCode("");
        setError(
          t(
            "projectTaskRecalculate.loadProjectsFailed",
            "Failed to load projects.",
          ),
        );
      })
      .finally(() => setLoadingProjects(false));
  }, [canAccess, t]);

  const handleRecalculate = async () => {
    if (!canAccess || !selectedProjectCode || submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await request(
        "POST",
        `/api/projecttasks/recalculate/project/${encodeURIComponent(selectedProjectCode)}`,
      );
      const resultText =
        typeof response?.data === "string"
          ? response.data
          : t(
              "projectTaskRecalculate.recalculateSuccess",
              "Task dates were recalculated successfully.",
            );
      setSuccess(resultText);
    } catch (err) {
      const backendMessage = String(
        err?.response?.data?.message || err?.response?.data || "",
      ).trim();
      setError(
        backendMessage ||
          t(
            "projectTaskRecalculate.recalculateFailed",
            "Failed to recalculate task dates.",
          ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("projectTaskRecalculate.title", "Recalculate Task Dates")}
        subtitle={t(
          "projectTaskRecalculate.subtitle",
          "Recalculate all task dates under the selected project.",
        )}
        icon={AutorenewIcon}
      />

      {!canAccess ? (
        <Alert severity="error">
          {t(
            "projectTaskRecalculate.unauthorized",
            "You are not authorized to access this function.",
          )}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "projectTaskRecalculate.instruction",
                  "Select a project code and click the button to recalculate all project task dates.",
                )}
              </Typography>

              <FormControl
                fullWidth
                size="small"
                disabled={loadingProjects || submitting}
              >
                <InputLabel>
                  {t("projectTaskRecalculate.projectCode", "Project Code")}
                </InputLabel>
                <Select
                  value={selectedProjectCode}
                  label={t(
                    "projectTaskRecalculate.projectCode",
                    "Project Code",
                  )}
                  onChange={(e) => setSelectedProjectCode(e.target.value)}
                >
                  {projects.map((project) => (
                    <MenuItem
                      key={String(project.projectCode || "")}
                      value={String(project.projectCode || "")}
                    >
                      {project.projectCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Button
                  variant="contained"
                  onClick={handleRecalculate}
                  disabled={
                    loadingProjects ||
                    submitting ||
                    !String(selectedProjectCode).trim()
                  }
                  startIcon={
                    submitting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                >
                  {submitting
                    ? t(
                        "projectTaskRecalculate.recalculating",
                        "Recalculating...",
                      )
                    : t("projectTaskRecalculate.recalculate", "Recalculate")}
                </Button>
              </Box>
            </Stack>
          </Paper>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
        </Stack>
      )}
    </Box>
  );
};

export default ProjectTaskRecalculate;
