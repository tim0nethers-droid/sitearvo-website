import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createReadStream, promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const dataDir = path.join(rootDir, 'server-data');
const uploadsDir = path.join(dataDir, 'uploads');
const storePath = path.join(dataDir, 'sitearvo-store.json');
const seedPath = path.join(publicDir, 'api', 'data', 'seed.json');
const apiOnly = process.argv.includes('--api-only');
const port = Number(process.env.PORT || (apiOnly ? 5176 : 3000));
const demoAdminEmail = (process.env.SITEARVO_ADMIN_EMAIL || 'admin@sitearvo.test').toLowerCase();
const demoAdminPassword = process.env.SITEARVO_ADMIN_PASSWORD || '';
const sessionCookieName = 'sitearvo_admin_session';
const csrfCookieName = 'sitearvo_admin_csrf';
const visitorCookieName = 'sitearvo_visitor_id';
let store = null;

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function jsonResponse(res, status, data, headers = {}) {
  const payload = JSON.stringify({ data });
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function jsonError(res, status, message, errors = null) {
  const payload = { message };
  if (errors) payload.errors = errors;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function notFound(res, message = 'Not found.') {
  jsonError(res, 404, message);
}

function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFileAtomic(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now().toString(36)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashVisitor(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.secure) parts.push('Secure');
  const current = res.getHeader('Set-Cookie');
  const next = Array.isArray(current) ? current.concat(parts.join('; ')) : current ? [current, parts.join('; ')] : parts.join('; ');
  res.setHeader('Set-Cookie', next);
}

function clearCookie(res, name) {
  const current = res.getHeader('Set-Cookie');
  const cookie = `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  const next = Array.isArray(current) ? current.concat(cookie) : current ? [current, cookie] : cookie;
  res.setHeader('Set-Cookie', next);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function parseJsonBody(buffer) {
  if (!buffer.length) return {};
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return {};
  }
}

function safeText(value) {
  return String(value ?? '').trim();
}

function currentAdminSession(req) {
  const cookies = parseCookies(req);
  const sessionId = cookies[sessionCookieName];
  if (!sessionId) return null;
  const session = store.sessions[sessionId];
  if (!session) return null;
  const admin = store.admins.find(item => item.id === session.adminId && item.is_active !== false);
  if (!admin) return null;
  return { sessionId, session, admin };
}

function requireCsrf(req, res, session) {
  const token = req.headers['x-csrf-token'];
  if (!token || token !== session.session.csrf) {
    jsonError(res, 403, 'Invalid CSRF token.');
    return false;
  }
  return true;
}

function createDemoAdmin() {
  return {
    id: 1,
    name: 'SiteArvo Admin',
    email: demoAdminEmail,
    password_hash: demoAdminPassword ? hashPassword(demoAdminPassword) : null,
    demo_password_mode: !demoAdminPassword,
    is_active: true,
    last_login_at: null,
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash, demoMode = false) {
  if (demoMode) return safeText(password).length > 0;
  if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
  const [, salt, hash] = storedHash.split('$');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function parseCategorySlugList(value) {
  if (Array.isArray(value)) return value.map(item => toNumber(item)).filter(item => item !== null);
  return [];
}

function normalizeService(raw, category, id) {
  return {
    id,
    category_id: category?.id || null,
    category_name: category?.name || '',
    category_slug: category?.slug || '',
    name: raw.name || raw.title || '',
    slug: raw.slug || slugify(raw.name || raw.title || `service-${id}`),
    icon: raw.icon || 'code',
    short_description: raw.short_description || raw.shortDescription || '',
    description: raw.description || '',
    price_type: raw.price_type || raw.priceType || 'custom_quote',
    base_price: raw.base_price ?? raw.basePrice ?? null,
    sale_price: raw.sale_price ?? raw.salePrice ?? null,
    pages_included: raw.pages_included ?? raw.pagesIncluded ?? null,
    delivery_time: raw.delivery_time || raw.deliveryTime || '',
    revisions: raw.revisions || '',
    is_featured: toBool(raw.is_featured ?? raw.isFeatured, false),
    is_active: toBool(raw.is_active ?? raw.isActive, true),
    display_order: toNumber(raw.display_order ?? raw.displayOrder, 0),
    cta_text: raw.cta_text || raw.ctaText || 'View Service',
    seo_title: raw.seo_title || raw.seoTitle || `${raw.name || raw.title || 'Service'} | SiteArvo`,
    seo_description: raw.seo_description || raw.seoDescription || raw.short_description || raw.shortDescription || '',
    features: Array.isArray(raw.features) ? raw.features.map(feature => typeof feature === 'string' ? feature : feature?.name).filter(Boolean) : [],
    addon_ids: Array.isArray(raw.addon_ids) ? raw.addon_ids.map(item => toNumber(item)).filter(item => item !== null) : [],
    image: raw.image || '',
    service_type: raw.service_type || raw.serviceType || raw.price_type || raw.priceType || 'custom_quote',
  };
}

function normalizeAddon(raw, id, categories) {
  const slugSet = new Set((raw.category_slugs || raw.categorySlugs || []).map(slug => String(slug)));
  const categoryIds = categories.filter(category => slugSet.has(category.slug)).map(category => category.id);
  return {
    id,
    name: raw.name || '',
    description: raw.description || '',
    price: raw.price ?? raw.priceValue ?? null,
    pricing_type: raw.pricing_type || raw.pricingType || 'fixed',
    pricing_unit: raw.pricing_unit || raw.pricingUnit || '',
    is_active: toBool(raw.is_active ?? raw.isActive, true),
    category_ids: categoryIds,
  };
}

function normalizeCategory(raw, id) {
  return {
    id,
    name: raw.name || raw.title || '',
    slug: raw.slug || slugify(raw.name || raw.title || `category-${id}`),
    icon: raw.icon || 'layers',
    short_description: raw.short_description || raw.shortDescription || '',
    description: raw.description || '',
    display_order: toNumber(raw.display_order ?? raw.displayOrder, id),
    is_featured: toBool(raw.is_featured ?? raw.isFeatured, false),
    is_active: toBool(raw.is_active ?? raw.isActive, true),
    seo_title: raw.seo_title || raw.seoTitle || `${raw.name || raw.title || 'Category'} | SiteArvo`,
    seo_description: raw.seo_description || raw.seoDescription || raw.short_description || raw.shortDescription || '',
    services: [],
  };
}

function flattenServices(categories) {
  return categories.flatMap(category => (category.services || []).map(service => ({
    ...clone(service),
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
  })));
}

function syncDerivedCollections(state) {
  state.categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.name).localeCompare(String(b.name)));
  for (const category of state.categories) {
    category.services.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.name).localeCompare(String(b.name)));
  }
  state.services = flattenServices(state.categories);
  state.packages = state.services.filter(service => service.price_type === 'fixed');
  state.addons.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function initializeStore() {
  const seed = readJsonFile(seedPath, { settings: {}, categories: [], packages: [], addons: [] });
  const categories = [];
  const categoryBySlug = new Map();
  let nextCategoryId = 1;
  let nextServiceId = 1;
  let nextAddonId = 1;

  for (const rawCategory of seed.categories || []) {
    const category = normalizeCategory(rawCategory, nextCategoryId++);
    categories.push(category);
    categoryBySlug.set(category.slug, category);
  }

  for (const rawCategory of seed.categories || []) {
    const category = categoryBySlug.get(rawCategory.slug);
    for (const rawService of rawCategory.services || []) {
      category.services.push(normalizeService(rawService, category, nextServiceId++));
    }
  }

  for (const rawPackage of seed.packages || []) {
    const category = categoryBySlug.get(rawPackage.category_slug) || categories[0];
    const service = normalizeService(rawPackage, category, nextServiceId++);
    service.price_type = 'fixed';
    service.service_type = 'fixed';
    category.services.push(service);
  }

  const addons = (seed.addons || []).map(rawAddon => normalizeAddon(rawAddon, nextAddonId++, categories));
  const admins = [createDemoAdmin()];
  const state = {
    settings: { ...(seed.settings || {}) },
    categories,
    addons,
    orders: [],
    chats: [],
    analytics: [],
    admin_login_attempts: [],
    admins,
    sessions: {},
    meta: {
      nextCategoryId,
      nextServiceId,
      nextAddonId,
      nextOrderId: 1,
      nextChatId: 1,
      nextMessageId: 1,
      nextAnalyticsId: 1,
    },
  };
  syncDerivedCollections(state);
  return state;
}

function loadStore() {
  const raw = readJsonFile(storePath, null);
  if (raw) {
    raw.settings ||= {};
    raw.categories ||= [];
    raw.addons ||= [];
    raw.orders ||= [];
    raw.chats ||= [];
    raw.analytics ||= [];
    raw.admin_login_attempts ||= [];
    raw.admins ||= [createDemoAdmin()];
    raw.sessions ||= {};
    raw.meta ||= {};
    for (const category of raw.categories) category.services ||= [];
    syncDerivedCollections(raw);
    return raw;
  }
  const initialized = initializeStore();
  saveStore(initialized);
  return initialized;
}

function saveStore(state = store) {
  syncDerivedCollections(state);
  writeJsonFileAtomic(storePath, state);
}

function nextId(name) {
  const key = `next${name[0].toUpperCase()}${name.slice(1)}Id`;
  if (!store.meta[key]) store.meta[key] = 1;
  const value = store.meta[key];
  store.meta[key] += 1;
  return value;
}

function adminPayload(admin, csrf) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    csrf,
  };
}

function getAdminListPayload() {
  return store.admins.filter(item => item.is_active !== false).map(item => ({
    id: item.id,
    name: item.name,
    email: item.email,
    is_active: item.is_active !== false,
    last_login_at: item.last_login_at || null,
  }));
}

function getAllServices() {
  return flattenServices(store.categories);
}

function findCategoryBySlug(slug) {
  return store.categories.find(category => category.slug === slug);
}

function findCategoryById(id) {
  return store.categories.find(category => Number(category.id) === Number(id));
}

function findServiceBySlug(slug) {
  for (const category of store.categories) {
    const service = category.services.find(item => item.slug === slug);
    if (service) return { category, service };
  }
  return null;
}

function findServiceById(id) {
  for (const category of store.categories) {
    const index = category.services.findIndex(item => Number(item.id) === Number(id));
    if (index !== -1) return { category, index, service: category.services[index] };
  }
  return null;
}

function findAddonById(id) {
  return store.addons.find(addon => Number(addon.id) === Number(id));
}

function publicCatalog() {
  syncDerivedCollections(store);
  return {
    settings: store.settings,
    categories: clone(store.categories),
    packages: clone(store.packages),
    addons: clone(store.addons),
  };
}

function publicService(slug) {
  const match = findServiceBySlug(slug);
  if (!match) return null;
  const addonIds = new Set((match.service.addon_ids || []).map(item => Number(item)));
  const addonCategories = new Set([match.category.id]);
  const addons = store.addons.filter(addon => addon.is_active !== false && addon.category_ids.some(categoryId => addonCategories.has(Number(categoryId))) && (addonIds.size === 0 || addonIds.has(Number(addon.id))));
  return {
    ...clone(match.service),
    category_id: match.category.id,
    category_name: match.category.name,
    category_slug: match.category.slug,
    addons: clone(addons),
  };
}

function servicePrice(service) {
  const price = service.sale_price ?? service.base_price;
  return price === '' || price === undefined ? null : price;
}

function formatOrderNumber(id) {
  return `SAR-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
}

function getPriceNumber(value) {
  const parsed = toNumber(value, null);
  return parsed === null ? null : Number(parsed);
}

function validateAdminMutation(req, res) {
  const session = currentAdminSession(req);
  if (!session) {
    jsonError(res, 401, 'Please sign in to continue.');
    return null;
  }
  if (!requireCsrf(req, res, session)) return null;
  return session;
}

async function trackPageview(req, res) {
  const body = await readJsonBody(req);
  const cookies = parseCookies(req);
  const visitorId = safeText(body.visitor_id) || cookies[visitorCookieName] || crypto.randomUUID();
  const visitorHash = hashVisitor(visitorId);
  const pathName = safeText(body.path) || '/';
  const referrer = safeText(body.referrer) || '';
  const title = safeText(body.title) || '';
  const userAgent = safeText(req.headers['user-agent']) || '';
  const acceptLanguage = safeText(req.headers['accept-language']) || '';
  const ip = clientIp(req);
  const createdAt = nowIso();

  store.analytics.push({
    id: nextId('analytics'),
    visitor_hash: visitorHash,
    path: pathName,
    title,
    referrer,
    user_agent: userAgent,
    accept_language: acceptLanguage,
    ip_address: ip,
    created_at: createdAt,
  });
  saveStore();

  setCookie(res, visitorCookieName, visitorId, { httpOnly: false, maxAge: 60 * 60 * 24 * 365 * 2 });
  jsonResponse(res, 200, { tracked: true });
}

async function readJsonBody(req) {
  const buffer = await readRequestBody(req);
  if (!buffer.length) return {};
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json') || contentType.includes('text/json') || !contentType) return parseJsonBody(buffer);
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(buffer.toString('utf8')));
  }
  return {};
}

