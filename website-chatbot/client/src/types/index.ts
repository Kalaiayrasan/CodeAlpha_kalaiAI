export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface Session {
  sessionId: string;
  messages: Message[];
}

export interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  session: Session | null;
  isTyping: boolean;
  error: string | null;
}

export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  type: string;
  chunksCount: number;
  status: 'processing' | 'indexed' | 'failed';
  createdAt: string;
}

export interface ChatLog {
  _id: string;
  sessionId: string;
  userMessage: string;
  botResponse: string;
  tokensUsed: number;
  latencyMs: number;
  timestamp: string;
}

export interface Analytics {
  totalChats: number;
  avgLatency: number;
  totalTokens: number;
  docsCount: number;
  dailyChats: { date: string; count: number }[];
  topIntents: { intent: string; count: number }[];
}

export interface AuthState {
  token: string | null;
  user: { username: string; email: string; role: string } | null;
  isAuthenticated: boolean;
}

export type Theme = 'dark' | 'light';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

export interface PaginatedLogs {
  logs: ChatLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTab {
  id: string;
  label: string;
  icon: string;
}
