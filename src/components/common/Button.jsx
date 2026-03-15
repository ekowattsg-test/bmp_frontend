import React from "react";
import { Button as MuiButton, CircularProgress, Box } from "@mui/material";

/**
 * Common Button Component
 * Standardizes button styling and behavior across the application
 *
 * Usage:
 * <Button variant="primary" onClick={handleClick}>Click me</Button>
 * <Button variant="success" size="sm" loading={isLoading}>Submit</Button>
 */
const Button = ({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = "start",
  fullWidth = false,
  className,
  ...props
}) => {
  const variantMap = {
    primary: {
      backgroundColor: "var(--color-primary)",
      color: "var(--color-white)",
      "&:hover": {
        backgroundColor: "var(--color-primary-hover)",
      },
    },
    secondary: {
      backgroundColor: "var(--color-gray-100)",
      color: "var(--color-dark)",
      border: "1px solid var(--color-gray-300)",
      "&:hover": {
        backgroundColor: "var(--color-gray-200)",
      },
    },
    success: {
      backgroundColor: "var(--color-success)",
      color: "var(--color-white)",
      "&:hover": {
        backgroundColor: "var(--color-success-hover)",
      },
    },
    danger: {
      backgroundColor: "var(--color-danger)",
      color: "var(--color-white)",
      "&:hover": {
        backgroundColor: "var(--color-danger-hover)",
      },
    },
    warning: {
      backgroundColor: "var(--color-warning)",
      color: "var(--color-dark)",
      "&:hover": {
        backgroundColor: "var(--color-warning-hover)",
      },
    },
    info: {
      backgroundColor: "var(--color-info)",
      color: "var(--color-white)",
      "&:hover": {
        backgroundColor: "var(--color-info-hover)",
      },
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--color-primary)",
      border: "1px solid var(--color-primary)",
      "&:hover": {
        backgroundColor: "var(--color-primary-light)",
      },
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--color-primary)",
      "&:hover": {
        backgroundColor: "var(--color-primary-alpha-10)",
      },
    },
  };

  const sizeMap = {
    xs: {
      padding: "4px 8px",
      fontSize: "11px",
    },
    sm: {
      padding: "6px 12px",
      fontSize: "12px",
    },
    md: {
      padding: "10px 16px",
      fontSize: "14px",
    },
    lg: {
      padding: "12px 24px",
      fontSize: "16px",
    },
    xl: {
      padding: "14px 32px",
      fontSize: "16px",
    },
  };

  const isDisabled = disabled || loading;

  return (
    <MuiButton
      variant="contained"
      disabled={isDisabled}
      fullWidth={fullWidth}
      sx={{
        ...variantMap[variant],
        ...sizeMap[size],
        textTransform: "none",
        fontWeight: 600,
        borderRadius: "6px",
        transition: "all 0.3s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        "&:disabled": {
          opacity: 0.6,
          cursor: "not-allowed",
        },
        ...(loading && {
          opacity: 0.8,
        }),
      }}
      className={className}
      {...props}
    >
      {loading ? (
        <>
          <CircularProgress size={16} color="inherit" />
          {children}
        </>
      ) : Icon ? (
        <>
          {iconPosition === "start" && <Icon style={{ fontSize: "1.1em" }} />}
          {children}
          {iconPosition === "end" && <Icon style={{ fontSize: "1.1em" }} />}
        </>
      ) : (
        children
      )}
    </MuiButton>
  );
};

export default Button;
