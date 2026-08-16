import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Braces, Code2, Gauge, Headphones, Laptop, LayoutTemplate, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Star, Workflow } from 'lucide-react';
import SEO from '../components/SEO';
import SectionTitle from '../components/SectionTitle';
import ServiceCard from '../components/ServiceCard';
import PortfolioGrid from '../components/PortfolioGrid';
import PricingCards from '../components/PricingCards';
import CTA from '../components/CTA';
import HomeMarketplace from '../components/HomeMarketplace';
import { homepageServiceCategories } from '../data/services';
import { testimonials } from '../data/testimonials';
import { combineSchemas, faqSchema, homeSchema } from '../config/seo';
import { industries } from '../data/industries';
import IndustryCard from '../components/IndustryCard';
import FAQ from '../components/FAQ';
import { faqQuestions } from '../data/faqs';
import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../catalog/CatalogContext';
import { getCatalogIcon } from '../catalog/icons';

const stats = [['50', '+', 'Projects Completed'], ['30', '+', 'Happy Clients'], ['100', '%', 'Responsive Design'], ['24', '/7', 'Support']];
const features = [
  [Sparkles, 'Modern & Professional Design'], [Smartphone, 'Mobile-First Development'], [Search, 'SEO-Friendly Structure'],
  [Gauge, 'Fast Loading Performance'], [Workflow, 'Clean & Maintainable Code'], [Headphones, 'Transparent Communication'],
  [ShieldCheck, 'Secure Development'], [BadgeCheck, 'Post-Launch Support'],
];
const process = [
  ['01', 'Discovery', 'Understand the business, audience and goals.'], ['02', 'Strategy', 'Plan website structure, user journey and visual direction.'],
  ['03', 'Design', 'Create a modern, responsive and conversion-focused interface.'], ['04', 'Development', 'Turn the approved design into a fast and scalable website.'],
  ['05', 'Testing', 'Test responsiveness, performance, usability and browsers.'], ['06', 'Launch', 'Deploy the website and provide post-launch support.'],
];
const technologyGroups = [
  [Code2, 'Frontend', ['ReactJS', 'Angular', 'HTML5', 'CSS3', 'JavaScript', 'Vite']],
  [Workflow, 'Backend', ['Node.js', 'Python', 'Ruby on Rails', 'PHP', 'Laravel']],
  [Smartphone, 'Mobile', ['React Native', 'Ionic', 'iOS', 'Android']],
  [ShoppingBag, 'CMS & E-commerce', ['WordPress', 'WooCommerce', 'Shopify', 'Magento', 'Spree Commerce']],
  [Laptop, 'Desktop / Realtime', ['Electron JS', 'WebSocket']],
];

function Counter({ target, suffix }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(Number(target)); observer.disconnect(); return; }
      const start = performance.now();
      const run = now => { const progress = Math.min((now - start) / 1100, 1); setValue(Math.floor(Number(target) * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) requestAnimationFrame(run); };
      requestAnimationFrame(run); observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);
  return <strong ref={ref}>{value}{suffix}</strong>;
}

