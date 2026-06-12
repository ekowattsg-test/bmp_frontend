import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  getStorageConfig,
  getFileIdFromLink,
  normalizeFileMetadata,
  commit,
} from "../../helpers/file_helper";
import FileGallery from "../common/FileGallery";

const StaffSkillEdit = ({ skill, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skillFormData, setSkillFormData] = useState({
    issuedBy: skill.issuedBy || "",
    acquiredDate: skill.acquiredDate || "",
    expiryDate: skill.expiryDate || "",
    noExpiry: skill.noExpiry === 1 || skill.noExpiry === true,
    certificationLinks: [],
  });

  // Load certification links on mount
  useEffect(() => {
    let certificationLinks = [];
    try {
      if (skill.certificationLink) {
        certificationLinks = JSON.parse(skill.certificationLink);
        // Handle old string format for backward compatibility
        if (typeof certificationLinks === "string") {
          certificationLinks = [
            {
              id: getFileIdFromLink(certificationLinks),
              name: "Legacy Certificate",
              url: certificationLinks,
              uploadedAt: new Date().toISOString(),
            },
          ];
        }
        if (Array.isArray(certificationLinks)) {
          certificationLinks = certificationLinks.map((cert) => {
            const normalizedCert = normalizeFileMetadata(cert, {
              name: typeof cert === "string" ? "Legacy Certificate" : "",
              provider: getStorageConfig().provider,
              uploadedAt: new Date().toISOString(),
            });
            return normalizedCert;
          });
        }
      }
    } catch {
      // If parsing fails, treat as old string format
      if (skill.certificationLink) {
        certificationLinks = [
          {
            id: getFileIdFromLink(skill.certificationLink),
            name: "Legacy Certificate",
            url: skill.certificationLink,
            uploadedAt: new Date().toISOString(),
          },
        ];
      }
    }
    setSkillFormData((prev) => ({
      ...prev,
      certificationLinks,
    }));
  }, [skill]);

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

  const handleEditSkillSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!skill || !skill.staffSkillProfileId) {
        throw new Error("Invalid skill to edit");
      }

      setLoading(true);

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
        staffSkillProfileId: skill.staffSkillProfileId,
        staffName: skill.staffName,
        staffSkillId: skill.staffSkillId,
        issuedBy: skillFormData.issuedBy,
        acquiredDate: skillFormData.acquiredDate,
        expiryDate: skillFormData.noExpiry ? null : skillFormData.expiryDate,
        noExpiry: skillFormData.noExpiry ? 1 : 0,
        certificationLink: JSON.stringify(normalizedCertLinks),
      };

      await request(
        "PUT",
        `/api/staffskillprofiles/${skill.staffSkillProfileId}`,
        payload,
      );
      await commit();
      onSuccess();
    } catch (error) {
      console.error("Error updating staff skill profile:", error);
      const errorMsg =
        error.response?.status === 401
          ? t("staffManagement.unauthorizedError")
          : error.response?.data?.message ||
            t("staffManagement.errorUpdatingSkill");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
          disabled={loading}
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

      <Box
        component="form"
        onSubmit={handleEditSkillSubmit}
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
          disabled={loading}
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
          disabled={loading}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={skillFormData.noExpiry}
              onChange={(e) =>
                handleSkillFormChange("noExpiry", e.target.checked)
              }
              disabled={loading}
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
            disabled={loading}
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

export default StaffSkillEdit;
