import { useEffect, useState, type FormEvent } from 'react';
import Modal from '../../components/Modal';
import { Field, Notice, Panel, Spinner, TextArea } from '../../components/ui';
import { admin, fromLocalInput, toLocalInput, type AdminSlot, type RosterEntry, type SlotInput } from '../../lib/adminApi';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { lengthLabel, whenLabel } from '../../lib/time';
import { useAction, useAdmin } from './useAdmin';

type Channel = { id: string; name: string };

function ChannelPicker({ channels, channelsError, value, name, onChange }: {
  channels: Channel[] | null;
  channelsError: string | null;
  value: string | null;
  name: string | null;
  onChange: (id: string | null, name: string | null) => void;
}) {
  if (channels && channels.length) {
    return (
      <div className="mb-5">
        <label htmlFor="voice-channel" className="mb-2 block font-display text-xs uppercase tracking-widest text-bone-2">
          Voice channel
        </label>
        <select
          id="voice-channel"
          className="field-input"
          value={value ?? ''}
          onChange={(e) => {
            const c = channels.find((x) => x.id === e.target.value);
            onChange(c?.id ?? null, c?.name ?? null);
          }}
        >
          <option value="">None yet</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <Field
      label="Voice channel name"
      value={name ?? ''}
      onChange={(e) => onChange(null, e.target.value || null)}
      hint={channelsError ? `${channelsError} Until then, type the channel name; players get it in the email, without a direct link.` : undefined}
    />
  );
}

function useChannels() {
  const { token } = useAuth();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!token) return;
    admin
      .channels(token)
      .then(setChannels)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Discord channels unavailable.'));
  }, [token]);
  return { channels, error };
}

function SlotForm({ slot, games, defaults, onSaved, onCancel }: {
  slot?: AdminSlot;
  games: { slug: string; name: string }[];
  defaults: { minutes: number; seats: number };
  onSaved: (msg: string) => void;
  onCancel?: () => void;
}) {
  const { token } = useAuth();
  const { busy, note, run } = useAction();
  const { channels, error: channelsError } = useChannels();
  const [game, setGame] = useState(slot?.game_slug ?? games[0]?.slug ?? '');
  const [start, setStart] = useState(slot ? toLocalInput(slot.starts_at) : '');
  const [minutes, setMinutes] = useState(slot?.duration_min ?? defaults.minutes);
  const [seats, setSeats] = useState(slot?.capacity ?? defaults.seats);
  const [channelId, setChannelId] = useState(slot?.discord_channel_id ?? null);
  const [channelName, setChannelName] = useState(slot?.discord_channel_name ?? null);
  const [notes, setNotes] = useState(slot?.notes ?? '');
  const [repeat, setRepeat] = useState(0);
  const [draft, setDraft] = useState(slot?.status === 'draft');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !start) return;
    const input: SlotInput = {
      starts_at: fromLocalInput(start),
      duration_min: Number(minutes),
      capacity: Number(seats),
      discord_channel_id: channelId,
      discord_channel_name: channelName,
      notes: notes.trim() || null,
      status: draft ? 'draft' : 'open',
    };
    if (slot) {
      run(() => admin.editSlot(token, slot.id, input), 'Saved. Anyone signed up has been emailed about time or channel changes.').then((ok) => ok && onSaved('Saved.'));
    } else {
      run(() => admin.createSlots(token, { ...input, game_slug: game, repeat_weeks: Number(repeat) }), '').then(
        (ok) => ok && onSaved(repeat ? `Created ${Number(repeat) + 1} weekly sessions.` : 'Session created.'),
      );
    }
  }

  return (
    <form onSubmit={submit}>
      {note && note.text && <Notice tone={note.tone}>{note.text}</Notice>}
      {!slot && (
        <div className="mb-5">
          <label htmlFor="slot-game" className="mb-2 block font-display text-xs uppercase tracking-widest text-bone-2">
            Game
          </label>
          <select id="slot-game" className="field-input" value={game} onChange={(e) => setGame(e.target.value)}>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <Field label="Starts (your local time)" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Length (min)" type="number" min={15} max={480} step={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        <Field label="Seats" type="number" min={1} max={100} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
      </div>
      <ChannelPicker
        channels={channels}
        channelsError={channelsError}
        value={channelId}
        name={channelName}
        onChange={(id, name) => {
          setChannelId(id);
          setChannelName(name);
        }}
      />
      <TextArea label="Session notes (in the 15-minute email)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="e.g. Download the build from #builds first." />
      {!slot && <Field label="Repeat weekly for N more weeks" type="number" min={0} max={12} value={repeat} onChange={(e) => setRepeat(Number(e.target.value))} />}
      <label className="mb-6 flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[var(--gold)]" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        Draft (hidden from players)
      </label>
      <div className="flex gap-3">
        <button type="submit" className="btn primary" disabled={busy || !start}>
          {slot ? 'Save' : 'Create'}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Close
          </button>
        )}
      </div>
    </form>
  );
}

