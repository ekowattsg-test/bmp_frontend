import React from "react";
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";

const WorkbenchTimelineToolbar = ({
  viewMode,
  onViewModeChange,
  onAddStream,
  onOpenInventoryOverview,
  onOpenSkillOverview,
  onOpenManpowerOverview,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="subtitle1" sx={{ lineHeight: 1.25 }}>
          {t("projectPlanning.ganttTitle")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon fontSize="small" />}
          onClick={onAddStream}
          sx={{ minWidth: 140, fontWeight: 600 }}
        >
          {t("projectPlanning.addStream")}
        </Button>
        <Button
          variant="outlined"
          onClick={onOpenInventoryOverview}
          sx={{ minWidth: 170, fontWeight: 600 }}
        >
          {t("projectPlanning.inventoryOverview")}
        </Button>
        <Button
          variant="outlined"
          onClick={onOpenSkillOverview}
          sx={{ minWidth: 170, fontWeight: 600 }}
        >
          {t("projectPlanning.skillOverview")}
        </Button>
        <Button
          variant="outlined"
          onClick={onOpenManpowerOverview}
          sx={{ minWidth: 180, fontWeight: 600 }}
        >
          {t("projectPlanning.manpowerOverview")}
        </Button>
      </Box>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, val) => {
          if (val) onViewModeChange(val);
        }}
        size="small"
      >
        <ToggleButton value="day">{t("projectPlanning.viewDay")}</ToggleButton>
        <ToggleButton value="week">
          {t("projectPlanning.viewWeek")}
        </ToggleButton>
        <ToggleButton value="month">
          {t("projectPlanning.viewMonth")}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default WorkbenchTimelineToolbar;
