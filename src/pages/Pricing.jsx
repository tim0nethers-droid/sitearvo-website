import { useMemo, useState } from 'react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import PricingCards from '../components/PricingCards';
import PackageComparison from '../components/PackageComparison';
import CTA from '../components/CTA';
import { useCatalog } from '../catalog/CatalogContext';
import { collectionSchema } from '../config/seo';

export default function Pricing() {
  const { categories, services } = useCatalog();
  const pricedCategories = categories.filter(category => category.services.some(service => service.isActive !== false && ['fixed', 'starting_from'].includes(service.priceType)));
  const [categoryId, setCategoryId] = useState('');
  const visiblePackages = useMemo(() => services.filter(service => (!categoryId || String(service.categoryId) === String(categoryId)) && service.isActive !== false && service.priceType === 'fixed' && service.basePrice !== null), [services, categoryId]);
  const pricedServices = services.filter(service => service.isActive !== false && ['fixed', 'starting_from'].includes(service.priceType));
  return <><SEO title="Website, App & SEO Packages and Pricing" description="Compare SiteArvo website, e-commerce, mobile app, SEO and digital marketing packages with transparent fixed and starting prices in India." path="/pricing" schema={collectionSchema({ name: 'SiteArvo Service Packages and Pricing', description: 'Fixed-price and starting-from digital service packages from SiteArvo.', path: '/pricing', items: pricedServices.map(service => ({ title: service.title, path: `/services/${service.slug}` })) })} /><PageHero eyebrow="Project options" title="Clear Packages, Configurable by SiteArvo">Published pricing, inclusions, delivery and add-ons come directly from the managed service catalog.</PageHero><section className="section"><div className="container">{pricedCategories.length > 0 && <div className="pricing-filters" role="group" aria-label="Filter packages by category"><button type="button" aria-pressed={!categoryId} onClick={() => setCategoryId('')}>All Packages</button>{pricedCategories.map(category => <button key={category.id} type="button" aria-pressed={String(categoryId) === String(category.id)} onClick={() => setCategoryId(category.id)}>{category.shortTitle || category.title}</button>)}</div>}<PricingCards categoryId={categoryId} /><PackageComparison packages={visiblePackages} /><p className="pricing-note">Custom-scope work is quoted separately. Third-party subscriptions, premium plugins and content production are shown clearly when they are not included.</p></div></section><CTA /></>;
}
