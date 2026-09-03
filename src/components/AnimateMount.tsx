import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

export function AnimateMount({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      animate(ref.current, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 800,
        delay,
        ease: 'outExpo'
      });
    }
  }, [delay]);

  return <div ref={ref} style={{ opacity: 0 }} className={className}>{children}</div>;
}

export function StaggerChildren({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      const targets = Array.from(ref.current.children);
      animate(targets, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 800,
        delay: stagger(50),
        ease: 'outExpo'
      });
    }
  }, []);

  return <div ref={ref} className={`stagger-parent h-full w-full ${className}`}>
    <style>{`.stagger-parent > * { opacity: 0; }`}</style>
    {children}
  </div>;
}
