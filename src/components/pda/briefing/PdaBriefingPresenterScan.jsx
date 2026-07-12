import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { request } from "../../../helpers/axios_helper";
import { decodeToken } from "../../../helpers/qr_token_helper";
import PdaScanInput from "../common/PdaScanInput";
import {
  fetchSessionById,
  formatCurrentTime,
  fetchBriefingMembersBySession,
  getSessionId,
  updateSession,
} from "./briefingFlowHelpers";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const resolveStaffDisplayName = async (staffId) => {
  const normalizedStaffId = safeString(staffId);
  if (!normalizedStaffId) return "";

  try {
    const response = await request(
      "GET",
      `/api/staffs/${encodeURIComponent(normalizedStaffId)}`,
    );
    const staff = response?.data || null;
    return (
      safeString(staff?.staffName) ||
      [staff?.firstName, staff?.lastName].filter(Boolean).join(" ").trim()
    );
  } catch {
    return "";
  }
};

export default function PdaBriefingPresenterScan() {
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
  const [saving, setSaving] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState("");
  const [participants, setParticipants] = useState([]);

  const loadParticipants = useCallback(async () => {
    if (!sessionId) {
      setParticipants([]);
      return;
    }

    const members = await fetchBriefingMembersBySession(sessionId);
    const resolved = await Promise.all(
      members.map(async (member) => {
        const staffId = safeString(
          member?.staffId ?? member?.staffID ?? member?.briefingMemberStaffId,
        );
        return {
          staffId,
          staffName: await resolveStaffDisplayName(staffId),
        };
      }),
    );

    const unique = [];
    const seen = new Set();
    for (const item of resolved) {
      if (!item.staffId || seen.has(item.staffId)) continue;
      seen.add(item.staffId);
      unique.push(item);
    }
    setParticipants(unique);
  }, [sessionId]);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const row = await fetchSessionById(sessionId);
      setSession(row);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadParticipants().catch(() => setParticipants([]));
  }, [loadParticipants]);

  useEffect(() => {
    if (safeString(session?.startTime)) {
      navigate(`/pda/briefing/${getSessionId(session)}/presenter`, {
        state: {
          title: t("pda.nav.briefing"),
          role: "presenter",
          sessionId: getSessionId(session),
        },
        replace: true,
      });
    }
  }, [navigate, session, t]);

  const handleJoinScan = async () => {
    const rawToken = safeString(scanValue);
    if (!rawToken) return;

    setScanError("");
    setSaving(true);

    try {
      const decodedStaff = safeString(await decodeToken(rawToken));
      if (!decodedStaff) {
        throw new Error(t("pda.briefing.invalidListenerQr"));
      }

      const displayName = await resolveStaffDisplayName(decodedStaff);

      await request("POST", "/api/briefingmembers", {
        briefingSessionId: Number(sessionId),
        staffId: decodedStaff,
        joinTime: formatCurrentTime(),
      });
      await loadParticipants();
      setScanValue("");
    } catch (error) {
      setScanError(error?.message || t("pda.briefing.scanFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleStartPresentation = async () => {
    if (!session) return;

    setSaving(true);
    setScanError("");
    try {
      const updated = {
        ...session,
        startTime: formatCurrentTime(),
        currentSeq: Number(session.currentSeq || 1),
      };
      const persisted = await updateSession(updated);
      const latest = persisted || updated;
      navigate(`/pda/briefing/${getSessionId(latest)}/presenter`, {
        state: {
          title: t("pda.nav.briefing"),
          role: "presenter",
          sessionId: getSessionId(latest),
        },
        replace: true,
      });
    } catch {
      setScanError(t("pda.briefing.startFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sessionId || !session) {
    return <Alert severity="error">{t("pda.briefing.sessionMissing")}</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      <Alert severity="info">{t("pda.briefing.presenterScanHint")}</Alert>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            {t("pda.briefing.projectCodeLabel")}: {session.projectCode}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("pda.briefing.sessionIdLabel")}: {getSessionId(session)}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.25}>
            <PdaScanInput
              placeholder={t("pda.briefing.scanPlaceholder")}
              value={scanValue}
              onChange={setScanValue}
              onSubmit={handleJoinScan}
              disabled={saving}
              scanning={saving}
              error={Boolean(scanError)}
              helperText={scanError || " "}
              showActionButton
              cameraContainerId="pda-briefing-listener-scan"
            />
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartPresentation}
              disabled={saving}
            >
              {t("pda.briefing.startPresentation")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <QrCodeScannerIcon color="action" />
            <Typography variant="subtitle2" fontWeight={700}>
              {t("pda.briefing.scannedListeners")}
            </Typography>
          </Box>
          {participants.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("pda.briefing.noListenerYet")}
            </Typography>
          ) : (
            participants.map((staff) => (
              <Typography key={staff.staffId} variant="body2">
                {staff.staffName || staff.staffId}
              </Typography>
            ))
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
