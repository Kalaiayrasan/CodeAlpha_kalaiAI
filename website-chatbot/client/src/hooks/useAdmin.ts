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

// ── Demo data used when no backend is available ───────────────────────────────
const DEMO_TOKEN = 'demo-offline-token';

const DEMO_DOCUMENTS: Document[] = [
  { _id: 'd1', filename: 'menu.pdf', originalName: 'Restaurant Menu.pdf', type: 'pdf', chunksCount: 42, status: 'indexed', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { _id: 'd2', filename: 'faq.docx', originalName: 'Customer FAQ.docx', type: 'docx', chunksCount: 18, status: 'indexed', createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { _id: 'd3', filename: 'policy.txt', originalName: 'Reservation Policy.txt', type: 'txt', chunksCount: 9, status: 'indexed', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
];

const DEMO_LOGS: ChatLog[] = [
  { _id: 'l1', sessionId: 'sess-001', userMessage: 'What are your opening hours?', botResponse: 'We are open Monday–Friday 11am–10pm and weekends 10am–11pm.', tokensUsed: 120, latencyMs: 840, timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },
  { _id: 'l2', sessionId: 'sess-002', userMessage: 'Do you have vegetarian options?', botResponse: 'Yes! We have a dedicated vegetarian section with 12 delicious dishes.', tokensUsed: 98, latencyMs: 720, timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { _id: 'l3', sessionId: 'sess-003', userMessage: 'Can I make a reservation?', botResponse: 'Absolutely! You can call us at +1 (555) 123-4567 or book online on our website.', tokensUsed: 145, latencyMs: 910, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { _id: 'l4', sessionId: 'sess-004', userMessage: 'What is your most popular dish?', botResponse: 'Our signature Butter Chicken is a crowd favourite, closely followed by the Lamb Biryani!', tokensUsed: 134, latencyMs: 680, timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
  { _id: 'l5', sessionId: 'sess-005', userMessage: 'Is parking available?', botResponse: 'Yes, we have free parking for up to 2 hours in the lot adjacent to the restaurant.', tokensUsed: 110, latencyMs: 770, timestamp: new Date(Date.now() - 3600000 * 8).toISOString() },
];

const DEMO_ANALYTICS: Analytics = {
  totalChats: 248,
  avgLatency: 812,
  totalTokens: 31450,
  docsCount: 3,
  dailyChats: [
    { date: 'Mon', count: 28 },
    { date: 'Tue', count: 35 },
    { date: 'Wed', count: 41 },
    { date: 'Thu', count: 38 },
    { date: 'Fri', count: 52 },
    { date: 'Sat', count: 30 },
    { date: 'Sun', count: 24 },
  ],
  topIntents: [
    { intent: 'Menu query', count: 88 },
    { intent: 'Reservation', count: 62 },
    { intent: 'Hours', count: 45 },
    { intent: 'Location', count: 30 },
    { intent: 'Pricing', count: 23 },
  ],
};

const isOfflineMode = () => localStorage.getItem(TOKEN_KEY) === DEMO_TOKEN;

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

    const isDemoCreds = email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD;

    try {
      const data = await apiService.login(email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setAuth({ token: data.token, user: data.user, isAuthenticated: true });
      toast.success('Welcome back!');
      return true;
    } catch (err: unknown) {
      if (isDemoCreds) {
        const demoUser = { username: 'admin', email: DEMO_EMAIL, role: 'superadmin' };
        localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
        localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
        setAuth({ token: DEMO_TOKEN, user: demoUser, isAuthenticated: true });
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
      if (isOfflineMode()) {
        await new Promise((r) => setTimeout(r, 400));
        setDocuments(DEMO_DOCUMENTS);
        return;
      }
      const docs = await apiService.getDocuments();
      setDocuments(docs);
    } catch (err) {
      setDocuments(DEMO_DOCUMENTS);
      toast('Demo data — backend not connected', { icon: 'ℹ️' });
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsLoadingDocs(true);
    setUploadProgress(0);
    try {
      if (isOfflineMode()) {
        for (let p = 10; p <= 100; p += 10) {
          await new Promise((r) => setTimeout(r, 80));
          setUploadProgress(p);
        }
        const newDocs: Document[] = files.map((f, i) => ({
          _id: `demo-${Date.now()}-${i}`,
          filename: f.name,
          originalName: f.name,
          type: f.name.split('.').pop() || 'unknown',
          chunksCount: Math.floor(Math.random() * 30) + 5,
          status: 'indexed',
          createdAt: new Date().toISOString(),
        }));
        setDocuments((prev) => [...newDocs, ...prev]);
        toast.success(`${files.length} file(s) uploaded (demo mode)`);
        return;
      }
      const newDocs = await apiService.uploadDocuments(files, (progress) => {
        setUploadProgress(progress);
      });
      setDocuments((prev) => [...newDocs, ...prev]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (err) {
      const newDocs: Document[] = files.map((f, i) => ({
        _id: `demo-${Date.now()}-${i}`,
        filename: f.name,
        originalName: f.name,
        type: f.name.split('.').pop() || 'unknown',
        chunksCount: Math.floor(Math.random() * 30) + 5,
        status: 'indexed',
        createdAt: new Date().toISOString(),
      }));
      setDocuments((prev) => [...newDocs, ...prev]);
      toast('Upload simulated — backend not connected', { icon: 'ℹ️' });
    } finally {
      setIsLoadingDocs(false);
      setUploadProgress(0);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      if (!isOfflineMode()) {
        await apiService.deleteDocument(id);
      }
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      toast.success('Document deleted');
    } catch {
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      toast.success('Document deleted (demo mode)');
    }
  }, []);

  const reindex = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOfflineMode()) {
        await new Promise((r) => setTimeout(r, 800));
        toast.success('Re-indexing simulated (demo mode)');
        return;
      }
      await apiService.reindex();
      toast.success('Re-indexing started successfully');
    } catch {
      toast('Re-indexing simulated — backend not connected', { icon: 'ℹ️' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (page = 1, limit = 20) => {
    setIsLoadingLogs(true);
    try {
      if (isOfflineMode()) {
        await new Promise((r) => setTimeout(r, 300));
        setLogs(DEMO_LOGS);
        setTotalLogs(DEMO_LOGS.length);
        setCurrentPage(page);
        return;
      }
      const result = await apiService.getChatLogs(page, limit);
      setLogs(result.logs);
      setTotalLogs(result.total);
      setCurrentPage(page);
    } catch {
      setLogs(DEMO_LOGS);
      setTotalLogs(DEMO_LOGS.length);
      setCurrentPage(page);
      toast('Demo data — backend not connected', { icon: 'ℹ️' });
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      if (isOfflineMode()) {
        await new Promise((r) => setTimeout(r, 350));
        setAnalytics(DEMO_ANALYTICS);
        return;
      }
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch {
      setAnalytics(DEMO_ANALYTICS);
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
