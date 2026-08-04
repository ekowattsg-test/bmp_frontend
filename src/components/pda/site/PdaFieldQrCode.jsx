import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { QRCodeSVG } from "qrcode.react";
import { request } from "../../../helpers/axios_helper";
import { signEntity } from "../../../helpers/qr_token_helper";
import { resolveNearbyProjectCode } from "../common/nearby_project_helper";

export default function PdaFieldQrCode() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [nearbyProjectCode, setNearbyProjectCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg("");

    request("GET", "/api/projects")
      .then(async (res) => {
        if (cancelled) return;
        const list = (Array.isArray(res?.data) ? res.data : []).filter(
          (project) => String(project?.status || "").trim() === "ACTIVE",
        );
        setProjects(list);
        if (list.length > 0) {
          const nearbyProjectCode = await resolveNearbyProjectCode(list);
          setNearbyProjectCode(String(nearbyProjectCode || "").trim());
          const defaultProjectCode =
            nearbyProjectCode || String(list[0]?.projectCode || "").trim();
          setSelectedProjectCode(defaultProjectCode);
        } else {
          setSelectedProjectCode("");
          setNearbyProjectCode("");
          setQrToken("");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setSelectedProjectCode("");
        setNearbyProjectCode("");
        setQrToken("");
        setErrorMsg(
          t("pda.fieldQrCode.loadProjectsFailed", "Failed to load projects."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const generateQr = async (projectCode) => {
    const normalizedCode = String(projectCode || "").trim();
    if (!normalizedCode) {
      setQrToken("");
      return;
    }
    try {
      // Time-limited token is default behavior (noTimeScope=false).
      const token = await signEntity(normalizedCode);
      setQrToken(token);
      setErrorMsg("");
    } catch {
      setQrToken("");
      setErrorMsg(
        t(
          "pda.fieldQrCode.generateFailed",
          "Failed to generate project QR code.",
        ),
      );
    }
  };

  useEffect(() => {
    generateQr(selectedProjectCode);
  }, [selectedProjectCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedProjectCode) return;
    const timerId = setInterval(() => {
      generateQr(selectedProjectCode);
    }, 60 * 1000);

    return () => clearInterval(timerId);
  }, [selectedProjectCode]);

  const projectLabel = useMemo(() => {
    const project = projects.find(
      (item) => String(item?.projectCode || "").trim() === selectedProjectCode,
    );
    return project?.projectName || selectedProjectCode;
  }, [projects, selectedProjectCode]);

  const renderProjectLabel = (projectCode, includeCode = true) => {
    const normalizedCode = String(projectCode || "").trim();
    const project = projects.find(
      (item) => String(item?.projectCode || "").trim() === normalizedCode,
    );
    const name = String(project?.projectName || "").trim() || normalizedCode;
    const isGpsMatched =
      normalizedCode === String(nearbyProjectCode || "").trim();

    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <Box component="span">{name}</Box>
        {isGpsMatched ? (
          <GpsFixedIcon
            sx={{ fontSize: "0.9rem", color: "info.main" }}
            titleAccess={t("pda.fieldQrCode.gpsDetected", "GPS detected")}
          />
        ) : null}
        {includeCode && name !== normalizedCode ? (
          <Box component="span">({normalizedCode})</Box>
        ) : null}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        {t("pda.fieldQrCode.title", "Field QR Code")}
      </Typography>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      ) : null}

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>
          {t("pda.fieldQrCode.projectCode", "Project Code")}
        </InputLabel>
        <Select
          value={selectedProjectCode}
          label={t("pda.fieldQrCode.projectCode", "Project Code")}
          renderValue={(value) => renderProjectLabel(value, true)}
          onChange={(e) => setSelectedProjectCode(String(e.target.value || ""))}
        >
          {projects.map((project) => {
            const code = String(project?.projectCode || "").trim();
            return (
              <MenuItem key={code} value={code}>
                {renderProjectLabel(code, true)}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {!selectedProjectCode ? (
        <Alert severity="info">
          {t("pda.fieldQrCode.noProject", "No project code available.")}
        </Alert>
      ) : (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <QrCode2Icon sx={{ fontSize: 28, color: "primary.main" }} />
          <Typography variant="subtitle2" fontWeight={700} textAlign="center">
            {projectLabel}
          </Typography>
          {qrToken ? (
            <QRCodeSVG value={qrToken} size={220} level="M" includeMargin />
          ) : null}
        </Box>
      )}
    </Box>
  );
}
