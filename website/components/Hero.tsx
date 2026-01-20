"use client";

import { motion } from "motion/react";
import { Download, Github } from "lucide-react";
import { BracketRevealLogo } from "./BracketRevealLogo";

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start pt-[90px] lg:pt-[145px] pb-20 px-4 md:px-6 lg:px-10 text-center z-10">
      {/* Vertical blueprint lines at 10vw */}
      <div
        className="hidden md:block absolute top-[-200px] bottom-0 left-[10vw] w-px z-[-1] pointer-events-none"
        style={{
          background: "var(--border-light)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 150px, black 900px, black calc(100% - 150px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 150px, black 900px, black calc(100% - 150px), transparent 100%)",
        }}
      />
      <div
        className="hidden md:block absolute top-[-200px] bottom-0 right-[10vw] w-px z-[-1] pointer-events-none"
        style={{
          background: "var(--border-light)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 150px, black 900px, black calc(100% - 150px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 150px, black 900px, black calc(100% - 150px), transparent 100%)",
        }}
      />

      {/* Dots layer with bezier-curved mask - GREEN DOTS */}
      <div
        className="absolute top-0 left-[10%] right-[10%] bottom-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#10B981 1.25px, transparent 1.25px)`,
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0",
          opacity: 0.4,
          maskImage: "url(/dots-mask.png)",
          WebkitMaskImage: "url(/dots-mask.png)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      />


      <div className="max-w-[900px] mx-auto relative z-10">
        {/* Animated Logo - Smaller, subtle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 lg:mb-8"
        >
          <div className="flex items-center justify-center gap-1.5 text-2xl lg:text-3xl font-bold">
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
              style={{ color: "var(--green-from)" }}
            >
              [
            </motion.span>
            <motion.span
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.4, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
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
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
              style={{ color: "var(--green-to)" }}
            >
              ]
            </motion.span>
          </div>
        </motion.div>

        {/* Headline - Larger, tighter spacing */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-[48px] lg:text-[72px] font-bold mb-6 lg:mb-8 tracking-[-0.04em] leading-[0.95]"
          style={{ color: "var(--foreground-color)" }}
        >
          Stop re-explaining
          <br />
          your codebase
        </motion.h1>

        {/* Subtext - Tighter, cleaner */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[17px] lg:text-[20px] mb-10 lg:mb-12 max-w-[620px] mx-auto leading-[1.5]"
          style={{ color: "var(--text-muted-65)" }}
        >
          Auto-generated in 30 seconds. Stays current with your code.
          <br />
          Your AI queries across services. Never leaves chat.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4 mb-12"
        >
          <div className="flex flex-wrap gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 lg:px-8 py-3 lg:py-4 text-sm lg:text-base font-semibold rounded-lg transition-all inline-flex items-center gap-2"
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              <Download className="w-5 h-5" strokeWidth={2} />
              Install Now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 lg:px-8 py-3 lg:py-4 text-sm lg:text-base font-semibold rounded-lg transition-all inline-flex items-center gap-2"
              style={{
                background: "var(--btn-secondary-bg)",
                border: "1px solid var(--btn-secondary-border)",
                color: "var(--btn-secondary-text)",
              }}
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </motion.button>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="text-[13px]"
            style={{ color: "var(--text-muted-40)" }}
          >
            npm install -g anatomia • MIT License • Works with Claude Code, Cursor, Windsurf
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
