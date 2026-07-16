import { motion } from 'framer-motion';

const dotVariants = {
  initial: { y: 0, opacity: 0.4, scale: 0.8 },
  animate: { y: -6, opacity: 1, scale: 1 },
};

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.18,
      repeat: Infinity,
      repeatType: 'loop' as const,
    },
  },
};

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Bot avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-glow-sm">
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
          />
        </svg>
      </div>

      {/* Typing bubble */}
      <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80px] flex items-center">
        <motion.div
          className="flex items-center gap-1.5"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-2 h-2 rounded-full bg-primary-400"
              variants={dotVariants}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'mirror',
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
