import { Notice, Spinner } from '../../components/ui';
import { admin, shortDate } from '../../lib/adminApi';
import { useAction, useAdmin } from './useAdmin';

export default function Requests() {
  const { data, error, reload, token } = useAdmin((t) => admin.requests(t));
  const { busy, note, run } = useAction();
  const pending = (data ?? []).filter((r) => r.status === 'pending');
  const handled = (data ?? []).filter((r) => r.status !== 'pending');

  return (
    <>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Waiting ({pending.length})</h2>
      {data === null ? (
        <Spinner />
      ) : pending.length === 0 ? (
        <Notice>No requests waiting.</Notice>
      ) : (
        <ul className="mb-10 space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="panel p-4">
              <p className="font-semibold text-bone">
                {r.name} <span className="font-normal text-[var(--muted)]">&lt;{r.email}&gt;</span>
              </p>
              <p className="text-sm text-[var(--bone-2)]">
                {r.game_interest ? `Interested in ${r.game_interest} · ` : ''}asked {shortDate(r.created_at)}
                {r.has_account ? ' · already has an account' : ''}
              </p>
              {r.message && <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="btn cash"
                  disabled={busy}
                  onClick={() => token && run(() => admin.approve(token, r.id), `Approved. ${r.name} has been emailed a code.`).then((ok) => ok && reload())}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => token && run(() => admin.decline(token, r.id), 'Declined (no email sent).').then((ok) => ok && reload())}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {handled.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Handled</h2>
          <ul className="divide-y divide-ink-3 border border-ink-3">
            {handled.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {r.name} &lt;{r.email}&gt;
                </span>
                <span className="text-[var(--muted)]">
                  {r.status}
                  {r.code ? ` · ${r.code}` : ''} · {shortDate(r.handled_at)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
