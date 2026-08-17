import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createReadStream, promises as fs } from 'node:fs';
import { calculateConfiguratorSummary, createConfiguratorSnapshot, defaultConfiguratorGroups, normalizeConfiguratorGroups } from './src/data/configurator.js';
import { starterCatalogProducts } from './src/data/starterCatalog.js';

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
const demoAdminEmail = (process.env.SITEARVO_ADMIN_EMAIL || 'info@sitearvo.site').toLowerCase();
const demoAdminPassword = process.env.SITEARVO_ADMIN_PASSWORD || 'Sunil@#199000';
const websitePackagePricing = new Map([
  ['3-page-business-website', { base_price: 0, regular_price: 3999 }],
  ['5-page-business-website', { base_price: 2999, regular_price: 4999 }],
  ['7-page-business-website', { base_price: 4999, regular_price: 6999 }],
  ['10-page-business-website', { base_price: 7999, regular_price: 9999 }],
]);
const sessionCookieName = 'sitearvo_admin_session';
const csrfCookieName = 'sitearvo_admin_csrf';
const visitorCookieName = 'sitearvo_visitor_id';
let store = null;
const starterCatalogSlugSet = new Set(starterCatalogProducts.map(product => String(product.slug || '').toLowerCase()));

const defaultSettings = {
  page_explanation: 'One unique website URL/page counts as one page, such as Home, About, Services or Contact.',
  currency: 'INR',
  default_currency: 'INR',
  financial_year_start_month: '4',
  orders_enabled: '1',
  tax_enabled: '0',
  tax_name: 'GST',
  tax_percentage: '18',
  business_tax_id: '',
  invoice_notes: '',
  exclude_admin_traffic: '1',
  filter_bot_traffic: '1',
  notify_email: demoAdminEmail,
};

const defaultContent = {
  homepage_hero: 'Powerful Websites. Real Results.',
  hero_subtitle: 'We design and develop fast, responsive and SEO-friendly websites that help businesses grow online.',
  cta_text: 'Let us build your website',
  statistics: [
    { label: 'Projects Completed', value: '50+' },
    { label: 'Happy Clients', value: '30+' },
    { label: 'Responsive Design', value: '100%' },
    { label: 'Support', value: '24/7' },
  ],
  why_choose: [
    'Modern & Professional Design',
    'Mobile-First Development',
    'SEO-Friendly Structure',
    'Fast Loading Performance',
    'Clean & Maintainable Code',
    'Transparent Communication',
    'Secure Development',
    'Post-Launch Support',
  ],
  process_steps: [
    { title: 'Discovery', description: 'Understand the business, audience and goals.' },
    { title: 'Strategy', description: 'Plan structure, user journey and visual direction.' },
    { title: 'Design', description: 'Create a modern, responsive interface.' },
    { title: 'Development', description: 'Turn the approved design into a fast website.' },
    { title: 'Testing', description: 'Test responsiveness, performance and browsers.' },
    { title: 'Launch', description: 'Deploy the website and provide post-launch support.' },
  ],
  footer_description: 'Modern websites designed to help businesses grow online.',
  about_page: 'SiteArvo is a modern web design and development agency focused on creating fast, beautiful and result-driven digital experiences.',
};

const collectionDefaults = {
  leads: [],
  customers: [],
  quotations: [],
  carts: [],
  payments: [],
  invoices: [],
  projects: [],
  portfolio: [],
  faqs: [],
  testimonials: [],
  media: [],
  coupons: [],
  notifications: [],
  activity_logs: [],
  events: [],
  finance_accounts: [],
  finance_income: [],
  finance_expenses: [],
  finance_vendors: [],
  finance_refunds: [],
  finance_adjustments: [],
  finance_budgets: [],
  income_categories: [],
  expense_categories: [],
  configurator_groups: [],
};

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
  if (value === undefined) return undefined;
  if (value === null) return null;
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
    role: 'Super Admin',
    last_login_at: null,
  };
}

function ensureCollection(state, key, fallback = []) {
  if (!Array.isArray(state[key])) state[key] = clone(fallback);
}

function normalizeSettings(input = {}) {
  return {
    ...defaultSettings,
    ...input,
    page_explanation: safeText(input.page_explanation) || defaultSettings.page_explanation,
    currency: safeText(input.currency) || defaultSettings.currency,
    orders_enabled: input.orders_enabled === undefined ? defaultSettings.orders_enabled : (toBool(input.orders_enabled, true) ? '1' : '0'),
    tax_enabled: input.tax_enabled === undefined ? defaultSettings.tax_enabled : (toBool(input.tax_enabled, false) ? '1' : '0'),
    tax_name: safeText(input.tax_name) || defaultSettings.tax_name,
    tax_percentage: safeText(input.tax_percentage) || defaultSettings.tax_percentage,
    business_tax_id: safeText(input.business_tax_id) || '',
    invoice_notes: safeText(input.invoice_notes) || '',
    default_currency: safeText(input.default_currency) || defaultSettings.default_currency,
    financial_year_start_month: safeText(input.financial_year_start_month) || defaultSettings.financial_year_start_month,
    exclude_admin_traffic: input.exclude_admin_traffic === undefined ? defaultSettings.exclude_admin_traffic : (toBool(input.exclude_admin_traffic, true) ? '1' : '0'),
    filter_bot_traffic: input.filter_bot_traffic === undefined ? defaultSettings.filter_bot_traffic : (toBool(input.filter_bot_traffic, true) ? '1' : '0'),
    notify_email: safeText(input.notify_email) || defaultSettings.notify_email,
  };
}

function normalizeContent(input = {}) {
  return {
    ...defaultContent,
    ...input,
    statistics: Array.isArray(input.statistics) && input.statistics.length ? input.statistics : clone(defaultContent.statistics),
    why_choose: Array.isArray(input.why_choose) && input.why_choose.length ? input.why_choose : clone(defaultContent.why_choose),
    process_steps: Array.isArray(input.process_steps) && input.process_steps.length ? input.process_steps : clone(defaultContent.process_steps),
  };
}

const defaultFinanceAccounts = [
  { account_name: 'Cash', account_type: 'Cash', opening_balance: 0, currency: 'INR', active: true, notes: '' },
  { account_name: 'Bank Account', account_type: 'Bank Account', opening_balance: 0, currency: 'INR', active: true, notes: '' },
  { account_name: 'UPI', account_type: 'UPI', opening_balance: 0, currency: 'INR', active: true, notes: '' },
  { account_name: 'Payment Gateway', account_type: 'Payment Gateway', opening_balance: 0, currency: 'INR', active: true, notes: '' },
  { account_name: 'Petty Cash', account_type: 'Cash', opening_balance: 0, currency: 'INR', active: true, notes: '' },
];

const defaultIncomeCategories = [
  'Website Development',
  'Mobile App Development',
  'SEO',
  'Digital Marketing',
  'Maintenance',
  'Hosting',
  'Domain',
  'Consulting',
  'Other',
];

const defaultExpenseCategories = [
  'Hosting',
  'Domains',
  'Software',
  'Subscriptions',
  'Advertising',
  'Freelancers',
  'Salaries',
  'Office Expenses',
  'Internet',
  'Phone',
  'Travel',
  'Professional Services',
  'Bank Charges',
  'Payment Gateway Fees',
  'Taxes',
  'Refunds',
  'Miscellaneous',
];

function financeCode(prefix, id) {
  return `SAR-FIN-${prefix}-${currentYear()}-${String(id).padStart(4, '0')}`;
}

function financeDate(value) {
  if (!safeText(value)) return nowIso().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? nowIso().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function financeStartOfDay(value) {
  const date = new Date(financeDate(value));
  date.setHours(0, 0, 0, 0);
  return date;
}

function financeEndOfDay(value) {
  const date = new Date(financeDate(value));
  date.setHours(23, 59, 59, 999);
  return date;
}

function financeMonthBounds(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function financeRangeFromQuery(searchParams = new URLSearchParams(), settings = store?.settings || defaultSettings) {
  const range = safeText(searchParams.get('range') || searchParams.get('period')) || 'this_month';
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYearValue = today.getFullYear();
  const fiscalStartMonth = Math.min(12, Math.max(1, toNumber(settings.financial_year_start_month, 4) || 4)) - 1;
  let start = financeStartOfDay(today);
  let end = financeEndOfDay(today);
  if (range === 'today') {
    start = financeStartOfDay(today);
    end = financeEndOfDay(today);
  } else if (range === 'this_week') {
    const day = today.getDay() || 7;
    start = financeStartOfDay(new Date(today));
    start.setDate(start.getDate() - (day - 1));
    end = financeEndOfDay(new Date(start));
    end.setDate(end.getDate() + 6);
  } else if (range === 'last_month') {
    const previous = currentMonth === 0 ? financeMonthBounds(currentYearValue - 1, 11) : financeMonthBounds(currentYearValue, currentMonth - 1);
    start = previous.start;
    end = previous.end;
  } else if (range === 'this_quarter') {
    const quarterStart = Math.floor(currentMonth / 3) * 3;
    const bounds = financeMonthBounds(currentYearValue, quarterStart);
    start = bounds.start;
    end = financeMonthBounds(currentYearValue, quarterStart + 2).end;
  } else if (range === 'this_financial_year') {
    const fyStartYear = currentMonth >= fiscalStartMonth ? currentYearValue : currentYearValue - 1;
    start = financeMonthBounds(fyStartYear, fiscalStartMonth).start;
    end = financeMonthBounds(fyStartYear + 1, fiscalStartMonth).start;
    end.setMilliseconds(end.getMilliseconds() - 1);
  } else if (range === 'custom') {
    const customStart = searchParams.get('start') || searchParams.get('from');
    const customEnd = searchParams.get('end') || searchParams.get('to');
    start = customStart ? financeStartOfDay(customStart) : new Date(0);
    end = customEnd ? financeEndOfDay(customEnd) : financeEndOfDay(today);
  } else {
    start = financeMonthBounds(currentYearValue, currentMonth).start;
    end = financeMonthBounds(currentYearValue, currentMonth).end;
  }
  return { range, start, end };
}

function financeWithinRange(dateValue, bounds) {
  const time = new Date(safeText(dateValue) || nowIso()).getTime();
  return time >= bounds.start.getTime() && time <= bounds.end.getTime();
}

function financeAccountTypeGroup(type = '') {
  const value = String(type || '').toLowerCase();
  if (value.includes('cash') || value.includes('upi') || value.includes('petty')) return 'cash';
  if (value.includes('bank') || value.includes('gateway')) return 'bank';
  return 'other';
}

function financeSummaryCurrency() {
  return store?.settings?.default_currency || store?.settings?.currency || 'INR';
}

function normalizeFinanceCategoryInput(body, existing = null) {
  const category = existing || { id: nextId('financeCategory') };
  category.name = safeText(body.name) || category.name || '';
  category.slug = safeText(body.slug) || category.slug || slugify(category.name);
  category.active = toBool(body.active, category.active ?? true);
  category.display_order = toNumber(body.display_order, category.display_order ?? 0) || 0;
  category.updated_at = nowIso();
  if (!category.created_at) category.created_at = nowIso();
  return category;
}

function normalizeFinanceAccountInput(body, existing = null) {
  const account = existing || { id: nextId('financeAccount') };
  if (!account.account_number) account.account_number = financeCode('ACC', account.id);
  account.account_name = safeText(body.account_name) || account.account_name || '';
  account.account_type = safeText(body.account_type) || account.account_type || 'Other';
  account.opening_balance = toNumber(body.opening_balance, account.opening_balance ?? 0) || 0;
  account.currency = safeText(body.currency) || account.currency || financeSummaryCurrency();
  account.active = toBool(body.active, account.active ?? true);
  account.notes = safeText(body.notes) || account.notes || '';
  account.updated_at = nowIso();
  if (!account.created_at) account.created_at = nowIso();
  return account;
}

function normalizeFinanceIncomeInput(body, existing = null) {
  const income = existing || { id: nextId('financeIncome') };
  if (!income.income_number) income.income_number = financeCode('INC', income.id);
  income.date = financeDate(body.date || income.date);
  income.customer_id = body.customer_id ? toNumber(body.customer_id, income.customer_id ?? null) : income.customer_id ?? null;
  income.order_id = body.order_id ? toNumber(body.order_id, income.order_id ?? null) : income.order_id ?? null;
  income.invoice_id = body.invoice_id ? toNumber(body.invoice_id, income.invoice_id ?? null) : income.invoice_id ?? null;
  income.project_id = body.project_id ? toNumber(body.project_id, income.project_id ?? null) : income.project_id ?? null;
  income.category = safeText(body.category) || income.category || 'Other';
  income.description = safeText(body.description) || income.description || '';
  income.payment_method = safeText(body.payment_method) || income.payment_method || 'Other';
  income.amount = toNumber(body.amount, income.amount ?? 0) || 0;
  income.transaction_reference = safeText(body.transaction_reference) || income.transaction_reference || '';
  income.account_id = body.account_id ? toNumber(body.account_id, income.account_id ?? null) : (income.account_id ?? resolveFinanceAccountIdByMethod(income.payment_method));
  income.notes = safeText(body.notes) || income.notes || '';
  income.created_by = safeText(body.created_by) || income.created_by || 'SiteArvo Admin';
  income.source_type = safeText(body.source_type) || income.source_type || 'manual';
  income.source_id = body.source_id ? toNumber(body.source_id, income.source_id ?? null) : income.source_id ?? null;
  income.status = ['Pending', 'Completed', 'Voided'].includes(safeText(body.status)) ? safeText(body.status) : (income.status || 'Completed');
  income.is_system_generated = toBool(body.is_system_generated, income.is_system_generated ?? false);
  income.updated_at = nowIso();
  if (!income.created_at) income.created_at = nowIso();
  return income;
}

function normalizeFinanceExpenseInput(body, existing = null) {
  const expense = existing || { id: nextId('financeExpense') };
  if (!expense.expense_number) expense.expense_number = financeCode('EXP', expense.id);
  expense.date = financeDate(body.date || expense.date);
  expense.vendor_id = body.vendor_id ? toNumber(body.vendor_id, expense.vendor_id ?? null) : expense.vendor_id ?? null;
  expense.expense_category = safeText(body.expense_category || body.category) || expense.expense_category || 'Miscellaneous';
  expense.description = safeText(body.description) || expense.description || '';
  expense.amount = toNumber(body.amount, expense.amount ?? 0) || 0;
  expense.tax_amount = toNumber(body.tax_amount, expense.tax_amount ?? 0) || 0;
  expense.payment_method = safeText(body.payment_method) || expense.payment_method || 'Other';
  expense.account_id = body.account_id ? toNumber(body.account_id, expense.account_id ?? null) : (expense.account_id ?? resolveFinanceAccountIdByMethod(expense.payment_method));
  expense.reference_number = safeText(body.reference_number) || expense.reference_number || '';
  expense.attachment = safeText(body.attachment || body.receipt_url) || expense.attachment || '';
  expense.project_id = body.project_id ? toNumber(body.project_id, expense.project_id ?? null) : expense.project_id ?? null;
  expense.notes = safeText(body.notes) || expense.notes || '';
  expense.status = ['Draft', 'Pending', 'Paid', 'Cancelled'].includes(safeText(body.status)) ? safeText(body.status) : (expense.status || 'Pending');
  expense.created_by = safeText(body.created_by) || expense.created_by || 'SiteArvo Admin';
  expense.source_type = safeText(body.source_type) || expense.source_type || 'manual';
  expense.source_id = body.source_id ? toNumber(body.source_id, expense.source_id ?? null) : expense.source_id ?? null;
  expense.updated_at = nowIso();
  if (!expense.created_at) expense.created_at = nowIso();
  return expense;
}

function normalizeFinanceVendorInput(body, existing = null) {
  const vendor = existing || { id: nextId('financeVendor') };
  if (!vendor.vendor_number) vendor.vendor_number = financeCode('VND', vendor.id);
  vendor.vendor_name = safeText(body.vendor_name || body.name) || vendor.vendor_name || '';
  vendor.contact_person = safeText(body.contact_person) || vendor.contact_person || '';
  vendor.phone = safeText(body.phone) || vendor.phone || '';
  vendor.email = safeText(body.email).toLowerCase() || vendor.email || '';
  vendor.address = safeText(body.address) || vendor.address || '';
  vendor.tax_id = safeText(body.tax_id) || vendor.tax_id || '';
  vendor.notes = safeText(body.notes) || vendor.notes || '';
  vendor.active = toBool(body.active, vendor.active ?? true);
  vendor.updated_at = nowIso();
  if (!vendor.created_at) vendor.created_at = nowIso();
  return vendor;
}

function normalizeFinanceRefundInput(body, existing = null) {
  const refund = existing || { id: nextId('financeRefund') };
  if (!refund.refund_number) refund.refund_number = financeCode('RFD', refund.id);
  refund.original_payment_id = body.original_payment_id ? toNumber(body.original_payment_id, refund.original_payment_id ?? null) : refund.original_payment_id ?? null;
  refund.customer_id = body.customer_id ? toNumber(body.customer_id, refund.customer_id ?? null) : refund.customer_id ?? null;
  refund.amount = toNumber(body.amount, refund.amount ?? 0) || 0;
  refund.reason = safeText(body.reason) || refund.reason || '';
  refund.date = financeDate(body.date || refund.date);
  refund.account_id = body.account_id ? toNumber(body.account_id, refund.account_id ?? null) : refund.account_id ?? null;
  refund.transaction_reference = safeText(body.transaction_reference) || refund.transaction_reference || '';
  refund.status = ['Pending', 'Completed', 'Failed', 'Cancelled'].includes(safeText(body.status)) ? safeText(body.status) : (refund.status || 'Pending');
  refund.notes = safeText(body.notes) || refund.notes || '';
  refund.updated_at = nowIso();
  if (!refund.created_at) refund.created_at = nowIso();
  return refund;
}

function normalizeFinanceAdjustmentInput(body, existing = null) {
  const adjustment = existing || { id: nextId('financeAdjustment') };
  if (!adjustment.adjustment_number) adjustment.adjustment_number = financeCode('ADJ', adjustment.id);
  adjustment.date = financeDate(body.date || adjustment.date);
  adjustment.reason = safeText(body.reason) || adjustment.reason || '';
  adjustment.amount = toNumber(body.amount, adjustment.amount ?? 0) || 0;
  adjustment.account_id = body.account_id ? toNumber(body.account_id, adjustment.account_id ?? null) : adjustment.account_id ?? null;
  adjustment.notes = safeText(body.notes) || adjustment.notes || '';
  adjustment.direction = ['credit', 'debit'].includes(safeText(body.direction).toLowerCase()) ? safeText(body.direction).toLowerCase() : (adjustment.direction || 'credit');
  adjustment.created_by = safeText(body.created_by) || adjustment.created_by || 'SiteArvo Admin';
  adjustment.updated_at = nowIso();
  if (!adjustment.created_at) adjustment.created_at = nowIso();
  return adjustment;
}

function normalizeFinanceBudgetInput(body, existing = null) {
  const budget = existing || { id: nextId('financeBudget') };
  if (!budget.budget_number) budget.budget_number = financeCode('BUD', budget.id);
  budget.category = safeText(body.category) || budget.category || 'Miscellaneous';
  budget.month = safeText(body.month) || budget.month || financeDate(nowIso()).slice(0, 7);
  budget.amount = toNumber(body.amount, budget.amount ?? 0) || 0;
  budget.spent = toNumber(body.spent, budget.spent ?? 0) || 0;
  budget.notes = safeText(body.notes) || budget.notes || '';
  budget.active = toBool(body.active, budget.active ?? true);
  budget.updated_at = nowIso();
  if (!budget.created_at) budget.created_at = nowIso();
  return budget;
}

function getFinanceAccountById(id) {
  return store.finance_accounts.find(account => Number(account.id) === Number(id));
}

function getFinanceAccountByType(type) {
  return store.finance_accounts.find(account => String(account.account_type || '').toLowerCase() === String(type || '').toLowerCase() && account.active !== false) || null;
}

function resolveFinanceAccountIdByMethod(method = '') {
  const value = String(method || '').toLowerCase();
  if (value.includes('upi')) return getFinanceAccountByType('UPI')?.id || getFinanceAccountByType('Cash')?.id || null;
  if (value.includes('bank')) return getFinanceAccountByType('Bank Account')?.id || getFinanceAccountByType('Other')?.id || null;
  if (value.includes('cash')) return getFinanceAccountByType('Cash')?.id || null;
  if (value.includes('gateway')) return getFinanceAccountByType('Payment Gateway')?.id || getFinanceAccountByType('Bank Account')?.id || null;
  return getFinanceAccountByType('Bank Account')?.id || getFinanceAccountByType('Cash')?.id || null;
}

function getFinanceCategoryList(kind) {
  const source = kind === 'income' ? store.income_categories : store.expense_categories;
  return clone(source || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.name).localeCompare(String(b.name)));
}

function ensureDefaultFinanceCollections(state) {
  if (!state.finance_accounts.length) {
    state.finance_accounts = defaultFinanceAccounts.map((account, index) => normalizeFinanceAccountInput({ ...account, active: true, display_order: index + 1 }));
  }
  if (!state.income_categories.length) {
    state.income_categories = defaultIncomeCategories.map((name, index) => normalizeFinanceCategoryInput({ name, display_order: index + 1, active: true }));
  }
  if (!state.expense_categories.length) {
    state.expense_categories = defaultExpenseCategories.map((name, index) => normalizeFinanceCategoryInput({ name, display_order: index + 1, active: true }));
  }
}

function buildPaymentDerivedIncome(payment) {
  const order = store.orders.find(item => Number(item.id) === Number(payment.order_id)) || null;
  const invoice = order ? store.invoices.find(item => Number(item.order_id) === Number(order.id)) || null : null;
  const customer = payment.customer_id ? findCustomerById(payment.customer_id) : (order ? findCustomerById(order.customer_id) : null);
  return {
    id: `derived-payment-${payment.id}`,
    income_number: payment.payment_number,
    date: financeDate(payment.paid_at || payment.created_at),
    customer_id: customer?.id || payment.customer_id || null,
    order_id: payment.order_id || null,
    invoice_id: invoice?.id || null,
    project_id: order?.project_id || null,
    category: order?.service_name || 'Website Development',
    description: payment.notes || `Received payment for ${order?.order_number || payment.payment_number}`,
    payment_method: payment.payment_method || 'Other',
    amount: Number(payment.amount || 0),
    transaction_reference: payment.transaction_reference || '',
    account_id: null,
    notes: payment.notes || '',
    created_by: 'System',
    source_type: 'payment',
    source_id: payment.id,
    status: ['Received', 'Refunded'].includes(payment.status) ? (payment.status === 'Refunded' ? 'Refunded' : 'Completed') : 'Pending',
    is_system_generated: true,
    created_at: payment.created_at || nowIso(),
    updated_at: payment.updated_at || payment.created_at || nowIso(),
    customer_name: customer?.name || payment.customer_name || '',
    order_number: order?.order_number || '',
    invoice_number: invoice?.invoice_number || '',
  };
}

function buildFinanceLedgerRows(state) {
  const rows = [];
  const addRow = row => {
    const date = financeDate(row.date || row.created_at);
    rows.push({
      id: row.id,
      transaction_number: row.transaction_number || financeCode('TRX', row.id || rows.length + 1),
      date,
      type: row.type,
      description: row.description || '',
      counterparty_name: row.counterparty_name || '',
      account_id: row.account_id ?? null,
      account_name: row.account_name || '',
      debit: Math.max(0, Number(row.debit || 0)),
      credit: Math.max(0, Number(row.credit || 0)),
      reference: row.reference || '',
      status: row.status || 'Completed',
      customer_id: row.customer_id ?? null,
      vendor_id: row.vendor_id ?? null,
      order_id: row.order_id ?? null,
      invoice_id: row.invoice_id ?? null,
      project_id: row.project_id ?? null,
      category: row.category || '',
      source_type: row.source_type || '',
      source_id: row.source_id ?? null,
      created_by: row.created_by || 'System',
      created_at: row.created_at || nowIso(),
      updated_at: row.updated_at || row.created_at || nowIso(),
      is_system_generated: Boolean(row.is_system_generated),
    });
  };

  for (const payment of state.payments) {
    if (['Received', 'Refunded'].includes(payment.status)) addRow({
      id: `payment-${payment.id}`,
      transaction_number: financeCode('PAY', payment.id),
      date: payment.paid_at || payment.created_at,
      type: 'Income',
      description: `Payment received · ${payment.payment_method}`,
      counterparty_name: findCustomerById(payment.customer_id)?.name || '',
      account_id: payment.account_id ?? resolveFinanceAccountIdByMethod(payment.payment_method),
      account_name: getFinanceAccountById(payment.account_id ?? resolveFinanceAccountIdByMethod(payment.payment_method))?.account_name || '',
      debit: 0,
      credit: Number(payment.amount || 0),
      reference: payment.transaction_reference || payment.payment_number,
      status: payment.status === 'Refunded' ? 'Refunded' : 'Completed',
      customer_id: payment.customer_id || null,
      order_id: payment.order_id || null,
      invoice_id: state.invoices.find(item => Number(item.order_id) === Number(payment.order_id))?.id || null,
      project_id: state.orders.find(item => Number(item.id) === Number(payment.order_id))?.project_id || null,
      category: state.orders.find(item => Number(item.id) === Number(payment.order_id))?.service_name || 'Website Development',
      source_type: 'payment',
      source_id: payment.id,
      created_by: 'System',
      created_at: payment.created_at,
      updated_at: payment.updated_at || payment.created_at,
      is_system_generated: true,
    });
  }

  for (const income of state.finance_income) {
    if (income.status !== 'Completed') continue;
    addRow({
      id: `income-${income.id}`,
      transaction_number: income.income_number,
      date: income.date,
      type: 'Income',
      description: income.description || income.category || 'Manual income',
      counterparty_name: findCustomerById(income.customer_id)?.name || '',
      account_id: income.account_id ?? resolveFinanceAccountIdByMethod(income.payment_method),
      account_name: getFinanceAccountById(income.account_id ?? resolveFinanceAccountIdByMethod(income.payment_method))?.account_name || '',
      debit: 0,
      credit: Number(income.amount || 0),
      reference: income.transaction_reference || income.income_number,
      status: 'Completed',
      customer_id: income.customer_id || null,
      order_id: income.order_id || null,
      invoice_id: income.invoice_id || null,
      project_id: income.project_id || null,
      category: income.category || 'Other',
      source_type: income.source_type || 'manual',
      source_id: income.id,
      created_by: income.created_by || 'SiteArvo Admin',
      created_at: income.created_at,
      updated_at: income.updated_at || income.created_at,
      is_system_generated: Boolean(income.is_system_generated),
    });
  }

  for (const expense of state.finance_expenses) {
    if (expense.status !== 'Paid') continue;
    const vendor = expense.vendor_id ? state.finance_vendors.find(item => Number(item.id) === Number(expense.vendor_id)) : null;
    addRow({
      id: `expense-${expense.id}`,
      transaction_number: expense.expense_number,
      date: expense.date,
      type: 'Expense',
      description: expense.description || expense.expense_category || 'Business expense',
      counterparty_name: vendor?.vendor_name || '',
      account_id: expense.account_id ?? resolveFinanceAccountIdByMethod(expense.payment_method),
      account_name: getFinanceAccountById(expense.account_id ?? resolveFinanceAccountIdByMethod(expense.payment_method))?.account_name || '',
      debit: Number(expense.amount || 0) + Number(expense.tax_amount || 0),
      credit: 0,
      reference: expense.reference_number || expense.expense_number,
      status: 'Completed',
      vendor_id: expense.vendor_id || null,
      project_id: expense.project_id || null,
      category: expense.expense_category || 'Miscellaneous',
      source_type: expense.source_type || 'manual',
      source_id: expense.id,
      created_by: expense.created_by || 'SiteArvo Admin',
      created_at: expense.created_at,
      updated_at: expense.updated_at || expense.created_at,
      is_system_generated: Boolean(expense.is_system_generated),
    });
  }

  for (const refund of state.finance_refunds) {
    if (refund.status !== 'Completed') continue;
    const payment = refund.original_payment_id ? state.payments.find(item => Number(item.id) === Number(refund.original_payment_id)) : null;
    const customer = refund.customer_id ? findCustomerById(refund.customer_id) : payment ? findCustomerById(payment.customer_id) : null;
    addRow({
      id: `refund-${refund.id}`,
      transaction_number: refund.refund_number,
      date: refund.date,
      type: 'Refund',
      description: refund.reason || 'Refund completed',
      counterparty_name: customer?.name || '',
      account_id: refund.account_id ?? resolveFinanceAccountIdByMethod('Bank Transfer'),
      account_name: getFinanceAccountById(refund.account_id ?? resolveFinanceAccountIdByMethod('Bank Transfer'))?.account_name || '',
      debit: Number(refund.amount || 0),
      credit: 0,
      reference: refund.transaction_reference || refund.refund_number,
      status: 'Completed',
      customer_id: refund.customer_id || customer?.id || null,
      source_type: 'refund',
      source_id: refund.id,
      created_by: refund.created_by || 'SiteArvo Admin',
      created_at: refund.created_at,
      updated_at: refund.updated_at || refund.created_at,
      is_system_generated: true,
    });
  }

  for (const adjustment of state.finance_adjustments) {
    addRow({
      id: `adjustment-${adjustment.id}`,
      transaction_number: adjustment.adjustment_number,
      date: adjustment.date,
      type: 'Adjustment',
      description: adjustment.reason || 'Finance adjustment',
      counterparty_name: adjustment.reason || '',
      account_id: adjustment.account_id ?? (getFinanceAccountByType('Bank Account')?.id || getFinanceAccountByType('Cash')?.id || null),
      account_name: getFinanceAccountById(adjustment.account_id ?? (getFinanceAccountByType('Bank Account')?.id || getFinanceAccountByType('Cash')?.id || null))?.account_name || '',
      debit: adjustment.direction === 'debit' ? Number(adjustment.amount || 0) : 0,
      credit: adjustment.direction === 'credit' ? Number(adjustment.amount || 0) : 0,
      reference: adjustment.adjustment_number,
      status: 'Completed',
      source_type: 'adjustment',
      source_id: adjustment.id,
      created_by: adjustment.created_by || 'SiteArvo Admin',
      created_at: adjustment.created_at,
      updated_at: adjustment.updated_at || adjustment.created_at,
      is_system_generated: false,
    });
  }

  rows.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at));
  return rows;
}

