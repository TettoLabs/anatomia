"use client";

import { motion } from "motion/react";

export function BridgeSection() {
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

      <div className="relative z-[2] max-w-[900px] mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[40px] lg:text-[56px] font-semibold mb-6 lg:mb-8 tracking-[-0.03em] leading-[1.1]"
          style={{ color: "var(--foreground-color)" }}
        >
          Think. Plan. Build. Verify.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[17px] lg:text-[20px] leading-[1.6] max-w-[680px] mx-auto"
          style={{ color: "var(--text-muted-60)" }}
        >
          Anatomia structures AI development through a verified pipeline.
          Every change scoped, specified, built by constrained agents,
          and proven against your source code.
        </motion.p>
      </div>
    </section>
  );
}
