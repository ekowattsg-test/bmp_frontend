import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { useTranslation } from "react-i18next";

const WorkbenchRowActionIcons = ({
  row,
  inventoryIconMeta,
  manpowerRequired,
  onOpenSettingsMenu,
  onOpenInventoryPlanning,
  onOpenSkillPlanning,
  onOpenManpowerPlanning,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "18px 18px 18px 18px",
        justifyItems: "center",
        alignItems: "center",
        width: 72,
      }}
    >
      <Box
        sx={{
          width: 18,
          height: 18,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconButton
          size="small"
          onClick={(event) => onOpenSettingsMenu(event, row)}
          aria-label={t("basic.settings")}
          sx={{
            width: 16,
            height: 16,
            color: "text.secondary",
            opacity: 0.62,
            p: 0,
            m: "1px",
            "&:hover": {
              opacity: 0.85,
              bgcolor: "action.hover",
            },
          }}
        >
          <SettingsIcon sx={{ fontSize: "0.875rem" }} />
        </IconButton>
      </Box>

      {inventoryIconMeta ? (
        <Tooltip title={t("projectPlanning.openInventoryPlanning")}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onOpenInventoryPlanning(row);
            }}
            sx={{
              width: 16,
              height: 16,
              color: inventoryIconMeta.color,
              p: 0,
              m: "1px",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            {(() => {
              const InventoryIcon = inventoryIconMeta.icon;
              return <InventoryIcon sx={{ fontSize: "0.875rem" }} />;
            })()}
          </IconButton>
        </Tooltip>
      ) : (
        <Box
          component="span"
          sx={{
            width: 18,
            height: 18,
            display: "inline-flex",
            flexShrink: 0,
            m: "1px",
          }}
        />
      )}

      {manpowerRequired > 0 ? (
        <Tooltip title={t("projectPlanning.openSkillPlanning")}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onOpenSkillPlanning(row);
            }}
            sx={{
              width: 16,
              height: 16,
              color: "secondary.main",
              p: 0,
              m: "1px",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <ChecklistOutlinedIcon sx={{ fontSize: "0.875rem" }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Box
          component="span"
          sx={{
            width: 18,
            height: 18,
            display: "inline-flex",
            flexShrink: 0,
            m: "1px",
          }}
        />
      )}

      {manpowerRequired > 0 ? (
        <Tooltip
          title={t(
            "projectPlanning.openManpowerPlanning",
            "Open manpower workspace",
          )}
        >
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onOpenManpowerPlanning(row);
            }}
            sx={{
              width: 16,
              height: 16,
              color: "warning.main",
              p: 0,
              m: "1px",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <GroupsOutlinedIcon sx={{ fontSize: "0.875rem" }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Box
          component="span"
          sx={{
            width: 18,
            height: 18,
            display: "inline-flex",
            flexShrink: 0,
            m: "1px",
          }}
        />
      )}
    </Box>
  );
};

export default WorkbenchRowActionIcons;
