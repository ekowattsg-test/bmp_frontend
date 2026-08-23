import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Paper,
  Badge,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Link,
  Dialog,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Campaign as CampaignIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  ArrowUpward as ArrowUpwardIcon,
} from "@mui/icons-material";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import PageHeader from "../common/PageHeader";
import EmptyState from "../common/EmptyState";
import PurchaseOrderView from "../information/PurchaseOrderView";
import DeliveryOrderView from "../information/DeliveryOrderView";
import { getPdaUser } from "../pda/common/pda_user_helper";

const POLL_INTERVAL_MS = 15000;

const TabPanel = ({ children, value, index }) =>
  value === index ? (
    <Box sx={{ mt: 2, height: "calc(100% - 48px)" }}>{children}</Box>
  ) : null;

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

const PDA_PATH_MAP = {
  "/receive-po-stock": "/pda/receive-po-stock",
  "/transfer-out": "/pda/stock-transfer-out",
};

const resolveActionPath = (url, isPda) => {
  if (!isPda) return url;
  const [basePath, query] = url.split("?");
  const pdaBase = PDA_PATH_MAP[basePath];
  if (!pdaBase) return url;
  return query ? `${pdaBase}?${query}` : pdaBase;
};

const inlineLinkSx = {
  p: 0,
  m: 0,
  verticalAlign: "baseline",
  fontSize: "inherit",
  lineHeight: "inherit",
  textTransform: "none",
};

