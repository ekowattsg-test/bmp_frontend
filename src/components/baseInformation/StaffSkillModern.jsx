import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AutoStories as SkillIcon,
} from "@mui/icons-material";
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
import StaffSkillAdd from "./StaffSkillAdd";
import StaffSkillEdit from "./StaffSkillEdit";
import StaffSkillDelete from "./StaffSkillDelete";

const StaffSkillModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [skillData, setSkillData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const [checkingUsage, setCheckingUsage] = useState(false);
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const [helpOpen, setHelpOpen] = useState(false);
  const showAddSkillButton = false;

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/staffskills")
      .then((response) => {
        setSkillData(response.data || []);
      })
      .catch(() => {
        setSkillData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedSkill(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (skill) => {
    setSelectedSkill(skill);
    setAction("edit");
  };

  const handleDelete = async (skill) => {
    setCheckingUsage(true);
    setDeleteError("");
    try {
      // Check if skill is used in any staff skill profiles
      const response = await request(
        "GET",
        `/api/staffskillprofiles/skill/${skill.staffSkillId}`,
      );
      const usageCount = response.data ? response.data.length : 0;

      if (usageCount > 0) {
        setDeleteError(
          t(
            "staffSkillList.skillInUse",
            "This skill cannot be deleted because it is assigned to {{count}} staff member(s). Please remove it from staff assignments first.",
            { count: usageCount },
          ),
        );
        setSelectedSkill(null);
      } else {
        setSelectedSkill(skill);
        setDeleteMode(true);
      }
    } catch (err) {
      // If check fails, allow delete anyway
      setSelectedSkill(skill);
      setDeleteMode(true);
    }
    setCheckingUsage(false);
  };

  const filteredSkills = skillData.filter((skill) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      skill.skillName?.toLowerCase().includes(searchLower) ||
      skill.skillDescription?.toLowerCase().includes(searchLower) ||
      skill.skillCategory?.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      field: "skillName",
      headerName: t("staffSkillList.skillName", "Skill Name"),
      flex: 1,
      minWidth: 180,
    },
    {
      field: "skillDescription",
      headerName: t("staffSkillList.skillDescription", "Description"),
      flex: 2,
      minWidth: 220,
    },
    {
      field: "skillCategory",
      headerName: t("staffSkillList.skillCategory", "Category"),
      flex: 1,
      minWidth: 160,
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 120,
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
            color="primary"
            onClick={() => handleEdit(params.row)}
            title={t("basic.edit", "Edit")}
            disabled={checkingUsage}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            title={t("basic.delete", "Delete")}
            disabled={checkingUsage}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <LoadingState
        message={t("staffSkillList.loading", "Loading staff skills...")}
      />
    );
  }

  if (deleteMode && selectedSkill) {
    return (
      <StaffSkillDelete
        skill={selectedSkill}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedSkill(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedSkill(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedSkill) {
    return <StaffSkillEdit skill={selectedSkill} onCancel={handleEditCancel} />;
  }

  if (showAdd) {
    return <StaffSkillAdd onCancel={handleAddCancel} />;
  }

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("staffSkillList.title", "Staff Skill List")}
        subtitle={t(
          "staffSkillList.subtitle",
          "Manage staff skill definitions and categories",
        )}
        onHelpClick={() => setHelpOpen(true)}
        icon={SkillIcon}
        actionLabel={
          showAddSkillButton ? t("staffSkillList.addTitle", "Add Skill") : null
        }
        onActionClick={showAddSkillButton ? () => setShowAdd(true) : undefined}
      />
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("staffSkillList.helpTitle", "Staff skill help")}
        content={t(
          "staffSkillList.helpBody",
          "This page manages staff skills and their categories. Use Add to create a skill, Edit to change details, and Delete to remove a skill.",
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            "staffSkillList.searchPlaceholder",
            "Search skills...",
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

      {deleteError && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger-text)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">{deleteError}</Typography>
          <IconButton
            size="small"
            onClick={() => setDeleteError("")}
            sx={{ color: "var(--color-danger-text)" }}
          >
            ✕
          </IconButton>
        </Box>
      )}

      {filteredSkills.length === 0 && !loading ? (
        <EmptyState
          title={t("staffSkillList.noSkills", "No skills found")}
          description={
            search
              ? t(
                  "staffSkillList.noSearchResults",
                  "Try adjusting your search terms",
                )
              : t(
                  "staffSkillList.noSkillsDescription",
                  "Get started by adding your first skill",
                )
          }
          actionLabel={
            !search ? t("staffSkillList.addTitle", "Add Skill") : null
          }
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredSkills}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.staffSkillId || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              leadingMedia={{
                placeholder: (
                  <SkillIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
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
            rows={filteredSkills}
            columns={columns}
            getRowId={(row) => row.staffSkillId}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
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
              "& .MuiDataGrid-footerContainer": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                minHeight: "52px",
                gap: "12px",
              },
              "& .MuiTablePagination-root": {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default StaffSkillModern;
