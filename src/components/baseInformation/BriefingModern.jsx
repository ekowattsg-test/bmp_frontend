import React, { useEffect, useMemo, useState } from "react";
import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Article as ArticleIcon,
  Description as BriefingIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  BlockListItem,
  LoadMoreBlockList,
} from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import HelpDialog from "../common/HelpDialog";
import BriefingAdd from "./BriefingAdd";
import BriefingEdit from "./BriefingEdit";
import BriefingDelete from "./BriefingDelete";

const BriefingModern = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const navigate = useNavigate();

  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [briefings, setBriefings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadBriefings = async () => {
      setLoading(true);
      try {
        const response = await request("GET", "/api/briefings");
        const list = Array.isArray(response?.data) ? response.data : [];
        if (!mounted) return;
        setBriefings(list);
      } catch {
        if (!mounted) return;
        setBriefings([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setRefresh(false);
        }
      }
    };

    loadBriefings();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const normalizedRows = useMemo(
    () =>
      briefings.map((item) => ({
        ...item,
        id: item.briefingId,
        displayActive:
          Number(item.active) === 1
            ? t("basic.true", "True")
            : t("basic.false", "False"),
      })),
    [briefings, t],
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return normalizedRows;

    return normalizedRows.filter((item) => {
      const title = String(item.briefingTitle ?? "").toLowerCase();
      const description = String(item.briefingDescription ?? "").toLowerCase();
      return title.includes(keyword) || description.includes(keyword);
    });
  }, [normalizedRows, search]);

  const columns = [
    {
      field: "briefingTitle",
      headerName: t("briefing.titleLabel", "Title"),
      flex: 1,
      minWidth: 220,
    },
    {
      field: "briefingDescription",
      headerName: t("briefing.descriptionLabel", "Description"),
      flex: 2,
      minWidth: 300,
    },
    {
      field: "displayActive",
      headerName: t("briefing.activeLabel", "Active"),
      flex: 0.6,
      minWidth: 120,
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 150,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <IconButton
            size="small"
            color="info"
            onClick={() => {
              navigate(`/briefing/${params.row.briefingId}/content`, {
                state: { briefing: params.row },
              });
            }}
            title={t("briefingContent.open", "Manage Content")}
          >
            <ArticleIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              setSelectedBriefing(params.row);
              setAction("edit");
            }}
            title={t("basic.edit", "Edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          {Number(params.row?.active) === 0 && (
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setSelectedBriefing(params.row);
                setDeleteMode(true);
              }}
              title={t("basic.delete", "Delete")}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({
      field: c.field,
      label: c.headerName,
    }));

  if (loading) {
    return (
      <LoadingState message={t("briefing.loading", "Loading briefings...")} />
    );
  }

  if (deleteMode && selectedBriefing) {
    return (
      <BriefingDelete
        briefing={selectedBriefing}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedBriefing(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedBriefing(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedBriefing) {
    return (
      <BriefingEdit
        briefing={selectedBriefing}
        onCancel={(edited) => {
          setAction("view");
          setSelectedBriefing(null);
          if (edited) setRefresh(true);
        }}
      />
    );
  }

  if (showAdd) {
    return (
      <BriefingAdd
        onCancel={(added) => {
          setShowAdd(false);
          if (added) setRefresh(true);
        }}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={t("briefing.title", "Briefing Setup")}
        subtitle={t(
          "briefing.subtitle",
          "Browse and review briefing setup records",
        )}
        icon={BriefingIcon}
        onHelpClick={() => setHelpOpen(true)}
        actionLabel={t("briefing.add", "Add")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("briefing.helpTitle", "Briefing Setup Help")}
        content={t(
          "briefing.helpBody",
          "This page lists available briefings and their active status.",
        )}
      />

      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t(
            "briefing.searchPlaceholder",
            "Search briefing setup...",
          )}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={
            search
              ? t(
                  "briefing.noSearchResults",
                  "No matching briefing setup found",
                )
              : t("briefing.noData", "No briefing setup found")
          }
          description={
            search
              ? t(
                  "briefing.noSearchResultsDescription",
                  "Try a different keyword for your search.",
                )
              : t(
                  "briefing.noDataDescription",
                  "No briefing setup records are available.",
                )
          }
          actionLabel={!search ? t("briefing.add", "Add") : null}
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredRows}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.id || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={(row) => {
                setSelectedBriefing(row);
                setAction("edit");
              }}
              onDelete={
                Number(item?.active) === 0
                  ? (row) => {
                      setSelectedBriefing(row);
                      setDeleteMode(true);
                    }
                  : null
              }
              leadingMedia={{
                placeholder: (
                  <BriefingIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
              extraContent={
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => {
                      navigate(`/briefing/${item.briefingId}/content`, {
                        state: { briefing: item },
                      });
                    }}
                    title={t("briefingContent.open", "Manage Content")}
                  >
                    <ArticleIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
              t={t}
            />
          )}
        />
      ) : (
        <Box
          sx={{
            height: 600,
            width: "100%",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight={false}
            sx={{
              border: 0,
              "& .MuiDataGrid-cell:focus": { outline: "none" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "grey.50",
                borderRadius: 0,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default BriefingModern;
