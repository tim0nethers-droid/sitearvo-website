import { ArrowUpRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectMockup from './ProjectMockup';

export default function PortfolioCard({ project, compact = false }) {
  return <article className={`portfolio-card ${compact ? 'portfolio-card--compact' : ''}`}>
    <Link to={`/portfolio/${project.slug}`} className="project-visual-link" aria-label={`View ${project.title} project details`}>
      <ProjectMockup project={project} />
    </Link>
    <div className="project-content">
      <div className="project-badges"><span>{project.type}</span><span>{project.category}</span></div>
      <h3><Link to={`/portfolio/${project.slug}`}>{project.title}</Link></h3>
      <p>{project.shortDescription}</p>
      <div className="project-industry"><Building2 aria-hidden="true" />Industry: {project.industry}</div>
      <div className="tags" aria-label="Technologies used">{project.technologies.slice(0, compact ? 3 : 4).map(item => <span key={item}>{item}</span>)}</div>
      <Link to={`/portfolio/${project.slug}`} className="text-link project-card-link">View Project <ArrowUpRight size={17} /></Link>
    </div>
  </article>;
}
