import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Faux from './Faux';

function Wordmark() {
  return (
    <Link to="/" className="flex min-h-[44px] items-center" aria-label="Gametronyx home">
      <img src="/brand/gametronyx-logo.webp" alt="" width={1200} height={224} className="h-5 w-auto sm:h-7" />
    </Link>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[44px] items-center px-2 font-display text-[15px] uppercase tracking-wide no-underline focus-visible:outline-amber sm:text-base ${
    isActive ? 'text-amber' : 'text-fg-inverse hover:text-amber'
  }`;

export default function Layout({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-char">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1">
          <Wordmark />
          <nav aria-label="Main" className="flex items-center sm:gap-2">
            {status === 'authed' && user ? (
              <>
                <NavLink to="/play" className={navClass}>
                  Play
                </NavLink>
                <NavLink to="/schedule" className={navClass}>
                  Schedule
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={(state) => `${navClass(state)} hidden sm:flex`}>
                    Admin
                  </NavLink>
                )}
                <NavLink
                  to="/me"
                  className={(state) => `${navClass(state)} max-w-[10rem]`}
                  title={`Your account (${user.username})`}
                  aria-label={`Your account (${user.username})`}
                >
                  {/* Phones: three links plus the logo leave no room for a name. */}
                  <span className="sm:hidden">Me</span>
                  <span className="hidden truncate sm:inline">{user.username}</span>
                </NavLink>
              </>
            ) : status === 'anon' ? (
              <NavLink to="/login" className={navClass}>
                Log in
              </NavLink>
            ) : null}
          </nav>
        </div>
        <div className="stripe" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>

      <footer className="border-t border-line bg-casing">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-fg-3">
          <Faux text="Quality mark · GT works" className="font-mono text-xs tracking-[0.12em]" />
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
