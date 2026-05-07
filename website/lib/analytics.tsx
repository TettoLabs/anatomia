"use client";

/**
 * lib/analytics.tsx
 * PostHog analytics provider. Zero JS overhead when unconfigured.
 *
 * When NEXT_PUBLIC_POSTHOG_KEY is absent, renders {children} with no
 * side effects — no dynamic import, no PostHog initialization.
 * When present, loads posthog-js dynamically inside useEffect to keep
 * it out of the initial bundle.
 */

import { useEffect } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Analytics provider that initializes PostHog when configured.
 * Renders {children} always — PostHog init is a side effect, not a wrapper.
 * @param props - component props
 * @param props.children - child elements to render
 * @returns children unchanged
 */
export function AnalyticsProvider({
  children,
}: {
  children?: React.ReactNode;
} = {}): React.ReactNode {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: "https://us.i.posthog.com",
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
      });
    });
  }, []);

  return children ?? null;
}
