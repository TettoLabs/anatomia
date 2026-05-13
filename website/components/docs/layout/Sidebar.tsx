"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { source } from "@/lib/source";

type TreeNode = (typeof source.pageTree)["children"][number];

/**
 * Sidebar — renders the Fumadocs page tree.
 * Folders (Concepts, Guides) render as collapsible groups, default open.
 * Styling matches the supermock sidebar spec.
 */
export function Sidebar() {
  const pathname = usePathname();
  const tree = source.pageTree;

  return (
    <aside
      className="docs-sidebar"
      style={{
        position: "sticky",
        top: "58px",
        height: "calc(100vh - 58px)",
        width: "248px",
        flexShrink: 0,
        overflowY: "auto",
        borderRight: "1px solid var(--hairline)",
        padding: "22px 14px 30px",
      }}
    >
      <nav aria-label="Sidebar">
        {tree.children.map((node, i) => (
          <SidebarNode key={i} node={node} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarNode({
  node,
  pathname,
}: {
  node: TreeNode;
  pathname: string;
}) {
  if (node.type === "separator") {
    return (
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ink-45)",
          padding: "4px 10px 8px",
          marginTop: "18px",
        }}
      >
        {node.name}
      </div>
    );
  }

  if (node.type === "page") {
    const active = pathname === node.url;
    return (
      <Link
        href={node.url}
        className="sidebar-link"
        style={{
          display: "block",
          padding: "5px 10px",
          borderRadius: "var(--radius-sm)",
          fontSize: "13px",
          color: active ? "var(--fg)" : "var(--ink-60)",
          background: active ? "var(--brand-soft)" : "transparent",
          fontWeight: active ? 500 : 400,
          textDecoration: "none",
          transition: "background 0.12s, color 0.12s",
        }}
        aria-current={active ? "page" : undefined}
      >
        {node.name}
      </Link>
    );
  }

  if (node.type === "folder") {
    return <FolderNode node={node} pathname={pathname} />;
  }

  return null;
}

function FolderNode({
  node,
  pathname,
}: {
  node: Extract<TreeNode, { type: "folder" }>;
  pathname: string;
}) {
  const isFeaturedProofs =
    typeof node.name === "string" && node.name.includes("Featured");
  const [open, setOpen] = useState(!isFeaturedProofs);

  return (
    <div style={{ marginBottom: "0px" }}>
      {/* Folder toggle — styled like a group label with a chevron */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: "4px 10px 8px",
          marginTop: "18px",
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ink-45)",
          fontFamily: "inherit",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{
            transition: "transform 0.15s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <path d="M3 2L7 5L3 8" />
        </svg>
        <span>{node.name}</span>
      </button>
      {open && (
        <div
          style={{
            marginLeft: "8px",
            borderLeft: "1px solid var(--hairline)",
            paddingLeft: "4px",
          }}
        >
          {node.children.map((child, i) => (
            <SidebarNode key={i} node={child} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}
