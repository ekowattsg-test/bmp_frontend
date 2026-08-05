import React, { useState, useEffect, useContext } from "react";
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
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import {
  buildUniqueOptionObjects,
  extractListFromResponse,
} from "../../helpers/common_options_helper";
import {
  getStorageConfig,
  getFileIdFromLink,
  normalizeFileMetadata,
  commit,
  abort,
} from "../../helpers/file_helper";
import { ListContainer, BlockListItem, LoadMoreBlockList } from "../common";
import StaffSkillAdd from "./StaffSkillAdd";
import StaffSkillEdit from "./StaffSkillEdit";

const StaffSkillProfile = ({ onBack }) => {
  const { t } = useTranslation();
  const resolveStaffId = (value) => {
    const normalized =
      typeof value === "object" && value !== null
        ? String(value?.staffId || "").trim()
        : String(value || "").trim();
    return normalized || null;
  };
  const { userInfo } = useContext(AuthContext);
  const { shouldUseBlockLayout } = useResponsiveLayout();

  // Staff List View States
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState("");
  const [refreshStaff, setRefreshStaff] = useState(false);

  // Skills View States
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffSkills, setStaffSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [error, setError] = useState("");

  // Dialog States
  const [showAddFrame, setShowAddFrame] = useState(false);
  const [showEditFrame, setShowEditFrame] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState(null);

  // Get user level and company info
  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const canDeleteProfileRecord = Number(userLevel) >= 5;
  const userCompanyId = userInfo?.companyId;

  // Load staff list
  useEffect(() => {
    loadStaffList();
  }, [userCompanyId, isUserLevelNine, refreshStaff]);

  const loadStaffList = async () => {
    try {
      setStaffLoading(true);
      const response = await request("GET", "/api/staffs");

      if (response.data) {
        let staffs = Array.isArray(response.data)
          ? response.data
          : response.data.items || [];

        // Filter by company if user is not level 9
        if (!isUserLevelNine && userCompanyId) {
          staffs = staffs.filter((staff) => staff.companyId === userCompanyId);
        }

        // Fetch skill count and categories for each staff member
        const staffsWithSkillData = await Promise.all(
          staffs.map(async (staff) => {
            try {
              const staffId = resolveStaffId(staff);
              if (!staffId) {
                return {
                  ...staff,
                  skillCount: 0,
                  skillCategories: [],
                };
              }

              const skillResponse = await request(
                "GET",
                `/api/staffskillprofiles/staffid/${encodeURIComponent(staffId)}`,
              );
              const skillProfiles = Array.isArray(skillResponse.data)
                ? skillResponse.data
                : skillResponse.data?.items || [];

              // Fetch skill details to get categories
              const skillCategories = new Set();
              await Promise.all(
                skillProfiles.map(async (skillProfile) => {
                  try {
                    const skillDetailResponse = await request(
                      "GET",
                      `/api/staffskills/${skillProfile.staffSkillId}`,
                    );
                    if (skillDetailResponse.data?.skillCategory) {
                      skillCategories.add(
                        skillDetailResponse.data.skillCategory,
                      );
                    }
                  } catch (error) {
                    console.error(
                      `Error loading skill details for ${skillProfile.staffSkillId}:`,
                      error,
                    );
                  }
                }),
              );

              return {
                ...staff,
                skillCount: skillProfiles.length,
                skillCategories: Array.from(skillCategories),
              };
            } catch (error) {
              console.error(
                `Error loading skill data for staff ${staff.staffId}:`,
                error,
              );
              return {
                ...staff,
                skillCount: 0,
                skillCategories: [],
              };
            }
          }),
        );

        setStaffList(staffsWithSkillData);
      }
    } catch (error) {
      console.error("Error loading staff list:", error);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const loadStaffSkills = async (staffId) => {
    try {
      setSkillsLoading(true);
      setError("");
      const normalizedStaffId = resolveStaffId(staffId);
      if (!normalizedStaffId) {
        setStaffSkills([]);
        return;
      }

      const response = await request(
        "GET",
        `/api/staffskillprofiles/staffid/${encodeURIComponent(normalizedStaffId)}`,
      );

      if (response.data) {
        let skills = Array.isArray(response.data)
          ? response.data
          : response.data.items || [];

        // Fetch skill details for each skill profile
        const skillsWithDetails = await Promise.all(
          skills.map(async (skillProfile) => {
            try {
              const skillResponse = await request(
                "GET",
                `/api/staffskills/${skillProfile.staffSkillId}`,
              );
              return {
                ...skillProfile,
                staffId: resolveStaffId(skillProfile) || normalizedStaffId,
                skillName: skillResponse.data?.skillName || "-",
                skillDescription: skillResponse.data?.skillDescription || "-",
                skillCategory: skillResponse.data?.skillCategory || "-",
              };
            } catch (error) {
              console.error(
                `Error loading skill details for ${skillProfile.staffSkillId}:`,
                error,
              );
              return {
                ...skillProfile,
                staffId: resolveStaffId(skillProfile) || normalizedStaffId,
                skillName: "-",
                skillDescription: "-",
                skillCategory: "-",
              };
            }
          }),
        );

        setStaffSkills(skillsWithDetails);
      }
    } catch (error) {
      console.error("Error loading staff skills:", error);
      if (error.response?.status === 401) {
        setError(t("staffManagement.unauthorizedError"));
        setStaffSkills([]);
      } else {
        const errorMsg =
          error.response?.data?.message ||
          t("staffManagement.errorLoadingSkills");
        setError(errorMsg);
        setStaffSkills([]);
      }
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleStaffClick = (staff) => {
    setSelectedStaff(staff);
    loadStaffSkills(staff.staffId);
  };

  const handleBackFromSkills = () => {
    setSelectedStaff(null);
    setStaffSkills([]);
    setRefreshStaff(!refreshStaff);
  };

  const handleAddSkillSuccess = () => {
    setShowAddFrame(false);
    if (selectedStaff) {
      loadStaffSkills(selectedStaff.staffId);
      loadStaffList(); // Refresh staff list to update skill count badge
    }
  };

  const handleEditSkillSuccess = () => {
    setShowEditFrame(false);
    setSkillToEdit(null);
    if (selectedStaff) {
      loadStaffSkills(selectedStaff.staffId);
      loadStaffList(); // Refresh staff list to update skill count badge
    }
  };

  const handleDeleteSkillClick = (skill) => {
    if (!canDeleteProfileRecord) return;
    setSkillToDelete(skill);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteSkillConfirm = async () => {
    if (!canDeleteProfileRecord) return;
    setError("");
    try {
      if (!skillToDelete || !skillToDelete.staffSkillProfileId) {
        throw new Error("Invalid skill to delete");
      }

      await request(
        "DELETE",
        `/api/staffskillprofiles/${skillToDelete.staffSkillProfileId}`,
      );

      // Reload both staff skills and staff list to update badges
      await Promise.all([
        loadStaffSkills(skillToDelete.staffId || selectedStaff?.staffId),
        loadStaffList(),
      ]);

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setSkillToDelete(null);
    } catch (error) {
      console.error("Error deleting staff skill profile:", error);
      const errorMsg =
        error.response?.status === 401
          ? t("staffManagement.unauthorizedError")
          : error.response?.data?.message ||
            t("staffManagement.errorDeletingSkill");
      setError(errorMsg);
    }
  };

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

  const filteredSkills = staffSkills.filter((skill) => {
    const q = skillSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (skill.skillName && skill.skillName.toLowerCase().includes(q)) ||
      (skill.skillCategory && skill.skillCategory.toLowerCase().includes(q))
    );
  });

  const staffListViewData = staffList.map((staff) => ({
    ...staff,
    skillCountDisplay: (
      <Box
        sx={{
          display: "inline-block",
          px: 1.5,
          py: 0.5,
          backgroundColor: "primary.lighter",
          color: "primary.main",
          borderRadius: 1,
          fontWeight: 500,
          fontSize: "0.875rem",
        }}
      >
        {staff.skillCount || 0} {t("common.skills")}
      </Box>
    ),
  }));

  const getCertificationCount = (skill) => {
    try {
      const certLinks = skill.certificationLink
        ? JSON.parse(skill.certificationLink)
        : null;
      if (Array.isArray(certLinks) && certLinks.length > 0) {
        return certLinks.length;
      }
      if (typeof certLinks === "string" && certLinks) {
        return 1;
      }
      if (
        skill.certificationLink &&
        typeof skill.certificationLink === "string"
      ) {
        return 1;
      }
    } catch (e) {
      if (skill.certificationLink) {
        return 1;
      }
    }
    return 0;
  };

  const skillBlockColumnDefs = [
    { field: "skillName", label: t("staffManagement.skillName") },
    { field: "skillCategory", label: t("staffManagement.skillCategory") },
    { field: "issuedBy", label: t("staffManagement.issuedBy") },
    { field: "acquiredDateDisplay", label: t("staffManagement.acquiredDate") },
    { field: "expiryDateDisplay", label: t("staffManagement.expiryDate") },
    {
      field: "certificationDisplay",
      label: t("staffManagement.certification"),
    },
  ];

  const blockSkills = filteredSkills.map((skill) => ({
    ...skill,
    acquiredDateDisplay: skill.acquiredDate
      ? new Date(skill.acquiredDate).toLocaleDateString()
      : "-",
    expiryDateDisplay: skill.noExpiry
      ? t("staffManagement.noExpiry")
      : skill.expiryDate
        ? new Date(skill.expiryDate).toLocaleDateString()
        : "-",
    certificationDisplay: (() => {
      const count = getCertificationCount(skill);
      return count > 0 ? count : "-";
    })(),
  }));

  // Component rendered when Add form is shown
  if (showAddFrame && selectedStaff) {
    return (
      <StaffSkillAdd
        staff={selectedStaff}
        onCancel={() => setShowAddFrame(false)}
        onSuccess={handleAddSkillSuccess}
      />
    );
  }

  // Component rendered when Edit form is shown
  if (showEditFrame && skillToEdit && selectedStaff) {
    return (
      <StaffSkillEdit
        skill={skillToEdit}
        staff={selectedStaff}
        onCancel={() => {
          setShowEditFrame(false);
          setSkillToEdit(null);
        }}
        onSuccess={handleEditSkillSuccess}
      />
    );
  }

  // Skills detail view for selected staff
  if (selectedStaff) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <HeaderBar
          showBackButton
          onBack={handleBackFromSkills}
          backLabel={t("common.back")}
          title={t("staffManagement.staffSkillProfile")}
          subtitle={selectedStaff.staffName || selectedStaff.name}
          actions={
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => setShowAddFrame(true)}
              sx={{ textTransform: "none" }}
            >
              {t("staffManagement.addSkill")}
            </Button>
          }
        />

        {/* Error Message */}
        {error && (
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
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography>{error}</Typography>
              <Button
                size="small"
                onClick={() => {
                  if (selectedStaff) {
                    loadStaffSkills(selectedStaff.staffId);
                  }
                }}
              >
                {t("common.retry")}
              </Button>
            </Box>
          </Box>
        )}

        {/* Search Bar */}
        <TextField
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          placeholder={t("staffManagement.searchSkills", "Search skills...")}
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

        {/* Skills Table */}
        {skillsLoading ? (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            {t("common.loading")}
          </Box>
        ) : filteredSkills.length > 0 ? (
          shouldUseBlockLayout ? (
            <LoadMoreBlockList
              items={blockSkills}
              renderItem={(skill, idx) => (
                <BlockListItem
                  key={skill.staffSkillProfileId || idx}
                  columnDefs={skillBlockColumnDefs}
                  item={skill}
                  onEdit={(item) => {
                    setSkillToEdit(item);
                    setShowEditFrame(true);
                  }}
                  onDelete={
                    canDeleteProfileRecord
                      ? (item) => handleDeleteSkillClick(item)
                      : undefined
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
                      {t("staffManagement.skillName")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.skillCategory")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.issuedBy")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.acquiredDate")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("staffManagement.expiryDate")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      {t("staffManagement.certification")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      {t("basic.actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSkills.map((skill) => (
                    <TableRow
                      key={skill.staffSkillProfileId}
                      sx={{
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <TableCell>{skill.skillName || "-"}</TableCell>
                      <TableCell>{skill.skillCategory || "-"}</TableCell>
                      <TableCell>{skill.issuedBy || "-"}</TableCell>
                      <TableCell>
                        {skill.acquiredDate
                          ? new Date(skill.acquiredDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {skill.noExpiry
                          ? t("staffManagement.noExpiry")
                          : skill.expiryDate
                            ? new Date(skill.expiryDate).toLocaleDateString()
                            : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const count = getCertificationCount(skill);
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
                              setSkillToEdit(skill);
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
                              onClick={() => handleDeleteSkillClick(skill)}
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
            {t("staffManagement.noSkillsFound")}
          </Box>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setSkillToDelete(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t("staffManagement.confirmDeleteSkill")}</DialogTitle>
          <DialogContent>
            <Typography>
              {t(
                "staffManagement.deleteSkillMessage",
                `Are you sure you want to delete this skill?`,
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowDeleteConfirmation(false);
                setSkillToDelete(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleDeleteSkillConfirm} color="error">
              {t("common.delete")}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Main staff list view
  return (
    <ListContainer
      title={t("staffManagement.staffSkillProfile")}
      subtitle={t(
        "staffManagement.staffSkillProfileSubtitle",
        "Manage staff member skills and certifications",
      )}
      showBackButton={Boolean(onBack)}
      onBack={onBack}
      backLabel={t("common.back")}
      searchPlaceholder={t("staffManagement.searchStaff", "Search staff...")}
      data={staffListViewData}
      columns={["staffName", "skillCountDisplay"]}
      t={t}
      onEdit={handleStaffClick}
      searchValue={staffSearch}
      onSearchChange={setStaffSearch}
      filterFunction={filterStaffList}
      emptyMessage={t("staffManagement.noStaffFound", "No staff found.")}
      loading={staffLoading}
      enableActions={true}
    />
  );
};

export default StaffSkillProfile;
