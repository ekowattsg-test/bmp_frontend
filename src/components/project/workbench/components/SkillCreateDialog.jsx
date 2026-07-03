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
      <DialogTitle>
        {t("projectPlanning.addSkillDefinition", "Add Skill Definition")}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ mt: 0.25 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            size="small"
            label={t("projectPlanning.skillName", "Skill")}
            value={form.skillName}
            onChange={(event) =>
              onFormChange({ skillName: event.target.value })
            }
            required
            fullWidth
          />

          <TextField
            size="small"
            label={t("projectPlanning.skillDescription", "Description")}
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
                label={t("projectPlanning.skillCategory", "Category")}
                placeholder={t(
                  "projectPlanning.skillCategoryPlaceholder",
                  "Select or type new category",
                )}
                fullWidth
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("basic.cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={loading || !String(form.skillName || "").trim()}
        >
          {loading ? t("basic.loading", "Loading") : t("basic.save", "Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SkillCreateDialog;
