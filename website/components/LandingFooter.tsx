import Link from "next/link";

const footerLinks = [
  { href: "https://github.com/TettoLabs/anatomia#readme", label: "Docs" },
  { href: "https://github.com/TettoLabs/anatomia", label: "GitHub" },
];

export function LandingFooter() {
  return (
    <footer
      className="relative z-[15] py-12 lg:py-20 px-6 lg:px-10 border-t"
      style={{
        background: "var(--footer-bg)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Logo and license */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center no-underline" aria-label="Anatomia home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.svg"
              alt="Anatomia"
              className="w-7 h-7"
            />
          </Link>
          <span className="text-sm" style={{ color: "var(--text-muted-50)" }}>MIT License</span>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-8 justify-center">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm no-underline transition-colors duration-200 hover:opacity-80"
              style={{ color: "var(--text-muted-60)" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
