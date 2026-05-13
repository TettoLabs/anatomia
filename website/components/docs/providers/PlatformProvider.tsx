"use client";

/**
 * PlatformProvider — platform selection with cookie persistence.
 * Uses useSyncExternalStore (same pattern as lib/theme.ts) to avoid
 * the setState-in-effect lint violation. The cookie is the external store.
 */

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  useMemo,
} from "react";
import type { ReactNode } from "react";

export type Platform = "claude-code" | "cursor" | "codex" | "windsurf" | "copilot" | "cline";

interface PlatformContextValue {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

const PlatformContext = createContext<PlatformContextValue>({
  platform: "claude-code",
  setPlatform: () => {},
});

const COOKIE_KEY = "ana-docs-platform";
const DEFAULT_PLATFORM: Platform = "claude-code";
const CHANGE_EVENT = "ana-docs-platform-change";

/** Read platform from cookie. */
function getSnapshot(): Platform {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return (match?.[1] as Platform) ?? DEFAULT_PLATFORM;
}

/** Server snapshot — always default (no hydration mismatch). */
function getServerSnapshot(): Platform {
  return DEFAULT_PLATFORM;
}

/** Subscribe to platform changes (same-tab custom event). */
function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Write cookie and dispatch change event. */
function writePlatform(value: Platform): void {
  document.cookie = `${COOKIE_KEY}=${value};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const platform = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPlatform = useCallback((p: Platform) => {
    writePlatform(p);
  }, []);

  const value = useMemo(() => ({ platform, setPlatform }), [platform, setPlatform]);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext);
}
