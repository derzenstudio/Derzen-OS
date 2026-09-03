const fs = require('fs');
let code = fs.readFileSync('src/components/ui.tsx', 'utf8');

const drawerReplacement = `export function Drawer({ open, onClose, title, children, width = 380 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; width?: number }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (wrapperRef.current) wrapperRef.current.style.pointerEvents = "auto";
      if (overlayRef.current) {
        anime({
          targets: overlayRef.current,
          opacity: [0, 1],
          duration: 300,
          easing: 'easeOutSine'
        });
      }
      if (contentRef.current) {
        anime({
          targets: contentRef.current,
          translateX: ['100%', '0%'],
          duration: 500,
          easing: 'easeOutExpo'
        });
      }
    } else {
      if (overlayRef.current) {
        anime({
          targets: overlayRef.current,
          opacity: [1, 0],
          duration: 300,
          easing: 'easeInSine'
        });
      }
      if (contentRef.current) {
        anime({
          targets: contentRef.current,
          translateX: ['0%', '100%'],
          duration: 400,
          easing: 'easeInExpo',
          complete: () => {
            if (wrapperRef.current && !open) wrapperRef.current.style.pointerEvents = "none";
          }
        });
      }
    }
  }, [open]);

  return (
    <div ref={wrapperRef} className="fixed inset-0 z-[70] pointer-events-none" aria-hidden={!open}>
      <div ref={overlayRef} className="absolute inset-0 bg-pine-950/30 opacity-0" onMouseDown={onClose} />
      <aside ref={contentRef} className="absolute right-0 top-0 h-full border-l border-line bg-paper shadow-2xl flex flex-col translate-x-full" style={{ width }} role="complementary">
        {title && (
          <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3">
            <div className="font-display text-[14px] font-bold text-ink">{title}</div>
            <IconBtn label="Close panel" name="x" onClick={onClose} />
          </header>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}`;

code = code.replace(/export function Drawer\([\s\S]*?\n\}\n/, drawerReplacement + '\n');
fs.writeFileSync('src/components/ui.tsx', code);
