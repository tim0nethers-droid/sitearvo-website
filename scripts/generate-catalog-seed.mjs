import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serviceCategories } from '../src/data/services.js';
import { starterCatalogProducts } from '../src/data/starterCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categoryIcons = {
  'mobile-app-development': 'smartphone', 'web-development': 'code', 'cms-ecommerce-development': 'shopping-cart',
  'desktop-application-development': 'monitor', 'digital-marketing': 'megaphone', 'industry-solutions': 'briefcase', 'specialized-development': 'wrench',
};
const featured = new Set(['website-designing', 'reactjs-development', 'react-native-app-development', 'shopify-development', 'seo', 'custom-ecommerce-development']);
const seed = {
  settings: {
    page_explanation: 'One unique website URL/page counts as one page, such as Home, About, Services or Contact.',
    currency: 'INR',
    orders_enabled: '1',
  },
  categories: serviceCategories.map((category, categoryIndex) => ({
    name: category.title,
    slug: category.id,
    icon: categoryIcons[category.id] || 'code',
    short_description: category.description,
    description: category.description,
    display_order: categoryIndex + 1,
    is_featured: categoryIndex < 4,
    is_active: true,
    seo_title: `${category.title} Services | SiteArvo`,
    seo_description: category.description,
    services: category.services.map((service, serviceIndex) => ({
      name: service.title,
      slug: service.slug,
      icon: categoryIcons[category.id] || 'code',
      short_description: service.shortDescription,
      description: service.description,
      price_type: 'custom_quote',
      base_price: null,
      sale_price: null,
      pages_included: null,
      delivery_time: '',
      revisions: '',
      is_featured: featured.has(service.slug),
      is_active: true,
      display_order: serviceIndex + 1,
      cta_text: 'Get a Quote',
      seo_title: service.seoTitle,
      seo_description: service.seoDescription,
      features: service.capabilities || service.features || [],
    })),
  })),
  packages: [
    ...starterCatalogProducts.map((product, index) => ({
      ...product,
      category_slug: product.category_slug,
      price_type: product.price_type || 'custom_quote',
      base_price: product.base_price ?? null,
      regular_price: product.regular_price ?? null,
      sale_price: product.sale_price ?? null,
      pages_included: product.pages_included ?? null,
      delivery_time: product.delivery_time || '',
      revisions: product.revisions || '',
      is_featured: Boolean(product.is_featured),
      is_active: product.is_active !== false,
      display_order: product.display_order || index + 1,
      cta_text: product.add_to_cart_enabled ? 'Add to Cart' : product.price_type === 'fixed' ? 'Request Quote' : 'Request Quote',
      seo_title: product.seo_title || `${product.name} | SiteArvo`,
      seo_description: product.seo_description || product.short_description || ``,
      features: product.features || [],
    })),
  ],
  addons: [
    ['Additional Website Page', 'Additional unique website page.', 'per_page', 'page'], ['Logo Design', 'Professional logo design add-on.', 'custom_quote', ''],
    ['Content Writing', 'Website copywriting based on the approved scope.', 'custom_quote', ''], ['Blog Setup', 'Blog structure and publishing setup.', 'custom_quote', ''],
    ['Google Maps', 'Google Maps embed and location setup.', 'custom_quote', ''], ['Booking Form', 'Custom booking or appointment enquiry form.', 'custom_quote', ''],
    ['Advanced SEO', 'Expanded on-page and technical SEO work.', 'custom_quote', ''], ['Speed Optimization', 'Performance audit and optimization.', 'custom_quote', ''],
    ['Website Maintenance', 'Ongoing website care and updates.', 'per_month', 'month'], ['Hosting Setup', 'Hosting account and deployment assistance.', 'custom_quote', ''],
  ].map(([name, description, pricing_type, pricing_unit]) => ({ name, description, price: null, pricing_type, pricing_unit, is_active: true, category_slugs: ['web-development', 'cms-ecommerce-development'] })),
};

fs.mkdirSync(path.join(root, 'public', 'api', 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'api', 'data', 'seed.json'), JSON.stringify(seed, null, 2));
