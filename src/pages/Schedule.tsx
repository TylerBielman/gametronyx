import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GameCard from '../components/GameCard';
import Modal from '../components/Modal';
import { Notice, PageHeader, Spinner } from '../components/ui';
import { api, ApiError, type Slot } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayKey, dayLabel, lengthLabel, timeRange, whenLabel } from '../lib/time';
import { useGames } from '../lib/useGames';

function useSlots() {
  const { token } = useAuth();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!token) return;
    api
      .slots(token)
      .then((s) => {
        setSlots(s);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load sessions.'));
  }, [token]);
  useEffect(reload, [reload]);
  return { slots, error, reload };
}

/** /schedule — the menu of games with scheduled playtests. */
export function ScheduleMenu() {
  const { games, loading } = useGames();
  const { slots } = useSlots();
  const scheduled = games.filter((g) => g.type === 'scheduled_playtest');
  const upcoming = (slug: string) => slots?.filter((s) => s.game_slug === slug).length ?? 0;

  return (
    <>
      <PageHeader kicker="Multiplayer" title="Scheduled playtests">
        Pick a game, then grab a seat in a session. The Discord link arrives by email 15 minutes before it starts.
      </PageHeader>
      {loading ? (
        <Spinner label="Loading games" />
      ) : scheduled.length === 0 ? (
        <Notice>No scheduled playtests right now. Check back soon.</Notice>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {scheduled.map((g) => (
            <GameCard
              key={g.slug}
              game={g}
              action={
                <Link to={`/schedule/${g.slug}`} className="btn gold">
                  {slots === null
                    ? 'See sessions'
                    : upcoming(g.slug) === 1
                      ? '1 session'
                      : `${upcoming(g.slug)} sessions`}
                </Link>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function SeatLine({ slot }: { slot: Slot }) {
  if (slot.seats_left > 0) {
    return (
      <span className="text-cash">
        {slot.seats_left} of {slot.capacity} seats left
      </span>
    );
  }
  return (
    <span className="text-gold">
      Full · waitlist{slot.waitlist_count ? ` (${slot.waitlist_count} ahead)` : ''}
    </span>
  );
}

function SlotButton({ slot, onPick }: { slot: Slot; onPick: (s: Slot) => void }) {
  const mine = slot.my_signup;
  if (mine?.status === 'confirmed') {
    return <Link to="/me" className="btn cash">You're in ✓</Link>;
  }
  if (mine?.status === 'waitlisted') {
    return <Link to="/me" className="btn ghost">Waitlist #{mine.position}</Link>;
  }
  return (
    <button type="button" className={`btn ${slot.seats_left > 0 ? 'primary' : 'ghost'}`} onClick={() => onPick(slot)}>
      {slot.seats_left > 0 ? 'Sign up' : 'Join waitlist'}
    </button>
  );
}

function ConfirmSheet({ slot, onClose, onDone }: { slot: Slot; onClose: () => void; onDone: (msg: string) => void }) {
  const { token, user, setUser } = useAuth();
  // Opt-in (DESIGN §7.1): unchecked the first time, then the player's last choice.
  const [remind, setRemind] = useState(user?.reminder_default ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const session = await api.signUp(token, slot.id, remind);
      if (user) setUser({ ...user, reminder_default: remind });
      onDone(
        session.signup.status === 'confirmed'
          ? `You're in! Check your email for the details${remind ? ' and a reminder 4 hours before' : ''}.`
          : `The session is full, so you're on the waitlist (#${session.signup.position}). We'll email you if a seat opens.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign up. Try again.');
      setBusy(false);
    }
  }

  return (
    <Modal title={slot.seats_left > 0 ? 'Grab this seat?' : 'Join the waitlist?'} onClose={onClose}>
      {error && <Notice tone="error">{error}</Notice>}
      <dl className="mb-5 space-y-1 text-[var(--bone-2)]">
        <div>
          <dt className="sr-only">Game</dt>
          <dd className="font-display text-lg uppercase text-bone">{slot.game_name}</dd>
        </div>
        <div>
          <dt className="sr-only">When</dt>
          <dd>{whenLabel(slot.starts_at, slot.ends_at)}</dd>
        </div>
        <div>
          <dt className="sr-only">Length</dt>
          <dd>{lengthLabel(slot.duration_min)} on Discord</dd>
        </div>
      </dl>
      <label className="mb-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[var(--gold)]"
          checked={remind}
          onChange={(e) => setRemind(e.target.checked)}
        />
        <span>Email me a reminder 4 hours before</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn primary flex-1" onClick={confirm} disabled={busy}>
          {busy ? 'Saving…' : slot.seats_left > 0 ? 'Confirm' : 'Join waitlist'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/** /schedule/:slug — upcoming sessions for one game, grouped by day. */
export function GameSchedule() {
  const { slug } = useParams();
  const { games } = useGames();
  const { slots, error, reload } = useSlots();
  const [picked, setPicked] = useState<Slot | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const game = games.find((g) => g.slug === slug);
  const mine = useMemo(() => (slots ?? []).filter((s) => s.game_slug === slug), [slots, slug]);
  const days = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const s of mine) groups.set(dayKey(s.starts_at), [...(groups.get(dayKey(s.starts_at)) ?? []), s]);
    return [...groups.values()];
  }, [mine]);

  return (
    <>
      <PageHeader kicker="Scheduled playtest" title={game?.name ?? mine[0]?.game_name ?? 'Sessions'}>
        {game?.pitch}
      </PageHeader>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Times are shown in your time zone. <Link to="/schedule">All games</Link> · <Link to="/me">My sessions</Link>
      </p>
      {done && <Notice tone="success">{done}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {slots === null ? (
        <Spinner label="Loading sessions" />
      ) : days.length === 0 ? (
        <Notice>No sessions scheduled yet. Tyler adds new ones regularly, so check back soon.</Notice>
      ) : (
        <div className="space-y-8">
          {days.map((group) => (
            <section key={group[0].id} aria-label={dayLabel(group[0].starts_at)}>
              <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-gold">{dayLabel(group[0].starts_at)}</h2>
              <ul className="space-y-3">
                {group.map((slot) => (
                  <li key={slot.id} className="panel flex flex-wrap items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-mono text-base text-bone">{timeRange(slot.starts_at, slot.ends_at)}</p>
                      <p className="text-sm text-[var(--bone-2)]">
                        {lengthLabel(slot.duration_min)} · <SeatLine slot={slot} />
                      </p>
                    </div>
                    <SlotButton slot={slot} onPick={setPicked} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {picked && (
        <ConfirmSheet
          slot={picked}
          onClose={() => setPicked(null)}
          onDone={(msg) => {
            setPicked(null);
            setDone(msg);
            reload();
            window.scrollTo(0, 0);
          }}
        />
      )}
    </>
  );
}
