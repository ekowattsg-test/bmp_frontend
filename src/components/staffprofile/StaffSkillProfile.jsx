import React, { useState, useEffect, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import {
  buildDriveDirectViewLink,
  buildDriveViewLink,
  getActiveStorageProviderConfig,
  getStorageConfig,
  initStorageTokenClient,
  uploadFileToDrive,
  getFileIcon,
  showDocument,
  downloadDocument,
  getFileIdFromLink,
  getPreviewLink,
  requestGoogleAccessTokenWithState,
  getDisplayImageInfo,
  FileChip,
  ImageCarousel,
} from "../../helpers/file_helper";

const StaffSkillProfile = ({ onBack }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffSkills, setStaffSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showNewSkillForm, setShowNewSkillForm] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [skillSearchTerm, setSkillSearchTerm] = useState("");
  const [skillCategoryFilter, setSkillCategoryFilter] = useState(null);
  const [driveReady, setDriveReady] = useState(false);
  const [driveToken, setDriveToken] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const certificationInputRef = useRef(null);
  const tokenClientRef = useRef(null);
  const openFilePicker = useRef(false);
  const authorizingRef = useRef(false);
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
  const [showEditSkillForm, setShowEditSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState(null);

  // Image carousel state (for previewing certification images)
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const openCarouselAt = (index, links = skillFormData.certificationLinks) => {
    console.log("openCarouselAt called", index, links);
    const images = (links || []).map((cert) => {
      const displayUrl =
        cert.url || (cert.id ? buildDriveViewLink(cert.id, cert.provider) : "");
      const fileId = cert.id || getFileIdFromLink(displayUrl);
      const thumbnailUrl = fileId
        ? getPreviewLink(buildDriveViewLink(fileId, cert.provider), 120, 120)
        : null;
      const isImage =
        (cert.mimeType && cert.mimeType.startsWith("image/")) ||
        (cert.name && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(cert.name));
      const fullImageUrl =
        isImage && fileId
          ? buildDriveDirectViewLink(fileId, cert.provider)
          : null;
      return {
        displayUrl,
        viewUrl: fullImageUrl || displayUrl,
        title: cert.name,
        fullImageUrl,
        thumbnailUrl,
        url: displayUrl,
      };
    });
    setCarouselImages(images);
    setCarouselStartIndex(index || 0);
    setCarouselOpen(true);
  };

  useEffect(() => {
    console.log("carousel state changed", {
      carouselOpen,
      carouselStartIndex,
      len: carouselImages?.length,
    });
  }, [carouselOpen, carouselStartIndex, carouselImages]);

  // Get user level and company info
  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const userCompanyId = userInfo?.companyId;

  const googleDriveFolderId = getActiveStorageProviderConfig().folderId;

  useEffect(() => {
    const initGoogleDrive = async () => {
      try {
        const storageConfig = getStorageConfig();
        const activeCfg = getActiveStorageProviderConfig();
        const missingProviderConfig =
          storageConfig.provider === "google"
            ? !activeCfg.clientId || !activeCfg.apiKey
            : !activeCfg.clientId;
        if (missingProviderConfig) {
          console.error("Missing Google Drive credentials");
          return;
        }
        const { tokenClient } = await initStorageTokenClient({
          provider: storageConfig.provider,
        });
        tokenClientRef.current = tokenClient;
        setDriveReady(true);
      } catch (error) {
        console.error("Error initializing Google Drive:", error);
      }
    };

    initGoogleDrive();
  }, []);

  useEffect(() => {
    loadStaffList();
  }, [userCompanyId, isUserLevelNine]);

  const loadStaffList = async () => {
    try {
      setLoading(true);
      // Fetch all staff
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
              const skillResponse = await request(
                "GET",
                `/api/staffskillprofiles/staff/${staff.staffName}`,
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
    } finally {
      setLoading(false);
    }
  };

  const loadStaffSkills = async (staffName) => {
    try {
      setSkillsLoading(true);
      setError("");
      const response = await request(
        "GET",
        `/api/staffskillprofiles/staff/${staffName}`,
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
    loadStaffSkills(staff.staffName);
  };

  const handleBack = () => {
    setSelectedStaff(null);
    setStaffSkills([]);
    // Reload staff list to refresh badges
    loadStaffList();
  };

  const loadAvailableSkills = async () => {
    try {
      const response = await request("GET", "/api/staffskills");
      if (response.data) {
        const skills = Array.isArray(response.data)
          ? response.data
          : response.data.items || [];
        setAvailableSkills(skills);
      }
    } catch (error) {
      console.error("Error loading available skills:", error);
      setAvailableSkills([]);
    }
  };

  const requestDriveToken = (autoOpenPicker = false) =>
    new Promise((resolve, reject) => {
      authorizingRef.current = true;
      requestGoogleAccessTokenWithState({
        tokenClient: tokenClientRef.current,
        currentToken: driveToken,
        flowKey: "staff-skill-profile-drive-upload",
      })
        .then((accessToken) => {
          authorizingRef.current = false;
          if (autoOpenPicker && fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
          }
          setDriveToken(accessToken);
          resolve(accessToken);
        })
        .catch((error) => {
          authorizingRef.current = false;
          reject(error);
        });
    });
  const handleUploadButtonClick = async () => {
    try {
      if (!driveToken) {
        console.log("Requesting Drive authorization...");
        // Pass false - we'll open file picker on second click after auth
        await requestDriveToken(false);
        console.log(
          "Authorization successful, user should click Upload File again",
        );
        return;
      }

      // Token exists, open file picker with user activation from button click
      console.log("Token exists, opening file picker...");
      setUploadError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    } catch (error) {
      console.error("Authorization error:", error);
      setUploadError(error.message || t("staffManagement.uploadFailed"));
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageProvider = getStorageConfig().provider;

    try {
      setIsUploading(true);

      // Token should already exist from handleUploadButtonClick
      if (!driveToken) {
        throw new Error("No authorization token available");
      }

      const fileLink = await uploadFileToDrive(
        file,
        driveToken,
        googleDriveFolderId,
      );
      const fileId = getFileIdFromLink(fileLink);
      const newCertification = {
        id: fileId || null,
        name: file.name,
        mimeType: file.type || "",
        provider: storageProvider,
        url: fileLink,
        uploadedAt: new Date().toISOString(),
      };
      setSkillFormData((prev) => ({
        ...prev,
        certificationLinks: [...prev.certificationLinks, newCertification],
      }));
      // Clear file input for next upload
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploadError(error.message || t("staffManagement.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSkillClick = () => {
    loadAvailableSkills();
    setShowSkillModal(true);
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkill(skill);
    setShowSkillModal(false);
    setShowSkillForm(true);
    setUploadError("");
    setIsUploading(false);
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

  const handleSkillFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const normalizedCertLinks = skillFormData.certificationLinks
        .map((cert) => {
          const id = cert.id || getFileIdFromLink(cert.url);
          // Only include documents with valid IDs
          if (!id) {
            console.warn("Skipping document without valid ID:", cert);
            return null;
          }
          return {
            id: id,
            name: cert.name || "",
            mimeType: cert.mimeType || "",
            provider: cert.provider || getStorageConfig().provider,
            uploadedAt: cert.uploadedAt || new Date().toISOString(),
          };
        })
        .filter((cert) => cert !== null); // Remove null entries

      if (
        normalizedCertLinks.length === 0 &&
        skillFormData.certificationLinks.length > 0
      ) {
        throw new Error(
          "No valid certification documents found. Please upload valid files.",
        );
      }

      const payload = {
        staffName: selectedStaff.staffName,
        staffSkillId: selectedSkill.staffSkillId,
        issuedBy: skillFormData.issuedBy,
        acquiredDate: skillFormData.acquiredDate,
        expiryDate: skillFormData.noExpiry ? null : skillFormData.expiryDate,
        noExpiry: skillFormData.noExpiry ? 1 : 0,
        certificationLink: JSON.stringify(normalizedCertLinks),
      };

      await request("POST", "/api/staffskillprofiles", payload);

      // Reload both staff skills and staff list to update badges
      await Promise.all([
        loadStaffSkills(selectedStaff.staffName),
        loadStaffList(),
      ]);

      // Close form
      setShowSkillForm(false);
      setSelectedSkill(null);
    } catch (error) {
      console.error("Error saving staff skill profile:", error);
      console.error("Error response:", error.response?.data);
      const errorMsg =
        error.response?.status === 401
          ? t("staffManagement.unauthorizedError")
          : error.response?.data?.message ||
            t("staffManagement.errorSavingSkill");
      setError(errorMsg);
    }
  };

  const handleNewSkillClick = () => {
    setShowSkillModal(false);
    setShowNewSkillForm(true);
    setNewSkillData({
      skillName: "",
      skillDescription: "",
      skillCategory: "",
    });
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
        // Auto-select the newly created skill
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

  const handleEditSkillClick = (skill) => {
    setEditingSkill(skill);
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
            if (typeof cert === "string") {
              return {
                id: getFileIdFromLink(cert),
                name: "Legacy Certificate",
                url: cert,
                uploadedAt: new Date().toISOString(),
              };
            }
            return {
              id: cert.id || getFileIdFromLink(cert.url),
              name: cert.name || "",
              url:
                cert.url ||
                (cert.id ? buildDriveViewLink(cert.id, cert.provider) : ""),
              uploadedAt: cert.uploadedAt || new Date().toISOString(),
            };
          });
        }
      }
    } catch (e) {
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
    setSkillFormData({
      issuedBy: skill.issuedBy || "",
      acquiredDate: skill.acquiredDate || "",
      expiryDate: skill.expiryDate || "",
      noExpiry: skill.noExpiry === 1 || skill.noExpiry === true,
      certificationLinks: certificationLinks,
    });
    setUploadError("");
    setIsUploading(false);
    setShowEditSkillForm(true);
  };

  const handleEditSkillSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!editingSkill || !editingSkill.staffSkillProfileId) {
        throw new Error("Invalid skill to edit");
      }

      const normalizedCertLinks = skillFormData.certificationLinks
        .map((cert) => {
          const id = cert.id || getFileIdFromLink(cert.url);
          // Only include documents with valid IDs
          if (!id) {
            console.warn("Skipping document without valid ID:", cert);
            return null;
          }
          return {
            id: id,
            name: cert.name || "",
            mimeType: cert.mimeType || "",
            provider: cert.provider || getStorageConfig().provider,
            uploadedAt: cert.uploadedAt || new Date().toISOString(),
          };
        })
        .filter((cert) => cert !== null); // Remove null entries

      if (
        normalizedCertLinks.length === 0 &&
        skillFormData.certificationLinks.length > 0
      ) {
        throw new Error(
          "No valid certification documents found. Please upload valid files.",
        );
      }

      const payload = {
        staffSkillProfileId: editingSkill.staffSkillProfileId,
        staffName: editingSkill.staffName,
        staffSkillId: editingSkill.staffSkillId,
        issuedBy: skillFormData.issuedBy,
        acquiredDate: skillFormData.acquiredDate,
        expiryDate: skillFormData.noExpiry ? null : skillFormData.expiryDate,
        noExpiry: skillFormData.noExpiry ? 1 : 0,
        certificationLink: JSON.stringify(normalizedCertLinks),
      };

      await request(
        "PUT",
        `/api/staffskillprofiles/${editingSkill.staffSkillProfileId}`,
        payload,
      );

      // Reload both staff skills and staff list to update badges
      await Promise.all([
        loadStaffSkills(editingSkill.staffName),
        loadStaffList(),
      ]);

      // Close form
      setShowEditSkillForm(false);
      setEditingSkill(null);
    } catch (error) {
      console.error("Error updating staff skill profile:", error);
      console.error("Error response data:", error.response?.data);
      const errorMsg =
        error.response?.status === 401
          ? t("staffManagement.unauthorizedError")
          : error.response?.data?.message ||
            t("staffManagement.errorUpdatingSkill");
      setError(errorMsg);
    }
  };

  const handleRemoveCertification = (index) => {
    setSkillFormData((prev) => ({
      ...prev,
      certificationLinks: prev.certificationLinks.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteSkillClick = (skill) => {
    setSkillToDelete(skill);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteSkillConfirm = async () => {
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
        loadStaffSkills(skillToDelete.staffName),
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

  const closeAllModals = () => {
    setShowSkillModal(false);
    setShowSkillForm(false);
    setShowNewSkillForm(false);
    setShowEditSkillForm(false);
    setSelectedSkill(null);
    setEditingSkill(null);
    setShowDeleteConfirmation(false);
    setSkillToDelete(null);
  };

  if (selectedStaff) {
    return (
      <div className="staff-skill-profile">
        <div className="header">
          <button className="back-btn" onClick={handleBack}>
            ← {t("common.back")}
          </button>
          <h2>
            {t("staffManagement.staffSkillProfile")} -{" "}
            {selectedStaff.staffName || selectedStaff.name}
          </h2>
          <button className="add-skill-btn" onClick={handleAddSkillClick}>
            + {t("staffManagement.addSkill")}
          </button>
        </div>

        {skillsLoading ? (
          <p>{t("common.loading")}</p>
        ) : error ? (
          <div className="error-container">
            <div className="error-message">{error}</div>
            <button
              className="retry-btn"
              onClick={() => loadStaffSkills(selectedStaff.staffName)}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <div className="skills-detail-container">
            {staffSkills.length > 0 ? (
              <table className="skills-table">
                <thead>
                  <tr>
                    <th>{t("staffManagement.skillName")}</th>
                    <th>{t("staffManagement.skillDescription")}</th>
                    <th>{t("staffManagement.skillCategory")}</th>
                    <th>{t("staffManagement.issuedBy")}</th>
                    <th>{t("staffManagement.acquiredDate")}</th>
                    <th>{t("staffManagement.expiryDate")}</th>
                    <th>{t("staffManagement.certification")}</th>
                    <th>{t("staffManagement.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {staffSkills.map((skill) => (
                    <tr key={skill.staffSkillProfileId}>
                      <td>{skill.skillName || "-"}</td>
                      <td>{skill.skillDescription || "-"}</td>
                      <td>{skill.skillCategory || "-"}</td>
                      <td>{skill.issuedBy || "-"}</td>
                      <td>
                        {skill.acquiredDate
                          ? new Date(skill.acquiredDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {skill.noExpiry
                          ? t("staffManagement.noExpiry")
                          : skill.expiryDate
                            ? new Date(skill.expiryDate).toLocaleDateString()
                            : "-"}
                      </td>
                      <td>
                        {(() => {
                          try {
                            const certLinks = skill.certificationLink
                              ? JSON.parse(skill.certificationLink)
                              : null;
                            if (
                              Array.isArray(certLinks) &&
                              certLinks.length > 0
                            ) {
                              return (
                                <span className="cert-count-badge">
                                  📄 {certLinks.length}
                                </span>
                              );
                            } else if (
                              typeof certLinks === "string" &&
                              certLinks
                            ) {
                              // Backward compatibility for old string format
                              return (
                                <span className="cert-count-badge">📄 1</span>
                              );
                            } else if (
                              skill.certificationLink &&
                              typeof skill.certificationLink === "string"
                            ) {
                              // Handle non-JSON string (old format)
                              return (
                                <span className="cert-count-badge">📄 1</span>
                              );
                            }
                          } catch (e) {
                            // If JSON parsing fails, treat as old string format
                            if (skill.certificationLink) {
                              return (
                                <span className="cert-count-badge">📄 1</span>
                              );
                            }
                          }
                          return "-";
                        })()}
                      </td>
                      <td className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEditSkillClick(skill)}
                          title={t("staffManagement.edit")}
                        >
                          ✎
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteSkillClick(skill)}
                          title={t("staffManagement.delete")}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-skills-message">
                {t("staffManagement.noSkillsFound")}
              </p>
            )}
          </div>
        )}

        {/* Skill Selection Modal */}
        {showSkillModal && (
          <div className="modal-overlay" onClick={closeAllModals}>
            <div
              className="modal-content skill-selection-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{t("staffManagement.selectSkill")}</h3>
                <button className="close-btn" onClick={closeAllModals}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                {/* Search and Filter Section */}
                <div className="skill-filter-section">
                  <input
                    type="text"
                    className="skill-search-input"
                    placeholder={t("staffManagement.searchSkills")}
                    value={skillSearchTerm}
                    onChange={(e) => setSkillSearchTerm(e.target.value)}
                  />
                  <div className="skill-category-filters">
                    <button
                      className={`skill-filter-badge ${!skillCategoryFilter ? "active" : ""}`}
                      onClick={() => setSkillCategoryFilter(null)}
                    >
                      {t("common.all")}
                    </button>
                    {(() => {
                      const categories = new Set();
                      availableSkills.forEach((skill) => {
                        if (skill.skillCategory)
                          categories.add(skill.skillCategory);
                      });
                      return Array.from(categories)
                        .sort()
                        .map((category) => (
                          <button
                            key={category}
                            className={`skill-filter-badge ${skillCategoryFilter === category ? "active" : ""}`}
                            onClick={() =>
                              setSkillCategoryFilter(
                                skillCategoryFilter === category
                                  ? null
                                  : category,
                              )
                            }
                          >
                            {category}
                          </button>
                        ));
                    })()}
                  </div>
                </div>

                {/* Skills List */}
                <div className="skills-list-container">
                  {availableSkills
                    .filter((skill) => {
                      // Filter by search term
                      if (skillSearchTerm) {
                        const search = skillSearchTerm.toLowerCase();
                        const name = (skill.skillName || "").toLowerCase();
                        const desc = (
                          skill.skillDescription || ""
                        ).toLowerCase();
                        if (!name.includes(search) && !desc.includes(search))
                          return false;
                      }
                      // Filter by category
                      if (
                        skillCategoryFilter &&
                        skill.skillCategory !== skillCategoryFilter
                      )
                        return false;
                      return true;
                    })
                    .map((skill) => (
                      <div
                        key={skill.staffSkillId}
                        className="skill-item"
                        onClick={() => handleSkillSelect(skill)}
                      >
                        <h4>{skill.skillName}</h4>
                        <p>{skill.skillDescription || "-"}</p>
                        <span className="skill-category">
                          {skill.skillCategory || "-"}
                        </span>
                      </div>
                    ))}
                  <ImageCarousel
                    images={carouselImages}
                    open={carouselOpen}
                    onClose={() => setCarouselOpen(false)}
                    startIndex={carouselStartIndex}
                  />
                </div>

                <button className="new-skill-btn" onClick={handleNewSkillClick}>
                  + {t("staffManagement.addNewSkill")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skill Profile Form Modal */}
        {showSkillForm && selectedSkill && (
          <div className="modal-overlay" onClick={closeAllModals}>
            <div
              className="modal-content skill-form-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  {t("staffManagement.addSkillDetails")} -{" "}
                  {selectedSkill.skillName}
                </h3>
                <button className="close-btn" onClick={closeAllModals}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSkillFormSubmit} className="skill-form">
                  <div className="form-group">
                    <label>{t("staffManagement.issuedBy")}</label>
                    <input
                      type="text"
                      value={skillFormData.issuedBy}
                      onChange={(e) =>
                        handleSkillFormChange("issuedBy", e.target.value)
                      }
                      placeholder="e.g., Company Training Center"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("staffManagement.acquiredDate")} *</label>
                    <input
                      type="date"
                      value={skillFormData.acquiredDate}
                      onChange={(e) =>
                        handleSkillFormChange("acquiredDate", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={skillFormData.noExpiry}
                        onChange={(e) =>
                          handleSkillFormChange("noExpiry", e.target.checked)
                        }
                      />
                      <span>{t("staffManagement.noExpiry")}</span>
                    </label>
                  </div>
                  {!skillFormData.noExpiry && (
                    <div className="form-group">
                      <label>{t("staffManagement.expiryDate")}</label>
                      <input
                        type="date"
                        value={skillFormData.expiryDate}
                        onChange={(e) =>
                          handleSkillFormChange("expiryDate", e.target.value)
                        }
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>{t("staffManagement.certificationLinks")}</label>

                    {/* Display uploaded certification files as chips */}
                    {skillFormData.certificationLinks.length > 0 && (
                      <div className="certification-icons-display">
                        {skillFormData.certificationLinks.map((cert, index) => (
                          <FileChip
                            key={index}
                            file={cert}
                            size={56}
                            onClick={() =>
                              openCarouselAt(
                                index,
                                skillFormData.certificationLinks,
                              )
                            }
                            onRemove={() => handleRemoveCertification(index)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginTop:
                          skillFormData.certificationLinks.length > 0
                            ? "12px"
                            : "0",
                      }}
                    >
                      {driveReady && (
                        <button
                          type="button"
                          onClick={handleUploadButtonClick}
                          className="upload-button"
                          disabled={isUploading}
                          title={t("staffManagement.uploadFileToGoogleDrive")}
                        >
                          📤{" "}
                          {isUploading
                            ? t("staffManagement.uploading")
                            : driveToken
                              ? t("staffManagement.addFile")
                              : t("staffManagement.authorizeAndUpload")}
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="file-input-hidden"
                      onChange={handleFileSelect}
                      accept="application/pdf,image/*"
                    />
                    {/* ImageCarousel intentionally rendered at top-level of each return branch */}
                    {isUploading && (
                      <div className="upload-status">
                        {t("staffManagement.uploadingFile")}
                      </div>
                    )}
                    {uploadError && (
                      <div className="upload-error">{uploadError}</div>
                    )}
                    {!isUploading &&
                      !uploadError &&
                      driveReady &&
                      skillFormData.certificationLinks.length === 0 && (
                        <div className="upload-hint">
                          {driveToken
                            ? t("staffManagement.clickAddFileHint")
                            : t("staffManagement.clickAuthorizeHint")}
                        </div>
                      )}
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={closeAllModals}
                    >
                      {t("common.cancel")}
                    </button>
                    <button type="submit" className="submit-btn">
                      {t("common.save")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Skill Form Modal */}
        {showEditSkillForm && editingSkill && (
          <div className="modal-overlay" onClick={closeAllModals}>
            <div
              className="modal-content skill-form-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  {t("staffManagement.editSkillDetails")} -{" "}
                  {editingSkill.skillName}
                </h3>
                <button className="close-btn" onClick={closeAllModals}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleEditSkillSubmit} className="skill-form">
                  <div className="form-group">
                    <label>{t("staffManagement.issuedBy")}</label>
                    <input
                      type="text"
                      value={skillFormData.issuedBy}
                      onChange={(e) =>
                        handleSkillFormChange("issuedBy", e.target.value)
                      }
                      placeholder="e.g., Company Training Center"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("staffManagement.acquiredDate")} *</label>
                    <input
                      type="date"
                      value={skillFormData.acquiredDate}
                      onChange={(e) =>
                        handleSkillFormChange("acquiredDate", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={skillFormData.noExpiry}
                        onChange={(e) =>
                          handleSkillFormChange("noExpiry", e.target.checked)
                        }
                      />
                      <span>{t("staffManagement.noExpiry")}</span>
                    </label>
                  </div>
                  {!skillFormData.noExpiry && (
                    <div className="form-group">
                      <label>{t("staffManagement.expiryDate")}</label>
                      <input
                        type="date"
                        value={skillFormData.expiryDate}
                        onChange={(e) =>
                          handleSkillFormChange("expiryDate", e.target.value)
                        }
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>{t("staffManagement.certificationLinks")}</label>

                    {/* Display uploaded certification files as chips */}
                    {skillFormData.certificationLinks.length > 0 && (
                      <div className="certification-icons-display">
                        {skillFormData.certificationLinks.map((cert, index) => (
                          <FileChip
                            key={index}
                            file={cert}
                            size={56}
                            onClick={() =>
                              openCarouselAt(
                                index,
                                skillFormData.certificationLinks,
                              )
                            }
                            onRemove={() => handleRemoveCertification(index)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginTop:
                          skillFormData.certificationLinks.length > 0
                            ? "12px"
                            : "0",
                      }}
                    >
                      {driveReady && (
                        <button
                          type="button"
                          onClick={handleUploadButtonClick}
                          className="upload-button"
                          disabled={isUploading}
                          title={t("staffManagement.uploadFileToGoogleDrive")}
                        >
                          📤{" "}
                          {isUploading
                            ? t("staffManagement.uploading")
                            : driveToken
                              ? t("staffManagement.addFile")
                              : t("staffManagement.authorizeAndUpload")}
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="file-input-hidden"
                      onChange={handleFileSelect}
                      accept="application/pdf,image/*"
                    />
                    {isUploading && (
                      <div className="upload-status">
                        {t("staffManagement.uploadingFile")}
                      </div>
                    )}
                    {uploadError && (
                      <div className="upload-error">{uploadError}</div>
                    )}
                    {!isUploading &&
                      !uploadError &&
                      driveReady &&
                      skillFormData.certificationLinks.length === 0 && (
                        <div className="upload-hint">
                          {driveToken
                            ? t("staffManagement.clickAddFileHint")
                            : t("staffManagement.clickAuthorizeHint")}
                        </div>
                      )}
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={closeAllModals}
                    >
                      {t("common.cancel")}
                    </button>
                    <button type="submit" className="submit-btn">
                      {t("common.save")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* New Skill Form Modal */}
        {showNewSkillForm && (
          <div className="modal-overlay" onClick={closeAllModals}>
            <div
              className="modal-content skill-form-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{t("staffManagement.createNewSkill")}</h3>
                <button className="close-btn" onClick={closeAllModals}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleNewSkillSubmit} className="skill-form">
                  <div className="form-group">
                    <label>{t("staffManagement.skillName")} *</label>
                    <input
                      type="text"
                      value={newSkillData.skillName}
                      onChange={(e) =>
                        handleNewSkillChange("skillName", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("staffManagement.skillDescription")}</label>
                    <textarea
                      value={newSkillData.skillDescription}
                      onChange={(e) =>
                        handleNewSkillChange("skillDescription", e.target.value)
                      }
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("staffManagement.skillCategory")}</label>
                    <input
                      type="text"
                      list="skill-categories-list"
                      value={newSkillData.skillCategory}
                      onChange={(e) =>
                        handleNewSkillChange("skillCategory", e.target.value)
                      }
                      placeholder={t("staffManagement.selectOrEnterCategory")}
                    />
                    <datalist id="skill-categories-list">
                      {(() => {
                        // Get unique categories from all staff
                        const categories = new Set();
                        staffList.forEach((staff) => {
                          if (
                            staff.skillCategories &&
                            staff.skillCategories.length > 0
                          ) {
                            staff.skillCategories.forEach((category) =>
                              categories.add(category),
                            );
                          }
                        });
                        return Array.from(categories)
                          .sort()
                          .map((category) => (
                            <option key={category} value={category} />
                          ));
                      })()}
                    </datalist>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={closeAllModals}
                    >
                      {t("common.cancel")}
                    </button>
                    <button type="submit" className="submit-btn">
                      {t("common.save")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && skillToDelete && (
          <div className="modal-overlay" onClick={closeAllModals}>
            <div
              className="modal-content delete-confirmation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{t("staffManagement.confirmDelete")}</h3>
                <button className="close-btn" onClick={closeAllModals}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}
                <p className="delete-message">
                  {t("staffManagement.deleteSkillMessage", {
                    skillName: skillToDelete.skillName,
                  })}
                </p>
                <div className="confirmation-actions">
                  <button className="cancel-btn" onClick={closeAllModals}>
                    {t("common.cancel")}
                  </button>
                  <button
                    className="delete-btn"
                    onClick={handleDeleteSkillConfirm}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <ImageCarousel
          images={carouselImages}
          open={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          startIndex={carouselStartIndex}
        />
      </div>
    );
  }

  return (
    <div className="staff-skill-profile">
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          ← {t("common.back")}
        </button>
        <h2>{t("staffManagement.staffSkillProfile")}</h2>
      </div>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          <div className="filter-frame">
            <div className="search-section">
              <input
                type="text"
                className="search-input"
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="category-filter-section">
              <h4>{t("staffManagement.skillCategories")}</h4>
              <div className="category-badges">
                <button
                  className={`filter-category-badge ${!selectedCategory ? "active" : ""}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  {t("common.all")}
                </button>
                {(() => {
                  // Get unique categories from filtered staff
                  const filteredBySearch = staffList.filter((staff) => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    const name = (
                      staff.staffName ||
                      staff.name ||
                      ""
                    ).toLowerCase();
                    const code = (
                      staff.staffCode ||
                      staff.code ||
                      ""
                    ).toLowerCase();
                    return name.includes(search) || code.includes(search);
                  });

                  const categoriesMap = new Map();
                  filteredBySearch.forEach((staff) => {
                    if (
                      staff.skillCategories &&
                      staff.skillCategories.length > 0
                    ) {
                      staff.skillCategories.forEach((category) => {
                        categoriesMap.set(
                          category,
                          (categoriesMap.get(category) || 0) + 1,
                        );
                      });
                    }
                  });

                  return Array.from(categoriesMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <button
                        key={category}
                        className={`filter-category-badge ${selectedCategory === category ? "active" : ""}`}
                        onClick={() =>
                          setSelectedCategory(
                            selectedCategory === category ? null : category,
                          )
                        }
                      >
                        {category} ({count})
                      </button>
                    ));
                })()}
              </div>
            </div>
          </div>
          <div className="staff-list-container">
            {staffList.filter((staff) => {
              // Filter by search term
              if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const name = (
                  staff.staffName ||
                  staff.name ||
                  ""
                ).toLowerCase();
                const code = (
                  staff.staffCode ||
                  staff.code ||
                  ""
                ).toLowerCase();
                if (!name.includes(search) && !code.includes(search))
                  return false;
              }
              // Filter by selected category
              if (selectedCategory) {
                if (
                  !staff.skillCategories ||
                  !staff.skillCategories.includes(selectedCategory)
                )
                  return false;
              }
              return true;
            }).length > 0 ? (
              <div className="staff-list">
                {staffList
                  .filter((staff) => {
                    // Filter by search term
                    if (searchTerm) {
                      const search = searchTerm.toLowerCase();
                      const name = (
                        staff.staffName ||
                        staff.name ||
                        ""
                      ).toLowerCase();
                      const code = (
                        staff.staffCode ||
                        staff.code ||
                        ""
                      ).toLowerCase();
                      if (!name.includes(search) && !code.includes(search))
                        return false;
                    }
                    // Filter by selected category
                    if (selectedCategory) {
                      if (
                        !staff.skillCategories ||
                        !staff.skillCategories.includes(selectedCategory)
                      )
                        return false;
                    }
                    return true;
                  })
                  .map((staff) => (
                    <div
                      key={staff.staffName}
                      className="staff-card"
                      onClick={() => handleStaffClick(staff)}
                    >
                      <div className="staff-info">
                        <h3>{staff.staffName || staff.name}</h3>
                        <p>{staff.staffCode || staff.code}</p>
                      </div>
                      <div className="staff-skills-summary">
                        <span className="skill-badge">
                          {t("staffManagement.skills")}: {staff.skillCount || 0}
                        </span>
                        {staff.skillCategories &&
                          staff.skillCategories.length > 0 && (
                            <div className="skill-categories-container">
                              {staff.skillCategories.map((category, index) => (
                                <span
                                  key={index}
                                  className="skill-category-badge"
                                >
                                  {category}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="no-staff-message">
                {t("staffManagement.noStaffFound")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StaffSkillProfile;
