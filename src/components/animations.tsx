import { useEffect, useRef, type ReactNode } from "react";

import { cx } from "../lib/format";
import { animate, stagger } from "animejs";

export function Reveal({ children, className, delay = 0, direction = "up", distance = 30 }: { children: ReactNode; className?: string; delay?: number; direction?: "up" | "down" | "left" | "right" | "none"; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const dy = direction === "up" ? distance : direction === "down" ? -distance : 0;
          const dx = direction === "left" ? distance : direction === "right" ? -distance : 0;
          
          animate(el, {
            translateY: dy ? [dy, 0] : 0,
            translateX: dx ? [dx, 0] : 0,
            opacity: [0, 1],
            duration: 800,
            delay: delay,
            easing: "easeOutExpo"
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction, distance]);
  
  return (
    <div ref={ref} className={cx("opacity-0", className)}>
      {children}
    </div>
  );
}

export function SplitText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    const chars = ref.current.querySelectorAll('.char');
    animate(chars, {
      translateY: [20, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 800,
      delay: stagger(20, { start: delay })
    });
  }, [delay, text]);
  
  return (
    <span ref={ref} className={cx("inline-block", className)}>
      {text.split("").map((char, i) => (
        <span key={i} className="char inline-block opacity-0" style={{ whiteSpace: char === " " ? "pre" : "normal" }}>
          {char}
        </span>
      ))}
    </span>
  );
}

export function StaggerGroup({ children, className, delay = 0, staggerDelay = 100, direction = "up", distance = 20 }: { children: ReactNode[]; className?: string; delay?: number; staggerDelay?: number; direction?: "up" | "down" | "left" | "right" | "none"; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    const items = ref.current.children;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const dy = direction === "up" ? distance : direction === "down" ? -distance : 0;
          const dx = direction === "left" ? distance : direction === "right" ? -distance : 0;
          
          animate(items, {
            translateY: dy ? [dy, 0] : 0,
            translateX: dx ? [dx, 0] : 0,
            opacity: [0, 1],
            easing: "easeOutExpo",
            duration: 800,
            delay: stagger(staggerDelay, { start: delay })
          });
          observer.unobserve(ref.current!);
        }
      },
      { threshold: 0.1 }
    );
    
    Array.from(items).forEach((el: any) => el.style.opacity = '0');
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay, staggerDelay, direction, distance]);
  
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
