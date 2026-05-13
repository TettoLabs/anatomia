"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";

/**
 * MobileSidebarToggle — hamburger button + slide-over sidebar for mobile.
 * Only renders the button at ≤880px. Sidebar overlays the content.
 */
export function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a[href]")) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", handleClick);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("click", handleClick);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button — only visible at ≤880px via CSS */}
      <button
        className="docs-mobile-hamburger"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        style={{
          display: "none", /* CSS shows it at ≤880px */
          alignItems: "center",
          justifyContent: "center",
          width: "34px",
          height: "34px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: "none",
          color: "var(--ink-60)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Overlay backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: "58px",
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 40,
          }}
        />
      )}

      {/* Slide-over sidebar */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: "58px",
            left: 0,
            bottom: 0,
            zIndex: 50,
            width: "280px",
            background: "var(--bg)",
            borderRight: "1px solid var(--hairline)",
            overflowY: "auto",
            boxShadow: "var(--shadow)",
          }}
        >
          <Sidebar />
        </div>
      )}
    </>
  );
}
