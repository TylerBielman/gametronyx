import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="404" title="Nothing here">
        That page doesn't exist, or it moved.
      </PageHeader>
      <Link to="/" className="btn ghost">
        Back to the games
      </Link>
    </div>
  );
}
