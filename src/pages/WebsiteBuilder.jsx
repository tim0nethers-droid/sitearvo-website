import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import WebsiteConfigurator from '../components/WebsiteConfigurator';
import { useCart } from '../cart/CartContext';
import { useCatalog } from '../catalog/CatalogContext';

export default function WebsiteBuilder() {
  const [searchParams] = useSearchParams();
  const { items } = useCart();
  const { services } = useCatalog();
  const editItem = searchParams.get('edit') === '1' ? items.find(item => item.kind === 'website-configurator') : null;
  const selectedPackage = useMemo(() => {
    const slug = searchParams.get('package') || searchParams.get('slug');
    if (!slug) return null;
    return services.find(service => service.slug === slug && String(service.serviceType || service.service_type || '').toLowerCase() === 'package') || null;
  }, [searchParams, services]);

  return <>
    <SEO title="Build Your Website" description="Customize your website package in real time with SiteArvo's dynamic configurator." path="/website-builder" />
    <PageHero eyebrow="Website builder" title="Build Your Website">Choose your pages, technology and optional services. Your estimated price updates instantly.</PageHero>
    <section className="section section--alt">
      <div className="container">
        {editItem && <div className="builder-alert" role="status">Editing website configuration {editItem.configuration?.configuration_id || editItem.configurationSummary?.configurationId || ''}.</div>}
        {selectedPackage && !editItem && <div className="builder-alert" role="status">Customizing {selectedPackage.title}.</div>}
        <WebsiteConfigurator presetPackage={selectedPackage} editConfiguration={editItem?.configuration || editItem?.configurationSummary ? editItem.configuration || editItem.configurationSummary : null} />
      </div>
    </section>
  </>;
}
