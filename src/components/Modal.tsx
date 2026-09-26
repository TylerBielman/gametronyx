import { useEffect, useRef, type ReactNode } from 'react';

/** Small accessible modal: Escape closes, focus moves in and back out. */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button, input, a')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-display text-xl uppercase tracking-wide">{title}</h2>
        {children}
      </div>
    </div>
  );
}
