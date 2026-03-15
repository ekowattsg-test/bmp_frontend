/**
 * AuthContext provides authentication and global state management for the application.
 *
 * @typedef {Object} AuthContextValue
 * @property {boolean} isAuthenticated - Indicates if the user is authenticated.
 * @property {Object} username - The current user's information.
 * @property {string|null} currentAction - The current action being performed (e.g., "login").
 * @property {Object} thisBook - The currently selected book object.
 * @property {boolean} refresh - State to trigger refreshes in components.
 * @property {Object|undefined} param - Application parameters fetched from the backend.
 * @property {function(Object):void} login - Function to log in a user.
 * @property {function():void} logout - Function to log out the user.
 * @property {function(string|null):void} setCurrentAction - Setter for currentAction.
 * @property {function(Object):void} setThisBook - Setter for thisBook.
 * @property {function(Object):void} setUsername - Setter for username.
 * @property {function(boolean):void} setIsAuthenticated - Setter for isAuthenticated.
 * @property {function(boolean):void} setRefresh - Setter for refresh.
 * @property {function(Object):void} setParam - Setter for param.
 */

/**
 * AuthProvider component that wraps its children with AuthContext.Provider,
 * supplying authentication state and related actions.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to be wrapped by the provider.
 * @returns {JSX.Element} The AuthContext provider with authentication state and actions.
 */
import { request, getAuthToken, setAuthHeader } from "../helpers/axios_helper";
import React, { createContext, useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [currentAction, setCurrentAction] = useState(null);
  const [thisBook, setThisBook] = useState({});
  const [refresh, setRefresh] = useState(true);
  const [param, setParam] = useState();
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [openMenu, setOpenMenu] = useState(false);
  const [currMenu, setCurrMenu] = useState("main");
  const [openNotice, setOpenNotice] = useState(false);
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);
  const navigate = useNavigate();

  const login = (user) => {
    setIsAuthenticated(true);
    setUserInfo(user);
    setCurrentAction("login");
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserInfo({});
    setCurrentAction(null);
    setAuthHeader(null); // Clear token from localStorage
    localStorage.removeItem("user_info"); // Clear user info from localStorage
  };

  // Check for existing token on mount
  useEffect(() => {
    // Listen to global auth expiration events dispatched by axios helper
    const onExpired = () => {
      setExpiredDialogOpen(true);
    };
    window.addEventListener("auth:expired", onExpired);

    return () => {
      window.removeEventListener("auth:expired", onExpired);
    };
  }, []);

  const handleExpiredContinue = () => {
    // Clear local auth state and redirect to login
    setAuthHeader(null);
    localStorage.removeItem("user_info");
    setIsAuthenticated(false);
    setUserInfo({});
    setExpiredDialogOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      const storedUserInfo = localStorage.getItem("user_info");

      if (token && token !== "null") {
        try {
          // Parse stored user info if available
          let userData = storedUserInfo ? JSON.parse(storedUserInfo) : {};

          // Try to fetch params to validate token
          const response = await request("GET", "/api/params", {});
          if (response.data) {
            // Token is valid, restore authentication
            setIsAuthenticated(true);
            setUserInfo(userData);
            setLoading(false);
          }
        } catch (error) {
          // Token is invalid or expired
          setAuthHeader(null); // Clear invalid token
          localStorage.removeItem("user_info");
          setIsAuthenticated(false);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Run once on mount

  useEffect(() => {
    if (isAuthenticated) {
      request("GET", "/api/params", {})
        // let url = "http://localhost:8080/api/params";
        // axios
        //   .get(url)
        .then((response) => {
          // console.log(response);
          let data = response.data;
          // console.log("data", data);
          let par = [];
          for (let i = 0; i < data.length; i++) {
            par[data[i].param_key] = data[i].value_string;
            if (data[i].value_long) {
              par[data[i].param_key] = data[i].value_long;
            } else if (data[i].value_decimal) {
              par[data[i].param_key] = data[i].value_decimal;
            }
          }
          setParam(par);
          // console.log("data", data, param);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      request("GET", "/api/languages", {})
        .then((response) => {
          // Process the response for user role views
          setLanguages(response.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && userInfo.id && userInfo.companyId) {
      Promise.all([
        request(
          "GET",
          "/api/userroleviews/" + userInfo.id + "/" + userInfo.companyId,
          {},
        ),
        request("GET", "/api/roles", {}),
      ])
        .then(([userRoleResponse, rolesResponse]) => {
          let userRoleData = userRoleResponse.data;
          let allRoles = rolesResponse.data;

          // Create a map of role_id to Role object for quick lookup
          let roleMap = {};
          allRoles.forEach((role) => {
            roleMap[role.id] = role;
          });

          let rol = [];
          let men = [];

          for (let i = 0; i < userRoleData.length; i++) {
            let roleId = userRoleData[i].role_id;
            let roleObj = roleMap[roleId];

            if (roleObj) {
              rol.push(roleObj.role); // Extract role name string
              if (roleObj.menu && roleObj.menu.trim() !== "") {
                men.push(roleObj.menu); // Extract menu string if not empty
              }
            }
          }

          setRoles(rol);
          setMenus(men);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isAuthenticated, userInfo.id, userInfo.companyId]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userInfo,
        currentAction,
        thisBook,
        refresh,
        param,
        roles,
        menus,
        languages,
        currMenu,
        openMenu,
        openNotice,
        loading,
        login,
        logout,
        setCurrentAction,
        setThisBook,
        setUserInfo,
        setIsAuthenticated,
        setRefresh,
        setParam,
        setRoles,
        setMenus,
        setLanguages,
        setCurrMenu,
        setOpenMenu,
        setOpenNotice,
      }}
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          Loading...
        </div>
      ) : (
        children
      )}

      <Dialog open={expiredDialogOpen} onClose={() => setExpiredDialogOpen(false)}>
        <DialogTitle>{"Session Expired"}</DialogTitle>
        <DialogContent>
          <Typography>
            Your session has expired. Please sign in again to continue.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExpiredContinue} color="primary">
            Sign in
          </Button>
        </DialogActions>
      </Dialog>
    </AuthContext.Provider>
  );
};
export { AuthContext, AuthProvider };
