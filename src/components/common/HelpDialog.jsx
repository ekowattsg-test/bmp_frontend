import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

const HelpDialog = ({ open, onClose, title, content, children }) => {
  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {children || (
          <Typography
            variant="body2"
            component="div"
            sx={{ whiteSpace: "pre-line" }}
          >
            {content}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{"Close"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