function clientIp(req) {
  const forwarded = safeText(req.headers['x-forwarded-for']);
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

function routeUploadPath(filename) {
  return `/uploads/${filename}`.replaceAll('\\', '/');
}

async function parseMultipartUpload(req) {
  const contentType = String(req.headers['content-type'] || '');
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  const boundary = `--${match[1] || match[2]}`;
  const body = await readRequestBody(req);
  const parts = body.toString('binary').split(boundary).slice(1, -1);
  for (const part of parts) {
    const [rawHeaders, ...rest] = part.split('\r\n\r\n');
    if (!rawHeaders || !rest.length) continue;
    const headerLines = rawHeaders.split('\r\n').filter(Boolean);
    const headers = Object.fromEntries(headerLines.map(line => {
      const index = line.indexOf(':');
      return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
    }).filter(([key]) => key));
    const disposition = headers['content-disposition'] || '';
    if (!/name="image"/i.test(disposition)) continue;
    const filenameMatch = disposition.match(/filename="([^"]+)"/i);
    const filename = safeText(filenameMatch?.[1] || `upload-${Date.now()}.bin`);
    const contentTypeLine = headers['content-type'] || 'application/octet-stream';
    const content = rest.join('\r\n\r\n').replace(/\r\n--$/, '');
    const buffer = Buffer.from(content, 'binary');
    return { filename, contentType: contentTypeLine, buffer };
  }
  return null;
}

