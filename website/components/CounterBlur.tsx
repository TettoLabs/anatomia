"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CounterBlurProps {
  finalValue: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Counter animation with blur effect
 * Fast random numbers → settle → final value
 */
export function CounterBlur({
  finalValue,
  duration = 1200,
  className = "",
  style,
}: CounterBlurProps) {
  const [displayValue, setDisplayValue] = useState(finalValue);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  // Wait for hydration to complete before setting up observers
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const animateCounter = useCallback(() => {
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps - 3) {
        // Fast random blur phase
        setDisplayValue(Math.floor(Math.random() * 50 + 40));
      } else if (currentStep < steps) {
        // Quick settle phase
        setDisplayValue(Math.floor(Math.random() * 5 + finalValue - 2));
      } else {
        // Final value
        setDisplayValue(finalValue);
        clearInterval(interval);
      }
      currentStep++;
    }, stepDuration);
  }, [duration, finalValue]);

  useEffect(() => {
    // Don't set up observer until after hydration
    if (!isMounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isMounted, hasAnimated, animateCounter]);

  return (
    <span ref={elementRef} className={className} style={style}>
      {displayValue}
    </span>
  );
}
