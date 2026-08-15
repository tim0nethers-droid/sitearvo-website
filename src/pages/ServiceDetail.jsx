import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import CTA from '../components/CTA';
import WebsiteConfigurator from '../components/WebsiteConfigurator';
import { trackAnalyticsEvent } from '../components/Analytics';
import { useCatalog } from '../catalog/CatalogContext';
import { getCatalogIcon } from '../catalog/icons';
import { effectivePrice, formatPrice, hasValidPrice, priceLabel } from '../catalog/format';
import { useCart } from '../cart/CartContext';
import { serviceSchema } from '../config/seo';
import { company, whatsappUrl } from '../config/company';

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

  useEffect(() => {
    setSelected({});
  }, [slug]);

  useEffect(() => {
    if (!service) return;
    trackAnalyticsEvent('service_viewed', {
      service_id: service?.id,
      service_slug: service?.slug,
      service_name: service?.title || service?.name,
      onceKey: `service_viewed:${service?.slug || service?.id || 'unknown'}`,
    });
  }, [service?.id, service?.slug]);

  if (loading && !service) return <div className="page-loading"><span className="loading-spinner" /> Loading the latest package...</div>;
  if (!service) return <ServiceNotFound error={error} onRetry={refresh} />;
  const Icon = getCatalogIcon(service.icon);
  const priceIsValid = service.priceType === 'fixed' && hasValidPrice(service);
  const canOrder = priceIsValid && service.isActive !== false && service.active !== false && service.addToCartEnabled !== false && service.add_to_cart_enabled !== false;
  const discussionLabel = service.slug === 'hire-full-time-developers' ? 'Discuss Your Requirement' : 'Discuss Your Project';
  const features = (service.features || service.capabilities || []).map(feature => typeof feature === 'string' ? feature : feature.name);
  const isDemoPrice = service.isDemoPrice || service.is_demo_price;
  const websiteBuilderUrl = `/website-builder?package=${encodeURIComponent(service.slug)}`;
  const orderWhatsAppMessage = `Hi SiteArvo, I am interested in ${service.title} (${service.slug}) from ${company.domain}. Please share the next steps.`;
  const orderWhatsAppLink = whatsappUrl(orderWhatsAppMessage);
  const canCustomizePackage = service.priceType === 'fixed' || String(service.serviceType || service.service_type || '').toLowerCase() === 'package';
  const customizeLabel = effectivePrice(service) === 0 ? 'Customize Free Website' : 'Customize Package';
  const heroFacts = [
    service.pagesIncluded ? { label: 'Pages', value: service.pagesIncluded } : { label: 'Scope', value: 'Custom' },
    service.deliveryTime ? { label: 'Delivery', value: service.deliveryTime } : { label: 'Timeline', value: 'Flexible' },
    service.revisions ? { label: 'Revisions', value: service.revisions } : { label: 'Support', value: 'Included' },
  ];
  const heroHighlights = (features.length ? features : strengths).slice(0, 4);

  const addToCart = () => {
    addService(service, selectedAddons);
    navigate('/cart');
  };

  return <>
    <SEO title={service.seoTitle || service.title} description={service.seoDescription || service.shortDescription} path={`/services/${service.slug}`} schema={serviceSchema(service)} />
    <section className="service-detail-hero"><div className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><ol><li><Link to="/">Home</Link><ChevronRight /></li><li><Link to="/services">Services</Link><ChevronRight /></li><li><Link to={`/services/category/${service.categorySlug}`}>{service.categoryTitle}</Link><ChevronRight /></li><li aria-current="page">{service.title}</li></ol></nav>
      <div className="service-detail-hero-grid">
        <div className="service-detail-hero-copy">
          <div className="service-detail-title-icon" aria-hidden="true"><Icon strokeWidth={1.8} /></div>
          <span className="eyebrow">{service.categoryTitle}</span>
          <h1>{service.title}</h1>
          <p>{service.shortDescription}</p>
          <div className="package-price-line"><strong>{priceIsValid || service.priceType !== 'fixed' ? priceLabel(service) : 'Price Not Set'}</strong>{service.priceType === 'fixed' && priceIsValid && <span>Fixed Price</span>}{service.priceType === 'fixed' && !priceIsValid && <span>Price Not Set</span>}{isDemoPrice && <span>Development Demo Price</span>}</div>
          <div className="package-facts">{heroFacts.map(item => <span key={item.label}><b>{item.value}</b>{` ${item.label}`}</span>)}</div>
          <div className="hero-actions"><Link className="button button--secondary" to={websiteBuilderUrl}>{customizeLabel}</Link>{canOrder ? <button className="button" type="button" onClick={addToCart}><ShoppingCart size={18} /> Add to Cart</button> : <Link className="button" to={`/contact?service=${service.slug}`}>Request Quote <ArrowRight size={18} /></Link>}{orderWhatsAppLink ? <a className="button button--secondary" href={orderWhatsAppLink} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Order on WhatsApp</a> : <Link className="button button--secondary" to={`/contact?service=${service.slug}`}>Order on WhatsApp</Link>}</div>
          {service.priceType === 'fixed' && !priceIsValid && <p className="builder-summary__note">Add to Cart is unavailable until a valid fixed price is entered for this product.</p>}
        </div>
        <aside className="service-detail-summary">
          <span className="eyebrow">Project snapshot</span>
          <h2>What this service is built to deliver</h2>
          <p>This package is tailored for businesses that need a polished, responsive presence with a clear path from enquiry to launch.</p>
          <div className="service-detail-summary__price">
            <strong>{priceIsValid || service.priceType !== 'fixed' ? priceLabel(service) : 'Custom Quote'}</strong>
            <span>{service.priceType === 'fixed' ? 'Transparent pricing' : 'Custom scope planning'}</span>
          </div>
          <div className="service-detail-summary__facts">
            {heroFacts.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
          </div>
          <ul className="service-detail-summary__list">
            {heroHighlights.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}
          </ul>
          <div className="service-detail-summary__actions">
            <Link className="button button--secondary" to={websiteBuilderUrl}>{customizeLabel}</Link>
            {canOrder ? <button className="button" type="button" onClick={addToCart}><ShoppingCart size={18} /> Add to Cart</button> : <Link className="button" to={`/contact?service=${service.slug}`}>Request Quote <ArrowRight size={18} /></Link>}
          </div>
        </aside>
      </div>
    </div></section>
    {canCustomizePackage && <section className="section section--alt service-detail-builder"><div className="container"><div className="detail-heading"><span className="eyebrow">Customize Your Website</span><h2>Choose only the services you need. Your price updates instantly.</h2><p>Use the live configurator below to tailor this package with independent options for technology, domain, hosting, SEO, design and support.</p></div><WebsiteConfigurator presetPackage={service} /></div></section>}
    <section className="section"><div className="container service-overview"><div><span className="eyebrow">Overview</span><h2>Focused expertise for a practical digital outcome</h2></div><p>{service.description}</p></div></section>
    <section className="section section--alt"><div className="container"><div className="detail-heading"><span className="eyebrow">What's included</span><h2>Package Features</h2></div><div className="capability-grid">{features.map(item => <article key={item}><Check /><span>{item}</span></article>)}</div>{service.pagesIncluded && <p className="page-explanation"><b>What counts as a page?</b> {settings.page_explanation}</p>}</div></section>
    {!canCustomizePackage && canOrder && service.addons?.length > 0 && <section className="section"><div className="container"><div className="detail-heading"><span className="eyebrow">Optional add-ons</span><h2>Customize Your Package</h2></div><div className="addon-customizer">{service.addons.map(addon => { const quantity = selected[addon.id] || 0; return <article key={addon.id}><div><h3>{addon.name}</h3><p>{addon.description}</p><strong>{addon.pricing_type === 'custom_quote' ? 'Custom Quote' : `${formatPrice(addon.price)}${addon.pricing_unit ? ` / ${addon.pricing_unit}` : ''}`}</strong></div>{addon.pricing_type === 'custom_quote' ? <Link to={`/contact?service=${service.slug}`} className="button button--secondary">Discuss</Link> : <div className="quantity-control"><button type="button" aria-label={`Remove ${addon.name}`} onClick={() => setSelected(current => ({ ...current, [addon.id]: Math.max(0, quantity - 1) }))}><Minus /></button><output>{quantity}</output><button type="button" aria-label={`Add ${addon.name}`} onClick={() => setSelected(current => ({ ...current, [addon.id]: quantity + 1 }))}><Plus /></button></div>}</article>; })}<footer><span>Current total</span><strong>{formatPrice(total)}</strong><button className="button" type="button" onClick={addToCart}><ShoppingCart size={18} /> Add Customized Package</button></footer></div></div></section>}
    <section className="section"><div className="container detail-two-column"><div><div className="detail-heading"><span className="eyebrow">Value</span><h2>Key Benefits</h2></div><div className="benefit-list">{(service.benefits || strengths).map(item => <div key={item}><BadgeCheck /><span>{item}</span></div>)}</div></div><div><div className="detail-heading"><span className="eyebrow">Why us</span><h2>Why SiteArvo</h2></div><div className="benefit-list">{strengths.map(item => <div key={item}><BadgeCheck /><span>{item}</span></div>)}</div></div></div></section>
    <section className="section section--alt"><div className="container"><div className="detail-heading"><span className="eyebrow">How we work</span><h2>Our Development Process</h2></div><ol className="detail-process">{process.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><b>{item}</b></li>)}</ol></div></section>
    <CTA />
  </>;
}

function ServiceNotFound({ error, onRetry }) {
  return <><SEO title="Service Not Found" description="The requested SiteArvo service page is not available. Explore the complete service catalog." path="/404" noIndex /><section className="service-not-found"><div className="container"><span className="eyebrow">Service not found</span><h1>This Service Page Isn't Available</h1><p>{error || 'The service may be inactive, moved or the address may be incorrect.'}</p>{error && <button type="button" className="button button--secondary" onClick={onRetry}>Retry</button>} <Link to="/services" className="button"><ArrowLeft /> View All Services</Link></div></section></>;
}
