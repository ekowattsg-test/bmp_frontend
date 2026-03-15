import { Box } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/authContext";
import { useContext } from "react";
import { useState } from "react";
import {
  Home,
  Article,
  Payments,
  LocalLibrary,
  ReplyAll,
  Refresh,
  Paid,
  Gavel,
  Logout,
  ModeNight,
} from "@mui/icons-material";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
} from "@mui/material";

const Sidebar = () => {
  const [admin, setAdmin] = useState(1);
  const { t } = useTranslation();
  const { isAuthenticated, userInfo } = useContext(AuthContext);
  console.log(userInfo);
  return (
    <>
      <Box
        flex={2}
        p={2}
        sx={{
          display: { xs: "none", sm: "none", md: "block" },
          width: "15%",
        }}
      >
        {isAuthenticated ? (
          <Box position="fixed">
            {/* <BrowserRouter> */}
            <h3>
              {userInfo.lastName} {userInfo.firstName}
            </h3>
            <nav>
              {/* <ErrorBoundary FallbackComponent={ErrorFallback}> */}
              <List>
                {userInfo.role == "admin" && (
                  <>
                    <>
                      <Box
                        flex={2}
                        p={2}
                        sx={{
                          display: { xs: "none", sm: "none", md: "block" },
                          width: "15%",
                        }}
                      >
                        {isAuthenticated ? (
                          <Box position="fixed">
                            {/* <BrowserRouter> */}
                            <nav>
                              {/* <ErrorBoundary FallbackComponent={ErrorFallback}> */}
                              <List>
                                {userInfo.role == "admin" && (
                                  <>
                                    <h3 className="display-4">
                                      {t("admin.title")}
                                    </h3>
                                    {/* Base Setup Section */}
                                    <h4 style={{ marginTop: 24 }}>
                                      {t("menu.baseSetup")}
                                    </h4>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/company"
                                      >
                                        <ListItemIcon>
                                          <Article />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={t("menu.companyList")}
                                        />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/role"
                                      >
                                        <ListItemIcon>
                                          <Article />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={t("menu.roleList")}
                                        />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/stockmovementcode"
                                      >
                                        <ListItemIcon>
                                          <LocalLibrary />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={t("menu.stockMovementCode")}
                                        />
                                      </ListItemButton>
                                    </ListItem>
                                    {/* End Base Setup Section */}
                                  </>
                                )}
                                {userInfo.role == "member" && (
                                  <>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/userdashboard"
                                      >
                                        <ListItemIcon>
                                          <Home />
                                        </ListItemIcon>
                                        <ListItemText primary="Homepage" />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/borrow"
                                      >
                                        <ListItemIcon>
                                          <LocalLibrary />
                                        </ListItemIcon>
                                        <ListItemText primary="Borrow Books" />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/return"
                                      >
                                        <ListItemIcon>
                                          <ReplyAll />
                                        </ListItemIcon>
                                        <ListItemText primary="Return Books" />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/renew"
                                      >
                                        <ListItemIcon>
                                          <Refresh />
                                        </ListItemIcon>
                                        <ListItemText primary="Renew Books" />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/payfees"
                                      >
                                        <ListItemIcon>
                                          <Paid />
                                        </ListItemIcon>
                                        <ListItemText primary="Pay Lete Fees" />
                                      </ListItemButton>
                                    </ListItem>
                                    <ListItem disablePadding>
                                      <ListItemButton
                                        component={Link}
                                        to="/tnc"
                                      >
                                        <ListItemIcon>
                                          <Gavel />
                                        </ListItemIcon>
                                        <ListItemText primary="Terms and Conditions" />
                                      </ListItemButton>
                                    </ListItem>
                                  </>
                                )}

                                <ListItem disablePadding>
                                  <ListItemButton
                                    component={Link}
                                    to="/signout"
                                  >
                                    <ListItemIcon>
                                      <Logout />
                                    </ListItemIcon>
                                    <ListItemText primary="Log Out" />
                                  </ListItemButton>
                                </ListItem>
                                <ListItem
                                  disablePadding
                                  sx={{ display: "none" }}
                                >
                                  <ListItemButton
                                    component={Link}
                                    to="#simple-list"
                                  >
                                    <ListItemIcon>
                                      <ModeNight />
                                    </ListItemIcon>
                                    <Switch
                                      onChange={() =>
                                        setMode(
                                          mode === "light" ? "dark" : "light",
                                        )
                                      }
                                    />
                                  </ListItemButton>
                                </ListItem>
                              </List>
                              {/* </ErrorBoundary> */}
                            </nav>
                            {/* </BrowserRouter> */}
                          </Box>
                        ) : null}
                      </Box>
                    </>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/admindashboard">
                        <ListItemIcon>
                          <Home />
                        </ListItemIcon>
                        <ListItemText primary="Homepage" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/editbook">
                        <ListItemIcon>
                          <Article />
                        </ListItemIcon>
                        <ListItemText primary="Books Information" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/payment">
                        <ListItemIcon>
                          <Payments />
                        </ListItemIcon>
                        <ListItemText primary="Fees Payment" />
                      </ListItemButton>
                    </ListItem>
                  </>
                )}
                {userInfo.role == "member" && (
                  <>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/userdashboard">
                        <ListItemIcon>
                          <Home />
                        </ListItemIcon>
                        <ListItemText primary="Homepage" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/borrow">
                        <ListItemIcon>
                          <LocalLibrary />
                        </ListItemIcon>
                        <ListItemText primary="Borrow Books" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/return">
                        <ListItemIcon>
                          <ReplyAll />
                        </ListItemIcon>
                        <ListItemText primary="Return Books" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/renew">
                        <ListItemIcon>
                          <Refresh />
                        </ListItemIcon>
                        <ListItemText primary="Renew Books" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/payfees">
                        <ListItemIcon>
                          <Paid />
                        </ListItemIcon>
                        <ListItemText primary="Pay Lete Fees" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} to="/tnc">
                        <ListItemIcon>
                          <Gavel />
                        </ListItemIcon>
                        <ListItemText primary="Terms and Conditions" />
                      </ListItemButton>
                    </ListItem>
                  </>
                )}

                <ListItem disablePadding>
                  <ListItemButton component={Link} to="/signout">
                    <ListItemIcon>
                      <Logout />
                    </ListItemIcon>
                    <ListItemText primary="Log Out" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding sx={{ display: "none" }}>
                  <ListItemButton component={Link} to="#simple-list">
                    <ListItemIcon>
                      <ModeNight />
                    </ListItemIcon>
                    <Switch
                      onChange={() =>
                        setMode(mode === "light" ? "dark" : "light")
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </List>
              {/* </ErrorBoundary> */}
            </nav>
            {/* </BrowserRouter> */}
          </Box>
        ) : null}
      </Box>
    </>
  );
};

export default Sidebar;
