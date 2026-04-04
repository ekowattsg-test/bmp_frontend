import React from "react";
import PropTypes from "prop-types";
import { Box, Button, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

/**
 * Reusable header bar component that keeps title-subtitle-help on one line
 * Works responsively on narrow screens with text truncation
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Optional icon/button on the left
 * @param {string} props.title - Main title text
 * @param {string} props.subtitle - Optional subtitle/description text
 * @param {boolean} props.showBackButton - Show back button instead of custom icon
 * @param {function} props.onBack - Callback for back button
 * @param {function} props.onHelp - Callback for help button
 * @param {React.ReactNode} props.actions - Optional action buttons on the right
 * @param {object} props.sx - Additional MUI sx props for the container
 * @param {string} props.backLabel - Label for back button (default: "Back")
 */
const HeaderBar = ({
  icon,
  title,
  subtitle,
  titleVariant = "h5",
  showBackButton = false,
  onBack,
  onHelp,
  actions,
  titleSx,
  subtitleSx,
  sx = {},
  backLabel = "Back",
}) => {
  return (
    <Box
      style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", alignItems: "flex-start" }}
      sx={{ gap: 1.5, mb: 2, minWidth: 0, ...sx }}
    >
      {/* Back button or icon */}
      {showBackButton && onBack && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{
            textTransform: "none",
            color: "text.primary",
            flexShrink: 0,
            "&:hover": { backgroundColor: "action.hover" },
          }}
        >
          {backLabel}
        </Button>
      )}
      {icon && !showBackButton && (
        <Box style={{ flexShrink: 0 }}>{icon}</Box>
      )}

      {/* Title + subtitle column — grows to fill space */}
      <Box
        style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
        sx={{ gap: 0.25 }}
      >
        <Typography
          variant={titleVariant}
          sx={{
            fontWeight: 600,
            fontSize: { xs: "1.125rem", sm: "1.5rem" },
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...titleSx,
          }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: "0.875rem",
              lineHeight: 1.4,
              wordBreak: "break-word",
              ...subtitleSx,
            }}
          >
            {subtitle}
            {onHelp && (
              <Box
                component="span"
                role="button"
                tabIndex={0}
                aria-label="help"
                onClick={onHelp}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onHelp();
                  }
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  border: "1px solid",
                  borderColor: "text.secondary",
                  borderRadius: "50%",
                  ml: 0.5,
                  fontSize: "0.65rem",
                  lineHeight: 1,
                  color: "text.secondary",
                  cursor: "pointer",
                  userSelect: "none",
                  verticalAlign: "text-bottom",
                }}
              >
                ?
              </Box>
            )}
          </Typography>
        )}
      </Box>

      {/* Right section: action buttons */}
      {actions && (
        <Box style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end" }} sx={{ gap: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

HeaderBar.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  titleVariant: PropTypes.string,
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  onHelp: PropTypes.func,
  actions: PropTypes.node,
  titleSx: PropTypes.object,
  subtitleSx: PropTypes.object,
  sx: PropTypes.object,
  backLabel: PropTypes.string,
};

export default HeaderBar;
