import React, { useState, useEffect } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader } from "../common";

const toISODate = (date) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextMonday = (fromDate = new Date()) => {
  const date = new Date(fromDate);
  const day = date.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
};

const ProjectTaskDeliveryExtract = () => {
  const { t } = useTranslation();
  const [weekStartDate, setWeekStartDate] = useState("");
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    setWeekStartDate(getNextMonday());
  }, []);

  const handleExtract = async () => {
    if (running || !weekStartDate) return;
    setRunning(true);
    setErrorMsg("");
    setResult(null);
    try {
      const response = await request(
        "POST",
        `/api/taskdeliveryrequirements/extract?weekStartDate=${encodeURIComponent(weekStartDate)}`,
      );
      setResult(response?.data || null);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("projectTaskDeliveryExtract.failed"),
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("projectTaskDeliveryExtract.title")}
        subtitle={t("projectTaskDeliveryExtract.subtitle")}
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
        <Typography variant="body1" sx={{ mb: 1 }}>
          {t("projectTaskDeliveryExtract.description")}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("projectTaskDeliveryExtract.weekLabel", { date: weekStartDate })}
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
          onClick={handleExtract}
          disabled={running}
          sx={{ mb: result ? 3 : 0 }}
        >
          {running
            ? t("projectTaskDeliveryExtract.running")
            : t("projectTaskDeliveryExtract.start")}
        </Button>

        {result ? (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              {t("projectTaskDeliveryExtract.resultTitle")}
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
                  ? t("projectTaskDeliveryExtract.resultEmpty")
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

export default ProjectTaskDeliveryExtract;
