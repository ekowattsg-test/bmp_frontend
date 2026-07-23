let tvAuthState = {
  token: "",
  sessionExpiresAt: "",
  refreshIntervalSeconds: 30,
  projectCodes: [],
};

export const setTvAuthState = (nextState = {}) => {
  tvAuthState = {
    ...tvAuthState,
    ...nextState,
  };
};

export const getTvAuthState = () => tvAuthState;

export const clearTvAuthState = () => {
  tvAuthState = {
    token: "",
    sessionExpiresAt: "",
    refreshIntervalSeconds: 30,
    projectCodes: [],
  };
};
