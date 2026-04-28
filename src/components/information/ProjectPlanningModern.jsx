import React from "react";
import { Box } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { useTranslation } from "react-i18next";
import { PageHeader, EmptyState } from "../common";

const ProjectPlanningModern = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader
        title={t("projectPlanning.title")}
        subtitle={t("projectPlanning.subtitle")}
        icon={AccountTreeIcon}
      />
      <EmptyState
        icon={AccountTreeIcon}
        title={t("basic.comingSoon", "Coming Soon")}
        description={t("basic.underConstruction", "This page is under construction.")}
      />
    </Box>
  );
};

export default ProjectPlanningModern;
