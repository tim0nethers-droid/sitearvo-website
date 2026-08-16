import { AppIcon } from '../catalog/icons';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import PortfolioGrid from '../components/PortfolioGrid';
import CTA from '../components/CTA';
import { projects } from '../data/portfolio';
import { collectionSchema } from '../config/seo';

const disciplines = [['layout-template', 'Web Design'], ['code2', 'React Development'], ['shopping-bag', 'E-commerce'], ['palette', 'UI/UX']];

export default function Portfolio() {
  return <>
    <SEO title="Website Design & Development Portfolio" description="Explore SiteArvo website design, React development, e-commerce, landing page, dashboard and UI/UX concept projects." path="/portfolio" schema={collectionSchema({ name: 'SiteArvo Website Design Portfolio', description: 'Website, e-commerce, dashboard and application concept projects by SiteArvo.', path: '/portfolio', items: projects.map(project => ({ title: project.title, path: `/portfolio/${project.slug}` })) })} />
    <PageHero eyebrow="Our work" title="Web Experiences Built to Make an Impact">Explore website, e-commerce, landing page and digital product concepts created to demonstrate SiteArvo&apos;s design and development capabilities.</PageHero>
    <section className="portfolio-disciplines" aria-label="Portfolio capabilities"><div className="container">{disciplines.map(([icon, label]) => <div key={label}><AppIcon icon={icon} aria-hidden="true" /><span>{label}</span></div>)}</div></section>
    <section className="section portfolio-page"><div className="container"><div className="portfolio-intro"><span className="eyebrow">Concept-led showcase</span><h2>Ideas shaped into clear digital experiences.</h2><p>Every item below is clearly marked as a concept or demo. It demonstrates a design direction—not a claim of commissioned client work.</p></div><PortfolioGrid /></div></section>
    <CTA />
  </>;
}

