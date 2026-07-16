import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChatWindow from '../ChatWindow/ChatWindow';
import { useChat } from '../../hooks/useChat';

export default function ChatWidget() {
  const { messages, sessionId, isTyping, isOpen, error, unreadCount, sendMessage, clearChat, toggleOpen } =
    useChat();
  const [showTooltip, setShowTooltip] = useState(false);

  const buttonVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: { scale: 1.08, rotate: 5 },
    tap: { scale: 0.93, rotate: 0 },
    open: { rotate: 45 },
  };

  const tooltipVariants = {
    hidden: { opacity: 0, x: 10, scale: 0.9 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, x: 10, scale: 0.9, transition: { duration: 0.15 } },
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <ChatWindow
            key="chat-window"
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            onClose={toggleOpen}
            onClear={clearChat}
            sessionId={sessionId}
            error={error}
          />
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <div className="relative flex items-center">
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              className="absolute right-16 whitespace-nowrap glass-card px-3 py-1.5 rounded-lg text-xs text-white/90 font-medium pointer-events-none"
              variants={tooltipVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              Chat with AI Assistant
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-l-[6px] border-transparent border-l-white/10" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && !isOpen && (
            <motion.span
              className="absolute -top-1.5 -left-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-dark-900"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring (shown when closed) */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-primary-600/30 pointer-events-none" />
            <span className="absolute inset-0 rounded-full animate-pulse bg-primary-600/10 pointer-events-none" />
          </>
        )}

        {/* Main button */}
        <motion.button
          onClick={toggleOpen}
          onHoverStart={() => setShowTooltip(true)}
          onHoverEnd={() => setShowTooltip(false)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-primary-500 text-white flex items-center justify-center shadow-glow focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-transparent"
          variants={buttonVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          animate={isOpen ? 'open' : 'rest'}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.svg
                key="close"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </motion.svg>
            ) : (
              <motion.svg
                key="chat"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
