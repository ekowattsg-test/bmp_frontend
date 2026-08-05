import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Slider,
  MenuItem,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { extractListFromResponse } from "../../helpers/common_options_helper";
import {
  getStorageConfig,
  normalizeFileMetadata,
  commit,
} from "../../helpers/file_helper";
import FileGallery from "../common/FileGallery";

const toCategoryLabel = (category, t) => {
  const normalized = String(category || "")
    .trim()
    .toUpperCase();
  if (normalized === "D") return t("staffManagement.meritCategoryDemerit");
  return t("staffManagement.meritCategoryMerit");
};

const validateMeritPoint = (category, meritPoint) => {
  const parsed = Number(meritPoint);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return false;
  }

  const normalizedCategory = String(category || "")
    .trim()
    .toUpperCase();
  if (normalizedCategory === "M") {
    return parsed >= 1 && parsed <= 10;
  }
  if (normalizedCategory === "D") {
    return parsed <= -1 && parsed >= -10;
  }

  return false;
};

const getMeritPointBounds = (category) => {
  const normalizedCategory = String(category || "")
    .trim()
    .toUpperCase();
  if (normalizedCategory === "D") {
    return { min: -10, max: -1, defaultValue: -1 };
  }
  return { min: 1, max: 10, defaultValue: 1 };
};

const getTodayDateString = () => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
};

