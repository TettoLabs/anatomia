import { loader } from "fumadocs-core/source";
import { docs } from "collections/server";

/**
 * Page tree transformer — injects Overview at the top, plus Reference
 * and Proof Chain sections at the bottom.
 */
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  pageTree: {
    transformers: [
      {
        root(node) {
          // Inject Overview at the very top (before MDX-generated entries)
          node.children.unshift(
            { type: "page", name: "Overview", url: "/docs" },
          );

          node.children.push(
            // ── Reference ──
            { type: "separator", name: "Reference" },
            { type: "page", name: "CLI Commands", url: "/docs/reference/cli-commands" },
            { type: "page", name: "Agent Templates", url: "/docs/reference/agent-templates" },
            { type: "page", name: "Skill Files", url: "/docs/reference/skill-files" },
            { type: "page", name: "Context Files", url: "/docs/reference/context-files" },

            // ── Proof Chain ──
            { type: "separator", name: "Proof Chain" },
            { type: "page", name: "Browse All", url: "/docs/proof" },
            {
              type: "folder",
              name: "Featured Proofs",
              defaultOpen: false,
              children: [
                { type: "page", name: "security-hardening", url: "/docs/proof/security-hardening" },
                { type: "page", name: "proof-promote", url: "/docs/proof/proof-promote" },
                { type: "page", name: "worktree-isolation", url: "/docs/proof/worktree-isolation" },
              ],
            },
          );
          return node;
        },
      },
    ],
  },
});
