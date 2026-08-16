import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serviceSchema } from '../../src/config/seo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const failures = [];

const assert = (condition, message) => { if (!condition) failures.push(message); };
const readRoute = route => readFile(route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.slice(1), 'index.html'), 'utf8');
const extract = (html, pattern) => html.match(pattern)?.[1] || '';
const schemaTypes = schema => (schema['@graph'] || [schema]).map(node => node['@type']);

for (const route of ['/', '/about', '/services', '/industries', '/portfolio', '/pricing', '/contact', '/privacy-policy', '/terms-and-conditions', '/website-development-company-india', '/small-business-website-design-india', '/react-development-company-india', '/guides/website-development-cost-india']) {
  const html = await readRoute(route);
  const title = extract(html, /<title>(.*?)<\/title>/s);
  const description = extract(html, /<meta name="description" content="(.*?)"/s);
  const canonical = extract(html, /<link rel="canonical" href="(.*?)"/s);
  const schemaText = extract(html, /<script id="sitearvo-page-schema" type="application\/ld\+json">(.*?)<\/script>/s);
  assert(title.length >= 20 && title.length <= 65, `${route}: title length is ${title.length}`);
  assert(description.length >= 80 && description.length <= 180, `${route}: description length is ${description.length}`);
  assert(canonical === `https://sitearvo.site${route === '/' ? '/' : route}`, `${route}: incorrect canonical ${canonical}`);
  try { JSON.parse(schemaText); } catch { failures.push(`${route}: invalid JSON-LD`); }
  if (route.includes('company-india') || route.includes('website-design-india') || route.startsWith('/guides/')) assert(/<div id="root">[\s\S]*?<h1>/.test(html), `${route}: missing pre-rendered page content`);
}

const homeSchema = JSON.parse(extract(await readRoute('/'), /<script id="sitearvo-page-schema" type="application\/ld\+json">(.*?)<\/script>/s));
for (const type of ['Organization', 'WebSite', 'ProfessionalService', 'FAQPage']) assert(schemaTypes(homeSchema).includes(type), `Home schema is missing ${type}`);

const pricingSchema = JSON.parse(extract(await readRoute('/pricing'), /<script id="sitearvo-page-schema" type="application\/ld\+json">(.*?)<\/script>/s));
for (const type of ['CollectionPage', 'BreadcrumbList', 'ItemList']) assert(schemaTypes(pricingSchema).includes(type), `Pricing schema is missing ${type}`);

const productSchema = serviceSchema({
  title: 'SEO Test Package', slug: 'seo-test-package', shortDescription: 'A fixed test package.',
  categoryTitle: 'Web Development', categorySlug: 'web-development', priceType: 'fixed', basePrice: 4999,
});
const product = productSchema['@graph'].find(node => node['@type'] === 'Product');
assert(product?.offers?.price === 4999 && product?.offers?.priceCurrency === 'INR', 'Fixed package Product/Offer schema is invalid');

const fixedPackageHtml = await readRoute('/services/landing-page-starter').catch(() => '');
if (fixedPackageHtml) {
  const fixedPackageSchema = JSON.parse(extract(fixedPackageHtml, /<script id="sitearvo-page-schema" type="application\/ld\+json">(.*?)<\/script>/s));
  assert(schemaTypes(fixedPackageSchema).filter(type => type === 'BreadcrumbList').length === 1, 'Fixed package has duplicate breadcrumb schema');
  assert(schemaTypes(fixedPackageSchema).includes('Product'), 'Live fixed package is missing Product schema');
  assert(/<div id="root">[\s\S]*?<h1>/.test(fixedPackageHtml), 'Fixed package is missing pre-rendered content');
}

for (const route of ['/cart', '/checkout', '/admin', '/admin/dashboard', '/admin/login']) {
  const html = await readRoute(route);
  assert(/<meta name="robots" content="noindex, nofollow"/.test(html), `${route}: missing noindex`);
}

const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
assert((sitemap.match(/<loc>/g) || []).length >= 100, 'Sitemap unexpectedly lost live catalog URLs');
for (const slug of ['landing-page-starter', 'wordpress-business-package', 'android-app-mvp-package']) assert(sitemap.includes(`/services/${slug}`), `Sitemap is missing ${slug}`);
for (const route of ['/website-development-company-india', '/small-business-website-design-india', '/react-development-company-india', '/guides/website-development-cost-india']) assert(sitemap.includes(`<loc>https://sitearvo.site${route}</loc>`), `Sitemap is missing ${route}`);
await stat(path.join(dist, '.htaccess')).catch(() => failures.push('dist/.htaccess is missing'));

if (failures.length) {
  console.error(`SEO verification failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('SEO verification passed: metadata, canonicals, JSON-LD, noindex routes, sitemap and .htaccess are valid.');
