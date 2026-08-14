import { readFile, writeFile } from 'node:fs/promises';
import { company } from '../src/config/company.js';
import { serviceCategories } from '../src/data/services.js';
import { projects } from '../src/data/portfolio.js';
import { seoPages } from '../src/data/seoPages.js';

const staticRoutes = [
  '/', '/about', '/services', '/industries', '/portfolio', '/pricing', '/contact',
  '/privacy-policy', '/terms-and-conditions',
];

const routes = new Set(staticRoutes);

// Preserve previously discovered live catalog URLs when a local build cannot
// reach the production API. This prevents an offline deployment build from
// accidentally shrinking the production sitemap.
try {
  const previousSitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const escapedDomain = company.domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const routePattern = new RegExp(`<loc>${escapedDomain}([^<]*)<\\/loc>`, 'g');
  for (const match of previousSitemap.matchAll(routePattern)) routes.add(match[1] || '/');
} catch {
  // The first build may not have an existing sitemap yet.
}
serviceCategories.forEach(category => {
  routes.add(`/services/category/${category.id}`);
  category.services.forEach(service => routes.add(`/services/${service.slug}`));
});
projects.forEach(project => routes.add(`/portfolio/${project.slug}`));
seoPages.forEach(page => routes.add(`/${page.slug}`));

try {
  const response = await fetch(`${company.domain}/api/catalog`, { signal: AbortSignal.timeout(5000) });
  if (response.ok) {
    const payload = await response.json();
    (payload?.data?.categories || []).filter(category => Number(category.is_active) !== 0).forEach(category => {
      routes.add(`/services/category/${category.slug}`);
      (category.services || []).filter(service => Number(service.is_active) !== 0).forEach(service => {
        routes.add(`/services/${service.slug}`);
      });
    });
  }
} catch {
  console.warn('Live catalog unavailable; sitemap generated from the bundled catalog.');
}

const escapeXml = value => value.replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]);
const domain = company.domain.replace(/\/$/, '');
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...routes].sort().map(path => `  <url><loc>${escapeXml(`${domain}${path}`)}</loc></url>`).join('\n')}
</urlset>
`;

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf8');
