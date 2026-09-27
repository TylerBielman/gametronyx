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

const EMAILS: Record<string, string> = {
  welcome: 'welcome email',
  verify_email: 'email confirmation',
  password_reset: 'password reset',
  admin_invite_request: 'invite-request alert to admins',
  invite_approved: 'invite approval',
  playtest_confirmed: 'session confirmation',
  playtest_waitlisted: 'waitlist notice',
  playtest_promoted: 'waitlist promotion',
  playtest_reminder: '4-hour reminder',
  playtest_join: '15-minute Discord email',
  playtest_updated: 'session change notice',
  playtest_cancelled: 'session cancelled notice',
  admin_playtest_signup: 'sign-up alert to admins',
};

// Plain-English reading of the usual Resend refusals.
function emailHint(error: string): string | null {
  const e = error.toLowerCase();
  if (e.includes('not verified') || e.includes('testing emails')) return 'Resend says the gametronyx.com domain isn’t verified yet.';
  if (e.includes('resend 401') || e.includes('api key')) return 'Resend rejected the API key on the server.';
  if (e.includes('resend 422')) return 'Resend rejected the message, usually because the address isn’t valid.';
  if (e.includes('resend 429')) return 'Resend’s sending limit was hit.';
  if (e.includes('timed out') || e.includes('connect')) return 'The server couldn’t reach Resend.';
  return null;
}

function EmailFailure({ details }: { details: Record<string, unknown> | null }) {
  const template = typeof details?.template === 'string' ? details.template : '';
  const error = typeof details?.error === 'string' ? details.error : '';
  const hint = emailHint(error);
  return (
    <div className="basis-full text-fg-2">
      {template && <p>Which email: {EMAILS[template] ?? template.replace(/_/g, ' ')}</p>}
      {hint && <p className="font-bold text-red-text">{hint}</p>}
      {error && <p className="break-words font-mono text-xs text-fg-3">{error}</p>}
    </div>
  );
}

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
        <label htmlFor="activity-type" className="font-display text-xs uppercase tracking-widest text-fg-2">
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
        <ol className="divide-y divide-line rounded-lg border border-line bg-paper">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span>{line(e)}</span>
              <time className="font-mono text-xs text-fg-3" dateTime={e.at ?? undefined}>
                {shortDate(e.at)}
              </time>
              {e.type === 'email_failed' && <EmailFailure details={e.details} />}
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
