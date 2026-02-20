"use client";

import { motion } from "motion/react";
import { TetrisCorner } from "./TetrisCorner";

const roadmapSteps = [
  {
    week: "1-2",
    step: "STEP_0",
    status: "in-progress" as const,
    milestone: "Foundation",
    description: "Manual templates, CLI scaffold, website",
  },
  {
    week: "3-4",
    step: "STEP_1",
    status: "planned" as const,
    milestone: "Detection",
    description: "Pattern detection, language/framework analysis",
  },
  {
    week: "4-5",
    step: "STEP_2",
    status: "planned" as const,
    milestone: "Generation",
    description: "Auto-generate .ana/ from codebase",
  },
  {
    week: "5-6",
    step: "STEP_3",
    status: "planned" as const,
    milestone: "Federation",
    description: "Cross-service queries, multi-repo",
  },
  {
    week: "6-7",
    step: "STEP_4",
    status: "planned" as const,
    milestone: "Refinement",
    description: "Quality improvements, edge cases",
  },
  {
    week: "7",
    step: "STEP_5",
    status: "planned" as const,
    milestone: "Beta Launch",
    description: "Public beta release",
  },
];

export function Roadmap() {
  return (
    <section className="relative py-10" id="roadmap">
      {/* Vertical blueprint lines at 10vw - match BentoGrid */}
      <div
        className="hidden md:block absolute top-10 bottom-10 left-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />
      <div
        className="hidden md:block absolute top-10 bottom-10 right-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />

      {/* Container: 90% mobile, 80% desktop - match BentoGrid */}
      <div className="relative z-[2] w-[90%] lg:w-[80%] mx-auto">
        <div
          className="border-t border-b"
          style={{ borderColor: "var(--border-light)" }}
        >
          {/* Header */}
          <div
            className="p-6 lg:p-[60px] border-b relative"
            style={{ borderColor: "var(--border-light)" }}
          >
            {/* Tetris corners */}
            <TetrisCorner position="top-left" pointing="inward" className="hidden lg:block top-3 left-3" />
            <TetrisCorner position="top-right" pointing="inward" className="hidden lg:block top-3 right-3" />
            <TetrisCorner position="bottom-left" pointing="inward" className="hidden lg:block bottom-3 left-3" />
            <TetrisCorner position="bottom-right" pointing="inward" className="hidden lg:block bottom-3 right-3" />

            <div className="text-center">
              <div
                className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
                style={{ color: "var(--text-muted-35)" }}
              >
                ROADMAP
              </div>
              <h2
                className="text-3xl lg:text-5xl font-semibold tracking-[-0.03em] mb-3"
                style={{ color: "var(--foreground-color)" }}
              >
                7-Week Sprint to Beta
              </h2>
              <p
                className="text-base lg:text-lg max-w-[600px] mx-auto"
                style={{ color: "var(--text-muted-60)" }}
              >
                From foundation to public beta. Currently in Week 1-2.
              </p>
            </div>
          </div>

          {/* Roadmap grid - 3 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {roadmapSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1],
                  delay: index * 0.05,
                }}
                className={`p-6 lg:p-8 border-b ${
                  index % 3 !== 2 ? "lg:border-r" : ""
                } ${step.status === "in-progress" ? "relative" : ""}`}
                style={{
                  borderColor: "var(--border-light)",
                  background: step.status === "in-progress"
                    ? "var(--bg-card)"
                    : "transparent",
                }}
              >
                {/* Current indicator */}
                {step.status === "in-progress" && (
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{
                      background: "linear-gradient(135deg, var(--green-from), var(--green-to))",
                    }}
                  />
                )}

                {/* Week label */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-semibold uppercase tracking-[0.1em]"
                    style={{ color: "var(--text-muted-40)" }}
                  >
                    Week {step.week}
                  </span>
                  {step.status === "in-progress" && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                      style={{
                        background: "linear-gradient(135deg, var(--green-from), var(--green-to))",
                        color: "#000",
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>

                {/* Step name */}
                <div
                  className="text-sm font-mono mb-2"
                  style={{
                    color: step.status === "in-progress"
                      ? "var(--green-from)"
                      : "var(--text-muted-50)",
                  }}
                >
                  {step.step}
                </div>

                {/* Milestone */}
                <div
                  className="text-xl lg:text-2xl font-semibold mb-2"
                  style={{
                    color: step.status === "in-progress"
                      ? "var(--foreground-color)"
                      : "var(--text-muted-60)",
                  }}
                >
                  {step.milestone}
                </div>

                {/* Description */}
                <div
                  className="text-sm"
                  style={{
                    color: step.status === "in-progress"
                      ? "var(--text-muted-75)"
                      : "var(--text-muted-50)",
                  }}
                >
                  {step.description}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
