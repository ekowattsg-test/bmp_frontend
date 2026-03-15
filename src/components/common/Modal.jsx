import React from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useTheme,
  useMediaQuery,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

/**
 * Common Modal Component
 * Consolidates modal styling and layout patterns
 *
 * Usage:
 * <Modal
 *   open={true}
 *   title="Modal Title"
 *   onClose={handleClose}
 *   maxWidth="sm"
 * >
 *   <Box>Modal content here</Box>
 * </Modal>
 */
const Modal = ({
  open = false,
  title,
  children,
  onClose,
  maxWidth = "sm",
  fullWidth = true,
  actions,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: "background.paper",
        },
      }}
    >
      {title && (
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 1,
            borderBottom: "2px solid",
            borderColor: "divider",
            background:
              "linear-gradient(to bottom, var(--color-bg-alt), var(--color-white))",
          }}
        >
          <Typography
            component="div"
            variant="h6"
            sx={{ flex: 1, margin: 0, fontWeight: 600 }}
          >
            {title}
          </Typography>
          <IconButton
            onClick={onClose}
            disabled={loading}
            sx={{
              backgroundColor: "background.default",
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              width: 36,
              height: 36,
              padding: 0,
              "&:hover": {
                backgroundColor: "action.hover",
                color: "text.primary",
                borderColor: "text.secondary",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      )}

      <DialogContent sx={{ backgroundColor: "background.default", py: 3 }}>
        {children}
      </DialogContent>

      {actions && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            padding: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
          }}
        >
          {actions}
        </Box>
      )}
    </Dialog>
  );
};

/**
 * Common Modal Form Component
 * For forms with standard layout
 */
export const ModalForm = ({
  open = false,
  title,
  children,
  onClose,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  maxWidth = "sm",
}) => {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      maxWidth={maxWidth}
      loading={loading}
      actions={
        <Box sx={{ display: "flex", gap: 1 }}>
          <button
            onClick={onCancel || onClose}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: "8px 24px",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: "8px 32px",
            }}
          >
            {loading ? "Processing..." : submitLabel}
          </button>
        </Box>
      }
    >
      {children}
    </Modal>
  );
};

export default Modal;