export default function Home() {
  const { services } = useCatalog();
  const featuredServices = services.filter(service => service.isFeatured && service.isActive !== false && String(service.serviceType || '').toLowerCase() !== 'package').slice(0, 6);
  const homeServices = featuredServices.length ? featuredServices : homepageServiceCategories;
  return <>
    <SEO title="Web Design & React Development Agency" description="SiteArvo creates premium, responsive and SEO-friendly websites that help businesses build trust, attract customers and grow online." schema={combineSchemas(homeSchema, faqSchema(faqQuestions))} />
    <section className="hero">
      <div className="hero-orb hero-orb--one"></div><div className="hero-orb hero-orb--two"></div>
      <div className="container hero-grid">
        <div className="hero-copy"><span className="eyebrow"><i></i> We design, develop &amp; deliver</span><h1>Powerful Websites.<br /><span>Real Results.</span></h1><p>We design and develop fast, responsive and SEO-friendly websites that help businesses grow online.</p><div className="hero-actions"><Link to="/contact" className="button">Let's Build Your Website <ArrowRight size={18} /></Link><Link to="/portfolio" className="button button--secondary">View Our Work</Link><Link to="/admin/login" className="text-link hero-admin-link">Admin Login</Link></div></div>
        <div className="hero-visual" aria-label="SiteArvo website dashboard preview" role="img"><div className="dashboard-shell"><div className="browser-bar"><div><i></i><i></i><i></i></div><span>sitearvo.site</span><b></b></div><div className="dash-nav"><span className="mini-logo">SA</span><div><i></i><i></i><i></i></div><span className="dash-action" aria-hidden="true">Start</span></div><div className="dash-body"><span className="dash-chip">DIGITAL EXPERIENCES</span><h2>Built to make an<br /><em>impact.</em></h2><p></p><p></p><span className="dash-explore" aria-hidden="true">Explore work <ArrowRight size={14} /></span><div className="dash-cards"><div><LayoutTemplate /><b>Purposeful UI</b><span>Clear by design</span></div><div><Gauge /><b>Fast by default</b><span>Built to perform</span></div></div></div></div><div className="float-card float-card--top"><Gauge /><span><b>98</b> Performance</span></div><div className="float-card float-card--bottom"><BadgeCheck /><span><b>Built right</b> Responsive &amp; SEO-ready</span></div></div>
        <div className="trust-row">{['Responsive Design', 'SEO Friendly', 'Fast Performance', 'Modern UI/UX'].map(item => <span key={item}><BadgeCheck size={15} />{item}</span>)}</div>
      </div>
    </section>

    <section className="stats"><div className="container stats-grid">{stats.map(([target, suffix, label]) => <div key={label}><Counter target={target} suffix={suffix} /><span>{label}</span></div>)}</div></section>

    <HomeMarketplace />

    <section className="section"><div className="container"><SectionTitle eyebrow="Dynamic service catalog" title="Complete Digital Solutions" description="From websites and mobile apps to e-commerce and digital marketing, we provide everything your business needs to grow online." /><div className="services-grid">{homeServices.map(service => <ServiceCard key={service.slug || service.title} icon={getCatalogIcon(service.icon)} title={service.title} description={service.shortDescription || service.short} href={service.slug ? `/services/${service.slug}` : '/services'} />)}</div><div className="center-action"><Link to="/services" className="button button--secondary">View All Services <ArrowRight size={18} /></Link></div></div></section>

    <section className="section section--alt"><div className="container"><SectionTitle eyebrow="Our toolkit" title="Technologies We Work With" description="A focused stack selected for speed, maintainability and practical business outcomes—not an oversized logo cloud." /><div className="technology-grid">{technologyGroups.map(([Icon, title, items]) => <article className="technology-card" key={title}><Icon /><h3>{title}</h3><div>{items.map(item => <span key={item}>{item}</span>)}</div></article>)}</div></div></section>

    <section className="section section--alt"><div className="container why-grid"><div className="why-intro"><SectionTitle align="left" eyebrow="The SiteArvo standard" title="We Build Websites That Deliver Results" description="No templates-for-everyone approach. Your website is thoughtfully planned, professionally built and ready to support what comes next." /><Link to="/about" className="text-link">Meet SiteArvo <ArrowRight size={17} /></Link></div><div className="feature-grid">{features.map(([Icon, label]) => <div className="feature-item" key={label}><Icon /><span>{label}</span></div>)}</div></div></section>

    <section className="section process-section"><div className="container"><SectionTitle eyebrow="Our process" title="From Idea to Launch" description="A straightforward process designed for clarity, collaboration and consistent momentum." /><div className="process-timeline">{process.map(([number, title, description]) => <article key={number} className="process-card"><span className="process-marker">{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></div></section>

    <section className="section section--alt"><div className="container"><SectionTitle eyebrow="Industry-aware solutions" title="Web Solutions for Every Industry" description="We adapt the structure, functionality and user experience to the way each business actually works." /><div className="industries-preview">{industries.map(industry => <IndustryCard key={industry.id} industry={industry} compact />)}</div><div className="center-action"><Link to="/industries" className="button button--secondary">Explore Industries <ArrowRight size={18} /></Link></div></div></section>

    <section className="section section--alt"><div className="container"><SectionTitle eyebrow="Selected work" title="Selected Projects" description="Explore a few examples of the digital experiences SiteArvo can create for different businesses." /><PortfolioGrid limit={4} /><div className="center-action"><Link to="/portfolio" className="button button--secondary">View All Projects <ArrowRight size={18} /></Link></div></div></section>

    <section className="section"><div className="container"><SectionTitle eyebrow="Simple, flexible options" title="Choose the Right Starting Point" description="Every project is scoped around your goals. Tell us what you need and we'll recommend the right approach." /><PricingCards /></div></section>

    <section className="section testimonials section--alt"><div className="container"><SectionTitle eyebrow="Client feedback" title="What Our Clients Say" /><div className="testimonials-grid">{testimonials.map(item => <article className="testimonial-card" key={item.name}><div className="stars" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}</div><blockquote>“{item.quote}”</blockquote><div className="client"><span>{item.name.charAt(0)}</span><div><b>{item.name}</b><small>{item.role}</small></div></div></article>)}</div></div></section>
    <section className="section"><div className="container faq-layout"><SectionTitle align="left" eyebrow="Questions, answered" title="Frequently Asked Questions" description="Straightforward answers about timelines, technology, SEO, maintenance and deployment." /><FAQ /></div></section>
    <section className="section seo-resource-strip"><div className="container"><SectionTitle eyebrow="Planning resources" title="Make a Better Website Decision" description="Practical guidance for choosing the right website scope, technology and budget." /><div className="seo-resource-grid"><Link to="/website-development-company-india">Website Development in India <ArrowRight /></Link><Link to="/small-business-website-design-india">Small Business Website Design <ArrowRight /></Link><Link to="/react-development-company-india">React Development in India <ArrowRight /></Link><Link to="/guides/website-development-cost-india">Website Development Cost Guide <ArrowRight /></Link></div></div></section>
    <CTA />
  </>;
}
