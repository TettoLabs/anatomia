"use client";

import { useState, useEffect } from "react";

const industries = [
  { text: "HVAC contractors", color: "#ff2e63", glow: "rgba(255, 46, 99, 0.5)" },
  { text: "law firms", color: "#4169ff", glow: "rgba(65, 105, 255, 0.5)" },
  { text: "roofing companies", color: "#ff9f1c", glow: "rgba(255, 159, 28, 0.5)" },
  { text: "dental practices", color: "#2dce89", glow: "rgba(45, 206, 137, 0.5)" },
  { text: "plumbers", color: "#00d4ff", glow: "rgba(0, 212, 255, 0.5)" },
  { text: "electricians", color: "#ffd700", glow: "rgba(255, 215, 0, 0.5)" },
  { text: "landscapers", color: "#10b981", glow: "rgba(16, 185, 129, 0.5)" },
  { text: "home service professionals", color: "#a855f7", glow: "rgba(168, 85, 247, 0.5)" },
];

export function IndustryRotator() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % industries.length);
        setIsFading(false);
      }, 500);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const industry = industries[currentIndex];

  return (
    <span
      className="inline transition-all duration-500 ease-in-out"
      style={{
        color: industry.color,
        filter: `drop-shadow(0 0 12px ${industry.glow})`,
        opacity: isFading ? 0 : 1,
      }}
    >
      {industry.text}
    </span>
  );
}
