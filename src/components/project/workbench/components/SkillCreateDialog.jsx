import React from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const SkillCreateDialog = ({
  open,
  loading,
  error,
  form,
  categoryOptions,
  onClose,
  onFormChange,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("projectPlanning.addSkillDefinition")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ mt: 0.25 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            size="small"
            label={t("projectPlanning.skillName")}
            value={form.skillName}
            onChange={(event) =>
              onFormChange({ skillName: event.target.value })
            }
            required
            fullWidth
          />

          <TextField
            size="small"
            label={t("projectPlanning.skillDescription")}
            value={form.skillDescription}
            onChange={(event) =>
              onFormChange({ skillDescription: event.target.value })
            }
            fullWidth
          />

          <Autocomplete
            freeSolo
            options={categoryOptions}
            value={null}
            inputValue={form.skillCategory}
            onInputChange={(_, newInputValue) =>
              onFormChange({ skillCategory: newInputValue })
            }
            onChange={(_, value) =>
              onFormChange({ skillCategory: String(value || "").trim() })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={t("projectPlanning.skillCategory")}
                placeholder={t("projectPlanning.skillCategoryPlaceholder")}
                fullWidth
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("basic.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={loading || !String(form.skillName || "").trim()}
        >
          {loading ? t("basic.loading") : t("basic.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SkillCreateDialog;