function storeUpload(buffer, originalName, contentType) {
  const ext = path.extname(originalName).toLowerCase() || ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[contentType] || '');
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const target = path.join(uploadsDir, fileName);
  writeFileSync(target, buffer);
  return routeUploadPath(fileName);
}

async function loginAdmin(req, res) {
  const body = await readJsonBody(req);
  const email = safeText(body.email).toLowerCase();
  const password = safeText(body.password);
  if (!email || !password) return jsonError(res, 422, 'Enter a valid email and password.');

  const ip = clientIp(req);
  const recentFailures = store.admin_login_attempts.filter(item => item.email === email && item.ip_address === ip && !item.was_successful && new Date(item.attempted_at).getTime() > Date.now() - 15 * 60 * 1000);
  if (recentFailures.length >= 5) return jsonError(res, 429, 'Too many failed attempts. Try again in 15 minutes.');

  const admin = store.admins.find(item => item.email === email && item.is_active !== false);
  const valid = admin ? verifyPassword(password, admin.password_hash, admin.demo_password_mode) : false;
  store.admin_login_attempts.push({ email, ip_address: ip, was_successful: valid, attempted_at: nowIso() });
  if (!valid) {
    saveStore();
    return jsonError(res, 401, 'Incorrect email or password.');
  }

  const sessionId = crypto.randomUUID();
  const csrf = crypto.randomBytes(24).toString('hex');
  store.sessions[sessionId] = {
    adminId: admin.id,
    csrf,
    createdAt: nowIso(),
    lastSeenAt: nowIso(),
  };
  admin.last_login_at = nowIso();
  saveStore();
  setCookie(res, sessionCookieName, sessionId, { httpOnly: true, maxAge: 60 * 60 * 24 * 14 });
  setCookie(res, csrfCookieName, csrf, { httpOnly: false, maxAge: 60 * 60 * 24 * 14 });
  jsonResponse(res, 200, adminPayload(admin, csrf));
}

