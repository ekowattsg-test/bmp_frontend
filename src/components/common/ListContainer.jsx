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
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import HeaderBar from "./HeaderBar";
import BlockListItem from "./BlockListItem";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

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
  const { shouldUseBlockLayout } = useResponsiveLayout();

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
      <HeaderBar
        title={title}
        subtitle={subtitle}
        onHelp={onHelpClick}
        actions={
          <>
            <TextField
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              size="small"
              sx={{ minWidth: { xs: 160, sm: 200 } }}
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
                sx={{ flexShrink: 0 }}
              >
                <AddIcon />
              </IconButton>
            )}
          </>
        }
      />

      {/* Content */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          Loading...
        </Box>
      ) : filtered && Array.isArray(filtered) && filtered.length > 0 ? (
        <>
          {/* Table Layout - visible on md and larger or when block layout is disabled */}
          {!shouldUseBlockLayout && (
            <TableContainer
              component={Paper}
              sx={{
                boxShadow: 1,
                overflowX: "auto",
                overflowY: "hidden",
                "-webkit-overflow-scrolling": "touch",
              }}
            >
              <Table size="small" sx={{ minWidth: 500 }}>
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
          )}

          {/* Block Layout - visible on small screens when enabled */}
          {shouldUseBlockLayout && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 2,
              }}
            >
              {filtered.map((item, idx) => (
                <BlockListItem
                  key={idx}
                  columns={columns}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  t={t}
                  enableActions={enableActions}
                />
              ))}
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          {emptyMessage}
        </Box>
      )}
    </Box>
  );
};

export default ListContainer;
