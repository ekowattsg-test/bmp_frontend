import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { request } from "../../helpers/axios_helper";
import { setTvAuthState, clearTvAuthState } from "./tvAuthStore";

const TV_AUTOSTART_KEY = "tv_display_autostart";

const normalizeServerTimestamp = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // If backend omits timezone, treat it as UTC instead of browser local time.
  if (/z$/i.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    return raw;
  }

  return `${raw.replace(" ", "T")}Z`;
};

const toMillis = (value) => {
  if (!value) return 0;
  const ms = new Date(normalizeServerTimestamp(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const resolveServerOffsetMs = (headers) => {
  const serverDateHeader = headers?.date || headers?.Date;
  if (!serverDateHeader) return 0;
  const serverNowMs = new Date(serverDateHeader).getTime();
  if (!Number.isFinite(serverNowMs)) return 0;
  return serverNowMs - Date.now();
};

const secondsLeft = (expiresAt, serverOffsetMs = 0) => {
  const ms = toMillis(expiresAt) - (Date.now() + serverOffsetMs);
  return Math.max(0, Math.ceil(ms / 1000));
};

export default function TvBootstrap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef(null);
  const exchangingRef = useRef(false);
  const serverOffsetRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TV_AUTOSTART_KEY, "1");
  }, []);

  const resetPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const createSession = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    setPolling(false);
    resetPolling();
    exchangingRef.current = false;
    clearTvAuthState();

    try {
      const res = await request(
        "POST",
        "/api/tv-auth/session",
        {},
        { skipAuthRedirect: true },
      );
      const payload = res?.data || {};
      serverOffsetRef.current = resolveServerOffsetMs(res?.headers);
      setSessionInfo(payload);
      setCountdown(
        secondsLeft(payload.challengeExpiresAt, serverOffsetRef.current),
      );
      setPolling(true);
    } catch {
      setSessionInfo(null);
      setErrorMsg(
        t("tv.bootstrap.createFailed", "Failed to start TV session."),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const exchangeSession = useCallback(
    async (exchangeCode) => {
      if (!exchangeCode || exchangingRef.current) return;
      exchangingRef.current = true;
      try {
        const res = await request(
          "POST",
          "/api/tv-auth/exchange",
          { exchangeCode },
          { skipAuthRedirect: true },
        );
        const payload = res?.data || {};
        const token = String(payload?.token || "").trim();
        if (!token) {
          throw new Error("Token missing");
        }

        setTvAuthState({
          token,
          sessionExpiresAt: String(payload?.sessionExpiresAt || ""),
          refreshIntervalSeconds: Number(payload?.refreshIntervalSeconds || 30),
          projectCodes: Array.isArray(payload?.projectCodes)
            ? payload.projectCodes
            : [],
        });

        const destinationUrl =
          String(payload?.destinationUrl || "").trim() || "/tv/projects";
        navigate(destinationUrl, {
          replace: true,
          state: {
            projectCodes: Array.isArray(payload?.projectCodes)
              ? payload.projectCodes
              : [],
            refreshIntervalSeconds: Number(
              payload?.refreshIntervalSeconds || 30,
            ),
            sessionExpiresAt: String(payload?.sessionExpiresAt || ""),
          },
        });
      } catch {
        exchangingRef.current = false;
        setErrorMsg(
          t("tv.bootstrap.exchangeFailed", "Failed to exchange TV session."),
        );
      }
    },
    [navigate, t],
  );

  const pollStatus = useCallback(async () => {
    if (!sessionInfo?.sessionCode || exchangingRef.current) return;

    try {
      const res = await request(
        "GET",
        `/api/tv-auth/session/${encodeURIComponent(sessionInfo.sessionCode)}/status`,
        null,
        { skipAuthRedirect: true },
      );
      const payload = res?.data || {};
      serverOffsetRef.current = resolveServerOffsetMs(res?.headers);
      const status = String(payload?.status || "")
        .trim()
        .toUpperCase();

      if (payload?.challengeExpiresAt) {
        setCountdown(
          secondsLeft(payload.challengeExpiresAt, serverOffsetRef.current),
        );
      }

      if (status === "APPROVED" && payload?.exchangeCode) {
        resetPolling();
        setPolling(false);
        exchangeSession(payload.exchangeCode);
        return;
      }

      if (status === "EXPIRED") {
        resetPolling();
        setPolling(false);
        createSession();
      }
    } catch {
      // keep polling; transient issues can recover
    }
  }, [createSession, exchangeSession, sessionInfo]);

  useEffect(() => {
    createSession();
    return () => resetPolling();
  }, [createSession]);

  useEffect(() => {
    if (!polling || !sessionInfo?.sessionCode) return;
    const intervalSec = Math.max(
      1,
      Number(sessionInfo.pollIntervalSeconds || 3),
    );
    pollTimerRef.current = setInterval(pollStatus, intervalSec * 1000);
    return () => resetPolling();
  }, [pollStatus, polling, sessionInfo]);

  useEffect(() => {
    if (!sessionInfo?.challengeExpiresAt) return;
    const id = setInterval(() => {
      setCountdown(
        secondsLeft(sessionInfo.challengeExpiresAt, serverOffsetRef.current),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [sessionInfo?.challengeExpiresAt]);

  const isExpired = useMemo(() => countdown <= 0, [countdown]);
  const qrCodeValue = String(sessionInfo?.sessionCode || "").trim();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3, md: 4 },
        backgroundColor: "background.default",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 980,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: "background.paper",
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Typography
          variant="h3"
          fontWeight={800}
          textAlign="center"
          sx={{ mb: 1 }}
        >
          {t("tv.bootstrap.title", "TV Sign In")}
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 3 }}
        >
          {t(
            "tv.bootstrap.subtitle",
            "Scan this QR code with mobile app and approve with PIN",
          )}
        </Typography>

        {errorMsg ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={48} />
          </Box>
        ) : !sessionInfo ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <Button variant="contained" size="large" onClick={createSession}>
              {t("tv.bootstrap.retry", "Retry")}
            </Button>
          </Stack>
        ) : (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            alignItems="center"
            justifyContent="center"
          >
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                bgcolor: "background.paper",
              }}
            >
              <QRCodeSVG
                value={qrCodeValue}
                size={320}
                includeMargin
                level="M"
              />
            </Box>

            <Stack spacing={2} alignItems={{ xs: "center", md: "flex-start" }}>
              <Typography variant="h6" color="text.secondary">
                {t("tv.bootstrap.enterPin", "Enter this PIN in app")}
              </Typography>
              <Typography
                variant="h1"
                fontWeight={900}
                sx={{ letterSpacing: "0.2em", lineHeight: 1 }}
              >
                {sessionInfo.pin || "----"}
              </Typography>
              <Typography
                variant="h6"
                color={isExpired ? "error.main" : "text.secondary"}
              >
                {t("tv.bootstrap.expiresIn", { seconds: countdown })}
              </Typography>
              {isExpired ? (
                <Button
                  variant="contained"
                  color="warning"
                  size="large"
                  onClick={createSession}
                >
                  {t("tv.bootstrap.restart", "Restart Session")}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
