import { ArrowLeft, ArrowRight, Check, Code2, Gauge, Layers3, LayoutTemplate, MessageCircle, Monitor, Smartphone, Tablet, Target } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import NotFound from './NotFound';
import PortfolioCard from '../components/PortfolioCard';
import ProjectMockup from '../components/ProjectMockup';
import { trackAnalyticsEvent } from '../components/Analytics';
import { projectBySlug, projects } from '../data/portfolio';
import { whatsappUrl } from '../config/company';
import { projectSchema } from '../config/seo';

const featureIcons = [Monitor, LayoutTemplate, Target, Layers3, Gauge, Smartphone, MessageCircle, Check];

export default function ProjectDetail() {
  const { slug } = useParams();
  const project = projectBySlug(slug);
  useEffect(() => {
    if (!project) return;
    trackAnalyticsEvent('portfolio_viewed', {
      entity_id: project.id,
      entity_type: 'portfolio_project',
      project_slug: project.slug,
      project_title: project.title,
      onceKey: `portfolio_viewed:${project.slug}`,
    });
  }, [project?.id, project?.slug]);

  if (!project) return <NotFound />;

  const related = projects.filter(item => item.slug !== project.slug && item.category === project.category).concat(projects.filter(item => item.slug !== project.slug && item.category !== project.category)).slice(0, 3);
  const projectWhatsApp = whatsappUrl(`Hi SiteArvo, I would like to discuss a project similar to the ${project.title} concept.`);

  return <>
    <SEO title={`${project.title} Concept — Portfolio`} description={`${project.shortDescription} Explore the approach, features and responsive design behind this SiteArvo ${project.type.toLowerCase()}.`} path={`/portfolio/${project.slug}`} schema={projectSchema(project)} />
    <section className="project-detail-hero"><div className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/portfolio">Portfolio</Link><span>/</span><span aria-current="page">{project.title}</span></nav>
      <span className="concept-label">{project.type} · {project.category}</span>
      <h1>{project.title}</h1><p>{project.description}</p>
      <div className="tags detail-hero-tags">{project.technologies.map(item => <span key={item}>{item}</span>)}</div>
      <div className="detail-actions"><Link to="/contact" className="button">Discuss a Similar Project <ArrowRight size={18} /></Link><Link to="/portfolio" className="button button--secondary"><ArrowLeft size={18} /> Back to Portfolio</Link></div>
    </div></section>

    <section className="section project-showcase"><div className="container"><ProjectMockup project={project} large /></div></section>

    <section className="section section--alt project-story"><div className="container">
      <div className="project-story-intro"><span className="eyebrow">Project overview</span><h2>What was built.</h2><p>{project.description}</p><div className="project-facts"><div><small>Project type</small><b>{project.category}</b></div><div><small>Industry</small><b>{project.industry}</b></div><div><small>Goal</small><b>{project.goal}</b></div><div><small>Platform</small><b>{project.platform}</b></div></div><div className="concept-notice"><Check /><p><b>{project.type}</b>This showcase demonstrates SiteArvo&apos;s design and development approach. It is not presented as commissioned client work.</p></div></div>
      <div className="project-story-cards"><article><Target /><span>The challenge</span><h2>A design scenario to solve</h2><p>{project.challenge}</p></article><article><Layers3 /><span>The solution</span><h2>Structure, experience and delivery</h2><p>{project.solution}</p></article></div>
    </div></section>

    <section className="section"><div className="container"><div className="section-title"><span className="eyebrow">Built with intent</span><h2>Key Features</h2><p>Practical features selected to support the project&apos;s audience and primary goals.</p></div><div className="project-feature-grid">{project.features.map((feature, index) => { const Icon = featureIcons[index % featureIcons.length]; return <article key={feature}><Icon aria-hidden="true" /><span>{feature}</span></article>; })}</div></div></section>

    <section className="section section--alt"><div className="container project-tech-layout"><div><span className="eyebrow">Technology choices</span><h2>Technologies Used</h2><p>A focused stack chosen for responsive delivery, maintainability and strong front-end performance.</p></div><div className="project-tech-pills">{project.technologies.map(item => <span key={item}><Code2Icon />{item}</span>)}</div></div></section>

    <section className="section responsive-project-section"><div className="container"><div className="section-title"><span className="eyebrow">Responsive by design</span><h2>Designed for Every Screen</h2><p>The same content hierarchy adapts thoughtfully across desktop, tablet and mobile—not simply squeezed into a smaller viewport.</p></div><div className="responsive-project-grid"><article><div className="device-label"><Monitor />Desktop</div><ProjectMockup project={project} device="desktop" /></article><article><div className="device-label"><Tablet />Tablet</div><ProjectMockup project={project} device="tablet" /></article><article><div className="device-label"><Smartphone />Mobile</div><ProjectMockup project={project} device="mobile" /></article></div></div></section>

    <section className="section section--alt related-projects"><div className="container"><div className="section-title"><span className="eyebrow">Continue exploring</span><h2>Explore More Projects</h2></div><div className="portfolio-grid">{related.map(item => <PortfolioCard key={item.id} project={item} compact />)}</div></div></section>

    <section className="cta-section section"><div className="container cta-box"><div><span className="eyebrow">Start a conversation</span><h2>Want a Similar Website?</h2><p>Tell us about your business and we&apos;ll help you plan the right digital solution.</p></div><div className="cta-actions"><Link className="button" to="/contact">Get a Free Quote</Link>{projectWhatsApp ? <a className="button button--secondary" href={projectWhatsApp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Discuss Your Project</a> : <Link className="button button--secondary" to="/contact">Discuss Your Project</Link>}</div></div></section>
  </>;
}

function Code2Icon() {
  return <Code2 aria-hidden="true" />;
}
