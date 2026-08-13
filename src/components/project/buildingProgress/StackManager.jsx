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

const getStackPayload = (form, blockId, existingNumber) => ({
  projectBlockId: blockId,
  stackName: String(form.stackName || "").trim(),
  stackDescription: String(form.stackDescription || "").trim(),
  stackNumber: existingNumber ?? 0,
  status: "ACTIVE",
});

const StackManager = ({ block, onSelectStack, selectedStackId }) => {
  const { t } = useTranslation();
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStack, setEditingStack] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadStacks = useCallback(async () => {
    if (!block?.projectBlockId) {
      setStacks([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await request(
        "GET",
        `/api/projectstacks/block/${block.projectBlockId}`,
      );
      setStacks(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setError(
        t("buildingProgress.loadStacksFailed", "Failed to load stacks."),
      );
      setStacks([]);
    } finally {
      setLoading(false);
    }
  }, [block, t]);

  useEffect(() => {
    loadStacks();
  }, [loadStacks]);

  const nextStackNumber = () => {
    if (stacks.length === 0) return 1;
    return Math.max(...stacks.map((s) => Number(s.stackNumber) || 0)) + 1;
  };

  const handleAdd = () => {
    setEditingStack(null);
    setDialogOpen(true);
  };

  const handleEdit = (stack) => {
    setEditingStack(stack);
    setDialogOpen(true);
  };

  const handleDelete = async (stack) => {
    const id = stack?.projectStackId;
    if (!id) return;
    if (!window.confirm(t("basic.confirmDelete", "Delete this record?")))
      return;
    try {
      await request("DELETE", `/api/projectstacks/${id}`);
      await loadStacks();
      if (String(selectedStackId) === String(id)) {
        onSelectStack(null);
      }
    } catch {
      setError(t("basic.deleteFailed", "Failed to delete."));
    }
  };

  const handleSave = async (form) => {
    if (!block?.projectBlockId) return;
    setSaving(true);
    setError("");
    try {
      const payload = getStackPayload(
        form,
        block.projectBlockId,
        editingStack?.stackNumber ?? nextStackNumber(),
      );
      if (editingStack?.projectStackId) {
        await request(
          "PUT",
          `/api/projectstacks/${editingStack.projectStackId}`,
          payload,
        );
      } else {
        await request("POST", "/api/projectstacks", payload);
      }
      setDialogOpen(false);
      await loadStacks();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("basic.saveFailed", "Failed to save."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!block) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          bgcolor: "var(--color-gray-100)",
          borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">
          {t(
            "buildingProgress.selectBlock",
            "Select a block to manage stacks.",
          )}
        </Typography>
      </Box>
    );
  }

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
          {t("buildingProgress.stacks", "Stacks")} -{" "}
          {t("buildingProgress.block", "Block")}: {block.blockName}
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
                {t("buildingProgress.stackName", "Stack Name")}
              </TableCell>
              <TableCell>
                {t("buildingProgress.stackDescription", "Description")}
              </TableCell>
              <TableCell align="center">
                {t("basic.actions", "Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stacks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ color: "text.secondary" }}
                >
                  {t("buildingProgress.noStacks", "No stacks defined.")}
                </TableCell>
              </TableRow>
            ) : (
              stacks.map((stack) => (
                <TableRow
                  key={stack.projectStackId}
                  selected={
                    String(selectedStackId) === String(stack.projectStackId)
                  }
                  onClick={() => onSelectStack(stack)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{stack.stackName}</TableCell>
                  <TableCell>{stack.stackDescription}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(stack);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(stack);
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
        error={error}
        title={
          editingStack
            ? t("buildingProgress.editStack", "Edit Stack")
            : t("buildingProgress.addStack", "Add Stack")
        }
        entity={editingStack}
        fields={[
          {
            key: "stackName",
            label: t("buildingProgress.stackName", "Stack Name"),
            required: true,
          },
          {
            key: "stackDescription",
            label: t("buildingProgress.stackDescription", "Description"),
            multiline: true,
            rows: 2,
          },
        ]}
      />
    </Box>
  );
};

export default StackManager;
