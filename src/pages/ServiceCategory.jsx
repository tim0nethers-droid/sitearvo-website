import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import ServiceCatalogCard from '../components/ServiceCatalogCard';
import CTA from '../components/CTA';
import { useCatalog } from '../catalog/CatalogContext';
import { collectionSchema } from '../config/seo';

export default function ServiceCategory() {
  const { slug } = useParams();
  const { categories, loading, error, refresh } = useCatalog();
  const category = categories.find(item => (item.slug || item.id) === slug);
  if (loading && !category) return <div className="page-loading"><span className="loading-spinner" /> Loading category...</div>;
  if (!category) return <section className="service-not-found"><div className="container"><h1>Category Not Available</h1><p>{error || 'This category is inactive or does not exist.'}</p><button type="button" className="button button--secondary" onClick={refresh}>Retry</button> <Link className="button" to="/services"><ArrowLeft /> All Services</Link></div></section>;
  return <>
    <SEO title={category.seo_title || `${category.title} Services`} description={category.seo_description || category.description} path={`/services/category/${slug}`} schema={collectionSchema({ name: category.title, description: category.seo_description || category.description, path: `/services/category/${slug}`, items: category.services.map(service => ({ title: service.title, path: `/services/${service.slug}` })) })} />
    <PageHero eyebrow="Service category" title={category.title}>{category.description}</PageHero>
    <section className="section"><div className="container"><div className="catalog-service-grid">{category.services.length ? category.services.map(service => <ServiceCatalogCard key={service.slug} service={service} />) : <div className="empty-search"><h2>No packages are currently available</h2><p>Please check again soon or discuss a custom requirement with SiteArvo.</p><Link className="button" to="/contact">Request a Custom Quote</Link></div>}</div></div></section>
    <CTA />
  </>;
}
