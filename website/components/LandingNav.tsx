"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
];

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>('light');
  const pathname = usePathname();

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    // Read current theme from html element
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    setCurrentTheme(theme);

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setCurrentTheme(newTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[150] px-4 lg:px-10 py-4 lg:py-5 flex justify-between items-center backdrop-blur-[10px] border-b"
      style={{
        background: "var(--nav-bg)",
        borderColor: "var(--border-light)",
      }}
    >
      {/* Logo - Favicon icon only */}
      <Link href="/" className="flex items-center no-underline" aria-label="Anatomia home">
        <img
          src="/favicon.svg"
          alt="Anatomia"
          className="w-8 h-8 lg:w-9 lg:h-9"
        />
      </Link>

      {/* Desktop nav links + theme toggle + CTA */}
      <div className="hidden md:flex gap-8 items-center">
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium no-underline transition-colors duration-200 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-foreground/30 rounded-md px-2 py-1 relative"
              style={{
                color: active ? "var(--foreground-color)" : "var(--text-muted-60)",
                fontWeight: active ? 600 : 500,
              }}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
              {/* Active underline indicator */}
              {active && (
                <span
                  className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: "var(--foreground-color)" }}
                />
              )}
            </Link>
          );
        })}
        <ThemeToggle />
        <Link
          href="#"
          className="px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90 no-underline"
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          Get Started
        </Link>
      </div>

      {/* Mobile: theme toggle + hamburger */}
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <button
          className="p-2 hover:opacity-80 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/30"
          style={{ color: "var(--text-muted-60)" }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu - full screen overlay rendered via portal to escape stacking context */}
      {isOpen && mounted && createPortal(
        <div
          data-theme={currentTheme}
          className="md:hidden fixed inset-0 z-[9999] flex flex-col"
          style={{
            backgroundColor: currentTheme === 'dark' ? '#0a0a14' : '#fafafa',
          }}
        >
          {/* Header with logo and close button */}
          <div className="flex justify-between items-center px-4 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <Link href="/" className="flex items-center no-underline" onClick={() => setIsOpen(false)} aria-label="Anatomia home">
              <img
                src="/favicon.svg"
                alt="Anatomia"
                className="w-8 h-8"
              />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:opacity-80 rounded-lg transition-colors"
                style={{ color: "var(--text-muted-60)" }}
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation links - top aligned */}
          <div className="flex-1 flex flex-col items-start pt-8 px-8 gap-4">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-3xl font-bold no-underline py-3 w-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    color: active ? "var(--foreground-color)" : "var(--text-muted-60)",
                  }}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
