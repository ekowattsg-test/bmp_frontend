import React, { useState } from "react";
import { Alert, Box, Button, Chip, Typography } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { PageHeader } from "../common";

const RequisitionGenerate = () => {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (running) return;
    setRunning(true);
    setErrorMsg("");
    setResult(null);
    try {
      const response = await request("POST", "/api/requisitionorders/generate");
      setResult(response?.data || null);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t(
            "requisitionGenerate.failed",
            "Requisition generation failed. Please try again.",
          ),
      );
    } finally {
      setRunning(false);
    }
  };

  const SummaryRow = ({ label, value }) => (
    <Box
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
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title={t("requisitionGenerate.title", "Generate Stock Requisition")}
        subtitle={t(
          "requisitionGenerate.subtitle",
          "Generate stock requisition orders for active project cycles.",
        )}
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
          {t(
            "requisitionGenerate.description",
            "Click the button below to start the requisition generation process. The system will create requisition orders based on current project cycles and requirements.",
          )}
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
          onClick={handleGenerate}
          disabled={running}
          sx={{ mb: result ? 3 : 0 }}
        >
          {running
            ? t("requisitionGenerate.running", "Generating...")
            : t("requisitionGenerate.start", "Start Requisition Generation")}
        </Button>

        {result ? (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {t("requisitionGenerate.resultTitle", "Generation Result")}
              </Typography>
              <Chip
                size="small"
                label={String(result.status || "")}
                color={result.status === "generated" ? "success" : "default"}
              />
            </Box>

            <SummaryRow
              label={t("requisitionGenerate.cols.cycleId", "Requisition Cycle")}
              value={result.requisitionCycleId ?? "-"}
            />
            <SummaryRow
              label={t("requisitionGenerate.cols.cycleStart", "Cycle Start")}
              value={result.cycleStartDate ?? "-"}
            />
            <SummaryRow
              label={t("requisitionGenerate.cols.cycleEnd", "Cycle End")}
              value={result.cycleEndDate ?? "-"}
            />
            <SummaryRow
              label={t("requisitionGenerate.cols.runDate", "Run Date")}
              value={result.runDate ?? "-"}
            />
            <SummaryRow
              label={t(
                "requisitionGenerate.cols.taggedCount",
                "Tagged Project Stock",
              )}
              value={result.taggedProjectStockCount ?? "-"}
            />
            <SummaryRow
              label={t(
                "requisitionGenerate.cols.createdCount",
                "Orders Created",
              )}
              value={result.createdCount ?? "-"}
            />
            <SummaryRow
              label={t(
                "requisitionGenerate.cols.updatedCount",
                "Orders Updated",
              )}
              value={result.updatedCount ?? "-"}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default RequisitionGenerate;