const StaffMeritAdd = ({ staff, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const [availableMerits, setAvailableMerits] = useState([]);
  const [selectedMerit, setSelectedMerit] = useState(null);
  const [showMeritForm, setShowMeritForm] = useState(false);
  const [showNewMeritForm, setShowNewMeritForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meritSearchTerm, setMeritSearchTerm] = useState("");
  const [meritCategoryFilter, setMeritCategoryFilter] = useState(null);

  const [formData, setFormData] = useState({
    issuedBy: "",
    issuedDate: getTodayDateString(),
    meritRemarks: "",
    meritPoints: "",
    documentationLinks: [],
  });
  const [newMeritData, setNewMeritData] = useState({
    meritName: "",
    meritDescription: "",
    meritCategory: "M",
  });

  useEffect(() => {
    const loadAvailableMerits = async () => {
      try {
        setLoading(true);
        const response = await request("GET", "/api/staffmerits");
        setAvailableMerits(extractListFromResponse(response.data));
      } catch (loadError) {
        setAvailableMerits([]);
        setError(t("staffManagement.errorLoadingMerits"));
      } finally {
        setLoading(false);
      }
    };

    loadAvailableMerits();
  }, [t]);

  const handleMeritSelect = (merit) => {
    const { defaultValue } = getMeritPointBounds(merit?.meritCategory);
    setSelectedMerit(merit);
    setShowMeritForm(true);
    setFormData({
      issuedBy: "",
      issuedDate: getTodayDateString(),
      meritRemarks: "",
      meritPoints: defaultValue,
      documentationLinks: [],
    });
    setError("");
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewMeritChange = (field, value) => {
    setNewMeritData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateNewMerit = async (event) => {
    event.preventDefault();
    setError("");

    const meritName = String(newMeritData.meritName || "").trim();
    const meritCategory = String(newMeritData.meritCategory || "")
      .trim()
      .toUpperCase();

    if (!meritName) {
      setError(t("staffMeritList.meritNameRequired"));
      return;
    }

    if (!["M", "D"].includes(meritCategory)) {
      setError(t("staffMeritList.meritCategoryRequired"));
      return;
    }

    try {
      const response = await request("POST", "/api/staffmerits", {
        meritName,
        meritDescription: String(newMeritData.meritDescription || "").trim(),
        meritCategory,
      });

      const createdMerit = response?.data || null;
      if (!createdMerit?.staffMeritId) {
        setError(t("staffManagement.errorSavingMerit"));
        return;
      }

      setAvailableMerits((prev) => [...prev, createdMerit]);
      setShowNewMeritForm(false);
      setNewMeritData({
        meritName: "",
        meritDescription: "",
        meritCategory: "M",
      });
      handleMeritSelect(createdMerit);
    } catch (createError) {
      setError(
        createError?.response?.data?.message ||
          t("staffManagement.errorSavingMerit"),
      );
    }
  };

  const handleDocumentationLinksChange = (json) => {
    try {
      const parsed = json ? JSON.parse(json) : [];
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const documentationLinks = arr.filter(Boolean).map((item) =>
        normalizeFileMetadata(item, {
          provider: getStorageConfig().provider,
        }),
      );
      setFormData((prev) => ({
        ...prev,
        documentationLinks,
      }));
    } catch {
      setError(t("staffManagement.uploadFailed"));
    }
  };

  const filteredMerits = useMemo(() => {
    const search = String(meritSearchTerm || "")
      .trim()
      .toLowerCase();
    return availableMerits.filter((merit) => {
      const meritCategory = String(merit?.meritCategory || "")
        .trim()
        .toUpperCase();
      const meritLabel = toCategoryLabel(meritCategory, t);
      const categoryMatched =
        !meritCategoryFilter || meritCategory === meritCategoryFilter;
      if (!categoryMatched) return false;
      if (!search) return true;
      return (
        String(merit?.meritName || "")
          .toLowerCase()
          .includes(search) ||
        String(merit?.meritDescription || "")
          .toLowerCase()
          .includes(search) ||
        meritLabel.toLowerCase().includes(search)
      );
    });
  }, [availableMerits, meritCategoryFilter, meritSearchTerm, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const staffId = String(staff?.staffId || "").trim();
    if (!staffId) {
      setError(t("staffManagement.errorSavingMerit"));
      return;
    }

    if (!selectedMerit?.staffMeritId) {
      setError(t("staffManagement.selectMerit"));
      return;
    }

    if (
      !validateMeritPoint(selectedMerit?.meritCategory, formData.meritPoints)
    ) {
      setError(t("staffManagement.invalidMeritPoints"));
      return;
    }

    try {
      const payload = {
        staffId,
        staffMeritId: selectedMerit.staffMeritId,
        issuedBy: String(formData.issuedBy || "").trim(),
        issuedDate: String(formData.issuedDate || "").trim(),
        meritRemarks: String(formData.meritRemarks || "").trim(),
        meritPoints: Number(formData.meritPoints),
        documentationLink: JSON.stringify(formData.documentationLinks || []),
      };

      await request("POST", "/api/staffmeritprofiles", payload);
      await commit();
      onSuccess();
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          t("staffManagement.errorSavingMerit"),
      );
    }
  };

  if (showMeritForm && selectedMerit) {
    const categoryLabel = toCategoryLabel(selectedMerit?.meritCategory, t);
    const meritPointBounds = getMeritPointBounds(selectedMerit?.meritCategory);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              setShowMeritForm(false);
              setSelectedMerit(null);
            }}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            {t("common.back")}
          </Button>
          <Typography variant="h6" sx={{ margin: 0 }}>
            {t("staffManagement.addMeritDetails")} - {selectedMerit.meritName}
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Box
          component="form"
          onSubmit={handleSubmit}
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
            label={t("projectTask.staffName", "Staff Name")}
            value={String(staff?.staffName || "")}
            fullWidth
            size="small"
            disabled
          />

          <TextField
            label={t("staffManagement.meritCategory")}
            value={categoryLabel}
            fullWidth
            size="small"
            disabled
          />

          <TextField
            label={t("staffManagement.issuedBy")}
            value={formData.issuedBy}
            onChange={(e) => handleFormChange("issuedBy", e.target.value)}
            fullWidth
            size="small"
          />

          <TextField
            label={t("staffManagement.issuedDate")}
            type="date"
            value={formData.issuedDate}
            onChange={(e) => handleFormChange("issuedDate", e.target.value)}
            required
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label={t("staffManagement.meritRemarks")}
            value={formData.meritRemarks}
            onChange={(e) => handleFormChange("meritRemarks", e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("staffManagement.meritPoints")}:{" "}
              {Number(formData.meritPoints || 0)}
            </Typography>
            <Slider
              value={Number(
                formData.meritPoints || meritPointBounds.defaultValue,
              )}
              onChange={(_, value) =>
                handleFormChange("meritPoints", Number(value))
              }
              min={meritPointBounds.min}
              max={meritPointBounds.max}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary">
              {t("staffManagement.meritPointsHint")}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("staffManagement.documentationLinks")}
            </Typography>
            <FileGallery
              productPicture={formData.documentationLinks}
              allowRemove={true}
              allowAdd={true}
              repoConfig={null}
              onChange={handleDocumentationLinksChange}
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

  if (showNewMeritForm) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              setShowNewMeritForm(false);
              setError("");
            }}
            sx={{ textTransform: "none" }}
          >
            {t("common.back")}
          </Button>
          <Typography variant="h6">
            {t("staffManagement.createNewMerit")}
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Box
          component="form"
          onSubmit={handleCreateNewMerit}
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
            label={t("staffMeritList.meritName")}
            value={newMeritData.meritName}
            onChange={(e) => handleNewMeritChange("meritName", e.target.value)}
            required
            fullWidth
            size="small"
          />

          <TextField
            label={t("staffMeritList.meritDescription")}
            value={newMeritData.meritDescription}
            onChange={(e) =>
              handleNewMeritChange("meritDescription", e.target.value)
            }
            multiline
            minRows={3}
            fullWidth
            size="small"
          />

          <TextField
            select
            label={t("staffMeritList.meritCategory")}
            value={newMeritData.meritCategory}
            onChange={(e) =>
              handleNewMeritChange("meritCategory", e.target.value)
            }
            fullWidth
            size="small"
          >
            <MenuItem value="M">
              {t("staffManagement.meritCategoryMerit")}
            </MenuItem>
            <MenuItem value="D">
              {t("staffManagement.meritCategoryDemerit")}
            </MenuItem>
          </TextField>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button onClick={() => setShowNewMeritForm(false)}>
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
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
        >
          {t("staffManagement.selectMerit")}
        </Typography>
      </Box>

      <TextField
        label={t("projectTask.staffName", "Staff Name")}
        value={String(staff?.staffName || "")}
        fullWidth
        size="small"
        disabled
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Typography>{t("common.loading")}</Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Search */}
          <TextField
            placeholder={t("staffManagement.searchMerits")}
            value={meritSearchTerm}
            onChange={(e) => setMeritSearchTerm(e.target.value)}
            fullWidth
            size="small"
          />

          {/* Category Filters */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant={!meritCategoryFilter ? "contained" : "outlined"}
              size="small"
              onClick={() => setMeritCategoryFilter(null)}
            >
              {t("common.all")}
            </Button>
            {(() => {
              const categories = new Set();
              availableMerits.forEach((merit) => {
                const category = String(merit?.meritCategory || "")
                  .trim()
                  .toUpperCase();
                if (category) categories.add(category);
              });
              return Array.from(categories)
                .sort()
                .map((category) => (
                  <Button
                    key={category}
                    variant={
                      meritCategoryFilter === category
                        ? "contained"
                        : "outlined"
                    }
                    size="small"
                    onClick={() =>
                      setMeritCategoryFilter(
                        meritCategoryFilter === category ? null : category,
                      )
                    }
                  >
                    {toCategoryLabel(category, t)}
                  </Button>
                ));
            })()}
          </Box>

          {filteredMerits.length === 0 ? (
            <Typography sx={{ color: "text.secondary" }}>
              {t("staffManagement.noMeritsFound")}
            </Typography>
          ) : (
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
              {filteredMerits.map((merit) => (
                <Box
                  key={merit.staffMeritId}
                  onClick={() => handleMeritSelect(merit)}
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
                    {merit.meritName || "-"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.5 }}
                  >
                    {merit.meritDescription || "-"}
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
                    {toCategoryLabel(merit.meritCategory, t)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Button
            variant="outlined"
            onClick={() => {
              setShowNewMeritForm(true);
              setError("");
            }}
            sx={{ alignSelf: "flex-start", mt: 2 }}
          >
            + {t("staffManagement.createNewMerit")}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default StaffMeritAdd;
