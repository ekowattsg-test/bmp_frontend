import { request } from "../../../helpers/axios_helper";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const getCurrentCoordinates = () =>
  new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

const toProjectCode = (payload) => {
  if (Array.isArray(payload)) {
    return safeString(payload[0]?.projectCode);
  }
  if (payload && typeof payload === "object") {
    return safeString(payload.projectCode);
  }
  return "";
};

export const resolveNearbyProjectCode = async (projects = []) => {
  const projectCodeSet = new Set(
    (Array.isArray(projects) ? projects : [])
      .map((project) => safeString(project?.projectCode))
      .filter(Boolean),
  );

  if (projectCodeSet.size === 0) return "";

  try {
    const position = await getCurrentCoordinates();
    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return "";
    }

    const response = await request("POST", "/api/projects/nearby", {
      latitude,
      longitude,
    });

    const nearbyCode = toProjectCode(response?.data);
    if (!nearbyCode) return "";

    return projectCodeSet.has(nearbyCode) ? nearbyCode : "";
  } catch {
    return "";
  }
};
