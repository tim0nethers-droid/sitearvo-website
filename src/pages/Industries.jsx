import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import IndustryCard from '../components/IndustryCard';
import CTA from '../components/CTA';
import { industries } from '../data/industries';

export default function Industries() {
  return <><SEO title="Industries We Serve" description="SiteArvo creates tailored web experiences for startups, professional services, e-commerce, education, healthcare, real estate, hospitality and local businesses." path="/industries" /><PageHero eyebrow="Industries" title="Digital Solutions for Growing Businesses">SiteArvo creates modern web experiences for businesses across different industries, adapting design, functionality and user experience to each business requirement.</PageHero><section className="section"><div className="container industries-grid">{industries.map(industry => <IndustryCard key={industry.id} industry={industry} />)}</div></section><CTA /></>;
}
