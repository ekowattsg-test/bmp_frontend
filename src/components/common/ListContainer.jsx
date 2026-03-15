import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material";

/**
 * Common List Container Component
 * Provides standardized UI for list views with search, add, edit, and delete actions
 *
 * Usage:
 * <ListContainer
 *   title="Users"
 *   searchPlaceholder="Search users..."
 *   data={userData}
 *   columns={['name', 'email', 'role']}
 *   t={t}
 *   onAdd={() => setShowAdd(true)}
 *   onEdit={(item) => handleEdit(item)}
 *   onDelete={(item) => handleDelete(item)}
 *   enableActions={true}
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   filterFunction={(item) => filterLogic(item)}
 * />
 */
const ListContainer = ({
  title,
  subtitle,
  onHelpClick,
  searchPlaceholder = "Search...",
  data = [],
  columns = [],
  t,
  onAdd,
  onEdit,
  onDelete,
  onSearchChange,
  searchValue = "",
  enableActions = true,
  filterFunction,
  customRender,
  loading = false,
  emptyMessage = "No data available",
}) => {
  const filtered = filterFunction
    ? data.filter(filterFunction)
    : data.filter((item) => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return true;
        // Search across all column values
        return Object.values(item).some((val) =>
          String(val).toLowerCase().includes(q),
        );
      });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header with Title & Search */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {subtitle && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {subtitle}
              </Typography>
              {onHelpClick && (
                <IconButton
                  size="small"
                  aria-label="help"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHelpClick();
                  }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>

        <TextField
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          size="small"
          sx={{ minWidth: 220 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {enableActions && onAdd && (
          <IconButton
            color="primary"
            aria-label="add item"
            onClick={onAdd}
            size="medium"
          >
            <AddIcon />
          </IconButton>
        )}
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          Loading...
        </Box>
      ) : filtered && Array.isArray(filtered) && filtered.length > 0 ? (
        <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: "background.default" }}>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col}
                    align={col === "active" ? "center" : "left"}
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    {t ? t(`list.${col}`, col) : col}
                  </TableCell>
                ))}
                {enableActions && (
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    {t ? t("basic.actions", "Actions") : "Actions"}
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      align={col === "active" ? "center" : "left"}
                    >
                      {typeof item[col] === "boolean"
                        ? t
                          ? t(`basic.${item[col] ? "true" : "false"}`)
                          : item[col]
                            ? "Yes"
                            : "No"
                        : item[col]}
                    </TableCell>
                  ))}
                  {enableActions && (
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "center",
                        }}
                      >
                        {onEdit && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(item);
                            }}
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
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          {emptyMessage}
        </Box>
      )}
    </Box>
  );
};

export default ListContainer;
