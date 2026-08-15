import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { company } from '../src/config/company.js';
import { breadcrumbSchema, collectionSchema, combineSchemas, faqSchema, hasSchemaType, homeSchema as businessSchema, serviceSchema, webPageSchema } from '../src/config/seo.js';
import { faqQuestions } from '../src/data/faqs.js';
import { serviceCategories } from '../src/data/services.js';
import { projects } from '../src/data/portfolio.js';
import { seoPages } from '../src/data/seoPages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const organizationId = `${company.domain}/#organization`;
const defaultImage = `${company.domain}/og.png`;
const indexDirective = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

const staticPages = [
  ['/', 'Web Design & React Development Agency', 'SiteArvo creates premium, responsive and SEO-friendly websites that help businesses build trust, attract customers and grow online.'],
  ['/about', 'About SiteArvo Web Design Agency', 'Meet SiteArvo, an India-based web design and development agency creating fast, professional and result-driven digital experiences.'],
  ['/services', 'Web Design, App Development & SEO Services', 'Explore SiteArvo website design, React development, mobile apps, e-commerce, SEO, digital marketing and custom software services in India.'],
  ['/industries', 'Website & App Solutions by Industry', 'SiteArvo creates tailored digital solutions for e-commerce, education, healthcare, real estate, hospitality, startups and local businesses.'],
  ['/portfolio', 'Website Design & Development Portfolio', 'Explore SiteArvo website design, React development, e-commerce, landing page, dashboard and UI/UX concept projects.'],
  ['/pricing', 'Website, App & SEO Packages and Pricing', 'Compare SiteArvo website, e-commerce, mobile app, SEO and digital marketing packages with transparent fixed and starting prices in India.'],
  ['/contact', 'Contact SiteArvo for Website Development', 'Contact SiteArvo for website design, React development, e-commerce, mobile apps, SEO and digital project requirements in India.'],
  ['/privacy-policy', 'Privacy Policy', 'Read how SiteArvo handles information shared through website enquiries, project discussions and business communications.'],
  ['/terms-and-conditions', 'Terms & Conditions', 'Read the general SiteArvo website usage and digital service terms covering project proposals, payments and responsibilities.'],
];

const pages = new Map(staticPages.map(([route, title, description]) => [route, { title, description }]));

seoPages.forEach(page => {
  const route = `/${page.slug}`;
  pages.set(route, {
    title: page.metaTitle,
    description: page.metaDescription,
    type: page.article ? 'article' : 'website',
    bodyHtml: renderSeoLandingBody(page),
    schema: combineSchemas(
      page.article ? {
        '@type': 'Article', headline: page.title, description: page.metaDescription,
        mainEntityOfPage: `${company.domain}${route}`, image: defaultImage,
        datePublished: '2026-08-13', dateModified: '2026-08-13', author: { '@id': organizationId },
        publisher: { '@id': organizationId }, inLanguage: 'en-IN',
      } : null,
      faqSchema(page.faqs),
      breadcrumbSchema([{ name: 'Home', path: '/' }, { name: page.title, path: route }]),
    ),
  });
});

serviceCategories.forEach(category => {
  pages.set(`/services/category/${category.id}`, {
    title: `${category.title} Services`,
    description: category.description,
    schema: collectionSchema({ name: category.title, description: category.description, path: `/services/category/${category.id}`, items: category.services.map(service => ({ title: service.title, path: `/services/${service.slug}` })) }),
  });
  category.services.forEach(service => addServicePage(pages, {
    ...service,
    name: service.title,
    slug: service.slug,
    short_description: service.shortDescription,
    seo_title: service.seoTitle,
    seo_description: service.seoDescription,
  }, category));
});

