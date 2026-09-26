import { fauxify } from '../lib/art';

/** Faux-Soviet lettering for decoration; screen readers get the plain English. */
export default function Faux({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <span aria-hidden="true">{fauxify(text)}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
