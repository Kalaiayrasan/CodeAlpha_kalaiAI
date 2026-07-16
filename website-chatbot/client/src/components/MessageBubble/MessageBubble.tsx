import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

function BotAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-glow-sm">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
        />
      </svg>
    </div>
  );
}

function formatContent(content: string) {
  return content.split('\n').map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const bubbleVariants = {
    hidden: {
      opacity: 0,
      y: 12,
      x: isUser ? 12 : -12,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        mass: 0.8,
      },
    },
  };

  if (isUser) {
    return (
      <motion.div
        className="flex items-end justify-end gap-2 mb-4"
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col items-end max-w-[78%]">
          <div className="relative px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-primary-600 to-primary-500 shadow-glow-sm text-white text-sm leading-relaxed">
            {formatContent(message.content)}
            {/* Tail */}
            <div className="absolute -bottom-0 -right-1 w-3 h-3 bg-primary-500 clip-tail-right" />
          </div>
          <span className="text-[10px] text-white/40 mt-1 mr-1">
            {format(message.timestamp, 'hh:mm a')}
          </span>
        </div>
        {/* User avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white text-xs font-semibold">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-start gap-2 mb-4"
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
    >
      <BotAvatar />
      <div className="flex flex-col max-w-[78%]">
        <div className="glass-card px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-white/90">
          {formatContent(message.content)}
        </div>
        <span className="text-[10px] text-white/40 mt-1 ml-1">
          {format(message.timestamp, 'hh:mm a')}
        </span>
      </div>
    </motion.div>
  );
}
