import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
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
import StaffAdd from "./StaffAdd";
import StaffEdit from "./StaffEdit";
import StaffDelete from "./StaffDelete";
import { AuthContext } from "../../context/authContext";

const StaffModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const { userInfo } = useContext(AuthContext);
  const userCompanyId = userInfo?.companyId || "";
  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";

  const isActiveValue = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    const falseValues = new Set([
      "false",
      "0",
      "no",
      "n",
      "inactive",
      "i",
      "disabled",
      "d",
      "off",
      "f",
    ]);
    if (falseValues.has(normalized)) return false;
    const trueValues = new Set([
      "true",
      "1",
      "yes",
      "y",
      "active",
      "a",
      "enabled",
      "on",
      "t",
    ]);
    if (trueValues.has(normalized)) return true;
    return true;
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request("GET", "/api/staffs"),
      request("GET", "/api/roles"),
      request("GET", "/api/companies"),
    ])
      .then(([staffResponse, rolesResponse, companiesResponse]) => {
        const allStaff = staffResponse.data || [];
        // Filter staff by company unless user is level 9
        const filteredStaff = isUserLevelNine
          ? allStaff
          : allStaff.filter(
              (staff) => String(staff.companyId) === String(userCompanyId),
            );
        setStaffData(filteredStaff);
        setRoles(rolesResponse.data || []);
        setCompanies(companiesResponse.data || []);
      })
      .catch(() => {
        setStaffData([]);
        setRoles([]);
        setCompanies([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh, userCompanyId, isUserLevelNine]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedStaff(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (staff) => {
    setSelectedStaff(staff);
    setAction("edit");
  };

  const handleDelete = async (staff) => {
    setCheckingUsage(true);
    setDeleteError("");
    try {
      // Check if staff has any skill profiles assigned
      const staffId = String(staff?.staffId || "").trim();
      const response = await request(
        "GET",
        `/api/staffskillprofiles/staffid/${encodeURIComponent(staffId)}`,
      );
      const skillProfiles = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
      const usageCount = skillProfiles.length;

      if (usageCount > 0) {
        setDeleteError(
          t(
            "staffList.staffHasSkills",
            "This staff member cannot be deleted because they have {{count}} skill profile(s) assigned. Please remove skill assignments first.",
            { count: usageCount },
          ),
        );
        setSelectedStaff(null);
      } else {
        setSelectedStaff(staff);
        setDeleteMode(true);
      }
    } catch (err) {
      // If check fails, allow delete anyway
      setSelectedStaff(staff);
      setDeleteMode(true);
    }
    setCheckingUsage(false);
  };

  const getRoleName = (staffRoleCode) => {
    const found = roles.find((role) => role.staffRoleCode === staffRoleCode);
    return found ? found.stffRoleName : staffRoleCode;
  };

  const getCompanyName = (companyId) => {
    const found = companies.find(
      (company) => company.companyId === companyId || company.id === companyId,
    );
    return found ? found.companyName || found.name : companyId;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
  };

  const filteredStaff = useMemo(() => {
    if (!search) return staffData;
    const searchLower = search.toLowerCase();
    return staffData.filter((staff) => {
      return (
        staff.staffName?.toLowerCase().includes(searchLower) ||
        staff.staffId?.toLowerCase().includes(searchLower) ||
        staff.staffNumber?.toLowerCase().includes(searchLower) ||
        staff.mobileNumber?.toLowerCase().includes(searchLower) ||
        staff.department?.toLowerCase().includes(searchLower) ||
        String(staff.companyId ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        String(getRoleName(staff.staffRoleCode) ?? "")
          .toLowerCase()
          .includes(searchLower)
      );
    });
  }, [staffData, search, roles, companies]);

  const normalizedStaff = useMemo(() => {
    return filteredStaff.map((staff) => {
      const displayRoleName = getRoleName(staff.staffRoleCode);
      const displayCompanyName = getCompanyName(staff.companyId);
      const displayServiceStartDate = formatDate(staff.serviceStartDate);
      const displayServiceEndDate = formatDate(staff.serviceEndDate);
      const displayActive = isActiveValue(staff.active);

      return {
        ...staff,
        displayRoleName,
        displayCompanyName,
        displayServiceStartDate,
        displayServiceEndDate,
        displayActive,
      };
    });
  }, [filteredStaff, roles, companies]);

  const columns = [
    {
      field: "staffName",
      headerName: t("staffList.name", "Staff Name"),
      flex: 2,
      minWidth: 120,
    },
    {
      field: "staffId",
      headerName: t("staffList.id", "Staff ID"),
      width: 80,
    },
    {
      field: "staffNumber",
      headerName: t("staffList.number", "Staff Number"),
      width: 100,
    },
    {
      field: "mobileNumber",
      headerName: t("staffList.mobileNumber", "Mobile"),
      width: 110,
    },
    {
      field: "department",
      headerName: t("staffList.department", "Department"),
      flex: 1,
      minWidth: 80,
    },
    {
      field: "displayRoleName",
      headerName: t("staffList.role", "Role"),
      width: 100,
    },
    {
      field: "displayCompanyName",
      headerName: t("staffList.company", "Company"),
      flex: 1,
      minWidth: 80,
    },
    {
      field: "displayServiceStartDate",
      headerName: t("staffList.serviceStartDate", "Start"),
      width: 90,
    },
    {
      field: "displayServiceEndDate",
      headerName: t("staffList.serviceEndDate", "End"),
      width: 90,
    },
    {
      field: "displayActive",
      headerName: t("staffList.active", "Active"),
      width: 80,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const activeValue = Boolean(params.row.displayActive);
        return (
          <Chip
            size="small"
            color={activeValue ? "success" : "default"}
            label={
              activeValue
                ? t("staffList.activeYes", "Active")
                : t("staffList.activeNo", "Inactive")
            }
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 120,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      hideable: false,
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
      <LoadingState message={t("staffList.loading", "Loading staff...")} />
    );
  }

  if (deleteMode && selectedStaff) {
    return (
      <StaffDelete
        staff={selectedStaff}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedStaff(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedStaff(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedStaff) {
    return <StaffEdit staff={selectedStaff} onCancel={handleEditCancel} />;
  }

  if (showAdd) {
    return <StaffAdd onCancel={handleAddCancel} />;
  }

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("staffList.title", "Staff Management")}
        subtitle={t(
          "staffList.subtitle",
          "Manage staff profiles and assignments",
        )}
        icon={PeopleIcon}
        actionLabel={t("staffList.addTitle", "Add Staff")}
        onActionClick={() => setShowAdd(true)}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("staffList.helpTitle", "Staff help")}
        content={t(
          "staffList.helpBody",
          "This page lists staff members. Use Add to create a new staff profile. Use Edit or Delete to modify existing records.",
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
          placeholder={t("staffList.searchPlaceholder", "Search staff...")}
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

      {filteredStaff.length === 0 && !loading ? (
        <EmptyState
          title={t("staffList.noStaff", "No staff found")}
          description={
            search
              ? t(
                  "staffList.noSearchResults",
                  "Try adjusting your search terms",
                )
              : t(
                  "staffList.noStaffDescription",
                  "Get started by adding your first staff member",
                )
          }
          actionLabel={!search ? t("staffList.addTitle", "Add Staff") : null}
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={normalizedStaff}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.staffName || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={handleEdit}
              onDelete={checkingUsage ? undefined : handleDelete}
              leadingMedia={{
                placeholder: (
                  <PeopleIcon
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
            height: "calc(100vh - 280px)",
            minHeight: 400,
            width: "100%",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={normalizedStaff}
            columns={columns}
            getRowId={(row) => row.staffName}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
              columns: {
                columnVisibilityModel: {
                  actions: true,
                },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight={false}
            columnVisibilityModel={{
              actions: true,
            }}
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

export default StaffModern;
