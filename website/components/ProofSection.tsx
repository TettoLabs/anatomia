"use client";

import { motion } from "motion/react";

export function ProofSection() {
  return (
    <section className="relative py-20 lg:py-32 px-4 md:px-6 lg:px-10">
      {/* Vertical blueprint lines at 10vw */}
      <div
        className="hidden md:block absolute top-0 bottom-0 left-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />
      <div
        className="hidden md:block absolute top-0 bottom-0 right-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />

      <div className="relative z-[2] max-w-[900px] mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[48px] lg:text-[72px] font-semibold mb-8 lg:mb-12 tracking-[-0.04em] leading-[1.05]"
          style={{ color: "var(--foreground-color)" }}
        >
          Ship with proof.
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[17px] lg:text-[20px] leading-[1.7] max-w-[720px] mx-auto mb-8 lg:mb-10"
          style={{ color: "var(--text-muted-65)" }}
        >
          <p className="mb-6">
            Every pipeline run produces a trail — scope, spec, test
            contracts, verification report. What was intended. What was
            built. That it was mechanically verified. Git-tracked, next
            to your code, shareable with your team.
          </p>
          <p
            className="font-medium mb-0"
            style={{ color: "var(--foreground-color)" }}
          >
            Not AI opinion. Software proof.
          </p>
        </motion.div>
        <motion.a
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          href="https://github.com/TettoLabs/anatomia"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-4 text-sm lg:text-base font-semibold rounded-lg transition-all hover:opacity-90 no-underline"
          style={{
            background: "var(--btn-secondary-bg)",
            border: "1px solid var(--btn-secondary-border)",
            color: "var(--btn-secondary-text)",
          }}
        >
          See how verification works
        </motion.a>
      </div>
    </section>
  );
}
