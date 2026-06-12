import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ReplayIcon from "@mui/icons-material/Replay";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import PageHeader from "../common/PageHeader";
import HelpDialog from "../common/HelpDialog";

const ALLOWED_PHRASES = ["pda", "web", "otp"];

const isActiveStaff = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return false;

  const falseValues = new Set([
    "false",
    "0",
    "no",
    "n",
    "inactive",
    "i",
    "disabled",
    "d",
    "off",
    "f",
  ]);
  if (falseValues.has(normalized)) return false;

  const trueValues = new Set([
    "true",
    "1",
    "yes",
    "y",
    "active",
    "a",
    "enabled",
    "on",
    "t",
  ]);
  if (trueValues.has(normalized)) return true;

  return true;
};

const createMessage = (message) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  ...message,
});

const WASimulator = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const scrollEndRef = useRef(null);

  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const userCompanyId = userInfo?.companyId || "";

  const [helpOpen, setHelpOpen] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    createMessage({
      role: "system",
      type: "text",
      text: t("waSimulator.welcome"),
    }),
  ]);

  useEffect(() => {
    setLoadingStaff(true);
    request("GET", "/api/staffs")
      .then((response) => {
        const allStaff = Array.isArray(response.data)
          ? response.data
          : response.data?.items || [];
        const filteredStaff = isUserLevelNine
          ? allStaff
          : allStaff.filter(
              (staff) => String(staff.companyId) === String(userCompanyId),
            );
        const sortedStaff = filteredStaff
          .filter((staff) => isActiveStaff(staff.active))
          .filter((staff) => String(staff.mobileNumber || "").trim())
          .sort((a, b) =>
            String(a.staffName || "").localeCompare(String(b.staffName || "")),
          );
        setStaffList(sortedStaff);
      })
      .catch(() => setStaffList([]))
      .finally(() => setLoadingStaff(false));
  }, [isUserLevelNine, userCompanyId]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedStaff = useMemo(
    () => staffList.find((staff) => String(staff.staffId) === selectedStaffId),
    [staffList, selectedStaffId],
  );

  const appendMessages = (...newMessages) => {
    setMessages((prev) => [...prev, ...newMessages.map(createMessage)]);
  };

  const resetConversation = () => {
    setMessages([
      createMessage({
        role: "system",
        type: "text",
        text: t("waSimulator.welcome"),
      }),
    ]);
    setMessage("");
  };

  const buildLoginUrl = (loginKey) => {
    const url = new URL("/pda/login", window.location.origin);
    url.searchParams.set("loginkey", loginKey);
    return url.toString();
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    const normalizedMessage = trimmedMessage.toLowerCase();

    if (!trimmedMessage || sending) return;

    appendMessages({ role: "user", type: "text", text: trimmedMessage });
    setMessage("");

    if (!selectedStaff) {
      appendMessages({
        role: "system",
        type: "text",
        text: t("waSimulator.noStaffSelected"),
      });
      return;
    }

    if (!ALLOWED_PHRASES.includes(normalizedMessage)) {
      appendMessages({
        role: "system",
        type: "text",
        text: t("waSimulator.invalidCommand"),
      });
      return;
    }

    if (!selectedStaff.mobileNumber) {
      appendMessages({
        role: "system",
        type: "text",
        text: t("waSimulator.noMobileNumber"),
      });
      return;
    }

    setSending(true);

    try {
      const response = await request("POST", "/api/mobile-logins/request", {
        mobileNumber: selectedStaff.mobileNumber,
      });

      const loginKey =
        response?.data?.loginkey || response?.data?.loginKey || "";
      const otp = response?.data?.otp || response?.data?.OTP || "";

      if (normalizedMessage === "otp") {
        appendMessages({
          role: "system",
          type: "text",
          label: t("waSimulator.otpLabel"),
          text: otp || t("waSimulator.missingResponse"),
        });
        return;
      }

      if (!loginKey) {
        appendMessages({
          role: "system",
          type: "text",
          text: t("waSimulator.missingResponse"),
        });
        return;
      }

      const loginUrl = buildLoginUrl(loginKey);

      if (normalizedMessage === "web") {
        appendMessages({
          role: "system",
          type: "text",
          label: t("waSimulator.urlLabel"),
          text: loginUrl,
        });
      } else {
        appendMessages({
          role: "system",
          type: "qr",
          label: t("waSimulator.replyPda"),
          text: loginUrl,
          qrValue: loginUrl,
        });
      }
    } catch (error) {
      appendMessages({
        role: "system",
        type: "text",
        text:
          error?.response?.data?.message ||
          error?.message ||
          t("waSimulator.requestFailed"),
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("waSimulator.title")}
        subtitle={t("waSimulator.subtitle")}
        icon={WhatsAppIcon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("waSimulator.helpTitle")}
        content={t("waSimulator.helpBody")}
      />

      <Paper
        sx={{
          minHeight: { xs: "72vh", md: "76vh" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 3,
          backgroundColor: "background.paper",
          boxShadow: 2,
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            bgcolor: "action.hover",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <WhatsAppIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t("waSimulator.title")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("waSimulator.phrasesHint")}
              </Typography>
            </Box>
          </Stack>

          <Chip
            label={
              loadingStaff
                ? t("waSimulator.loadingStaff")
                : t("waSimulator.staffCount", "{{count}} staff", {
                    count: staffList.length,
                  })
            }
            size="small"
            variant="outlined"
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: { xs: 1.5, sm: 2 },
            py: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            bgcolor: "background.default",
          }}
        >
          {messages.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                display: "flex",
                justifyContent:
                  entry.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Box
                sx={{
                  maxWidth: { xs: "92%", sm: "78%" },
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor:
                    entry.role === "user" ? "primary.main" : "background.paper",
                  color:
                    entry.role === "user"
                      ? "primary.contrastText"
                      : "text.primary",
                  boxShadow: 1,
                  border: entry.role === "user" ? "none" : "1px solid",
                  borderColor:
                    entry.role === "user" ? "transparent" : "divider",
                }}
              >
                {entry.label && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mb: 0.5, opacity: 0.8 }}
                  >
                    {entry.label}
                  </Typography>
                )}

                {entry.type === "qr" ? (
                  <Stack spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <QRCodeSVG
                        value={entry.qrValue || entry.text}
                        size={168}
                        level="M"
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: "break-all", textAlign: "center" }}
                    >
                      {entry.text}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {entry.text}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
          <Box ref={scrollEndRef} />
        </Box>

        <Divider />

        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
            alignItems: { xs: "stretch", md: "flex-end" },
            bgcolor: "background.paper",
          }}
        >
          <FormControl sx={{ minWidth: { xs: "100%", md: 260 } }} size="small">
            <InputLabel>{t("waSimulator.staffLabel")}</InputLabel>
            <Select
              value={selectedStaffId}
              label={t("waSimulator.staffLabel")}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              disabled={loadingStaff || sending}
              displayEmpty
            >
              <MenuItem value="">
                <em>{t("waSimulator.staffPlaceholder")}</em>
              </MenuItem>
              {staffList.map((staff) => (
                <MenuItem key={staff.staffId} value={String(staff.staffId)}>
                  {staff.staffName}
                  {staff.mobileNumber ? ` · ${staff.mobileNumber}` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label={t("waSimulator.messageLabel")}
            placeholder={t("waSimulator.messagePlaceholder")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />

          <Button
            variant="contained"
            startIcon={
              sending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            onClick={handleSend}
            disabled={sending || loadingStaff}
            sx={{ minWidth: { xs: "100%", md: 124 }, whiteSpace: "nowrap" }}
          >
            {t("waSimulator.sendButton")}
          </Button>

          <Button
            variant="outlined"
            startIcon={<ReplayIcon />}
            onClick={resetConversation}
            disabled={sending}
            sx={{ minWidth: { xs: "100%", md: 124 }, whiteSpace: "nowrap" }}
          >
            {t("waSimulator.resetButton")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default WASimulator;
