import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  Typography,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { ListContainer, BlockListItem, LoadMoreBlockList } from "../common";
import StaffMeritAdd from "./StaffMeritAdd";
import StaffMeritEdit from "./StaffMeritEdit";

const resolveStaffId = (value) => {
  const normalized =
    typeof value === "object" && value !== null
      ? String(value?.staffId || "").trim()
      : String(value || "").trim();
  return normalized || null;
};

const toCategoryLabel = (category, t) => {
  const normalized = String(category || "")
    .trim()
    .toUpperCase();
  if (normalized === "D") return t("staffManagement.meritCategoryDemerit");
  return t("staffManagement.meritCategoryMerit");
};

const getDocumentationCount = (meritProfile) => {
  try {
    const docs = meritProfile?.documentationLink
      ? JSON.parse(meritProfile.documentationLink)
      : null;
    if (Array.isArray(docs)) return docs.length;
    return docs ? 1 : 0;
  } catch {
    return meritProfile?.documentationLink ? 1 : 0;
  }
};

const StaffMeritProfile = ({ onBack }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const { shouldUseBlockLayout } = useResponsiveLayout();

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState("");
  const [refreshStaff, setRefreshStaff] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffMerits, setStaffMerits] = useState([]);
  const [meritsLoading, setMeritsLoading] = useState(false);
  const [meritSearch, setMeritSearch] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [meritToDelete, setMeritToDelete] = useState(null);
  const [error, setError] = useState("");

  const [showAddFrame, setShowAddFrame] = useState(false);
  const [showEditFrame, setShowEditFrame] = useState(false);
  const [meritToEdit, setMeritToEdit] = useState(null);

  const [meritDefinitionMap, setMeritDefinitionMap] = useState({});
  const [userLoginMap, setUserLoginMap] = useState({});

  const fetchMeritDefinitionMap = async () => {
    try {
      const response = await request("GET", "/api/staffmerits");
      const rows = Array.isArray(response?.data) ? response.data : [];
      return rows.reduce((acc, row) => {
        const key = String(row?.staffMeritId || "").trim();
        if (key) acc[key] = row;
        return acc;
      }, {});
    } catch {
      return {};
    }
  };

  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const canDeleteProfileRecord = Number(userLevel) >= 5;
  const userCompanyId = userInfo?.companyId;

  useEffect(() => {
    const loadMeritDefinitions = async () => {
      const map = await fetchMeritDefinitionMap();
      setMeritDefinitionMap(map);
    };

    loadMeritDefinitions();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await request("GET", "/api/users");
        const rows = Array.isArray(response?.data)
          ? response.data
          : response?.data?.items || [];
        const map = rows.reduce((acc, user) => {
          const key = String(user?.id || "").trim();
          if (key) {
            acc[key] = String(user?.login || "").trim();
          }
          return acc;
        }, {});
        setUserLoginMap(map);
      } catch {
        setUserLoginMap({});
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    loadStaffList();
  }, [userCompanyId, isUserLevelNine, refreshStaff]);

  useEffect(() => {
    if (!selectedStaff?.staffId) return;
    loadStaffMerits(selectedStaff.staffId);
  }, [meritDefinitionMap, userLoginMap]);

  const loadStaffList = async () => {
    try {
      setStaffLoading(true);
      const response = await request("GET", "/api/staffs");
      let staffs = Array.isArray(response?.data)
        ? response.data
        : response?.data?.items || [];

      if (!isUserLevelNine && userCompanyId) {
        staffs = staffs.filter((staff) => staff.companyId === userCompanyId);
      }

      const staffsWithMeritData = await Promise.all(
        staffs.map(async (staff) => {
          try {
            const staffId = resolveStaffId(staff);
            if (!staffId) {
              return {
                ...staff,
                meritCount: 0,
                totalMeritPoints: 0,
              };
            }

            const meritResponse = await request(
              "GET",
              `/api/staffmeritprofiles?staffId=${encodeURIComponent(staffId)}`,
            );
            const profiles = Array.isArray(meritResponse?.data)
              ? meritResponse.data
              : [];

            const totalMeritPoints = profiles.reduce(
              (sum, row) => sum + Number(row?.meritPoints || 0),
              0,
            );

            return {
              ...staff,
              meritCount: profiles.length,
              totalMeritPoints,
            };
          } catch {
            return {
              ...staff,
              meritCount: 0,
              totalMeritPoints: 0,
            };
          }
        }),
      );

      setStaffList(staffsWithMeritData);
    } catch {
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const loadStaffMerits = async (
    staffIdValue,
    definitionMapOverride = null,
  ) => {
    try {
      setMeritsLoading(true);
      setError("");
      const staffId = resolveStaffId(staffIdValue);
      if (!staffId) {
        setStaffMerits([]);
        return;
      }

      const response = await request(
        "GET",
        `/api/staffmeritprofiles?staffId=${encodeURIComponent(staffId)}`,
      );
      const profiles = Array.isArray(response?.data) ? response.data : [];
      const activeDefinitionMap = definitionMapOverride || meritDefinitionMap;

      const withDetails = profiles.map((profile) => {
        const meritDefinition =
          activeDefinitionMap[String(profile?.staffMeritId || "").trim()] || {};
        const issuedByRaw = String(profile?.issuedBy || "").trim();
        const issuedByDisplay = userLoginMap[issuedByRaw] || issuedByRaw;
        return {
          ...profile,
          meritName: meritDefinition?.meritName || "-",
          meritDescription: meritDefinition?.meritDescription || "-",
          meritCategory: meritDefinition?.meritCategory || "",
          categoryLabel: toCategoryLabel(meritDefinition?.meritCategory, t),
          issuedByDisplay,
        };
      });

      setStaffMerits(withDetails);
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message ||
          t("staffManagement.errorLoadingMerits"),
      );
      setStaffMerits([]);
    } finally {
      setMeritsLoading(false);
    }
  };

  const handleStaffClick = (staff) => {
    setSelectedStaff(staff);
    loadStaffMerits(staff.staffId);
  };

  const handleBackFromMerits = () => {
    setSelectedStaff(null);
    setStaffMerits([]);
    setRefreshStaff((prev) => !prev);
  };

  const handleAddMeritSuccess = async () => {
    setShowAddFrame(false);
    if (selectedStaff) {
      const latestDefinitionMap = await fetchMeritDefinitionMap();
      setMeritDefinitionMap(latestDefinitionMap);
      await Promise.all([
        loadStaffMerits(selectedStaff.staffId, latestDefinitionMap),
        loadStaffList(),
      ]);
    }
  };

  const handleEditMeritSuccess = async () => {
    setShowEditFrame(false);
    setMeritToEdit(null);
    if (selectedStaff) {
      const latestDefinitionMap = await fetchMeritDefinitionMap();
      setMeritDefinitionMap(latestDefinitionMap);
      await Promise.all([
        loadStaffMerits(selectedStaff.staffId, latestDefinitionMap),
        loadStaffList(),
      ]);
    }
  };

  const handleDeleteMeritClick = (meritProfile) => {
    if (!canDeleteProfileRecord) return;
    setMeritToDelete(meritProfile);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteMeritConfirm = async () => {
    if (!canDeleteProfileRecord) return;
    if (!meritToDelete?.staffMeritProfileId) return;

    setError("");
    try {
      await request(
        "DELETE",
        `/api/staffmeritprofiles/${meritToDelete.staffMeritProfileId}`,
      );
      await Promise.all([
        loadStaffMerits(meritToDelete.staffId || selectedStaff?.staffId),
        loadStaffList(),
      ]);
      setShowDeleteConfirmation(false);
      setMeritToDelete(null);
    } catch (deleteError) {
      setError(
        deleteError?.response?.data?.message ||
          t("staffManagement.errorDeletingMerit"),
      );
    }
  };

  const filteredStaff = useMemo(() => {
    const q = String(staffSearch || "")
      .trim()
      .toLowerCase();
    if (!q) return staffList;
    return staffList.filter((staff) => {
      return (
        String(staff?.staffName || "")
          .toLowerCase()
          .includes(q) ||
        String(staff?.name || "")
          .toLowerCase()
          .includes(q) ||
        String(staff?.firstName || "")
          .toLowerCase()
          .includes(q) ||
        String(staff?.lastName || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [staffList, staffSearch]);

  const filteredMerits = useMemo(() => {
    const q = String(meritSearch || "")
      .trim()
      .toLowerCase();
    if (!q) return staffMerits;
    return staffMerits.filter((merit) => {
      return (
        String(merit?.meritName || "")
          .toLowerCase()
          .includes(q) ||
        String(merit?.categoryLabel || "")
          .toLowerCase()
          .includes(q) ||
        String(merit?.issuedByDisplay || "")
          .toLowerCase()
          .includes(q) ||
        String(merit?.meritRemarks || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [staffMerits, meritSearch]);

  const staffListViewData = filteredStaff.map((staff) => ({
    ...staff,
    meritCountDisplay: (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: 1,
            backgroundColor: "background.default",
            border: "1px solid",
            borderColor: "divider",
            fontSize: "0.8rem",
          }}
        >
          {staff.meritCount || 0} {t("staffManagement.merits")}
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.4,
            borderRadius: 1,
            backgroundColor:
              Number(staff.totalMeritPoints || 0) < 0
                ? "error.lighter"
                : "success.lighter",
            color:
              Number(staff.totalMeritPoints || 0) < 0
                ? "error.main"
                : "success.main",
            fontWeight: 600,
            fontSize: "0.8rem",
          }}
        >
          {Number(staff.totalMeritPoints || 0)}
        </Box>
      </Box>
    ),
  }));

  const meritBlockColumnDefs = [
    { field: "meritName", label: t("staffManagement.meritName") },
    { field: "categoryLabel", label: t("staffManagement.meritCategory") },
    { field: "issuedByDisplay", label: t("staffManagement.issuedBy") },
    { field: "issuedDateDisplay", label: t("staffManagement.issuedDate") },
    { field: "meritRemarksDisplay", label: t("staffManagement.meritRemarks") },
    { field: "meritPoints", label: t("staffManagement.meritPoints") },
    {
      field: "documentationCountDisplay",
      label: t("staffManagement.documentation"),
    },
  ];

  const blockMerits = filteredMerits.map((merit) => ({
    ...merit,
    issuedDateDisplay: merit.issuedDate
      ? new Date(merit.issuedDate).toLocaleDateString()
      : "-",
    meritRemarksDisplay: String(merit?.meritRemarks || "").trim() || "-",
    documentationCountDisplay: (() => {
      const count = getDocumentationCount(merit);
      return count > 0 ? count : "-";
    })(),
  }));

  if (showAddFrame && selectedStaff) {
    return (
      <StaffMeritAdd
        staff={selectedStaff}
        onCancel={() => setShowAddFrame(false)}
        onSuccess={handleAddMeritSuccess}
      />
    );
  }

  if (showEditFrame && meritToEdit && selectedStaff) {
    const meritDefinition =
      meritDefinitionMap[String(meritToEdit?.staffMeritId || "").trim()] || {};
    return (
      <StaffMeritEdit
        meritProfile={meritToEdit}
        meritDefinition={meritDefinition}
        staff={selectedStaff}
        onCancel={() => {
          setShowEditFrame(false);
          setMeritToEdit(null);
        }}
        onSuccess={handleEditMeritSuccess}
      />
    );
  }

  if (selectedStaff) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <HeaderBar
          showBackButton
          onBack={handleBackFromMerits}
          backLabel={t("common.back")}
          title={t("staffManagement.staffMeritProfile")}
          subtitle={selectedStaff.staffName || selectedStaff.name}
          actions={
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => setShowAddFrame(true)}
              sx={{ textTransform: "none" }}
            >
              {t("staffManagement.addMerit")}
            </Button>
          }
        />

        {error ? (
          <Box
            sx={{
              backgroundColor: "error.lighter",
              color: "error.main",
              p: 2,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "error.light",
            }}
          >
            <Typography>{error}</Typography>
          </Box>
        ) : null}

        <TextField
          value={meritSearch}
          onChange={(e) => setMeritSearch(e.target.value)}
          placeholder={t("staffManagement.searchMerits")}
          size="small"
          sx={{ minWidth: 200, maxWidth: 300 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {meritsLoading ? (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            {t("common.loading")}
          </Box>
        ) : filteredMerits.length > 0 ? (
          shouldUseBlockLayout ? (
            <LoadMoreBlockList
              items={blockMerits}
              renderItem={(merit, index) => (
                <BlockListItem
                  key={merit.staffMeritProfileId || index}
                  columnDefs={meritBlockColumnDefs}
                  item={merit}
                  onEdit={(item) => {
                    setMeritToEdit(item);
                    setShowEditFrame(true);
                  }}
                  onDelete={
                    canDeleteProfileRecord ? handleDeleteMeritClick : undefined
                  }
                  t={t}
                />
              )}
            />
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "background.default" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.meritName")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.meritCategory")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.issuedBy")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.issuedDate")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.meritRemarks")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      {t("staffManagement.meritPoints")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      {t("staffManagement.documentation")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      {t("basic.actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMerits.map((merit) => (
                    <TableRow
                      key={merit.staffMeritProfileId}
                      sx={{
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <TableCell>{merit.meritName || "-"}</TableCell>
                      <TableCell>{merit.categoryLabel || "-"}</TableCell>
                      <TableCell>{merit.issuedByDisplay || "-"}</TableCell>
                      <TableCell>
                        {merit.issuedDate
                          ? new Date(merit.issuedDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {String(merit?.meritRemarks || "").trim() || "-"}
                      </TableCell>
                      <TableCell align="center">
                        {Number(merit.meritPoints || 0)}
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const count = getDocumentationCount(merit);
                          return count > 0 ? <span>{count}</span> : "-";
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => {
                              setMeritToEdit(merit);
                              setShowEditFrame(true);
                            }}
                            title={t("staffManagement.edit")}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {canDeleteProfileRecord ? (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteMeritClick(merit)}
                              title={t("staffManagement.delete")}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            {t("staffManagement.noMeritsFound")}
          </Box>
        )}

        <Dialog
          open={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setMeritToDelete(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t("staffManagement.confirmDeleteMerit")}</DialogTitle>
          <DialogContent>
            <Typography>{t("staffManagement.deleteMeritMessage")}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowDeleteConfirmation(false);
                setMeritToDelete(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleDeleteMeritConfirm} color="error">
              {t("common.delete")}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  const filterStaffList = (staff) => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (staff.staffName && staff.staffName.toLowerCase().includes(q)) ||
      (staff.name && staff.name.toLowerCase().includes(q)) ||
      (staff.firstName && staff.firstName.toLowerCase().includes(q)) ||
      (staff.lastName && staff.lastName.toLowerCase().includes(q))
    );
  };

  return (
    <ListContainer
      title={t("staffManagement.staffMeritProfile")}
      subtitle={t("staffManagement.staffMeritProfileSubtitle")}
      showBackButton={Boolean(onBack)}
      onBack={onBack}
      backLabel={t("common.back")}
      searchPlaceholder={t("staffManagement.searchStaff")}
      data={staffListViewData}
      columns={["staffName", "meritCountDisplay"]}
      t={t}
      onEdit={handleStaffClick}
      searchValue={staffSearch}
      onSearchChange={setStaffSearch}
      filterFunction={filterStaffList}
      emptyMessage={t("staffManagement.noStaffFound")}
      loading={staffLoading}
      enableActions={true}
    />
  );
};

export default StaffMeritProfile;
