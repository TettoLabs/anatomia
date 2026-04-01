"use client";

import { motion } from "motion/react";

export function VisionSection() {
  return (
    <section className="relative py-16 lg:py-24 px-4 md:px-6 lg:px-10">
      {/* Vertical blueprint lines at 10vw */}
      <div
        className="hidden md:block absolute top-0 bottom-0 left-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />
      <div
        className="hidden md:block absolute top-0 bottom-0 right-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />

      <div className="relative z-[2] max-w-[760px] mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[32px] lg:text-[44px] font-semibold mb-6 lg:mb-8 tracking-[-0.02em] leading-[1.15]"
          style={{ color: "var(--foreground-color)" }}
        >
          Where this is going.
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[15px] lg:text-[17px] leading-[1.75] max-w-[620px] mx-auto mb-8"
          style={{ color: "var(--text-muted-60)" }}
        >
          <p className="mb-4">
            Today, Ana runs in your terminal.
            Tomorrow, you describe what you want and Ana handles the rest.
            You review outcomes, not code. You ship with proof, not hope.
          </p>
          <p
            className="mb-0 italic"
            style={{ color: "var(--text-muted-50)" }}
          >
            The pipeline disappears. The proof stays.
          </p>
        </motion.div>
        <motion.a
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          href="#"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all hover:opacity-80 no-underline"
          style={{
            background: "var(--btn-secondary-bg)",
            border: "1px solid var(--btn-secondary-border)",
            color: "var(--btn-secondary-text)",
          }}
        >
          Get notified
        </motion.a>
      </div>
    </section>
  );
}
