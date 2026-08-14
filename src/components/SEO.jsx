import { useEffect } from 'react';
import { company } from '../config/company';
import { breadcrumbSchema, combineSchemas, hasSchemaType, webPageSchema } from '../config/seo';

const upsertMeta = (attribute, name, content) => {
  let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
};

const canonicalPath = path => {
  const cleanPath = String(path || '/').split(/[?#]/)[0];
  if (cleanPath === '/') return '/';
  return `/${cleanPath.replace(/^\/+|\/+$/g, '')}`;
};

const routeMetadataOverrides = {
  '/about': {
    title: 'About SiteArvo Web Design Agency',
    description: 'Meet SiteArvo, an India-based web design and development agency creating fast, professional and result-driven digital experiences.',
  },
  '/privacy-policy': {
    description: 'Read how SiteArvo handles information shared through website enquiries, project discussions and business communications.',
  },
  '/terms-and-conditions': {
    description: 'Read the general SiteArvo website usage and digital service terms covering project proposals, payments and responsibilities.',
  },
};

export default function SEO({ title, description, path = '/', image = '/og.png', noIndex = false, type = 'website', schema }) {
  useEffect(() => {
    const routePath = canonicalPath(path);
    const override = routeMetadataOverrides[routePath] || {};
    const resolvedTitle = override.title || title;
    const resolvedDescription = override.description || description;
    const fullTitle = resolvedTitle.includes(company.name) ? resolvedTitle : `${resolvedTitle} | ${company.name}`;
    const canonicalUrl = `${company.domain}${routePath}`;
    const imageUrl = image.startsWith('http') ? image : `${company.domain}${image}`;
    document.title = fullTitle;
    const tags = {
      description: resolvedDescription,
      robots: noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      googlebot: noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      'og:title': fullTitle,
      'og:description': resolvedDescription,
      'og:type': type,
      'og:url': canonicalUrl,
      'og:image': imageUrl,
      'og:image:width': '1536',
      'og:image:height': '1024',
      'og:image:alt': `${company.name} — Design, Develop, Grow`,
      'og:site_name': company.name,
      'og:locale': 'en_IN',
      'twitter:card': 'summary_large_image',
      'twitter:title': fullTitle,
      'twitter:description': resolvedDescription,
      'twitter:image': imageUrl,
      'twitter:image:alt': `${company.name} — Design, Develop, Grow`,
    };
    Object.entries(tags).forEach(([name, content]) => {
      const attr = name.startsWith('og:') ? 'property' : 'name';
      upsertMeta(attr, name, content);
    });
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;

    const pageSchema = webPageSchema({ name: fullTitle, description: resolvedDescription, path: routePath });
    const automaticBreadcrumbs = routePath === '/' || hasSchemaType(schema, 'BreadcrumbList') ? null : breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: resolvedTitle, path: routePath },
    ]);
    const resolvedSchema = combineSchemas(schema, pageSchema, automaticBreadcrumbs);
    const schemaId = 'sitearvo-page-schema';
    let schemaScript = document.getElementById(schemaId);
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = schemaId;
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(resolvedSchema);
  }, [title, description, path, image, noIndex, type, schema]);
  return null;
}
