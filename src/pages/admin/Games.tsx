import { useState, type FormEvent } from 'react';
import { Field, Notice, Panel, Spinner, TextArea } from '../../components/ui';
import { admin, type AdminGame } from '../../lib/adminApi';
import { useAuth } from '../../lib/auth';
import { useAction, useAdmin } from './useAdmin';

const TYPES: [AdminGame['type'], string][] = [
  ['open_playtest', 'Open playtest (Play button)'],
  ['scheduled_playtest', 'Scheduled playtest (sessions)'],
  ['showcase_only', 'Showcase only (coming soon / link-out)'],
];

const blank: Partial<AdminGame> = {
  slug: '', name: '', pitch: '', description: '', type: 'showcase_only', status: 'active',
  show_on_showcase: true, handoff_enabled: false, sort_order: 100,
};

function GameForm({ game, onSaved, onCancel }: { game: Partial<AdminGame>; onSaved: () => void; onCancel?: () => void }) {
  const { token } = useAuth();
  const { busy, note, run } = useAction();
  const [g, setG] = useState<Partial<AdminGame>>(game);
  const [labels, setLabels] = useState((game.feedback_labels ?? []).join(', '));
  const isNew = !game.id;
  const set = (k: keyof AdminGame) => (e: { target: { value: string } }) => setG({ ...g, [k]: e.target.value });
  const orNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const body: Partial<AdminGame> = {
      ...g,
      art_url: orNull(g.art_url), play_url: orNull(g.play_url), site_url: orNull(g.site_url),
      feedback_repo: orNull(g.feedback_repo),
      feedback_labels: labels.trim() ? labels.split(',').map((l) => l.trim()).filter(Boolean) : null,
      feedback_every_n_runs: g.feedback_every_n_runs ? Number(g.feedback_every_n_runs) : null,
      sort_order: Number(g.sort_order ?? 0),
    };
    if (!isNew) delete body.slug;
    delete body.id;
    run(() => (isNew ? admin.createGame(token, body) : admin.editGame(token, game.id!, body)), isNew ? 'Game added.' : 'Saved.').then(
      (ok) => ok && onSaved(),
    );
  }

  return (
    <form onSubmit={submit}>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Name" value={g.name ?? ''} onChange={set('name')} required />
        <Field
          label="Slug"
          value={g.slug ?? ''}
          onChange={(e) => setG({ ...g, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          required
          disabled={!isNew}
          hint={isNew ? 'Lowercase, used in links. Fixed once saved.' : 'Fixed.'}
        />
      </div>
      <div className="mb-5">
        <label htmlFor={`type-${game.id ?? 'new'}`} className="mb-2 block font-display text-xs uppercase tracking-widest text-fg-2">
          Type
        </label>
        <select id={`type-${game.id ?? 'new'}`} className="field-input" value={g.type} onChange={set('type')}>
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <Field label="One-line pitch" value={g.pitch ?? ''} onChange={set('pitch')} maxLength={200} />
      <TextArea label="Description (optional)" value={g.description ?? ''} onChange={set('description')} maxLength={4000} />
      <Field label="Art URL (optional)" type="url" value={g.art_url ?? ''} onChange={set('art_url')} placeholder="https://…" />
      {g.type === 'open_playtest' && (
        <>
          <Field label="Play URL" type="url" value={g.play_url ?? ''} onChange={set('play_url')} placeholder="https://…" />
          <label className="mb-5 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--red)]" checked={!!g.handoff_enabled} onChange={(e) => setG({ ...g, handoff_enabled: e.target.checked })} />
            Players launch it from Gametronyx (Play button with login handoff)
          </label>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Feedback repo (owner/repo)" value={g.feedback_repo ?? ''} onChange={set('feedback_repo')} placeholder="TylerBielman/…" />
            <Field label="Feedback popup every N runs" type="number" min={1} max={50} value={g.feedback_every_n_runs ?? ''} onChange={set('feedback_every_n_runs')} />
          </div>
          <Field label="Feedback labels (comma-separated)" value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="feedback, playtest, game:slug" />
        </>
      )}
      <Field label="Site link-out URL (optional)" type="url" value={g.site_url ?? ''} onChange={set('site_url')} placeholder="https://…" />
      <div className="grid gap-x-4 sm:grid-cols-2">
        <div className="mb-5">
          <label htmlFor={`status-${game.id ?? 'new'}`} className="mb-2 block font-display text-xs uppercase tracking-widest text-fg-2">
            Status
          </label>
          <select id={`status-${game.id ?? 'new'}`} className="field-input" value={g.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="paused">Paused (hidden)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </div>
        <Field label="Sort order" type="number" value={g.sort_order ?? 0} onChange={set('sort_order')} />
      </div>
      <label className="mb-6 flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[var(--red)]" checked={!!g.show_on_showcase} onChange={(e) => setG({ ...g, show_on_showcase: e.target.checked })} />
        Show on the public showcase
      </label>
      <div className="flex gap-3">
        <button type="submit" className="btn primary" disabled={busy}>
          {isNew ? 'Add game' : 'Save'}
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

export default function Games() {
  const { data, error, reload } = useAdmin((t) => admin.games(t));
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {data === null ? (
        <Spinner />
      ) : (
        <ul className="mb-6 space-y-3">
          {data.map((g) => (
            <li key={g.id} className="panel p-4">
              {editing === g.id ? (
                <GameForm game={g} onSaved={() => reload()} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <strong className="font-display uppercase tracking-wide">{g.name}</strong>
                    <span className="ml-2 font-mono text-[11px] uppercase text-fg-3">
                      {g.type.replace('_', ' ')} · {g.status}
                      {!g.show_on_showcase ? ' · hidden' : ''}
                    </span>
                  </span>
                  <button type="button" className="btn ghost" onClick={() => setEditing(g.id)}>
                    Edit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === 'new' ? (
        <Panel>
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide">New game</h2>
          <GameForm
            game={blank}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onCancel={() => setEditing(null)}
          />
        </Panel>
      ) : (
        <button type="button" className="btn gold" onClick={() => setEditing('new')}>
          Add a game
        </button>
      )}
    </>
  );
}
