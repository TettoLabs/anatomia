"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

/**
 * Button component with all 6 states:
 * 1. Default - Resting state
 * 2. Hover - Mouse over (lift + shadow)
 * 3. Focus - Keyboard focus (outline ring)
 * 4. Active - Press/click (scale down)
 * 5. Disabled - Unavailable (opacity + cursor)
 * 6. Loading - Processing (spinner + disabled)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    // Size classes
    const sizeClasses = {
      sm: "px-4 py-2 text-sm min-w-[80px]",
      md: "px-6 py-3 text-[15px] min-w-[120px]",
      lg: "px-8 py-4 text-base min-w-[160px]",
    };

    // Base classes for all buttons
    const baseClasses = `
      relative inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200 ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      active:scale-[0.98] active:transition-all active:duration-75
    `;

    // Variant-specific classes and styles
    const variantStyles = {
      primary: {
        className: `
          hover:-translate-y-[2px] hover:shadow-lg
          focus-visible:ring-[var(--btn-primary-bg)]
        `,
        style: {
          background: "var(--btn-primary-bg)",
          color: "var(--btn-primary-text)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        },
      },
      secondary: {
        className: `
          hover:-translate-y-[1px] hover:shadow-md
          focus-visible:ring-[var(--btn-secondary-border)]
        `,
        style: {
          background: "var(--btn-secondary-bg)",
          border: "1px solid var(--btn-secondary-border)",
          color: "var(--btn-secondary-text)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        },
      },
      ghost: {
        className: `
          hover:bg-[var(--border-light)]
          focus-visible:ring-[var(--foreground-color)]
        `,
        style: {
          background: "transparent",
          color: "var(--foreground-color)",
        },
      },
    };

    const { className: variantClassName, style: variantStyle } = variantStyles[variant];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          ${baseClasses}
          ${sizeClasses[size]}
          ${variantClassName}
          ${className}
        `}
        style={variantStyle}
        {...props}
      >
        {/* Left icon (hidden during loading) */}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}

        {/* Button text (hidden when loading) */}
        <span className={isLoading ? "opacity-0" : ""}>
          {children}
        </span>

        {/* Loading overlay (single spinner) */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        )}

        {/* Right icon (hidden during loading) */}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Link styled as button (for navigation)
 */
export interface ButtonLinkProps {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  external?: boolean;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  external = false,
}: ButtonLinkProps) {
  // Size classes
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-[15px]",
    lg: "px-8 py-4 text-base",
  };

  // Base classes
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg no-underline
    transition-all duration-200 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    active:scale-[0.98] active:transition-all active:duration-75
  `;

  // Variant styles
  const variantStyles = {
    primary: {
      className: "hover:-translate-y-[2px] hover:shadow-lg focus-visible:ring-[var(--btn-primary-bg)]",
      style: {
        background: "var(--btn-primary-bg)",
        color: "var(--btn-primary-text)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      },
    },
    secondary: {
      className: "hover:-translate-y-[1px] hover:shadow-md focus-visible:ring-[var(--btn-secondary-border)]",
      style: {
        background: "var(--btn-secondary-bg)",
        border: "1px solid var(--btn-secondary-border)",
        color: "var(--btn-secondary-text)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      },
    },
    ghost: {
      className: "hover:bg-[var(--border-light)] focus-visible:ring-[var(--foreground-color)]",
      style: {
        background: "transparent",
        color: "var(--foreground-color)",
      },
    },
  };

  const { className: variantClassName, style: variantStyle } = variantStyles[variant];

  return (
    <a
      href={href}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClassName} ${className}`}
      style={variantStyle}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
