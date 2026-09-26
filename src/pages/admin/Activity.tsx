import { useState } from 'react';
import { Notice, Spinner } from '../../components/ui';
import { admin, shortDate, type ActivityEvent } from '../../lib/adminApi';
import { useAdmin } from './useAdmin';

const LABELS: Record<string, string> = {
  account_created: 'joined',
  login: 'logged in',
  login_failed_burst: '5 failed logins',
  game_launched: 'launched',
  feedback_submitted: 'sent feedback',
  invite_requested: 'invite requested',
  invite_request_approved: 'approved an invite request',
  invite_request_declined: 'declined an invite request',
  invite_created: 'minted invite codes',
  invite_revoked: 'revoked an invite code',
  master_rotated: 'rotated the master code',
  playtest_signup: 'signed up',
  playtest_waitlisted: 'joined the waitlist',
  playtest_promoted: 'was promoted from the waitlist',
  playtest_cancelled: 'cancelled a seat',
  slot_created: 'created a session',
  slot_updated: 'edited a session',
  slot_cancelled: 'cancelled a session',
  email_failed: 'email failed',
};

function line(e: ActivityEvent): string {
  const what = LABELS[e.type] ?? e.type.replace(/_/g, ' ');
  const who = e.actor ?? e.subject ?? '';
  const whom = e.actor && e.subject && e.actor !== e.subject ? ` (${e.subject})` : '';
  const game = e.game ? ` · ${e.game}` : '';
  return `${who ? who + ' ' : ''}${what}${whom}${game}`;
}

export default function Activity() {
  const [type, setType] = useState('');
  const { data: types } = useAdmin((t) => admin.activityTypes(t));
  const { data, error, token } = useAdmin((t) => admin.activity(t, type || undefined), [type]);
  const [more, setMore] = useState<ActivityEvent[]>([]);
  const [done, setDone] = useState(false);
  const events = [...(data ?? []), ...more];

  async function loadMore() {
    if (!token || !events.length) return;
    const next = await admin.activity(token, type || undefined, events[events.length - 1].id);
    setMore((m) => [...m, ...next]);
    if (next.length < 50) setDone(true);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label htmlFor="activity-type" className="font-display text-xs uppercase tracking-widest text-bone-2">
          Show
        </label>
        <select
          id="activity-type"
          className="field-input max-w-xs"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setMore([]);
            setDone(false);
          }}
        >
          <option value="">Everything</option>
          {(types ?? []).map((t) => (
            <option key={t} value={t}>
              {LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {data === null ? (
        <Spinner />
      ) : events.length === 0 ? (
        <Notice>Nothing yet.</Notice>
      ) : (
        <ol className="divide-y divide-ink-3 border border-ink-3">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span>{line(e)}</span>
              <time className="font-mono text-xs text-[var(--muted)]" dateTime={e.at ?? undefined}>
                {shortDate(e.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
      {events.length >= 50 && !done && (
        <button type="button" className="btn ghost mt-5" onClick={loadMore}>
          Load older
        </button>
      )}
    </>
  );
}
