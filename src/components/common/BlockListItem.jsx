import React from "react";
import PropTypes from "prop-types";
import { Box, Paper, IconButton } from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { getDisplayImageInfo, ThumbnailImg } from "../../helpers/file_helper";

/**
 * BlockListItem Component
 * Renders a single list item in responsive block layout for mobile/tablet screens
 *
 * @param {Object} props
 * @param {Array} props.columns - Column keys to display
 * @param {Object} props.item - Data item to render
 * @param {Function} props.onEdit - Callback for edit action
 * @param {Function} props.onDelete - Callback for delete action
 * @param {Object} props.t - Translation function from i18n
 * @param {boolean} props.enableActions - Whether to show action buttons (default: true)
 * @returns {JSX.Element}
 */
const BlockListItem = ({
  columns = [],
  columnDefs,
  item = {},
  onView,
  onEdit,
  onDelete,
  t,
  enableActions = true,
  leadingMedia,
}) => {
  const formatValue = (value) => {
    if (typeof value === "boolean") {
      return t ? t(`basic.${value ? "true" : "false"}`) : value ? "Yes" : "No";
    }
    return value;
  };

  const renderLeadingMedia = () => {
    if (!leadingMedia) return null;

    const {
      field,
      altFields = [],
      placeholder,
      onClick,
      width = 40,
      height = 40,
    } = leadingMedia;

    const mediaValue = field ? item[field] : undefined;
    const imageInfo = mediaValue ? getDisplayImageInfo(mediaValue) : null;
    const meta = imageInfo?.meta || null;
    let src = imageInfo?.imageUrl || null;

    if (!src && typeof mediaValue === "string") {
      const trimmed = mediaValue.trim();
      if (trimmed.startsWith("data:")) src = trimmed;
      else if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) && trimmed.length > 100) {
        src = `data:image/png;base64,${trimmed}`;
      }
    }

    const alt =
      [altFields]
        .flat()
        .map((fieldName) => item[fieldName])
        .find(Boolean) || "";

    const handleClick =
      typeof onClick === "function"
        ? (event) => {
            event.stopPropagation();
            onClick(item, event);
          }
        : undefined;

    return (
      <Box
        sx={{
          width,
          height,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1,
          overflow: "hidden",
          backgroundColor: "background.alt",
        }}
      >
        {meta?.id ? (
          <ThumbnailImg
            fileId={meta.id}
            viewUrl={meta.viewUrl || ""}
            provider={meta.provider || null}
            width={width}
            height={height}
            alt={alt}
            style={{
              borderRadius: 4,
              cursor: handleClick ? "pointer" : "default",
            }}
            onClick={handleClick}
          />
        ) : src ? (
          <img
            src={src}
            alt={alt}
            style={{
              width,
              height,
              objectFit: "cover",
              borderRadius: 4,
              cursor: handleClick ? "pointer" : "default",
            }}
            referrerPolicy="no-referrer"
            onClick={handleClick}
          />
        ) : (
          placeholder || null
        )}
      </Box>
    );
  };

  // Use columnDefs (from DataGrid columns) if provided, else derive from columns array
  const effectiveCols = columnDefs
    ? columnDefs
    : columns.map((col) => ({
        field: col,
        label: t ? t(`list.${col}`, col) : col,
      }));

  return (
    <Paper
      sx={{
        p: 2,
        boxShadow: 1,
        border: "1px solid var(--color-gray-200)",
        borderRadius: 1,
        backgroundColor: "background.paper",
        display: "flex",
        gap: 2,
        alignItems: "flex-start",
      }}
    >
      {leadingMedia && renderLeadingMedia()}

      {/* Content area - left side */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          flex: 1,
          minWidth: 0,
        }}
      >
        {effectiveCols.map(({ field, label }) => (
          <Box
            key={field}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.25,
            }}
          >
            <Box
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {label}
            </Box>
            <Box
              sx={{
                fontSize: "0.95rem",
                color: "text.primary",
                fontWeight: 500,
                wordBreak: "break-word",
              }}
            >
              {formatValue(item[field])}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Actions - right side */}
      {enableActions && (onView || onEdit || onDelete) && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          {onView && (
            <IconButton
              size="small"
              color="info"
              onClick={(e) => {
                e.stopPropagation();
                onView(item);
              }}
              title={t ? t("basic.view", "View") : "View"}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          {onEdit && (
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              title={t ? t("basic.edit", "Edit") : "Edit"}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              title={t ? t("basic.delete", "Delete") : "Delete"}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default BlockListItem;

BlockListItem.propTypes = {
  columns: PropTypes.array,
  columnDefs: PropTypes.arrayOf(
    PropTypes.shape({ field: PropTypes.string, label: PropTypes.string }),
  ),
  item: PropTypes.object,
  onView: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  t: PropTypes.func,
  enableActions: PropTypes.bool,
  leadingMedia: PropTypes.shape({
    field: PropTypes.string,
    altFields: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string,
    ]),
    placeholder: PropTypes.node,
    onClick: PropTypes.func,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
};