function rebuildFinanceDerived(state) {
  ensureDefaultFinanceCollections(state);
  const accounts = state.finance_accounts;
  const ledger = buildFinanceLedgerRows(state);
  for (const account of accounts) {
    const credits = ledger.filter(row => Number(row.account_id) === Number(account.id)).reduce((sum, row) => sum + Number(row.credit || 0), 0);
    const debits = ledger.filter(row => Number(row.account_id) === Number(account.id)).reduce((sum, row) => sum + Number(row.debit || 0), 0);
    account.current_balance = Math.round(((Number(account.opening_balance || 0)) + credits - debits) * 100) / 100;
    account.currency = account.currency || financeSummaryCurrency();
  }

  state.finance_transactions = ledger;
  state.finance_income_derived = [
    ...state.finance_income.map(income => ({ ...clone(income), is_system_generated: false })),
    ...state.payments.filter(payment => payment.status === 'Received').map(buildPaymentDerivedIncome),
  ].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  state.finance_receivables = buildFinanceReceivables(state);
  state.finance_payables = buildFinancePayables(state);
  state.finance_reports = buildFinanceReports(state);
  state.finance_alerts = buildFinanceAlerts(state);
  state.finance_summary = buildFinanceSummary(state);
}

function buildFinanceReceivables(state) {
  return clone(state.invoices).map(invoice => {
    const order = state.orders.find(item => Number(item.id) === Number(invoice.order_id)) || null;
    const customer = findCustomerById(invoice.customer_id || order?.customer_id);
    const paid = Number(invoice.amount_paid || 0);
    const total = Number(invoice.total || order?.total_amount || 0);
    const due = Math.max(0, Math.round((total - paid) * 100) / 100);
    const dueDate = invoice.due_date || order?.created_at || invoice.created_at;
    const dayCount = Math.max(0, Math.floor((Date.now() - new Date(dueDate || invoice.created_at).getTime()) / 86400000));
    let status = 'Current';
    if (due > 0) {
      if (dayCount > 90) status = '90+ Days';
      else if (dayCount > 60) status = '61–90 Days';
      else if (dayCount > 30) status = '31–60 Days';
      else if (dayCount > 0) status = '1–30 Days';
      else if (dueDate && new Date(dueDate).getTime() - Date.now() <= 7 * 86400000) status = 'Due Soon';
    }
    if (due <= 0) status = 'Paid';
    return {
      invoice_id: invoice.invoice_number,
      customer_id: customer?.id || invoice.customer_id || null,
      customer_name: customer?.name || invoice.customer_name || order?.full_name || 'Customer',
      order_id: order?.order_number || invoice.order_id || '',
      total_amount: total,
      amount_paid: paid,
      balance_due: due,
      due_date: invoice.due_date || '',
      days_outstanding: due > 0 ? dayCount : 0,
      status,
      project_id: order?.project_id || null,
    };
  }).filter(item => item.balance_due > 0).sort((a, b) => b.days_outstanding - a.days_outstanding);
}

function buildFinancePayables(state) {
  return clone(state.finance_expenses).filter(expense => expense.status !== 'Cancelled').map(expense => {
    const vendor = expense.vendor_id ? state.finance_vendors.find(item => Number(item.id) === Number(expense.vendor_id)) : null;
    const paid = expense.status === 'Paid' ? Number(expense.amount || 0) + Number(expense.tax_amount || 0) : toNumber(expense.paid || 0, 0) || 0;
    const total = Number(expense.amount || 0) + Number(expense.tax_amount || 0);
    const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
    const days = Math.max(0, Math.floor((Date.now() - new Date(expense.date || expense.created_at).getTime()) / 86400000));
    let status = 'Unpaid';
    if (balance <= 0) status = 'Paid';
    else if (paid > 0) status = 'Partially Paid';
    else if (days > 0) status = 'Overdue';
    return {
      vendor_id: vendor?.id || expense.vendor_id || null,
      vendor_name: vendor?.vendor_name || 'Vendor',
      bill_reference: expense.reference_number || expense.expense_number,
      amount: total,
      paid,
      balance_due: balance,
      due_date: expense.date || '',
      status,
      project_id: expense.project_id || null,
    };
  }).filter(item => item.balance_due > 0).sort((a, b) => b.balance_due - a.balance_due);
}

function sumTransactions(rows, predicate = () => true) {
  return rows.filter(predicate).reduce((sum, row) => sum + Number(row.credit || 0) - Number(row.debit || 0), 0);
}

function buildFinanceSummary(state, bounds = financeRangeFromQuery(new URLSearchParams(), state.settings)) {
  const ledger = state.finance_transactions || buildFinanceLedgerRows(state);
  const filteredLedger = ledger.filter(row => financeWithinRange(row.date, bounds));
  const totalIncome = ledger.filter(row => row.type === 'Income' || row.type === 'Refund').reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const totalExpenses = ledger.filter(row => row.type === 'Expense' || row.type === 'Adjustment' || row.type === 'Refund').reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const thisMonthIncome = filteredLedger.filter(row => row.type === 'Income').reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const thisMonthExpenses = filteredLedger.filter(row => row.type === 'Expense' || row.type === 'Adjustment' || row.type === 'Refund').reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const receivables = buildFinanceReceivables(state).reduce((sum, item) => sum + Number(item.balance_due || 0), 0);
  const payables = buildFinancePayables(state).reduce((sum, item) => sum + Number(item.balance_due || 0), 0);
  const accountBalances = state.finance_accounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
  const cashBalance = state.finance_accounts.filter(account => financeAccountTypeGroup(account.account_type) === 'cash' && account.active !== false).reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
  const bankBalance = state.finance_accounts.filter(account => financeAccountTypeGroup(account.account_type) === 'bank' && account.active !== false).reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
  return {
    range: bounds.range,
    currency: financeSummaryCurrency(),
    total_income: Math.round(totalIncome * 100) / 100,
    total_expenses: Math.round(totalExpenses * 100) / 100,
    net_profit: Math.round((totalIncome - totalExpenses) * 100) / 100,
    outstanding_receivables: Math.round(receivables * 100) / 100,
    outstanding_payables: Math.round(payables * 100) / 100,
    cash_balance: Math.round(cashBalance * 100) / 100,
    bank_balance: Math.round(bankBalance * 100) / 100,
    total_account_balance: Math.round(accountBalances * 100) / 100,
    this_month_income: Math.round(thisMonthIncome * 100) / 100,
    this_month_expenses: Math.round(thisMonthExpenses * 100) / 100,
    collected_this_month: Math.round(thisMonthIncome * 100) / 100,
    expenses_this_month: Math.round(thisMonthExpenses * 100) / 100,
    net_this_month: Math.round((thisMonthIncome - thisMonthExpenses) * 100) / 100,
    filtered_transactions: filteredLedger.length,
  };
}

function buildFinanceAlerts(state) {
  const receivables = buildFinanceReceivables(state);
  const payables = buildFinancePayables(state);
  const overdueInvoices = receivables.filter(item => item.status === '31–60 Days' || item.status === '61–90 Days' || item.status === '90+ Days');
  const overdueExpenses = payables.filter(item => item.status === 'Overdue');
  const budgets = state.finance_budgets.filter(budget => budget.active !== false);
  return {
    overdue_invoices: overdueInvoices.length,
    dues_this_week: state.finance_income.filter(item => item.status === 'Pending').length,
    receivable_outstanding: receivables.reduce((sum, item) => sum + Number(item.balance_due || 0), 0),
    payable_this_week: payables.reduce((sum, item) => sum + Number(item.balance_due || 0), 0),
    overdue_expenses: overdueExpenses.length,
    budget_alerts: budgets.filter(budget => budget.amount && budget.spent / budget.amount >= 0.8).length,
  };
}

function buildFinanceReports(state, ledgerOverride = null, bounds = null) {
  const fullLedger = state.finance_transactions || buildFinanceLedgerRows(state);
  const ledger = ledgerOverride || fullLedger;
  const revenueByService = new Map();
  const revenueByCategory = new Map();
  const expenseByCategory = new Map();
  const monthlyCashFlow = new Map();
  const monthlyNetProfit = new Map();
  const monthlyIncome = new Map();
  const monthlyExpenses = new Map();

  for (const row of ledger) {
    const monthKey = String(row.date || nowIso().slice(0, 10)).slice(0, 7);
    const amount = Number(row.credit || 0) - Number(row.debit || 0);
    monthlyCashFlow.set(monthKey, (monthlyCashFlow.get(monthKey) || 0) + amount);
    if (row.type === 'Income') {
      monthlyIncome.set(monthKey, (monthlyIncome.get(monthKey) || 0) + Number(row.credit || 0));
      revenueByService.set(row.category || 'Other', (revenueByService.get(row.category || 'Other') || 0) + Number(row.credit || 0));
      revenueByCategory.set(row.category || 'Other', (revenueByCategory.get(row.category || 'Other') || 0) + Number(row.credit || 0));
    }
    if (row.type === 'Expense' || row.type === 'Adjustment' || row.type === 'Refund') {
      monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) || 0) + Number(row.debit || 0));
      expenseByCategory.set(row.category || 'Miscellaneous', (expenseByCategory.get(row.category || 'Miscellaneous') || 0) + Number(row.debit || 0));
    }
    monthlyNetProfit.set(monthKey, (monthlyNetProfit.get(monthKey) || 0) + amount);
  }

  const openingBalance = state.finance_accounts.reduce((sum, account) => sum + Number(account.opening_balance || 0), 0) + (bounds ? fullLedger.filter(row => new Date(row.date || nowIso()).getTime() < bounds.start.getTime()).reduce((sum, row) => sum + Number(row.credit || 0) - Number(row.debit || 0), 0) : 0);
  const moneyIn = ledger.filter(row => Number(row.credit || 0) > 0).reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const moneyOut = ledger.filter(row => Number(row.debit || 0) > 0).reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const closingBalance = openingBalance + moneyIn - moneyOut;

  return {
    profit_loss: {
      revenue: Array.from(revenueByCategory.entries()).map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount),
      total_revenue: Math.round(Array.from(revenueByCategory.values()).reduce((sum, amount) => sum + amount, 0) * 100) / 100,
      expenses: Array.from(expenseByCategory.entries()).map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount),
      total_expenses: Math.round(Array.from(expenseByCategory.values()).reduce((sum, amount) => sum + amount, 0) * 100) / 100,
      net_profit: Math.round((Array.from(revenueByCategory.values()).reduce((sum, amount) => sum + amount, 0) - Array.from(expenseByCategory.values()).reduce((sum, amount) => sum + amount, 0)) * 100) / 100,
    },
    cash_flow: {
      opening_balance: Math.round(openingBalance * 100) / 100,
      money_in: Math.round(moneyIn * 100) / 100,
      money_out: Math.round(moneyOut * 100) / 100,
      closing_balance: Math.round(closingBalance * 100) / 100,
      monthly: Array.from(monthlyCashFlow.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 })),
    },
    income_vs_expense: {
      income: Array.from(monthlyIncome.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 })),
      expense: Array.from(monthlyExpenses.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 })),
    },
    monthly_profit: Array.from(monthlyNetProfit.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 })),
    revenue_by_service: Array.from(revenueByService.entries()).map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount),
    revenue_by_category: Array.from(revenueByCategory.entries()).map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount),
    expense_breakdown: Array.from(expenseByCategory.entries()).map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount),
    customer_outstanding: Object.values(buildFinanceReceivables(state).reduce((acc, item) => {
      const key = `${item.customer_id || item.customer_name}`;
      if (!acc[key]) {
        acc[key] = {
          customer_name: item.customer_name,
          invoices: 0,
          total_due: 0,
          overdue: 0,
          oldest_due_date: item.due_date || '',
        };
      }
      acc[key].invoices += 1;
      acc[key].total_due += Number(item.balance_due || 0);
      if (item.days_outstanding > 0) acc[key].overdue += Number(item.balance_due || 0);
      if (item.due_date && (!acc[key].oldest_due_date || new Date(item.due_date) < new Date(acc[key].oldest_due_date))) acc[key].oldest_due_date = item.due_date;
      return acc;
    }, {})).map(item => ({ ...item, total_due: Math.round(item.total_due * 100) / 100, overdue: Math.round(item.overdue * 100) / 100 })).sort((a, b) => b.total_due - a.total_due),
    aging_receivables: ageBuckets(buildFinanceReceivables(state).map(item => ({ date: item.due_date, amount: item.balance_due }))),
    aging_payables: ageBuckets(buildFinancePayables(state).map(item => ({ date: item.due_date, amount: item.balance_due }))),
  };
}

function ageBuckets(items = []) {
  const buckets = { current: 0, oneTo30: 0, thirtyOneTo60: 0, sixtyOneTo90: 0, ninetyPlus: 0 };
  for (const item of items) {
    const dueDate = new Date(item.date || nowIso());
    const days = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000));
    const amount = Number(item.amount || 0);
    if (days <= 0) buckets.current += amount;
    else if (days <= 30) buckets.oneTo30 += amount;
    else if (days <= 60) buckets.thirtyOneTo60 += amount;
    else if (days <= 90) buckets.sixtyOneTo90 += amount;
    else buckets.ninetyPlus += amount;
  }
  return {
    current: Math.round(buckets.current * 100) / 100,
    one_to_30: Math.round(buckets.oneTo30 * 100) / 100,
    thirty_one_to_60: Math.round(buckets.thirtyOneTo60 * 100) / 100,
    sixty_one_to_90: Math.round(buckets.sixtyOneTo90 * 100) / 100,
    ninety_plus: Math.round(buckets.ninetyPlus * 100) / 100,
  };
}

function currentYear() {
  return new Date().getFullYear();
}

function businessCode(prefix, id) {
  return `SAR-${prefix}-${currentYear()}-${String(id).padStart(4, '0')}`;
}

function normalizeAnalyticsPath(value) {
  const raw = safeText(value) || '/';
  try {
    const url = new URL(raw, 'http://sitearvo.local');
    const pathname = url.pathname.replace(/\/{2,}/g, '/');
    return pathname === '' ? '/' : pathname;
  } catch {
    return raw.split('?')[0].split('#')[0] || '/';
  }
}

