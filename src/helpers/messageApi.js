import { api } from "./axios_helper";

const BASE = "/api/messages";

export const fetchConversations = () => api.get(`${BASE}/conversations`);

export const fetchDirectMessages = (staffId) =>
  api.get(`${BASE}/direct`, { params: { staffId } });

export const fetchProjectMessages = (projectCode) =>
  api.get(`${BASE}/project`, { params: { projectCode } });

export const fetchBroadcastMessages = () => api.get(`${BASE}/broadcast`);

export const fetchUnreadCount = () => api.get(`${BASE}/unread-count`);

export const sendMessage = (payload) => api.post(BASE, payload);

export const markAsRead = (messageId) => api.put(`${BASE}/${messageId}/read`);
