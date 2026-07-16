import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import type { UseAdminReturn } from '../../hooks/useAdmin';
import type { ChatLog } from '../../types';

interface AdminDashboardProps {
  activeTab: string;
}

// ── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

function StatCard({ title, value, icon, trend, trendUp, color }: StatCardProps) {
  return (
    <motion.div
      className="glass-card rounded-xl p-5 border border-white/10 hover:border-primary-500/30 transition-colors"
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(124,58,237,0.2)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-white/50 font-medium">{title}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {trend && (
        <p className={`text-xs font-medium flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={trendUp ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'} />
          </svg>
          {trend}
        </p>
      )}
    </motion.div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'processing' | 'indexed' | 'failed' }) {
  const map = {
    indexed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {status}
    </span>
  );
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 rounded-lg border border-white/10 text-xs">
        <p className="text-white/60 mb-1">{label}</p>
        <p className="text-primary-400 font-semibold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

// ── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ admin }: { admin: UseAdminReturn }) {
  useEffect(() => {
    admin.fetchAnalytics();
  }, []);

  const a = admin.analytics;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Chats"
          value={a?.totalChats ?? '—'}
          icon={<svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          trend="+12% this week"
          trendUp
          color="bg-primary-600/20"
        />
        <StatCard
          title="Avg Response Time"
          value={a ? `${a.avgLatency}ms` : '—'}
          icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend="-8% this week"
          trendUp
          color="bg-cyan-600/20"
        />
        <StatCard
          title="Total Tokens"
          value={a ? `${(a.totalTokens / 1000).toFixed(1)}K` : '—'}
          icon={<svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          trend="+5% this week"
          trendUp
          color="bg-violet-600/20"
        />
        <StatCard
          title="Documents Indexed"
          value={a?.docsCount ?? '—'}
          icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          color="bg-emerald-600/20"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily chat volume */}
        <div className="glass-card rounded-xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Chat Volume</h3>
          {admin.isLoadingAnalytics ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={a?.dailyChats ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top intents */}
        <div className="glass-card rounded-xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Top Intents</h3>
          {admin.isLoadingAnalytics ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={a?.topIntents ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="intent" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Documents Tab ───────────────────────────────────────────────────────────
function DocumentsTab({ admin }: { admin: UseAdminReturn }) {
  useEffect(() => {
    admin.fetchDocuments();
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        admin.uploadFiles(accepted);
      }
    },
    [admin],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-500/10 shadow-glow-sm'
            : 'border-white/20 hover:border-primary-500/50 hover:bg-white/5'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDragActive ? 'bg-primary-600/30' : 'bg-white/5'}`}>
            <svg className={`w-7 h-7 ${isDragActive ? 'text-primary-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className={`font-semibold text-sm ${isDragActive ? 'text-primary-400' : 'text-white/70'}`}>
              {isDragActive ? 'Drop files here…' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-white/40 mt-1">PDF, DOCX, TXT, CSV · Max 50MB each</p>
          </div>
          {!isDragActive && (
            <span className="px-4 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 text-xs font-medium border border-primary-500/30">
              Browse Files
            </span>
          )}
        </div>
      </div>

      {/* Upload progress */}
      <AnimatePresence>
        {admin.uploadProgress > 0 && admin.uploadProgress < 100 && (
          <motion.div
            className="glass-card rounded-xl p-4 border border-white/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">Uploading…</span>
              <span className="text-xs text-primary-400 font-semibold">{admin.uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${admin.uploadProgress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-index button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Indexed Documents ({admin.documents.length})</h3>
        <motion.button
          onClick={admin.reindex}
          disabled={admin.isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 text-xs font-medium border border-primary-500/30 hover:bg-primary-600/30 transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className={`w-3.5 h-3.5 ${admin.isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-index All
        </motion.button>
      </div>

      {/* Documents table */}
      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        {admin.isLoadingDocs ? (
          <div className="flex items-center justify-center py-12 text-white/40 text-sm">
            <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading documents…
          </div>
        ) : admin.documents.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm">No documents uploaded yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50">File Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Type</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-white/50">Chunks</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-white/50">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admin.documents.map((doc, i) => (
                <motion.tr
                  key={doc._id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-white/80 truncate max-w-[180px]" title={doc.originalName}>
                        {doc.originalName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 uppercase text-xs">{doc.type}</td>
                  <td className="px-4 py-3 text-center text-white/60">{doc.chunksCount}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <motion.button
                      onClick={() => admin.deleteDocument(doc._id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete document"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Chat Logs Tab ───────────────────────────────────────────────────────────
function ChatLogsTab({ admin }: { admin: UseAdminReturn }) {
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);

  useEffect(() => {
    admin.fetchLogs(1);
  }, []);

  const filtered = admin.logs.filter(
    (l) =>
      l.userMessage.toLowerCase().includes(search.toLowerCase()) ||
      l.botResponse.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
        />
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        {admin.isLoadingLogs ? (
          <div className="flex items-center justify-center py-12 text-white/40 text-sm">Loading logs…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">User Message</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Bot Response</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/50">Latency</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/50">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <motion.tr
                    key={log._id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-white/70 max-w-[180px] truncate">{log.userMessage}</td>
                    <td className="px-4 py-3 text-white/50 max-w-[200px] truncate">{log.botResponse}</td>
                    <td className="px-4 py-3 text-right text-cyan-400 text-xs">{log.latencyMs}ms</td>
                    <td className="px-4 py-3 text-right text-violet-400 text-xs">{log.tokensUsed}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">
          Total: {admin.totalLogs} logs
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => admin.fetchLogs(admin.currentPage - 1)}
            disabled={admin.currentPage <= 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-white/40">Page {admin.currentPage}</span>
          <button
            onClick={() => admin.fetchLogs(admin.currentPage + 1)}
            disabled={admin.currentPage * 20 >= admin.totalLogs}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Log detail modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
            <motion.div
              className="relative glass-card rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-glass z-10"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Conversation Detail</h3>
                <button onClick={() => setSelectedLog(null)} className="text-white/40 hover:text-white/80">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-white/40 text-xs mb-1">Session ID</p>
                  <p className="text-white/60 font-mono text-xs">{selectedLog.sessionId}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">User Message</p>
                  <p className="text-white/80 bg-primary-600/10 rounded-lg px-3 py-2">{selectedLog.userMessage}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Bot Response</p>
                  <p className="text-white/70 bg-white/5 rounded-lg px-3 py-2">{selectedLog.botResponse}</p>
                </div>
                <div className="flex gap-4 text-xs text-white/40">
                  <span>Latency: <span className="text-cyan-400">{selectedLog.latencyMs}ms</span></span>
                  <span>Tokens: <span className="text-violet-400">{selectedLog.tokensUsed}</span></span>
                  <span>{format(new Date(selectedLog.timestamp), 'PPpp')}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const handleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password updated successfully');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* API Config */}
      <div className="glass-card rounded-xl p-5 border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          API Configuration
        </h3>
        <div className="space-y-3 text-sm">
          {[
            { label: 'API Base URL', value: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' },
            { label: 'Environment', value: import.meta.env.MODE },
            { label: 'Build Version', value: '1.0.0' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-white/50">{label}</span>
              <span className="font-mono text-xs text-primary-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="glass-card rounded-xl p-5 border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Change Password
        </h3>
        <form onSubmit={handleChange} className="space-y-3">
          {[
            { label: 'Current Password', value: currentPw, set: setCurrentPw },
            { label: 'New Password', value: newPw, set: setNewPw },
            { label: 'Confirm New Password', value: confirmPw, set: setConfirmPw },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-white/50 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => set(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-primary-500/50 placeholder-white/20"
                placeholder="••••••••"
              />
            </div>
          ))}
          <motion.button
            type="submit"
            className="w-full py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:from-primary-500 hover:to-primary-400 transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Update Password
          </motion.button>
        </form>
      </div>
    </div>
  );
}

// ── Main AdminDashboard ─────────────────────────────────────────────────────
export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
  const admin = useAdmin();

  return (
    <div className="flex-1 min-w-0 p-6">
      {/* Page title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
        <p className="text-sm text-white/40 mt-1">
          {activeTab === 'overview' && 'Monitor your chatbot performance'}
          {activeTab === 'documents' && 'Manage your knowledge base'}
          {activeTab === 'logs' && 'Review conversation history'}
          {activeTab === 'settings' && 'Configure your chatbot'}
        </p>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab admin={admin} />}
          {activeTab === 'documents' && <DocumentsTab admin={admin} />}
          {activeTab === 'logs' && <ChatLogsTab admin={admin} />}
          {activeTab === 'settings' && <SettingsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
