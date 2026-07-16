import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bot, LayoutDashboard, FileText, MessageSquare, Settings,
  LogOut, Lock, Mail, Eye, EyeOff, ChevronLeft
} from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard/AdminDashboard';
import { useAdmin } from '../hooks/useAdmin';

// ─── Login Page ───────────────────────────────────────────────────────────────
const LoginPage: React.FC<{ onLogin: (email: string, password: string) => Promise<void>; isLoading: boolean; error: string | null }> = ({
  onLogin, isLoading, error
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-800/15 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <Bot size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Admin Login</h1>
          <p className="text-gray-500 mt-2">Kalai Restaurant AI Chatbot</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kalairestaurant.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center mt-6 text-gray-600 text-sm">
          <Link to="/" className="text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1">
            <ChevronLeft size={14} /> Back to Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'logs', label: 'Chat Logs', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── Admin Page ───────────────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const { auth, login: loginFn, logout, isLoading, error } = useAdmin();
  const { isAuthenticated, user } = auth;

  const login = async (email: string, password: string) => {
    await loginFn(email, password);
  };

  const [activeTab, setActiveTab] = useState('overview');

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} isLoading={isLoading} error={error} />;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white flex">
      {/* ─── Sidebar ──────────────────────────────────────────────────────────── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 border-r border-white/5 flex flex-col bg-dark-800/50 backdrop-blur-sm"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Kalai AI</div>
              <div className="text-xs text-gray-500">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.username || 'Admin'}</div>
              <div className="text-xs text-gray-500 truncate">{user?.role}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-400"
              id="sidebar-home-link"
            >
              <ChevronLeft size={12} /> Home
            </Link>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-xs text-red-400"
              id="logout-btn"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ─── Main Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <AdminDashboard activeTab={activeTab} />
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Admin;
