import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from "@mui/material";

/**
 * PdaMenu — landing page after PDA login.
 *
 * Renders navigation cards to each operational area.
 * Shell (AppBar, back button, user name) is provided by PdaLayout.
 */
export default function PdaMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const menuItems = [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
      {menuItems.map((item) => (
        <Card key={item.key} variant="outlined">
          <CardActionArea
            onClick={() =>
              navigate(item.path, { state: { title: item.label } })
            }
            sx={{ p: 1 }}
          >
            <CardContent
              sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5 }}
            >
              {item.icon}
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {item.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
