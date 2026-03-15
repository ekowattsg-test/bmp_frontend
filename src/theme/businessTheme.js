import { createTheme } from "@mui/material/styles";

/**
 * Professional Business Theme Configuration
 * Designed for enterprise-level applications with modern aesthetics
 */
export const businessTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#9DC639", // Website primary green
      light: "#E8F5E0",
      dark: "#8BB833",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#8BB833", // Website primary-dark
      light: "#9DC639",
      dark: "#7AA82A",
      contrastText: "#ffffff",
    },
    success: {
      main: "#9DC639",
      light: "#E8F5E0",
      dark: "#8BB833",
    },
    warning: {
      main: "#ed6c02",
      light: "#ff9800",
      dark: "#e65100",
    },
    error: {
      main: "#d32f2f",
      light: "#ef5350",
      dark: "#c62828",
    },
    info: {
      main: "#8BB833",
      light: "#9DC639",
      dark: "#7AA82A",
    },
    background: {
      default: "#f8f9fa", // Website bg-light-gray
      paper: "#ffffff",
    },
    text: {
      primary: "#5a6673", // Website text-primary
      secondary: "#666", // Website text-secondary
      disabled: "#bdbdbd",
    },
    divider: "#e0e0e0",
    // Custom colors for business UI
    sidebar: {
      background: "#1e293b",
      text: "#e2e8f0",
      hover: "#334155",
      active: "#9DC639",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.01562em",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "-0.00833em",
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.43,
    },
    button: {
      fontSize: "0.875rem",
      fontWeight: 500,
      textTransform: "none", // Professional: no all-caps
      letterSpacing: "0.02857em",
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.66,
    },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 600,
      lineHeight: 2.66,
      textTransform: "uppercase",
      letterSpacing: "0.08333em",
    },
  },
  shape: {
    borderRadius: 8, // Rounded corners for modern look
  },
  spacing: 8, // Base spacing unit (8px)
  shadows: [
    "none",
    "0px 2px 4px rgba(0, 0, 0, 0.05)",
    "0px 4px 8px rgba(0, 0, 0, 0.08)",
    "0px 8px 16px rgba(0, 0, 0, 0.1)",
    "0px 12px 24px rgba(0, 0, 0, 0.12)",
    "0px 16px 32px rgba(0, 0, 0, 0.14)",
    "0px 20px 40px rgba(0, 0, 0, 0.16)",
    "0px 24px 48px rgba(0, 0, 0, 0.18)",
    "0px 32px 64px rgba(0, 0, 0, 0.2)",
    // ... keeping default for remaining shadow levels
    ...Array(16).fill("0px 32px 64px rgba(0, 0, 0, 0.2)"),
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          borderRadius: 12,
          border: "1px solid #e0e0e0",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
          padding: "8px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          },
        },
        sizeLarge: {
          padding: "12px 24px",
          fontSize: "1rem",
        },
        sizeSmall: {
          padding: "4px 12px",
          fontSize: "0.8125rem",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
      defaultProps: {
        variant: "outlined",
        size: "small",
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        },
        elevation2: {
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          borderRight: "1px solid #e0e0e0",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #f0f0f0",
        },
        head: {
          fontWeight: 600,
          backgroundColor: "#fafafa",
          color: "#424242",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#424242",
          fontSize: "0.75rem",
          borderRadius: 6,
          padding: "8px 12px",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// Custom theme extensions for specific use cases
export const customColors = {
  charts: {
    blue: "#0288d1",
    green: "#9DC639",
    orange: "#ed6c02",
    purple: "#9c27b0",
    red: "#d32f2f",
    cyan: "#0288d1",
    pink: "#e91e63",
    teal: "#009688",
  },
  status: {
    active: "#9DC639",
    inactive: "#9e9e9e",
    pending: "#ff9800",
    error: "#f44336",
  },
};

export default businessTheme;
