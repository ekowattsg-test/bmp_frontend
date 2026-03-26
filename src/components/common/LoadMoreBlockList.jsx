import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Fab, Tooltip, Typography } from "@mui/material";
import { KeyboardArrowUp as KeyboardArrowUpIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_INITIAL_VISIBLE = parsePositiveInt(
  import.meta.env.VITE_LOAD_MORE_INITIAL_VISIBLE,
  10,
);

const DEFAULT_STEP = parsePositiveInt(import.meta.env.VITE_LOAD_MORE_STEP, 10);

const LoadMoreBlockList = ({
  items,
  renderItem,
  initialVisible = DEFAULT_INITIAL_VISIBLE,
  step = DEFAULT_STEP,
  containerSx,
}) => {
  const { t } = useTranslation();
  const normalizedInitialVisible = parsePositiveInt(
    initialVisible,
    DEFAULT_INITIAL_VISIBLE,
  );
  const normalizedStep = parsePositiveInt(step, DEFAULT_STEP);

  const [visibleCount, setVisibleCount] = useState(normalizedInitialVisible);

  useEffect(() => {
    setVisibleCount(normalizedInitialVisible);
  }, [items, normalizedInitialVisible]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  const remaining = Math.max(items.length - visibleItems.length, 0);
  const showBackToTop = visibleCount > normalizedInitialVisible;

  const handleBackToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 2,
          ...containerSx,
        }}
      >
        {visibleItems.map((item, idx) => renderItem(item, idx))}
      </Box>

      {remaining > 0 && (
        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t("common.showingCount", {
              shown: visibleItems.length,
              total: items.length,
              defaultValue: "Showing {{shown}} of {{total}}",
            })}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setVisibleCount((prev) => prev + normalizedStep)}
          >
            {t("common.loadMore", {
              count: remaining,
              defaultValue: "Load More ({{count}})",
            })}
          </Button>
        </Box>
      )}

      {showBackToTop && (
        <Tooltip title={t("common.backToTop", "Back to top")}>
          <Fab
            size="small"
            color="primary"
            onClick={handleBackToTop}
            aria-label={t("common.backToTop", "Back to top")}
            sx={{
              position: "fixed",
              right: 16,
              bottom: 16,
              zIndex: 1200,
            }}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
};

LoadMoreBlockList.propTypes = {
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  initialVisible: PropTypes.number,
  step: PropTypes.number,
  containerSx: PropTypes.object,
};

LoadMoreBlockList.defaultProps = {
  containerSx: {},
};

export default LoadMoreBlockList;
