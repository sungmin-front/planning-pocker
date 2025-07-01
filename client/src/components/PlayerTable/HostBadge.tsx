import React from 'react';
import { motion } from 'framer-motion';

export const HostBadge: React.FC = () => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }}
      className="inline-flex items-center justify-center"
      title="Host"
      role="img"
      aria-label="Host crown"
    >
      <span
        className="text-yellow-500 text-lg select-none"
        style={{ fontSize: '1.2em' }}
      >
        👑
      </span>
    </motion.div>
  );
};