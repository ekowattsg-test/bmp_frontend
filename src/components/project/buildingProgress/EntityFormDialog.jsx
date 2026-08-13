import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const EntityFormDialog = ({
  open,
  onClose,
  onSave,
  title,
  entity,
  fields,
  saving,
  error,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const initial = {};
    fields.forEach((field) => {
      initial[field.key] = entity?.[field.key] ?? field.default ?? "";
    });
    setForm(initial);
    setErrors({});
  }, [open, entity, fields]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    fields.forEach((field) => {
      if (field.required && !String(form[field.key] || "").trim()) {
        nextErrors[field.key] = t("basic.validationRequired", "Required");
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
          {fields.map((field) => {
            if (field.type === "select") {
              return (
                <FormControl
                  fullWidth
                  key={field.key}
                  error={!!errors[field.key]}
                >
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    name={field.key}
                    value={form[field.key] ?? ""}
                    label={field.label}
                    onChange={(event) =>
                      handleChange(field.key, event.target.value)
                    }
                    required={field.required}
                  >
                    <MenuItem value="">
                      <em>{field.emptyLabel || "-"}</em>
                    </MenuItem>
                    {(field.options || []).map((option) => (
                      <MenuItem
                        key={String(option.value || "")}
                        value={String(option.value || "")}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
            return (
              <TextField
                key={field.key}
                name={field.key}
                label={field.label}
                type={field.type || "text"}
                value={form[field.key] ?? ""}
                onChange={(event) =>
                  handleChange(field.key, event.target.value)
                }
                error={!!errors[field.key]}
                helperText={errors[field.key]}
                required={field.required}
                fullWidth
                multiline={field.multiline}
                rows={field.rows}
                inputProps={field.inputProps}
              />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t("basic.cancel", "Cancel")}
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {t("basic.save", "Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EntityFormDialog;
