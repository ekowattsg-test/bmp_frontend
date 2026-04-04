import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { HeaderBar } from "../common";
import {
  buildUniqueOptionObjects,
  extractListFromResponse,
  findOptionByValue,
} from "../../helpers/common_options_helper";

const StaffSkillEdit = ({ skill, onCancel }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const userCompanyId = userInfo?.companyId || "";
  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";

  const [form, setForm] = useState({ ...skill });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setForm({ ...skill });
  }, [skill]);

  // Fetch existing categories from skills
  useEffect(() => {
    setCategoriesLoading(true);
    request("GET", "/api/staffskills")
      .then((response) => {
        const skillsData = extractListFromResponse(response.data);
        // Filter by company unless user is level 9
        const filteredSkills = isUserLevelNine
          ? skillsData
          : skillsData.filter(
              (skill) => String(skill.companyId) === String(userCompanyId),
            );
        const uniqueCategories = buildUniqueOptionObjects(
          filteredSkills,
          (staffSkill) => staffSkill.skillCategory,
        );
        setCategories(uniqueCategories);
      })
      .catch(() => {
        setCategories([]);
      })
      .finally(() => {
        setCategoriesLoading(false);
      });
  }, [userCompanyId, isUserLevelNine]);

  const validate = () => {
    let errs = {};
    if (!form.skillName || form.skillName.trim() === "") {
      errs.skillName = t("staffSkillList.skillName") + " is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      await request("PUT", `/api/staffskills/${form.staffSkillId}`, form);
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: { xs: "100%", sm: 500 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("staffSkillList.editTitle", "Edit Skill")}
        sx={{ mb: 1 }}
      />
      <TextField
        label={t("staffSkillList.skillName", "Skill Name")}
        name="skillName"
        value={form.skillName || ""}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.skillName}
        helperText={errors.skillName}
      />
      <TextField
        label={t("staffSkillList.skillDescription", "Description")}
        name="skillDescription"
        value={form.skillDescription || ""}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <Autocomplete
        freeSolo
        loading={categoriesLoading}
        options={categories}
        value={findOptionByValue(categories, form.skillCategory) ?? null}
        onChange={(event, newValue) => {
          if (typeof newValue === "string") {
            setForm((prev) => ({
              ...prev,
              skillCategory: newValue,
            }));
            return;
          }
          if (newValue && typeof newValue === "object") {
            setForm((prev) => ({
              ...prev,
              skillCategory: newValue.value || "",
            }));
            return;
          }
          setForm((prev) => ({
            ...prev,
            skillCategory: "",
          }));
        }}
        inputValue={form.skillCategory || ""}
        onInputChange={(event, newInputValue, reason) => {
          if (reason === "reset") return;
          setForm((prev) => ({
            ...prev,
            skillCategory: newInputValue,
          }));
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.value
        }
        renderOption={(props, option) => <li {...props}>{option.value}</li>}
        isOptionEqualToValue={(option, value) =>
          option.value.toLowerCase() === value.value.toLowerCase()
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("staffSkillList.skillCategory", "Category")}
            margin="normal"
            fullWidth
            placeholder={t(
              "staffSkillList.categoryPlaceholder",
              "Select or type new category",
            )}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {categoriesLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
      {success && (
        <div style={{ color: "var(--color-success)", marginTop: 8 }}>
          {t("basic.true")}
        </div>
      )}
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {t("basic.save")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCancel(false)}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

export default StaffSkillEdit;