const MessageContent = ({ text, onDocumentClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPda = location.pathname.startsWith("/pda/");

  if (!text) return null;

  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(MARKDOWN_LINK_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, display, url] = match;
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }

    if (url.startsWith("doc://")) {
      const docMatch = url.match(/^doc:\/\/(po|do)\/(.+)$/);
      const [, type, orderId] = docMatch || [];
      parts.push(
        <Link
          key={`link-${match.index}`}
          component="button"
          color="inherit"
          underline="always"
          onClick={() => type && orderId && onDocumentClick(type, orderId)}
          sx={inlineLinkSx}
        >
          {display}
        </Link>,
      );
    } else if (url.startsWith("/")) {
      const path = resolveActionPath(url, isPda);
      parts.push(
        <Link
          key={`link-${match.index}`}
          component="button"
          color="inherit"
          underline="always"
          onClick={() => navigate(path)}
          sx={inlineLinkSx}
        >
          {display}
        </Link>,
      );
    } else {
      parts.push(
        <Link
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          color="inherit"
          underline="always"
          sx={{ wordBreak: "break-all" }}
        >
          {display}
        </Link>,
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
};

MessageContent.propTypes = {
  text: PropTypes.string,
  onDocumentClick: PropTypes.func.isRequired,
};

export default function MessagesPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const isPda = location.pathname.startsWith("/pda/");
  const { userInfo, param } = useContext(AuthContext);
  const pdaUser = isPda ? getPdaUser() : null;
  const effectiveUserInfo = pdaUser || userInfo || {};
  const userLevel = Number(
    effectiveUserInfo?.userLevel ?? effectiveUserInfo?.level ?? 0,
  );
  const canSendBroadcast = userLevel >= 5;

  const [activeTab, setActiveTab] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedDirectStaff, setSelectedDirectStaff] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [sendError, setSendError] = useState("");
  const [composeOpen, setComposeOpen] = useState(true);
  const [docView, setDocView] = useState({
    open: false,
    type: null,
    order: null,
    loading: false,
  });
  const defaultProjectScope =
    param?.chatProjectGroupDefaultScope ?? "LEADERSHIP";
  const [includeAllMembers, setIncludeAllMembers] = useState(
    defaultProjectScope === "ALL",
  );

  const allowProjectScopeChoice =
    Number(param?.chatAllowProjectGroupScopeChoice ?? 1) === 1;

  const threadBottomRef = useRef(null);
  const topOfThreadRef = useRef(null);
  const topOfPageRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (!topOfThreadRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollTop(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(topOfThreadRef.current);
    return () => observer.disconnect();
  }, [selectedConversation, composeOpen]);

  const isSameStaff = (a, b) => {
    if (!a || !b) return false;
    return String(a).toLowerCase() === String(b).toLowerCase();
  };

  const findStaffById = (staffId) => {
    if (!staffId || !staffList.length) return null;
    return staffList.find((s) => s.staffId && isSameStaff(s.staffId, staffId));
  };

  const handleDocumentClick = useCallback(async (type, orderId) => {
    if (!type || !orderId) return;
    setDocView({ open: true, type, order: null, loading: true });
    try {
      const url =
        type === "po"
          ? `/api/purchaseOrders/${orderId}`
          : `/api/deliveryOrders/${orderId}`;
      const res = await request("GET", url, null, {
        skipBackendErrorDialog: true,
      });
      setDocView({ open: true, type, order: res.data, loading: false });
    } catch (err) {
      console.error("Failed to load order for document view", err);
      setDocView({ open: true, type, order: null, loading: false });
    }
  }, []);

  const closeDocumentView = () =>
    setDocView({ open: false, type: null, order: null, loading: false });

  const getDisplayName = (staffId) => {
    if (!staffId) return "";
    const staff = findStaffById(staffId);
    return staff?.staffName || staff?.userName || staff?.name || staffId;
  };

  const [currentUserMobileRaw, setCurrentUserMobileRaw] = useState("");
  const [currentStaffId, setCurrentStaffId] = useState(
    effectiveUserInfo?.staffId || effectiveUserInfo?.staffID || null,
  );

  // Resolve current user's mobile number and staffId from authoritative sources
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      let mobile =
        effectiveUserInfo?.mobileNumber ||
        effectiveUserInfo?.mobile ||
        effectiveUserInfo?.phoneNumber ||
        "";
      let staffId =
        effectiveUserInfo?.staffId || effectiveUserInfo?.staffID || null;

      try {
        const res = await request("GET", "/api/staffs");
        const staffRows = res.data || [];
        const userMobile = String(mobile || "").trim();
        const me =
          staffRows.find(
            (s) => s.staffId && staffId && isSameStaff(s.staffId, staffId),
          ) ||
          staffRows.find(
            (s) =>
              s.staffId &&
              effectiveUserInfo?.id &&
              isSameStaff(s.staffId, effectiveUserInfo.id),
          ) ||
          staffRows.find(
            (s) =>
              userMobile &&
              (String(s.mobileNumber || "").trim() === userMobile ||
                String(s.mobile || "").trim() === userMobile ||
                String(s.phoneNumber || "").trim() === userMobile),
          );
        if (me) {
          mobile =
            mobile || me.mobileNumber || me.mobile || me.phoneNumber || "";
          staffId = staffId || me.staffId;
        }
      } catch (err) {
        console.error("Failed to resolve current user staff", err);
      }

      if (!cancelled) {
        setCurrentUserMobileRaw(String(mobile || "").trim());
        setCurrentStaffId(staffId || null);
      }
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [effectiveUserInfo]);

  const currentUserMobile = encodeURIComponent(currentUserMobileRaw);
  const messagingEnabled = Boolean(currentUserMobileRaw && currentStaffId);

  const fetchConversations = useCallback(async () => {
    if (!currentUserMobile) return;
    try {
      const res = await request(
        "GET",
        `/api/messages/conversations?mobileNumber=${currentUserMobile}`,
      );
      setConversations(res.data || []);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  }, [currentUserMobile]);

  const fetchThread = useCallback(
    async (conversation) => {
      if (!conversation || !currentUserMobile || !currentStaffId) return;
      try {
        let url;
        if (conversation.recipientType === "DIRECT") {
          const otherStaffId = isSameStaff(
            conversation.senderStaffId,
            currentStaffId,
          )
            ? conversation.recipientStaffId
            : conversation.senderStaffId;
          url = `/api/messages/direct?mobileNumber=${currentUserMobile}&staffId=${otherStaffId}`;
        } else if (conversation.recipientType === "PROJECT") {
          url = `/api/messages/project?mobileNumber=${currentUserMobile}&projectCode=${conversation.projectCode}`;
        } else {
          url = `/api/messages/broadcast?mobileNumber=${currentUserMobile}`;
        }
        const res = await request("GET", url);
        const fresh = res.data || [];
        setThreadMessages((prev) => {
          // Preserve scroll position / bubble alignment by only updating when
          // the message set has actually changed (new/deleted messages).
          if (prev.length === 0) return fresh;
          if (fresh.length !== prev.length) return fresh;
          const prevIds = new Set(prev.map((m) => m.messageId));
          const changed = fresh.some((m) => !prevIds.has(m.messageId));
          return changed ? fresh : prev;
        });
      } catch (err) {
        console.error("Failed to fetch thread", err);
      }
    },
    [currentUserMobile, currentStaffId],
  );

  const fetchMeta = useCallback(async () => {
    try {
      const [staffRes, projectRes] = await Promise.all([
        request("GET", "/api/staffs"),
        request("GET", "/api/projects"),
      ]);
      setStaffList(staffRes.data || []);
      setProjectList(projectRes.data || []);
    } catch (err) {
      console.error("Failed to fetch meta", err);
    }
  }, []);

  const send = async (recipientType, extra) => {
    if (!messageInput.trim()) return;
    if (!currentUserMobile) {
      setSendError(t("chat.mobileNumberRequired"));
      return;
    }
    setSendError("");
    const payload = {
      recipientType,
      content: messageInput.trim(),
      ...extra,
    };
    try {
      await request(
        "POST",
        `/api/messages?mobileNumber=${currentUserMobile}`,
        payload,
      );
      setMessageInput("");
      await fetchConversations();
      await fetchThread(selectedConversation);
      // Reset compose selectors after sending
      if (recipientType === "DIRECT") setSelectedDirectStaff("");
      if (recipientType === "PROJECT") setSelectedProject("");
      setComposeOpen(false);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const markRead = useCallback(
    async (messageId) => {
      if (!currentUserMobile) return;
      try {
        await request(
          "PUT",
          `/api/messages/${messageId}/read?mobileNumber=${currentUserMobile}`,
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.messageId === messageId ? { ...c, readByMe: true } : c,
          ),
        );
      } catch (err) {
        console.error("Failed to mark read", err);
      }
    },
    [currentUserMobile],
  );

  useEffect(() => {
    const load = async () => {
      await fetchMeta();
      if (currentUserMobile && currentStaffId) {
        await fetchConversations();
      }
    };
    load();
  }, [currentUserMobile, currentStaffId, fetchMeta, fetchConversations]);

  useEffect(() => {
    if (!currentUserMobile || !currentStaffId) return;
    const loadThread = async () => {
      if (!selectedConversation) return;
      await fetchThread(selectedConversation);
    };
    loadThread();
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUserMobile || !currentStaffId || !selectedConversation) return;
    // Mark unread messages from other senders as read once they are displayed.
    const ids = threadMessages
      .filter(
        (msg) =>
          !msg.readByMe && !isSameStaff(msg.senderStaffId, currentStaffId),
      )
      .map((msg) => msg.messageId);
    if (ids.length === 0) return;
    ids.forEach((id) => markRead(id));
  }, [
    threadMessages,
    selectedConversation,
    currentStaffId,
    currentUserMobile,
    markRead,
  ]);

  useEffect(() => {
    if (!currentUserMobile || !currentStaffId) return;
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) fetchThread(selectedConversation);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    selectedConversation,
    currentUserMobile,
    currentStaffId,
    fetchConversations,
    fetchThread,
  ]);

  const filteredThreadMessages = React.useMemo(() => {
    if (!selectedConversation) return [];
    let filtered = threadMessages;
    if (selectedConversation.recipientType === "DIRECT") {
      const otherStaffId = isSameStaff(
        selectedConversation.senderStaffId,
        currentStaffId,
      )
        ? selectedConversation.recipientStaffId
        : selectedConversation.senderStaffId;
      filtered = threadMessages.filter(
        (m) =>
          m.recipientType === "DIRECT" &&
          (isSameStaff(m.senderStaffId, otherStaffId) ||
            isSameStaff(m.recipientStaffId, otherStaffId)),
      );
    } else if (selectedConversation.recipientType === "PROJECT") {
      filtered = threadMessages.filter(
        (m) => m.projectCode === selectedConversation.projectCode,
      );
    }
    // De-duplicate by messageId and sort oldest first
    const seen = new Set();
    return filtered
      .filter((m) => {
        if (seen.has(m.messageId)) return false;
        seen.add(m.messageId);
        return true;
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [threadMessages, selectedConversation, currentStaffId]);

  useEffect(() => {
    // Only auto-scroll on initial thread open, not on every background refresh
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation]);

  const renderMessageList = (messages, hideInput) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 1,
          bgcolor: "grey.50",
          borderRadius: 2,
        }}
      >
        {messages.length === 0 ? (
          <EmptyState
            title={t("chat.noMessages")}
            description={t("chat.startConversation")}
          />
        ) : (
          messages.map((msg) => {
            const isMe = isSameStaff(msg.senderStaffId, currentStaffId);
            const isSystem = msg.source === "SYSTEM";
            return (
              <Box
                key={msg.messageId}
                sx={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  mb: 1,
                }}
                onMouseEnter={() => !isMe && markRead(msg.messageId)}
                onClick={() => !isMe && markRead(msg.messageId)}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: "70%",
                    borderRadius: 2,
                    bgcolor: isSystem
                      ? "warning.light"
                      : isMe
                        ? "primary.main"
                        : "background.paper",
                    color:
                      isMe && !isSystem
                        ? "primary.contrastText"
                        : "text.primary",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.8, display: "block" }}
                  >
                    {isSystem
                      ? t("chat.system")
                      : isMe
                        ? t("chat.you", "You")
                        : getDisplayName(msg.senderStaffId)}
                  </Typography>
                  <Typography variant="body2">
                    <MessageContent
                      text={msg.content}
                      onDocumentClick={handleDocumentClick}
                    />
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.6, display: "block", textAlign: "right" }}
                  >
                    {new Date(msg.createdAt).toLocaleString()}
                  </Typography>
                </Paper>
              </Box>
            );
          })
        )}
        <div ref={threadBottomRef} />
      </Box>
      {!hideInput && (
        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
          <TextField
            fullWidth
            size="small"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={t("chat.typeMessage")}
            disabled={!currentUserMobile}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(getSendType(), getExtra());
              }
            }}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={() => send(getSendType(), getExtra())}
            disabled={!currentUserMobile}
          >
            {t("chat.send")}
          </Button>
        </Box>
      )}
      {sendError && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 1, display: "block" }}
        >
          {sendError}
        </Typography>
      )}
    </Box>
  );

  const getSendType = () => {
    if (composeOpen) {
      if (activeTab === 0) return "DIRECT";
      if (activeTab === 1) return "PROJECT";
      return "BROADCAST";
    }
    return selectedConversation?.recipientType || "DIRECT";
  };

  const getExtra = () => {
    const type = getSendType();
    if (type === "DIRECT") {
      if (selectedDirectStaff) return { recipientStaffId: selectedDirectStaff };
      if (selectedConversation?.recipientType === "DIRECT") {
        const otherStaffId = isSameStaff(
          selectedConversation.senderStaffId,
          currentStaffId,
        )
          ? selectedConversation.recipientStaffId
          : selectedConversation.senderStaffId;
        return { recipientStaffId: otherStaffId };
      }
      return {};
    }
    if (type === "PROJECT")
      return {
        projectCode: selectedProject || selectedConversation?.projectCode,
        projectGroupScope: includeAllMembers ? "ALL" : "LEADERSHIP",
      };
    return {};
  };

  const conversationGroups = Object.values(
    conversations.reduce((acc, c) => {
      let key;
      if (c.recipientType === "DIRECT") {
        const isSelfMessage = isSameStaff(c.senderStaffId, c.recipientStaffId);
        const otherStaffId = isSameStaff(c.senderStaffId, currentStaffId)
          ? c.recipientStaffId
          : c.senderStaffId;
        key = isSelfMessage
          ? `self-${c.senderStaffId}`
          : `direct-${otherStaffId}`;
      } else if (c.recipientType === "PROJECT") {
        key = `project-${c.projectCode}`;
      } else {
        key = "broadcast";
      }
      const existing = acc[key];
      if (!existing || new Date(c.createdAt) > new Date(existing.createdAt)) {
        acc[key] = c;
      }
      return acc;
    }, {}),
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const renderConversationItem = (c) => {
    const isCurrentUserSender = isSameStaff(c.senderStaffId, currentStaffId);
    const isSelfMessage =
      c.recipientType === "DIRECT" &&
      isSameStaff(c.senderStaffId, c.recipientStaffId);
    let primary;
    let secondaryPrefix;
    let icon;

    if (c.recipientType === "DIRECT") {
      const otherStaffId = isSelfMessage
        ? c.senderStaffId
        : isCurrentUserSender
          ? c.recipientStaffId
          : c.senderStaffId;
      primary = isSelfMessage
        ? t("chat.me", "Me")
        : getDisplayName(otherStaffId);
      icon = <PersonIcon />;
    } else if (c.recipientType === "PROJECT") {
      const project = projectList.find((p) => p.projectCode === c.projectCode);
      primary = project?.projectName || c.projectCode;
      icon = <GroupIcon />;
    } else {
      primary = t("chat.broadcast");
      icon = <CampaignIcon />;
    }

    if (isSelfMessage) {
      secondaryPrefix = t("chat.me", "Me");
    } else if (isCurrentUserSender) {
      secondaryPrefix = `${t("chat.you", "You")} → ${getDisplayName(c.recipientStaffId) || c.recipientType}`;
    } else {
      secondaryPrefix = getDisplayName(c.senderStaffId);
    }

    return (
      <ListItem
        key={`${c.recipientType}-${c.messageId}`}
        selected={
          selectedConversation?.recipientType === c.recipientType &&
          ((c.recipientType === "DIRECT" &&
            (isSameStaff(
              selectedConversation?.senderStaffId,
              c.senderStaffId,
            ) ||
              isSameStaff(
                selectedConversation?.recipientStaffId,
                c.recipientStaffId,
              ))) ||
            (c.recipientType === "PROJECT" &&
              selectedConversation?.projectCode === c.projectCode) ||
            c.recipientType === "BROADCAST")
        }
        onClick={() => {
          setSelectedConversation(c);
          setComposeOpen(false);
        }}
      >
        <ListItemAvatar>
          <Avatar>{icon}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {primary}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
              >
                [{t(`chat.${c.recipientType.toLowerCase()}`)}]
              </Typography>
            </Box>
          }
          secondary={`${secondaryPrefix}: ${c.content}`}
          secondaryTypographyProps={{ noWrap: true }}
        />
        {!c.readByMe &&
          c.senderStaffId &&
          !isSameStaff(c.senderStaffId, currentStaffId) && (
            <Badge
              color="error"
              variant="dot"
              sx={{
                "& .MuiBadge-dot": {
                  backgroundColor: "var(--color-danger)",
                },
              }}
            />
          )}
      </ListItem>
    );
  };

  const renderThreadHeader = () => {
    if (!selectedConversation) return null;
    if (selectedConversation.recipientType === "DIRECT") {
      const otherStaffId = isSameStaff(
        selectedConversation.senderStaffId,
        currentStaffId,
      )
        ? selectedConversation.recipientStaffId
        : selectedConversation.senderStaffId;
      return getDisplayName(otherStaffId) || otherStaffId;
    }
    if (selectedConversation.recipientType === "PROJECT") {
      const project = projectList.find(
        (p) => p.projectCode === selectedConversation.projectCode,
      );
      return project?.projectName || selectedConversation.projectCode;
    }
    return t("chat.broadcast");
  };

  if (!messagingEnabled) {
    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div ref={topOfPageRef} />
        <PageHeader
          title={t("chat.title")}
          subtitle={t("chat.subtitle")}
          icon={ChatIcon}
        />
        <EmptyState
          icon={ChatIcon}
          title={t("chat.messagingDisabled")}
          description={t("chat.messagingDisabledDescription")}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div ref={topOfPageRef} />
      <PageHeader
        title={t("chat.title")}
        subtitle={t("chat.subtitle")}
        icon={ChatIcon}
      />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ display: "flex", gap: 2, height: "100%" }}>
          {/* Left: conversation list + compose */}
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                setComposeOpen(true);
                setSelectedConversation(null);
              }}
              variant="fullWidth"
            >
              <Tab icon={<PersonIcon />} label={t("chat.direct")} />
              <Tab icon={<GroupIcon />} label={t("chat.project")} />
              <Tab icon={<CampaignIcon />} label={t("chat.broadcast")} />
            </Tabs>
            <Box sx={{ p: 1 }}>
              {composeOpen && activeTab === 0 && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>{t("chat.selectStaff")}</InputLabel>
                  <Select
                    value={selectedDirectStaff}
                    label={t("chat.selectStaff")}
                    onChange={(e) => setSelectedDirectStaff(e.target.value)}
                  >
                    {staffList
                      .filter((s) => !isSameStaff(s.staffId, currentStaffId))
                      .map((s) => (
                        <MenuItem key={s.staffId} value={s.staffId}>
                          {s.staffName || s.staffId}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
              {composeOpen && activeTab === 1 && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>{t("chat.selectProject")}</InputLabel>
                  <Select
                    value={selectedProject}
                    label={t("chat.selectProject")}
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    {projectList.map((p) => (
                      <MenuItem key={p.projectCode} value={p.projectCode}>
                        {p.projectName || p.projectCode}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {composeOpen && activeTab === 1 && allowProjectScopeChoice && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeAllMembers}
                      onChange={(e) => setIncludeAllMembers(e.target.checked)}
                    />
                  }
                  label={t("chat.includeAllMembers")}
                />
              )}
              {composeOpen && activeTab === 2 && !canSendBroadcast && (
                <Typography variant="body2" color="text.secondary">
                  {t("chat.broadcastOnlyForAdmins")}
                </Typography>
              )}
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              {t("chat.conversations")}
            </Typography>
            <List dense sx={{ overflow: "auto", flex: 1 }}>
              {conversationGroups.map(renderConversationItem)}
            </List>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Right: thread */}
          <Box sx={{ flex: 1, minWidth: 0, position: "relative" }}>
            <div ref={topOfThreadRef} />
            {composeOpen ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {activeTab === 0 &&
                    (selectedDirectStaff
                      ? getDisplayName(selectedDirectStaff)
                      : t("chat.selectStaff"))}
                  {activeTab === 1 &&
                    (selectedProject
                      ? projectList.find(
                          (p) => p.projectCode === selectedProject,
                        )?.projectName || selectedProject
                      : t("chat.selectProject"))}
                  {activeTab === 2 && t("chat.broadcast")}
                </Typography>
                {renderMessageList([], activeTab === 2 && !canSendBroadcast)}
              </Box>
            ) : selectedConversation ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {renderThreadHeader()}
                </Typography>
                {renderMessageList(
                  filteredThreadMessages,
                  selectedConversation.recipientType === "BROADCAST" &&
                    !canSendBroadcast,
                )}
              </Box>
            ) : (
              <EmptyState
                title={t("chat.noConversationSelected")}
                description={t("chat.selectConversationDescription")}
              />
            )}
            {showScrollTop && (
              <IconButton
                size="small"
                sx={{
                  position: "fixed",
                  bottom: 16,
                  right: 16,
                  zIndex: 1300,
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  boxShadow: 1,
                  opacity: 0.7,
                  "&:hover": { bgcolor: "action.hover", opacity: 1 },
                }}
                onClick={() =>
                  topOfPageRef.current?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={docView.open && (docView.loading || !docView.order)}
        onClose={closeDocumentView}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          {docView.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Typography color="error">
              {t("chat.documentLoadFailed", "Failed to load order details.")}
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {docView.open && docView.type === "po" && docView.order && (
        <PurchaseOrderView order={docView.order} onClose={closeDocumentView} />
      )}
      {docView.open && docView.type === "do" && docView.order && (
        <DeliveryOrderView order={docView.order} onClose={closeDocumentView} />
      )}
    </Box>
  );
}
