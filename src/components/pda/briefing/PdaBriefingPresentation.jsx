import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ImageIcon from "@mui/icons-material/Image";
import { request } from "../../../helpers/axios_helper";
import { ThumbnailImg } from "../../../helpers/file_helper";
import { getPdaStaffId } from "../common/pda_user_helper";
import {
  fetchBriefingContentBySeq,
  fetchBriefingMemberBySessionStaff,
  fetchBriefingMembersBySession,
  fetchSessionById,
  formatCurrentTime,
  getBriefingMemberSeq,
  getSessionId,
  updateBriefingMember,
  updateSession,
} from "./briefingFlowHelpers";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const safeParseJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeLangCode = (value) =>
  safeString(value).toLowerCase().split("-")[0];

const parseImageMeta = (imageKey) => {
  const parsed = safeParseJson(imageKey, null);
  if (!parsed || typeof parsed !== "object") return null;

  const fileId = safeString(parsed?.id);
  const viewUrl = safeString(
    parsed?.viewUrl ||
      parsed?.url ||
      parsed?.webViewLink ||
      parsed?.webContentLink,
  );
  const provider = safeString(parsed?.provider) || null;

  if (!fileId && !viewUrl) return null;
  return { fileId, viewUrl, provider };
};

const toSeq = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 1 ? Math.trunc(num) : fallback;
};

