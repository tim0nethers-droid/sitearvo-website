import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import CTA from '../components/CTA';
import { useCatalog } from '../catalog/CatalogContext';
import { getCatalogIcon } from '../catalog/icons';
import { effectivePrice, formatPrice, priceLabel } from '../catalog/format';
import { useCart } from '../cart/CartContext';
import { serviceSchema } from '../config/seo';

const process = ['Requirement Analysis', 'Planning', 'UI/UX', 'Development', 'Testing', 'Deployment', 'Support'];
const strengths = ['Modern, professional design', 'Responsive development', 'Clean, maintainable implementation', 'Transparent communication', 'Performance and SEO awareness', 'Post-launch support'];

export default function ServiceDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { services, loading, error, refresh, settings } = useCatalog();
  const { addService } = useCart();
  const service = services.find(item => item.slug === slug);
  const [selected, setSelected] = useState({});
  const selectedAddons = useMemo(() => (service?.addons || []).filter(addon => selected[addon.id]).map(addon => ({ addon, quantity: selected[addon.id] })), [service, selected]);
  const total = effectivePrice(service) + selectedAddons.reduce((sum, item) => sum + effectivePrice(item.addon) * item.quantity, 0);

  if (loading && !service) return <div className="page-loading"><span className="loading-spinner" /> Loading the latest package...</div>;
  if (!service) return <ServiceNotFound error={error} onRetry={refresh} />;
  const Icon = getCatalogIcon(service.icon);
  const canOrder = service.priceType === 'fixed' && effectivePrice(service) > 0;
  const discussionLabel = service.slug === 'hire-full-time-developers' ? 'Discuss Your Requirement' : 'Discuss Your Project';
  const features = (service.features || service.capabilities || []).map(feature => typeof feature === 'string' ? feature : feature.name);

  const addToCart = () => {
    addService(service, selectedAddons);
    navigate('/cart');
  };

  return <>
    <SEO title={service.seoTitle || service.title} description={service.seoDescription || service.shortDescription} path={`/services/${service.slug}`} schema={serviceSchema(service)} />
    <section className="service-detail-hero"><div className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><ol><li><Link to="/">Home</Link><ChevronRight /></li><li><Link to="/services">Services</Link><ChevronRight /></li><li><Link to={`/services/category/${service.categorySlug}`}>{service.categoryTitle}</Link><ChevronRight /></li><li aria-current="page">{service.title}</li></ol></nav>
      <div className="service-detail-hero-grid"><div><div className="service-detail-title-icon" aria-hidden="true"><Icon strokeWidth={1.8} /></div><span className="eyebrow">{service.categoryTitle}</span><h1>{service.title}</h1><p>{service.shortDescription}</p><div className="package-price-line"><strong>{priceLabel(service)}</strong>{service.priceType === 'fixed' && <span>Fixed Price</span>}</div><div className="package-facts">{service.pagesIncluded && <span><b>{service.pagesIncluded}</b> Pages</span>}{service.deliveryTime && <span><b>{service.deliveryTime}</b> Delivery</span>}{service.revisions && <span><b>{service.revisions}</b> Revisions</span>}</div><div className="hero-actions">{canOrder ? <button className="button" type="button" onClick={addToCart}><ShoppingCart size={18} /> Add to Cart</button> : <Link className="button" to={`/contact?service=${service.slug}`}>Get a Free Quote <ArrowRight size={18} /></Link>}<Link className="button button--secondary" to={`/contact?service=${service.slug}`}>{discussionLabel}</Link></div></div><div className="service-detail-mark" aria-hidden="true"><Icon strokeWidth={1.7} /></div></div>
    </div></section>
    <section className="section"><div className="container service-overview"><div><span className="eyebrow">Overview</span><h2>Focused expertise for a practical digital outcome</h2></div><p>{service.description}</p></div></section>
    <section className="section section--alt"><div className="container"><div className="detail-heading"><span className="eyebrow">What's included</span><h2>Package Features</h2></div><div className="capability-grid">{features.map(item => <article key={item}><Check /><span>{item}</span></article>)}</div>{service.pagesIncluded && <p className="page-explanation"><b>What counts as a page?</b> {settings.page_explanation}</p>}</div></section>
    {canOrder && service.addons?.length > 0 && <section className="section"><div className="container"><div className="detail-heading"><span className="eyebrow">Optional add-ons</span><h2>Customize Your Package</h2></div><div className="addon-customizer">{service.addons.map(addon => { const quantity = selected[addon.id] || 0; return <article key={addon.id}><div><h3>{addon.name}</h3><p>{addon.description}</p><strong>{addon.pricing_type === 'custom_quote' ? 'Custom Quote' : `${formatPrice(addon.price)}${addon.pricing_unit ? ` / ${addon.pricing_unit}` : ''}`}</strong></div>{addon.pricing_type === 'custom_quote' ? <Link to={`/contact?service=${service.slug}`} className="button button--secondary">Discuss</Link> : <div className="quantity-control"><button type="button" aria-label={`Remove ${addon.name}`} onClick={() => setSelected(current => ({ ...current, [addon.id]: Math.max(0, quantity - 1) }))}><Minus /></button><output>{quantity}</output><button type="button" aria-label={`Add ${addon.name}`} onClick={() => setSelected(current => ({ ...current, [addon.id]: quantity + 1 }))}><Plus /></button></div>}</article>; })}<footer><span>Current total</span><strong>{formatPrice(total)}</strong><button className="button" type="button" onClick={addToCart}><ShoppingCart size={18} /> Add Customized Package</button></footer></div></div></section>}
    <section className="section"><div className="container detail-two-column"><div><div className="detail-heading"><span className="eyebrow">Value</span><h2>Key Benefits</h2></div><div className="benefit-list">{(service.benefits || strengths).map(item => <div key={item}><BadgeCheck /><span>{item}</span></div>)}</div></div><div><div className="detail-heading"><span className="eyebrow">Why us</span><h2>Why SiteArvo</h2></div><div className="benefit-list">{strengths.map(item => <div key={item}><BadgeCheck /><span>{item}</span></div>)}</div></div></div></section>
    <section className="section section--alt"><div className="container"><div className="detail-heading"><span className="eyebrow">How we work</span><h2>Our Development Process</h2></div><ol className="detail-process">{process.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><b>{item}</b></li>)}</ol></div></section>
    <CTA />
  </>;
}

function ServiceNotFound({ error, onRetry }) {
  return <><SEO title="Service Not Found" description="The requested SiteArvo service page is not available. Explore the complete service catalog." path="/404" noIndex /><section className="service-not-found"><div className="container"><span className="eyebrow">Service not found</span><h1>This Service Page Isn't Available</h1><p>{error || 'The service may be inactive, moved or the address may be incorrect.'}</p>{error && <button type="button" className="button button--secondary" onClick={onRetry}>Retry</button>} <Link to="/services" className="button"><ArrowLeft /> View All Services</Link></div></section></>;
}
