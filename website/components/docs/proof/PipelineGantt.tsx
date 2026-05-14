import type { ProofTiming } from "@/lib/docs-data/types";

interface PipelineGanttProps {
  timing: ProofTiming;
  className?: string;
}

const STAGES: { key: keyof Omit<ProofTiming, "totalMinutes" | "segments">; label: string }[] = [
  { key: "think", label: "Think" },
  { key: "plan", label: "Plan" },
  { key: "build", label: "Build" },
  { key: "verify", label: "Verify" },
];

/** Progressive opacity from 0.55 (first bar) to 1.0 (last bar). */
function progressiveOpacity(index: number, count: number): number {
  if (count <= 1) return 1.0;
  return 0.55 + (index / (count - 1)) * 0.45;
}

export interface GanttBar {
  label: string;
  minutes: number;
  opacity: number;
  leftPct: number;
  widthPct: number;
}

/**
 * Build the bar array for the Gantt chart.
 *
 * When segments exist, renders per-phase bars (Think, Plan, Build 1, Verify 1, ...).
 * When absent, falls back to the 4-bar layout (Think, Plan, Build, Verify).
 *
 * @param timing - ProofTiming with optional segments
 * @returns Array of GanttBar objects describing each row
 */
export function buildGanttBars(timing: ProofTiming): GanttBar[] {
  const total = timing.totalMinutes;
  if (total === 0) return [];

  if (timing.segments && timing.segments.length > 0) {
    // Multi-phase: build bars from segments
    // Compute left positions from cumulative minutes, derive widths as gaps between
    // adjacent positions. The last bar always reaches 100% — no rounding gaps.
    const bars: GanttBar[] = [];
    let cumulative = 0;
    const lefts: number[] = [];

    for (const seg of timing.segments) {
      lefts.push(total > 0 ? (cumulative / total) * 100 : 0);
      cumulative += seg.minutes;
    }
    lefts.push(100); // sentinel — right edge of last bar

    for (let i = 0; i < timing.segments.length; i++) {
      const seg = timing.segments[i];
      const label = seg.phase != null
        ? `${seg.stage.charAt(0).toUpperCase() + seg.stage.slice(1)} ${seg.phase}`
        : seg.stage.charAt(0).toUpperCase() + seg.stage.slice(1);
      const leftPct = lefts[i];
      const widthPct = seg.minutes === 0 ? 2 : lefts[i + 1] - lefts[i];

      bars.push({
        label,
        minutes: seg.minutes,
        opacity: progressiveOpacity(i, timing.segments.length),
        leftPct,
        widthPct,
      });
    }

    return bars;
  }

  // Fallback: 4-bar layout from flat fields
  // Same gap-free math as multi-phase: derive widths from adjacent left positions
  const bars: GanttBar[] = [];
  let cumulative = 0;
  const lefts: number[] = [];

  for (const stage of STAGES) {
    lefts.push(total > 0 ? (cumulative / total) * 100 : 0);
    cumulative += timing[stage.key];
  }
  lefts.push(100);

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const value = timing[stage.key];
    const leftPct = lefts[i];
    const widthPct = value === 0 ? 2 : lefts[i + 1] - lefts[i];

    bars.push({
      label: stage.label,
      minutes: value,
      opacity: progressiveOpacity(i, STAGES.length),
      leftPct,
      widthPct,
    });
  }

  return bars;
}

export function PipelineGantt({ timing, className }: PipelineGanttProps) {
  if (timing.totalMinutes === 0) {
    return (
      <div className={className} style={{
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        color: "var(--ink-40)",
        margin: "14px 0 8px",
      }}>
        No timing data
      </div>
    );
  }

  const bars = buildGanttBars(timing);

  return (
    <div className={className} style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      margin: "14px 0 8px",
      fontFamily: "var(--font-mono)",
      fontSize: "11.5px",
    }}>
      {bars.map((bar, i) => (
        <div key={`${bar.label}-${i}`} style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr 50px",
          gap: "14px",
          alignItems: "center",
        }}>
          <span style={{
            color: "var(--ink-60)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: "10.5px",
          }}>
            {bar.label}
          </span>
          <div style={{
            height: "8px",
            background: "var(--code-bg)",
            borderRadius: "4px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${bar.leftPct}%`,
              width: `${bar.widthPct}%`,
              background: "var(--color-brand)",
              borderRadius: "4px",
              opacity: bar.opacity,
            }} />
          </div>
          <span style={{
            color: "var(--ink-60)",
            textAlign: "right",
          }}>
            {bar.minutes}m
          </span>
        </div>
      ))}
    </div>
  );
}