export default function PdaBriefingPresentation({ role = "worker" }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: sessionIdParam } = useParams();
  const listenerSyncTimerRef = useRef(null);
  const completionTimerRef = useRef(null);

  const sessionId = useMemo(
    () => String(location.state?.sessionId || sessionIdParam || "").trim(),
    [location.state?.sessionId, sessionIdParam],
  );
  const staffId = useMemo(() => safeString(getPdaStaffId()), []);

  const [session, setSession] = useState(null);
  const [currentContent, setCurrentContent] = useState(null);
  const [hasNextCard, setHasNextCard] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [outOfSyncListeners, setOutOfSyncListeners] = useState([]);
  const [listenerCompletionRows, setListenerCompletionRows] = useState([]);
  const [workerMember, setWorkerMember] = useState(null);

  const resolveStaffDisplayName = useCallback(async (member) => {
    const embeddedName = safeString(
      member?.staffName ||
        member?.staff?.staffName ||
        [member?.staff?.firstName, member?.staff?.lastName]
          .filter(Boolean)
          .join(" "),
    );
    if (embeddedName) return embeddedName;

    const memberStaffId = safeString(
      member?.staffId ?? member?.staffID ?? member?.briefingMemberStaffId,
    );
    if (!memberStaffId) return "";

    try {
      const response = await request(
        "GET",
        `/api/staffs/${encodeURIComponent(memberStaffId)}`,
      );
      const staff = response?.data || null;
      return safeString(staff?.staffName);
    } catch {
      return "";
    }
  }, []);

  const load = useCallback(async () => {
    if (!sessionId) {
      setSessionLoading(false);
      setContentLoading(false);
      return;
    }

    setErrorMsg("");
    setSessionLoading(true);

    try {
      const row = await fetchSessionById(sessionId);
      setSession(row);
    } catch {
      setErrorMsg(t("pda.briefing.presentationLoadFailed"));
    } finally {
      setSessionLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCurrentCard = useCallback(async () => {
    const briefingId = session?.briefingId;
    const currentSeq = toSeq(session?.currentSeq, 1);
    const isSessionFinalizeMode = Number(session?.currentSeq) === -1;

    if (isSessionFinalizeMode) {
      setCurrentContent(null);
      setHasNextCard(false);
      setContentLoading(false);
      return;
    }

    if (!briefingId) {
      setCurrentContent(null);
      setHasNextCard(false);
      setContentLoading(false);
      return;
    }

    setContentLoading(true);

    try {
      const [currentCard, nextCard] = await Promise.all([
        fetchBriefingContentBySeq(briefingId, currentSeq),
        role === "presenter"
          ? fetchBriefingContentBySeq(briefingId, currentSeq + 1)
          : Promise.resolve(null),
      ]);
      setCurrentContent(currentCard);
      setHasNextCard(Boolean(nextCard));
    } catch {
      setErrorMsg(t("pda.briefing.presentationLoadFailed"));
      setCurrentContent(null);
      setHasNextCard(false);
    } finally {
      setContentLoading(false);
    }
  }, [role, session?.briefingId, session?.currentSeq, t]);

  useEffect(() => {
    loadCurrentCard();
  }, [loadCurrentCard]);

  useEffect(() => {
    if (
      role !== "worker" ||
      !sessionId ||
      !session ||
      !currentContent ||
      !staffId
    ) {
      return undefined;
    }

    let active = true;

    const syncWorkerSeq = async () => {
      try {
        const member = await fetchBriefingMemberBySessionStaff({
          briefingSessionId: sessionId,
          staffId,
        });
        if (!active || !member) return;

        const memberSeq = getBriefingMemberSeq(member);
        const nextSeq = toSeq(session?.currentSeq, 1);
        if (memberSeq === nextSeq) return;

        await updateBriefingMember({
          ...member,
          currentSeq: nextSeq,
        });
      } catch {
        // Ignore worker sync failures; presentation should continue.
      }
    };

    syncWorkerSeq();

    return () => {
      active = false;
    };
  }, [currentContent, role, session, sessionId, staffId]);

  useEffect(() => {
    if (role !== "worker" || !sessionId || !staffId) {
      setWorkerMember(null);
      return undefined;
    }

    let active = true;

    const loadWorkerMember = async () => {
      try {
        const member = await fetchBriefingMemberBySessionStaff({
          briefingSessionId: sessionId,
          staffId,
        });
        if (!active) return;
        setWorkerMember(member || null);
      } catch {
        if (!active) return;
        setWorkerMember(null);
      }
    };

    loadWorkerMember();

    return () => {
      active = false;
    };
  }, [role, sessionId, staffId, session?.currentSeq]);

  useEffect(() => {
    if (listenerSyncTimerRef.current) {
      clearInterval(listenerSyncTimerRef.current);
      listenerSyncTimerRef.current = null;
    }

    const isPresenterFinalizeMode =
      role === "presenter" && Number(session?.currentSeq) === -1;

    if (
      role !== "presenter" ||
      !sessionId ||
      !session ||
      !currentContent ||
      isPresenterFinalizeMode
    ) {
      setOutOfSyncListeners([]);
      return undefined;
    }

    setOutOfSyncListeners([]);
    listenerSyncTimerRef.current = setInterval(async () => {
      try {
        const members = await fetchBriefingMembersBySession(sessionId);
        const activeMembers = members.filter(
          (member) => safeString(member?.leaveTime) === "",
        );
        const sessionSeq = toSeq(session?.currentSeq, 1);
        const mismatchedMembers = activeMembers.filter(
          (member) => getBriefingMemberSeq(member) !== sessionSeq,
        );
        const names = await Promise.all(
          mismatchedMembers.map((member) => resolveStaffDisplayName(member)),
        );
        setOutOfSyncListeners(names.filter(Boolean));
      } catch {
        setOutOfSyncListeners([]);
      }
    }, 2000);

    return () => {
      if (listenerSyncTimerRef.current) {
        clearInterval(listenerSyncTimerRef.current);
        listenerSyncTimerRef.current = null;
      }
    };
  }, [currentContent, resolveStaffDisplayName, role, session, sessionId]);

  useEffect(() => {
    if (completionTimerRef.current) {
      clearInterval(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    const isPresenterFinalizeMode =
      role === "presenter" && Number(session?.currentSeq) === -1;
    if (!isPresenterFinalizeMode || !sessionId) {
      setListenerCompletionRows([]);
      return undefined;
    }

    const pollCompletion = async () => {
      try {
        const members = await fetchBriefingMembersBySession(sessionId);
        const rows = await Promise.all(
          members.map(async (member) => ({
            name: await resolveStaffDisplayName(member),
            completed: Number(member?.completed) === 1,
          })),
        );
        setListenerCompletionRows(rows.filter((row) => row.name !== ""));
      } catch {
        setListenerCompletionRows([]);
      }
    };

    pollCompletion();
    completionTimerRef.current = setInterval(pollCompletion, 2000);

    return () => {
      if (completionTimerRef.current) {
        clearInterval(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [resolveStaffDisplayName, role, session?.currentSeq, sessionId]);

  const pollWorkerSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const row = await fetchSessionById(sessionId);
      setSession(row);
    } catch {
      setErrorMsg(t("pda.briefing.presentationLoadFailed"));
    }
  }, [sessionId, t]);

  useEffect(() => {
    if (role !== "worker") return undefined;
    const timer = setInterval(pollWorkerSession, 2500);
    return () => clearInterval(timer);
  }, [pollWorkerSession, role]);

  const currentSeq = toSeq(session?.currentSeq, 1);
  const isPresenterFinalizeMode =
    role === "presenter" && Number(session?.currentSeq) === -1;
  const isWorkerEndMode =
    role === "worker" && Number(session?.currentSeq) === -1;
  const current = currentContent;
  const targetLang = normalizeLangCode(
    i18n.resolvedLanguage || i18n.language || "en",
  );

  const translatedEntry = useMemo(() => {
    const translatedText = safeParseJson(current?.translatedText, {});
    if (!translatedText || typeof translatedText !== "object") return null;
    const localized = translatedText[targetLang];
    return localized && typeof localized === "object" ? localized : null;
  }, [current?.translatedText, targetLang]);

  const localizedTitle = safeString(translatedEntry?.title);
  const localizedContent = safeString(translatedEntry?.content);
  const hasLocalizedText = localizedTitle !== "" || localizedContent !== "";
  const media = parseImageMeta(current?.imageKey);

  const canGoPrev = role === "presenter" && currentSeq > 1;
  const canGoNext = role === "presenter" && hasNextCard;
  const showFinishBriefing =
    role === "presenter" && !hasNextCard && !isPresenterFinalizeMode;
  const canEndBriefing =
    role === "presenter" &&
    isPresenterFinalizeMode &&
    listenerCompletionRows.every((row) => row.completed);
  const workerAlreadyCompleted = Number(workerMember?.completed) === 1;

  const moveSeq = async (direction) => {
    if (!session || role !== "presenter") return;

    const nextSeq = currentSeq + direction;
    if (nextSeq < 1) return;
    if (direction > 0 && !hasNextCard) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const updated = {
        ...session,
        currentSeq: nextSeq,
      };
      const persisted = await updateSession(updated);
      setSession(persisted || updated);
    } catch {
      setErrorMsg(t("pda.briefing.sequenceUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const finishPresentation = async () => {
    if (!session || role !== "presenter") return;

    setSaving(true);
    setErrorMsg("");

    try {
      const updated = {
        ...session,
        currentSeq: -1,
      };
      const persisted = await updateSession(updated);
      setSession(persisted || updated);
    } catch {
      setErrorMsg(t("pda.briefing.finishFailed"));
    } finally {
      setSaving(false);
    }
  };

  const endBriefingSession = async () => {
    if (!session || role !== "presenter") return;

    setSaving(true);
    setErrorMsg("");
    try {
      const updated = {
        ...session,
        endTime: safeString(session.endTime) || formatCurrentTime(),
      };
      const persisted = await updateSession(updated);
      setSession(persisted || updated);
      navigate("/pda/briefing", {
        state: { title: t("pda.nav.briefing") },
        replace: true,
      });
    } catch {
      setErrorMsg(t("pda.briefing.finishFailed"));
    } finally {
      setSaving(false);
    }
  };

  const completeWorkerSession = async () => {
    if (role !== "worker" || !sessionId || !staffId) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const currentMember =
        workerMember ||
        (await fetchBriefingMemberBySessionStaff({
          briefingSessionId: sessionId,
          staffId,
        }));

      if (!currentMember) {
        throw new Error("Missing briefing member");
      }

      const updated = {
        ...currentMember,
        completed: 1,
      };
      const persisted = await updateBriefingMember(updated);
      setWorkerMember(persisted || updated);
    } catch {
      setErrorMsg(t("pda.briefing.completeListenerFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || contentLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sessionId || !session) {
    return <Alert severity="error">{t("pda.briefing.sessionMissing")}</Alert>;
  }

  if (!safeString(session?.startTime)) {
    return (
      <Alert severity="warning">
        {role === "presenter"
          ? t("pda.briefing.presenterNeedsStart")
          : t("pda.briefing.waitingStart")}
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            {t("pda.briefing.projectCodeLabel")}: {session.projectCode}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            {t("pda.briefing.targetLanguageLabel")}: {targetLang}
          </Typography>

          {isPresenterFinalizeMode ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              {t("pda.briefing.awaitingListenerCompletion")}
            </Alert>
          ) : isWorkerEndMode ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Alert severity="success">
                {t("pda.briefing.briefingEndedTitle")}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {t("pda.briefing.briefingEndedDesc")}
              </Typography>
              {workerAlreadyCompleted ? (
                <Alert severity="info">
                  {t("pda.briefing.listenerCompleted")}
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={completeWorkerSession}
                  disabled={saving}
                >
                  {t("pda.briefing.completeListenerSession")}
                </Button>
              )}
            </Stack>
          ) : (
            <>
              <Box
                sx={{
                  mt: 1,
                  borderRadius: 1,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.default",
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {media?.fileId ? (
                  <ThumbnailImg
                    fileId={media.fileId}
                    viewUrl={media.viewUrl}
                    provider={media.provider}
                    width={1200}
                    height={900}
                    alt={localizedTitle || t("pda.briefing.noSlideTitle")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : media?.viewUrl ? (
                  <img
                    src={media.viewUrl}
                    alt={localizedTitle || t("pda.briefing.noSlideTitle")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ImageIcon sx={{ fontSize: 44, color: "text.disabled" }} />
                )}
              </Box>

              {!hasLocalizedText ? (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {t("pda.briefing.translationMissingForTarget")}
                </Alert>
              ) : null}

              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {localizedTitle || t("pda.briefing.noSlideTitle")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, whiteSpace: "pre-wrap", color: "text.secondary" }}
              >
                {localizedContent || t("pda.briefing.noSlideContent")}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1.5, display: "block" }}
              >
                {t("pda.briefing.currentSeq")}: {currentSeq}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {errorMsg && <Alert severity="warning">{errorMsg}</Alert>}

      {role === "presenter" && !isPresenterFinalizeMode ? (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => moveSeq(-1)}
            disabled={!canGoPrev || saving}
            fullWidth
          >
            {t("pda.briefing.prev")}
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => moveSeq(1)}
            disabled={!canGoNext || saving}
            fullWidth
          >
            {t("pda.briefing.next")}
          </Button>
        </Stack>
      ) : null}

      {showFinishBriefing ? (
        <Button
          color="error"
          variant="outlined"
          onClick={finishPresentation}
          disabled={saving}
        >
          {t("pda.briefing.finish")}
        </Button>
      ) : canEndBriefing ? (
        <Button
          color="success"
          variant="contained"
          onClick={endBriefingSession}
          disabled={saving}
        >
          {t("pda.briefing.endBriefing")}
        </Button>
      ) : role === "worker" ? null : null}

      {isPresenterFinalizeMode ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("pda.briefing.listenerCompletionStatus")}
            </Typography>
            {listenerCompletionRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("pda.briefing.noListenerYet")}
              </Typography>
            ) : (
              <Stack spacing={0.75}>
                {listenerCompletionRows.map((row, idx) => (
                  <Box
                    key={`${row.name}-${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: row.completed ? "text.primary" : "error.main",
                      }}
                    >
                      {row.name}
                    </Typography>
                    {row.completed ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : null}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : null}

      {role === "presenter" && outOfSyncListeners.length > 0 ? (
        <Card variant="outlined" sx={{ borderColor: "error.main" }}>
          <CardContent>
            <Typography
              variant="body2"
              sx={{ color: "error.main", fontWeight: 700 }}
            >
              {t("pda.briefing.listenersOutOfSync")}
            </Typography>
            <Typography variant="body2" sx={{ color: "error.main", mt: 0.5 }}>
              {outOfSyncListeners.join(", ")}
            </Typography>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
