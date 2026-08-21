import React, { useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader } from "../common";

const RebuildHoldMovements = () => {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  const handleRebuild = async () => {
    if (running) return;
    setRunning(true);
    setErrorMsg("");
    setResult(null);
    try {
      const response = await request(
        "POST",
        "/api/admin/holdmovements/rebuild",
      );
      setResult(response?.data || null);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("rebuildHoldMovements.failed"),
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("rebuildHoldMovements.title")}
        subtitle={t("rebuildHoldMovements.subtitle")}
      />

      <Box
        sx={{
          mt: 2,
          p: 3,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
          maxWidth: 560,
        }}
      >
        <Typography variant="body1" sx={{ mb: 3 }}>
          {t("rebuildHoldMovements.description")}
        </Typography>

        {errorMsg ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        ) : null}

        <Button
          variant="contained"
          size="large"
          startIcon={<PlayCircleOutlineIcon />}
          onClick={handleRebuild}
          disabled={running}
          sx={{ mb: result ? 3 : 0 }}
        >
          {running
            ? t("rebuildHoldMovements.running")
            : t("rebuildHoldMovements.start")}
        </Button>

        {result ? (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              {t("rebuildHoldMovements.resultTitle")}
            </Typography>
            {typeof result === "object" && !Array.isArray(result) ? (
              Object.entries(result).map(([key, val]) => (
                <Box
                  key={key}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {key}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {Array.isArray(val) ? val.join(", ") : String(val ?? "-")}
                  </Typography>
                </Box>
              ))
            ) : Array.isArray(result) ? (
              <Typography variant="body2" fontWeight={600}>
                {result.length === 0
                  ? t("rebuildHoldMovements.resultEmpty")
                  : result.join(", ")}
              </Typography>
            ) : (
              <Typography variant="body2">{String(result)}</Typography>
            )}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default RebuildHoldMovements;
