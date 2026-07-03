import React, { useContext, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader } from "../common";
import { AuthContext } from "../../context/authContext";

const ProjectManpowerGenerate = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const userLevel = Number(userInfo?.userLevel ?? userInfo?.level ?? 0);
  const canAccess = userLevel >= 5;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const hasResult = result !== null;

  const resultText = useMemo(() => {
    if (result === null || result === undefined) return "";
    if (typeof result === "string") return result;
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }, [result]);

  const handleGenerate = async () => {
    if (!canAccess || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await request(
        "POST",
        "/api/projectmanpowers/regenerate",
      );
      setResult(response?.data ?? null);
    } catch (err) {
      const backendMessage = String(
        err?.response?.data?.message || err?.response?.data || "",
      ).trim();
      setError(
        backendMessage ||
          t(
            "projectManpowerGenerate.generateFailed",
            "Failed to regenerate project manpower.",
          ),
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("projectManpowerGenerate.title", "Generate Project Manpower")}
        subtitle={t(
          "projectManpowerGenerate.subtitle",
          "Regenerate project manpower assignments from project data.",
        )}
        icon={Groups2OutlinedIcon}
      />

      {!canAccess ? (
        <Alert severity="error">
          {t(
            "projectManpowerGenerate.unauthorized",
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
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                {t(
                  "projectManpowerGenerate.description",
                  "Click the button to regenerate project manpower.",
                )}
              </Typography>

              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
              >
                {loading
                  ? t("projectManpowerGenerate.generating", "Generating...")
                  : t("projectManpowerGenerate.generate", "Generate")}
              </Button>
            </Stack>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {hasResult && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("projectManpowerGenerate.result", "Result")}
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1,
                  overflowX: "auto",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.primary",
                }}
              >
                {resultText}
              </Box>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default ProjectManpowerGenerate;
