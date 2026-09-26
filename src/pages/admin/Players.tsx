import { useState } from 'react';
import Modal from '../../components/Modal';
import { Field, Notice, Spinner } from '../../components/ui';
import { admin, shortDate, type Player } from '../../lib/adminApi';
import { useAuth } from '../../lib/auth';
import { useAction, useAdmin } from './useAdmin';

function PlayerPanel({ player, onClose, onChanged }: { player: Player; onClose: () => void; onChanged: () => void }) {
  const { token, user } = useAuth();
  const { busy, note, run } = useAction();
  const [email, setEmail] = useState(player.email ?? '');
  const [temp, setTemp] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const self = user?.id === player.id;
  const act = (fn: () => Promise<unknown>, msg: string) => run(fn, msg).then((ok) => ok && onChanged());

  return (
    <Modal title={player.username} onClose={onClose}>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <p className="mb-4 text-sm text-fg-2">
        {player.role === 'admin' ? 'Admin' : 'Player'} · joined {shortDate(player.created_at)} · last login {shortDate(player.last_login_at)}
        <br />
        {player.games_launched} launches · {player.feedback_count} feedback · {player.upcoming_sessions} upcoming sessions
      </p>
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (token) act(() => admin.editPlayer(token, player.id, { email: email.trim() || null }), 'Email saved.');
        }}
      >
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} hint={player.email_verified ? '✓ Confirmed' : 'Not confirmed'} />
        <button type="submit" className="btn gold" disabled={busy}>
          Save email
        </button>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn ghost"
          disabled={busy || self}
          onClick={() => token && act(() => admin.editPlayer(token, player.id, { is_active: !player.is_active }), player.is_active ? 'Disabled and signed out.' : 'Enabled.')}
        >
          {player.is_active ? 'Disable' : 'Enable'}
        </button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => token && act(() => admin.forceLogout(token, player.id), 'Signed out everywhere.')}>
          Force log-out
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy || self}
          onClick={() => token && act(() => admin.editPlayer(token, player.id, { role: player.role === 'admin' ? 'player' : 'admin' }), 'Role updated.')}
        >
          {player.role === 'admin' ? 'Make player' : 'Make admin'}
        </button>
      </div>
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (token) act(() => admin.tempPassword(token, player.id, temp), `Temporary password set. Tell ${player.username} directly.`);
        }}
      >
        <Field label="Temporary password" value={temp} onChange={(e) => setTemp(e.target.value)} hint="For players with no email. Signs them out everywhere." autoComplete="off" />
        <button type="submit" className="btn ghost" disabled={busy || temp.length < 8}>
          Set password
        </button>
      </form>
      {!self && (
        <details className="border-t border-line pt-4">
          <summary className="cursor-pointer text-sm text-red-text">Delete account…</summary>
          <Field label={`Type ${player.username} to confirm`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
          <button
            type="button"
            className="btn primary"
            disabled={busy || confirmName.trim().toLowerCase() !== player.username.toLowerCase()}
            onClick={() => token && run(() => admin.deletePlayer(token, player.id, confirmName), 'Deleted.').then((ok) => ok && (onChanged(), onClose()))}
          >
            Delete forever
          </button>
        </details>
      )}
    </Modal>
  );
}

export default function Players() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, reload } = useAdmin((t) => admin.players(t, query), [query]);
  const [open, setOpen] = useState<Player | null>(null);

  return (
    <>
      <form
        className="mb-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q);
        }}
      >
        <label htmlFor="player-search" className="sr-only">
          Search players
        </label>
        <input id="player-search" className="field-input" placeholder="Username or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="btn gold">
          Search
        </button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {data === null ? (
        <Spinner />
      ) : data.length === 0 ? (
        <Notice>No players found.</Notice>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-paper">
          {data.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-casing" onClick={() => setOpen(p)}>
                <span>
                  <strong className="text-fg">{p.username}</strong>
                  {p.role === 'admin' && <span className="ml-2 font-mono text-[11px] uppercase text-red-text">admin</span>}
                  {!p.is_active && <span className="ml-2 font-mono text-[11px] uppercase text-red-text">disabled</span>}
                  <span className="block text-sm text-fg-3">{p.email ?? 'no email'}</span>
                </span>
                <span className="font-mono text-xs text-fg-3">last login {shortDate(p.last_login_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <PlayerPanel
          key={open.id}
          player={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            reload();
          }}
        />
      )}
    </>
  );
}
