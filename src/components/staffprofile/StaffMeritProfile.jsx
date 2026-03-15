import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const StaffMeritProfile = ({ onBack }) => {
  const { t } = useTranslation();
  const [meritProfiles, setMeritProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeritProfiles();
  }, []);

  const loadMeritProfiles = () => {
    // TODO: Implement API call to fetch staff merit profiles
    setLoading(false);
  };

  return (
    <div className="staff-merit-profile">
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          ← {t("common.back")}
        </button>
        <h2>{t("staffManagement.staffMeritProfile")}</h2>
      </div>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div className="merit-profiles-container">
          {/* TODO: Display staff merit profiles */}
          <p>{t("common.noData")}</p>
        </div>
      )}
    </div>
  );
};

export default StaffMeritProfile;
