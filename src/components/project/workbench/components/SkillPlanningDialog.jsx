import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";

const SkillPlanningDialog = ({
  open,
  onClose,
  target,
  loading,
  error,
  draft,
  onDraftChange,
  availableSkillOptions,
  toLongId,
  rows,
  onErrorChange,
  saveLockedByManpower,
  onSave,
  onRemove,
  onOpenCreateSkillDialog,
  skillById,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="h6" component="div" sx={{ pr: 1 }}>
            {t("projectPlanning.skillWorkspace")}
            {" - "}
            {target?.name || target?.raw?.taskName || "-"}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={onOpenCreateSkillDialog}
            disabled={loading}
            sx={{ mt: 0, flexShrink: 0 }}
          >
            {t("projectPlanning.addSkillDefinition")}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("projectPlanning.skillWorkspaceHelp")}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <FormControl
              size="small"
              fullWidth
              sx={{ minWidth: { xs: "100%", md: 260 } }}
            >
              <InputLabel>{t("projectPlanning.skillName")}</InputLabel>
              <Select
                value={draft.skillId ?? ""}
                label={t("projectPlanning.skillName")}
                onChange={(event) => {
                  const nextSkillId = toLongId(event.target.value);
                  if (nextSkillId === null) {
                    onDraftChange({ skillId: null });
                    return;
                  }

                  const duplicateRow = rows.find(
                    (item) =>
                      toLongId(item?.skillId) === nextSkillId &&
                      String(item?.apiId || "") !== String(draft.apiId || ""),
                  );

                  if (duplicateRow) {
                    onErrorChange(t("projectPlanning.skillDuplicate"));
                    return;
                  }

                  onErrorChange("");
                  onDraftChange({ skillId: nextSkillId });
                }}
              >
                {availableSkillOptions.map((option) => {
                  const skillId = toLongId(option?.staffSkillId);
                  if (skillId === null) return null;
                  const skillName =
                    String(option?.skillName || "").trim() || String(skillId);
                  return (
                    <MenuItem key={skillId} value={skillId}>
                      {skillName}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <TextField
              type="number"
              size="small"
              label={t("projectPlanning.skillUnit")}
              value={draft.unit}
              onChange={(event) => onDraftChange({ unit: event.target.value })}
              inputProps={{ min: 1, step: 1 }}
              sx={{ width: { xs: "100%", md: 140 } }}
            />

            <Button
              variant="contained"
              disabled={
                loading || draft.skillId === null || saveLockedByManpower
              }
              onClick={onSave}
            >
              {draft.apiId ? t("basic.save") : t("basic.add")}
            </Button>
          </Stack>

          {saveLockedByManpower && (
            <Alert severity="warning">
              {t("projectPlanning.skillLockedByManpower")}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("projectPlanning.noSkillSelected")}
            </Typography>
          ) : (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2.8fr) 100px 82px",
                  gap: 1,
                  px: 1.25,
                  py: 0.75,
                  bgcolor: "background.default",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="caption" fontWeight={700}>
                  {t("projectPlanning.skillName")}
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {t("projectPlanning.skillUnit")}
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {t("basic.remove")}
                </Typography>
              </Box>

              {rows
                .slice()
                .sort((a, b) =>
                  String(a?.skillName || a?.skillId || "").localeCompare(
                    String(b?.skillName || b?.skillId || ""),
                    undefined,
                    { sensitivity: "base" },
                  ),
                )
                .map((item) => {
                  const skillId = toLongId(item?.skillId);
                  if (skillId === null) return null;
                  const skillName =
                    String(item?.skillName || "").trim() ||
                    String(skillById?.[skillId]?.skillName || "").trim() ||
                    String(skillId) ||
                    "-";

                  return (
                    <Box
                      key={`${String(item.apiId || "new")}-${skillId}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 2.8fr) 100px 82px",
                        gap: 1,
                        px: 1.25,
                        py: 0.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        alignItems: "center",
                        "&:last-child": { borderBottom: "none" },
                      }}
                    >
                      <Typography variant="body2" noWrap>
                        {skillName}
                      </Typography>
                      <Typography variant="body2">{item.unit}</Typography>
                      <Box sx={{ display: "flex", gap: 0.25 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            onDraftChange({
                              apiId: item.apiId || null,
                              skillId,
                              unit: String(item.unit || "1"),
                            })
                          }
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => onRemove(item)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("basic.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SkillPlanningDialog;