const analyticsNoiseParams = new Set(['LSCWP_CTRL', 'nocache', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']);

function parseAnalyticsUrl(raw = '/') {
  try {
    return new URL(safeText(raw) || '/', 'http://sitearvo.local');
  } catch {
    return new URL('/', 'http://sitearvo.local');
  }
}

function isoDateUTC(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function endOfUtcDay(date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function startOfUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function startOfUtcYear(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
}

function addUtcDays(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function addUtcMonths(date, months) {
  const value = new Date(date);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value;
}

function withinAnalyticsRange(dateValue, bounds) {
  const time = new Date(dateValue || nowIso()).getTime();
  if (Number.isNaN(time)) return false;
  const start = bounds?.start ? new Date(bounds.start).getTime() : Number.NEGATIVE_INFINITY;
  const end = bounds?.end ? new Date(bounds.end).getTime() : Number.POSITIVE_INFINITY;
  return time >= start && time <= end;
}

function parseAnalyticsBoundary(value, end = false) {
  if (!value) return null;
  const candidate = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function analyticsRangePreset(range, now = new Date()) {
  const today = startOfUtcDay(now);
  if (range === 'today') return { start: today, end: now, granularity: 'day', label: 'Today' };
  if (range === 'yesterday') {
    const start = addUtcDays(today, -1);
    return { start, end: endOfUtcDay(start), granularity: 'day', label: 'Yesterday' };
  }
  if (range === 'last_7_days') return { start: addUtcDays(today, -6), end: now, granularity: 'day', label: 'Last 7 Days' };
  if (range === 'last_30_days') return { start: addUtcDays(today, -29), end: now, granularity: 'day', label: 'Last 30 Days' };
  if (range === 'last_90_days') return { start: addUtcDays(today, -89), end: now, granularity: 'week', label: 'Last 90 Days' };
  if (range === 'this_month') return { start: startOfUtcMonth(now), end: now, granularity: 'day', label: 'This Month' };
  if (range === 'last_month') {
    const previousMonth = addUtcMonths(startOfUtcMonth(now), -1);
    return { start: previousMonth, end: endOfUtcMonth(previousMonth), granularity: 'day', label: 'Last Month' };
  }
  if (range === 'this_year') return { start: startOfUtcYear(now), end: now, granularity: 'month', label: 'This Year' };
  return { start: addUtcDays(today, -6), end: now, granularity: 'day', label: 'Last 7 Days' };
}

function analyticsRangeFromQuery(searchParams = new URLSearchParams()) {
  const range = safeText(searchParams.get('range')) || 'last_7_days';
  const compare = searchParams.get('compare') !== '0';
  const metric = safeText(searchParams.get('metric')) || 'visits';
  const start = parseAnalyticsBoundary(searchParams.get('start')) || undefined;
  const end = parseAnalyticsBoundary(searchParams.get('end'), true) || undefined;
  const now = new Date();
  const preset = range === 'custom' && start && end ? {
    start,
    end,
    granularity: Math.ceil((end.getTime() - start.getTime()) / 86400000) > 180 ? 'month' : Math.ceil((end.getTime() - start.getTime()) / 86400000) > 45 ? 'week' : 'day',
    label: 'Custom Range',
  } : analyticsRangePreset(range, now);
  return {
    range,
    metric,
    compare,
    start: preset.start,
    end: preset.end,
    granularity: preset.granularity,
    label: preset.label,
  };
}

function analyticsBucketLabel(date, granularity = 'day', bucketEnd = null) {
  const options = { day: '2-digit', month: 'short' };
  if (granularity === 'month') return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  if (granularity === 'week' && bucketEnd) {
    return `${new Date(date).toLocaleDateString('en-IN', options)} – ${new Date(bucketEnd).toLocaleDateString('en-IN', options)}`;
  }
  return new Date(date).toLocaleDateString('en-IN', options);
}

function analyticsBuckets(bounds, granularity = 'day') {
  const buckets = [];
  let cursor = startOfUtcDay(bounds.start);
  if (granularity === 'month') cursor = startOfUtcMonth(bounds.start);
  while (cursor <= bounds.end) {
    let bucketEnd;
    if (granularity === 'month') bucketEnd = endOfUtcMonth(cursor);
    else if (granularity === 'week') bucketEnd = endOfUtcDay(addUtcDays(cursor, 6));
    else bucketEnd = endOfUtcDay(cursor);
    if (bucketEnd > bounds.end) bucketEnd = bounds.end;
    buckets.push({
      start: new Date(cursor),
      end: new Date(bucketEnd),
      label: analyticsBucketLabel(cursor, granularity, bucketEnd),
      date: isoDateUTC(cursor),
    });
    if (granularity === 'month') cursor = addUtcMonths(cursor, 1);
    else if (granularity === 'week') cursor = addUtcDays(cursor, 7);
    else cursor = addUtcDays(cursor, 1);
  }
  return buckets;
}

function analyticsCountChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (!previousValue) return currentValue ? null : 0;
  return Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10;
}

function classifyTrafficSource({ referrer = '', campaignSource = '', campaignMedium = '' } = {}) {
  const source = String(campaignSource || '').toLowerCase();
  const medium = String(campaignMedium || '').toLowerCase();
  const ref = String(referrer || '');
  const refHost = (() => {
    try { return new URL(ref).hostname.toLowerCase(); } catch { return ''; }
  })();
  if (source.includes('whatsapp') || medium.includes('whatsapp')) return 'WhatsApp';
  if (!ref && !source && !medium) return 'Direct';
  if (source.includes('google') || refHost.includes('google.')) return 'Google';
  if (/(facebook|instagram|tiktok|linkedin|twitter|x\.com|youtube)/i.test(source) || /(facebook|instagram|tiktok|linkedin|twitter|x\.com|youtube)/i.test(refHost)) return 'Social';
  if (source.includes('facebook') || source.includes('instagram')) return 'Social';
  if (medium === 'email' || source.includes('email')) return 'Email';
  if (medium === 'referral') return 'Referral';
  if (refHost) return 'Referral';
  return 'Other';
}

function titleCaseAnalytics(value = 'Unknown') {
  return String(value || 'Unknown').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, character => character.toUpperCase());
}

function humanizeAnalyticsPath(pathname = '/') {
  const path = normalizeAnalyticsPath(pathname);
  if (path === '/') return 'Home';
  if (path === '/services') return 'Services';
  if (path === '/portfolio') return 'Portfolio';
  if (path === '/pricing') return 'Pricing';
  if (path === '/contact') return 'Contact';
  if (path === '/about') return 'About Us';
  if (path === '/cart') return 'Cart';
  if (path === '/checkout') return 'Checkout';
  if (path === '/blog') return 'Blog';
  if (path.startsWith('/services/category/')) return path.split('/').filter(Boolean).at(-1).replaceAll('-', ' ');
  if (path.startsWith('/services/')) {
    const slug = path.split('/').filter(Boolean).at(-1);
    const service = getAllServices().find(item => item.slug === slug);
    return service?.name || slug.replaceAll('-', ' ');
  }
  if (path.startsWith('/portfolio/')) {
    const slug = path.split('/').filter(Boolean).at(-1);
    const project = store.projects.find(item => item.slug === slug);
    return project?.title || slug.replaceAll('-', ' ');
  }
  return path.replace(/^\/+/, '').replaceAll('-', ' ') || 'Home';
}

function buildAnalyticsPeriodReport(bounds, options = {}) {
  const granularity = options.granularity || 'day';
  const buckets = analyticsBuckets(bounds, granularity);
  const rangeEntries = store.analytics.filter(entry => withinAnalyticsRange(entry.created_at, bounds));
  const rangeOrders = store.orders.filter(order => withinAnalyticsRange(order.created_at, bounds));
  const rangeLeads = store.leads.filter(lead => withinAnalyticsRange(lead.created_at, bounds));
  const rangeEvents = store.events.filter(event => withinAnalyticsRange(event.created_at, bounds));
  const financeRows = (store.finance_transactions || buildFinanceLedgerRows(store)).filter(row => withinAnalyticsRange(row.date || row.created_at, bounds) && Number(row.credit || 0) > 0);
  const serviceMap = new Map(getAllServices().map(service => [String(service.id), service]));
  const serviceSlugMap = new Map(getAllServices().map(service => [service.slug, service]));

  const metricRows = buckets.map(bucket => {
    const bucketEntries = rangeEntries.filter(entry => withinAnalyticsRange(entry.created_at, bucket));
    const bucketOrders = rangeOrders.filter(order => withinAnalyticsRange(order.created_at, bucket));
    const bucketLeads = rangeLeads.filter(lead => withinAnalyticsRange(lead.created_at, bucket));
    const bucketEvents = rangeEvents.filter(event => withinAnalyticsRange(event.created_at, bucket));
    const bucketFinance = financeRows.filter(row => withinAnalyticsRange(row.date || row.created_at, bucket));
    const visits = bucketEntries.length;
    const visitors = new Set(bucketEntries.map(entry => entry.visitor_hash)).size;
    const orders = bucketOrders.length;
    const enquiries = bucketLeads.length + bucketEvents.filter(event => event.type === 'contact_form_submitted').length;
    const revenue = bucketFinance.reduce((sum, row) => sum + Number(row.credit || 0), 0);
    return {
      date: bucket.date,
      label: bucket.label,
      visits,
      visitors,
      orders,
      enquiries,
      revenue: Math.round(revenue * 100) / 100,
      conversion_rate: visitors ? Math.round((orders / visitors) * 1000) / 10 : 0,
    };
  });

  const summary = metricRows.reduce((acc, row) => {
    acc.visits += row.visits;
    acc.visitorsSet.add(row.label);
    acc.orders += row.orders;
    acc.enquiries += row.enquiries;
    acc.revenue += row.revenue;
    return acc;
  }, { visits: 0, visitorsSet: new Set(), orders: 0, enquiries: 0, revenue: 0 });
  const uniqueVisitors = new Set(rangeEntries.map(entry => entry.visitor_hash)).size;
  const conversionRate = uniqueVisitors ? Math.round((rangeOrders.length / uniqueVisitors) * 1000) / 10 : 0;
  summary.revenue = Math.round(summary.revenue * 100) / 100;

  const previousSpan = bounds.end.getTime() - bounds.start.getTime();
  const previousBounds = options.compare === false ? null : {
    start: new Date(bounds.start.getTime() - previousSpan - 1),
    end: new Date(bounds.start.getTime() - 1),
  };
  const previousEntries = previousBounds ? store.analytics.filter(entry => withinAnalyticsRange(entry.created_at, previousBounds)) : [];
  const previousOrders = previousBounds ? store.orders.filter(order => withinAnalyticsRange(order.created_at, previousBounds)) : [];
  const previousLeads = previousBounds ? store.leads.filter(lead => withinAnalyticsRange(lead.created_at, previousBounds)) : [];
  const previousEvents = previousBounds ? store.events.filter(event => withinAnalyticsRange(event.created_at, previousBounds)) : [];
  const previousFinance = previousBounds ? (store.finance_transactions || buildFinanceLedgerRows(store)).filter(row => withinAnalyticsRange(row.date || row.created_at, previousBounds) && Number(row.credit || 0) > 0) : [];
  const previousUniqueVisitors = new Set(previousEntries.map(entry => entry.visitor_hash)).size;
  const previousRevenue = previousFinance.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const previousSummary = previousBounds ? {
    visits: previousEntries.length,
    visitors: previousUniqueVisitors,
    orders: previousOrders.length,
    enquiries: previousLeads.length + previousEvents.filter(event => event.type === 'contact_form_submitted').length,
    revenue: Math.round(previousRevenue * 100) / 100,
    conversion_rate: previousUniqueVisitors ? Math.round((previousOrders.length / previousUniqueVisitors) * 1000) / 10 : 0,
  } : null;

  const topPagesMap = new Map();
  const topTrafficMap = new Map();
  const topCampaignMap = new Map();
  const topBrowserMap = new Map();
  const topDeviceMap = new Map();
  const topCountryMap = new Map();
  const serviceViewMap = new Map();
  const packageMap = new Map();

  for (const entry of rangeEntries) {
    const path = normalizeAnalyticsPath(entry.path);
    const page = topPagesMap.get(path) || { path, label: humanizeAnalyticsPath(path), pageviews: 0, visitors: new Set() };
    page.pageviews += 1;
    page.visitors.add(entry.visitor_hash);
    topPagesMap.set(path, page);

    const trafficSource = entry.traffic_source || classifyTrafficSource({ referrer: entry.referrer, campaignSource: entry.campaign_source, campaignMedium: entry.campaign_medium });
    const traffic = topTrafficMap.get(trafficSource) || { source: trafficSource, pageviews: 0, visitors: new Set() };
    traffic.pageviews += 1;
    traffic.visitors.add(entry.visitor_hash);
    topTrafficMap.set(trafficSource, traffic);

    const campaignSource = titleCaseAnalytics(firstOrUnknown(entry.campaign_source || trafficSource));
    const campaign = topCampaignMap.get(campaignSource) || { source: campaignSource, pageviews: 0, visitors: new Set() };
    campaign.pageviews += 1;
    campaign.visitors.add(entry.visitor_hash);
    topCampaignMap.set(campaignSource, campaign);

    const browserKey = firstOrUnknown(entry.browser_name || detectBrowser(entry.user_agent));
    const browser = topBrowserMap.get(browserKey) || { browser: browserKey, pageviews: 0, visitors: new Set() };
    browser.pageviews += 1;
    browser.visitors.add(entry.visitor_hash);
    topBrowserMap.set(browserKey, browser);

    const deviceKey = firstOrUnknown(entry.device_type || detectDevice(entry.user_agent));
    const device = topDeviceMap.get(deviceKey) || { device: deviceKey, pageviews: 0, visitors: new Set() };
    device.pageviews += 1;
    device.visitors.add(entry.visitor_hash);
    topDeviceMap.set(deviceKey, device);

    const countryKey = firstOrUnknown(entry.country_code || detectCountryCode(entry.accept_language));
    const country = topCountryMap.get(countryKey) || { country: countryKey, pageviews: 0, visitors: new Set() };
    country.pageviews += 1;
    country.visitors.add(entry.visitor_hash);
    topCountryMap.set(countryKey, country);

    if (path.startsWith('/services/')) {
      const slug = path.split('/').filter(Boolean).at(-1);
      const service = serviceSlugMap.get(slug);
      const key = service?.slug || slug;
      const stats = serviceViewMap.get(key) || { id: service?.id || slug, label: service?.name || humanizeAnalyticsPath(path), slug: service?.slug || slug, pageviews: 0, visitors: new Set(), add_to_cart: 0, orders: 0 };
      stats.pageviews += 1;
      stats.visitors.add(entry.visitor_hash);
      serviceViewMap.set(key, stats);

      const packageStats = packageMap.get(key) || { id: service?.id || slug, label: service?.name || humanizeAnalyticsPath(path), slug: service?.slug || slug, pageviews: 0, visitors: new Set(), add_to_cart: 0, orders: 0 };
      packageStats.pageviews += 1;
      packageStats.visitors.add(entry.visitor_hash);
      packageMap.set(key, packageStats);
    }
  }

  for (const event of rangeEvents) {
    const serviceId = event.service_id ? String(event.service_id) : '';
    const service = serviceMap.get(serviceId) || serviceSlugMap.get(event.service_slug);
    if (event.type === 'service_viewed' || event.type === 'package_viewed') {
      const key = service?.slug || event.service_slug || serviceId || event.path || event.entity_id || event.type;
      const current = serviceViewMap.get(key) || { id: service?.id || key, label: service?.name || event.service_name || humanizeAnalyticsPath(event.path || '/services'), slug: service?.slug || event.service_slug || key, pageviews: 0, visitors: new Set(), add_to_cart: 0, orders: 0 };
      current.pageviews += 1;
      serviceViewMap.set(key, current);
      const packageStats = packageMap.get(key) || { id: service?.id || key, label: service?.name || event.service_name || humanizeAnalyticsPath(event.path || '/services'), slug: service?.slug || event.service_slug || key, pageviews: 0, visitors: new Set(), add_to_cart: 0, orders: 0 };
      packageStats.pageviews += 1;
      packageMap.set(key, packageStats);
    }
    if (event.type === 'add_to_cart') {
      const key = service?.slug || event.service_slug || serviceId || event.package_name || event.path || 'package';
      const current = packageMap.get(key) || { id: service?.id || key, label: service?.name || event.package_name || event.service_name || humanizeAnalyticsPath(event.path || '/services'), slug: service?.slug || event.service_slug || key, pageviews: 0, visitors: new Set(), add_to_cart: 0, orders: 0 };
      current.add_to_cart += 1;
      packageMap.set(key, current);
    }
  }

  for (const order of rangeOrders) {
    const service = serviceMap.get(String(order.service_id)) || serviceSlugMap.get(order.service_slug);
    const key = service?.slug || order.service_slug || order.service_name || String(order.service_id || order.id);
    const current = packageMap.get(key) || { id: service?.id || key, label: service?.name || order.service_name || 'Package', slug: service?.slug || key, pageviews: 0, visitors: new Set(), add_to_cart: 0, orders: 0 };
    current.orders += 1;
    packageMap.set(key, current);
  }

  const topPages = [...topPagesMap.values()].map(item => ({ path: item.path, label: item.label, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const trafficSources = [...topTrafficMap.values()].map(item => ({ source: item.source, pageviews: item.pageviews, visitors: item.visitors.size, share: rangeEntries.length ? Math.round((item.pageviews / rangeEntries.length) * 1000) / 10 : 0 })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 8);
  const campaignSources = [...topCampaignMap.values()].map(item => ({ source: item.source, pageviews: item.pageviews, visitors: item.visitors.size, share: rangeEntries.length ? Math.round((item.pageviews / rangeEntries.length) * 1000) / 10 : 0 })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 8);
  const browsers = [...topBrowserMap.values()].map(item => ({ browser: item.browser, pageviews: item.pageviews, visitors: item.visitors.size, share: rangeEntries.length ? Math.round((item.pageviews / rangeEntries.length) * 1000) / 10 : 0 })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 8);
  const devices = [...topDeviceMap.values()].map(item => ({ device: item.device, pageviews: item.pageviews, visitors: item.visitors.size, share: rangeEntries.length ? Math.round((item.pageviews / rangeEntries.length) * 1000) / 10 : 0 })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 8);
  const countries = [...topCountryMap.values()].map(item => ({ country: item.country, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 8);
  const totalServiceViews = [...serviceViewMap.values()].reduce((sum, item) => sum + Number(item.pageviews || 0), 0);
  const totalPackageViews = [...packageMap.values()].reduce((sum, item) => sum + Number(item.pageviews || 0), 0);
  const topServices = [...serviceViewMap.values()].map(item => ({ id: item.id, label: item.label, slug: item.slug, views: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.views - a.views).slice(0, 8);
  const topPackages = [...packageMap.values()].map(item => ({ id: item.id, label: item.label, slug: item.slug, views: item.pageviews, visitors: item.visitors.size, add_to_cart: item.add_to_cart, orders: item.orders })).sort((a, b) => (b.views + b.add_to_cart + b.orders) - (a.views + a.add_to_cart + a.orders)).slice(0, 8);
  const configuratorEventCounts = {
    started: 0,
    page_package_selected: 0,
    technology_selected: 0,
    addon_selected: 0,
    added_to_cart: 0,
    checkout_started: 0,
    order_submitted: 0,
  };
  const configuratorPagePackagesMap = new Map();
  const configuratorTechnologiesMap = new Map();
  const configuratorAddonsMap = new Map();
  for (const event of rangeEvents) {
    if (!String(event.type || '').startsWith('configurator_')) continue;
    if (event.type === 'configurator_started') configuratorEventCounts.started += 1;
    if (event.type === 'configurator_page_package_selected') configuratorEventCounts.page_package_selected += 1;
    if (event.type === 'configurator_technology_selected') configuratorEventCounts.technology_selected += 1;
    if (event.type === 'configurator_addon_selected') configuratorEventCounts.addon_selected += 1;
    if (event.type === 'configurator_added_to_cart') configuratorEventCounts.added_to_cart += 1;
    if (event.type === 'configurator_checkout_started') configuratorEventCounts.checkout_started += 1;
    if (event.type === 'configurator_order_submitted') configuratorEventCounts.order_submitted += 1;

    if (event.selection_action === 'remove') continue;
    const quantity = Math.max(1, Number(event.selection_quantity || event.quantity || 1));
    const label = event.option_name || event.service_name || event.package_name || event.option_id || event.entity_id || event.type;
    const group = String(event.selection_group || '').toLowerCase();
    const targetMap = group === 'page-packages' ? configuratorPagePackagesMap : group === 'technology' ? configuratorTechnologiesMap : configuratorAddonsMap;
    const current = targetMap.get(label) || { label, selections: 0, quantity: 0 };
    current.selections += 1;
    current.quantity += quantity;
    targetMap.set(label, current);
  }
  const topConfiguratorPagePackages = [...configuratorPagePackagesMap.values()].sort((a, b) => b.selections - a.selections || b.quantity - a.quantity).slice(0, 6);
  const topConfiguratorTechnologies = [...configuratorTechnologiesMap.values()].sort((a, b) => b.selections - a.selections || b.quantity - a.quantity).slice(0, 6);
  const topConfiguratorAddons = [...configuratorAddonsMap.values()].sort((a, b) => b.selections - a.selections || b.quantity - a.quantity).slice(0, 6);
  const conversionCounts = {};
  for (const event of rangeEvents) {
    if (event.type === 'pageview') continue;
    conversionCounts[event.type] = (conversionCounts[event.type] || 0) + 1;
  }
  const conversions = Object.entries(conversionCounts).map(([type, total]) => ({ type, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  const funnel = {
    visitors: uniqueVisitors,
    service_views: totalServiceViews,
    package_views: totalPackageViews,
    add_to_cart: rangeEvents.filter(event => event.type === 'add_to_cart').length,
    checkout_started: rangeEvents.filter(event => event.type === 'checkout_started').length,
    enquiries: summary.enquiries,
    orders: rangeOrders.length,
  };
  const latestTimestamp = [...rangeEntries, ...rangeOrders, ...rangeLeads, ...rangeEvents, ...financeRows].reduce((max, item) => {
    const value = new Date(item.created_at || item.date || nowIso()).getTime();
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, 0);

  return {
    range: {
      key: options.range || 'last_7_days',
      label: options.label || analyticsRangePreset(options.range || 'last_7_days', bounds.end || new Date()).label,
      start: isoDateUTC(bounds.start),
      end: isoDateUTC(bounds.end),
      granularity,
      compare: options.compare !== false,
      metric: options.metric || 'visits',
    },
    summary: {
      visits: { current: rangeEntries.length, previous: previousSummary?.visits ?? null, change: analyticsCountChange(rangeEntries.length, previousSummary?.visits ?? 0) },
      visitors: { current: uniqueVisitors, previous: previousSummary?.visitors ?? null, change: analyticsCountChange(uniqueVisitors, previousSummary?.visitors ?? 0) },
      orders: { current: rangeOrders.length, previous: previousSummary?.orders ?? null, change: analyticsCountChange(rangeOrders.length, previousSummary?.orders ?? 0) },
      enquiries: { current: summary.enquiries, previous: previousSummary?.enquiries ?? null, change: analyticsCountChange(summary.enquiries, previousSummary?.enquiries ?? 0) },
      revenue: { current: summary.revenue, previous: previousSummary?.revenue ?? null, change: analyticsCountChange(summary.revenue, previousSummary?.revenue ?? 0) },
      conversion_rate: { current: conversionRate, previous: previousSummary?.conversion_rate ?? null, change: analyticsCountChange(conversionRate, previousSummary?.conversion_rate ?? 0) },
    },
    timeseries: metricRows,
    top_pages: topPages,
    traffic_sources: trafficSources,
    campaign_sources: campaignSources,
    devices,
    browsers,
    countries,
    top_services: topServices,
    top_packages: topPackages,
    configurator: {
      started: configuratorEventCounts.started,
      page_package_selected: configuratorEventCounts.page_package_selected,
      technology_selected: configuratorEventCounts.technology_selected,
      addon_selected: configuratorEventCounts.addon_selected,
      added_to_cart: configuratorEventCounts.added_to_cart,
      checkout_started: configuratorEventCounts.checkout_started,
      order_submitted: configuratorEventCounts.order_submitted,
      cart_conversion: configuratorEventCounts.started ? Math.round((configuratorEventCounts.added_to_cart / configuratorEventCounts.started) * 1000) / 10 : 0,
      checkout_conversion: configuratorEventCounts.started ? Math.round((configuratorEventCounts.checkout_started / configuratorEventCounts.started) * 1000) / 10 : 0,
      order_conversion: configuratorEventCounts.started ? Math.round((configuratorEventCounts.order_submitted / configuratorEventCounts.started) * 1000) / 10 : 0,
      top_page_packages: topConfiguratorPagePackages,
      top_technologies: topConfiguratorTechnologies,
      top_addons: topConfiguratorAddons,
    },
    conversions,
    funnel,
    currency: financeSummaryCurrency(),
    updated_at: latestTimestamp ? new Date(latestTimestamp).toISOString() : nowIso(),
  };
}

function isObviousBot(ua = '') {
  return /bot|crawler|spider|curl|wget|headless|lighthouse|pingdom|uptime|monitor|preview|axios|python-requests|scrapy|slurp|facebookexternalhit/i.test(String(ua));
}

function detectBrowser(ua = '') {
  const value = String(ua);
  if (/edg/i.test(value)) return 'Edge';
  if (/firefox/i.test(value)) return 'Firefox';
  if (/opr|opera/i.test(value)) return 'Opera';
  if (/chrome/i.test(value) && !/edg|opr|opera/i.test(value)) return 'Chrome';
  if (/safari/i.test(value) && !/chrome|chromium|edg|opr|opera/i.test(value)) return 'Safari';
  return 'Other';
}

function detectDevice(ua = '') {
  const value = String(ua);
  if (/ipad|tablet/i.test(value)) return 'Tablet';
  if (/mobi|android|iphone|ipod/i.test(value)) return 'Mobile';
  return 'Desktop';
}

function detectCountryCode(acceptLanguage = '') {
  const token = String(acceptLanguage || '').split(',')[0] || '';
  const country = token.split('-')[1];
  return country ? country.toUpperCase() : 'Unknown';
}

function firstOrUnknown(value) {
  return safeText(value) || 'Unknown';
}

function setIdCounter(meta, key, value) {
  if (!Number.isFinite(meta[key]) || meta[key] < value) meta[key] = value;
}

function createActivity(action, entity, entityId, adminName = 'System', ipAddress = '') {
  store.activity_logs.push({
    id: nextId('activityLog'),
    admin_name: adminName,
    action,
    entity,
    entity_id: entityId,
    ip_address: ipAddress,
    created_at: nowIso(),
  });
}

function createNotification(type, title, message, entityType = '', entityId = null) {
  store.notifications.unshift({
    id: nextId('notification'),
    type,
    title,
    message,
    entity_type: entityType,
    entity_id: entityId,
    is_read: false,
    created_at: nowIso(),
    read_at: null,
  });
}

function buildLeadNumber(id) {
  return businessCode('LEAD', id);
}

function buildCustomerNumber(id) {
  return businessCode('CUS', id);
}

function buildQuotationNumber(id) {
  return businessCode('Q', id);
}

function buildCartNumber(id) {
  return businessCode('CART', id);
}

function buildPaymentNumber(id) {
  return businessCode('PAY', id);
}

function buildInvoiceNumber(id) {
  return businessCode('INV', id);
}

function buildProjectNumber(id) {
  return businessCode('PROJ', id);
}

function buildPortfolioToken(id) {
  return businessCode('PORT', id);
}

function buildCouponCode(id) {
  return businessCode('COUPON', id);
}

function buildMediaToken(id) {
  return businessCode('MEDIA', id);
}

function buildNotificationCode(id) {
  return businessCode('NOTIF', id);
}

function buildActivityCode(id) {
  return businessCode('ACT', id);
}

function findCustomerMatch({ email = '', phone = '' }) {
  const normalizedEmail = safeText(email).toLowerCase();
  const normalizedPhone = safeText(phone).replace(/[^\d+]/g, '');
  return store.customers.find(customer => (
    normalizedEmail && customer.email === normalizedEmail
  ) || (
    normalizedPhone && safeText(customer.phone).replace(/[^\d+]/g, '') === normalizedPhone
  ));
}

function ensureCustomerFromContact(contact = {}, defaults = {}) {
  const matched = findCustomerMatch(contact);
  if (matched) return matched;
  const customer = {
    id: nextId('customer'),
    customer_number: buildCustomerNumber(store.meta.nextCustomerId - 1),
    name: safeText(contact.name) || safeText(defaults.name) || 'Website Visitor',
    company: safeText(contact.company) || safeText(defaults.company) || '',
    phone: safeText(contact.phone) || '',
    email: safeText(contact.email).toLowerCase() || '',
    country: safeText(contact.country) || safeText(defaults.country) || 'India',
    total_orders: 0,
    active_projects: 0,
    lead_ids: [],
    quote_ids: [],
    order_ids: [],
    payment_ids: [],
    project_ids: [],
    notes: safeText(contact.notes) || '',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.customers.push(customer);
  return customer;
}

function createLead(body, adminName = 'System', ipAddress = '', source = 'Manual') {
  const lead = {
    id: nextId('lead'),
    lead_number: buildLeadNumber(store.meta.nextLeadId - 1),
    name: safeText(body.name) || 'Unnamed Lead',
    phone: safeText(body.phone),
    email: safeText(body.email).toLowerCase(),
    company: safeText(body.company),
    country: safeText(body.country) || 'India',
    interested_service: safeText(body.interested_service || body.service || body.service_name),
    budget: safeText(body.budget),
    message: safeText(body.message),
    source: safeText(body.source) || source,
    assigned_to: safeText(body.assigned_to),
    status: ['New', 'Contacted', 'Qualified', 'Quote Sent', 'Negotiation', 'Won', 'Lost'].includes(safeText(body.status)) ? safeText(body.status) : 'New',
    priority: ['Low', 'Medium', 'High', 'Urgent'].includes(safeText(body.priority)) ? safeText(body.priority) : 'Medium',
    notes: safeText(body.notes),
    lead_score: toNumber(body.lead_score, null),
    last_contacted_at: safeText(body.last_contacted_at) || null,
    next_follow_up_at: safeText(body.next_follow_up_at) || null,
    customer_id: body.customer_id ? toNumber(body.customer_id, null) : null,
    quote_ids: Array.isArray(body.quote_ids) ? body.quote_ids.map(item => toNumber(item)).filter(Boolean) : [],
    order_ids: Array.isArray(body.order_ids) ? body.order_ids.map(item => toNumber(item)).filter(Boolean) : [],
    conversation_id: body.conversation_id ? safeText(body.conversation_id) : '',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.leads.push(lead);
  createNotification('lead', 'New Lead', `${lead.name} ${lead.interested_service ? `— ${lead.interested_service}` : ''}`.trim(), 'lead', lead.id);
  createActivity('Lead created', 'lead', lead.id, adminName, ipAddress);
  return lead;
}

function normaliseLineItems(items = []) {
  return items.map((item, index) => ({
    id: item.id || index + 1,
    name: safeText(item.name) || `Item ${index + 1}`,
    description: safeText(item.description),
    quantity: Math.max(1, toNumber(item.quantity, 1) || 1),
    unit_price: toNumber(item.unit_price ?? item.price, 0) || 0,
    discount: toNumber(item.discount, 0) || 0,
    tax: toNumber(item.tax, 0) || 0,
    total: toNumber(item.total, 0) || 0,
  }));
}

function recalcLineItems(items) {
  return items.map(item => {
    const gross = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
    const discount = Number(item.discount) || 0;
    const tax = Number(item.tax) || 0;
    const total = Math.max(0, Math.round((gross - discount + tax) * 100) / 100);
    return { ...item, total };
  });
}

function quoteTotals(quotation) {
  const subtotal = quotation.line_items.reduce((sum, item) => sum + ((Number(item.unit_price) || 0) * (Number(item.quantity) || 1)), 0);
  const discount_total = quotation.line_items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const tax_total = quotation.line_items.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const final_total = Math.max(0, Math.round((subtotal - discount_total + tax_total) * 100) / 100);
  quotation.subtotal = Math.round(subtotal * 100) / 100;
  quotation.discount_total = Math.round(discount_total * 100) / 100;
  quotation.tax_total = Math.round(tax_total * 100) / 100;
  quotation.final_total = final_total;
  return quotation;
}

function paymentStatusForOrder(order) {
  const successful = store.payments.filter(payment => Number(payment.order_id) === Number(order.id) && payment.status === 'Received');
  const totalPaid = successful.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  if (totalPaid <= 0) return 'Unpaid';
  if (totalPaid >= Number(order.total_amount || 0)) return 'Paid';
  return 'Partially Paid';
}

function updateOrderFinancialState(order) {
  order.amount_paid = store.payments.filter(payment => Number(payment.order_id) === Number(order.id) && payment.status === 'Received').reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  order.payment_status = paymentStatusForOrder(order);
  order.updated_at = nowIso();
  return order;
}

function createInvoiceFromOrder(order) {
  const id = nextId('invoice');
  const invoice = {
    id,
    invoice_number: buildInvoiceNumber(id),
    order_id: order.id,
    customer_id: order.customer_id || null,
    items: [
      { name: order.service_name, quantity: 1, unit_price: order.base_price, discount: 0, tax: 0, total: order.base_price },
      ...(order.addons || []).map(addon => ({
        name: addon.addon_name,
        quantity: addon.quantity,
        unit_price: addon.unit_price,
        discount: 0,
        tax: 0,
        total: addon.line_total,
      })),
    ],
    subtotal: Number(order.total_amount || 0),
    discount_total: 0,
    tax_total: 0,
    total: Number(order.total_amount || 0),
    amount_paid: Number(order.amount_paid || 0),
    balance: Math.max(0, Number(order.total_amount || 0) - Number(order.amount_paid || 0)),
    due_date: '',
    status: paymentStatusForOrder(order) === 'Paid' ? 'Paid' : 'Draft',
    notes: safeText(store.settings.invoice_notes),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.invoices.push(invoice);
  return invoice;
}

function syncInvoiceForOrder(order) {
  const invoice = store.invoices.find(item => Number(item.order_id) === Number(order.id));
  if (!invoice) return null;
  invoice.amount_paid = Number(order.amount_paid || 0);
  invoice.balance = Math.max(0, Number(order.total_amount || 0) - Number(order.amount_paid || 0));
  if (order.payment_status === 'Paid') invoice.status = 'Paid';
  else if (order.payment_status === 'Partially Paid' && invoice.status !== 'Paid') invoice.status = 'Partially Paid';
  else if (order.payment_status === 'Refunded') invoice.status = 'Cancelled';
  invoice.updated_at = nowIso();
  return invoice;
}

function parseArrayInput(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value.split('\n').map(line => line.trim()).filter(Boolean);
    } catch {
      return value.split('\n').map(line => line.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeLineItems(items = []) {
  return normaliseLineItems(items);
}

function normalizeLeadInput(body, existing = null) {
  const lead = existing || { id: nextId('lead') };
  if (!lead.lead_number) lead.lead_number = buildLeadNumber(lead.id);
  lead.name = safeText(body.name) || lead.name || 'Unnamed Lead';
  lead.phone = safeText(body.phone) || lead.phone || '';
  lead.email = safeText(body.email).toLowerCase() || lead.email || '';
  lead.company = safeText(body.company) || lead.company || '';
  lead.country = safeText(body.country) || lead.country || 'India';
  lead.interested_service = safeText(body.interested_service || body.service) || lead.interested_service || '';
  lead.budget = safeText(body.budget) || lead.budget || '';
  lead.message = safeText(body.message) || lead.message || '';
  lead.source = safeText(body.source) || lead.source || 'Manual';
  lead.assigned_to = safeText(body.assigned_to) || lead.assigned_to || '';
  lead.status = ['New', 'Contacted', 'Qualified', 'Quote Sent', 'Negotiation', 'Won', 'Lost'].includes(safeText(body.status)) ? safeText(body.status) : (lead.status || 'New');
  lead.priority = ['Low', 'Medium', 'High', 'Urgent'].includes(safeText(body.priority)) ? safeText(body.priority) : (lead.priority || 'Medium');
  lead.notes = safeText(body.notes) || lead.notes || '';
  lead.lead_score = toNumber(body.lead_score, lead.lead_score ?? null);
  lead.last_contacted_at = safeText(body.last_contacted_at) || lead.last_contacted_at || null;
  lead.next_follow_up_at = safeText(body.next_follow_up_at) || lead.next_follow_up_at || null;
  lead.customer_id = body.customer_id ? toNumber(body.customer_id, lead.customer_id ?? null) : lead.customer_id ?? null;
  lead.conversation_id = safeText(body.conversation_id) || lead.conversation_id || '';
  lead.updated_at = nowIso();
  return lead;
}

function normalizeCustomerInput(body, existing = null) {
  const customer = existing || { id: nextId('customer') };
  if (!customer.customer_number) customer.customer_number = buildCustomerNumber(customer.id);
  customer.name = safeText(body.name) || customer.name || 'Customer';
  customer.company = safeText(body.company) || customer.company || '';
  customer.phone = safeText(body.phone) || customer.phone || '';
  customer.email = safeText(body.email).toLowerCase() || customer.email || '';
  customer.country = safeText(body.country) || customer.country || 'India';
  customer.total_orders = toNumber(body.total_orders, customer.total_orders ?? 0) || 0;
  customer.active_projects = toNumber(body.active_projects, customer.active_projects ?? 0) || 0;
  customer.notes = safeText(body.notes) || customer.notes || '';
  customer.updated_at = nowIso();
  return customer;
}

function normalizeQuotationInput(body, existing = null) {
  const quotation = existing || { id: nextId('quotation') };
  if (!quotation.quotation_number) quotation.quotation_number = buildQuotationNumber(quotation.id);
  if (!quotation.token) quotation.token = crypto.randomBytes(16).toString('hex');
  quotation.title = safeText(body.title) || quotation.title || `Quotation ${quotation.quotation_number}`;
  quotation.customer_id = body.customer_id ? toNumber(body.customer_id, quotation.customer_id ?? null) : quotation.customer_id ?? null;
  quotation.lead_id = body.lead_id ? toNumber(body.lead_id, quotation.lead_id ?? null) : quotation.lead_id ?? null;
  quotation.service_id = body.service_id ? toNumber(body.service_id, quotation.service_id ?? null) : quotation.service_id ?? null;
  quotation.package_name = safeText(body.package_name) || quotation.package_name || '';
  quotation.status = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Converted'].includes(safeText(body.status)) ? safeText(body.status) : (quotation.status || 'Draft');
  quotation.validity_date = safeText(body.validity_date) || quotation.validity_date || '';
  quotation.notes = safeText(body.notes) || quotation.notes || '';
  quotation.terms = safeText(body.terms) || quotation.terms || '';
  quotation.line_items = recalcLineItems(normaliseLineItems(parseArrayInput(body.line_items).length ? parseArrayInput(body.line_items) : (existing?.line_items || [])));
  if (Array.isArray(body.line_items) && body.line_items.length) quotation.line_items = recalcLineItems(normaliseLineItems(body.line_items));
  quotation.addon_ids = parseArrayInput(body.addon_ids).map(item => toNumber(item)).filter(item => item !== null);
  quotation.converted_order_id = body.converted_order_id ? toNumber(body.converted_order_id, quotation.converted_order_id ?? null) : quotation.converted_order_id ?? null;
  quotation.sent_at = safeText(body.sent_at) || quotation.sent_at || null;
  quotation.viewed_at = safeText(body.viewed_at) || quotation.viewed_at || null;
  quotation.accepted_at = safeText(body.accepted_at) || quotation.accepted_at || null;
  quotation.rejected_at = safeText(body.rejected_at) || quotation.rejected_at || null;
  quotation.converted_at = safeText(body.converted_at) || quotation.converted_at || null;
  quotation.updated_at = nowIso();
  return quoteTotals(quotation);
}

function normalizeCartInput(body, existing = null) {
  const cart = existing || { id: nextId('cart') };
  if (!cart.cart_number) cart.cart_number = buildCartNumber(cart.id);
  cart.token = cart.token || crypto.randomBytes(16).toString('hex');
  cart.visitor_name = safeText(body.visitor_name) || cart.visitor_name || 'Website Visitor';
  cart.visitor_email = safeText(body.visitor_email).toLowerCase() || cart.visitor_email || '';
  cart.visitor_phone = safeText(body.visitor_phone) || cart.visitor_phone || '';
  cart.customer_id = body.customer_id ? toNumber(body.customer_id, cart.customer_id ?? null) : cart.customer_id ?? null;
  cart.lead_id = body.lead_id ? toNumber(body.lead_id, cart.lead_id ?? null) : cart.lead_id ?? null;
  cart.service_id = body.service_id ? toNumber(body.service_id, cart.service_id ?? null) : cart.service_id ?? null;
  cart.configuration = body.configuration && typeof body.configuration === 'object' ? body.configuration : (cart.configuration || null);
  cart.package_name = safeText(body.package_name) || cart.package_name || '';
  cart.addons = parseArrayInput(body.addons).length ? parseArrayInput(body.addons) : (cart.addons || []);
  cart.subtotal = toNumber(body.subtotal, cart.subtotal ?? 0) || 0;
  cart.total = toNumber(body.total, cart.total ?? 0) || 0;
  cart.recurring_monthly = toNumber(body.recurring_monthly, cart.recurring_monthly ?? 0) || 0;
  cart.recurring_yearly = toNumber(body.recurring_yearly, cart.recurring_yearly ?? 0) || 0;
  cart.status = ['Active', 'Checkout Started', 'Converted', 'Abandoned'].includes(safeText(body.status)) ? safeText(body.status) : (cart.status || 'Active');
  cart.source_page = safeText(body.source_page) || cart.source_page || '';
  cart.entry_page = safeText(body.entry_page) || cart.entry_page || '';
  cart.notes = safeText(body.notes) || cart.notes || '';
  cart.last_updated_at = nowIso();
  if (!cart.created_at) cart.created_at = nowIso();
  return cart;
}

function normalizePaymentInput(body, existing = null) {
  const payment = existing || { id: nextId('payment') };
  if (!payment.payment_number) payment.payment_number = buildPaymentNumber(payment.id);
  payment.order_id = body.order_id ? toNumber(body.order_id, payment.order_id ?? null) : payment.order_id ?? null;
  payment.customer_id = body.customer_id ? toNumber(body.customer_id, payment.customer_id ?? null) : payment.customer_id ?? null;
  payment.amount = toNumber(body.amount, payment.amount ?? 0) || 0;
  payment.payment_method = ['UPI', 'Bank Transfer', 'Cash', 'Payment Gateway', 'Other'].includes(safeText(body.payment_method)) ? safeText(body.payment_method) : (payment.payment_method || 'UPI');
  payment.transaction_reference = safeText(body.transaction_reference) || payment.transaction_reference || '';
  payment.status = ['Pending', 'Received', 'Failed', 'Refunded'].includes(safeText(body.status)) ? safeText(body.status) : (payment.status || 'Pending');
  payment.notes = safeText(body.notes) || payment.notes || '';
  payment.proof = safeText(body.proof) || payment.proof || '';
  payment.paid_at = safeText(body.paid_at) || payment.paid_at || '';
  payment.created_at = payment.created_at || nowIso();
  payment.updated_at = nowIso();
  return payment;
}

function normalizeInvoiceInput(body, existing = null) {
  const invoice = existing || { id: nextId('invoice') };
  if (!invoice.invoice_number) invoice.invoice_number = buildInvoiceNumber(invoice.id);
  invoice.order_id = body.order_id ? toNumber(body.order_id, invoice.order_id ?? null) : invoice.order_id ?? null;
  invoice.customer_id = body.customer_id ? toNumber(body.customer_id, invoice.customer_id ?? null) : invoice.customer_id ?? null;
  invoice.items = Array.isArray(body.items) ? recalcLineItems(normaliseLineItems(body.items)) : (invoice.items || []);
  invoice.subtotal = toNumber(body.subtotal, invoice.subtotal ?? 0) || 0;
  invoice.discount_total = toNumber(body.discount_total, invoice.discount_total ?? 0) || 0;
  invoice.tax_total = toNumber(body.tax_total, invoice.tax_total ?? 0) || 0;
  invoice.total = toNumber(body.total, invoice.total ?? 0) || 0;
  invoice.amount_paid = toNumber(body.amount_paid, invoice.amount_paid ?? 0) || 0;
  invoice.balance = toNumber(body.balance, invoice.balance ?? 0) || 0;
  invoice.due_date = safeText(body.due_date) || invoice.due_date || '';
  invoice.status = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'].includes(safeText(body.status)) ? safeText(body.status) : (invoice.status || 'Draft');
  invoice.notes = safeText(body.notes) || invoice.notes || '';
  invoice.updated_at = nowIso();
  if (!invoice.created_at) invoice.created_at = nowIso();
  return invoice;
}

function normalizeProjectInput(body, existing = null) {
  const project = existing || { id: nextId('project') };
  if (!project.project_number) project.project_number = buildProjectNumber(project.id);
  project.project_name = safeText(body.project_name) || project.project_name || `Project ${project.project_number}`;
  project.customer_id = body.customer_id ? toNumber(body.customer_id, project.customer_id ?? null) : project.customer_id ?? null;
  project.order_id = body.order_id ? toNumber(body.order_id, project.order_id ?? null) : project.order_id ?? null;
  project.service_id = body.service_id ? toNumber(body.service_id, project.service_id ?? null) : project.service_id ?? null;
  project.package_name = safeText(body.package_name) || project.package_name || '';
  project.start_date = safeText(body.start_date) || project.start_date || '';
  project.due_date = safeText(body.due_date) || project.due_date || '';
  project.project_manager = safeText(body.project_manager) || project.project_manager || '';
  project.status = ['Planning', 'Waiting for Content', 'Design', 'Development', 'Testing', 'Client Review', 'Deployment', 'Completed', 'On Hold', 'Cancelled'].includes(safeText(body.status)) ? safeText(body.status) : (project.status || 'Planning');
  project.priority = ['Low', 'Medium', 'High', 'Urgent'].includes(safeText(body.priority)) ? safeText(body.priority) : (project.priority || 'Medium');
  project.progress = Math.max(0, Math.min(100, toNumber(body.progress, project.progress ?? 0) || 0));
  project.notes = safeText(body.notes) || project.notes || '';
  project.milestones = Array.isArray(body.milestones) ? body.milestones.map(milestone => ({
    name: safeText(milestone.name),
    completed: toBool(milestone.completed, false),
  })).filter(item => item.name) : (project.milestones || []);
  project.files = Array.isArray(body.files) ? body.files : (project.files || []);
  project.updated_at = nowIso();
  if (!project.created_at) project.created_at = nowIso();
  return project;
}

function normalizePortfolioInput(body, existing = null) {
  const project = existing || { id: nextId('portfolio') };
  if (!project.slug) project.slug = safeText(body.slug) || slugify(body.title || `portfolio-${project.id}`);
  project.title = safeText(body.title) || project.title || 'Untitled Project';
  project.project_type = ['Concept Project', 'Demo Project', 'Client Project'].includes(safeText(body.project_type)) ? safeText(body.project_type) : (project.project_type || 'Concept Project');
  project.category = safeText(body.category) || project.category || '';
  project.industry = safeText(body.industry) || project.industry || '';
  project.client = safeText(body.client) || project.client || '';
  project.short_description = safeText(body.short_description) || project.short_description || '';
  project.full_description = safeText(body.full_description) || project.full_description || '';
  project.technologies = parseArrayInput(body.technologies).length ? parseArrayInput(body.technologies) : (project.technologies || []);
  project.features = parseArrayInput(body.features).length ? parseArrayInput(body.features) : (project.features || []);
  project.challenge = safeText(body.challenge) || project.challenge || '';
  project.solution = safeText(body.solution) || project.solution || '';
  project.cover_image = safeText(body.cover_image) || project.cover_image || '';
  project.gallery = parseArrayInput(body.gallery).length ? parseArrayInput(body.gallery) : (project.gallery || []);
  project.featured = toBool(body.featured, project.featured ?? false);
  project.published = toBool(body.published, project.published ?? false);
  project.seo_title = safeText(body.seo_title) || project.seo_title || `${project.title} | SiteArvo`;
  project.seo_description = safeText(body.seo_description) || project.seo_description || project.short_description || '';
  project.display_order = toNumber(body.display_order, project.display_order ?? 0) || 0;
  project.status = ['Active', 'Archived'].includes(safeText(body.status)) ? safeText(body.status) : (project.status || 'Active');
  project.updated_at = nowIso();
  if (!project.created_at) project.created_at = nowIso();
  return project;
}

function normalizeFaqInput(body, existing = null) {
  const faq = existing || { id: nextId('faq') };
  faq.question = safeText(body.question) || faq.question || '';
  faq.answer = safeText(body.answer) || faq.answer || '';
  faq.category = safeText(body.category) || faq.category || '';
  faq.display_order = toNumber(body.display_order, faq.display_order ?? 0) || 0;
  faq.active = toBool(body.active, faq.active ?? true);
  faq.updated_at = nowIso();
  if (!faq.created_at) faq.created_at = nowIso();
  return faq;
}

function normalizeTestimonialInput(body, existing = null) {
  const testimonial = existing || { id: nextId('testimonial') };
  testimonial.name = safeText(body.name) || testimonial.name || '';
  testimonial.company = safeText(body.company) || testimonial.company || '';
  testimonial.role = safeText(body.role) || testimonial.role || '';
  testimonial.testimonial = safeText(body.testimonial) || testimonial.testimonial || '';
  testimonial.image = safeText(body.image) || testimonial.image || '';
  testimonial.featured = toBool(body.featured, testimonial.featured ?? false);
  testimonial.active = toBool(body.active, testimonial.active ?? true);
  testimonial.display_order = toNumber(body.display_order, testimonial.display_order ?? 0) || 0;
  testimonial.updated_at = nowIso();
  if (!testimonial.created_at) testimonial.created_at = nowIso();
  return testimonial;
}

function normalizeMediaInput(body, existing = null) {
  const media = existing || { id: nextId('media') };
  if (!media.media_number) media.media_number = buildMediaToken(media.id);
  media.title = safeText(body.title) || media.title || 'Untitled Media';
  media.url = safeText(body.url) || media.url || '';
  media.file_name = safeText(body.file_name) || media.file_name || '';
  media.mime_type = safeText(body.mime_type) || media.mime_type || '';
  media.alt_text = safeText(body.alt_text) || media.alt_text || '';
  media.folder = safeText(body.folder) || media.folder || 'library';
  media.size = toNumber(body.size, media.size ?? 0) || 0;
  media.updated_at = nowIso();
  if (!media.created_at) media.created_at = nowIso();
  return media;
}

function normalizeCouponInput(body, existing = null) {
  const coupon = existing || { id: nextId('coupon') };
  if (!coupon.code) coupon.code = safeText(body.code) || buildCouponCode(coupon.id);
  coupon.discount_type = ['Percentage', 'Fixed Amount'].includes(safeText(body.discount_type)) ? safeText(body.discount_type) : (coupon.discount_type || 'Percentage');
  coupon.discount_value = toNumber(body.discount_value, coupon.discount_value ?? 0) || 0;
  coupon.minimum_order = toNumber(body.minimum_order, coupon.minimum_order ?? 0) || 0;
  coupon.maximum_discount = toNumber(body.maximum_discount, coupon.maximum_discount ?? null);
  coupon.applicable_categories = parseArrayInput(body.applicable_categories);
  coupon.applicable_packages = parseArrayInput(body.applicable_packages);
  coupon.start_date = safeText(body.start_date) || coupon.start_date || '';
  coupon.expiry_date = safeText(body.expiry_date) || coupon.expiry_date || '';
  coupon.usage_limit = toNumber(body.usage_limit, coupon.usage_limit ?? null);
  coupon.per_customer_limit = toNumber(body.per_customer_limit, coupon.per_customer_limit ?? null);
  coupon.active = toBool(body.active, coupon.active ?? true);
  coupon.used_count = toNumber(body.used_count, coupon.used_count ?? 0) || 0;
  coupon.updated_at = nowIso();
  if (!coupon.created_at) coupon.created_at = nowIso();
  return coupon;
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
    regular_price: raw.regular_price ?? raw.regularPrice ?? null,
    billing_type: raw.billing_type || raw.billingType || (['monthly', 'yearly'].includes(raw.price_type || raw.priceType) ? String(raw.price_type || raw.priceType).toLowerCase() : 'one-time'),
    pages_included: raw.pages_included ?? raw.pagesIncluded ?? null,
    delivery_time: raw.delivery_time || raw.deliveryTime || '',
    revisions: raw.revisions || '',
    is_featured: toBool(raw.is_featured ?? raw.isFeatured, false),
    is_active: toBool(raw.is_active ?? raw.isActive, true),
    add_to_cart_enabled: raw.add_to_cart_enabled === undefined && raw.addToCartEnabled === undefined ? null : toBool(raw.add_to_cart_enabled ?? raw.addToCartEnabled, false),
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

function hasStarterValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function applyWebsitePackagePricingMigration(state) {
  const migrations = Array.isArray(state.meta?.pricing_migrations) ? state.meta.pricing_migrations : [];
  if (migrations.includes('website-package-pricing-v3')) return false;
  let changed = false;
  for (const category of state.categories || []) {
    for (const service of category.services || []) {
      const pricing = websitePackagePricing.get(String(service.slug || '').toLowerCase());
      if (!pricing || service.price_type !== 'fixed') continue;
      const updates = {
        base_price: pricing.base_price,
        sale_price: null,
        regular_price: pricing.regular_price,
        is_active: true,
        add_to_cart_enabled: true,
        cta_text: pricing.base_price === 0 ? 'Add to Cart' : 'Customize Package',
        is_demo_price: false,
        demo_price_source: '',
      };
      for (const [field, value] of Object.entries(updates)) {
        if (service[field] !== value) {
          service[field] = value;
          changed = true;
        }
      }
    }
  }
  for (const group of state.configurator_groups || []) {
    if (String(group.slug || group.id || '').toLowerCase() !== 'page-packages') continue;
    for (const option of group.options || []) {
      const pages = Number(option.page_delta || 0);
      const pagePricing = {
        3: { base_price: 0, regular_price: 3999 },
        5: { base_price: 2999, regular_price: 4999 },
        7: { base_price: 4999, regular_price: 6999 },
        10: { base_price: 7999, regular_price: 9999 },
      }[pages];
      if (!pagePricing) continue;
      const updates = {
        price: pagePricing.base_price,
        price_type: 'one_time',
        billing_period: 'one-time',
        featured: pages === 5,
        active: true,
      };
      for (const [field, value] of Object.entries(updates)) {
        if (option[field] !== value) {
          option[field] = value;
          changed = true;
        }
      }
    }
  }
  state.meta ||= {};
  state.meta.pricing_migrations = [...new Set([...(state.meta.pricing_migrations || []), 'website-package-pricing-v3'])];
  return changed;
}

function applyStarterDefaults(existing, starter) {
  const fields = ['category_id', 'category_name', 'category_slug', 'name', 'slug', 'icon', 'short_description', 'description', 'price_type', 'base_price', 'sale_price', 'regular_price', 'billing_type', 'pages_included', 'delivery_time', 'revisions', 'is_featured', 'is_active', 'add_to_cart_enabled', 'display_order', 'cta_text', 'seo_title', 'seo_description', 'service_type', 'is_demo_price', 'demo_price_source'];
  for (const field of fields) {
    if (!hasStarterValue(existing[field])) existing[field] = clone(starter[field]);
  }
  if (!Array.isArray(existing.features) || !existing.features.length) existing.features = clone(starter.features || []);
  if (!Array.isArray(existing.addon_ids)) existing.addon_ids = [];
  if (starter.price_type === 'fixed' && existing.add_to_cart_enabled !== true) existing.add_to_cart_enabled = true;
  return existing;
}

function ensureStarterCatalog(state) {
  let changed = false;
  const categoryBySlug = new Map((state.categories || []).map(category => [String(category.slug || '').toLowerCase(), category]));
  let nextServiceId = Number(state.meta?.nextServiceId || flattenServices(state.categories || []).length + 1);

  for (const starter of starterCatalogProducts) {
    const category = categoryBySlug.get(String(starter.category_slug || '').toLowerCase());
    if (!category) continue;
    const existing = (category.services || []).find(service => String(service.slug || '').toLowerCase() === String(starter.slug || '').toLowerCase());
    if (existing) {
      const before = JSON.stringify(existing);
      applyStarterDefaults(existing, normalizeService(starter, category, existing.id));
      if (JSON.stringify(existing) !== before) changed = true;
      continue;
    }
    const normalized = normalizeService(starter, category, nextServiceId++);
    normalized.service_type = starter.service_type || normalized.service_type || 'package';
    normalized.add_to_cart_enabled = starter.add_to_cart_enabled ?? starter.price_type === 'fixed';
    normalized.price_type = starter.price_type || normalized.price_type || 'custom_quote';
    normalized.billing_type = starter.billing_type || normalized.billing_type || 'one-time';
    category.services.push(normalized);
    changed = true;
  }

  if (state.meta) state.meta.nextServiceId = Math.max(Number(state.meta.nextServiceId || 1), nextServiceId);
  return changed;
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
  state.leads?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.customers?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.quotations?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.carts?.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  state.payments?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.invoices?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.projects?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.portfolio?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));
  state.faqs?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  state.testimonials?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  state.media?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.coupons?.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  state.notifications?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.activity_logs?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.events?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.finance_accounts?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || String(a.account_name).localeCompare(String(b.account_name)));
  state.finance_income?.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
  state.finance_expenses?.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
  state.finance_vendors?.sort((a, b) => String(a.vendor_name).localeCompare(String(b.vendor_name)));
  state.finance_refunds?.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
  state.finance_adjustments?.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
  state.finance_budgets?.sort((a, b) => String(a.month || '').localeCompare(String(b.month || '')) || String(a.category).localeCompare(String(b.category)));
  rebuildFinanceDerived(state);
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
    service.price_type = rawPackage.price_type || service.price_type || 'fixed';
    service.service_type = rawPackage.service_type || service.service_type || 'fixed';
    service.add_to_cart_enabled = rawPackage.add_to_cart_enabled ?? service.add_to_cart_enabled ?? false;
    category.services.push(service);
  }

  const addons = (seed.addons || []).map(rawAddon => normalizeAddon(rawAddon, nextAddonId++, categories));
  const admins = [createDemoAdmin()];
  const state = {
    settings: normalizeSettings(seed.settings || {}),
    content: normalizeContent(seed.content || {}),
    configurator_groups: normalizeConfiguratorGroups(seed.configurator_groups || defaultConfiguratorGroups),
    categories,
    addons,
    leads: [],
    customers: [],
    quotations: [],
    carts: [],
    orders: [],
    payments: [],
    invoices: [],
    projects: [],
    portfolio: [],
    faqs: [],
    testimonials: [],
    media: [],
    coupons: [],
    notifications: [],
    activity_logs: [],
    events: [],
    finance_accounts: [],
    finance_income: [],
    finance_expenses: [],
    finance_vendors: [],
    finance_refunds: [],
    finance_adjustments: [],
    finance_budgets: [],
    income_categories: [],
    expense_categories: [],
    finance_transactions: [],
    finance_income_derived: [],
    finance_receivables: [],
    finance_payables: [],
    finance_reports: {},
    finance_alerts: {},
    finance_summary: {},
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
      nextLeadId: 1,
      nextCustomerId: 1,
      nextQuotationId: 1,
      nextCartId: 1,
      nextPaymentId: 1,
      nextInvoiceId: 1,
      nextProjectId: 1,
      nextPortfolioId: 1,
      nextCouponId: 1,
      nextMediaId: 1,
      nextNotificationId: 1,
      nextActivityLogId: 1,
      nextEventId: 1,
      nextFinanceAccountId: 1,
      nextFinanceIncomeId: 1,
      nextFinanceExpenseId: 1,
      nextFinanceVendorId: 1,
      nextFinanceRefundId: 1,
      nextFinanceAdjustmentId: 1,
      nextFinanceBudgetId: 1,
      nextFinanceCategoryId: 1,
      pricing_migrations: ['website-package-pricing-v2'],
    },
  };
  ensureStarterCatalog(state);
  applyWebsitePackagePricingMigration(state);
  ensureDefaultFinanceCollections(state);
  syncDerivedCollections(state);
  return state;
}

function syncDemoAdminAccount(raw) {
  const demoAdmin = createDemoAdmin();
  const existingIndex = raw.admins.findIndex(admin => String(admin.email || '').toLowerCase() === demoAdmin.email || Number(admin.id) === Number(demoAdmin.id));
  if (existingIndex >= 0) {
    raw.admins[existingIndex] = {
      ...raw.admins[existingIndex],
      ...demoAdmin,
      id: raw.admins[existingIndex].id || demoAdmin.id,
      is_active: raw.admins[existingIndex].is_active !== false,
    };
    return;
  }
  raw.admins.unshift(demoAdmin);
}

function loadStore() {
  const raw = readJsonFile(storePath, null);
  if (raw) {
    raw.settings = normalizeSettings(raw.settings || {});
    raw.content = normalizeContent(raw.content || {});
    raw.configurator_groups = normalizeConfiguratorGroups(raw.configurator_groups || defaultConfiguratorGroups);
    raw.categories ||= [];
    raw.addons ||= [];
    raw.leads ||= [];
    raw.customers ||= [];
    raw.quotations ||= [];
    raw.carts ||= [];
    raw.orders ||= [];
    raw.payments ||= [];
    raw.invoices ||= [];
    raw.projects ||= [];
    raw.portfolio ||= [];
    raw.faqs ||= [];
    raw.testimonials ||= [];
    raw.media ||= [];
    raw.coupons ||= [];
    raw.notifications ||= [];
    raw.activity_logs ||= [];
    raw.events ||= [];
    raw.finance_accounts ||= [];
    raw.finance_income ||= [];
    raw.finance_expenses ||= [];
    raw.finance_vendors ||= [];
    raw.finance_refunds ||= [];
    raw.finance_adjustments ||= [];
    raw.finance_budgets ||= [];
    raw.income_categories ||= [];
    raw.expense_categories ||= [];
    raw.finance_transactions ||= [];
    raw.finance_income_derived ||= [];
    raw.finance_receivables ||= [];
    raw.finance_payables ||= [];
    raw.finance_reports ||= {};
    raw.finance_alerts ||= {};
    raw.finance_summary ||= {};
    raw.chats ||= [];
    raw.analytics ||= [];
    raw.admin_login_attempts ||= [];
    raw.admins = (raw.admins || [createDemoAdmin()]).map(admin => ({
      ...createDemoAdmin(),
      ...admin,
      role: admin.role || 'Super Admin',
      is_active: admin.is_active !== false,
    }));
    syncDemoAdminAccount(raw);
    raw.sessions ||= {};
    raw.meta ||= {};
    for (const category of raw.categories) category.services ||= [];
    setIdCounter(raw.meta, 'nextCategoryId', raw.categories.length + 1);
    setIdCounter(raw.meta, 'nextServiceId', flattenServices(raw.categories).length + 1);
    setIdCounter(raw.meta, 'nextAddonId', raw.addons.length + 1);
    setIdCounter(raw.meta, 'nextOrderId', raw.orders.length + 1);
    setIdCounter(raw.meta, 'nextChatId', raw.chats.length + 1);
    setIdCounter(raw.meta, 'nextMessageId', Math.max(1, raw.chats.reduce((max, chat) => Math.max(max, (chat.messages || []).length), 0) + 1));
    setIdCounter(raw.meta, 'nextAnalyticsId', raw.analytics.length + 1);
    setIdCounter(raw.meta, 'nextLeadId', raw.leads.length + 1);
    setIdCounter(raw.meta, 'nextCustomerId', raw.customers.length + 1);
    setIdCounter(raw.meta, 'nextQuotationId', raw.quotations.length + 1);
    setIdCounter(raw.meta, 'nextCartId', raw.carts.length + 1);
    setIdCounter(raw.meta, 'nextPaymentId', raw.payments.length + 1);
    setIdCounter(raw.meta, 'nextInvoiceId', raw.invoices.length + 1);
    setIdCounter(raw.meta, 'nextProjectId', raw.projects.length + 1);
    setIdCounter(raw.meta, 'nextPortfolioId', raw.portfolio.length + 1);
    setIdCounter(raw.meta, 'nextCouponId', raw.coupons.length + 1);
    setIdCounter(raw.meta, 'nextMediaId', raw.media.length + 1);
    setIdCounter(raw.meta, 'nextNotificationId', raw.notifications.length + 1);
    setIdCounter(raw.meta, 'nextActivityLogId', raw.activity_logs.length + 1);
    setIdCounter(raw.meta, 'nextEventId', raw.events.length + 1);
    setIdCounter(raw.meta, 'nextFinanceAccountId', raw.finance_accounts.length + 1);
    setIdCounter(raw.meta, 'nextFinanceIncomeId', raw.finance_income.length + 1);
    setIdCounter(raw.meta, 'nextFinanceExpenseId', raw.finance_expenses.length + 1);
    setIdCounter(raw.meta, 'nextFinanceVendorId', raw.finance_vendors.length + 1);
    setIdCounter(raw.meta, 'nextFinanceRefundId', raw.finance_refunds.length + 1);
    setIdCounter(raw.meta, 'nextFinanceAdjustmentId', raw.finance_adjustments.length + 1);
    setIdCounter(raw.meta, 'nextFinanceBudgetId', raw.finance_budgets.length + 1);
    setIdCounter(raw.meta, 'nextFinanceCategoryId', Math.max(raw.income_categories.length, raw.expense_categories.length) + 1);
    store = raw;
    const migrated = ensureStarterCatalog(raw);
    const pricedMigrated = applyWebsitePackagePricingMigration(raw);
    ensureDefaultFinanceCollections(raw);
    syncDerivedCollections(raw);
    if (migrated || pricedMigrated) saveStore(raw);
    return raw;
  }
  const initialized = initializeStore();
  syncDemoAdminAccount(initialized);
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

function adminHasFinanceAccess(admin = null) {
  if (!admin) return false;
  return ['Super Admin', 'Finance', 'Admin', 'Sales'].includes(admin.role || 'Super Admin');
}

function adminHasFinanceWriteAccess(admin = null) {
  if (!admin) return false;
  return ['Super Admin', 'Finance', 'Admin'].includes(admin.role || 'Super Admin');
}

function requireFinanceAccess(req, res, mutation = false) {
  const session = requireAdmin(req, res, mutation);
  if (!session) return null;
  if (!adminHasFinanceAccess(session.admin)) {
    jsonError(res, 403, 'You do not have access to finance data.');
    return null;
  }
  if (mutation && !adminHasFinanceWriteAccess(session.admin)) {
    jsonError(res, 403, 'You do not have permission to modify finance data.');
    return null;
  }
  return session;
}

async function trackPageview(req, res) {
  const body = await readJsonBody(req);
  const cookies = parseCookies(req);
  const visitorId = safeText(body.visitor_id) || cookies[visitorCookieName] || crypto.randomUUID();
  const visitorHash = hashVisitor(visitorId);
  const pageUrl = parseAnalyticsUrl(body.path);
  const pathName = normalizeAnalyticsPath(pageUrl.pathname);
  const referrer = safeText(body.referrer) || '';
  const title = safeText(body.title) || '';
  const userAgent = safeText(req.headers['user-agent']) || '';
  const acceptLanguage = safeText(req.headers['accept-language']) || '';
  const ip = clientIp(req);
  const createdAt = nowIso();
  const botTraffic = isObviousBot(userAgent);
  const isAdminTraffic = pathName.startsWith('/admin') || /\/admin(\/|$)/i.test(referrer) || /\/admin(\/|$)/i.test(title);
  if ((botTraffic && String(store.settings.filter_bot_traffic ?? '1') !== '0') || (isAdminTraffic && String(store.settings.exclude_admin_traffic ?? '1') !== '0')) {
    setCookie(res, visitorCookieName, visitorId, { httpOnly: false, maxAge: 60 * 60 * 24 * 365 * 2 });
    jsonResponse(res, 200, { tracked: false });
    return;
  }

  const campaignSource = safeText(pageUrl.searchParams.get('utm_source')) || safeText(body.campaign_source) || '';
  const campaignMedium = safeText(pageUrl.searchParams.get('utm_medium')) || safeText(body.campaign_medium) || '';
  const campaignName = safeText(pageUrl.searchParams.get('utm_campaign')) || safeText(body.campaign_name) || '';
  const campaignContent = safeText(pageUrl.searchParams.get('utm_content')) || safeText(body.campaign_content) || '';
  const campaignTerm = safeText(pageUrl.searchParams.get('utm_term')) || safeText(body.campaign_term) || '';
  const trafficSource = classifyTrafficSource({ referrer, campaignSource, campaignMedium });

  store.analytics.push({
    id: nextId('analytics'),
    visitor_hash: visitorHash,
    path: pathName,
    title,
    referrer,
    campaign_source: campaignSource,
    campaign_medium: campaignMedium,
    campaign_name: campaignName,
    campaign_content: campaignContent,
    campaign_term: campaignTerm,
    traffic_source: trafficSource,
    user_agent: userAgent,
    accept_language: acceptLanguage,
    ip_address: ip,
    device_type: detectDevice(userAgent),
    browser_name: detectBrowser(userAgent),
    country_code: detectCountryCode(acceptLanguage),
    is_bot: botTraffic,
    created_at: createdAt,
  });
  store.events.push({
    id: nextId('event'),
    type: 'pageview',
    path: pathName,
    visitor_hash: visitorHash,
    created_at: createdAt,
  });
  saveStore();

  setCookie(res, visitorCookieName, visitorId, { httpOnly: false, maxAge: 60 * 60 * 24 * 365 * 2 });
  jsonResponse(res, 200, { tracked: true });
}

async function trackAnalyticsEvent(req, res) {
  const body = await readJsonBody(req);
  const type = safeText(body.type).replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  if (!type) return jsonError(res, 422, 'Event type is required.');
  const cookies = parseCookies(req);
  const visitorId = safeText(body.visitor_id) || cookies[visitorCookieName] || crypto.randomUUID();
  const visitorHash = hashVisitor(visitorId);
  const pageUrl = parseAnalyticsUrl(body.path);
  const pathName = normalizeAnalyticsPath(pageUrl.pathname);
  const referrer = safeText(body.referrer) || '';
  const title = safeText(body.title) || '';
  const userAgent = safeText(req.headers['user-agent']) || '';
  const botTraffic = isObviousBot(userAgent);
  const isAdminTraffic = pathName.startsWith('/admin') || /\/admin(\/|$)/i.test(referrer) || /\/admin(\/|$)/i.test(title);
  if ((botTraffic && String(store.settings.filter_bot_traffic ?? '1') !== '0') || (isAdminTraffic && String(store.settings.exclude_admin_traffic ?? '1') !== '0')) {
    setCookie(res, visitorCookieName, visitorId, { httpOnly: false, maxAge: 60 * 60 * 24 * 365 * 2 });
    jsonResponse(res, 200, { tracked: false });
    return;
  }

  store.events.push({
    id: nextId('event'),
    type,
    path: pathName,
    entity_type: safeText(body.entity_type),
    entity_id: safeText(body.entity_id),
    service_id: body.service_id ? toNumber(body.service_id, null) : null,
    service_slug: safeText(body.service_slug),
    service_name: safeText(body.service_name),
    package_name: safeText(body.package_name),
    selection_group: safeText(body.selection_group),
    option_id: safeText(body.option_id),
    option_name: safeText(body.option_name),
    selection_action: safeText(body.selection_action),
    selection_quantity: body.quantity !== undefined ? toNumber(body.quantity, null) : null,
    billing_period: safeText(body.billing_period),
    price_type: safeText(body.price_type),
    configuration_id: safeText(body.configuration_id),
    order_id: body.order_id ? toNumber(body.order_id, null) : null,
    lead_id: body.lead_id ? toNumber(body.lead_id, null) : null,
    source: safeText(body.source),
    campaign_source: safeText(body.campaign_source) || safeText(pageUrl.searchParams.get('utm_source')),
    campaign_medium: safeText(body.campaign_medium) || safeText(pageUrl.searchParams.get('utm_medium')),
    campaign_name: safeText(body.campaign_name) || safeText(pageUrl.searchParams.get('utm_campaign')),
    campaign_content: safeText(body.campaign_content) || safeText(pageUrl.searchParams.get('utm_content')),
    campaign_term: safeText(body.campaign_term) || safeText(pageUrl.searchParams.get('utm_term')),
    visitor_hash: visitorHash,
    created_at: nowIso(),
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
  const admin = store.admins.find(item => item.email === email && item.is_active !== false);
  const valid = admin ? verifyPassword(password, admin.password_hash, admin.demo_password_mode) : false;
  const recentFailures = store.admin_login_attempts.filter(item => item.email === email && item.ip_address === ip && !item.was_successful && new Date(item.attempted_at).getTime() > Date.now() - 15 * 60 * 1000);
  if (!valid && recentFailures.length >= 5) return jsonError(res, 429, 'Too many failed attempts. Try again in 15 minutes.');
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
  createActivity('Admin login', 'admin', admin.id, admin.name, ip);
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
    billing_type: service.billing_type,
    add_to_cart_enabled: service.add_to_cart_enabled,
    is_active: service.is_active,
  }));
}

function adminCategoriesPayload() {
  return clone(store.categories).map(category => ({
    ...category,
    service_count: Array.isArray(category.services) ? category.services.length : 0,
    active_service_count: Array.isArray(category.services) ? category.services.filter(service => service.is_active !== false).length : 0,
    package_count: Array.isArray(category.services) ? category.services.filter(service => starterCatalogSlugSet.has(String(service.slug || '').toLowerCase())).length : 0,
    active_package_count: Array.isArray(category.services) ? category.services.filter(service => starterCatalogSlugSet.has(String(service.slug || '').toLowerCase()) && service.is_active !== false).length : 0,
  }));
}

function adminAddonsPayload() {
  return clone(store.addons);
}

function configuratorGroupsPayload() {
  return clone(store.configurator_groups || defaultConfiguratorGroups);
}

function adminOrdersPayload() {
  return clone(store.orders).map(order => ({
    ...order,
    amount_paid: Number(order.amount_paid || store.payments.filter(payment => Number(payment.order_id) === Number(order.id) && payment.status === 'Received').reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)),
    payment_status: paymentStatusForOrder(order),
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

function adminLeadsPayload() {
  return clone(store.leads).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminCustomersPayload() {
  return clone(store.customers).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminQuotationsPayload() {
  return clone(store.quotations).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminCartsPayload() {
  return clone(store.carts).sort((a, b) => new Date(b.last_updated_at || b.created_at) - new Date(a.last_updated_at || a.created_at));
}

function adminPaymentsPayload() {
  return clone(store.payments).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminInvoicesPayload() {
  return clone(store.invoices).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminProjectsPayload() {
  return clone(store.projects).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminPortfolioPayload() {
  return clone(store.portfolio).sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function adminContentPayload() {
  return clone(store.content || normalizeContent());
}

function adminFaqsPayload() {
  return clone(store.faqs).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

function adminTestimonialsPayload() {
  return clone(store.testimonials).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

function adminMediaPayload() {
  return clone(store.media).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminCouponsPayload() {
  return clone(store.coupons).sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

function adminNotificationsPayload() {
  return clone(store.notifications).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminActivityLogsPayload() {
  return clone(store.activity_logs).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function adminUsersPayload() {
  return store.admins.filter(item => item.is_active !== false).map(item => ({
    id: item.id,
    name: item.name,
    email: item.email,
    role: item.role || 'Super Admin',
    is_active: item.is_active !== false,
    last_login_at: item.last_login_at || null,
  }));
}

function paginateRows(items = [], page = 1, perPage = 25) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Math.min(250, Number(perPage) || 25));
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: currentPage,
    per_page: pageSize,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

function financeQueryValues(searchParams = new URLSearchParams()) {
  return {
    range: safeText(searchParams.get('range') || searchParams.get('period')) || 'this_month',
    start: safeText(searchParams.get('start') || searchParams.get('from')),
    end: safeText(searchParams.get('end') || searchParams.get('to')),
    account: safeText(searchParams.get('account')),
    category: safeText(searchParams.get('category')),
    status: safeText(searchParams.get('status')),
    customer: safeText(searchParams.get('customer')),
    vendor: safeText(searchParams.get('vendor')),
    project: safeText(searchParams.get('project')),
    search: safeText(searchParams.get('search') || searchParams.get('q')),
    type: safeText(searchParams.get('type')),
    page: toNumber(searchParams.get('page'), 1) || 1,
    per_page: toNumber(searchParams.get('per_page'), 25) || 25,
  };
}

function financeFilterRow(row, query, bounds = null) {
  if (bounds && !financeWithinRange(row.date, bounds)) return false;
  if (query.type && String(row.type || '').toLowerCase() !== String(query.type).toLowerCase()) return false;
  if (query.status && String(row.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
  if (query.account && String(row.account_id || '').toLowerCase() !== String(query.account).toLowerCase()) return false;
  if (query.category && String(row.category || '').toLowerCase() !== String(query.category).toLowerCase()) return false;
  if (query.customer && String(row.customer_id || '').toLowerCase() !== String(query.customer).toLowerCase()) return false;
  if (query.vendor && String(row.vendor_id || '').toLowerCase() !== String(query.vendor).toLowerCase()) return false;
  if (query.project && String(row.project_id || '').toLowerCase() !== String(query.project).toLowerCase()) return false;
  if (!query.search) return true;
  const haystack = [
    row.transaction_number,
    row.description,
    row.counterparty_name,
    row.reference,
    row.category,
    row.status,
    row.type,
  ].map(value => String(value || '').toLowerCase()).join(' | ');
  return haystack.includes(query.search.toLowerCase());
}

function financeRowsForTransactions(query, bounds = null) {
  const rows = (store.finance_transactions || buildFinanceLedgerRows(store)).filter(row => financeFilterRow(row, query, bounds));
  return rows;
}

function financeIncomeView(query, bounds = null) {
  const rows = clone(store.finance_income).filter(item => {
    if (bounds && !financeWithinRange(item.date, bounds)) return false;
    if (query.status && String(item.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
    if (query.account && String(item.account_id || '').toLowerCase() !== String(query.account).toLowerCase()) return false;
    if (query.category && String(item.category || '').toLowerCase() !== String(query.category).toLowerCase()) return false;
    if (query.customer && String(item.customer_id || '').toLowerCase() !== String(query.customer).toLowerCase()) return false;
    if (!query.search) return true;
    const haystack = [item.income_number, item.description, item.category, item.payment_method, item.transaction_reference, item.status].map(value => String(value || '').toLowerCase()).join(' | ');
    return haystack.includes(query.search.toLowerCase());
  }).map(item => ({ ...item, is_system_generated: false }));
  const auto = (store.finance_income_derived || []).filter(item => item.is_system_generated).filter(item => {
    if (bounds && !financeWithinRange(item.date, bounds)) return false;
    if (query.status && String(item.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
    if (query.category && String(item.category || '').toLowerCase() !== String(query.category).toLowerCase()) return false;
    if (query.customer && String(item.customer_id || '').toLowerCase() !== String(query.customer).toLowerCase()) return false;
    if (!query.search) return true;
    const haystack = [item.income_number, item.description, item.category, item.payment_method, item.transaction_reference, item.status, item.order_number, item.invoice_number].map(value => String(value || '').toLowerCase()).join(' | ');
    return haystack.includes(query.search.toLowerCase());
  });
  return [...auto, ...rows].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
}

function financeExpenseView(query, bounds = null) {
  return clone(store.finance_expenses).filter(item => {
    if (bounds && !financeWithinRange(item.date, bounds)) return false;
    if (query.status && String(item.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
    if (query.account && String(item.account_id || '').toLowerCase() !== String(query.account).toLowerCase()) return false;
    if (query.category && String(item.expense_category || '').toLowerCase() !== String(query.category).toLowerCase()) return false;
    if (query.vendor && String(item.vendor_id || '').toLowerCase() !== String(query.vendor).toLowerCase()) return false;
    if (!query.search) return true;
    const haystack = [item.expense_number, item.description, item.expense_category, item.payment_method, item.reference_number, item.status].map(value => String(value || '').toLowerCase()).join(' | ');
    return haystack.includes(query.search.toLowerCase());
  }).sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
}

function financeVendorSummary(vendorId) {
  const expenses = store.finance_expenses.filter(expense => Number(expense.vendor_id) === Number(vendorId));
  const paid = expenses.filter(expense => expense.status === 'Paid').reduce((sum, expense) => sum + Number(expense.amount || 0) + Number(expense.tax_amount || 0), 0);
  const outstanding = expenses.filter(expense => expense.status !== 'Paid' && expense.status !== 'Cancelled').reduce((sum, expense) => sum + Number(expense.amount || 0) + Number(expense.tax_amount || 0), 0);
  return { expenses: expenses.length, bills: expenses.length, payments: paid, outstanding_payables: outstanding };
}

function financeCustomerSummary(customerId) {
  const invoices = store.invoices.filter(invoice => Number(invoice.customer_id) === Number(customerId));
  const orders = store.orders.filter(order => Number(order.customer_id) === Number(customerId));
  const payments = store.payments.filter(payment => Number(payment.customer_id) === Number(customerId) && payment.status === 'Received');
  const refunds = store.finance_refunds.filter(refund => Number(refund.customer_id) === Number(customerId) && refund.status === 'Completed');
  return {
    total_orders: orders.length,
    total_invoiced: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    total_paid: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    outstanding_balance: invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0)), 0),
    refunds: refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0),
  };
}

function financeProjectSummary(projectId) {
  const project = store.projects.find(item => Number(item.id) === Number(projectId));
  if (!project) return null;
  const order = project.order_id ? store.orders.find(item => Number(item.id) === Number(project.order_id)) : null;
  const invoice = order ? store.invoices.find(item => Number(item.order_id) === Number(order.id)) : null;
  const paid = store.payments.filter(payment => Number(payment.order_id) === Number(order?.id) && payment.status === 'Received').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const expenses = store.finance_expenses.filter(expense => Number(expense.project_id) === Number(project.id) && expense.status === 'Paid').reduce((sum, expense) => sum + Number(expense.amount || 0) + Number(expense.tax_amount || 0), 0);
  const quotedAmount = invoice ? Number(invoice.total || 0) : Number(order?.total_amount || 0);
  return {
    quoted_amount: quotedAmount,
    order_amount: Number(order?.total_amount || quotedAmount || 0),
    total_received: paid,
    outstanding: Math.max(0, quotedAmount - paid),
    project_expenses: expenses,
    project_profit: paid - expenses,
  };
}

function financeOverviewPayload(searchParams = new URLSearchParams()) {
  const bounds = financeRangeFromQuery(searchParams, store.settings);
  const summary = buildFinanceSummary(store, bounds);
  const ledger = financeRowsForTransactions(financeQueryValues(searchParams), bounds);
  const monthlyTrend = (store.finance_reports?.income_vs_expense?.income || []).slice(-6);
  const end = new Date(bounds.end);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  if (start.getTime() < bounds.start.getTime()) start.setTime(bounds.start.getTime());
  const days = [];
  for (let cursor = new Date(start); cursor.getTime() <= bounds.end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    const iso = cursor.toISOString().slice(0, 10);
    days.push(iso);
  }
  const dailyIncome = days.map(date => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    amount: ledger.filter(row => row.type === 'Income' && financeDate(row.date) === date).reduce((sum, row) => sum + Number(row.credit || 0), 0),
  }));
  const dailyExpense = days.map(date => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    amount: ledger.filter(row => (row.type === 'Expense' || row.type === 'Adjustment' || row.type === 'Refund') && financeDate(row.date) === date).reduce((sum, row) => sum + Number(row.debit || 0), 0),
  }));
  return {
    ...summary,
    alerts: buildFinanceAlerts(store),
    overview_cards: {
      total_income: summary.total_income,
      total_expenses: summary.total_expenses,
      net_profit: summary.net_profit,
      outstanding_receivables: summary.outstanding_receivables,
      outstanding_payables: summary.outstanding_payables,
      cash_balance: summary.cash_balance,
      bank_balance: summary.bank_balance,
      this_month_income: summary.this_month_income,
      this_month_expenses: summary.this_month_expenses,
    },
    transactions: paginateRows(ledger, 1, 10),
    monthly_income_vs_expense: store.finance_reports?.income_vs_expense || { income: [], expense: [] },
    monthly_profit: store.finance_reports?.monthly_profit || [],
    daily_income_vs_expense: { income: dailyIncome, expense: dailyExpense },
    date_range: {
      range: bounds.range,
      start: bounds.start.toISOString().slice(0, 10),
      end: bounds.end.toISOString().slice(0, 10),
    },
    monthly_trend: monthlyTrend,
  };
}

function financeIncomePayload(searchParams = new URLSearchParams()) {
  const bounds = financeRangeFromQuery(searchParams, store.settings);
  const query = financeQueryValues(searchParams);
  const items = financeIncomeView(query, bounds);
  return { items: paginateRows(items, query.page, query.per_page), categories: getFinanceCategoryList('income') };
}

function financeExpensePayload(searchParams = new URLSearchParams()) {
  const bounds = financeRangeFromQuery(searchParams, store.settings);
  const query = financeQueryValues(searchParams);
  const items = financeExpenseView(query, bounds);
  return {
    items: paginateRows(items, query.page, query.per_page),
    categories: getFinanceCategoryList('expense'),
    vendors: clone(store.finance_vendors),
    accounts: clone(store.finance_accounts),
  };
}

function financeAccountsPayload() {
  return {
    items: clone(store.finance_accounts),
    summary: buildFinanceSummary(store),
  };
}

function financeTransactionsPayload(searchParams = new URLSearchParams()) {
  const query = financeQueryValues(searchParams);
  const bounds = financeRangeFromQuery(searchParams, store.settings);
  const items = financeRowsForTransactions(query, bounds);
  return {
    items: paginateRows(items, query.page, query.per_page),
    summary: buildFinanceSummary(store, bounds),
  };
}

function financeReceivablesPayload(searchParams = new URLSearchParams()) {
  const query = financeQueryValues(searchParams);
  const items = buildFinanceReceivables(store).filter(item => {
    if (query.status && String(item.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
    if (query.customer && String(item.customer_id || '').toLowerCase() !== String(query.customer).toLowerCase()) return false;
    if (!query.search) return true;
    return [item.customer_name, item.invoice_id, item.order_id, item.status].join(' | ').toLowerCase().includes(query.search.toLowerCase());
  });
  return { items: paginateRows(items, query.page, query.per_page), summary: buildFinanceSummary(store) };
}

function financePayablesPayload(searchParams = new URLSearchParams()) {
  const query = financeQueryValues(searchParams);
  const items = buildFinancePayables(store).filter(item => {
    if (query.status && String(item.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
    if (query.vendor && String(item.vendor_id || '').toLowerCase() !== String(query.vendor).toLowerCase()) return false;
    if (!query.search) return true;
    return [item.vendor_name, item.bill_reference, item.status].join(' | ').toLowerCase().includes(query.search.toLowerCase());
  });
  return { items: paginateRows(items, query.page, query.per_page), summary: buildFinanceSummary(store) };
}

function financeVendorsPayload(searchParams = new URLSearchParams()) {
  const query = financeQueryValues(searchParams);
  const items = clone(store.finance_vendors).filter(vendor => {
    if (query.status && String(vendor.active).toLowerCase() !== String(query.status).toLowerCase()) return false;
    if (!query.search) return true;
    return [vendor.vendor_number, vendor.vendor_name, vendor.contact_person, vendor.email].join(' | ').toLowerCase().includes(query.search.toLowerCase());
  }).map(vendor => ({ ...vendor, ...financeVendorSummary(vendor.id) }));
  return { items: paginateRows(items, query.page, query.per_page) };
}

function financeTaxPayload() {
  const summary = buildFinanceSummary(store);
  return {
    tax_enabled: store.settings.tax_enabled === '1',
    tax_name: store.settings.tax_name || 'GST',
    tax_rate: Number(store.settings.tax_percentage || 0),
    business_tax_id: store.settings.business_tax_id || '',
    tax_included: store.settings.tax_included === '1',
    summary: {
      tax_collected: store.invoices.reduce((sum, invoice) => sum + Number(invoice.tax_total || 0), 0),
      tax_paid_on_expenses: store.finance_expenses.filter(expense => expense.status === 'Paid').reduce((sum, expense) => sum + Number(expense.tax_amount || 0), 0),
      tax_adjustments: 0,
    },
    summary_cards: summary,
  };
}

function financeReportsPayload(searchParams = new URLSearchParams()) {
  const bounds = financeRangeFromQuery(searchParams, store.settings);
  const filteredLedger = (store.finance_transactions || buildFinanceLedgerRows(store)).filter(row => financeWithinRange(row.date, bounds));
  const rangeReports = buildFinanceReports(store, filteredLedger, bounds);
  return {
    range: bounds.range,
    profit_loss: rangeReports.profit_loss || {},
    cash_flow: rangeReports.cash_flow || {},
    income_vs_expense: rangeReports.income_vs_expense || {},
    monthly_profit: rangeReports.monthly_profit || [],
    revenue_by_service: rangeReports.revenue_by_service || [],
    revenue_by_category: rangeReports.revenue_by_category || [],
    expense_breakdown: rangeReports.expense_breakdown || [],
    customer_outstanding: rangeReports.customer_outstanding || [],
    aging_receivables: rangeReports.aging_receivables || {},
    aging_payables: rangeReports.aging_payables || {},
    budgets: clone(store.finance_budgets),
    summary: buildFinanceSummary(store, bounds),
  };
}

function findLeadById(id) {
  return store.leads.find(item => Number(item.id) === Number(id));
}

function findCustomerById(id) {
  return store.customers.find(item => Number(item.id) === Number(id));
}

function findQuotationById(id) {
  return store.quotations.find(item => Number(item.id) === Number(id));
}

function findCartById(id) {
  return store.carts.find(item => Number(item.id) === Number(id));
}

function findPaymentById(id) {
  return store.payments.find(item => Number(item.id) === Number(id));
}

function findInvoiceById(id) {
  return store.invoices.find(item => Number(item.id) === Number(id));
}

function findProjectById(id) {
  return store.projects.find(item => Number(item.id) === Number(id));
}

function findPortfolioById(id) {
  return store.portfolio.find(item => Number(item.id) === Number(id));
}

function findFaqById(id) {
  return store.faqs.find(item => Number(item.id) === Number(id));
}

function findTestimonialById(id) {
  return store.testimonials.find(item => Number(item.id) === Number(id));
}

function findMediaById(id) {
  return store.media.find(item => Number(item.id) === Number(id));
}

function findCouponById(id) {
  return store.coupons.find(item => Number(item.id) === Number(id));
}

function findNotificationById(id) {
  return store.notifications.find(item => Number(item.id) === Number(id));
}

function findActivityById(id) {
  return store.activity_logs.find(item => Number(item.id) === Number(id));
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
  const hasConfiguration = Boolean(body.configuration && typeof body.configuration === 'object');
  for (const field of ['full_name', 'phone', 'email', 'project_description']) {
    if (!safeText(body[field])) errors[field] = 'Required';
  }
  if (!hasConfiguration && !safeText(body.service_id) && !safeText(body.service_slug)) errors.service_id = 'Required';
  if (safeText(body.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeText(body.email))) errors.email = 'Invalid email';
  if (Object.keys(errors).length) return jsonError(res, 422, 'Please complete the required order details.', errors);
  if (String(store.settings.orders_enabled ?? '1') === '0') return jsonError(res, 409, 'New online enquiries are temporarily disabled.');

  const customer = ensureCustomerFromContact({
    name: body.full_name,
    phone: body.phone,
    email: body.email,
    company: body.company_name,
    country: body.country,
  }, {
    name: body.full_name,
    company: body.company_name,
    country: body.country,
  });
  const orderId = nextId('order');
  const orderNumber = formatOrderNumber(orderId);

  let service = null;
  let basePrice = 0;
  let total = 0;
  let orderAddons = [];
  let recurringMonthlyTotal = 0;
  let recurringYearlyTotal = 0;
  let configurationSnapshot = null;
  let configurationSummary = null;

  if (hasConfiguration) {
    const selectionState = body.configuration.selection_state || body.configuration.selectionState || {};
    configurationSummary = calculateConfiguratorSummary(store.configurator_groups || defaultConfiguratorGroups, selectionState);
    if (configurationSummary.requiresQuote) {
      return jsonError(res, 409, 'This configuration includes custom-quote selections and cannot be submitted as a fixed-price order.');
    }
    configurationSnapshot = createConfiguratorSnapshot(store.configurator_groups || defaultConfiguratorGroups, selectionState);
    basePrice = configurationSummary.oneTimeTotal;
    total = configurationSummary.oneTimeTotal;
    recurringMonthlyTotal = configurationSummary.recurringMonthly;
    recurringYearlyTotal = configurationSummary.recurringYearly;
  } else {
    const serviceMatch = findServiceById(body.service_id) || findServiceBySlug(body.service_slug || '');
    if (!serviceMatch) return jsonError(res, 404, 'Service not found.');
    service = serviceMatch.service;
    if (service.price_type !== 'fixed' || service.base_price === null && service.sale_price === null) {
      return jsonError(res, 409, 'This package is not available for fixed-price ordering.');
    }

    basePrice = Number(service.sale_price ?? service.base_price);
    total = basePrice;
    const addonSelections = Array.isArray(body.addons) ? body.addons : [];
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
  }

  const order = {
    id: orderId,
    order_number: orderNumber,
    customer_id: customer.id,
    customer_name: customer.name,
    full_name: safeText(body.full_name),
    phone: safeText(body.phone),
    email: safeText(body.email).toLowerCase(),
    company_name: safeText(body.company_name),
    country: safeText(body.country) || 'India',
    business_type: safeText(body.business_type),
    project_description: safeText(body.project_description),
    preferred_contact: ['whatsapp', 'phone', 'email'].includes(safeText(body.preferred_contact)) ? safeText(body.preferred_contact) : 'whatsapp',
    total_amount: Math.round(total * 100) / 100,
    recurring_monthly_total: Math.round(recurringMonthlyTotal * 100) / 100,
    recurring_yearly_total: Math.round(recurringYearlyTotal * 100) / 100,
    currency: store.settings.currency || 'INR',
    status: 'New',
    payment_status: 'Unpaid',
    amount_paid: 0,
    source: 'Website Checkout',
    created_at: nowIso(),
    updated_at: nowIso(),
    service_id: service?.id || null,
    service_name: service?.name || configurationSummary?.configurationTitle || 'Customized Website',
    service_slug: service?.slug || (configurationSummary ? 'website-configurator' : ''),
    base_price: basePrice,
    addons: orderAddons,
    configuration: configurationSnapshot,
    configuration_summary: configurationSummary ? {
      configuration_id: configurationSummary.configurationId,
      configuration_title: configurationSummary.configurationTitle,
      items: configurationSummary.items,
      total_pages: configurationSummary.totalPages,
      one_time_total: configurationSummary.oneTimeTotal,
      recurring_monthly: configurationSummary.recurringMonthly,
      recurring_yearly: configurationSummary.recurringYearly,
      requires_quote: configurationSummary.requiresQuote,
    } : null,
  };
  store.orders.push(order);
  customer.total_orders = (customer.total_orders || 0) + 1;
  customer.order_ids = Array.isArray(customer.order_ids) ? Array.from(new Set([...customer.order_ids, order.id])) : [order.id];
  customer.updated_at = nowIso();

  const interestedService = service?.name || configurationSummary?.configurationTitle || 'Customized Website';
  const budget = configurationSummary ? String(configurationSummary.oneTimeTotal) : String(basePrice);
  const lead = createLead({
    name: body.full_name,
    phone: body.phone,
    email: body.email,
    company: body.company_name,
    country: body.country,
    interested_service: interestedService,
    budget,
    message: body.project_description,
    source: 'Website Checkout',
    status: 'New',
    priority: 'Medium',
    customer_id: customer.id,
    order_ids: [order.id],
  }, 'System', clientIp(req), 'Website Checkout');
  lead.customer_id = customer.id;
  lead.order_ids = [order.id];

  store.carts.push({
    id: nextId('cart'),
    cart_number: buildCartNumber(store.meta.nextCartId - 1),
    token: crypto.randomBytes(16).toString('hex'),
    customer_id: customer.id,
    lead_id: lead.id,
    visitor_name: safeText(body.full_name) || 'Website Visitor',
    visitor_email: safeText(body.email).toLowerCase(),
    visitor_phone: safeText(body.phone),
    service_id: service?.id || null,
    package_name: interestedService,
    configuration: configurationSnapshot,
    addons: orderAddons.map(addon => ({ name: addon.addon_name, quantity: addon.quantity, unit_price: addon.unit_price, line_total: addon.line_total })),
    subtotal: order.total_amount,
    recurring_monthly: order.recurring_monthly_total || 0,
    recurring_yearly: order.recurring_yearly_total || 0,
    total: order.total_amount,
    status: 'Converted',
    source_page: '/checkout',
    entry_page: '/cart',
    notes: 'Converted from order submission.',
    created_at: nowIso(),
    last_updated_at: nowIso(),
  });

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
    message: `Order enquiry received for ${interestedService}.`,
    created_at: nowIso(),
  });
  chat.unread_admin = (chat.unread_admin || 0) + 1;
  chat.unread_visitor = 0;
  chat.updated_at = nowIso();
  createNotification('order', 'New Order', `${order.order_number} ? ${order.service_name}`, 'order', order.id);
  createActivity('Order submitted', 'order', order.id, 'System', clientIp(req));
  store.events.push({ id: nextId('event'), type: 'order_submitted', order_id: order.id, service_id: service?.id || null, created_at: nowIso() });
  saveStore();
  jsonResponse(res, 201, {
    order_id: orderNumber,
    service_name: order.service_name,
    base_price: basePrice,
    addons: orderAddons.map(item => ({
      addon: item.addon_snapshot,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    })),
    configuration: configurationSnapshot,
    configuration_summary: order.configuration_summary,
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
  const lead = createLead({
    name: safeText(body.visitor_name) || 'Website Visitor',
    email: safeText(body.visitor_email),
    interested_service: safeText(body.interested_service) || 'Live Chat',
    message: safeText(body.message),
    source: 'Live Chat',
    status: 'New',
    priority: 'Medium',
  }, 'System', clientIp(req), 'Live Chat');
  chat.lead_id = lead.id;
  store.events.push({ id: nextId('event'), type: 'live_chat_started', chat_id: chat.id, created_at: nowIso() });
  createNotification('chat', 'New Live Chat', `${chat.visitor_name}`, 'chat', chat.id);
  createActivity('Live chat started', 'chat', chat.id, 'System', clientIp(req));
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
  const todayFollowups = store.leads.filter(item => String(item.next_follow_up_at || '').startsWith(today)).length + store.projects.filter(item => String(item.due_date || '').startsWith(today)).length;
  const overdueFollowups = store.leads.filter(item => item.next_follow_up_at && new Date(item.next_follow_up_at) < new Date()).length;
  const pendingQuotations = store.quotations.filter(item => ['Draft', 'Sent', 'Viewed'].includes(item.status)).length;
  const abandonedCarts = store.carts.filter(item => item.status === 'Abandoned').length;
  const activeProjects = store.projects.filter(item => !['Completed', 'Cancelled', 'Archived'].includes(item.status)).length;
  const pendingPayments = store.payments.filter(item => item.status === 'Pending').length;
  const financeSummary = buildFinanceSummary(store);
  return {
    active_categories: store.categories.filter(item => item.is_active !== false).length,
    active_services: getAllServices().filter(item => item.is_active !== false).length,
    packages: getAllServices().filter(item => item.price_type === 'fixed').length,
    new_orders: store.orders.filter(item => item.status === 'New').length,
    unread_chats: store.chats.reduce((sum, item) => sum + (item.unread_admin || 0), 0),
    new_leads: store.leads.filter(item => item.status === 'New').length,
    pending_quotations: pendingQuotations,
    abandoned_carts: abandonedCarts,
    active_projects: activeProjects,
    pending_payments: pendingPayments,
    unread_notifications: store.notifications.filter(item => !item.is_read).length,
    today_followups: todayFollowups,
    overdue_followups: overdueFollowups,
    total_pageviews: totalPageviews,
    unique_visitors: uniqueVisitors,
    today_pageviews: todayPageviews,
    last_7_days_total: last7DaysTotal,
    finance_snapshot: {
      collected_this_month: financeSummary.this_month_income,
      expenses_this_month: financeSummary.this_month_expenses,
      net_this_month: financeSummary.net_this_month,
      outstanding_receivables: financeSummary.outstanding_receivables,
    },
    recent_activity: clone(store.activity_logs).slice(0, 8),
  };
}

function buildAnalyticsOverview() {
  const totalPageviews = store.analytics.length;
  const uniqueVisitors = new Set(store.analytics.map(item => item.visitor_hash)).size;
  const today = new Date().toISOString().slice(0, 10);
  const last7Start = new Date();
  last7Start.setDate(last7Start.getDate() - 6);
  const pageMap = new Map();
  const referrerMap = new Map();
  const dailyMap = new Map();
  const browserMap = new Map();
  const deviceMap = new Map();
  const countryMap = new Map();

  for (const entry of store.analytics) {
    const normalizedPath = normalizeAnalyticsPath(entry.path);
    const page = pageMap.get(normalizedPath) || { path: normalizedPath, pageviews: 0, visitors: new Set() };
    page.pageviews += 1;
    page.visitors.add(entry.visitor_hash);
    pageMap.set(normalizedPath, page);

    const referrerKey = entry.referrer || '(direct)';
    const ref = referrerMap.get(referrerKey) || { referrer: referrerKey, pageviews: 0, visitors: new Set() };
    ref.pageviews += 1;
    ref.visitors.add(entry.visitor_hash);
    referrerMap.set(referrerKey, ref);

    const browserKey = firstOrUnknown(entry.browser_name || detectBrowser(entry.user_agent));
    const browser = browserMap.get(browserKey) || { browser: browserKey, pageviews: 0, visitors: new Set() };
    browser.pageviews += 1;
    browser.visitors.add(entry.visitor_hash);
    browserMap.set(browserKey, browser);

    const deviceKey = firstOrUnknown(entry.device_type || detectDevice(entry.user_agent));
    const device = deviceMap.get(deviceKey) || { device: deviceKey, pageviews: 0, visitors: new Set() };
    device.pageviews += 1;
    device.visitors.add(entry.visitor_hash);
    deviceMap.set(deviceKey, device);

    const countryKey = firstOrUnknown(entry.country_code || detectCountryCode(entry.accept_language));
    const country = countryMap.get(countryKey) || { country: countryKey, pageviews: 0, visitors: new Set() };
    country.pageviews += 1;
    country.visitors.add(entry.visitor_hash);
    countryMap.set(countryKey, country);

    const date = String(entry.created_at).slice(0, 10);
    const day = dailyMap.get(date) || { date, pageviews: 0, visitors: new Set() };
    day.pageviews += 1;
    day.visitors.add(entry.visitor_hash);
    dailyMap.set(date, day);
  }

  const topPages = [...pageMap.values()].map(item => ({ path: item.path, label: humanizeAnalyticsPath(item.path), pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const topReferrers = [...referrerMap.values()].map(item => ({ referrer: item.referrer, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const topBrowsers = [...browserMap.values()].map(item => ({ browser: item.browser, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const topDevices = [...deviceMap.values()].map(item => ({ device: item.device, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const topCountries = [...countryMap.values()].map(item => ({ country: item.country, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
  const dailyViews = [...dailyMap.values()].filter(item => new Date(item.date) >= last7Start).map(item => ({ date: item.date, pageviews: item.pageviews, visitors: item.visitors.size })).sort((a, b) => a.date.localeCompare(b.date));
  const conversionMap = new Map();
  for (const event of store.events) {
    if (event.type === 'pageview') continue;
    const current = conversionMap.get(event.type) || { type: event.type, total: 0 };
    current.total += 1;
    conversionMap.set(event.type, current);
  }
  const popularServices = Object.entries(store.orders.reduce((acc, order) => {
    if (!order.service_name) return acc;
    acc[order.service_name] = (acc[order.service_name] || 0) + 1;
    return acc;
  }, {})).map(([service, total]) => ({ service, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  const popularPackages = Object.entries(store.orders.reduce((acc, order) => {
    if (!order.service_name) return acc;
    acc[order.service_name] = (acc[order.service_name] || 0) + 1;
    return acc;
  }, {})).map(([packageName, total]) => ({ package: packageName, total })).sort((a, b) => b.total - a.total).slice(0, 10);

  return {
    total_pageviews: totalPageviews,
    unique_visitors: uniqueVisitors,
    today_pageviews: store.analytics.filter(item => String(item.created_at).startsWith(today)).length,
    last_7_days_total: store.analytics.filter(item => new Date(item.created_at) >= last7Start).length,
    top_pages: topPages,
    daily_views: dailyViews,
    top_referrers: topReferrers,
    top_browsers: topBrowsers,
    top_devices: topDevices,
    top_countries: topCountries,
    conversions: [...conversionMap.values()].sort((a, b) => b.total - a.total),
    popular_services: popularServices,
    popular_packages: popularPackages,
    sales_funnel: {
      visitors: totalPageviews,
      service_views: store.analytics.filter(item => normalizeAnalyticsPath(item.path).startsWith('/services')).length,
      add_to_cart: store.events.filter(event => event.type === 'add_to_cart').length,
      checkout_started: store.events.filter(event => event.type === 'checkout_started').length,
      orders: store.orders.length,
    },
  };
}

function buildAnalytics(searchParams = new URLSearchParams()) {
  const query = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams || {});
  const range = analyticsRangeFromQuery(query);
  return {
    ...buildAnalyticsOverview(),
    report: {
      ...buildAnalyticsPeriodReport({ start: range.start, end: range.end }, { range: range.range, label: range.label, compare: range.compare, metric: range.metric, granularity: range.granularity }),
      range: {
        key: range.range,
        label: range.label,
        start: isoDateUTC(range.start),
        end: isoDateUTC(range.end),
        granularity: range.granularity,
        compare: range.compare,
        metric: range.metric,
      },
    },
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

function isCategorySlugInUse(slug, ignoreId = null) {
  const candidate = String(slug || '').trim().toLowerCase();
  if (!candidate) return false;
  return store.categories.some(category => String(category.slug || '').trim().toLowerCase() === candidate && Number(category.id) !== Number(ignoreId));
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
  service.billing_type = safeText(body.billing_type) || service.billing_type || (['monthly', 'yearly'].includes(service.price_type) ? service.price_type : 'one-time');
  service.pages_included = body.pages_included === '' || body.pages_included === null || body.pages_included === undefined ? null : toNumber(body.pages_included, null);
  service.delivery_time = safeText(body.delivery_time);
  service.revisions = safeText(body.revisions);
  service.is_featured = toBool(body.is_featured, service.is_featured ?? false);
  service.is_active = toBool(body.is_active, service.is_active ?? true);
  service.add_to_cart_enabled = body.add_to_cart_enabled === undefined ? (service.add_to_cart_enabled ?? null) : toBool(body.add_to_cart_enabled, false);
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

async function handleAdminRoute(req, res, pathname, method, url = new URL('http://sitearvo.local/')) {
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
    const categoryId = nextId('category');
    const nextSlug = safeText(body.slug) || slugify(body.name || `category-${categoryId}`);
    if (isCategorySlugInUse(nextSlug)) return jsonError(res, 409, 'This slug is already in use.');
    const category = normalizeCategory(body, categoryId);
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
      const nextSlug = safeText(body.slug) || slugify(body.name || category.name);
      if (isCategorySlugInUse(nextSlug, category.id)) return jsonError(res, 409, 'This slug is already in use.');
      updateCategory(id, body);
      saveStore();
      jsonResponse(res, 200, clone(category));
      return;
    }
    if (method === 'DELETE') {
      if ((category.services || []).length) return jsonError(res, 409, `This category contains ${category.services.length} services. Move or deactivate these services before deleting the category.`);
      store.categories = store.categories.filter(item => Number(item.id) !== Number(category.id));
      syncDerivedCollections(store);
      saveStore();
      jsonResponse(res, 200, { deleted: true });
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
  const orderConvertMatch = pathname.match(/^\/admin\/orders\/(\d+)\/convert-project$/);
  if (orderMatch || orderConvertMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const order = store.orders.find(item => Number(item.id) === Number(orderMatch?.[1] || orderConvertMatch?.[1]));
    if (!order) return jsonError(res, 404, 'Order not found.');
    if (orderConvertMatch && method === 'POST') {
      const project = normalizeProjectInput({
        project_name: `${order.service_name} - ${order.full_name}`,
        customer_id: order.customer_id,
        order_id: order.id,
        service_id: order.service_id,
        package_name: order.service_name,
        status: 'Planning',
        priority: 'Medium',
        notes: `Converted from ${order.order_number}`,
      });
      store.projects.push(project);
      order.project_id = project.id;
      order.status = 'In Progress';
      order.updated_at = nowIso();
      createNotification('project', 'Project created', `${project.project_number} from ${order.order_number}`, 'project', project.id);
      createActivity('Order converted to project', 'project', project.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { converted: true, project_id: project.id });
      return;
    }
    if (method === 'PUT') {
      const body = await readJsonBody(req);
      order.status = safeText(body.status) || order.status;
      order.payment_status = safeText(body.payment_status) || order.payment_status || paymentStatusForOrder(order);
      order.updated_at = nowIso();
      syncInvoiceForOrder(order);
      createActivity('Order status updated', 'order', order.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { updated: true });
      return;
    }
    if (method === 'GET') {
      jsonResponse(res, 200, clone(order));
      return;
    }
  }

  if (pathname === '/admin/finance' || pathname.startsWith('/admin/finance/')) {
    const financePath = pathname === '/admin/finance' ? '/' : pathname.replace(/^\/admin\/finance/, '') || '/';
    const canWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    const session = canWrite ? requireFinanceAccess(req, res, true) : requireFinanceAccess(req, res, false);
    if (!session) return;
    const searchParams = url.searchParams;

    if (method === 'GET' && financePath === '/') {
      jsonResponse(res, 200, financeOverviewPayload(searchParams));
      return;
    }
    if (method === 'GET' && financePath === '/summary') {
      jsonResponse(res, 200, buildFinanceSummary(store, financeRangeFromQuery(searchParams, store.settings)));
      return;
    }
    if (method === 'GET' && financePath === '/transactions') {
      jsonResponse(res, 200, financeTransactionsPayload(searchParams));
      return;
    }
    if (method === 'GET' && financePath === '/income') {
      jsonResponse(res, 200, financeIncomePayload(searchParams));
      return;
    }
    if (method === 'POST' && financePath === '/income') {
      const body = await readJsonBody(req);
      const record = normalizeFinanceIncomeInput(body);
      store.finance_income.push(record);
      createActivity('Finance income created', 'finance_income', record.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(record));
      return;
    }
    const incomeMatch = pathname.match(/^\/admin\/finance\/income\/(\d+)$/);
    if (incomeMatch) {
      const record = store.finance_income.find(item => Number(item.id) === Number(incomeMatch[1]));
      if (!record) return jsonError(res, 404, 'Income record not found.');
      if (record.is_system_generated) return jsonError(res, 409, 'System-generated income records cannot be modified directly.');
      if (method === 'GET') {
        jsonResponse(res, 200, clone(record));
        return;
      }
      if (method === 'PUT') {
        Object.assign(record, normalizeFinanceIncomeInput(await readJsonBody(req), record));
        createActivity('Finance income updated', 'finance_income', record.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(record));
        return;
      }
      if (method === 'DELETE') {
        record.status = 'Voided';
        record.updated_at = nowIso();
        createActivity('Finance income voided', 'finance_income', record.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { voided: true });
        return;
      }
    }

    if (method === 'GET' && financePath === '/expenses') {
      jsonResponse(res, 200, financeExpensePayload(searchParams));
      return;
    }
    if (method === 'POST' && financePath === '/expenses') {
      const body = await readJsonBody(req);
      const record = normalizeFinanceExpenseInput(body);
      store.finance_expenses.push(record);
      createActivity('Finance expense created', 'finance_expense', record.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(record));
      return;
    }
    const expenseMatch = pathname.match(/^\/admin\/finance\/expenses\/(\d+)$/);
    if (expenseMatch) {
      const record = store.finance_expenses.find(item => Number(item.id) === Number(expenseMatch[1]));
      if (!record) return jsonError(res, 404, 'Expense not found.');
      if (method === 'GET') {
        jsonResponse(res, 200, clone(record));
        return;
      }
      if (method === 'PUT') {
        Object.assign(record, normalizeFinanceExpenseInput(await readJsonBody(req), record));
        createActivity('Finance expense updated', 'finance_expense', record.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(record));
        return;
      }
      if (method === 'DELETE') {
        record.status = 'Cancelled';
        record.updated_at = nowIso();
        createActivity('Finance expense cancelled', 'finance_expense', record.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { cancelled: true });
        return;
      }
    }

    if (method === 'GET' && financePath === '/accounts') {
      jsonResponse(res, 200, financeAccountsPayload());
      return;
    }
    if (method === 'POST' && financePath === '/accounts') {
      const account = normalizeFinanceAccountInput(await readJsonBody(req));
      store.finance_accounts.push(account);
      createActivity('Finance account created', 'finance_account', account.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(account));
      return;
    }
    const accountMatch = pathname.match(/^\/admin\/finance\/accounts\/(\d+)$/);
    if (accountMatch) {
      const account = getFinanceAccountById(accountMatch[1]);
      if (!account) return jsonError(res, 404, 'Account not found.');
      if (method === 'GET') {
        jsonResponse(res, 200, clone(account));
        return;
      }
      if (method === 'PUT') {
        Object.assign(account, normalizeFinanceAccountInput(await readJsonBody(req), account));
        createActivity('Finance account updated', 'finance_account', account.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(account));
        return;
      }
      if (method === 'DELETE') {
        account.active = false;
        account.updated_at = nowIso();
        createActivity('Finance account disabled', 'finance_account', account.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { disabled: true });
        return;
      }
    }

    if (method === 'GET' && financePath === '/vendors') {
      jsonResponse(res, 200, financeVendorsPayload(searchParams));
      return;
    }
    if (method === 'POST' && financePath === '/vendors') {
      const vendor = normalizeFinanceVendorInput(await readJsonBody(req));
      store.finance_vendors.push(vendor);
      createActivity('Vendor created', 'finance_vendor', vendor.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(vendor));
      return;
    }
    const vendorMatch = pathname.match(/^\/admin\/finance\/vendors\/(\d+)$/);
    if (vendorMatch) {
      const vendor = store.finance_vendors.find(item => Number(item.id) === Number(vendorMatch[1]));
      if (!vendor) return jsonError(res, 404, 'Vendor not found.');
      if (method === 'GET') {
        const summary = financeVendorSummary(vendor.id);
        jsonResponse(res, 200, { ...clone(vendor), ...summary, expenses: store.finance_expenses.filter(expense => Number(expense.vendor_id) === Number(vendor.id)) });
        return;
      }
      if (method === 'PUT') {
        Object.assign(vendor, normalizeFinanceVendorInput(await readJsonBody(req), vendor));
        createActivity('Vendor updated', 'finance_vendor', vendor.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(vendor));
        return;
      }
      if (method === 'DELETE') {
        vendor.active = false;
        vendor.updated_at = nowIso();
        createActivity('Vendor archived', 'finance_vendor', vendor.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { archived: true });
        return;
      }
    }

    if (method === 'GET' && financePath === '/receivables') {
      jsonResponse(res, 200, financeReceivablesPayload(searchParams));
      return;
    }
    if (method === 'GET' && financePath === '/payables') {
      jsonResponse(res, 200, financePayablesPayload(searchParams));
      return;
    }

    if (method === 'GET' && financePath === '/refunds') {
      const query = financeQueryValues(searchParams);
      const items = clone(store.finance_refunds).filter(item => {
        if (query.status && String(item.status || '').toLowerCase() !== String(query.status).toLowerCase()) return false;
        if (query.customer && String(item.customer_id || '').toLowerCase() !== String(query.customer).toLowerCase()) return false;
        if (!query.search) return true;
        return [item.refund_number, item.reason, item.transaction_reference, item.status].join(' | ').toLowerCase().includes(query.search.toLowerCase());
      });
      jsonResponse(res, 200, { items: paginateRows(items, query.page, query.per_page) });
      return;
    }
    if (method === 'POST' && financePath === '/refunds') {
      const refund = normalizeFinanceRefundInput(await readJsonBody(req));
      store.finance_refunds.push(refund);
      if (refund.status === 'Completed' && refund.original_payment_id) {
        const payment = store.payments.find(item => Number(item.id) === Number(refund.original_payment_id));
        if (payment) payment.status = 'Refunded';
        const order = payment ? store.orders.find(item => Number(item.id) === Number(payment.order_id)) : null;
        if (order) {
          order.payment_status = 'Refunded';
          order.amount_paid = Math.max(0, Number(order.amount_paid || 0) - Number(refund.amount || 0));
          order.updated_at = nowIso();
          syncInvoiceForOrder(order);
        }
      }
      createActivity('Refund recorded', 'finance_refund', refund.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(refund));
      return;
    }
    const refundMatch = pathname.match(/^\/admin\/finance\/refunds\/(\d+)$/);
    if (refundMatch) {
      const refund = store.finance_refunds.find(item => Number(item.id) === Number(refundMatch[1]));
      if (!refund) return jsonError(res, 404, 'Refund not found.');
      if (method === 'GET') {
        jsonResponse(res, 200, clone(refund));
        return;
      }
      if (method === 'PUT') {
        Object.assign(refund, normalizeFinanceRefundInput(await readJsonBody(req), refund));
        createActivity('Refund updated', 'finance_refund', refund.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(refund));
        return;
      }
      if (method === 'DELETE') {
        refund.status = 'Cancelled';
        refund.updated_at = nowIso();
        createActivity('Refund cancelled', 'finance_refund', refund.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { cancelled: true });
        return;
      }
    }

    if (method === 'GET' && financePath === '/adjustments') {
      const query = financeQueryValues(searchParams);
      const items = clone(store.finance_adjustments).filter(item => {
        if (query.account && String(item.account_id || '').toLowerCase() !== String(query.account).toLowerCase()) return false;
        if (!query.search) return true;
        return [item.adjustment_number, item.reason, item.direction].join(' | ').toLowerCase().includes(query.search.toLowerCase());
      });
      jsonResponse(res, 200, { items: paginateRows(items, query.page, query.per_page) });
      return;
    }
    if (method === 'POST' && financePath === '/adjustments') {
      const adjustment = normalizeFinanceAdjustmentInput(await readJsonBody(req));
      store.finance_adjustments.push(adjustment);
      createActivity('Finance adjustment created', 'finance_adjustment', adjustment.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(adjustment));
      return;
    }

    if (method === 'GET' && financePath === '/budgets') {
      const query = financeQueryValues(searchParams);
      const items = clone(store.finance_budgets).filter(item => {
        if (query.category && String(item.category || '').toLowerCase() !== String(query.category).toLowerCase()) return false;
        if (!query.search) return true;
        return [item.budget_number, item.category, item.month].join(' | ').toLowerCase().includes(query.search.toLowerCase());
      });
      jsonResponse(res, 200, { items: paginateRows(items, query.page, query.per_page) });
      return;
    }
    if (method === 'POST' && financePath === '/budgets') {
      const budget = normalizeFinanceBudgetInput(await readJsonBody(req));
      store.finance_budgets.push(budget);
      createActivity('Budget created', 'finance_budget', budget.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 201, clone(budget));
      return;
    }
    const budgetMatch = pathname.match(/^\/admin\/finance\/budgets\/(\d+)$/);
    if (budgetMatch) {
      const budget = store.finance_budgets.find(item => Number(item.id) === Number(budgetMatch[1]));
      if (!budget) return jsonError(res, 404, 'Budget not found.');
      if (method === 'GET') {
        jsonResponse(res, 200, clone(budget));
        return;
      }
      if (method === 'PUT') {
        Object.assign(budget, normalizeFinanceBudgetInput(await readJsonBody(req), budget));
        createActivity('Budget updated', 'finance_budget', budget.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(budget));
        return;
      }
      if (method === 'DELETE') {
        budget.active = false;
        budget.updated_at = nowIso();
        createActivity('Budget disabled', 'finance_budget', budget.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { disabled: true });
        return;
      }
    }

    if (method === 'GET' && financePath === '/tax') {
      jsonResponse(res, 200, financeTaxPayload());
      return;
    }
    if (method === 'PUT' && financePath === '/tax') {
      const body = await readJsonBody(req);
      store.settings = normalizeSettings({
        ...store.settings,
        tax_enabled: body.tax_enabled === undefined ? store.settings.tax_enabled : body.tax_enabled,
        tax_name: safeText(body.tax_name) || store.settings.tax_name,
        tax_percentage: safeText(body.tax_rate ?? body.tax_percentage) || store.settings.tax_percentage,
        business_tax_id: safeText(body.business_tax_id) || store.settings.business_tax_id,
      });
      store.settings.tax_included = body.tax_included === undefined ? store.settings.tax_included : (toBool(body.tax_included) ? '1' : '0');
      createActivity('Tax settings updated', 'finance_tax', 'singleton', session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, financeTaxPayload());
      return;
    }

    if (financePath.startsWith('/reports')) {
      if (method === 'GET' && (financePath === '/reports' || financePath === '/reports/summary')) {
        jsonResponse(res, 200, financeReportsPayload(searchParams));
        return;
      }
      if (method === 'GET' && financePath === '/reports/profit-loss') {
        jsonResponse(res, 200, { ...financeReportsPayload(searchParams).profit_loss, summary: buildFinanceSummary(store, financeRangeFromQuery(searchParams, store.settings)) });
        return;
      }
      if (method === 'GET' && financePath === '/reports/cash-flow') {
        jsonResponse(res, 200, { ...financeReportsPayload(searchParams).cash_flow, summary: buildFinanceSummary(store, financeRangeFromQuery(searchParams, store.settings)) });
        return;
      }
      if (method === 'GET' && financePath === '/reports/revenue-by-service') {
        jsonResponse(res, 200, { items: financeReportsPayload(searchParams).revenue_by_service });
        return;
      }
      if (method === 'GET' && financePath === '/reports/revenue-by-category') {
        jsonResponse(res, 200, { items: financeReportsPayload(searchParams).revenue_by_category });
        return;
      }
      if (method === 'GET' && financePath === '/reports/expense-breakdown') {
        jsonResponse(res, 200, { items: financeReportsPayload(searchParams).expense_breakdown });
        return;
      }
      if (method === 'GET' && financePath === '/reports/customer-outstanding') {
        jsonResponse(res, 200, { items: financeReportsPayload(searchParams).customer_outstanding });
        return;
      }
      if (method === 'GET' && financePath === '/reports/aging-receivables') {
        jsonResponse(res, 200, financeReportsPayload(searchParams).aging_receivables);
        return;
      }
      if (method === 'GET' && financePath === '/reports/aging-payables') {
        jsonResponse(res, 200, financeReportsPayload(searchParams).aging_payables);
        return;
      }
    }

    if (financePath === '/income-categories') {
      if (method === 'GET') {
        jsonResponse(res, 200, { items: getFinanceCategoryList('income') });
        return;
      }
      if (method === 'POST') {
        const category = normalizeFinanceCategoryInput(await readJsonBody(req));
        store.income_categories.push(category);
        createActivity('Income category created', 'finance_income_category', category.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 201, clone(category));
        return;
      }
    }
    const incomeCategoryMatch = pathname.match(/^\/admin\/finance\/income-categories\/(\d+)$/);
    if (incomeCategoryMatch) {
      const category = store.income_categories.find(item => Number(item.id) === Number(incomeCategoryMatch[1]));
      if (!category) return jsonError(res, 404, 'Income category not found.');
      if (method === 'PUT') {
        Object.assign(category, normalizeFinanceCategoryInput(await readJsonBody(req), category));
        createActivity('Income category updated', 'finance_income_category', category.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(category));
        return;
      }
      if (method === 'DELETE') {
        category.active = false;
        category.updated_at = nowIso();
        createActivity('Income category disabled', 'finance_income_category', category.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { disabled: true });
        return;
      }
    }

    if (financePath === '/expense-categories') {
      if (method === 'GET') {
        jsonResponse(res, 200, { items: getFinanceCategoryList('expense') });
        return;
      }
      if (method === 'POST') {
        const category = normalizeFinanceCategoryInput(await readJsonBody(req));
        store.expense_categories.push(category);
        createActivity('Expense category created', 'finance_expense_category', category.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 201, clone(category));
        return;
      }
    }
    const expenseCategoryMatch = pathname.match(/^\/admin\/finance\/expense-categories\/(\d+)$/);
    if (expenseCategoryMatch) {
      const category = store.expense_categories.find(item => Number(item.id) === Number(expenseCategoryMatch[1]));
      if (!category) return jsonError(res, 404, 'Expense category not found.');
      if (method === 'PUT') {
        Object.assign(category, normalizeFinanceCategoryInput(await readJsonBody(req), category));
        createActivity('Expense category updated', 'finance_expense_category', category.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, clone(category));
        return;
      }
      if (method === 'DELETE') {
        category.active = false;
        category.updated_at = nowIso();
        createActivity('Expense category disabled', 'finance_expense_category', category.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 200, { disabled: true });
        return;
      }
    }

    return notFound(res, 'Finance route not found.');
  }

  if (method === 'GET' && pathname === '/admin/analytics') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, buildAnalytics(url.searchParams));
    return;
  }
  if (method === 'GET' && pathname.startsWith('/admin/analytics/')) {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    const analytics = buildAnalytics(url.searchParams);
    const section = pathname.slice('/admin/analytics/'.length);
    const sectionMap = {
      summary: analytics.report.summary,
      timeseries: analytics.report.timeseries,
      'top-pages': analytics.report.top_pages,
      sources: analytics.report.traffic_sources,
      campaigns: analytics.report.campaign_sources,
      devices: analytics.report.devices,
      browsers: analytics.report.browsers,
      services: analytics.report.top_services,
      packages: analytics.report.top_packages,
      conversions: analytics.report.conversions,
      funnel: analytics.report.funnel,
    };
    if (!sectionMap[section]) return jsonError(res, 404, 'Analytics section not found.');
    jsonResponse(res, 200, sectionMap[section]);
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
    store.settings = normalizeSettings({
      ...store.settings,
      ...body,
    });
    createActivity('Settings updated', 'settings', 'singleton', session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 200, clone(store.settings));
    return;
  }

  if (method === 'GET' && pathname === '/admin/configurator') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, { groups: configuratorGroupsPayload() });
    return;
  }
  if (method === 'PUT' && pathname === '/admin/configurator') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    const groupsInput = Array.isArray(body) ? body : Array.isArray(body.groups) ? body.groups : [];
    store.configurator_groups = normalizeConfiguratorGroups(groupsInput);
    createActivity('Configurator updated', 'configurator', 'singleton', session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 200, { groups: configuratorGroupsPayload() });
    return;
  }

  if (method === 'GET' && pathname === '/admin/export') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, {
      exported_at: nowIso(),
      settings: clone(store.settings),
      content: clone(store.content),
      categories: clone(store.categories),
      services: clone(getAllServices()),
      addons: clone(store.addons),
      orders: clone(store.orders),
      chats: clone(store.chats),
      leads: clone(store.leads),
      customers: clone(store.customers),
      quotations: clone(store.quotations),
      carts: clone(store.carts),
      payments: clone(store.payments),
      invoices: clone(store.invoices),
      projects: clone(store.projects),
      portfolio: clone(store.portfolio),
      faqs: clone(store.faqs),
      testimonials: clone(store.testimonials),
      media: clone(store.media),
      coupons: clone(store.coupons),
      notifications: clone(store.notifications),
      activity_logs: clone(store.activity_logs),
      finance_accounts: clone(store.finance_accounts),
      finance_income: clone(store.finance_income),
      finance_expenses: clone(store.finance_expenses),
      finance_vendors: clone(store.finance_vendors),
      finance_refunds: clone(store.finance_refunds),
      finance_adjustments: clone(store.finance_adjustments),
      finance_budgets: clone(store.finance_budgets),
      income_categories: clone(store.income_categories),
      expense_categories: clone(store.expense_categories),
      finance_transactions: clone(store.finance_transactions),
      admins: clone(store.admins),
    });
    return;
  }

  if (method === 'GET' && pathname === '/admin/leads') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminLeadsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/leads') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const lead = normalizeLeadInput(await readJsonBody(req));
    store.leads.push(lead);
    if (lead.customer_id) {
      const customer = findCustomerById(lead.customer_id);
      if (customer) {
        customer.lead_ids = Array.from(new Set([...(customer.lead_ids || []), lead.id]));
        customer.updated_at = nowIso();
      }
    }
    saveStore();
    jsonResponse(res, 201, clone(lead));
    return;
  }
  const leadMatch = pathname.match(/^\/admin\/leads\/(\d+)$/);
  const leadConvertMatch = pathname.match(/^\/admin\/leads\/(\d+)\/convert$/);
  if (leadMatch || leadConvertMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const lead = findLeadById(leadMatch?.[1] || leadConvertMatch?.[1]);
    if (!lead) return jsonError(res, 404, 'Lead not found.');
    if (leadConvertMatch && method === 'POST') {
      const body = await readJsonBody(req);
      const customer = ensureCustomerFromContact({
        name: body.name || lead.name,
        phone: body.phone || lead.phone,
        email: body.email || lead.email,
        company: body.company || lead.company,
        country: body.country || lead.country,
      }, lead);
      lead.customer_id = customer.id;
      lead.status = 'Won';
      lead.updated_at = nowIso();
      createNotification('lead', 'Lead converted', `${lead.lead_number} converted to customer`, 'lead', lead.id);
      createActivity('Lead converted to customer', 'lead', lead.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { converted: true, customer_id: customer.id, lead_id: lead.id });
      return;
    }
    if (method === 'GET') {
      jsonResponse(res, 200, clone(lead));
      return;
    }
    if (method === 'PUT') {
      Object.assign(lead, normalizeLeadInput(await readJsonBody(req), lead));
      saveStore();
      jsonResponse(res, 200, clone(lead));
      return;
    }
    if (method === 'DELETE') {
      lead.status = 'Lost';
      lead.is_archived = true;
      lead.updated_at = nowIso();
      createActivity('Lead archived', 'lead', lead.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/customers') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminCustomersPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/customers') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const customer = normalizeCustomerInput(await readJsonBody(req));
    store.customers.push(customer);
    createActivity('Customer created', 'customer', customer.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(customer));
    return;
  }
  const customerMatch = pathname.match(/^\/admin\/customers\/(\d+)$/);
  if (customerMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const customer = findCustomerById(customerMatch[1]);
    if (!customer) return jsonError(res, 404, 'Customer not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(customer));
      return;
    }
    if (method === 'PUT') {
      Object.assign(customer, normalizeCustomerInput(await readJsonBody(req), customer));
      saveStore();
      jsonResponse(res, 200, clone(customer));
      return;
    }
    if (method === 'DELETE') {
      customer.is_active = false;
      customer.updated_at = nowIso();
      createActivity('Customer archived', 'customer', customer.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/quotations') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminQuotationsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/quotations') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const quotation = normalizeQuotationInput(await readJsonBody(req));
    store.quotations.push(quotation);
    createNotification('quote', 'Quotation created', `${quotation.quotation_number} · ${quotation.title}`, 'quotation', quotation.id);
    createActivity('Quote created', 'quotation', quotation.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(quotation));
    return;
  }
  const quotationMatch = pathname.match(/^\/admin\/quotations\/(\d+)$/);
  const quotationActionMatch = pathname.match(/^\/admin\/quotations\/(\d+)\/(send|accept|duplicate|convert)$/);
  if (quotationMatch || quotationActionMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const quotation = findQuotationById(quotationMatch?.[1] || quotationActionMatch?.[1]);
    if (!quotation) return jsonError(res, 404, 'Quotation not found.');
    if (quotationActionMatch && method === 'POST') {
      const action = quotationActionMatch[2];
      if (action === 'duplicate') {
        const copy = normalizeQuotationInput({ ...clone(quotation), title: `${quotation.title} Copy`, status: 'Draft', converted_order_id: null }, null);
        store.quotations.push(copy);
        createActivity('Quotation duplicated', 'quotation', copy.id, session.admin.name, clientIp(req));
        saveStore();
        jsonResponse(res, 201, clone(copy));
        return;
      }
      if (action === 'send') quotation.status = 'Sent';
      if (action === 'accept') quotation.status = 'Accepted';
      if (action === 'convert') {
        const customer = quotation.customer_id ? findCustomerById(quotation.customer_id) : ensureCustomerFromContact({ name: quotation.title }, {});
        const order = {
          id: nextId('order'),
          order_number: formatOrderNumber(store.meta.nextOrderId - 1),
          customer_id: customer.id,
          customer_name: customer.name,
          full_name: customer.name,
          phone: customer.phone,
          email: customer.email,
          company_name: customer.company,
          country: customer.country,
          business_type: '',
          project_description: `Converted from quotation ${quotation.quotation_number}`,
          preferred_contact: 'whatsapp',
          total_amount: quotation.final_total,
          currency: store.settings.currency || 'INR',
          status: 'New',
          payment_status: 'Unpaid',
          amount_paid: 0,
          source: 'Quotation',
          created_at: nowIso(),
          updated_at: nowIso(),
          service_id: quotation.service_id || getAllServices()[0]?.id || 0,
          service_name: quotation.title,
          service_slug: slugify(quotation.title),
          base_price: quotation.final_total,
          addons: [],
        };
        store.orders.push(order);
        quotation.status = 'Converted';
        quotation.converted_order_id = order.id;
        quotation.converted_at = nowIso();
        customer.order_ids = Array.from(new Set([...(customer.order_ids || []), order.id]));
        createActivity('Quotation converted to order', 'quotation', quotation.id, session.admin.name, clientIp(req));
        createNotification('order', 'Quotation converted', `${quotation.quotation_number} converted to order`, 'order', order.id);
        saveStore();
        jsonResponse(res, 200, { converted: true, order_id: order.id });
        return;
      }
      quotation.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { updated: true, status: quotation.status });
      return;
    }
    if (method === 'GET') {
      jsonResponse(res, 200, clone(quotation));
      return;
    }
    if (method === 'PUT') {
      Object.assign(quotation, normalizeQuotationInput(await readJsonBody(req), quotation));
      saveStore();
      jsonResponse(res, 200, clone(quotation));
      return;
    }
    if (method === 'DELETE') {
      quotation.status = 'Rejected';
      quotation.updated_at = nowIso();
      createActivity('Quotation archived', 'quotation', quotation.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/carts') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminCartsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/carts') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const cart = normalizeCartInput(await readJsonBody(req));
    store.carts.push(cart);
    createActivity('Cart created', 'cart', cart.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(cart));
    return;
  }
  const cartMatch = pathname.match(/^\/admin\/carts\/(\d+)$/);
  if (cartMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const cart = findCartById(cartMatch[1]);
    if (!cart) return jsonError(res, 404, 'Cart not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(cart));
      return;
    }
    if (method === 'PUT') {
      Object.assign(cart, normalizeCartInput(await readJsonBody(req), cart));
      saveStore();
      jsonResponse(res, 200, clone(cart));
      return;
    }
    if (method === 'DELETE') {
      cart.status = 'Abandoned';
      cart.last_updated_at = nowIso();
      createActivity('Cart archived', 'cart', cart.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/payments') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminPaymentsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/payments') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const payment = normalizePaymentInput(await readJsonBody(req));
    store.payments.push(payment);
    if (payment.order_id) {
      const order = store.orders.find(item => Number(item.id) === Number(payment.order_id));
      if (order) {
        order.amount_paid = (Number(order.amount_paid || 0) + (payment.status === 'Received' ? Number(payment.amount || 0) : 0));
        order.payment_status = paymentStatusForOrder(order);
        syncInvoiceForOrder(order);
      }
      const customer = payment.customer_id ? findCustomerById(payment.customer_id) : null;
      if (customer) customer.payment_ids = Array.from(new Set([...(customer.payment_ids || []), payment.id]));
    }
    if (payment.status === 'Received') {
      createNotification('payment', 'Payment received', `${payment.payment_number} · ${formatPrice(payment.amount)}`, 'payment', payment.id);
      createActivity('Payment recorded', 'payment', payment.id, session.admin.name, clientIp(req));
    }
    saveStore();
    jsonResponse(res, 201, clone(payment));
    return;
  }
  const paymentMatch = pathname.match(/^\/admin\/payments\/(\d+)$/);
  if (paymentMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const payment = findPaymentById(paymentMatch[1]);
    if (!payment) return jsonError(res, 404, 'Payment not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(payment));
      return;
    }
    if (method === 'PUT') {
      Object.assign(payment, normalizePaymentInput(await readJsonBody(req), payment));
      if (payment.order_id) {
        const order = store.orders.find(item => Number(item.id) === Number(payment.order_id));
        if (order) {
          order.amount_paid = store.payments.filter(item => Number(item.order_id) === Number(order.id) && item.status === 'Received').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
          order.payment_status = paymentStatusForOrder(order);
          syncInvoiceForOrder(order);
        }
      }
      saveStore();
      jsonResponse(res, 200, clone(payment));
      return;
    }
    if (method === 'DELETE') {
      payment.status = 'Failed';
      payment.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/invoices') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminInvoicesPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/invoices') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    let invoice = body.order_id ? createInvoiceFromOrder(store.orders.find(item => Number(item.id) === Number(body.order_id)) || {}) : normalizeInvoiceInput(body);
    invoice = normalizeInvoiceInput(body, invoice);
    invoice.balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
    store.invoices.push(invoice);
    createActivity('Invoice created', 'invoice', invoice.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(invoice));
    return;
  }
  const invoiceMatch = pathname.match(/^\/admin\/invoices\/(\d+)$/);
  if (invoiceMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const invoice = findInvoiceById(invoiceMatch[1]);
    if (!invoice) return jsonError(res, 404, 'Invoice not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(invoice));
      return;
    }
    if (method === 'PUT') {
      Object.assign(invoice, normalizeInvoiceInput(await readJsonBody(req), invoice));
      saveStore();
      jsonResponse(res, 200, clone(invoice));
      return;
    }
    if (method === 'DELETE') {
      invoice.status = 'Cancelled';
      invoice.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/projects') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminProjectsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/projects') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const project = normalizeProjectInput(await readJsonBody(req));
    store.projects.push(project);
    createActivity('Project created', 'project', project.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(project));
    return;
  }
  const projectMatch = pathname.match(/^\/admin\/projects\/(\d+)$/);
  if (projectMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const project = findProjectById(projectMatch[1]);
    if (!project) return jsonError(res, 404, 'Project not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(project));
      return;
    }
    if (method === 'PUT') {
      Object.assign(project, normalizeProjectInput(await readJsonBody(req), project));
      saveStore();
      jsonResponse(res, 200, clone(project));
      return;
    }
    if (method === 'DELETE') {
      project.status = 'Cancelled';
      project.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/portfolio') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminPortfolioPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/portfolio') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const project = normalizePortfolioInput(await readJsonBody(req));
    store.portfolio.push(project);
    createActivity('Portfolio project created', 'portfolio', project.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(project));
    return;
  }
  const portfolioMatch = pathname.match(/^\/admin\/portfolio\/(\d+)$/);
  if (portfolioMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const project = findPortfolioById(portfolioMatch[1]);
    if (!project) return jsonError(res, 404, 'Portfolio project not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(project));
      return;
    }
    if (method === 'PUT') {
      Object.assign(project, normalizePortfolioInput(await readJsonBody(req), project));
      saveStore();
      jsonResponse(res, 200, clone(project));
      return;
    }
    if (method === 'DELETE') {
      project.status = 'Archived';
      project.published = false;
      project.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/content') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminContentPayload());
    return;
  }
  if (method === 'PUT' && pathname === '/admin/content') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    store.content = normalizeContent(await readJsonBody(req));
    createActivity('Content updated', 'content', 'singleton', session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 200, clone(store.content));
    return;
  }

  if (method === 'GET' && pathname === '/admin/faqs') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminFaqsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/faqs') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const faq = normalizeFaqInput(await readJsonBody(req));
    store.faqs.push(faq);
    saveStore();
    jsonResponse(res, 201, clone(faq));
    return;
  }
  const faqMatch = pathname.match(/^\/admin\/faqs\/(\d+)$/);
  if (faqMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const faq = findFaqById(faqMatch[1]);
    if (!faq) return jsonError(res, 404, 'FAQ not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(faq));
      return;
    }
    if (method === 'PUT') {
      Object.assign(faq, normalizeFaqInput(await readJsonBody(req), faq));
      saveStore();
      jsonResponse(res, 200, clone(faq));
      return;
    }
    if (method === 'DELETE') {
      faq.active = false;
      faq.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/testimonials') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminTestimonialsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/testimonials') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const testimonial = normalizeTestimonialInput(await readJsonBody(req));
    store.testimonials.push(testimonial);
    saveStore();
    jsonResponse(res, 201, clone(testimonial));
    return;
  }
  const testimonialMatch = pathname.match(/^\/admin\/testimonials\/(\d+)$/);
  if (testimonialMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const testimonial = findTestimonialById(testimonialMatch[1]);
    if (!testimonial) return jsonError(res, 404, 'Testimonial not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(testimonial));
      return;
    }
    if (method === 'PUT') {
      Object.assign(testimonial, normalizeTestimonialInput(await readJsonBody(req), testimonial));
      saveStore();
      jsonResponse(res, 200, clone(testimonial));
      return;
    }
    if (method === 'DELETE') {
      testimonial.active = false;
      testimonial.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/media') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminMediaPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/media') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const media = normalizeMediaInput(await readJsonBody(req));
    store.media.push(media);
    createActivity('Media uploaded', 'media', media.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, clone(media));
    return;
  }
  const mediaMatch = pathname.match(/^\/admin\/media\/(\d+)$/);
  if (mediaMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const media = findMediaById(mediaMatch[1]);
    if (!media) return jsonError(res, 404, 'Media item not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(media));
      return;
    }
    if (method === 'PUT') {
      Object.assign(media, normalizeMediaInput(await readJsonBody(req), media));
      saveStore();
      jsonResponse(res, 200, clone(media));
      return;
    }
    if (method === 'DELETE') {
      store.media = store.media.filter(item => Number(item.id) !== Number(media.id));
      saveStore();
      jsonResponse(res, 200, { deleted: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/coupons') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminCouponsPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/coupons') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const coupon = normalizeCouponInput(await readJsonBody(req));
    store.coupons.push(coupon);
    saveStore();
    jsonResponse(res, 201, clone(coupon));
    return;
  }
  const couponMatch = pathname.match(/^\/admin\/coupons\/(\d+)$/);
  if (couponMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const coupon = findCouponById(couponMatch[1]);
    if (!coupon) return jsonError(res, 404, 'Coupon not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, clone(coupon));
      return;
    }
    if (method === 'PUT') {
      Object.assign(coupon, normalizeCouponInput(await readJsonBody(req), coupon));
      saveStore();
      jsonResponse(res, 200, clone(coupon));
      return;
    }
    if (method === 'DELETE') {
      coupon.active = false;
      coupon.updated_at = nowIso();
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/notifications') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminNotificationsPayload());
    return;
  }
  const notificationMatch = pathname.match(/^\/admin\/notifications\/(\d+)\/read$/);
  if (notificationMatch && method === 'PUT') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const notification = findNotificationById(notificationMatch[1]);
    if (!notification) return jsonError(res, 404, 'Notification not found.');
    notification.is_read = true;
    notification.read_at = nowIso();
    saveStore();
    jsonResponse(res, 200, { updated: true });
    return;
  }

  if (method === 'GET' && pathname === '/admin/activity-logs') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminActivityLogsPayload());
    return;
  }

  if (method === 'GET' && pathname === '/admin/users') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, adminUsersPayload());
    return;
  }
  if (method === 'POST' && pathname === '/admin/users') {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const body = await readJsonBody(req);
    const admin = {
      id: nextId('admin'),
      name: safeText(body.name) || 'Admin User',
      email: safeText(body.email).toLowerCase(),
      password_hash: safeText(body.password) ? hashPassword(safeText(body.password)) : null,
      demo_password_mode: !safeText(body.password),
      is_active: true,
      role: ['Super Admin', 'Sales', 'Support', 'Content Manager'].includes(safeText(body.role)) ? safeText(body.role) : 'Sales',
      last_login_at: null,
    };
    store.admins.push(admin);
    createActivity('Admin user created', 'admin', admin.id, session.admin.name, clientIp(req));
    saveStore();
    jsonResponse(res, 201, adminUsersPayload().find(item => item.id === admin.id));
    return;
  }
  const adminMatch = pathname.match(/^\/admin\/users\/(\d+)$/);
  if (adminMatch) {
    const session = validateAdminMutation(req, res);
    if (!session) return;
    const admin = store.admins.find(item => Number(item.id) === Number(adminMatch[1]));
    if (!admin) return jsonError(res, 404, 'Admin user not found.');
    if (method === 'GET') {
      jsonResponse(res, 200, {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role || 'Super Admin',
        is_active: admin.is_active !== false,
        last_login_at: admin.last_login_at || null,
      });
      return;
    }
    if (method === 'PUT') {
      const body = await readJsonBody(req);
      admin.name = safeText(body.name) || admin.name;
      admin.email = safeText(body.email).toLowerCase() || admin.email;
      admin.role = ['Super Admin', 'Admin', 'Finance', 'Sales', 'Support', 'Content Manager'].includes(safeText(body.role)) ? safeText(body.role) : admin.role || 'Sales';
      if (safeText(body.password)) {
        admin.password_hash = hashPassword(safeText(body.password));
        admin.demo_password_mode = false;
      }
      admin.is_active = body.is_active === undefined ? admin.is_active !== false : toBool(body.is_active, true);
      admin.updated_at = nowIso();
      createActivity('Admin user updated', 'admin', admin.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role || 'Super Admin',
        is_active: admin.is_active !== false,
        last_login_at: admin.last_login_at || null,
      });
      return;
    }
    if (method === 'DELETE') {
      admin.is_active = false;
      createActivity('Admin user deactivated', 'admin', admin.id, session.admin.name, clientIp(req));
      saveStore();
      jsonResponse(res, 200, { archived: true });
      return;
    }
  }

  if (method === 'GET' && pathname === '/admin/backup') {
    requireAdmin(req, res);
    if (res.writableEnded) return;
    jsonResponse(res, 200, {
      exported_at: nowIso(),
      collections: {
        leads: store.leads.length,
        customers: store.customers.length,
        quotations: store.quotations.length,
        carts: store.carts.length,
        orders: store.orders.length,
        payments: store.payments.length,
        invoices: store.invoices.length,
        projects: store.projects.length,
        portfolio: store.portfolio.length,
        faqs: store.faqs.length,
        testimonials: store.testimonials.length,
        media: store.media.length,
      coupons: store.coupons.length,
      finance_accounts: store.finance_accounts.length,
      finance_income: store.finance_income.length,
      finance_expenses: store.finance_expenses.length,
      finance_vendors: store.finance_vendors.length,
      finance_refunds: store.finance_refunds.length,
      finance_adjustments: store.finance_adjustments.length,
      finance_budgets: store.finance_budgets.length,
    },
  });
  return;
}

  notFound(res, 'Admin route not found.');
}

async function handleApi(req, res, pathname) {
  const method = req.method ? req.method.toUpperCase() : 'GET';
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (method === 'GET' && pathname === '/health') {
    jsonResponse(res, 200, { status: 'ok', backend: 'node-json', storage: true });
    return;
  }
  if (method === 'GET' && pathname === '/catalog') {
    jsonResponse(res, 200, publicCatalog());
    return;
  }
  if (method === 'GET' && pathname === '/configurator') {
    jsonResponse(res, 200, { settings: clone(store.settings), groups: configuratorGroupsPayload() });
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
  if (method === 'POST' && pathname === '/analytics/event') {
    await trackAnalyticsEvent(req, res);
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
    await handleAdminRoute(req, res, pathname, method, url);
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
