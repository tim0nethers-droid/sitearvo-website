import { Link } from 'react-router-dom';

export default function Logo({ footer = false }) {
  return (
    <Link to="/" className={`brand ${footer ? 'brand--footer' : ''}`} aria-label="SiteArvo home">
      <span className="brand-logo-wrap">
        <img className="brand-logo" src="/sitearvo-logo.png" alt="SiteArvo SA logo" width="42" height="42" />
      </span>
      <span className="brand-name"><span>SITE</span><b>ARVO</b></span>
    </Link>
  );
}
