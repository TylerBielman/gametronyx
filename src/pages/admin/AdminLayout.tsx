import { NavLink, Outlet } from 'react-router-dom';

const TABS: [string, string][] = [
  ['activity', 'Activity'],
  ['players', 'Players'],
  ['codes', 'Invite codes'],
  ['requests', 'Requests'],
  ['games', 'Games'],
  ['slots', 'Sessions'],
  ['settings', 'Settings'],
];

export default function AdminLayout() {
  return (
    <div>
      <p className="kicker mb-2">Admin</p>
      <nav aria-label="Admin sections" className="-mx-4 mb-8 overflow-x-auto border-b border-ink-3 px-4">
        <ul className="flex min-w-max gap-1">
          {TABS.map(([path, label]) => (
            <li key={path}>
              <NavLink
                to={`/admin/${path}`}
                className={({ isActive }) =>
                  `block border-b-2 px-3 py-3 font-display text-xs uppercase tracking-widest no-underline ${
                    isActive ? 'border-gold text-gold' : 'border-transparent text-bone hover:text-gold'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
