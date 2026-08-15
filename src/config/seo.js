import { company } from './company.js';

const organizationId = `${company.domain}/#organization`;
const websiteId = `${company.domain}/#website`;

const schemaNodes = schema => {
  if (!schema) return [];
  if (Array.isArray(schema)) return schema.flatMap(schemaNodes);
  if (Array.isArray(schema['@graph'])) return schema['@graph'];
  const { '@context': _context, ...node } = schema;
  return [node];
};

export const hasSchemaType = (schema, type) => schemaNodes(schema).some(node => node['@type'] === type);

export const combineSchemas = (...schemas) => {
  const seen = new Set();
  const graph = schemas.flatMap(schemaNodes).filter(node => {
    const key = node['@id'] || `${node['@type']}:${node.url || node.name || JSON.stringify(node.itemListElement || node.mainEntity || node)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { '@context': 'https://schema.org', '@graph': graph };
};

export const homeSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: company.name,
      url: company.domain,
      logo: { '@type': 'ImageObject', url: `${company.domain}/sitearvo-logo.png` },
      email: company.email,
      telephone: `+${company.phoneRaw}`,
      address: { '@type': 'PostalAddress', addressCountry: 'IN' },
      areaServed: { '@type': 'Country', name: company.location },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: `+${company.phoneRaw}`,
        email: company.email,
        contactType: 'sales and customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${company.domain}/`,
      name: company.name,
      publisher: { '@id': organizationId },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'ProfessionalService',
      '@id': `${company.domain}/#business`,
      name: company.name,
      url: company.domain,
      image: `${company.domain}/og.png`,
      email: company.email,
      telephone: `+${company.phoneRaw}`,
      priceRange: '₹₹',
      address: { '@type': 'PostalAddress', addressCountry: 'IN' },
      areaServed: { '@type': 'Country', name: company.location },
      parentOrganization: { '@id': organizationId },
      serviceType: ['Website Design', 'Web Development', 'React Development', 'E-commerce Development', 'Mobile App Development', 'SEO Services'],
    },
  ],
};

export const breadcrumbSchema = items => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${company.domain}${item.path}`,
  })),
});

export const webPageSchema = ({ name, description, path = '/', type = 'WebPage' }) => ({
  '@type': type,
  '@id': `${company.domain}${path === '/' ? '/' : path}#webpage`,
  url: `${company.domain}${path === '/' ? '/' : path}`,
  name,
  description,
  isPartOf: { '@id': websiteId },
  about: { '@id': organizationId },
  inLanguage: 'en-IN',
});

export const faqSchema = questions => ({
  '@type': 'FAQPage',
  mainEntity: questions.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
});

export const collectionSchema = ({ name, description, path, items = [] }) => combineSchemas(
  webPageSchema({ name, description, path, type: 'CollectionPage' }),
  breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name, path },
  ]),
  items.length ? {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name || item.title,
      url: `${company.domain}${item.path}`,
    })),
  } : null,
);

export const serviceSchema = service => {
  const path = `/services/${service.slug}`;
  const description = service.seoDescription || service.shortDescription || service.description;
  const price = Number(service.salePrice ?? service.sale_price ?? service.basePrice ?? service.base_price);
  const priceType = service.priceType || service.price_type;
  const isFixedPackage = priceType === 'fixed' && Number.isFinite(price) && price >= 0;
  const primaryNode = isFixedPackage ? {
    '@type': 'Product',
    '@id': `${company.domain}${path}#product`,
    name: service.title,
    description,
    url: `${company.domain}${path}`,
    image: service.image ? `${company.domain}${service.image}` : `${company.domain}/og.png`,
    category: service.categoryTitle,
    brand: { '@type': 'Brand', name: company.name },
    offers: {
      '@type': 'Offer',
      url: `${company.domain}${path}`,
      price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      seller: { '@id': organizationId },
    },
  } : {
    '@type': 'Service',
    '@id': `${company.domain}${path}#service`,
    name: service.title,
    description,
    url: `${company.domain}${path}`,
    serviceType: service.title,
    provider: { '@id': organizationId },
    areaServed: { '@type': 'Country', name: company.location },
    ...(Number.isFinite(price) && price >= 0 ? {
      offers: { '@type': 'Offer', price, priceCurrency: 'INR', url: `${company.domain}${path}` },
    } : {}),
  };
  return combineSchemas(
    webPageSchema({ name: service.title, description, path }),
    primaryNode,
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: service.categoryTitle || 'Service', path: `/services/category/${service.categorySlug}` },
      { name: service.title, path },
    ]),
  );
};

export const projectSchema = project => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CreativeWork',
      name: `${project.title} — Concept Project`,
      description: project.shortDescription,
      url: `${company.domain}/portfolio/${project.slug}`,
      creator: { '@id': organizationId },
      keywords: project.technologies.join(', '),
      genre: project.category,
    },
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Portfolio', path: '/portfolio' },
      { name: project.title, path: `/portfolio/${project.slug}` },
    ]),
  ],
});
