"use client";

import { motion } from "motion/react";

export function BracketRevealLogo() {
  return (
    <div className="flex items-center justify-center gap-2 text-5xl lg:text-6xl font-bold">
      <motion.span
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
        style={{ color: "var(--green-from)" }}
      >
        [
      </motion.span>
      <motion.span
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.33, 1, 0.68, 1] }}
        style={{
          background: "linear-gradient(135deg, var(--green-from), var(--green-to))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        anatomia
      </motion.span>
      <motion.span
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
        style={{ color: "var(--green-to)" }}
      >
        ]
      </motion.span>
    </div>
  );
}
