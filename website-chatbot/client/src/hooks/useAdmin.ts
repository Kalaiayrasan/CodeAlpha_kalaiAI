import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Document, ChatLog, Analytics, AuthState } from '../types';
import * as apiService from '../services/api';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export interface UseAdminReturn {
  // Auth
  auth: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  // Documents
  documents: Document[];
  isLoadingDocs: boolean;
  uploadProgress: number;
  fetchDocuments: () => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  reindex: () => Promise<void>;
  // Logs
  logs: ChatLog[];
  totalLogs: number;
  currentPage: number;
  isLoadingLogs: boolean;
  fetchLogs: (page: number, limit?: number) => Promise<void>;
  // Analytics
  analytics: Analytics | null;
  isLoadingAnalytics: boolean;
  fetchAnalytics: () => Promise<void>;
  // Global
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const getInitialAuth = (): AuthState => {
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }
  return { token, user, isAuthenticated: !!token };
};

export function useAdmin(): UseAdminReturn {
  const [auth, setAuth] = useState<AuthState>(getInitialAuth);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Demo credentials — used when no backend is available (e.g. GitHub Pages)
  const DEMO_EMAIL = 'admin@kalairestaurant.com';
  const DEMO_PASSWORD = 'Admin@123456';

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // ── Demo / offline shortcut ────────────────────────────────────────────
    // If credentials match the demo account, first try the API.
    // If the API fails for ANY reason (no server, CORS, timeout, etc.),
    // fall back to demo mode so the admin UI works on static hosting.
    const isDemoCreds = email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD;

    try {
      const data = await apiService.login(email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setAuth({ token: data.token, user: data.user, isAuthenticated: true });
      toast.success('Welcome back!');
      return true;
    } catch (err: unknown) {
      // If demo credentials entered and backend unavailable → demo mode
      if (isDemoCreds) {
        const demoToken = 'demo-offline-token';
        const demoUser = { username: 'admin', email: DEMO_EMAIL, role: 'superadmin' };
        localStorage.setItem(TOKEN_KEY, demoToken);
        localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
        setAuth({ token: demoToken, user: demoUser, isAuthenticated: true });
        toast.success('Demo mode — backend not connected');
        return true;
      }
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Login failed. Check credentials or backend connection.';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth({ token: null, user: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  }, []);

  // ── Documents ─────────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await apiService.getDocuments();
      setDocuments(docs);
    } catch (err) {
      const msg = 'Failed to fetch documents';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsLoadingDocs(true);
    setUploadProgress(0);
    try {
      const newDocs = await apiService.uploadDocuments(files, (progress) => {
        setUploadProgress(progress);
      });
      setDocuments((prev) => [...newDocs, ...prev]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (err) {
      const msg = 'Failed to upload files';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoadingDocs(false);
      setUploadProgress(0);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      await apiService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      toast.success('Document deleted');
    } catch {
      const msg = 'Failed to delete document';
      setError(msg);
      toast.error(msg);
    }
  }, []);

  const reindex = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiService.reindex();
      toast.success('Re-indexing started successfully');
    } catch {
      toast.error('Re-indexing failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (page = 1, limit = 20) => {
    setIsLoadingLogs(true);
    try {
      const result = await apiService.getChatLogs(page, limit);
      setLogs(result.logs);
      setTotalLogs(result.total);
      setCurrentPage(page);
    } catch {
      const msg = 'Failed to fetch chat logs';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch {
      const msg = 'Failed to fetch analytics';
      setError(msg);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    auth,
    login,
    logout,
    documents,
    isLoadingDocs,
    uploadProgress,
    fetchDocuments,
    uploadFiles,
    deleteDocument,
    reindex,
    logs,
    totalLogs,
    currentPage,
    isLoadingLogs,
    fetchLogs,
    analytics,
    isLoadingAnalytics,
    fetchAnalytics,
    isLoading,
    error,
    clearError,
  };
}
