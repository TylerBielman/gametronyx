import { useEffect, useState, type FormEvent } from 'react';
import { Field, Notice, Panel, Spinner } from '../../components/ui';
import { admin, type Settings as S } from '../../lib/adminApi';
import { useAction, useAdmin } from './useAdmin';

function Status({ ok, label, fix }: { ok: boolean; label: string; fix: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={ok ? 'text-cash' : 'text-[#ff8a7f]'}>{ok ? '✓' : '✗'}</span>
      <span>
        {label}
        {!ok && <span className="block text-[var(--muted)]">{fix}</span>}
      </span>
    </li>
  );
}

export default function Settings() {
  const { data, error, reload, token } = useAdmin((t) => admin.settings(t));
  const { busy, note, run } = useAction();
  const [s, setS] = useState<S | null>(null);
  useEffect(() => setS(data), [data]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!s) return <Spinner />;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !s) return;
    run(
      () =>
        admin.saveSettings(token, {
          discord_server_id: s.discord_server_id?.trim() || null,
          discord_invite_url: s.discord_invite_url?.trim() || null,
          default_slot_minutes: Number(s.default_slot_minutes),
          default_slot_seats: Number(s.default_slot_seats),
          alert_invite_request: s.alert_invite_request,
          alert_playtest_signup: s.alert_playtest_signup,
          alert_playtest_cancel: s.alert_playtest_cancel,
        }),
      'Settings saved.',
    ).then((ok) => ok && reload());
  }

  const toggle = (k: 'alert_invite_request' | 'alert_playtest_signup' | 'alert_playtest_cancel', label: string) => (
    <label className="mb-3 flex items-center gap-3 text-sm">
      <input type="checkbox" className="h-5 w-5 accent-[var(--gold)]" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <form onSubmit={submit} className="max-w-xl">
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <Panel className="mb-6">
        <h2 className="mb-3 font-display text-lg uppercase tracking-wide">Server setup</h2>
        <ul className="space-y-2">
          <Status ok={s.email_configured} label="Email (Resend)" fix="Add RESEND_API_KEY_GTX on the server (LAUNCH_CHECKLIST C2)." />
          <Status ok={s.github_configured} label="Feedback → GitHub issues" fix="Add GTX_GITHUB_TOKEN on the server (C2)." />
          <Status ok={s.discord_bot_configured} label="Discord bot" fix="Add DISCORD_BOT_TOKEN on the server (C2)." />
        </ul>
      </Panel>
      <Panel className="mb-6">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Discord</h2>
        <Field label="Server ID" value={s.discord_server_id ?? ''} onChange={(e) => setS({ ...s, discord_server_id: e.target.value })} inputMode="numeric" hint="Developer Mode on → right-click the server → Copy Server ID." />
        <Field label="Permanent invite link" value={s.discord_invite_url ?? ''} onChange={(e) => setS({ ...s, discord_invite_url: e.target.value })} placeholder="https://discord.gg/…" hint="Set to never expire, no use limit. Sent in every 15-minute email." />
      </Panel>
      <Panel className="mb-6">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">New session defaults</h2>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Length (min)" type="number" min={15} max={480} step={15} value={s.default_slot_minutes} onChange={(e) => setS({ ...s, default_slot_minutes: Number(e.target.value) })} />
          <Field label="Seats" type="number" min={1} max={100} value={s.default_slot_seats} onChange={(e) => setS({ ...s, default_slot_seats: Number(e.target.value) })} />
        </div>
      </Panel>
      <Panel className="mb-6">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Email me when…</h2>
        {toggle('alert_invite_request', 'someone requests an invite')}
        {toggle('alert_playtest_signup', 'someone signs up for a session')}
        {toggle('alert_playtest_cancel', 'someone cancels a seat')}
      </Panel>
      <button type="submit" className="btn primary" disabled={busy}>
        Save settings
      </button>
    </form>
  );
}