function Roster({ slot, onClose, onChanged }: { slot: AdminSlot; onClose: () => void; onChanged: () => void }) {
  const { token } = useAuth();
  const { busy, note, run } = useAction();
  const [rows, setRows] = useState<RosterEntry[] | null>(null);
  const [who, setWho] = useState('');
  useEffect(() => {
    if (token) admin.roster(token, slot.id).then(setRows).catch(() => setRows([]));
  }, [token, slot.id]);
  const live = (rows ?? []).filter((r) => r.status === 'confirmed' || r.status === 'waitlisted');

  return (
    <Modal title={`Roster · ${slot.game_name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-[var(--bone-2)]">{whenLabel(slot.starts_at, slot.ends_at)}</p>
      {note && note.text && <Notice tone={note.tone}>{note.text}</Notice>}
      {rows === null ? (
        <Spinner />
      ) : live.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--muted)]">Nobody yet.</p>
      ) : (
        <ul className="mb-5 divide-y divide-ink-3 border border-ink-3">
          {live.map((r) => (
            <li key={r.signup_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <strong>{r.username}</strong>{' '}
                <span className="text-[var(--muted)]">
                  {r.status === 'confirmed' ? 'seated' : `waitlist #${r.position}`}
                  {r.remind_4h ? ' · reminder' : ''}
                  {r.join_sent_at ? ' · Discord sent' : ''}
                </span>
              </span>
              <button
                type="button"
                className="text-[#ff8a7f] underline"
                disabled={busy}
                onClick={() =>
                  token && run(async () => setRows(await admin.rosterRemove(token, slot.id, r.signup_id)), `Removed ${r.username}.`).then((ok) => ok && onChanged())
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (token && who.trim())
            run(async () => setRows(await admin.rosterAdd(token, slot.id, who.trim())), `Added ${who.trim()}.`).then((ok) => ok && (setWho(''), onChanged()));
        }}
      >
        <label htmlFor="roster-add" className="sr-only">
          Add player by username or email
        </label>
        <input id="roster-add" className="field-input" placeholder="Username or email" value={who} onChange={(e) => setWho(e.target.value)} />
        <button type="submit" className="btn gold" disabled={busy}>
          Add
        </button>
      </form>
    </Modal>
  );
}

export default function Slots() {
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const { data, error, reload, token } = useAdmin((t) => admin.slots(t, when), [when]);
  const { data: games } = useAdmin((t) => admin.games(t));
  const { data: settings } = useAdmin((t) => admin.settings(t));
  const { note, run, setNote } = useAction();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [roster, setRoster] = useState<AdminSlot | null>(null);
  const scheduled = (games ?? []).filter((g) => g.type === 'scheduled_playtest' && g.status === 'active');
  const defaults = { minutes: settings?.default_slot_minutes ?? 60, seats: settings?.default_slot_seats ?? 6 };
  const saved = (msg: string) => {
    setEditing(null);
    setNote({ tone: 'success', text: msg });
    reload();
  };

  return (
    <>
      {note && note.text && <Notice tone={note.tone}>{note.text}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm">
          {(['upcoming', 'past'] as const).map((w) => (
            <button key={w} type="button" className={when === w ? 'font-semibold text-gold' : 'text-bone underline'} onClick={() => setWhen(w)}>
              {w === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
        {editing !== 'new' && when === 'upcoming' && (
          <button type="button" className="btn gold" onClick={() => setEditing('new')} disabled={!scheduled.length}>
            New session
          </button>
        )}
      </div>
      {editing === 'new' && (
        <Panel className="mb-6">
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide">New session</h2>
          <SlotForm games={scheduled} defaults={defaults} onSaved={saved} onCancel={() => setEditing(null)} />
        </Panel>
      )}
      {data === null ? (
        <Spinner />
      ) : data.length === 0 ? (
        <Notice>{when === 'upcoming' ? 'No sessions scheduled.' : 'No past sessions yet.'}</Notice>
      ) : (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.id} className="panel p-4">
              {editing === s.id ? (
                <SlotForm slot={s} games={scheduled} defaults={defaults} onSaved={saved} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span>
                      <strong className="font-display uppercase tracking-wide">{s.game_name}</strong>
                      <span className="block text-sm text-[var(--bone-2)]">
                        {whenLabel(s.starts_at, s.ends_at)} · {lengthLabel(s.duration_min)}
                      </span>
                      <span className="block text-sm text-[var(--muted)]">
                        {s.confirmed_count}/{s.capacity} seated · {s.waitlist_count} waiting
                        {s.discord_channel_name ? ` · #${s.discord_channel_name}` : ''}
                        {s.discord_sync_needed ? ' · Discord event pending retry' : ''}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] uppercase text-gold">{s.status}</span>
                  </div>
                  {when === 'upcoming' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn ghost" onClick={() => setRoster(s)}>
                        Roster
                      </button>
                      <button type="button" className="btn ghost" onClick={() => setEditing(s.id)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          if (token && window.confirm('Cancel this session? Everyone signed up is emailed.'))
                            run(() => admin.cancelSlot(token, s.id), 'Session cancelled; players emailed.').then((ok) => ok && reload());
                        }}
                      >
                        Cancel session
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {roster && <Roster slot={roster} onClose={() => setRoster(null)} onChanged={reload} />}
    </>
  );
}
