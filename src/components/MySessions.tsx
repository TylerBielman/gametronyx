import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type MySession } from '../lib/api';
import { useAuth } from '../lib/auth';
import { lengthLabel, whenLabel } from '../lib/time';
import { Notice, Panel } from './ui';

function JoinPanel({ session }: { session: MySession }) {
  const join = session.join!;
  return (
    <div className="mt-4 border-l-4 border-ok bg-paper px-4 py-3">
      <p className="mb-2 font-display text-sm uppercase tracking-widest text-ok">Starting soon: join on Discord</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-2">
        <li>
          {join.invite_url ? (
            <a href={join.invite_url} target="_blank" rel="noreferrer">
              Join the Gametronyx Discord
            </a>
          ) : (
            'Join the Gametronyx Discord'
          )}{' '}
          (skip if you're already in).
        </li>
        <li>
          Open the voice channel{' '}
          {join.channel_url ? (
            <a href={join.channel_url} target="_blank" rel="noreferrer">
              #{join.channel_name ?? 'playtest'}
            </a>
          ) : (
            <strong className="text-fg">#{join.channel_name ?? 'playtest'}</strong>
          )}
          .
        </li>
        {join.notes && <li className="whitespace-pre-line">{join.notes}</li>}
      </ol>
    </div>
  );
}

function SessionRow({ session, onChange }: { session: MySession; onChange: (msg: string) => void }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signup, slot } = session;
  const seated = signup.status === 'confirmed';

  async function run(action: () => Promise<unknown>, msg: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange(msg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display uppercase tracking-wide">{slot.game_name}</p>
          <p className="text-sm text-fg-2">
            {whenLabel(slot.starts_at, slot.ends_at)} · {lengthLabel(slot.duration_min)}
          </p>
        </div>
        <span
          className={`px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest ${seated ? 'bg-lcd text-lcd-ink' : 'bg-amber text-char'}`}
        >
          {seated ? 'Confirmed' : `Waitlist #${signup.position}`}
        </span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-text">{error}</p>}
      {session.join && <JoinPanel session={session} />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {seated ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--red)]"
              checked={signup.remind_4h}
              disabled={busy}
              onChange={(e) =>
                token &&
                run(
                  () => api.setReminder(token, signup.id, e.target.checked),
                  e.target.checked ? 'Reminder on: we’ll email you 4 hours before.' : 'Reminder off.',
                )
              }
            />
            Email me 4 hours before
          </label>
        ) : (
          <span className="text-sm text-fg-3">You'll get the seat automatically if one opens.</span>
        )}
        <button
          type="button"
          className="text-sm font-semibold text-red-text underline"
          disabled={busy}
          onClick={() => {
            if (!token) return;
            const what = seated ? 'give up your seat' : 'leave the waitlist';
            if (!window.confirm(`Are you sure you want to ${what}?`)) return;
            run(() => api.leave(token, slot.id), seated ? 'Seat released. Thanks for letting others play!' : 'You left the waitlist.');
          }}
        >
          {seated ? 'Cancel my seat' : 'Leave waitlist'}
        </button>
      </div>
    </li>
  );
}

export default function MySessions() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<MySession[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(() => {
    if (token) api.mySessions(token).then(setSessions).catch(() => setSessions([]));
  }, [token]);
  useEffect(load, [load]);

  return (
    <Panel className="mb-6">
      <h2 className="mb-4 font-display text-lg uppercase tracking-wide">My sessions</h2>
      {note && <Notice tone="success">{note}</Notice>}
      {sessions === null ? (
        <p className="text-sm text-fg-3">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-fg-2">
          No upcoming sessions. <Link to="/schedule">Find a scheduled playtest</Link>.
        </p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <SessionRow
              key={s.signup.id}
              session={s}
              onChange={(msg) => {
                setNote(msg);
                load();
              }}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
