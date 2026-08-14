import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serviceCategories } from '../src/data/services.js';

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
  packages: [5, 7, 10].map((pages, index) => ({
    category_slug: 'web-development', name: `${pages} Page Website`, slug: `${pages}-page-business-website`, icon: 'globe',
    short_description: `A configurable ${pages}-page responsive business website package.`,
    description: `A fixed website package ready for the owner to configure with the final approved price, delivery time and revisions.`,
    price_type: 'fixed', base_price: null, sale_price: null, pages_included: pages, delivery_time: '', revisions: '',
    is_featured: false, is_active: false, display_order: index + 1,
    cta_text: 'Customize Package', seo_title: `${pages} Page Business Website Package | SiteArvo`,
    seo_description: `Configure a ${pages}-page responsive business website package from SiteArvo.`,
    features: ['Responsive Website', 'Contact Form', 'WhatsApp Integration', 'Basic SEO', 'Social Media Links', 'SSL Setup Assistance'],
  })),
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

