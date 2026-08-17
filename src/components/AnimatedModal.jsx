import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export default function AnimatedModal({ children, maxWidth = "max-w-2xl", className = "" }) {
  return createPortal(
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className={`bg-white dark:bg-zinc-900 dark:text-zinc-100 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto ${className}`}
        initial={{ scale: 0.96, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 14 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
}