import { useMemo, useState } from 'react';
import { projects, portfolioCategories } from '../data/portfolio';
import PortfolioCard from './PortfolioCard';

export default function PortfolioGrid({ limit, showFilters = !limit }) {
  const [filter, setFilter] = useState('All');
  const filtered = useMemo(() => {
    const matches = filter === 'All' ? projects : projects.filter(project => project.category === filter);
    return matches.slice(0, limit || matches.length);
  }, [filter, limit]);

  return <>
    {showFilters && <div className="filters" role="group" aria-label="Filter projects by category">{portfolioCategories.map(category => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)} className={filter === category ? 'active' : ''}>{category}</button>)}</div>}
    {filtered.length ? <div className={`portfolio-grid ${limit ? 'portfolio-grid--compact' : ''}`}>{filtered.map(project => <PortfolioCard key={project.id} project={project} compact={!!limit} />)}</div> : <div className="portfolio-empty"><h2>No projects found in this category.</h2><p>Explore all projects or discuss your project with us.</p><button type="button" className="button button--secondary" onClick={() => setFilter('All')}>View All Projects</button></div>}
  </>;
}
