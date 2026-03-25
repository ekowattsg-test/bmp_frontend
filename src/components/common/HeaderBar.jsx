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
  titleVariant = "h6",
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
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        mb: 2,
        minWidth: 0,
        ...sx,
      }}
    >
      {/* Left section: back/icon button + title + subtitle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
          flex: 1,
        }}
      >
        {showBackButton && onBack && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{
              textTransform: "none",
              color: "text.primary",
              "&:hover": {
                backgroundColor: "action.hover",
              },
              flexShrink: 0,
              fontSize: "inherit",
              padding: "inherit",
            }}
          >
            {backLabel}
          </Button>
        )}

        {icon && !showBackButton && <Box sx={{ flexShrink: 0 }}>{icon}</Box>}

        {/* Title row + subtitle row */}
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 0.25,
            overflow: "hidden",
          }}
        >
          <Box
            component="h2"
            sx={{
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              minWidth: 0,
              width: "fit-content",
              maxWidth: "100%",
              flexWrap: "nowrap",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <Typography
              variant={titleVariant}
              component="span"
              noWrap
              sx={{
                margin: 0,
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "1.25rem",
                minWidth: 0,
                maxWidth: "100%",
                flex: "0 1 auto",
                lineHeight: 1.2,
                ...titleSx,
              }}
            >
              {title}
            </Typography>
          </Box>

          {subtitle && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "nowrap",
                minWidth: 0,
                width: "auto",
                maxWidth: "100%",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                sx={{
                  display: "inline-block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "0.875rem",
                  minWidth: 0,
                  maxWidth: "100%",
                  flex: "0 1 auto",
                  lineHeight: 1.2,
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
            </Box>
          )}
        </Box>
      </Box>

      {/* Right section: action buttons */}
      {actions && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexShrink: 0,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
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
