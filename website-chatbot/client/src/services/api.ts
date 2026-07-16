import axios, { AxiosError } from 'axios';
import type { Message, Document, ChatLog, Analytics } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // short timeout so demo fallback kicks in quickly on static hosting
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/login')) {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  },
);

// ── Chat API ──────────────────────────────────────────────────────────────────
export const createSession = async (): Promise<{ sessionId: string }> => {
  const { data } = await api.post<any>('/chat/session');
  return data.data || data;
};

export const sendMessage = async (
  sessionId: string,
  message: string,
): Promise<{ response: string; sessionId: string }> => {
  const { data } = await api.post<any>('/chat/message', {
    sessionId,
    message,
  });
  return data.data || data;
};

export const getHistory = async (sessionId: string): Promise<Message[]> => {
  const { data } = await api.get<any>(`/chat/history/${sessionId}`);
  return data.data || data;
};

// ── Auth API ──────────────────────────────────────────────────────────────────
export const login = async (
  email: string,
  password: string,
): Promise<{ token: string; user: { username: string; email: string; role: string } }> => {
  const { data } = await api.post<any>('/auth/login', { email, password });
  // Backend wraps response as { success: true, data: { token, user } }
  return data.data || data;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  await api.post('/auth/change-password', { currentPassword, newPassword });
};

// ── Documents API ─────────────────────────────────────────────────────────────
export const uploadDocuments = async (
  files: File[],
  onProgress?: (progress: number) => void,
): Promise<Document[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await api.post<any>('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    },
  });
  return data.data || [];
};

export const getDocuments = async (): Promise<Document[]> => {
  const { data } = await api.get<any>('/admin/documents');
  return data.data || [];
};

export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/admin/documents/${id}`);
};

export const reindex = async (): Promise<void> => {
  await api.post('/admin/reindex');
};

// ── Logs & Analytics API ──────────────────────────────────────────────────────
export const getChatLogs = async (
  page = 1,
  limit = 20,
): Promise<{ logs: ChatLog[]; total: number }> => {
  const { data } = await api.get<any>('/admin/logs', {
    params: { page, limit },
  });
  return data.data || { logs: [], total: 0 };
};

export const getAnalytics = async (): Promise<Analytics> => {
  const { data } = await api.get<any>('/admin/analytics');
  return data.data;
};

export const sendMessageApi = async (
  message: string,
  sessionId?: string,
): Promise<{ response: string; sessionId: string }> => {
  const { data } = await api.post<any>('/chat/message', { message, sessionId });
  return data.data;
};

export default api;
