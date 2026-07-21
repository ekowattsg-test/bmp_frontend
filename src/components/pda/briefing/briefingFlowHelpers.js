import { request } from "../../../helpers/axios_helper";

const safeString = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

export const formatTodayYmd = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatCurrentTime = () => {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
};

export const getSessionId = (session) =>
  session?.briefingSessionId ?? session?.id ?? null;

export const fetchSessionById = async (sessionId) => {
  if (!sessionId) return null;
  const response = await request("GET", `/api/briefingsessions/${sessionId}`);
  return response?.data || null;
};

export const resolvePrimaryBriefingId = async () => {
  const response = await request("GET", "/api/briefings");
  const rows = Array.isArray(response?.data) ? response.data : [];
  const active = rows.find((row) => Number(row?.active) === 1);
  const fallback = rows[0];
  const briefingId = active?.briefingId ?? fallback?.briefingId ?? null;
  return briefingId;
};

export const fetchProjectOptions = async () => {
  const response = await request("GET", "/api/projects");
  const rows = Array.isArray(response?.data) ? response.data : [];
  return rows
    .map((project) => ({
      projectCode: safeString(project?.projectCode),
      projectName: safeString(project?.projectName),
      status: safeString(project?.status),
      briefingId: safeString(project?.briefingId),
    }))
    .filter((project) => project.projectCode)
    .sort((a, b) => a.projectCode.localeCompare(b.projectCode));
};

export const findTodayProjectSession = async (projectCode, briefingDate) => {
  const response = await request("GET", "/api/briefingsessions");
  const rows = Array.isArray(response?.data) ? response.data : [];
  const normalizedProjectCode = safeString(projectCode);
  const normalizedDate = safeString(briefingDate);

  const sessions = rows
    .filter(
      (session) => safeString(session?.projectCode) === normalizedProjectCode,
    )
    .filter((session) => safeString(session?.briefingDate) === normalizedDate)
    .filter(
      (session) => session?.endTime === null || session?.endTime === undefined,
    )
    .sort(
      (a, b) => Number(getSessionId(b) || 0) - Number(getSessionId(a) || 0),
    );

  return sessions[0] || null;
};

export const isLeadershipMember = async (projectCode, staffId) => {
  const normalizedStaffId = safeString(staffId);
  if (!normalizedStaffId) return false;

  const response = await request(
    "GET",
    `/api/projectleaders/project/${encodeURIComponent(projectCode)}`,
  );
  const rows = Array.isArray(response?.data) ? response.data : [];

  return rows.some((row) => {
    const holder = safeString(
      row?.projectLeaderStaffId ?? row?.staffId ?? row?.staffID,
    );
    const active = row?.active === undefined ? true : Number(row.active) === 1;
    const roleEndDate = safeString(row?.roleEndDate);
    const currentRole = roleEndDate === "";
    return holder === normalizedStaffId && active && currentRole;
  });
};

export const createBriefingSession = async ({
  projectCode,
  briefingDate,
  briefingId,
  presenter,
}) => {
  const payload = {
    projectCode: safeString(projectCode),
    briefingDate: safeString(briefingDate),
    briefingId,
    presenter: safeString(presenter),
    startTime: null,
    currentSeq: 1,
    endTime: null,
  };

  const response = await request("POST", "/api/briefingsessions", payload);
  return response?.data || null;
};

export const updateSession = async (session) => {
  const sessionId = getSessionId(session);
  if (!sessionId) throw new Error("Missing session id");
  const response = await request(
    "PUT",
    `/api/briefingsessions/${sessionId}`,
    session,
  );
  return response?.data || null;
};

export const fetchBriefingContentBySeq = async (briefingId, seqNumber) => {
  const normalizedBriefingId = safeString(briefingId);
  const normalizedSeq = Number(seqNumber);
  if (
    !normalizedBriefingId ||
    !Number.isFinite(normalizedSeq) ||
    normalizedSeq < 1
  ) {
    return null;
  }

  try {
    const response = await request(
      "GET",
      `/api/briefingcontents/briefing/${encodeURIComponent(normalizedBriefingId)}/seq/${encodeURIComponent(normalizedSeq)}`,
    );
    return response?.data || null;
  } catch {
    return null;
  }
};

export const fetchBriefingMembersBySession = async (briefingSessionId) => {
  if (!briefingSessionId) return [];

  const response = await request(
    "GET",
    `/api/briefingmembers/session/${encodeURIComponent(briefingSessionId)}`,
  );
  const rows = response?.data;
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
};

export const getBriefingMemberId = (member) =>
  member?.briefingMemberId ?? member?.id ?? null;

export const getBriefingMemberSeq = (member) => {
  const value = member?.currentSeq ?? member?.seqNumber ?? null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 1 ? Math.trunc(num) : null;
};

export const fetchBriefingMemberBySessionStaff = async ({
  briefingSessionId,
  staffId,
}) => {
  const normalizedStaffId = safeString(staffId);
  if (!briefingSessionId || !normalizedStaffId) return null;

  const response = await request(
    "GET",
    `/api/briefingmembers/session/${encodeURIComponent(briefingSessionId)}/staff/${encodeURIComponent(normalizedStaffId)}`,
  );
  const member = response?.data || null;
  if (Array.isArray(member)) return member[0] || null;
  return member && typeof member === "object" ? member : null;
};

export const updateBriefingMember = async (member) => {
  const memberId = getBriefingMemberId(member);
  if (!memberId) throw new Error("Missing briefing member id");

  const response = await request(
    "PUT",
    `/api/briefingmembers/${encodeURIComponent(memberId)}`,
    member,
  );
  return response?.data || null;
};

export const hasWorkerJoinedSession = async ({
  briefingSessionId,
  staffId,
}) => {
  const member = await fetchBriefingMemberBySessionStaff({
    briefingSessionId,
    staffId,
  });
  return Boolean(member);
};
