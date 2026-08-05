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

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadStaffProfilingData();
    }
  }, [activeTab]);

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

        const staffIds = staffs
          .map((staff) => String(staff?.staffId || "").trim())
          .filter(Boolean);

        if (staffIds.length === 0) {
          setSkillSetCount(0);
          setOverallMerit(0);
          setOverallDemerit(0);
          return;
        }

        const [skillProfilesByStaff, meritProfilesByStaff] = await Promise.all([
          Promise.all(
            staffIds.map(async (staffId) => {
              try {
                const skillResponse = await request(
                  "GET",
                  `/api/staffskillprofiles/staffid/${encodeURIComponent(staffId)}`,
                );
                return Array.isArray(skillResponse?.data)
                  ? skillResponse.data
                  : skillResponse?.data?.items || [];
              } catch {
                return [];
              }
            }),
          ),
          Promise.all(
            staffIds.map(async (staffId) => {
              try {
                const meritResponse = await request(
                  "GET",
                  `/api/staffmeritprofiles?staffId=${encodeURIComponent(staffId)}`,
                );
                return Array.isArray(meritResponse?.data)
                  ? meritResponse.data
                  : meritResponse?.data?.items || [];
              } catch {
                return [];
              }
            }),
          ),
        ]);

        const uniqueSkillIds = new Set();
        skillProfilesByStaff.flat().forEach((profile) => {
          const skillId = String(profile?.staffSkillId || "").trim();
          if (skillId) {
            uniqueSkillIds.add(skillId);
          }
        });
        setSkillSetCount(uniqueSkillIds.size);

        const meritPointSummary = meritProfilesByStaff.flat().reduce(
          (acc, profile) => {
            const points = Number(profile?.meritPoints || 0);
            if (points > 0) {
              acc.merit += points;
            } else if (points < 0) {
              acc.demerit += Math.abs(points);
            }
            return acc;
          },
          { merit: 0, demerit: 0 },
        );

        setOverallMerit(meritPointSummary.merit);
        setOverallDemerit(meritPointSummary.demerit);
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

  const handleBackToDashboard = () => {
    setActiveTab("dashboard");
    loadStaffProfilingData();
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
          <StaffSkillProfile onBack={handleBackToDashboard} />
        )}
        {activeTab === "meritProfile" && (
          <StaffMeritProfile onBack={handleBackToDashboard} />
        )}
        {activeTab === "skillAnalysis" && (
          <StaffSkillProfileAnalysis onBack={handleBackToDashboard} />
        )}
        {activeTab === "meritAnalysis" && (
          <StaffMeritProfileAnalysis onBack={handleBackToDashboard} />
        )}
      </Box>
    </Box>
  );
};

export default StaffProfile;
