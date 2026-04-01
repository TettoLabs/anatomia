"use client";

import { TetrisCorner } from "./TetrisCorner";
import { ButtonLink, Button } from "./ui/Button";
import { motion } from "motion/react";

const pricingTiers = [
  {
    name: "FREE",
    price: "$0",
    period: "Forever",
    features: [
      "Full codebase analysis",
      "Four-agent pipeline",
      "Mechanical verification",
      "Context drift detection",
      "Configurable agents",
      "MIT License",
    ],
    cta: "Get Started",
    ctaStyle: "primary" as const,
    disabled: false,
  },
  {
    name: "TEAM",
    price: "Coming soon",
    period: "",
    features: [
      "Everything in Free",
      "Hosted Proofs",
      "Team dashboard",
      "Parallel pipelines",
      "Shared context",
      "Priority support",
    ],
    cta: "Join waitlist",
    ctaStyle: "secondary" as const,
    disabled: true,
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative w-[90vw] lg:w-[80vw] mx-auto"
      style={{ padding: "10px 0 60px" }}
    >
      {/* Vertical lines at edges - start at top: 10px to match padding */}
      <div
        className="hidden lg:block absolute bottom-0 left-0 w-px pointer-events-none"
        style={{ top: "10px", background: "var(--border-light)" }}
      />
      <div
        className="hidden lg:block absolute bottom-0 right-0 w-px pointer-events-none"
        style={{ top: "10px", background: "var(--border-light)" }}
      />

      {/* Top grid border (12 cells) */}
      <div
        className="hidden lg:grid gap-0"
        style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      >
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRight: i < 11 ? "1px solid var(--border-light)" : "none",
                borderBottom: "1px solid var(--border-light)",
                borderTop: "1px solid var(--border-light)",
              }}
            />
          ))}
      </div>

      {/* Header content with side boxes */}
      <div
        className="hidden lg:grid gap-0"
        style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      >
        {/* Left side boxes (column 1) */}
        <div className="flex flex-col" style={{ gridColumn: "1 / 2" }}>
          <div
            style={{
              aspectRatio: "1",
              borderBottom: "1px solid var(--border-light)",
              borderRight: "1px solid var(--border-light)",
            }}
          />
          <div
            style={{
              aspectRatio: "1",
              borderBottom: "1px solid var(--border-light)",
              borderRight: "1px solid var(--border-light)",
            }}
          />
        </div>

        {/* Center title area (columns 2-11) */}
        <div
          className="text-center flex flex-col justify-center relative"
          style={{
            gridColumn: "2 / 12",
            padding: "20px 40px",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          {/* Tetris corners */}
          <TetrisCorner position="top-left" pointing="inward" className="top-3 left-3" />
          <TetrisCorner position="top-right" pointing="inward" className="top-3 right-3" />
          <TetrisCorner position="bottom-left" pointing="inward" className="bottom-3 left-3" />
          <TetrisCorner position="bottom-right" pointing="inward" className="bottom-3 right-3" />

          <h2
            className="text-5xl font-semibold tracking-[-0.03em] mb-0"
            style={{ color: "var(--foreground-color)" }}
          >
            Start free. Scale when you&apos;re ready.
          </h2>
        </div>

        {/* Right side boxes (column 12) */}
        <div className="flex flex-col" style={{ gridColumn: "12 / 13" }}>
          <div
            style={{
              aspectRatio: "1",
              borderBottom: "1px solid var(--border-light)",
              borderLeft: "1px solid var(--border-light)",
            }}
          />
          <div
            style={{
              aspectRatio: "1",
              borderBottom: "1px solid var(--border-light)",
              borderLeft: "1px solid var(--border-light)",
            }}
          />
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden text-center py-8 px-6 border-t border-b" style={{ borderColor: "var(--border-light)" }}>
        <h2
          className="text-3xl font-semibold tracking-[-0.03em] mb-0"
          style={{ color: "var(--foreground-color)" }}
        >
          Start free. Scale when you&apos;re ready.
        </h2>
      </div>

      {/* Bottom grid border (12 cells) */}
      <div
        className="hidden lg:grid gap-0"
        style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      >
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRight: i < 11 ? "1px solid var(--border-light)" : "none",
                borderBottom: "1px solid var(--border-light)",
              }}
            />
          ))}
      </div>

      {/* Pricing cards - 1 col mobile, 2 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {pricingTiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1],
              delay: index * 0.1,
            }}
            className={`p-6 lg:p-8 min-h-0 lg:min-h-[400px] border-b ${
              index < 1 ? "lg:border-r" : ""
            } ${tier.disabled ? "opacity-60" : ""}`}
            style={{ borderColor: "var(--border-light)" }}
          >
            <div
              className="text-sm font-semibold uppercase tracking-[0.05em] mb-4"
              style={{ color: "var(--text-muted-50)" }}
            >
              {tier.name}
            </div>
            <div
              className="text-4xl lg:text-5xl font-semibold tracking-[-0.03em] mb-2"
              style={{ color: "var(--foreground-color)" }}
            >
              {tier.price}
            </div>
            <div className="text-sm mb-6 lg:mb-8" style={{ color: "var(--text-muted-50)" }}>
              {tier.period}
            </div>
            <ul className="list-none mb-6 lg:mb-8 p-0">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="text-sm mb-3 pl-5 relative"
                  style={{ color: "var(--text-muted-60)" }}
                >
                  <span className="absolute left-0" style={{ color: "var(--text-muted-40)" }}>
                    →
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            {tier.disabled ? (
              <Button
                variant={tier.ctaStyle}
                size="md"
                className="w-full justify-center"
                disabled
              >
                {tier.cta}
              </Button>
            ) : (
              <ButtonLink
                href="https://github.com/TettoLabs/anatomia#quick-start"
                variant={tier.ctaStyle}
                size="md"
                className="w-full justify-center"
                external
              >
                {tier.cta}
              </ButtonLink>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
