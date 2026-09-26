import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field, Notice, PageHeader, Panel, TextArea } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useGames } from '../lib/useGames';

export default function RequestInvite() {
  const { games } = useGames();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [game, setGame] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestInvite({
        name: name.trim(),
        email: email.trim(),
        game_interest: game || undefined,
        message: message.trim() || undefined,
        website: website || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader kicker="Request sent" title="Thanks!">
          Tyler reads every request. If there's room in a playtest, he'll email you an invite code at{' '}
          <strong className="text-bone">{email.trim()}</strong>.
        </PageHeader>
        <Link to="/" className="btn ghost">
          Back to the games
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="Playtests are invite-only" title="Request an invite">
        Tell Tyler a little about yourself. Already have a code? <Link to="/join">Use it here</Link>.
      </PageHeader>
      <Panel>
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit} noValidate={false}>
          <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            autoComplete="email"
            hint="Your invite code will be sent here."
          />
          <div className="mb-5">
            <label htmlFor="game-interest" className="mb-2 block font-display text-xs uppercase tracking-widest text-bone-2">
              Which game interests you? (optional)
            </label>
            <select id="game-interest" className="field-input" value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="">Any of them</option>
              {games.map((g) => (
                <option key={g.slug} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <TextArea
            label="Anything Tyler should know? (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            placeholder="How you heard about the games, what you like to play…"
          />
          <div className="trap" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <button type="submit" className="btn primary w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Request an invite'}
          </button>
        </form>
      </Panel>
    </div>
  );
}
