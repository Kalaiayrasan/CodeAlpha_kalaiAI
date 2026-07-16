import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from '../MessageBubble/MessageBubble';
import TypingIndicator from '../TypingIndicator/TypingIndicator';
import type { Message } from '../../types';

interface ChatWindowProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onClose: () => void;
  onClear: () => void;
  sessionId: string | null;
  error: string | null;
}

export default function ChatWindow({
  messages,
  isTyping,
  onSendMessage,
  onClose,
  onClear,
  error,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || isTyping) return;
    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    try {
      await onSendMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const windowVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 280, damping: 24, mass: 0.8 },
    },
    exit: {
      opacity: 0,
      y: 16,
      scale: 0.95,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  };

  const isDisabled = isSending || isTyping;

  return (
    <motion.div
      className="flex flex-col w-[380px] h-[580px] max-h-[80vh] rounded-2xl overflow-hidden shadow-glass border border-white/10"
      style={{
        background: 'linear-gradient(135deg, rgba(17,17,24,0.98) 0%, rgba(26,26,46,0.98) 100%)',
        backdropFilter: 'blur(24px)',
      }}
      variants={windowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10"
        style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.2) 0%, rgba(139,92,246,0.1) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-glow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-dark-800 shadow-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">AI Assistant</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">● Online · RAG Powered</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Clear button */}
          <motion.button
            onClick={onClear}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
          {/* Close button */}
          <motion.button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Close chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* ── Messages Area ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
        {messages.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center pb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-400/10 flex items-center justify-center mb-4 border border-primary-500/20">
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-white/80 font-semibold text-sm">How can I help you today?</p>
            <p className="text-white/40 text-xs mt-1">Ask me anything about our services</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {isTyping && <TypingIndicator />}

        {error && (
          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ──────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-white/10" style={{ background: 'rgba(10,10,15,0.5)' }}>
        <div className={`flex items-end gap-2 rounded-xl border transition-all duration-200 px-3 py-2 ${
          isDisabled ? 'border-white/5 bg-white/3' : 'border-primary-500/30 bg-white/5 focus-within:border-primary-500/60 focus-within:shadow-glow-sm'
        }`}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none leading-relaxed py-0.5 max-h-[120px] custom-scrollbar"
          />
          <motion.button
            onClick={handleSend}
            disabled={!inputValue.trim() || isDisabled}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              inputValue.trim() && !isDisabled
                ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-glow-sm'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
            whileHover={inputValue.trim() && !isDisabled ? { scale: 1.08 } : {}}
            whileTap={inputValue.trim() && !isDisabled ? { scale: 0.92 } : {}}
          >
            <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </motion.button>
        </div>
        <p className="text-[10px] text-white/20 text-center mt-2">
          Press <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for newline
        </p>
      </div>
    </motion.div>
  );
}
