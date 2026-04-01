"use client";

import { TetrisCorner } from "./TetrisCorner";
import { IndustryTicker } from "./IndustryTicker";

const analysisMetrics = [
  { label: "SCAN", value: "30s" },
  { label: "PATTERNS", value: "18+" },
  { label: "LANGUAGES", value: "5" },
  { label: "TESTS", value: "300+" },
];

const generateFeatures = [
  "Intent captured before code is written",
  "Specs with test contracts — TDD from the start",
  "Constrained agents that can't exceed their role",
  "Mechanical verification against the spec",
];

const systemFeatures = [
  { icon: "→", text: "Context verified against your actual source code" },
  { icon: "◆", text: "Skills define your team's preferences — not defaults" },
  { icon: "✓", text: "Agents use the model you choose — Opus, Sonnet, Haiku" },
  { icon: "○", text: "Context updates when your code changes" },
  { icon: "▲", text: "Teach Ana what parsing can't detect — your way" },
  { icon: "●", text: "Every change produces a proof you can share" },
];

const compatibilityBullets = [
  "Standard markdown. Git-tracked. No vendor lock-in.",
  "Claude Code gets native pipeline integration.",
  "Any AI tool that reads markdown gets the intelligence.",
];

export function BentoGrid() {
  return (
    <section className="relative py-10" id="features">
      {/* Vertical blueprint lines at 10vw */}
      <div
        className="hidden md:block absolute top-10 bottom-10 left-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />
      <div
        className="hidden md:block absolute top-10 bottom-10 right-[10vw] w-px z-[1] pointer-events-none"
        style={{ background: "var(--border-light)" }}
      />

      {/* Container: 90% mobile, 80% desktop */}
      <div className="relative z-[2] w-[90%] lg:w-[80%] mx-auto">
        <div
          className="flex flex-col lg:grid lg:grid-cols-12 gap-0 border-t pl-px pr-px"
          style={{
            borderColor: "var(--border-light)",
          }}
        >
          {/* Cell 1: Head - Full width */}
          <header
            className="col-span-1 lg:col-span-12 py-10 px-6 lg:py-[80px] lg:px-[60px] flex flex-col lg:flex-row gap-8 lg:gap-[80px] items-start lg:items-center relative border-b bg-transparent anim-cell-reveal"
            style={{
              borderColor: "var(--border-light)",
              animationDelay: "0.1s",
            }}
          >
            {/* Tetris corners - catty-corner style */}
            <TetrisCorner position="top-left" pointing="outward" variant="catty-corner" className="hidden lg:block" />
            <TetrisCorner position="top-right" pointing="outward" variant="catty-corner" className="hidden lg:block" />
            <TetrisCorner position="bottom-left" pointing="outward" variant="catty-corner" className="hidden lg:block" />
            <TetrisCorner position="bottom-right" pointing="outward" variant="catty-corner" className="hidden lg:block" />

            {/* Left side: Headline */}
            <div style={{ flex: "1.2" }}>
              <h2
                className="m-0 text-[38px] lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.04em]"
                style={{ color: "var(--foreground-color)" }}
              >
                Think. Plan. Build. Verify.
              </h2>
            </div>
            {/* Right side: Description */}
            <div className="flex flex-col gap-5 lg:gap-8" style={{ flex: "1" }}>
              <p
                className="m-0 text-base lg:text-xl leading-relaxed"
                style={{ color: "var(--text-muted-60)" }}
              >
                Anatomia structures AI development through a verified pipeline. Every change scoped, specified, built by constrained agents, and proven against your source code.
              </p>
            </div>
          </header>

          {/* Cell 2: Analysis - Full width */}
          <div
            className="col-span-1 lg:col-span-12 flex flex-col border-b bg-transparent anim-cell-reveal"
            style={{
              borderColor: "var(--border-light)",
              animationDelay: "0.2s",
            }}
          >
            {/* Top description */}
            <div
              className="p-6 lg:p-10 border-b"
              style={{ borderColor: "var(--border-light)" }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-[0.15em] mb-2"
                style={{ color: "var(--text-muted-35)" }}
              >
                ANA READS YOUR CODE
              </div>
              <div
                className="text-lg lg:text-xl font-semibold mb-2"
                style={{ color: "var(--foreground-color)" }}
              >
                Not your README. Your source.
              </div>
              <div className="text-sm lg:text-[15px]" style={{ color: "var(--text-muted-60)" }}>
                Tree-sitter parses functions, imports, patterns, and conventions across TypeScript, Python, JavaScript, Go, and TSX. Every detection traced to a file and line number. Every claim verified against your actual codebase. Context stays current. When your code changes, Ana detects the drift and updates. Your code is the source of truth.
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
              {analysisMetrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={`p-6 lg:p-[40px_26px] flex flex-col items-center justify-center gap-2 lg:gap-4 ${
                    index < 3 ? "border-r" : ""
                  }`}
                  style={{ borderColor: "var(--border-light)" }}
                >
                  <div
                    className="text-[10px] lg:text-xs font-semibold uppercase tracking-[0.1em]"
                    style={{ color: "var(--text-muted-40)" }}
                  >
                    {metric.label}
                  </div>
                  <div
                    className="text-[40px] lg:text-[56px] font-semibold leading-none tracking-[-0.02em] counter-blur"
                    style={{ color: "var(--foreground-color)" }}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cell 3: Generate - Left half */}
          <div
            className="col-span-1 lg:col-span-6 border-b lg:border-r p-6 lg:p-12 bg-transparent anim-cell-reveal"
            style={{
              borderColor: "var(--border-light)",
              animationDelay: "0.3s",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-4"
              style={{ color: "var(--text-muted-35)" }}
            >
              EVERY CHANGE
            </div>
            <div
              className="text-2xl lg:text-4xl font-semibold leading-[1.1] tracking-[-0.02em] mb-4"
              style={{ color: "var(--foreground-color)" }}
            >
              Scoped. Specified. Built. Proven.
            </div>
            <div
              className="text-[15px] lg:text-[17px] leading-[1.65] mb-6 lg:mb-8 max-w-[90%]"
              style={{ color: "var(--text-muted-60)" }}
            >
              Anatomia structures every AI change through a verified pipeline. Four stages that ensure your intent becomes working code with proof.
            </div>
            <ul className="list-none p-0 flex flex-col gap-2.5 lg:gap-3.5">
              {generateFeatures.map((feature, index) => (
                <li
                  key={feature}
                  className={`text-[14px] lg:text-[15px] leading-[1.5] pl-5 lg:pl-6 relative ${
                    index === generateFeatures.length - 1 ? "font-semibold" : ""
                  }`}
                  style={{ color: "var(--text-muted-75)" }}
                >
                  <span className="absolute left-0" style={{ color: "var(--text-muted-40)" }}>
                    →
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Cell 4: Use - Right half */}
          <div
            className="col-span-1 lg:col-span-6 border-b p-6 lg:p-12 bg-transparent anim-cell-reveal"
            style={{
              borderColor: "var(--border-light)",
              animationDelay: "0.35s",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-4"
              style={{ color: "var(--text-muted-35)" }}
            >
              IN YOUR TERMINAL
            </div>
            <div
              className="text-2xl lg:text-4xl font-semibold leading-[1.1] tracking-[-0.02em] mb-4"
              style={{ color: "var(--foreground-color)" }}
            >
              See what Ana sees.
            </div>
            <div
              className="text-[15px] lg:text-[17px] leading-[1.65] mb-6 lg:mb-8 max-w-[90%]"
              style={{ color: "var(--text-muted-60)" }}
            >
              Run ana init to analyze your project. Watch as it detects your stack, patterns, and conventions in real time.
            </div>
            <div
              className="bg-[#1a1a2e] rounded-lg p-5 lg:p-6 font-mono text-sm lg:text-[14px] leading-[1.6]"
              style={{ color: "#ffffff" }}
            >
              <div style={{ color: "#888" }}>$ ana init</div>
              <div className="mt-2" style={{ color: "#888" }}></div>
              <div style={{ color: "#888" }}>Analyzing your project...</div>
              <div className="mt-2" style={{ color: "#888" }}></div>
              <div style={{ color: "#10b981" }}>✓ Framework: Next.js 14 (App Router)</div>
              <div style={{ color: "#10b981" }}>✓ Language: TypeScript (strict)</div>
              <div style={{ color: "#10b981" }}>✓ Database: Prisma → PostgreSQL</div>
              <div style={{ color: "#10b981" }}>✓ Patterns: 12 detected</div>
              <div style={{ color: "#10b981" }}>✓ Conventions: 8 captured</div>
              <div className="mt-2" style={{ color: "#888" }}></div>
              <div style={{ color: "#888" }}>Context generated → .ana/</div>
              <div style={{ color: "#06b6d4" }}>Your AI now knows your project.</div>
            </div>
          </div>

          {/* Cell 5: Learn - Full width */}
          <div
            className="col-span-1 lg:col-span-12 p-6 lg:p-12 border-b flex flex-col lg:flex-row gap-6 lg:gap-10 lg:items-center bg-transparent anim-cell-reveal"
            style={{
              borderColor: "var(--border-light)",
              animationDelay: "0.4s",
            }}
          >
            <div className="lg:flex-[0_0_28%] flex flex-col gap-3 lg:gap-4">
              <div
                className="text-xs font-semibold uppercase tracking-[0.15em]"
                style={{ color: "var(--text-muted-35)" }}
              >
                YOUR SYSTEM
              </div>
              <div
                className="text-2xl lg:text-4xl font-semibold leading-[1.1] tracking-[-0.02em]"
                style={{ color: "var(--foreground-color)" }}
              >
                Configured for how you ship.
              </div>
              <div
                className="text-[15px] lg:text-[17px] leading-[1.65]"
                style={{ color: "var(--text-muted-60)" }}
              >
                Skills, agents, and context work together. Every piece configurable. Every change verified against your actual code.
              </div>
            </div>

            {/* Features grid */}
            <ul
              className="flex-1 grid grid-cols-1 lg:grid-cols-3 m-0 p-0 list-none"
              style={{
                gap: "1px",
                background: "var(--border-light)",
                border: "1px solid var(--border-light)",
              }}
            >
              {systemFeatures.map((feature) => (
                <li
                  key={feature.text}
                  className="m-0 flex items-center p-5 lg:p-8 gap-3"
                  style={{ background: "var(--bg-card)" }}
                >
                  <span
                    className="flex-shrink-0 text-base lg:text-xl"
                    style={{ color: "var(--text-muted-50)" }}
                  >
                    {feature.icon}
                  </span>
                  <span
                    className="text-sm lg:text-[15px] leading-relaxed"
                    style={{ color: "var(--text-muted-75)" }}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cell 6: Compatibility - Full width */}
          <div
            className="col-span-1 lg:col-span-12 p-6 lg:p-[60px] relative flex flex-col gap-6 lg:gap-8 border-b bg-transparent anim-cell-reveal"
            style={{
              borderColor: "var(--border-light)",
              animationDelay: "0.45s",
            }}
          >
            {/* Card background overlay */}
            <div className="absolute inset-px z-[-1]" style={{ background: "var(--bg-card)" }} />

            {/* Tetris chevron */}
            <div className="hidden lg:block absolute top-[60px] right-[60px] w-[34px] h-[44px]">
              <svg
                width="78"
                height="103"
                viewBox="0 0 78 103"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                aria-hidden="true"
                style={{ fill: "var(--logo-fill)" }}
              >
                <path
                  d="M3.61947e-07 77.25L25.75 51.5L3.61947e-07 25.75L25.75 -7.23894e-07L51.5 25.75L77.25 51.5L25.75 103L3.61947e-07 77.25Z"
                />
              </svg>
            </div>

            <div className="flex flex-col gap-3 lg:gap-4 max-w-full lg:max-w-[65%]">
              <div
                className="text-2xl lg:text-4xl font-semibold leading-[1.1] tracking-[-0.02em]"
                style={{ color: "var(--foreground-color)" }}
              >
                Works with your tools.
              </div>
              <div
                className="text-[15px] lg:text-[17px] leading-[1.65]"
                style={{ color: "var(--text-muted-60)" }}
              >
                Standard markdown. Git-tracked. No vendor lock-in. Claude Code gets native pipeline integration. Any AI tool that reads markdown gets the intelligence.
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-[60px] items-start">
              <ul className="list-none p-0 m-0 flex flex-col gap-2.5 lg:gap-3.5 flex-[0_0_auto]">
                {compatibilityBullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="text-[14px] lg:text-[15px] leading-[1.5] pl-5 lg:pl-6 relative"
                    style={{ color: "var(--text-muted-75)" }}
                  >
                    <span className="absolute left-0" style={{ color: "var(--text-muted-40)" }}>
                      →
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <IndustryTicker />
            </div>

            <div
              className="text-sm lg:text-[15px] text-center mt-6 lg:mt-8"
              style={{ color: "var(--text-muted-50)" }}
            >
              Open source. MIT License. Every line on GitHub.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
