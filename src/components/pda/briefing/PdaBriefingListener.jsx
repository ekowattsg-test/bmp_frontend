import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import HearingIcon from "@mui/icons-material/Hearing";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { QRCodeSVG } from "qrcode.react";
import { signEntity } from "../../../helpers/qr_token_helper";
import { getPdaDisplayName, getPdaStaffId } from "../common/pda_user_helper";
import {
  fetchSessionById,
  getSessionId,
  hasWorkerJoinedSession,
} from "./briefingFlowHelpers";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const getErrorStatus = (error) =>
  Number(error?.response?.status ?? error?.status ?? 0);

export default function PdaBriefingListener() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: sessionIdParam } = useParams();

  const sessionId = useMemo(
    () => String(location.state?.sessionId || sessionIdParam || "").trim(),
    [location.state?.sessionId, sessionIdParam],
  );

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [joinedByPresenter, setJoinedByPresenter] = useState(false);
  const [staffQr, setStaffQr] = useState("");
  const [staffQrError, setStaffQrError] = useState("");
  const staffId = useMemo(() => safeString(getPdaStaffId()), []);
  const staffName = useMemo(() => safeString(getPdaDisplayName()), []);

  useEffect(() => {
    let mounted = true;

    const buildQr = async () => {
      if (!staffId) {
        setStaffQrError(t("pda.briefing.staffMissing"));
        return;
      }

      try {
        const token = await signEntity(staffId);
        if (!mounted) return;
        setStaffQr(token || staffId);
        setStaffQrError("");
      } catch {
        if (!mounted) return;
        setStaffQrError(t("pda.briefing.staffQrFailed"));
      }
    };

    buildQr();

    return () => {
      mounted = false;
    };
  }, [staffId, t]);

  useEffect(() => {
    if (!sessionId || joinedByPresenter) return undefined;

    let mounted = true;
    let timer = null;

    const pollRegistration = async () => {
      try {
        const joined = await hasWorkerJoinedSession({
          briefingSessionId: sessionId,
          staffId,
        });
        if (!mounted) return;
        setJoinedByPresenter(joined);
        setErrorMsg("");
      } catch (error) {
        const status = getErrorStatus(error);
        if (status === 404) {
          if (mounted) {
            // Listener record not created yet; keep waiting without warning.
            setErrorMsg("");
          }
          return;
        }
        if (mounted) {
          setErrorMsg(t("pda.briefing.listenerLoadFailed"));
        }
      } finally {
        if (mounted) {
          setLoading(false);
          timer = setTimeout(pollRegistration, 3000);
        }
      }
    };

    pollRegistration();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [joinedByPresenter, sessionId, staffId, t]);

  useEffect(() => {
    if (!sessionId || !joinedByPresenter) return undefined;

    let mounted = true;
    let timer = null;

    const pollSession = async () => {
      try {
        const row = await fetchSessionById(sessionId);
        if (!mounted) return;
        setSession(row);
        setErrorMsg("");

        if (safeString(row?.startTime)) {
          navigate(`/pda/briefing/${getSessionId(row)}/worker`, {
            state: {
              title: t("pda.nav.briefing"),
              role: "worker",
              sessionId: getSessionId(row),
            },
            replace: true,
          });
          return;
        }
      } catch {
        if (mounted) {
          setErrorMsg(t("pda.briefing.listenerLoadFailed"));
        }
      } finally {
        if (mounted) {
          setLoading(false);
          timer = setTimeout(pollSession, 2500);
        }
      }
    };

    pollSession();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [joinedByPresenter, navigate, sessionId, t]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sessionId) {
    return <Alert severity="error">{t("pda.briefing.sessionMissing")}</Alert>;
  }

  return (
    <Stack spacing={1.5} sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <HearingIcon sx={{ fontSize: 48, color: "primary.main" }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={700} textAlign="center">
        {t("pda.briefing.waitingStart")}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {t("pda.briefing.waitingStartDesc")}
      </Typography>
      <Typography variant="caption" color="text.secondary" textAlign="center">
        {t("pda.briefing.sessionIdLabel")}: {sessionId}
      </Typography>

      {joinedByPresenter ? (
        <Card variant="outlined">
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Alert severity="success" sx={{ width: "100%" }}>
              {t("pda.briefing.joinedConfirmed")}
            </Alert>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {t("pda.briefing.waitingStartDesc")}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {t("pda.me.nameLabel")}: {staffName || "-"}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <QrCode2Icon color="action" />
              <Typography variant="subtitle2" fontWeight={700}>
                {t("pda.briefing.myJoinQr")}
              </Typography>
            </Box>

            {staffQr ? (
              <Box
                sx={{
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  backgroundColor: "background.paper",
                }}
              >
                <QRCodeSVG value={staffQr} size={172} level="M" />
              </Box>
            ) : (
              <CircularProgress size={22} />
            )}

            <Typography variant="caption" color="text.secondary">
              {t("pda.briefing.workerScanByPresenter")}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {t("pda.me.nameLabel")}: {staffName || "-"}
            </Typography>

            {staffQrError && <Alert severity="warning">{staffQrError}</Alert>}
          </CardContent>
        </Card>
      )}

      {errorMsg && <Alert severity="warning">{errorMsg}</Alert>}
    </Stack>
  );
}
