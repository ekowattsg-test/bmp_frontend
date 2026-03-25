import { useTheme, useMediaQuery } from "@mui/material";

/**
 * Hook to determine responsive layout type for data lists
 * Returns whether to use block layout (mobile/tablet) or table layout (desktop)
 *
 * @returns {Object} { isSmallScreen: boolean, shouldUseBlockLayout: boolean }
 */
export const useResponsiveLayout = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const isEnabled = import.meta.env.VITE_ENABLE_RESPONSIVE_BLOCKS === "true";

  return {
    isSmallScreen,
    shouldUseBlockLayout: isSmallScreen && isEnabled,
  };
};

export default useResponsiveLayout;
