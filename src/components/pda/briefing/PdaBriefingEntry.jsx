import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { getPdaStaffId } from "../common/pda_user_helper";
import {
  createBriefingSession,
  fetchProjectOptions,
  findTodayProjectSession,
  formatTodayYmd,
  getSessionId,
  isLeadershipMember,
} from "./briefingFlowHelpers";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const roleForSession = (session, staffId) => {
  const presenter = safeString(session?.presenter);
  return presenter && presenter === safeString(staffId)
    ? "presenter"
    : "worker";
};

export default function PdaBriefingEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const staffId = useMemo(() => safeString(getPdaStaffId()), []);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingCode, setSubmittingCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await fetchProjectOptions();
      setProjects(result);
    } catch (error) {
      setProjects([]);
      setErrorMsg(
        error?.response?.data?.message || t("pda.briefing.loadProjectFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const routeBySessionState = ({ session, role }) => {
    const sessionId = getSessionId(session);
    const payloadState = {
      title: t("pda.nav.briefing"),
      sessionId,
      projectCode: session?.projectCode,
      role,
    };

    if (!safeString(session?.startTime)) {
      if (role === "presenter") {
        navigate(`/pda/briefing/${sessionId}/scan`, { state: payloadState });
        return;
      }

      navigate(`/pda/briefing/${sessionId}/listener`, {
        state: {
          ...payloadState,
        },
      });
      return;
    }

    navigate(`/pda/briefing/${sessionId}/${role}`, { state: payloadState });
  };

  const handleSelectProject = async (projectCode) => {
    const normalizedProjectCode = safeString(projectCode);
    if (!normalizedProjectCode || submittingCode) return;
    if (!staffId) {
      setErrorMsg(t("pda.briefing.staffMissing"));
      return;
    }

    setSubmittingCode(normalizedProjectCode);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const today = formatTodayYmd();
      const existingSession = await findTodayProjectSession(
        normalizedProjectCode,
        today,
      );

      if (existingSession) {
        const role = roleForSession(existingSession, staffId);
        routeBySessionState({
          session: existingSession,
          role,
        });
        return;
      }

      const canLead = await isLeadershipMember(normalizedProjectCode, staffId);
      if (!canLead) {
        setInfoMsg(t("pda.briefing.waitForPresenter"));
        return;
      }

      const selectedProject = projects.find(
        (project) =>
          safeString(project?.projectCode) ===
          safeString(normalizedProjectCode),
      );
      const briefingId = safeString(selectedProject?.briefingId);
      if (!briefingId) {
        setErrorMsg(t("pda.briefing.noBriefingTemplate"));
        return;
      }

      const createdSession = await createBriefingSession({
        projectCode: normalizedProjectCode,
        briefingDate: today,
        briefingId,
        presenter: staffId,
      });

      routeBySessionState({ session: createdSession, role: "presenter" });
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          error?.message ||
          t("pda.briefing.resolveFailed"),
      );
    } finally {
      setSubmittingCode("");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {t("pda.briefing.selectProjectHint")}
      </Typography>

      {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
      {infoMsg && <Alert severity="info">{infoMsg}</Alert>}

      {projects.length === 0 ? (
        <Alert severity="warning">{t("pda.briefing.noProject")}</Alert>
      ) : (
        projects.map((project) => {
          const busy = submittingCode === project.projectCode;
          return (
            <Card key={project.projectCode} variant="outlined">
              <CardActionArea
                onClick={() => handleSelectProject(project.projectCode)}
                disabled={Boolean(submittingCode)}
              >
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                  >
                    <CampaignIcon sx={{ color: "primary.main" }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {project.projectCode}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {project.projectName || t("pda.briefing.noProjectName")}
                        {project.status ? ` • ${project.status}` : ""}
                      </Typography>
                    </Box>

                    {busy ? (
                      <CircularProgress size={18} />
                    ) : (
                      <ChevronRightIcon
                        sx={{ color: "text.disabled", fontSize: 20 }}
                      />
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })
      )}

      <Button
        variant="outlined"
        onClick={loadProjects}
        disabled={Boolean(submittingCode)}
      >
        {t("pda.briefing.reloadProjects")}
      </Button>
    </Stack>
  );
}
