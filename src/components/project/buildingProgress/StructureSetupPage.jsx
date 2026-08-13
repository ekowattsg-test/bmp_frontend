import React, { useState } from "react";
import { Box, Grid } from "@mui/material";
import { useTranslation } from "react-i18next";
import { HeaderBar } from "../../common";
import BlockManager from "./BlockManager";
import StoreyManager from "./StoreyManager";
import StackManager from "./StackManager";
import UnitManager from "./UnitManager";

const StructureSetupPage = ({ project, onBack }) => {
  const { t } = useTranslation();
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedStorey, setSelectedStorey] = useState(null);
  const [selectedStack, setSelectedStack] = useState(null);

  const handleSelectBlock = (block) => {
    setSelectedBlock(block);
    setSelectedStorey(null);
    setSelectedStack(null);
  };

  const handleSelectStorey = (storey) => {
    setSelectedStorey(storey);
  };

  const handleSelectStack = (stack) => {
    setSelectedStack(stack);
  };

  return (
    <Box>
      <HeaderBar
        title={t("buildingProgress.structureSetupTitle", "Structure Setup")}
        subtitle={t(
          "buildingProgress.structureSetupSubtitle",
          "Manage blocks, storeys, stacks, and units for {{projectCode}}.",
          { projectCode: project?.projectCode || "" },
        )}
        showBackButton
        onBack={onBack}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <BlockManager
            projectCode={project?.projectCode}
            onSelectBlock={handleSelectBlock}
            selectedBlockId={selectedBlock?.projectBlockId}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StoreyManager
            block={selectedBlock}
            onSelectStorey={handleSelectStorey}
            selectedStoreyId={selectedStorey?.projectStoreyId}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StackManager
            block={selectedBlock}
            onSelectStack={handleSelectStack}
            selectedStackId={selectedStack?.projectStackId}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <UnitManager
            storey={selectedStorey}
            stack={selectedStack}
            blockName={selectedBlock?.blockName}
            projectCode={project?.projectCode}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default StructureSetupPage;
