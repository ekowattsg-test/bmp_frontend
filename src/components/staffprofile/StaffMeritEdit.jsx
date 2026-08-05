import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Slider,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
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

const StaffMeritEdit = ({
  meritProfile,
  meritDefinition,
  staff,
  onCancel,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    issuedBy: meritProfile?.issuedBy || "",
    issuedDate: meritProfile?.issuedDate || "",
    meritRemarks: meritProfile?.meritRemarks || "",
    meritPoints: meritProfile?.meritPoints ?? 0,
    documentationLinks: [],
  });

  useEffect(() => {
    let documentationLinks = [];
    try {
      if (meritProfile?.documentationLink) {
        const parsed = JSON.parse(meritProfile.documentationLink);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        documentationLinks = arr.filter(Boolean).map((item) =>
          normalizeFileMetadata(item, {
            provider: getStorageConfig().provider,
          }),
        );
      }
    } catch {
      documentationLinks = [];
    }

    setFormData((prev) => ({
      ...prev,
      documentationLinks,
    }));
  }, [meritProfile]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const profileId = meritProfile?.staffMeritProfileId;
    if (!profileId) {
      setError(t("staffManagement.errorUpdatingMerit"));
      return;
    }

    const category = meritDefinition?.meritCategory;
    if (!validateMeritPoint(category, formData.meritPoints)) {
      setError(t("staffManagement.invalidMeritPoints"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...meritProfile,
        issuedBy: String(formData.issuedBy || "").trim(),
        issuedDate: String(formData.issuedDate || "").trim(),
        meritRemarks: String(formData.meritRemarks || "").trim(),
        meritPoints: Number(formData.meritPoints),
        documentationLink: JSON.stringify(formData.documentationLinks || []),
      };

      await request("PUT", `/api/staffmeritprofiles/${profileId}`, payload);
      await commit();
      onSuccess();
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          t("staffManagement.errorUpdatingMerit"),
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel = toCategoryLabel(meritDefinition?.meritCategory, t);
  const meritPointBounds = getMeritPointBounds(meritDefinition?.meritCategory);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onCancel}
          sx={{ textTransform: "none", flexShrink: 0 }}
          disabled={loading}
        >
          {t("common.back")}
        </Button>
        <Typography variant="h6">
          {t("staffManagement.editMeritDetails")}
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
          label={t("staffManagement.meritName")}
          value={meritDefinition?.meritName || "-"}
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
          disabled={loading}
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
          disabled={loading}
        />

        <TextField
          label={t("staffManagement.meritRemarks")}
          value={formData.meritRemarks}
          onChange={(e) => handleFormChange("meritRemarks", e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={2}
          disabled={loading}
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
            disabled={loading}
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
          <Button onClick={onCancel} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default StaffMeritEdit;
