import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, Brain, Shield, Moon, Sun, Code, BarChart3,
  MessageSquare, Upload, ChevronRight,
  Sparkles, Bot
} from 'lucide-react';
import ChatWidget from '../components/ChatWidget/ChatWidget';
import { useTheme } from '../hooks/useTheme';

const features = [
  {
    icon: Brain,
    title: 'RAG Architecture',
    desc: 'Retrieval-Augmented Generation combines your knowledge base with GPT-4 for accurate, grounded answers.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'Multi-Turn Memory',
    desc: 'Remembers conversation context across multiple messages for natural, flowing dialogue.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Upload,
    title: 'Admin Dashboard',
    desc: 'Upload PDFs, DOCX, CSVs and re-index your knowledge base instantly from a beautiful dashboard.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Moon,
    title: 'Dark / Light Mode',
    desc: 'Fully themed UI with smooth dark/light toggle. Respects system preferences.',
    color: 'from-orange-500 to-amber-600',
  },
  {
    icon: Code,
    title: 'Easy Embedding',
    desc: 'One script tag to embed on any website. React component and vanilla JS widget available.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: Shield,
    title: 'Production Secure',
    desc: 'JWT auth, rate limiting, input validation, CORS, XSS protection — security first.',
    color: 'from-indigo-500 to-violet-600',
  },
];

const steps = [
  { number: '01', title: 'Upload Your Knowledge', desc: 'Add your FAQs, menus, policies, PDFs to the admin dashboard. We handle chunking and embedding automatically.' },
  { number: '02', title: 'AI Learns Your Business', desc: 'OpenAI embeddings index your content into ChromaDB. The chatbot now knows everything about your restaurant.' },
  { number: '03', title: 'Embed & Go Live', desc: 'Copy one script tag to your website. Your customers get instant, accurate AI-powered support.' },
];

const embedCode = `<!-- Add to your website -->
<script>
  window.KalaiChat = {
    apiUrl: 'https://your-api.render.com',
    botName: 'Kalai Assistant',
    primaryColor: '#7C3AED',
    welcomeMessage: 'Hi! How can I help you today? 🍽️'
  };
</script>
<script src="https://your-cdn.com/chatbot-widget.js" async></script>`;

const Home: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
      {/* ─── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-dark-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Bot size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              Kalai<span className="text-violet-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/admin"
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
              id="admin-link"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-800/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
              <Sparkles size={14} />
              <span>Powered by GPT-4 + RAG Architecture</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-6 leading-none">
              AI Customer Support
              <br />
              <span className="gradient-text">That Actually Knows</span>
              <br />
              <span className="gradient-text">Your Business</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Embed a production-ready AI chatbot on your website in minutes. Train it on your menus,
              FAQs, and policies. Watch it answer customer questions instantly, 24/7.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl font-semibold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow flex items-center gap-2"
                onClick={() => {
                  document.getElementById('embed-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                id="get-started-btn"
              >
                <Zap size={20} />
                Get Started Free
              </motion.button>
              <Link
                to="/admin"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                id="view-demo-btn"
              >
                <BarChart3 size={20} />
                View Admin Demo
              </Link>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: '<2s', label: 'Avg Response Time' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '∞', label: 'Knowledge Chunks' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black text-violet-400">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-gray-400 text-lg">Built for production from day one</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-card p-6 rounded-2xl group cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-dark-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Up and running in under 10 minutes</p>
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-purple-500/30">
                    <span className="font-black text-xl">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Embed Code ──────────────────────────────────────────────────────── */}
      <section id="embed-section" className="py-24 max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4">Embed in Seconds</h2>
          <p className="text-gray-400 text-lg">One snippet. Any website. Works everywhere.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative glass-card rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <span className="text-xs text-gray-500 font-mono">embed.html</span>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1 rounded bg-violet-600/20 border border-violet-500/20 text-violet-300 hover:bg-violet-600/30 transition-colors"
              id="copy-embed-btn"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="p-6 text-sm text-green-400 font-mono leading-relaxed overflow-x-auto">
            <code>{embedCode}</code>
          </pre>
        </motion.div>
      </section>

      {/* ─── CTA Footer ──────────────────────────────────────────────────────── */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-900/10 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10"
        >
          <h2 className="text-5xl font-black mb-6">Ready to Transform<br />Customer Support?</h2>
          <p className="text-gray-400 text-lg mb-10">Join restaurants using Kalai AI to automate customer queries.</p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl font-bold text-xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow"
            id="cta-admin-btn"
          >
            Launch Admin Dashboard <ChevronRight size={22} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        <p>© 2024 Kalai Restaurant AI Chatbot. Built with ❤️ using RAG + GPT-4.</p>
      </footer>

      {/* Floating chat widget */}
      <ChatWidget />
    </div>
  );
};

export default Home;
