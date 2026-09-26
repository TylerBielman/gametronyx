import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function Wordmark() {
  return (
    <Link to="/" className="font-display text-lg uppercase tracking-wider text-bone no-underline sm:text-2xl">
      Game<span className="text-blood">tronyx</span>
    </Link>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `font-display text-[11px] uppercase tracking-wider no-underline sm:text-xs sm:tracking-widest ${isActive ? 'text-gold' : 'text-bone hover:text-gold'}`;

export default function Layout({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Wordmark />
          <nav aria-label="Main" className="flex items-center gap-3 sm:gap-5">
            {status === 'authed' && user ? (
              <>
                <NavLink to="/play" className={navClass}>
                  Play
                </NavLink>
                <NavLink to="/schedule" className={navClass}>
                  Schedule
                </NavLink>
                <NavLink
                  to="/me"
                  className={(state) => `${navClass(state)} inline-block max-w-[10rem] truncate align-middle`}
                  title={`Your account (${user.username})`}
                  aria-label={`Your account (${user.username})`}
                >
                  {/* Phones: three links plus the wordmark leave no room for a name. */}
                  <span className="sm:hidden">Me</span>
                  <span className="hidden sm:inline">{user.username}</span>
                </NavLink>
              </>
            ) : status === 'anon' ? (
              <NavLink to="/login" className={navClass}>
                Log in
              </NavLink>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>

      <footer className="border-t border-ink-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-[var(--muted)]">
          <span>© Tyler Bielman</span>
          <Link to="/privacy">Privacy</Link>
          <a href="https://noeasywayup.com/" target="_blank" rel="noreferrer">
            No Easy Way Up ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