projects.forEach(project => {
  const route = `/portfolio/${project.slug}`;
  pages.set(route, {
    title: `${project.title} Concept — Portfolio`,
    description: `${project.shortDescription} Explore the approach and features behind this SiteArvo concept project.`,
    type: 'article',
    schema: combineSchemas({
      '@type': 'CreativeWork', name: `${project.title} — Concept Project`, description: project.shortDescription,
      url: `${company.domain}${route}`, creator: { '@id': organizationId },
      keywords: project.technologies.join(', '), genre: project.category,
    }, breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Portfolio', path: '/portfolio' }, { name: project.title, path: route }])),
  });
});

try {
  const response = await fetch(`${company.domain}/api/catalog`, { signal: AbortSignal.timeout(5000) });
  if (response.ok) {
    const payload = await response.json();
    (payload?.data?.categories || []).filter(category => Number(category.is_active) !== 0).forEach(category => {
      pages.set(`/services/category/${category.slug}`, {
        title: category.seo_title || `${category.name} Services`,
        description: category.seo_description || category.short_description || category.description,
        schema: collectionSchema({ name: category.name, description: category.short_description || category.description, path: `/services/category/${category.slug}`, items: (category.services || []).filter(service => Number(service.is_active) !== 0).map(service => ({ title: service.name, path: `/services/${service.slug}` })) }),
      });
      (category.services || []).filter(service => Number(service.is_active) !== 0).forEach(service => addServicePage(pages, service, category));
    });
  }
} catch {
  console.warn('Live catalog unavailable; SEO pages generated from the bundled catalog.');
}

const serviceItems = [...pages.keys()].filter(route => route.startsWith('/services/') && !route.startsWith('/services/category/')).map(route => ({ title: pages.get(route).title, path: route }));
pages.get('/').schema = combineSchemas(businessSchema, faqSchema(faqQuestions));
pages.get('/services').schema = collectionSchema({ name: 'SiteArvo Digital Services', description: pages.get('/services').description, path: '/services', items: serviceItems });
pages.get('/pricing').schema = collectionSchema({ name: 'SiteArvo Service Packages and Pricing', description: pages.get('/pricing').description, path: '/pricing', items: serviceItems });
pages.get('/portfolio').schema = collectionSchema({ name: 'SiteArvo Website Design Portfolio', description: pages.get('/portfolio').description, path: '/portfolio', items: projects.map(project => ({ title: project.title, path: `/portfolio/${project.slug}` })) });

for (const [route, metadata] of pages) await writeRoute(route, metadata);
for (const route of ['/cart', '/checkout', '/admin', '/admin/login']) {
  await writeRoute(route, {
    title: route.startsWith('/admin') ? 'SiteArvo Admin' : 'Private Service Enquiry',
    description: 'This page is not intended for search engine results.',
    noIndex: true,
  });
}
await writeFile(path.join(dist, '404.html'), renderHtml({
  route: '/404', title: 'Page Not Found', description: 'The requested SiteArvo page could not be found.', noIndex: true,
}), 'utf8');

function addServicePage(target, service, category) {
  const route = `/services/${service.slug}`;
  const title = service.seo_title || service.seoTitle || `${service.name || service.title} Services`;
  const description = service.seo_description || service.seoDescription || service.short_description || service.shortDescription || service.description;
  target.set(route, {
    title,
    description,
    bodyHtml: renderServiceBody(service, category),
    schema: serviceSchema({
      ...service,
      title: service.name || service.title,
      shortDescription: service.short_description || service.shortDescription || service.description,
      seoDescription: description,
      categoryTitle: category.name || category.title,
      categorySlug: category.slug || category.id,
      priceType: service.price_type || service.priceType,
      basePrice: service.base_price ?? service.basePrice,
      salePrice: service.sale_price ?? service.salePrice,
      regularPrice: service.regular_price ?? service.regularPrice,
    }),
  });
}

async function writeRoute(route, metadata) {
  const outputDirectory = route === '/' ? dist : path.join(dist, route.slice(1));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), renderHtml({ route, ...metadata }), 'utf8');
}

function renderHtml({ route, title, description, type = 'website', noIndex = false, schema, bodyHtml = '', canonical: canonicalOverride }) {
  const fullTitle = title.includes(company.name) ? title : `${title} | ${company.name}`;
  const canonicalPath = canonicalOverride || route;
  const canonical = `${company.domain}${canonicalPath === '/' ? '/' : canonicalPath.replace(/\/$/, '')}`;
  const robots = noIndex ? 'noindex, nofollow' : indexDirective;
  const values = {
    title: escapeHtml(fullTitle), description: escapeHtml(description), canonical: escapeHtml(canonical),
    type: escapeHtml(type), robots, image: defaultImage,
  };
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${values.title}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${values.description}" />`)
    .replace(/<meta name="robots"[^>]*>/i, `<meta name="robots" content="${values.robots}" />`)
    .replace(/<meta name="googlebot"[^>]*>/i, `<meta name="googlebot" content="${values.robots}" />`)
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${values.canonical}" />`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${values.title}" />`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${values.description}" />`)
    .replace(/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="${values.type}" />`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${values.canonical}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${values.title}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${values.description}" />`);
  const automaticSchema = combineSchemas(
    schema,
    webPageSchema({ name: fullTitle, description, path: route }),
    route === '/' || hasSchemaType(schema, 'BreadcrumbList') ? null : breadcrumbSchema([{ name: 'Home', path: '/' }, { name: title, path: route }]),
  );
  html = html.replace('</head>', `    <script id="sitearvo-page-schema" type="application/ld+json">${JSON.stringify(automaticSchema).replace(/<\//g, '<\\/')}</script>\n  </head>`);
  if (bodyHtml) html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  return html;
}

