import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import CTA from '../components/CTA';
import ServiceCatalogCard from '../components/ServiceCatalogCard';
import { useCatalog } from '../catalog/CatalogContext';
import { AppIcon, getCatalogIcon } from '../catalog/icons';
import { collectionSchema } from '../config/seo';

export default function Services() {
  const { categories: serviceCategories, loading, error, refresh } = useCatalog();
  const [query, setQuery] = useState('');
  const [mobileCategory, setMobileCategory] = useState('web-development');
  const normalized = query.trim().toLowerCase();
  const filteredCategories = useMemo(() => serviceCategories.map(category => ({
    ...category,
    services: normalized ? category.services.filter(service => `${service.title} ${service.shortDescription} ${category.title}`.toLowerCase().includes(normalized)) : category.services,
  })).filter(category => category.services.length), [normalized]);
  const resultCount = filteredCategories.reduce((total, category) => total + category.services.length, 0);
  useEffect(() => { if (serviceCategories.length && !serviceCategories.some(category => category.id === mobileCategory)) setMobileCategory(serviceCategories[0].id); }, [serviceCategories, mobileCategory]);

  return <>
    <SEO title="Web Design, App Development & SEO Services" description="Explore SiteArvo website design, React development, mobile apps, e-commerce, SEO, digital marketing and custom software services in India." path="/services" schema={collectionSchema({ name: 'SiteArvo Digital Services', description: 'Website, app, e-commerce, SEO and custom development services from SiteArvo.', path: '/services', items: serviceCategories.flatMap(category => category.services).map(service => ({ title: service.title, path: `/services/${service.slug}` })) })} />
    <PageHero eyebrow="Our services" title="Complete Digital Capabilities">From websites and mobile applications to e-commerce, digital marketing and custom software solutions, SiteArvo helps businesses build, launch and grow digital products.</PageHero>
    <section className="service-directory-tools">
      <div className="container">
        <nav className="service-category-nav" aria-label="Service categories">{serviceCategories.map(category => <Link key={category.id} to={`/services/category/${category.slug || category.id}`}>{category.shortTitle}</Link>)}</nav>
        <label className="service-search"><AppIcon icon="search" aria-hidden="true" /><span className="sr-only">Search services</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search services..." /></label>
      </div>
    </section>
    <section className="section service-directory"><div className="container">
      {normalized && <p className="search-summary" aria-live="polite">{resultCount} {resultCount === 1 ? 'service' : 'services'} found for “{query.trim()}”</p>}
      {loading && <div className="catalog-status" aria-live="polite"><span className="loading-spinner" /> Loading the latest services...</div>}
      {!loading && error && <div className="catalog-status catalog-status--warning"><p>Live catalog is temporarily unavailable. Showing the built-in service catalog.</p><button className="button button--secondary" type="button" onClick={refresh}>Retry</button></div>}
      {filteredCategories.map((category, categoryIndex) => { const Icon = getCatalogIcon(category.icon); const expanded = !!normalized || mobileCategory === category.id; return <section id={category.id} className={`catalog-category ${expanded ? 'is-mobile-open' : ''}`} key={category.id}><button type="button" className="mobile-catalog-toggle" aria-expanded={expanded} aria-controls={`catalog-services-${category.id}`} onClick={() => setMobileCategory(current => current === category.id ? '' : category.id)}><span className="mobile-catalog-icon"><Icon strokeWidth={1.9} aria-hidden="true" /></span><span><b>{category.title}</b><small>{category.services.length} {category.services.length === 1 ? 'Service' : 'Services'}</small></span><AppIcon icon="chevron-down" aria-hidden="true" /></button><div className="catalog-category-head"><div className="icon-box"><Icon /></div><div><span>{String(categoryIndex + 1).padStart(2, '0')}</span><h2>{category.title}</h2><p>{category.description}</p><Link to={`/services/category/${category.slug || category.id}`} className="text-link catalog-category-cta">View Category</Link></div></div><div id={`catalog-services-${category.id}`} className="catalog-service-grid">{category.services.map(service => <ServiceCatalogCard key={service.slug} service={service} />)}</div></section>; })}
      {!resultCount && <div className="empty-search"><h2>No matching services</h2><p>Try a broader term such as React, Android, SEO, Python or Shopify.</p><button type="button" className="button button--secondary" onClick={() => setQuery('')}>Clear Search</button></div>}
    </div></section>
    <CTA />
  </>;
}
