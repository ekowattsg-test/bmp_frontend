import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  Autocomplete,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  buildUniqueOptionObjects,
  extractListFromResponse,
  findOptionByValue,
} from "../../helpers/common_options_helper";
import {
  getStorageConfig,
  normalizeFileMetadata,
  commit,
} from "../../helpers/file_helper";
import FileGallery from "../common/FileGallery";

const StaffSkillAdd = ({ staff, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const resolveStaffId = (value) => {
    const normalized = String(value?.staffId || "").trim();
    return normalized || null;
  };
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showNewSkillForm, setShowNewSkillForm] = useState(false);
  const [newSkillCategoryOptions, setNewSkillCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillSearchTerm, setSkillSearchTerm] = useState("");
  const [skillCategoryFilter, setSkillCategoryFilter] = useState(null);

  const [skillFormData, setSkillFormData] = useState({
    issuedBy: "",
    acquiredDate: "",
    expiryDate: "",
    noExpiry: false,
    certificationLinks: [],
  });

  const [newSkillData, setNewSkillData] = useState({
    skillName: "",
    skillDescription: "",
    skillCategory: "",
  });

  useEffect(() => {
    loadAvailableSkills();
  }, []);

  const loadAvailableSkills = async () => {
    try {
      setLoading(true);
      const response = await request("GET", "/api/staffskills");
      const skills = extractListFromResponse(response.data);
      setAvailableSkills(skills);
      setNewSkillCategoryOptions(
        buildUniqueOptionObjects(skills, (skill) => skill.skillCategory),
      );
    } catch (error) {
      console.error("Error loading available skills:", error);
      setError(t("staffManagement.errorLoadingSkills"));
      setAvailableSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill);
    setShowSkillForm(true);
    setSkillFormData({
      issuedBy: "",
      acquiredDate: "",
      expiryDate: "",
      noExpiry: false,
      certificationLinks: [],
    });
  };

  const handleSkillFormChange = (field, value) => {
    setSkillFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCertificationLinksChange = (json) => {
    try {
      const parsed = json ? JSON.parse(json) : [];
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const certificationLinks = arr.filter(Boolean).map((item) =>
        normalizeFileMetadata(item, {
          provider: getStorageConfig().provider,
        }),
      );
      setSkillFormData((prev) => ({
        ...prev,
        certificationLinks,
      }));
    } catch (error) {
      console.error("Error parsing certification links:", error);
    }
  };

  const handleSkillFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const staffId = resolveStaffId(staff);
      if (!staffId) {
        throw new Error("Missing staffId for staff skill profile creation.");
      }

      const normalizedCertLinks = skillFormData.certificationLinks
        .map((cert) => {
          const normalizedCert = normalizeFileMetadata(cert, {
            provider: getStorageConfig().provider,
          });
          const id = normalizedCert.id;
          if (!id) {
            console.warn("Skipping document without valid ID:", cert);
            return null;
          }
          return normalizedCert;
        })
        .filter((cert) => cert !== null);

      if (
        normalizedCertLinks.length === 0 &&
        skillFormData.certificationLinks.length > 0
      ) {
        throw new Error(
          "No valid certification documents found. Please upload valid files.",
        );
      }

      const payload = {
        staffId,
        staffName: staff.staffName,
        staffSkillId: selectedSkill.staffSkillId,
        issuedBy: skillFormData.issuedBy,
        acquiredDate: skillFormData.acquiredDate,
        expiryDate: skillFormData.noExpiry ? null : skillFormData.expiryDate,
        noExpiry: skillFormData.noExpiry ? 1 : 0,
        certificationLink: JSON.stringify(normalizedCertLinks),
      };

      await request("POST", "/api/staffskillprofiles", payload);
      await commit();
      onSuccess();
    } catch (error) {
      console.error("Error saving staff skill profile:", error);
      const errorMsg =
        error.response?.status === 401
          ? t("staffManagement.unauthorizedError")
          : error.response?.data?.message ||
            t("staffManagement.errorSavingSkill");
      setError(errorMsg);
    }
  };

  const handleNewSkillChange = (field, value) => {
    setNewSkillData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewSkillSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await request("POST", "/api/staffskills", newSkillData);
      if (response.data) {
        const newSkill = response.data;
        setShowNewSkillForm(false);
        setSelectedSkill(newSkill);
        setShowSkillForm(true);
        setSkillFormData({
          issuedBy: "",
          acquiredDate: "",
          expiryDate: "",
          noExpiry: false,
          certificationLinks: [],
        });
      }
    } catch (error) {
      console.error("Error creating new skill:", error);
      const errorMsg =
        error.response?.status === 401
          ? t("staffManagement.unauthorizedError")
          : error.response?.data?.message ||
            t("staffManagement.errorCreatingSkill");
      setError(errorMsg);
    }
  };

  const fallbackCategoryItems = availableSkills.map((skill) => ({
    category: skill.skillCategory,
  }));
  const fallbackSkillCategories = buildUniqueOptionObjects(
    fallbackCategoryItems,
    (item) => item.category,
  );
  const categoryOptionsForNewSkill =
    newSkillCategoryOptions.length > 0
      ? newSkillCategoryOptions
      : fallbackSkillCategories;

  // Form View
  if (showSkillForm && selectedSkill) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              setShowSkillForm(false);
              setSelectedSkill(null);
            }}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            {t("common.back")}
          </Button>
          <Typography
            variant="h6"
            sx={{
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("staffManagement.addSkillDetails")} - {selectedSkill.skillName}
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          component="form"
          onSubmit={handleSkillFormSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            backgroundColor: "background.paper",
            p: 3,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <TextField
            label={t("staffManagement.issuedBy")}
            value={skillFormData.issuedBy}
            onChange={(e) => handleSkillFormChange("issuedBy", e.target.value)}
            placeholder={t(
              "staffManagement.issuedByPlaceholder",
              "e.g., Company Training Center",
            )}
            fullWidth
            size="small"
          />

          <TextField
            label={t("staffManagement.acquiredDate")}
            type="date"
            value={skillFormData.acquiredDate}
            onChange={(e) =>
              handleSkillFormChange("acquiredDate", e.target.value)
            }
            required
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={skillFormData.noExpiry}
                onChange={(e) =>
                  handleSkillFormChange("noExpiry", e.target.checked)
                }
              />
            }
            label={t("staffManagement.noExpiry")}
          />

          {!skillFormData.noExpiry && (
            <TextField
              label={t("staffManagement.expiryDate")}
              type="date"
              value={skillFormData.expiryDate}
              onChange={(e) =>
                handleSkillFormChange("expiryDate", e.target.value)
              }
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("staffManagement.certificationLinks")}
            </Typography>
            <FileGallery
              productPicture={skillFormData.certificationLinks}
              allowRemove={true}
              allowAdd={true}
              repoConfig={null}
              onChange={handleCertificationLinksChange}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained">
              {t("common.save")}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // New Skill Form View
  if (showNewSkillForm) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setShowNewSkillForm(false)}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            {t("common.back")}
          </Button>
          <Typography
            variant="h6"
            sx={{
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("staffManagement.createNewSkill")}
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          component="form"
          onSubmit={handleNewSkillSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            backgroundColor: "background.paper",
            p: 3,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <TextField
            label={t("staffManagement.skillName")}
            value={newSkillData.skillName}
            onChange={(e) => handleNewSkillChange("skillName", e.target.value)}
            required
            fullWidth
            size="small"
          />

          <TextField
            label={t("staffManagement.skillDescription")}
            value={newSkillData.skillDescription}
            onChange={(e) =>
              handleNewSkillChange("skillDescription", e.target.value)
            }
            multiline
            rows={3}
            fullWidth
            size="small"
          />

          <Autocomplete
            freeSolo
            openOnFocus
            options={categoryOptionsForNewSkill}
            value={
              findOptionByValue(
                categoryOptionsForNewSkill,
                newSkillData.skillCategory,
              ) ?? null
            }
            inputValue={newSkillData.skillCategory}
            onInputChange={(_, newInputValue, reason) => {
              if (reason === "reset") return;
              handleNewSkillChange("skillCategory", newInputValue);
            }}
            onChange={(_, newValue) => {
              if (typeof newValue === "string") {
                handleNewSkillChange("skillCategory", newValue);
                return;
              }
              if (newValue && typeof newValue === "object") {
                handleNewSkillChange("skillCategory", newValue.value || "");
                return;
              }
              handleNewSkillChange("skillCategory", "");
            }}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.value
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("staffManagement.skillCategory")}
                size="small"
              />
            )}
          />

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button onClick={() => setShowNewSkillForm(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained">
              {t("common.create")}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // Skill Selection View
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onCancel}
          sx={{ textTransform: "none", flexShrink: 0 }}
        >
          {t("common.back")}
        </Button>
        <Typography
          variant="h6"
          sx={{
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        ></Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Typography>{t("common.loading")}</Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Search */}
          <TextField
            placeholder={t("staffManagement.searchSkills")}
            value={skillSearchTerm}
            onChange={(e) => setSkillSearchTerm(e.target.value)}
            fullWidth
            size="small"
          />

          {/* Category Filters */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant={!skillCategoryFilter ? "contained" : "outlined"}
              size="small"
              onClick={() => setSkillCategoryFilter(null)}
            >
              {t("common.all")}
            </Button>
            {(() => {
              const categories = new Set();
              availableSkills.forEach((skill) => {
                if (skill.skillCategory) categories.add(skill.skillCategory);
              });
              return Array.from(categories)
                .sort()
                .map((category) => (
                  <Button
                    key={category}
                    variant={
                      skillCategoryFilter === category
                        ? "contained"
                        : "outlined"
                    }
                    size="small"
                    onClick={() =>
                      setSkillCategoryFilter(
                        skillCategoryFilter === category ? null : category,
                      )
                    }
                  >
                    {category}
                  </Button>
                ));
            })()}
          </Box>

          {/* Skills Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
              mt: 2,
            }}
          >
            {availableSkills
              .filter((skill) => {
                if (skillSearchTerm) {
                  const search = skillSearchTerm.toLowerCase();
                  const name = (skill.skillName || "").toLowerCase();
                  const desc = (skill.skillDescription || "").toLowerCase();
                  if (!name.includes(search) && !desc.includes(search))
                    return false;
                }
                if (
                  skillCategoryFilter &&
                  skill.skillCategory !== skillCategoryFilter
                )
                  return false;
                return true;
              })
              .map((skill) => (
                <Box
                  key={skill.staffSkillId}
                  onClick={() => handleSkillSelect(skill)}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: 1,
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {skill.skillName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.5 }}
                  >
                    {skill.skillDescription || "-"}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "inline-block",
                      mt: 1,
                      px: 1,
                      py: 0.5,
                      backgroundColor: "primary.lighter",
                      color: "primary.main",
                      borderRadius: 0.5,
                    }}
                  >
                    {skill.skillCategory || "-"}
                  </Typography>
                </Box>
              ))}
          </Box>

          {/* Create New Skill Button */}
          <Button
            variant="outlined"
            onClick={() => setShowNewSkillForm(true)}
            sx={{ alignSelf: "flex-start", mt: 2 }}
          >
            + {t("staffManagement.createNewSkill")}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default StaffSkillAdd;
