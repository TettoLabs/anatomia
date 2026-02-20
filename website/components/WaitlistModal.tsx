'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';

type WaitlistProduct = 'anatomia' | 'webops' | 'inspector' | 'both';

interface WaitlistModalProps {
  product: WaitlistProduct;
  source?: string;
  trigger: React.ReactNode;
}

const productInfo: Record<WaitlistProduct, { name: string; tagline: string; description: string }> = {
  anatomia: {
    name: 'Anatomia',
    tagline: 'Beta Week 7',
    description: 'Auto-generated AI context for your codebase. Be among the first to try pattern detection and .ana/ folder generation.',
  },
  inspector: {
    name: 'Inspector',
    tagline: 'Coming Early 2026',
    description: 'Continuous website monitoring, competitor tracking, and AI search visibility. Get instant alerts when something needs attention.',
  },
  webops: {
    name: 'WebOps',
    tagline: 'Coming Soon',
    description: 'AI-powered website operations that keep your site fast, secure, and always up-to-date.',
  },
  both: {
    name: 'WebOps + Inspector',
    tagline: 'The Complete Package',
    description: 'Full website management with continuous monitoring and optimization.',
  },
};

export function WaitlistModal({ product, source = 'website', trigger }: WaitlistModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { theme } = useTheme();
  const info = productInfo[product];

  const isDark = theme === 'dark';

  // Lock body scroll when modal is open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    // Demo version - just show success without API call
    setTimeout(() => {
      setStatus('success');
      setMessage("You're on the list!");
      setEmail('');
    }, 800);
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/80"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border"
              style={{
                backgroundColor: isDark ? '#161A25' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:bg-white/10 group"
                style={{ color: 'var(--text-muted-40)' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-110"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="p-8 pt-10">
                {status === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <div className="text-5xl mb-4">🎉</div>
                    <h2
                      className="text-2xl font-bold mb-2"
                      style={{ color: 'var(--foreground-color)' }}
                    >
                      {message}
                    </h2>
                    <p
                      className="text-sm mb-6"
                      style={{ color: 'var(--text-muted-60)' }}
                    >
                      We&apos;ll email you when {info.name} beta launches.
                    </p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-6 py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                      style={{
                        backgroundColor: '#0a0a14',
                        color: '#ffffff'
                      }}
                    >
                      Got it
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="text-center mb-8">
                      <div
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3"
                        style={{
                          backgroundColor: '#0a0a14',
                          color: '#ffffff',
                          opacity: 0.9
                        }}
                      >
                        {info.tagline}
                      </div>
                      <h2
                        className="text-2xl font-bold mb-3"
                        style={{ color: 'var(--foreground-color)' }}
                      >
                        Get Early Access to {info.name}
                      </h2>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--text-muted-60)' }}
                      >
                        {info.description}
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          disabled={status === 'loading'}
                          className="w-full px-4 py-3.5 rounded-lg border-2 transition-all focus:outline-none disabled:opacity-50"
                          style={{
                            backgroundColor: isDark ? '#0d0d1a' : '#f5f5f5',
                            borderColor: status === 'error' ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                            color: isDark ? '#ffffff' : '#0a0a14',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#0a0a14';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = status === 'error' ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
                          }}
                        />
                        {status === 'error' && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -bottom-5 left-0 text-xs"
                            style={{ color: '#ef4444' }}
                          >
                            {message}
                          </motion.p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={status === 'loading' || !email}
                        className="w-full py-3.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                        style={{
                          backgroundColor: '#0a0a14',
                          color: '#ffffff',
                        }}
                      >
                        {status === 'loading' ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Joining...
                          </span>
                        ) : (
                          'Join the Waitlist'
                        )}
                      </button>
                    </form>

                    {/* Footer */}
                    <p
                      className="text-xs text-center mt-6"
                      style={{ color: 'var(--text-muted-40)' }}
                    >
                      🔒 No spam, ever. Unsubscribe anytime.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default WaitlistModal;
