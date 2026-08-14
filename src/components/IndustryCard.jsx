import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IndustryCard({ industry, compact = false }) {
  const Icon = industry.icon;
  return <article className={`industry-card ${compact ? 'industry-card--compact' : ''}`}>
    <div className="icon-box"><Icon /></div>
    <h3>{industry.title}</h3>
    {!compact && <><div className="industry-detail"><span>Common challenge</span><p>{industry.challenge}</p></div><div className="industry-detail"><span>How SiteArvo helps</span><p>{industry.help}</p></div></>}
    {compact && <p>{industry.help}</p>}
    <div className="tags">{industry.services.map(item => <Link key={item.slug} to={`/services/${item.slug}`}>{item.label}</Link>)}</div>
    {!compact && <Link to="/contact" className="text-link">Discuss Your Website <ArrowRight size={17} /></Link>}
  </article>;
}
