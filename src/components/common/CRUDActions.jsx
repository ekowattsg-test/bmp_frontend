import React from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { useTranslation } from "react-i18next";

/**
 * Common Modal Dialog for Delete Confirmation
 */
export const DeleteConfirmationDialog = ({
  open = false,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "error.main",
        }}
      >
        <WarningIcon />
        {title}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>{message}</Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
          sx={{
            backgroundColor: "background.default",
            color: "text.primary",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color="error"
          sx={{
            "&:hover": {
              backgroundColor: "error.dark",
            },
          }}
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Common Error Dialog
 */
export const ErrorDialog = ({
  open = false,
  title = "Error",
  message = "An error occurred",
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: "error.main" }}>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2, color: "error.main" }}>{message}</Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="error">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Common Success Dialog
 */
export const SuccessDialog = ({
  open = false,
  title = "Success",
  message = "Operation completed successfully",
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: "success.main" }}>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2, color: "success.main" }}>{message}</Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="success">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Common Form Actions Bar (Cancel/Submit buttons)
 */
export const FormActions = ({
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  loading = false,
  variant = "standard", // 'standard' or 'inline'
}) => {
  const { t } = useTranslation();
  const resolvedCancelLabel = cancelLabel ?? t("basic.cancel", "Cancel");
  const resolvedSubmitLabel = submitLabel ?? t("basic.save", "Save");
  const baseStyle = {
    display: "flex",
    gap: 1,
    justifyContent: "flex-end",
    ...(variant === "inline" && {
      position: "sticky",
      bottom: 0,
      backgroundColor: "background.paper",
      padding: 2,
      borderTop: "1px solid",
      borderColor: "divider",
      marginTop: 2,
    }),
  };

  return (
    <Box sx={baseStyle}>
      <Button
        onClick={onCancel}
        disabled={loading}
        variant="outlined"
        sx={{
          color: "text.primary",
          borderColor: "divider",
          backgroundColor: "background.default",
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
      >
        {resolvedCancelLabel}
      </Button>
      <Button
        onClick={onSubmit}
        disabled={loading}
        variant="contained"
        color="primary"
        sx={{
          "&:hover": {
            backgroundColor: "primary.dark",
          },
        }}
      >
        {loading ? t("basic.processing", "Processing...") : resolvedSubmitLabel}
      </Button>
    </Box>
  );
};

/**
 * View/Edit/Delete State Manager Hook
 * Simplifies common CRUD operations
 */
export const useCRUDState = () => {
  const [action, setAction] = React.useState("view"); // 'view', 'add', 'edit', 'delete'
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleAdd = () => {
    setAction("add");
    setSelectedItem(null);
  };

  const handleEdit = (item) => {
    setAction("edit");
    setSelectedItem(item);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setShowDeleteConfirm(true);
  };

  const handleCancel = () => {
    setAction("view");
    setSelectedItem(null);
    setError(null);
  };

  const handleConfirmDelete = async (deleteCallback) => {
    setLoading(true);
    try {
      await deleteCallback(selectedItem);
      setShowDeleteConfirm(false);
      setSelectedItem(null);
    } catch (err) {
      setError(err.message || "Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  return {
    action,
    setAction,
    selectedItem,
    setSelectedItem,
    showDeleteConfirm,
    setShowDeleteConfirm,
    loading,
    setLoading,
    error,
    setError,
    handleAdd,
    handleEdit,
    handleDelete,
    handleCancel,
    handleConfirmDelete,
  };
};
