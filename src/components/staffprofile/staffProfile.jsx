import React, { useState, useEffect, useContext } from "react";
import { Box } from "@mui/material";
import { People as PeopleIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import { PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";
import StaffSkillProfile from "./StaffSkillProfile";
import StaffMeritProfile from "./StaffMeritProfile";
import StaffSkillProfileAnalysis from "./StaffSkillProfileAnalysis";
import StaffMeritProfileAnalysis from "./StaffMeritProfileAnalysis";

const StaffProfile = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffCount, setStaffCount] = useState(0);
  const [skillSetCount, setSkillSetCount] = useState(0);
  const [overallMerit, setOverallMerit] = useState(0);
  const [overallDemerit, setOverallDemerit] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get user level and company info
  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const userCompanyId = userInfo?.companyId;

  useEffect(() => {
    loadStaffProfilingData();
  }, [userCompanyId, isUserLevelNine]);

  const loadStaffProfilingData = async () => {
    try {
      setLoading(true);
      // Fetch all staff and filter based on user level
      // - If user level is 9, show all staff from all companies
      // - Otherwise, filter to show only staff from user's company

      const response = await request("GET", "/api/staffs");

      if (response.data) {
        let staffs = Array.isArray(response.data)
          ? response.data
          : response.data.items || [];

        // Filter by company if user is not level 9
        if (!isUserLevelNine && userCompanyId) {
          staffs = staffs.filter((staff) => staff.companyId === userCompanyId);
        }

        setStaffCount(staffs.length);

        // TODO: Fetch skill sets data
        setSkillSetCount(0);

        // TODO: Calculate overall merit/demerit from staff data
        setOverallMerit(0);
        setOverallDemerit(0);
      }
    } catch (error) {
      console.error("Error loading staff profiling data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
        {/* Dashboard Stats Cards */}
        <div className="grid-auto">
          <div className="stat-card">
            <h3>{t("staffManagement.totalStaff")}</h3>
            <p className="stat-value">{staffCount}</p>
          </div>
          <div className="stat-card">
            <h3>{t("staffManagement.skillSets")}</h3>
            <p className="stat-value">{skillSetCount}</p>
          </div>
          <div className="stat-card">
            <h3>{t("staffManagement.overallMerit")}</h3>
            <p className="stat-value merit">{overallMerit}</p>
          </div>
          <div className="stat-card">
            <h3>{t("staffManagement.overallDemerit")}</h3>
            <p className="stat-value demerit">{overallDemerit}</p>
          </div>
        </div>

        {/* Staff Profile Actions */}
        <div className="card">
          <h3 style={{ marginBottom: "20px" }}>
            {t("staffManagement.actions")}
          </h3>
          <div className="grid-auto-md">
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab("skillProfile")}
            >
              {t("staffManagement.staffSkillProfile")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab("meritProfile")}
            >
              {t("staffManagement.staffMeritProfile")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab("skillAnalysis")}
            >
              {t("staffManagement.staffSkillAnalysis")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab("meritAnalysis")}
            >
              {t("staffManagement.staffMeritAnalysis")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Box>
      <PageHeader
        title={t("staffProfile.title", "Staff Profile")}
        subtitle={t(
          "staffProfile.subtitle",
          "Profile, skills and merit analytics",
        )}
        onHelpClick={() => setHelpOpen(true)}
        icon={PeopleIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("staffProfile.helpTitle", "Staff profile help")}
        content={t(
          "staffProfile.helpBody",
          "View staff profiling dashboards, skill profiles and merit analyses. Use the actions to navigate between profile views and analyses.",
        )}
      />

      <Box sx={{ p: 2 }}>
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "skillProfile" && (
          <StaffSkillProfile onBack={() => setActiveTab("dashboard")} />
        )}
        {activeTab === "meritProfile" && (
          <StaffMeritProfile onBack={() => setActiveTab("dashboard")} />
        )}
        {activeTab === "skillAnalysis" && (
          <StaffSkillProfileAnalysis onBack={() => setActiveTab("dashboard")} />
        )}
        {activeTab === "meritAnalysis" && (
          <StaffMeritProfileAnalysis onBack={() => setActiveTab("dashboard")} />
        )}
      </Box>
    </Box>
  );
};

export default StaffProfile;
