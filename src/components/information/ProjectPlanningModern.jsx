import React, { useState } from "react";
import { Box } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { useTranslation } from "react-i18next";
import { PageHeader, EmptyState } from "../common";
import HelpDialog from "../common/HelpDialog";

const ProjectPlanningModern = () => {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <Box>
      <PageHeader
        title={t("projectPlanning.title")}
        subtitle={t("projectPlanning.subtitle")}
        icon={AccountTreeIcon}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("projectPlanning.helpTitle")}
        content={t("projectPlanning.helpBody")}
      />
      <EmptyState
        icon={AccountTreeIcon}
        title={t("basic.comingSoon", "Coming Soon")}
        description={t(
          "basic.underConstruction",
          "This page is under construction.",
        )}
      />
    </Box>
  );
};

export default ProjectPlanningModern;
