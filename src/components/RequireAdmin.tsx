import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import RequireAuth from './RequireAuth';
import { PageHeader } from './ui';

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader kicker="Admin" title="Admins only">
          This part of Gametronyx is for Tyler. <Link to="/play">Back to your playtests</Link>.
        </PageHeader>
      </div>
    );
  }
  return <>{children}</>;
}

export default function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminOnly>{children}</AdminOnly>
    </RequireAuth>
  );
}
