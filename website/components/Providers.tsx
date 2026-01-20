"use client";

import { ThemeProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function Providers({ children }: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
      themes={["dark", "light"]}
    >
      {children}
    </ThemeProvider>
  );
}
