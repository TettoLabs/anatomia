"use client";

const aiTools = [
  { name: "Claude Code", bg: "rgba(249, 115, 22, 0.1)", color: "#f97316" },
  { name: "Cursor", bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" },
  { name: "Windsurf", bg: "rgba(168, 85, 247, 0.1)", color: "#a855f7" },
  { name: "Any AI Tool", bg: "rgba(124, 58, 237, 0.1)", color: "#7c3aed" },
];

export function IndustryTicker() {
  // Duplicate for seamless loop
  const allTools = [...aiTools, ...aiTools];

  return (
    <div className="overflow-hidden relative flex-1 min-w-0">
      <div className="flex gap-12 anim-ticker will-change-transform">
        {allTools.map((tool, index) => (
          <span
            key={index}
            className="text-sm font-medium whitespace-nowrap flex-shrink-0 px-5 py-2 rounded-lg"
            style={{ background: tool.bg, color: tool.color }}
          >
            {tool.name}
          </span>
        ))}
      </div>
    </div>
  );
}
