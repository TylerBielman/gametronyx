import { useState } from 'react';
import { Field, Notice, Panel, Spinner } from '../../components/ui';
import { admin, shortDate, type InviteCode } from '../../lib/adminApi';
import { useAction, useAdmin } from './useAdmin';

function Copy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="font-mono text-xs text-gold underline"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

const STATUS: Record<InviteCode['status'], string> = {
  unused: 'unused',
  redeemed: 'used',
  revoked: 'revoked',
  master: 'MASTER',
  multi_use: 'multi-use',
};

export default function Codes() {
  const { data, error, reload, token } = useAdmin((t) => admin.codes(t));
  const { busy, note, run } = useAction();
  const [count, setCount] = useState(1);
  const [codeNote, setCodeNote] = useState('');
  const [fresh, setFresh] = useState<InviteCode[]>([]);
  const [newMaster, setNewMaster] = useState('');
  const [filter, setFilter] = useState<'all' | 'unused'>('unused');
  const master = data?.find((c) => c.status === 'master');
  const listed = (data ?? []).filter((c) => c.status !== 'master' && (filter === 'all' || c.status === 'unused'));

  return (
    <>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Panel>
          <h2 className="mb-2 font-display text-lg uppercase tracking-wide">Master code</h2>
          <p className="mb-4 text-sm text-[var(--bone-2)]">Always works, for any number of people, on Gametronyx and No Easy Way Up.</p>
          <p className="mb-4 flex items-center gap-3 font-mono text-xl tracking-widest text-gold">
            {master?.code ?? '—'} {master && <Copy text={master.code} />}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!token || !window.confirm('Retire the current master code? It stops working immediately.')) return;
              run(() => admin.rotateMaster(token, newMaster.trim()), 'Master code rotated.').then((ok) => ok && (setNewMaster(''), reload()));
            }}
          >
            <Field label="New master (blank = random)" value={newMaster} onChange={(e) => setNewMaster(e.target.value.toUpperCase())} autoComplete="off" />
            <button type="submit" className="btn ghost" disabled={busy}>
              Rotate
            </button>
          </form>
        </Panel>
        <Panel>
          <h2 className="mb-2 font-display text-lg uppercase tracking-wide">One-off codes</h2>
          <p className="mb-4 text-sm text-[var(--bone-2)]">Each works once and never expires.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!token) return;
              run(async () => {
                setFresh(await admin.mint(token, count, codeNote.trim()));
              }, 'Minted.').then((ok) => ok && reload());
            }}
          >
            <Field label="How many" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            <Field label="Note (who they're for)" value={codeNote} onChange={(e) => setCodeNote(e.target.value)} maxLength={200} />
            <button type="submit" className="btn primary" disabled={busy || count < 1}>
              Mint codes
            </button>
          </form>
          {fresh.length > 0 && (
            <ul className="mt-4 space-y-1 font-mono">
              {fresh.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  {c.code} <Copy text={c.code} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span className="font-display text-xs uppercase tracking-widest text-bone-2">Show</span>
        {(['unused', 'all'] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? 'font-semibold text-gold' : 'text-bone underline'} onClick={() => setFilter(f)}>
            {f === 'unused' ? 'Unused' : 'All'}
          </button>
        ))}
      </div>
      {data === null ? (
        <Spinner />
      ) : (
        <ul className="divide-y divide-ink-3 border border-ink-3">
          {listed.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <span className="font-mono text-base text-bone">{c.code}</span> <Copy text={c.code} />
                <span className="ml-2 font-mono text-[11px] uppercase text-[var(--muted)]">{STATUS[c.status]}</span>
                <span className="block text-[var(--muted)]">
                  {c.note ?? ''}
                  {c.redeemed_by_username ? ` · used by ${c.redeemed_by_username} ${shortDate(c.redeemed_at)}` : ''}
                </span>
              </span>
              {c.status === 'unused' && (
                <button
                  type="button"
                  className="text-sm text-[#ff8a7f] underline"
                  onClick={() => token && run(() => admin.revoke(token, c.id), `Revoked ${c.code}.`).then((ok) => ok && reload())}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {listed.length === 0 && <li className="px-4 py-3 text-sm text-[var(--muted)]">None.</li>}
        </ul>
      )}
    </>
  );
}
