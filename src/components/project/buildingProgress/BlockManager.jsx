import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";
import EntityFormDialog from "./EntityFormDialog";

const getBlockPayload = (form, projectCode, existingNumber) => ({
  projectCode,
  blockName: String(form.blockName || "").trim(),
  blockDescription: String(form.blockDescription || "").trim(),
  blockNumber: existingNumber ?? 0,
  status: "ACTIVE",
});

const BlockManager = ({ projectCode, onSelectBlock, selectedBlockId }) => {
  const { t } = useTranslation();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await request(
        "GET",
        `/api/projectblocks/project/${encodeURIComponent(projectCode)}`,
      );
      setBlocks(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setError(
        t("buildingProgress.loadBlocksFailed", "Failed to load blocks."),
      );
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [projectCode, t]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const handleAdd = () => {
    setEditingBlock(null);
    setDialogOpen(true);
  };

  const handleEdit = (block) => {
    setEditingBlock(block);
    setDialogOpen(true);
  };

  const handleDelete = async (block) => {
    const id = block?.projectBlockId;
    if (!id) return;
    if (!window.confirm(t("basic.confirmDelete", "Delete this record?")))
      return;
    try {
      await request("DELETE", `/api/projectblocks/${id}`);
      await loadBlocks();
      if (String(selectedBlockId) === String(id)) {
        onSelectBlock(null);
      }
    } catch {
      setError(t("basic.deleteFailed", "Failed to delete."));
    }
  };

  const nextBlockNumber = () => {
    if (blocks.length === 0) return 1;
    return Math.max(...blocks.map((b) => Number(b.blockNumber) || 0)) + 1;
  };

  const handleSave = async (form) => {
    setSaving(true);
    setError("");
    try {
      const payload = getBlockPayload(
        form,
        projectCode,
        editingBlock?.blockNumber ?? nextBlockNumber(),
      );
      if (editingBlock?.projectBlockId) {
        await request(
          "PUT",
          `/api/projectblocks/${editingBlock.projectBlockId}`,
          payload,
        );
      } else {
        await request("POST", "/api/projectblocks", payload);
      }
      setDialogOpen(false);
      await loadBlocks();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("basic.saveFailed", "Failed to save."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {t("buildingProgress.blocks", "Blocks")}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={loading}
        >
          {t("basic.add", "Add")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "background.default" }}>
              <TableCell>
                {t("buildingProgress.blockName", "Block Name")}
              </TableCell>
              <TableCell>
                {t("buildingProgress.blockDescription", "Description")}
              </TableCell>
              <TableCell align="center">
                {t("basic.actions", "Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blocks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ color: "text.secondary" }}
                >
                  {t("buildingProgress.noBlocks", "No blocks defined.")}
                </TableCell>
              </TableRow>
            ) : (
              blocks.map((block) => (
                <TableRow
                  key={block.projectBlockId}
                  selected={
                    String(selectedBlockId) === String(block.projectBlockId)
                  }
                  onClick={() => onSelectBlock(block)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{block.blockName}</TableCell>
                  <TableCell>{block.blockDescription}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(block);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(block);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        saving={saving}
        title={
          editingBlock
            ? t("buildingProgress.editBlock", "Edit Block")
            : t("buildingProgress.addBlock", "Add Block")
        }
        entity={editingBlock}
        fields={[
          {
            key: "blockName",
            label: t("buildingProgress.blockName", "Block Name"),
            required: true,
          },
          {
            key: "blockDescription",
            label: t("buildingProgress.blockDescription", "Description"),
            multiline: true,
            rows: 2,
          },
        ]}
      />
    </Box>
  );
};

export default BlockManager;
