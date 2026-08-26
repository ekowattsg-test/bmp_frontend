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
import WorkMappingDialog from "./WorkMappingDialog";

const getUnitPayload = (form, storeyId, stackId, existingNumber) => ({
  projectStoreyId: storeyId,
  projectStackId: stackId,
  unitName: String(form.unitName || "").trim(),
  unitDescription: String(form.unitDescription || "").trim(),
  unitNumber: existingNumber ?? 0,
  projectStreamId: form.projectStreamId ? Number(form.projectStreamId) : null,
  status: "ACTIVE",
});

const UnitManager = ({ storey, stack, blockName, projectCode }) => {
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [allProjectUnits, setAllProjectUnits] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mappingUnit, setMappingUnit] = useState(null);

  const loadUnits = useCallback(async () => {
    if (!storey?.projectStoreyId) {
      setUnits([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await request(
        "GET",
        `/api/projectunits/storey/${storey.projectStoreyId}`,
      );
      setUnits(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setError(t("buildingProgress.loadUnitsFailed", "Failed to load units."));
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [storey, t]);

  const loadStreams = useCallback(async () => {
    if (!projectCode) return;
    try {
      const res = await request(
        "GET",
        `/api/projectstreams/project/${encodeURIComponent(projectCode)}`,
      );
      setStreams(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setStreams([]);
    }
  }, [projectCode]);

  const loadAllProjectUnits = useCallback(async () => {
    if (!projectCode) return;
    try {
      const res = await request(
        "GET",
        `/api/projectunits/project/${encodeURIComponent(projectCode)}`,
      );
      setAllProjectUnits(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      const status = err?.response?.status;
      // 401/403/404 means the backend endpoint is not implemented or not
      // reachable yet. Fall back to the current storey's units so the UI
      // keeps working until the backend adds the project-wide endpoint.
      if (status === 401 || status === 403 || status === 404) {
        setAllProjectUnits(units);
      } else {
        setAllProjectUnits([]);
      }
    }
  }, [projectCode, units]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    loadStreams();
  }, [loadStreams]);

  useEffect(() => {
    loadAllProjectUnits();
  }, [loadAllProjectUnits]);

  const handleAdd = () => {
    setEditingUnit(null);
    setDialogOpen(true);
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setDialogOpen(true);
  };

  const handleDelete = async (unit) => {
    const id = unit?.projectUnitId;
    if (!id) return;
    if (!window.confirm(t("basic.confirmDelete", "Delete this record?")))
      return;
    try {
      await request("DELETE", `/api/projectunits/${id}`);
      await loadUnits();
    } catch {
      setError(t("basic.deleteFailed", "Failed to delete."));
    }
  };

  const nextUnitNumber = () => {
    if (units.length === 0) return 1;
    return Math.max(...units.map((u) => Number(u.unitNumber) || 0)) + 1;
  };

  const intersectionUnit = units.find(
    (unit) =>
      String(unit.projectStackId || "") === String(stack?.projectStackId || ""),
  );

  const streamById = new Map(
    streams.map((stream) => [String(stream?.projectStreamId || ""), stream]),
  );

  const streamNumberById = new Map(
    streams.map((stream) => [
      String(stream?.projectStreamId || ""),
      String(stream?.streamNumber ?? ""),
    ]),
  );

  const childrenByStreamNumber = new Map();
  streams.forEach((stream) => {
    const number = String(stream?.streamNumber ?? "").trim();
    const parent = String(stream?.parentStreamNumber ?? "").trim();
    if (!parent || !number) return;
    if (!childrenByStreamNumber.has(parent)) {
      childrenByStreamNumber.set(parent, new Set());
    }
    childrenByStreamNumber.get(parent).add(number);
  });

  const collectRelatedStreamNumbers = (streamId) => {
    const startNumber = String(streamNumberById.get(streamId) ?? "").trim();
    if (!startNumber) return new Set();
    const related = new Set([startNumber]);

    const collectChildren = (number) => {
      const children = childrenByStreamNumber.get(number);
      if (!children) return;
      children.forEach((child) => {
        if (related.has(child)) return;
        related.add(child);
        collectChildren(child);
      });
    };

    const collectParents = (number) => {
      const parentStream = streams.find(
        (s) => String(s?.streamNumber ?? "").trim() === number,
      );
      const parentNumber = String(
        parentStream?.parentStreamNumber ?? "",
      ).trim();
      if (!parentNumber || related.has(parentNumber)) return;
      related.add(parentNumber);
      collectParents(parentNumber);
    };

    collectChildren(startNumber);
    collectParents(startNumber);
    return related;
  };

  const buildStreamTreeOptions = (candidateStreams) => {
    const childrenByNumber = new Map();
    candidateStreams.forEach((stream) => {
      const number = String(stream?.streamNumber ?? "").trim();
      const parent = String(stream?.parentStreamNumber ?? "").trim();
      if (!number) return;
      if (!childrenByNumber.has(parent)) childrenByNumber.set(parent, []);
      childrenByNumber.get(parent).push(stream);
    });

    const getDisplayLabel = (stream) => {
      const name = stream?.streamName || stream?.projectStreamId || "";
      const number =
        stream?.streamNumber != null ? `#${stream.streamNumber}` : "";
      return number ? `${name} (${number})` : name;
    };

    const options = [];
    const walk = (streamsList, depth) => {
      const sorted = [...streamsList].sort((a, b) => {
        const na = Number(a?.streamNumber ?? 0);
        const nb = Number(b?.streamNumber ?? 0);
        if (na !== nb) return na - nb;
        return String(a?.streamName || "").localeCompare(
          String(b?.streamName || ""),
        );
      });

      sorted.forEach((stream, index) => {
        const isLast = index === sorted.length - 1;
        const indent = depth > 0 ? "\u00A0\u00A0".repeat(depth - 1) : "";
        const branch = depth > 0 ? (isLast ? "└─ " : "├─ ") : "";
        const prefix = `${indent}${branch}`;
        options.push({
          value: String(stream?.projectStreamId || ""),
          label: `${prefix}${getDisplayLabel(stream)}`,
          stream,
        });
        const number = String(stream?.streamNumber ?? "").trim();
        const children = childrenByNumber.get(number) || [];
        walk(children, depth + 1);
      });
    };

    const rootStreams = candidateStreams.filter((stream) => {
      const parent = String(stream?.parentStreamNumber ?? "").trim();
      const parentInCandidates = candidateStreams.some(
        (s) => String(s?.streamNumber ?? "").trim() === parent,
      );
      return !parent || !parentInCandidates;
    });

    walk(rootStreams, 0);
    return options;
  };

  const usedStreamNumbers = new Set(
    allProjectUnits
      .filter(
        (unit) =>
          String(unit?.projectUnitId || "") !==
          String(editingUnit?.projectUnitId || ""),
      )
      .map((unit) =>
        String(streamNumberById.get(String(unit?.projectStreamId || "")) ?? ""),
      )
      .filter(Boolean),
  );

  const blockedStreamNumbers = new Set();
  usedStreamNumbers.forEach((number) => {
    const related = collectRelatedStreamNumbers(
      String(
        streams.find((s) => String(s?.streamNumber ?? "").trim() === number)
          ?.projectStreamId || "",
      ),
    );
    related.forEach((n) => blockedStreamNumbers.add(n));
  });

  const availableStreams = streams.filter((stream) => {
    const streamId = String(stream?.projectStreamId || "");
    const number = String(streamNumberById.get(streamId) ?? "").trim();
    const type = String(stream?.streamType || "")
      .trim()
      .toUpperCase();
    if (type === "P") return false;
    if (
      editingUnit?.projectStreamId != null &&
      String(editingUnit.projectStreamId) === streamId
    ) {
      return true;
    }
    if (blockedStreamNumbers.has(number)) return false;
    return true;
  });

  const handleSave = async (form) => {
    if (!storey?.projectStoreyId || !stack?.projectStackId) return;
    setSaving(true);
    setError("");
    try {
      const payload = getUnitPayload(
        form,
        storey.projectStoreyId,
        stack.projectStackId,
        editingUnit?.unitNumber ?? nextUnitNumber(),
      );
      let savedUnit = editingUnit;
      if (editingUnit?.projectUnitId) {
        await request(
          "PUT",
          `/api/projectunits/${editingUnit.projectUnitId}`,
          payload,
        );
      } else {
        const res = await request("POST", "/api/projectunits", payload);
        savedUnit = res?.data ?? savedUnit;
      }
      await loadUnits();
      setDialogOpen(false);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("basic.saveFailed", "Failed to save."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!storey || !stack) {
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
            "buildingProgress.selectStoreyAndStack",
            "Select a storey and a stack to manage units.",
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
          {t("buildingProgress.units", "Units")} -{" "}
          {t("buildingProgress.block", "Block")}:{" "}
          {blockName || storey.blockName || "-"} |{" "}
          {t("buildingProgress.storey", "Storey")}: {storey.storeyName} |{" "}
          {t("buildingProgress.stack", "Stack")}: {stack.stackName}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={loading || Boolean(intersectionUnit)}
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
                {t("buildingProgress.unitName", "Unit Name")}
              </TableCell>
              <TableCell>
                {t("buildingProgress.mappedStream", "Mapped Stream")}
              </TableCell>
              <TableCell align="center">
                {t("basic.actions", "Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ color: "text.secondary" }}
                >
                  {t("buildingProgress.noUnits", "No units defined.")}
                </TableCell>
              </TableRow>
            ) : intersectionUnit ? (
              (() => {
                const mappedStream = streams.find(
                  (stream) =>
                    String(stream.projectStreamId) ===
                    String(intersectionUnit.projectStreamId || ""),
                );
                return (
                  <TableRow key={intersectionUnit.projectUnitId}>
                    <TableCell>{intersectionUnit.unitName}</TableCell>
                    <TableCell>
                      {mappedStream?.streamName ||
                        intersectionUnit.projectStreamId ||
                        "-"}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(intersectionUnit);
                        }}
                        title={t("basic.edit", "Edit")}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(intersectionUnit);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })()
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ color: "text.secondary" }}
                >
                  {t(
                    "buildingProgress.noIntersectionUnit",
                    "No unit at this storey/stack intersection. Click Add to create.",
                  )}
                </TableCell>
              </TableRow>
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
          editingUnit
            ? t("buildingProgress.editUnit", "Edit Unit")
            : t("buildingProgress.addUnit", "Add Unit")
        }
        entity={editingUnit}
        fields={[
          {
            key: "unitName",
            label: t("buildingProgress.unitName", "Unit Name"),
            required: true,
          },
          {
            key: "unitDescription",
            label: t("buildingProgress.unitDescription", "Description"),
            multiline: true,
            rows: 2,
          },
          {
            key: "projectStreamId",
            label: t("buildingProgress.mappedStream", "Mapped Stream"),
            type: "select",
            emptyLabel: t("buildingProgress.noStream", "No Stream"),
            options: buildStreamTreeOptions(availableStreams),
          },
        ]}
      />

      <WorkMappingDialog
        open={Boolean(mappingUnit)}
        onClose={() => {
          setMappingUnit(null);
        }}
        unit={mappingUnit}
        streams={streams}
      />
    </Box>
  );
};

export default UnitManager;
