import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'public/api/data/seed.json'), 'utf8'));
let nextCategory = 1;
let nextService = 1;
let categories = seed.categories.map(category => ({ ...category, id: nextCategory++, services: category.services.map(service => ({ ...service, id: nextService++ })) }));
let addons = seed.addons.map((addon, index) => ({ ...addon, id: index + 1, category_ids: [] }));
let orders = [];
let settings = { ...seed.settings };

const send = (response, data, status = 200, headers = {}) => {
  response.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  response.end(JSON.stringify(status >= 400 ? { message: data } : { data }));
};
const body = request => new Promise(resolve => { let value = ''; request.on('data', chunk => { value += chunk; }); request.on('end', () => { try { resolve(JSON.parse(value || '{}')); } catch { resolve({}); } }); });
const authenticated = request => request.headers.cookie?.includes('mock-admin=1');
const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const catalog = () => ({ categories: categories.filter(category => category.is_active !== false).map(category => ({ ...category, services: category.services.filter(service => service.is_active !== false).map(service => ({ ...service, category_id: category.id, features: (service.features || []).map((name, index) => typeof name === 'string' ? { id: index + 1, name } : name), addons: addons.filter(addon => (service.addon_ids || []).includes(addon.id) && addon.is_active !== false) })) })), settings });

http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:5176');
  const route = url.pathname.replace(/^\/api/, '') || '/';
  if (route === '/auth/login' && request.method === 'POST') return send(response, { id: 1, name: 'Test Admin', email: 'admin@sitearvo.test', csrf: 'test-csrf' }, 200, { 'Set-Cookie': 'mock-admin=1; Path=/; HttpOnly; SameSite=Strict' });
  if (route === '/auth/logout' && request.method === 'POST') return send(response, { logged_out: true }, 200, { 'Set-Cookie': 'mock-admin=; Path=/; Max-Age=0' });
  if (route === '/auth/me') return authenticated(request) ? send(response, { id: 1, name: 'Test Admin', email: 'admin@sitearvo.test', csrf: 'test-csrf' }) : send(response, 'Authentication required.', 401);
  if (route === '/catalog') return send(response, catalog());
  if (route === '/orders' && request.method === 'POST') {
    const input = await body(request);
    const service = categories.flatMap(category => category.services).find(item => item.id === Number(input.service_id));
    if (!service) return send(response, 'Service unavailable.', 409);
    const sale = service.sale_price;
    const base = Number(sale !== '' && sale !== null && sale !== undefined ? sale : (service.base_price ?? 0));
    const selectedAddons = (input.addons || []).map(selection => {
      const addon = addons.find(item => item.id === Number(selection.addon_id) && (service.addon_ids || []).includes(item.id));
      if (!addon) return null;
      const quantity = Math.max(1, Math.min(50, Number(selection.quantity || 1)));
      return { ...addon, quantity, line_total: Number(addon.price || 0) * quantity };
    }).filter(Boolean);
    const total = base + selectedAddons.reduce((sum, addon) => sum + addon.line_total, 0);
    const order = { id: orders.length + 1, order_number: `SAR-2026-${String(orders.length + 1).padStart(5, '0')}`, full_name: input.full_name, phone: input.phone, service_name: service.name, total_amount: total, status: 'New', created_at: new Date().toISOString() };
    orders.push(order);
    return send(response, { order_id: order.order_number, service_name: service.name, base_price: base, addons: selectedAddons, total, currency: 'INR' }, 201);
  }
  if (!route.startsWith('/admin') || !authenticated(request)) return send(response, 'Authentication required.', 401);
  if (route === '/admin/dashboard') return send(response, { active_categories: categories.filter(item => item.is_active !== false).length, active_services: categories.flatMap(item => item.services).filter(item => item.is_active !== false).length, packages: categories.flatMap(item => item.services).filter(item => item.price_type === 'fixed').length, new_orders: orders.filter(item => item.status === 'New').length });
  if (route === '/admin/categories' && request.method === 'GET') return send(response, categories.map(({ services, ...category }) => category));
  if (route === '/admin/categories' && request.method === 'POST') { const input = await body(request); const category = { ...input, id: nextCategory++, slug: slugify(input.slug || input.name), services: [] }; categories.push(category); return send(response, category, 201); }
  const categoryMatch = route.match(/^\/admin\/categories\/(\d+)$/);
  if (categoryMatch && request.method === 'PUT') { const input = await body(request); const category = categories.find(item => item.id === Number(categoryMatch[1])); Object.assign(category, input, { slug: slugify(input.slug || input.name) }); return send(response, category); }
  if (categoryMatch && request.method === 'DELETE') { categories.find(item => item.id === Number(categoryMatch[1])).is_active = false; return send(response, { deactivated: true }); }
  if (route === '/admin/services' && request.method === 'GET') {
    const services = categories.flatMap(category => category.services.map(service => ({
      ...service,
      category_id: category.id,
      category_name: category.name,
      features: (service.features || []).map((name, index) => typeof name === 'string' ? { id: index + 1, name } : name),
      addon_ids: [],
    })));
    return send(response, services);
  }
  if (route === '/admin/services' && request.method === 'POST') { const input = await body(request); const category = categories.find(item => item.id === Number(input.category_id)); if (!category) return send(response, 'Category required.', 422); const service = { ...input, id: nextService++, slug: slugify(input.slug || input.name), category_id: category.id }; category.services.push(service); return send(response, service, 201); }
  const serviceMatch = route.match(/^\/admin\/services\/(\d+)$/);
  if (serviceMatch && request.method === 'PUT') { const input = await body(request); const service = categories.flatMap(item => item.services).find(item => item.id === Number(serviceMatch[1])); Object.assign(service, input, { slug: slugify(input.slug || input.name) }); return send(response, service); }
  if (serviceMatch && request.method === 'DELETE') { categories.flatMap(item => item.services).find(item => item.id === Number(serviceMatch[1])).is_active = false; return send(response, { deactivated: true }); }
  if (route === '/admin/addons' && request.method === 'GET') return send(response, addons);
  if (route === '/admin/addons' && request.method === 'POST') { const input = await body(request); const addon = { ...input, id: addons.length + 1 }; addons.push(addon); return send(response, addon, 201); }
  const addonMatch = route.match(/^\/admin\/addons\/(\d+)$/);
  if (addonMatch && request.method === 'PUT') { const input = await body(request); const addon = addons.find(item => item.id === Number(addonMatch[1])); Object.assign(addon, input); return send(response, addon); }
  if (addonMatch && request.method === 'DELETE') { addons.find(item => item.id === Number(addonMatch[1])).is_active = false; return send(response, { deactivated: true }); }
  if (route === '/admin/orders' && request.method === 'GET') return send(response, orders);
  if (route === '/admin/settings' && request.method === 'GET') return send(response, settings);
  if (route === '/admin/settings' && request.method === 'PUT') { settings = { ...settings, ...(await body(request)) }; return send(response, settings); }
  return send(response, 'Mock route not found.', 404);
}).listen(5176, '127.0.0.1', () => process.stdout.write('SiteArvo mock API listening on 5176\n'));
