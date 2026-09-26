import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

export function PageHeader({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      {kicker && <p className="kicker mb-2">{kicker}</p>}
      <h1 className="font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-prose text-fg-2">{children}</div>}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`panel p-5 sm:p-6 ${className}`}>{children}</div>;
}

type Tone = 'error' | 'success' | 'info';

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const border = tone === 'error' ? 'border-red' : tone === 'success' ? 'border-ok' : 'border-teal';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-5 border-l-4 ${border} bg-casing px-4 py-3 text-sm leading-relaxed text-fg`}
    >
      {children}
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Field({ label, hint, error, ...input }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block font-display text-xs uppercase tracking-widest text-fg-2">
        {label}
      </label>
      <input
        id={id}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...input}
      />
      {hint && (
        <p id={hintId} className="mt-2 text-sm text-fg-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-text">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function TextArea({ label, ...rest }: TextAreaProps) {
  const id = useId();
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block font-display text-xs uppercase tracking-widest text-fg-2">
        {label}
      </label>
      <textarea id={id} className="field-input py-3" rows={4} {...rest} />
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <p role="status" className="kicker animate-pulse py-10 text-center">
      {label}…
    </p>
  );
}
