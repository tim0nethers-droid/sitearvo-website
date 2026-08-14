import { ArrowLeft, Compass } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFound() {
  const location = useLocation();
  return <section className="not-found"><SEO title="Page Not Found" description="The page you requested could not be found." path={location.pathname} noIndex /><div className="not-found-code">4<Compass />4</div><h1>Looks Like This Page Took a Detour</h1><p>The page may have moved, or the address might not be quite right.</p><Link to="/" className="button"><ArrowLeft /> Back to Home</Link></section>;
}