function logoutAdmin(req, res) {
  const session = currentAdminSession(req);
  if (session) {
    delete store.sessions[session.sessionId];
    saveStore();
  }
  clearCookie(res, sessionCookieName);
  clearCookie(res, csrfCookieName);
  jsonResponse(res, 200, { logged_out: true });
}

function requireAdmin(req, res, mutation = false) {
  const session = currentAdminSession(req);
  if (!session) {
    jsonError(res, 401, 'Please sign in to continue.');
    return null;
  }
  if (mutation && !requireCsrf(req, res, session)) return null;
  session.session.lastSeenAt = nowIso();
  return session;
}

function adminPayloadFromSession(session) {
  return adminPayload(session.admin, session.session.csrf);
}

function catalogServicesForAdmin() {
  return getAllServices().map(service => ({
    ...service,
    category_name: service.category_name,
    category_slug: service.category_slug,
    price_type: service.price_type,
    base_price: service.base_price,
    sale_price: service.sale_price,
    is_active: service.is_active,
  }));
}

function adminCategoriesPayload() {
  return clone(store.categories);
}

function adminAddonsPayload() {
  return clone(store.addons);
}

function adminOrdersPayload() {
  return clone(store.orders).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function chatConversationSummary(conversation) {
  const lastMessage = conversation.messages.at(-1) || null;
  return {
    id: conversation.id,
    public_id: conversation.public_id,
    visitor_name: conversation.visitor_name,
    visitor_email: conversation.visitor_email || '',
    status: conversation.status,
    unread_admin: conversation.unread_admin || 0,
    last_message: lastMessage?.message || '',
    last_message_at: lastMessage?.created_at || conversation.created_at,
  };
}

function adminChatsPayload() {
  return clone(store.chats).map(chatConversationSummary).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
}

function findChatById(id) {
  return store.chats.find(chat => Number(chat.id) === Number(id));
}

function findChatByPublicId(publicId) {
  return store.chats.find(chat => chat.public_id === publicId);
}

function ensureChat(visitor) {
  const existing = store.chats.find(chat => chat.visitor_hash === visitor.visitor_hash);
  if (existing) return existing;
  const chat = {
    id: nextId('chat'),
    public_id: `CHAT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    visitor_hash: visitor.visitor_hash,
    visitor_name: visitor.visitor_name || 'Website Visitor',
    visitor_email: visitor.visitor_email || '',
    status: 'open',
    unread_admin: 0,
    unread_visitor: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    messages: [],
  };
  store.chats.push(chat);
  return chat;
}

async function createOrder(req, res) {
  const body = await readJsonBody(req);
  const errors = {};
  for (const field of ['full_name', 'phone', 'email', 'project_description', 'service_id']) {
    if (!safeText(body[field])) errors[field] = 'Required';
  }
  if (safeText(body.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeText(body.email))) errors.email = 'Invalid email';
  if (Object.keys(errors).length) return jsonError(res, 422, 'Please complete the required order details.', errors);
  if (String(store.settings.orders_enabled ?? '1') === '0') return jsonError(res, 409, 'New online enquiries are temporarily disabled.');

  const serviceMatch = findServiceById(body.service_id) || findServiceBySlug(body.service_slug || '');
  if (!serviceMatch) return jsonError(res, 404, 'Service not found.');
  const { service } = serviceMatch;
  if (service.price_type !== 'fixed' || service.base_price === null && service.sale_price === null) {
    return jsonError(res, 409, 'This package is not available for fixed-price ordering.');
  }

  const basePrice = Number(service.sale_price ?? service.base_price);
  const addonSelections = Array.isArray(body.addons) ? body.addons : [];
  const orderAddons = [];
  let total = basePrice;

  for (const selection of addonSelections) {
    const addon = findAddonById(selection.addon_id);
    const quantity = Math.max(1, Math.min(50, Number(selection.quantity || 1)));
    if (!addon || addon.is_active === false) return jsonError(res, 409, 'One selected add-on is no longer available.');
    if (addon.pricing_type === 'custom_quote' || addon.price === null || addon.price === '') {
      return jsonError(res, 409, `${addon.name} requires a custom quote and cannot be included in a fixed total.`);
    }
    const unitPrice = Number(addon.price);
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    total += lineTotal;
    orderAddons.push({
      addon_id: addon.id,
      addon_name: addon.name,
      unit_price: unitPrice,
      quantity,
      line_total: lineTotal,
      addon_snapshot: clone(addon),
    });
  }

  const orderId = nextId('order');
  const orderNumber = formatOrderNumber(orderId);
  const order = {
    id: orderId,
    order_number: orderNumber,
    full_name: safeText(body.full_name),
    phone: safeText(body.phone),
    email: safeText(body.email).toLowerCase(),
    company_name: safeText(body.company_name),
    country: safeText(body.country) || 'India',
    business_type: safeText(body.business_type),
    project_description: safeText(body.project_description),
    preferred_contact: ['whatsapp', 'phone', 'email'].includes(safeText(body.preferred_contact)) ? safeText(body.preferred_contact) : 'whatsapp',
    total_amount: Math.round(total * 100) / 100,
    currency: store.settings.currency || 'INR',
    status: 'New',
    created_at: nowIso(),
    updated_at: nowIso(),
    service_id: service.id,
    service_name: service.name,
    service_slug: service.slug,
    base_price: basePrice,
    addons: orderAddons,
  };
  store.orders.push(order);

  const visitorId = safeText(body.visitor_id) || crypto.randomUUID();
  const visitorHash = hashVisitor(visitorId);
  const chat = ensureChat({
    visitor_hash: visitorHash,
    visitor_name: safeText(body.full_name) || 'Website Visitor',
    visitor_email: safeText(body.email),
  });
  chat.messages.push({
    id: nextId('message'),
    sender: 'visitor',
    message: `Order enquiry received for ${service.name}.`,
    created_at: nowIso(),
  });
  chat.unread_admin = (chat.unread_admin || 0) + 1;
  chat.unread_visitor = 0;
  chat.updated_at = nowIso();
  saveStore();
  jsonResponse(res, 201, {
    order_id: orderNumber,
    service_name: service.name,
    base_price: basePrice,
    addons: orderAddons.map(item => ({
      addon: item.addon_snapshot,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    })),
    total: order.total_amount,
    currency: order.currency,
  });
}

async function startChat(req, res) {
  const body = await readJsonBody(req);
  const visitorId = safeText(body.visitor_id) || crypto.randomUUID();
  const visitorHash = hashVisitor(visitorId);
  const chat = ensureChat({
    visitor_hash: visitorHash,
    visitor_name: safeText(body.visitor_name) || 'Website Visitor',
    visitor_email: safeText(body.visitor_email),
  });
  if (safeText(body.message)) {
    chat.messages.push({
      id: nextId('message'),
      sender: 'visitor',
      message: safeText(body.message),
      created_at: nowIso(),
    });
    chat.unread_admin = (chat.unread_admin || 0) + 1;
    chat.unread_visitor = 0;
  }
  chat.updated_at = nowIso();
  saveStore();
  jsonResponse(res, 201, {
    id: chat.id,
    token: chat.public_id,
    public_id: chat.public_id,
    visitor_name: chat.visitor_name,
    visitor_email: chat.visitor_email,
    status: chat.status,
    unread_visitor: chat.unread_visitor || 0,
    messages: clone(chat.messages),
  });
}

function getChatByPublicHash(res, publicId) {
  const chat = findChatByPublicId(publicId);
  if (!chat) return jsonError(res, 404, 'Chat not found.');
  jsonResponse(res, 200, {
    id: chat.id,
    token: chat.public_id,
    public_id: chat.public_id,
    visitor_name: chat.visitor_name,
    visitor_email: chat.visitor_email,
    status: chat.status,
    unread_visitor: chat.unread_visitor || 0,
    unread_admin: chat.unread_admin || 0,
    messages: clone(chat.messages),
  });
}

async function appendChatMessage(req, res, publicId, sender = 'visitor') {
  const chat = findChatByPublicId(publicId);
  if (!chat) return jsonError(res, 404, 'Chat not found.');
  if (chat.status === 'closed' && sender === 'visitor') return jsonError(res, 409, 'This conversation is closed.');
  const body = await readJsonBody(req);
  const message = safeText(body.message);
  if (!message) return jsonError(res, 422, 'Message is required.');
  chat.messages.push({
    id: nextId('message'),
    sender,
    message,
    created_at: nowIso(),
  });
  if (sender === 'visitor') {
    chat.unread_admin = (chat.unread_admin || 0) + 1;
    chat.unread_visitor = 0;
  }
  if (sender === 'admin') {
    chat.unread_admin = 0;
    chat.unread_visitor = (chat.unread_visitor || 0) + 1;
  }
  chat.updated_at = nowIso();
  saveStore();
  jsonResponse(res, 201, { sent: true });
}

function updateChatStatus(publicId, status) {
  const chat = findChatByPublicId(publicId);
  if (!chat) return null;
  chat.status = status === 'closed' ? 'closed' : 'open';
  chat.updated_at = nowIso();
  if (chat.status === 'open') chat.unread_admin = chat.unread_admin || 0;
  saveStore();
  return chat;
}

function buildDashboard() {
  const totalPageviews = store.analytics.length;
  const uniqueVisitors = new Set(store.analytics.map(item => item.visitor_hash)).size;
  const today = new Date().toISOString().slice(0, 10);
  const todayPageviews = store.analytics.filter(item => String(item.created_at).startsWith(today)).length;
  const last7Date = new Date();
  last7Date.setDate(last7Date.getDate() - 6);
  const last7DaysTotal = store.analytics.filter(item => new Date(item.created_at) >= last7Date).length;
  return {
    active_categories: store.categories.filter(item => item.is_active !== false).length,
    active_services: getAllServices().filter(item => item.is_active !== false).length,
    packages: getAllServices().filter(item => item.price_type === 'fixed').length,
    new_orders: store.orders.filter(item => item.status === 'New').length,
    unread_chats: store.chats.reduce((sum, item) => sum + (item.unread_admin || 0), 0),
    total_pageviews: totalPageviews,
    unique_visitors: uniqueVisitors,
    today_pageviews: todayPageviews,
    last_7_days_total: last7DaysTotal,
  };
}

function buildAnalytics() {
  const totalPageviews = store.analytics.length;
  const uniqueVisitors = new Set(store.analytics.map(item => item.visitor_hash)).size;
  const today = new Date().toISOString().slice(0, 10);
  const last7Start = new Date();
  last7Start.setDate(last7Start.getDate() - 6);
  const pageMap = new Map();
  const referrerMap = new Map();
  const dailyMap = new Map();

  for (const entry of store.analytics) {
    const page = pageMap.get(entry.path) || { path: entry.path, pageviews: 0, visitors: new Set() };
    page.pageviews += 1;
    page.visitors.add(entry.visitor_hash);
    pageMap.set(entry.path, page);

    const referrerKey = entry.referrer || '(direct)';
    const ref = referrerMap.get(referrerKey) || { referrer: referrerKey, pageviews: 0, visitors: new Set() };
    ref.pageviews += 1;
    ref.visitors.add(entry.visitor_hash);
    referrerMap.set(referrerKey, ref);

    const date = String(entry.created_at).slice(0, 10);
    const day = dailyMap.get(date) || { date, pageviews: 0, visitors: new Set() };
    day.pageviews += 1;
    day.visitors.add(entry.visitor_hash);
    dailyMap.set(date, day);
  }

  const topPages = [...pageMap.values()].map(item => ({ path: item.path, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const topReferrers = [...referrerMap.values()].map(item => ({ referrer: item.referrer, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const dailyViews = [...dailyMap.values()].filter(item => new Date(item.date) >= last7Start).map(item => ({ date: item.date, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_pageviews: totalPageviews,
    unique_visitors: uniqueVisitors,
    today_pageviews: store.analytics.filter(item => String(item.created_at).startsWith(today)).length,
    last_7_days_total: store.analytics.filter(item => new Date(item.created_at) >= last7Start).length,
    top_pages: topPages,
    daily_views: dailyViews,
    top_referrers: topReferrers,
  };
}

async function handleAdminUpload(req, res) {
  const session = validateAdminMutation(req, res);
  if (!session) return;
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('multipart/form-data')) return jsonError(res, 400, 'Upload must be multipart/form-data.');
  const file = await parseMultipartUpload(req);
  if (!file) return jsonError(res, 422, 'No image file was provided.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.contentType)) return jsonError(res, 422, 'Choose a JPG, PNG or WebP image.');
  if (file.buffer.length > 2 * 1024 * 1024) return jsonError(res, 422, 'Choose an image up to 2 MB.');
  const url = storeUpload(file.buffer, file.filename, file.contentType);
  jsonResponse(res, 201, { url });
}

function updateCategory(id, body) {
  const category = findCategoryById(id);
  if (!category) return null;
  category.name = safeText(body.name) || category.name;
  category.slug = safeText(body.slug) || slugify(category.name);
  category.icon = safeText(body.icon) || category.icon;
  category.short_description = safeText(body.short_description);
  category.description = safeText(body.description);
  category.display_order = toNumber(body.display_order, category.display_order);
  category.is_featured = toBool(body.is_featured, category.is_featured);
  category.is_active = toBool(body.is_active, category.is_active);
  category.seo_title = safeText(body.seo_title) || category.seo_title;
  category.seo_description = safeText(body.seo_description) || category.seo_description;
  return category;
}

function createOrUpdateService(body, existing = null) {
  const category = findCategoryById(body.category_id);
  if (!category) return null;
  const service = existing || { id: nextId('service') };
  service.category_id = category.id;
  service.category_name = category.name;
  service.category_slug = category.slug;
  service.name = safeText(body.name) || service.name || '';
  service.slug = safeText(body.slug) || slugify(service.name);
  service.icon = safeText(body.icon) || service.icon || 'code';
  service.short_description = safeText(body.short_description);
  service.description = safeText(body.description);
  service.price_type = safeText(body.price_type) || 'custom_quote';
  service.base_price = body.base_price === '' || body.base_price === null || body.base_price === undefined ? null : toNumber(body.base_price, null);
  service.sale_price = body.sale_price === '' || body.sale_price === null || body.sale_price === undefined ? null : toNumber(body.sale_price, null);
  service.pages_included = body.pages_included === '' || body.pages_included === null || body.pages_included === undefined ? null : toNumber(body.pages_included, null);
  service.delivery_time = safeText(body.delivery_time);
  service.revisions = safeText(body.revisions);
  service.is_featured = toBool(body.is_featured, service.is_featured ?? false);
  service.is_active = toBool(body.is_active, service.is_active ?? true);
  service.display_order = toNumber(body.display_order, service.display_order ?? 0);
  service.cta_text = safeText(body.cta_text) || service.cta_text || 'View Service';
  service.seo_title = safeText(body.seo_title) || service.seo_title || `${service.name} | SiteArvo`;
  service.seo_description = safeText(body.seo_description) || service.seo_description || service.short_description || '';
  service.features = Array.isArray(body.features) ? body.features.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean) : (service.features || []);
  service.addon_ids = Array.isArray(body.addon_ids) ? body.addon_ids.map(item => toNumber(item)).filter(item => item !== null) : (service.addon_ids || []);
  service.image = safeText(body.image) || service.image || '';
  service.service_type = safeText(body.service_type) || service.service_type || service.price_type;
  return service;
}

function createOrUpdateAddon(body, existing = null) {
  const addon = existing || { id: nextId('addon') };
  addon.name = safeText(body.name) || addon.name || '';
  addon.description = safeText(body.description);
  addon.price = body.price === '' || body.price === null || body.price === undefined ? null : toNumber(body.price, null);
  addon.pricing_type = safeText(body.pricing_type) || 'fixed';
  addon.pricing_unit = safeText(body.pricing_unit);
  addon.is_active = toBool(body.is_active, addon.is_active ?? true);
  addon.category_ids = parseCategorySlugList(body.category_ids);
  return addon;
}

async function handleAdminRoute(req, res, pathname, method) {
  if (method === 'GET' && pathname === '/admin/dashboard') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, buildDashboard());
    return;
  }
  if (method === 'GET' && pathname === '/admin/categories') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminCategoriesPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/categories') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    const category = normalizeCategory(body, nextId('category'));
    category.services = [];
    store.categories.push(category);
    syncDerivedCollections(store);
    saveStore();
    jsonResponse(res, 201, clone(category));
    return;
  }
  const categoryMatch = pathname.match(/^\/admin\/categories\/(\d+)$/);
  if (categoryMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const id = Number(categoryMatch[1]);
    const category = findCategoryById(id);
    if (!category) return jsonError(res, 404, 'Category not found.');
    if (method === 'PUT') {
      const body = await readJsonBody(req);
      updateCategory(id, body);
      saveStore();
      jsonResponse(res, 200, clone(category));
      return;
    }
    if (method === 'DELETE') {
      category.is_active = false;
      saveStore();
      jsonResponse(res, 200, { deactivated: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/services') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, catalogServicesForAdmin());
    return;
  }
  if (method === 'POST' && pathname === '/admin/services') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    const service = createOrUpdateService(body);
    if (!service) return jsonError(res, 404, 'Category not found.');
    const category = findCategoryById(body.category_id);
    category.services.push(service);
    syncDerivedCollections(store);
    saveStore();
    jsonResponse(res, 201, clone(service));
    return;
  }
  const serviceMatch = pathname.match(/^\/admin\/services\/(\d+)$/);
  if (serviceMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const id = Number(serviceMatch[1]);
    const found = findServiceById(id);
    if (!found) return jsonError(res, 404, 'Service not found.');
    if (method === 'PUT') {
      const body = await readJsonBody(req);
      const updated = createOrUpdateService(body, found.service);
      if (!updated) return jsonError(res, 404, 'Category not found.');
      if (Number(found.category.id) !== Number(updated.category_id)) {
        found.category.services.splice(found.index, 1);
        const nextCategory = findCategoryById(updated.category_id);
        nextCategory.services.push(updated);
      } else {
        found.category.services[found.index] = updated;
      }
      syncDerivedCollections(store);
      saveStore();
      jsonResponse(res, 200, clone(updated));
      return;
    }
    if (method === 'DELETE') {
      found.service.is_active = false;
      saveStore();
      jsonResponse(res, 200, { deactivated: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/addons') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminAddonsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/addons') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    const addon = createOrUpdateAddon(body);
    store.addons.push(addon);
    saveStore();
    jsonResponse(res, 201, clone(addon));
    return;
  }
  const addonMatch = pathname.match(/^\/admin\/addons\/(\d+)$/);
  if (addonMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const addon = findAddonById(addonMatch[1]);
    if (!addon) return jsonError(res, 404, 'Add-on not found.');
    if (method === 'PUT') {
      const body = await readJsonBody(req);
      const updated = createOrUpdateAddon(body, addon);
      Object.assign(addon, updated);
      saveStore();
      jsonResponse(res, 200, clone(addon));
      return;
    }
    if (method === 'DELETE') {
      addon.is_active = false;
      saveStore();
      jsonResponse(res, 200, { deactivated: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/orders') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminOrdersPayload());
    return;
  }
  const orderMatch = pathname.match(/^\/admin\/orders\/(\d+)$/);
  if (orderMatch && method === 'PUT') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const order = store.orders.find(item => Number(item.id) === Number(orderMatch[1]));
    if (!order) return jsonError(res, 404, 'Order not found.');
    const body = await readJsonBody(req);
    order.status = safeText(body.status) || order.status;
    order.updated_at = nowIso();
    saveStore();
    jsonResponse(res, 200, { updated: true });
    return;
  }

  if (method === 'GET' && pathname === '/admin/analytics') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, buildAnalytics());
    return;
  }

  if (method === 'GET' && pathname === '/admin/chats') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminChatsPayload());
    return;
  }
  const chatMessageMatch = pathname.match(/^\/admin\/chats\/([^/]+)\/messages$/);
  const chatStatusMatch = pathname.match(/^\/admin\/chats\/([^/]+)\/status$/);
  const chatMatch = pathname.match(/^\/admin\/chats\/([^/]+)$/);
  if (chatMatch && method === 'GET') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    const chat = findChatByPublicId(chatMatch[1]) || findChatById(chatMatch[1]);
    if (!chat) return jsonError(res, 404, 'Chat not found.');
    chat.unread_admin = 0;
    saveStore();
    jsonResponse(res, 200, {
      id: chat.id,
      public_id: chat.public_id,
      visitor_name: chat.visitor_name,
      visitor_email: chat.visitor_email,
      status: chat.status,
      unread_visitor: chat.unread_visitor || 0,
      unread_admin: chat.unread_admin || 0,
      messages: clone(chat.messages),
    });
    return;
  }
  if (chatMessageMatch && method === 'POST') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const publicId = chatMessageMatch[1];
    const chat = findChatByPublicId(publicId) || findChatById(publicId);
    if (!chat) return jsonError(res, 404, 'Chat not found.');
    const body = await readJsonBody(req);
    const message = safeText(body.message);
    if (!message) return jsonError(res, 422, 'Message is required.');
    chat.messages.push({
      id: nextId('message'),
      sender: 'admin',
      message,
      created_at: nowIso(),
    });
    chat.unread_admin = 0;
    chat.unread_visitor = (chat.unread_visitor || 0) + 1;
    chat.updated_at = nowIso();
    saveStore();
    jsonResponse(res, 201, { sent: true });
    return;
  }
  if (chatStatusMatch && method === 'PUT') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    const chat = updateChatStatus(chatStatusMatch[1], safeText(body.status));
    if (!chat) return jsonError(res, 404, 'Chat not found.');
    jsonResponse(res, 200, { updated: true, status: chat.status });
    return;
  }

  if (method === 'GET' && pathname === '/admin/settings') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, clone(store.settings));
    return;
  }
  if (method === 'PUT' && pathname === '/admin/settings') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    store.settings = {
      ...store.settings,
      page_explanation: safeText(body.page_explanation) || store.settings.page_explanation,
      currency: safeText(body.currency) || store.settings.currency || 'INR',
      orders_enabled: body.orders_enabled === undefined ? store.settings.orders_enabled ?? '1' : (toBool(body.orders_enabled, true) ? '1' : '0'),
    };
    saveStore();
    jsonResponse(res, 200, clone(store.settings));
    return;
  }

  if (method === 'GET' && pathname === '/admin/export') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, {
      exported_at: nowIso(),
      settings: clone(store.settings),
      categories: clone(store.categories),
      services: clone(getAllServices()),
      addons: clone(store.addons),
      orders: clone(store.orders),
      chats: clone(store.chats),
    });
    return;
  }

  notFound(res, 'Admin route not found.');
}

async function handleApi(req, res, pathname) {
  const method = req.method ? req.method.toUpperCase() : 'GET';
  if (method === 'GET' && pathname === '/health') {
    jsonResponse(res, 200, { status: 'ok', backend: 'node-json', storage: true });
    return;
  }
  if (method === 'GET' && pathname === '/catalog') {
    jsonResponse(res, 200, publicCatalog());
    return;
  }
  if (method === 'GET' && pathname === '/categories') {
    jsonResponse(res, 200, clone(store.categories));
    return;
  }
  const categoryMatch = pathname.match(/^\/categories\/([^/]+)$/);
  if (method === 'GET' && categoryMatch) {
    const category = findCategoryBySlug(categoryMatch[1]);
    if (!category) return notFound(res, 'Category not found.');
    jsonResponse(res, 200, clone(category));
    return;
  }
  if (method === 'GET' && pathname === '/services') {
    jsonResponse(res, 200, getAllServices());
    return;
  }
  const addonsMatch = pathname.match(/^\/services\/([^/]+)\/addons$/);
  if (method === 'GET' && addonsMatch) {
    const service = publicService(addonsMatch[1]);
    if (!service) return notFound(res, 'Service not found.');
    jsonResponse(res, 200, service.addons || []);
    return;
  }
  const serviceMatch = pathname.match(/^\/services\/([^/]+)$/);
  if (method === 'GET' && serviceMatch) {
    const service = publicService(serviceMatch[1]);
    if (!service) return notFound(res, 'Service not found.');
    jsonResponse(res, 200, service);
    return;
  }
  if (method === 'POST' && pathname === '/orders') {
    await createOrder(req, res);
    return;
  }
  if (method === 'POST' && pathname === '/chat/start') {
    await startChat(req, res);
    return;
  }
  const chatMatch = pathname.match(/^\/chat\/([^/]+)$/);
  if (chatMatch && method === 'GET') {
    getChatByPublicHash(res, chatMatch[1]);
    return;
  }
  const chatMessageMatch = pathname.match(/^\/chat\/([^/]+)\/messages$/);
  if (chatMessageMatch && method === 'POST') {
    await appendChatMessage(req, res, chatMessageMatch[1], 'visitor');
    return;
  }
  if (method === 'POST' && pathname === '/analytics/pageview') {
    await trackPageview(req, res);
    return;
  }
  if (method === 'POST' && pathname === '/auth/login') {
    await loginAdmin(req, res);
    return;
  }
  if (method === 'POST' && pathname === '/auth/logout') {
    logoutAdmin(req, res);
    return;
  }
  if (method === 'GET' && pathname === '/auth/me') {
    const session = requireAdmin(req, res);
    if (!session) return;
    jsonResponse(res, 200, adminPayloadFromSession(session));
    return;
  }
  if (pathname.startsWith('/admin')) {
    const mutation = !['GET', 'HEAD'].includes(method);
    if (!requireAdmin(req, res, mutation)) return;
    await handleAdminRoute(req, res, pathname, method);
    return;
  }
  notFound(res, 'API route not found.');
}

function serveFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' });
  createReadStream(filePath).pipe(res);
}

function hasPathTraversal(pathname) {
  return pathname.includes('..');
}

async function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  if (pathname.startsWith('/uploads/')) {
    const filePath = path.join(uploadsDir, pathname.replace('/uploads/', ''));
    if (existsSync(filePath)) return serveFile(res, filePath);
    return notFound(res, 'Uploaded file not found.');
  }

  const candidates = [];
  const normalized = cleanPath.replace(/^\/+/, '');
  if (cleanPath.endsWith('/')) candidates.push(path.join(distDir, normalized, 'index.html'));
  candidates.push(path.join(distDir, normalized));
  if (!path.extname(normalized)) candidates.push(path.join(distDir, `${normalized}.html`), path.join(distDir, normalized, 'index.html'));
  for (const candidate of candidates) {
    if (hasPathTraversal(candidate) || !existsSync(candidate)) continue;
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return serveFile(res, candidate);
    } catch {
      // continue
    }
  }
  const indexFile = path.join(distDir, 'index.html');
  if (existsSync(indexFile)) return serveFile(res, indexFile);
  return notFound(res, 'Build output not found. Run npm run build first.');
}

store = loadStore();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname || '/');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'same-origin');

    if (pathname.startsWith('/api')) {
      await handleApi(req, res, pathname.replace(/^\/api/, '') || '/');
      return;
    }

    if (apiOnly) {
      notFound(res, 'This server instance only handles API requests.');
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    console.error('SiteArvo Node server error:', error);
    if (!res.headersSent) jsonError(res, 500, 'The server could not complete this request.');
    else res.end();
  }
});

server.listen(port, '0.0.0.0', () => {
  const mode = apiOnly ? 'API-only' : 'full';
  console.log(`SiteArvo Node server running on http://127.0.0.1:${port} (${mode})`);
});
