import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  Undo as UndoIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import {
  commit,
  deleteFileFromDrive,
  getActiveStorageProviderConfig,
  normalizeFileMetadata,
  uploadFileToDrive,
  ThumbnailImg,
} from "../../helpers/file_helper";
import Modal from "../common/Modal";

const sanitizeWebhookUrl = (rawUrl) =>
  String(rawUrl || "")
    .trim()
    .replace(/\/$/, "");

const getTranslationWebhookUrl = () =>
  sanitizeWebhookUrl(import.meta.env.VITE_N8N_BRIEFING_TRANSLATE_URL);

const getTranslationHeaders = () => {
  const headerName = String(import.meta.env.VITE_N8N_HEADER_NAME || "").trim();
  const secret = String(import.meta.env.VITE_N8N_SECRET || "").trim();
  if (!headerName || !secret) return {};
  return { [headerName]: secret };
};

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

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value);

const CARD_IMAGE_WIDTH = 1200;
const CARD_IMAGE_HEIGHT = 900;

const BriefingContentDialog = ({ open, onClose, briefing }) => {
  const { t, i18n } = useTranslation();
  const { param, languages } = useContext(AuthContext);
  const briefingId = briefing?.briefingId;
  const baseLanguage = safeString(param?.baseLanguage).trim();
  const currentLanguageCode = safeString(i18n.language).trim();

  const [cards, setCards] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(true);
  const [imageUploadTargetId, setImageUploadTargetId] = useState("");
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [currentPreviewLanguage, setCurrentPreviewLanguage] =
    useState(currentLanguageCode);
  const fileInputRef = useRef(null);
  const translationRequestIdRef = useRef(0);

  const supportedTranslationLanguages = useMemo(() => {
    return (languages || [])
      .map((lang) => safeString(lang?.code).trim())
      .filter((code) => code && code !== baseLanguage);
  }, [languages, baseLanguage]);

  const parseImageMeta = useCallback((value) => {
    const parsed = safeParseJson(value, null);
    if (!parsed) return null;
    const meta = normalizeFileMetadata(parsed);
    if (!meta.id && !meta.url && !meta.viewUrl) return null;
    return meta;
  }, []);

  const parseTranslatedText = useCallback((value) => {
    const parsed = safeParseJson(value, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }, []);

  const normalizeCard = useCallback(
    (item, index) => {
      const imageMeta = parseImageMeta(item?.imageKey);
      return {
        localId:
          item?.briefingContentId !== null &&
          item?.briefingContentId !== undefined
            ? `briefing-${item.briefingContentId}`
            : `new-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        briefingContentId: item?.briefingContentId ?? null,
        briefingId: item?.briefingId ?? briefingId,
        contentTitle: safeString(item?.contentTitle),
        contentText: safeString(item?.contentText),
        translatedText: parseTranslatedText(item?.translatedText),
        imageKey: imageMeta ? JSON.stringify(imageMeta) : "",
        pendingDelete: false,
        pendingImageDeleteIds: [],
      };
    },
    [briefingId, parseImageMeta, parseTranslatedText],
  );

  const selectedCard = selectedIndex >= 0 ? cards[selectedIndex] : null;

  const markDirty = () => {
    setDirty(true);
  };

  const updateCardById = useCallback((localId, updater) => {
    setCards((prev) =>
      prev.map((card) => (card.localId === localId ? updater(card) : card)),
    );
    setDirty(true);
  }, []);

  const loadContents = useCallback(async () => {
    if (!briefingId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await request(
        "GET",
        `/api/briefingcontents?briefingId=${encodeURIComponent(briefingId)}`,
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      const normalized = list
        .slice()
        .sort((a, b) => {
          const seqA = String(a?.sequenceNumber ?? "");
          const seqB = String(b?.sequenceNumber ?? "");
          return seqA.localeCompare(seqB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        })
        .map((item, index) => normalizeCard(item, index));
      setCards(normalized);
      setSelectedIndex(normalized.length > 0 ? normalized.length - 1 : -1);
      setDirty(false);
      setTranslationError("");
    } catch (error) {
      setCards([]);
      setSelectedIndex(-1);
      setErrorMsg(
        error?.response?.data?.message || t("briefingContent.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [briefingId, normalizeCard, t]);

  useEffect(() => {
    if (!open) return;
    loadContents();
  }, [open, loadContents]);

  useEffect(() => {
    if (!currentLanguageCode) return;
    setCurrentPreviewLanguage(currentLanguageCode);
  }, [currentLanguageCode]);

  useEffect(() => {
    if (!open || !selectedCard) return;
    if (!baseLanguage || supportedTranslationLanguages.length === 0) return;
    if (selectedCard.pendingDelete) return;

    const timer = setTimeout(async () => {
      const requestId = ++translationRequestIdRef.current;
      setTranslationBusy(true);
      setTranslationError("");
      try {
        const webhookUrl = getTranslationWebhookUrl();
        if (!webhookUrl) {
          throw new Error(t("briefingContent.translationWebhookMissing"));
        }

        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getTranslationHeaders(),
          },
          body: JSON.stringify({
            title: selectedCard.contentTitle,
            content: selectedCard.contentText,
            language: supportedTranslationLanguages,
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || t("briefingContent.translationFailed"));
        }

        const translated = await resp.json();
        if (requestId !== translationRequestIdRef.current) return;

        setCards((prev) =>
          prev.map((card) =>
            card.localId === selectedCard.localId
              ? { ...card, translatedText: translated || {} }
              : card,
          ),
        );
      } catch (error) {
        if (requestId !== translationRequestIdRef.current) return;
        setTranslationError(
          error?.message || t("briefingContent.translationFailed"),
        );
      } finally {
        if (requestId === translationRequestIdRef.current) {
          setTranslationBusy(false);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    open,
    baseLanguage,
    selectedCard?.contentTitle,
    selectedCard?.contentText,
    selectedCard?.localId,
    selectedCard?.pendingDelete,
    supportedTranslationLanguages,
    t,
  ]);

  const createBlankCard = () => ({
    localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    briefingContentId: null,
    briefingId,
    contentTitle: "",
    contentText: "",
    translatedText: {},
    imageKey: "",
    pendingDelete: false,
    pendingImageDeleteIds: [],
  });

  const addCardAfterSelected = () => {
    const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : cards.length;
    const nextCard = createBlankCard();
    setCards((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, nextCard);
      return next;
    });
    setSelectedIndex(insertIndex);
    setDirty(true);
    setEditorOpen(true);
  };

  const moveCard = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    setCards((prev) => {
      const next = [...prev];
      const current = next[index];
      next[index] = next[target];
      next[target] = current;
      return next;
    });
    setSelectedIndex(target);
    setDirty(true);
  };

  const togglePendingDelete = (index) => {
    setCards((prev) =>
      prev.map((card, cardIndex) =>
        cardIndex === index
          ? {
              ...card,
              pendingDelete: !card.pendingDelete,
            }
          : card,
      ),
    );
    setDirty(true);
  };

  const openImagePicker = (cardId) => {
    setImageUploadTargetId(cardId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const targetId = imageUploadTargetId;
    if (!targetId) return;

    try {
      const activeCfg = getActiveStorageProviderConfig();
      const uploaded = await uploadFileToDrive(file, null, activeCfg.folderId);
      const normalized = normalizeFileMetadata(uploaded, {
        name: file.name,
        mimeType: file.type || "",
        provider: activeCfg.provider,
      });

      setCards((prev) =>
        prev.map((card) => {
          if (card.localId !== targetId) return card;
          const previousImage = parseImageMeta(card.imageKey);
          const nextDeleteIds = [...(card.pendingImageDeleteIds || [])];
          if (previousImage?.id) {
            nextDeleteIds.push({
              fileId: previousImage.id,
              provider: previousImage.provider,
            });
          }
          return {
            ...card,
            imageKey: JSON.stringify(normalized),
            pendingImageDeleteIds: nextDeleteIds,
            pendingDelete: card.pendingDelete,
          };
        }),
      );
      setDirty(true);
    } catch (error) {
      setErrorMsg(error?.message || t("briefingContent.imageUploadFailed"));
    } finally {
      setImageUploadTargetId("");
    }
  };

  const getCardPreview = (card) => {
    const meta = parseImageMeta(card?.imageKey);
    if (!meta) return null;
    return {
      meta,
      thumb: {
        fileId: meta.id,
        viewUrl: meta.viewUrl || meta.url || "",
        provider: meta.provider || null,
      },
    };
  };

  const resolveCardDisplay = (card) => {
    if (!card) return { title: "", content: "" };
    if (currentPreviewLanguage === baseLanguage) {
      return {
        title: safeString(card.contentTitle),
        content: safeString(card.contentText),
      };
    }
    const translated = card.translatedText?.[currentPreviewLanguage] || {};
    return {
      title: safeString(translated.title),
      content: safeString(translated.content),
    };
  };

  const updateSelectedCardField = (field, value) => {
    if (!selectedCard) return;
    setCards((prev) =>
      prev.map((card) =>
        card.localId === selectedCard.localId
          ? { ...card, [field]: value }
          : card,
      ),
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    setTranslationError("");
    try {
      const activeCards = cards.filter((card) => !card.pendingDelete);
      const deletedCards = cards.filter((card) => card.pendingDelete);

      for (let index = 0; index < activeCards.length; index += 1) {
        const card = activeCards[index];
        const payload = {
          briefingId,
          sequenceNumber: String(index + 1),
          imageKey: card.imageKey || null,
          contentTitle: safeString(card.contentTitle),
          contentText: safeString(card.contentText),
          translatedText: JSON.stringify(card.translatedText || {}),
        };

        if (card.briefingContentId) {
          await request(
            "PUT",
            `/api/briefingcontents/${card.briefingContentId}`,
            payload,
          );
        } else {
          await request("POST", "/api/briefingcontents", payload);
        }
      }

      for (const card of deletedCards) {
        if (card.briefingContentId) {
          await request(
            "DELETE",
            `/api/briefingcontents/${card.briefingContentId}`,
          );
        }
      }

      const cleanupImageRefs = [];
      deletedCards.forEach((card) => {
        const meta = parseImageMeta(card.imageKey);
        if (meta?.id) {
          cleanupImageRefs.push({ fileId: meta.id, provider: meta.provider });
        }
      });
      cards.forEach((card) => {
        (card.pendingImageDeleteIds || []).forEach((entry) => {
          cleanupImageRefs.push(entry);
        });
      });

      for (const ref of cleanupImageRefs) {
        if (ref?.fileId) {
          await deleteFileFromDrive(ref.fileId, null, ref.provider);
        }
      }

      await commit();
      setDirty(false);
      if (onClose) onClose();
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          error?.message ||
          t("briefingContent.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (dirty) {
      setConfirmCloseOpen(true);
      return;
    }
    await abort();
    if (onClose) onClose();
  };

  const discardChanges = async () => {
    setConfirmCloseOpen(false);
    await abort();
    setDirty(false);
    if (onClose) onClose();
  };

  const actions = (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={addCardAfterSelected}
        disabled={saving || loading}
      >
        {t("briefingContent.addCard")}
      </Button>
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving || loading}
      >
        {saving ? t("briefingContent.saving") : t("briefingContent.save")}
      </Button>
      <Button variant="outlined" onClick={handleClose} disabled={saving}>
        {t("briefingContent.close")}
      </Button>
    </Box>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={t("briefingContent.title")}
        maxWidth="xl"
        fullWidth
        actions={actions}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageSelected}
        />

        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t("briefingContent.briefingLabel")}:{" "}
              {briefing?.briefingTitle || ""}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("briefingContent.baseLanguage")}: {baseLanguage}
            </Typography>
          </Box>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          {translationError && (
            <Alert severity="warning">{translationError}</Alert>
          )}
          {baseLanguage ? null : (
            <Alert severity="warning">
              {t("briefingContent.baseLanguageMissing")}
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              pb: 1,
              scrollSnapType: "x mandatory",
              alignItems: "stretch",
            }}
          >
            {cards.length === 0 ? (
              <Box
                sx={{
                  minHeight: 260,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t("briefingContent.empty")}
                </Typography>
              </Box>
            ) : (
              cards.map((card, index) => {
                const isSelected = index === selectedIndex;
                const isDeleted = card.pendingDelete;
                const preview = getCardPreview(card);
                const display = resolveCardDisplay(card);

                return (
                  <Card
                    key={card.localId}
                    onClick={() => setSelectedIndex(index)}
                    sx={{
                      flex: {
                        xs: "0 0 86%",
                        sm: "0 0 48%",
                        md: "0 0 calc((100% - 32px) / 3)",
                      },
                      minWidth: { xs: 260, sm: 280, md: 300 },
                      maxWidth: { xs: 420, md: "none" },
                      scrollSnapAlign: "start",
                      opacity: isDeleted ? 0.45 : 1,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      boxShadow: isSelected ? 4 : 1,
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        height: { xs: 190, sm: 210, md: 230 },
                        overflow: "hidden",
                        bgcolor: "background.default",
                      }}
                    >
                      {preview?.thumb?.fileId ? (
                        <ThumbnailImg
                          fileId={preview.thumb.fileId}
                          viewUrl={preview.thumb.viewUrl}
                          provider={preview.thumb.provider}
                          width={CARD_IMAGE_WIDTH}
                          height={CARD_IMAGE_HEIGHT}
                          alt={
                            card.contentTitle ||
                            card.contentText ||
                            "briefing image"
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "grey.100",
                          }}
                        >
                          <ImageIcon
                            sx={{ fontSize: 56, color: "text.secondary" }}
                          />
                        </Box>
                      )}

                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: "rgba(0,0,0,0.55)",
                          color: "common.white",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {currentPreviewLanguage}.title
                      </Box>
                    </Box>

                    <CardContent
                      sx={{
                        height: { xs: 190, sm: 200, md: 210 },
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        justifyContent: "space-between",
                        overflow: "hidden",
                      }}
                    >
                      <Box sx={{ minHeight: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{ lineHeight: 1.2 }}
                          noWrap
                        >
                          {display.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: "-webkit-box",
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            whiteSpace: "pre-line",
                          }}
                        >
                          {display.content}
                        </Typography>
                      </Box>

                      <Divider />

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 0.5,
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => openImagePicker(card.localId)}
                          title={t("briefingContent.imageAction")}
                        >
                          <ImageIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedIndex(index);
                            setEditorOpen(true);
                          }}
                          title={t("briefingContent.contentAction")}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={isDeleted ? "success" : "error"}
                          onClick={() => togglePendingDelete(index)}
                          title={
                            isDeleted
                              ? t("briefingContent.undoAction")
                              : t("briefingContent.deleteAction")
                          }
                        >
                          {isDeleted ? (
                            <UndoIcon fontSize="small" />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => moveCard(index, -1)}
                          disabled={index === 0 || isDeleted}
                          title={t("briefingContent.moveLeftAction")}
                        >
                          <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => moveCard(index, 1)}
                          disabled={index === cards.length - 1 || isDeleted}
                          title={t("briefingContent.moveRightAction")}
                        >
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {isDeleted && (
                        <Typography variant="caption" color="error.main">
                          {t("briefingContent.pendingDelete")}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Box>

          {selectedCard && editorOpen && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography variant="h6">
                    {t("briefingContent.editorTitle")}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setEditorOpen((prev) => !prev)}
                  >
                    {editorOpen
                      ? t("briefingContent.hideEditor")
                      : t("briefingContent.showEditor")}
                  </Button>
                </Box>

                {selectedCard.pendingDelete ? (
                  <Alert severity="info">
                    {t("briefingContent.editDisabledDeleted")}
                  </Alert>
                ) : null}

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
                    gap: 2,
                  }}
                >
                  <Stack spacing={2}>
                    <Typography variant="subtitle1">{baseLanguage}</Typography>
                    <TextField
                      label={t("briefingContent.contentTitleLabel")}
                      value={selectedCard.contentTitle}
                      onChange={(event) =>
                        updateSelectedCardField(
                          "contentTitle",
                          event.target.value,
                        )
                      }
                      fullWidth
                      disabled={selectedCard.pendingDelete}
                    />
                    <TextField
                      label={t("briefingContent.contentTextLabel")}
                      value={selectedCard.contentText}
                      onChange={(event) =>
                        updateSelectedCardField(
                          "contentText",
                          event.target.value,
                        )
                      }
                      fullWidth
                      multiline
                      minRows={5}
                      disabled={selectedCard.pendingDelete}
                    />
                  </Stack>

                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1">
                      {t("briefingContent.translatedBlocks")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentPreviewLanguage}.title / {currentPreviewLanguage}
                      .content
                    </Typography>
                    <Stack
                      spacing={1.5}
                      sx={{ maxHeight: 340, overflowY: "auto", pr: 0.5 }}
                    >
                      {supportedTranslationLanguages.map((langCode) => {
                        const translated =
                          selectedCard.translatedText?.[langCode] || {};
                        return (
                          <Paper
                            key={langCode}
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2 }}
                          >
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              {langCode}
                            </Typography>
                            <TextField
                              label={t("briefingContent.contentTitleLabel")}
                              value={safeString(translated.title)}
                              fullWidth
                              InputProps={{ readOnly: true }}
                              sx={{ mb: 1 }}
                              size="small"
                            />
                            <TextField
                              label={t("briefingContent.contentTextLabel")}
                              value={safeString(translated.content)}
                              fullWidth
                              multiline
                              minRows={3}
                              InputProps={{ readOnly: true }}
                              size="small"
                            />
                          </Paper>
                        );
                      })}
                    </Stack>
                    {translationBusy && (
                      <Alert severity="info">
                        {t("briefingContent.translating")}
                      </Alert>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Modal>

      <Dialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("briefingContent.discardTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
            {t("briefingContent.discardMessage")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirmCloseOpen(false)}>
            {t("briefingContent.keepEditing")}
          </Button>
          <Button variant="contained" color="error" onClick={discardChanges}>
            {t("briefingContent.discardChanges")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BriefingContentDialog;