function renderSeoLandingBody(page) {
  const sectionHtml = page.sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2>${(section.paragraphs || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}${section.bullets?.length ? `<ul>${section.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('');
  const faqHtml = page.faqs.map(([question, answer]) => `<article><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></article>`).join('');
  const relatedHtml = page.related.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('');
  return `<main><section class="seo-landing-hero"><div class="container"><span class="eyebrow">${escapeHtml(page.eyebrow)}</span><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.intro)}</p></div></section><section class="section"><div class="container seo-content-layout"><article class="seo-longform">${sectionHtml}</article><aside class="seo-related"><span>Explore SiteArvo</span>${relatedHtml}<a class="button" href="/contact">Discuss Your Project</a></aside></div></section><section class="section section--alt"><div class="container seo-faq"><div><span class="eyebrow">Helpful answers</span><h2>Frequently Asked Questions</h2></div><div>${faqHtml}</div></div></section></main>`;
}

function renderServiceBody(service, category) {
  const name = service.name || service.title;
  const description = service.description || service.short_description || service.shortDescription || service.seo_description || service.seoDescription;
  const featureItems = service.features || service.capabilities || [];
  const features = featureItems.map(feature => typeof feature === 'string' ? feature : feature.name).filter(Boolean);
  const heroFacts = [
    service.pagesIncluded ? { label: 'Pages', value: service.pagesIncluded } : { label: 'Scope', value: 'Custom' },
    service.deliveryTime ? { label: 'Delivery', value: service.deliveryTime } : { label: 'Timeline', value: 'Flexible' },
    service.revisions ? { label: 'Revisions', value: service.revisions } : { label: 'Support', value: 'Included' },
  ];
  const heroHighlights = (features.length ? features : ['Modern, professional design', 'Responsive development', 'Clean, maintainable implementation', 'Performance and SEO awareness']).slice(0, 4);
  const rawPrice = service.sale_price ?? service.salePrice ?? service.base_price ?? service.basePrice;
  const amount = Number(rawPrice);
  const priceType = service.price_type || service.priceType;
  const price = Number.isFinite(amount) && amount >= 0 ? (amount === 0 ? 'FREE' : `${priceType === 'starting_from' ? 'Starting from ' : ''}${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)}`) : 'Custom Quote';
  return `<main><section class="service-detail-hero"><div class="container"><nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/services">Services</a></li><li><a href="/services/category/${escapeHtml(category.slug || category.id)}">${escapeHtml(category.name || category.title)}</a></li></ol></nav><div class="service-detail-hero-grid"><div class="service-detail-hero-copy"><span class="eyebrow">${escapeHtml(category.name || category.title)}</span><h1>${escapeHtml(name)}</h1><p>${escapeHtml(description)}</p><div class="package-price-line"><strong>${escapeHtml(price)}</strong><span>${priceType === 'fixed' ? 'Fixed Price' : 'Custom Quote'}</span></div><div class="package-facts">${heroFacts.map(item => `<span><b>${escapeHtml(item.value)}</b> ${escapeHtml(item.label)}</span>`).join('')}</div><div class="hero-actions"><a class="button button--secondary" href="/website-builder?package=${escapeHtml(service.slug)}">${escapeHtml(price === 'FREE' ? 'Customize Free Website' : 'Customize Package')}</a><a class="button" href="/contact?service=${escapeHtml(service.slug)}">Discuss Your Project</a></div></div><aside class="service-detail-summary"><span class="eyebrow">Project snapshot</span><h2>What this service is built to deliver</h2><p>This package is tailored for businesses that need a polished, responsive presence with a clear path from enquiry to launch.</p><div class="service-detail-summary__price"><strong>${escapeHtml(price)}</strong><span>${priceType === 'fixed' ? 'Transparent pricing' : 'Custom scope planning'}</span></div><div class="service-detail-summary__facts">${heroFacts.map(item => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}</div><ul class="service-detail-summary__list">${heroHighlights.map(feature => `<li><span aria-hidden="true">✓</span><span>${escapeHtml(feature)}</span></li>`).join('')}</ul><div class="service-detail-summary__actions"><a class="button button--secondary" href="/website-builder?package=${escapeHtml(service.slug)}">${escapeHtml(price === 'FREE' ? 'Customize Free Website' : 'Customize Package')}</a><a class="button" href="/contact?service=${escapeHtml(service.slug)}">Discuss Your Project</a></div></aside></div></div></section><section class="section"><div class="container service-overview"><div><span class="eyebrow">Overview</span><h2>Professional ${escapeHtml(name)}</h2></div><p>${escapeHtml(description)}</p></div></section>${features.length ? `<section class="section section--alt"><div class="container"><div class="detail-heading"><span class="eyebrow">What is included</span><h2>Features and Capabilities</h2></div><div class="capability-grid">${features.map(feature => `<article><span>${escapeHtml(feature)}</span></article>`).join('')}</div></div></section>` : ''}</main>`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
}
