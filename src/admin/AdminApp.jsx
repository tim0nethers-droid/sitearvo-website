import { ArrowDown, ArrowLeftRight, ArrowRight, ArrowUp, Banknote, BarChart3, BadgePercent, Boxes, CalendarRange, ChevronDown, CircleDollarSign, Copy, Download, Eye, EyeOff, FileText, FolderTree, Gauge, Landmark, LayoutDashboard, LogOut, Menu, MessageSquareText, MoreVertical, PackagePlus, PiggyBank, Plus, ReceiptText, Save, Search, Send, Settings, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { Bell, Blocks, BriefcaseBusiness, CalendarCheck2, CircleCheck, Clock3, Code2, CreditCard, Database, FilePlus2, FolderPlus, Gamepad2, Globe, LayoutGrid, Mail, MessageCircle, MessagesSquare, Monitor, MoreHorizontal, Package, PenTool, Puzzle, ReceiptIndianRupee, Server, ServerCog, ShoppingBag, ShoppingCart, Smartphone, UserPlus, Users } from 'lucide-react';
import { TicketPercent } from 'lucide-react';
import ColoredIconBox from './ColoredIconBox';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { AnalyticsDateRange, AnalyticsExportButton, AnalyticsLineChart, AnalyticsSummaryCard, formatAnalyticsRangeLabel, formatAnalyticsValue } from '../components/analytics/AnalyticsUI';
import { apiFetch } from '../catalog/api';
import { getCatalogIcon, iconChoices } from '../catalog/icons';
import { effectivePrice, formatPrice, priceLabel } from '../catalog/format';
import { useCatalog } from '../catalog/CatalogContext';
import { calculateConfiguratorSummary, cloneConfiguratorGroups, defaultConfiguratorGroups, formatConfiguratorMoney, normalizeConfiguratorGroups } from '../data/configurator';
import { hasValidPrice } from '../catalog/format';
import { starterCatalogProducts } from '../data/starterCatalog';

const AdminContext = createContext(null);
const blankCategory = { name: '', slug: '', icon: 'code', short_description: '', description: '', display_order: 0, is_featured: false, is_active: true, seo_title: '', seo_description: '' };
const blankService = { category_id: '', name: '', slug: '', service_type: 'custom_quote', icon: 'code', short_description: '', description: '', price_type: 'custom_quote', billing_type: 'one-time', base_price: '', sale_price: '', pages_included: '', delivery_time: '', revisions: '', display_order: 0, is_featured: false, is_active: true, add_to_cart_enabled: false, cta_text: 'View Service', seo_title: '', seo_description: '', features: [], addon_ids: [], image: '' };
const blankAddon = { name: '', description: '', price: '', pricing_type: 'fixed', pricing_unit: '', is_active: true, category_ids: [] };
const starterCatalogSlugSet = new Set(starterCatalogProducts.map(product => String(product.slug || '').toLowerCase()));
const adminMobileNavItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, color: 'gold' },
  { to: '/admin/leads', label: 'Leads', icon: Users, color: 'green' },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, color: 'blue' },
  { to: '/admin/chats', label: 'Chats', icon: MessageSquareText, color: 'purple' },
];
const adminMobileMenuItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, color: 'gold' },
  { to: '/admin/leads', label: 'Leads', icon: Users, color: 'green' },
  { to: '/admin/customers', label: 'Customers', icon: UserPlus, color: 'blue' },
  { to: '/admin/chats', label: 'Live Chats', icon: MessagesSquare, color: 'purple' },
  { to: '/admin/quotations', label: 'Quotations', icon: FileText, color: 'orange' },
  { to: '/admin/carts', label: 'Carts', icon: ShoppingCart, color: 'cyan' },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, color: 'blue' },
  { to: '/admin/finance', label: 'Finance', icon: Wallet, color: 'gold' },
  { to: '/admin/categories', label: 'Categories', icon: LayoutGrid, color: 'purple' },
  { to: '/admin/services', label: 'Services & Packages', icon: Package, color: 'green' },
  { to: '/admin/add-ons', label: 'Add-ons', icon: Puzzle, color: 'pink' },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, color: 'orange' },
  { to: '/admin/projects', label: 'Projects', icon: FolderPlus, color: 'blue' },
  { to: '/admin/portfolio', label: 'Portfolio', icon: BriefcaseBusiness, color: 'cyan' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, color: 'gray' },
];

function useAdminViewport() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 900px)');
    const update = event => setIsMobile(event.matches);
    setIsMobile(media.matches);
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update);
      else media.removeListener(update);
    };
  }, []);
  return isMobile;
}

function getAdminMobileMeta(pathname) {
  if (pathname === '/admin' || pathname === '/admin/dashboard') return { title: 'Dashboard', subtitle: 'A real-time overview of stored catalog content, enquiries and visitor traffic.', icon: LayoutDashboard, color: 'gold' };
  if (pathname.startsWith('/admin/leads')) return { title: 'Leads', subtitle: 'Manage all leads and enquiries.', icon: Users, color: 'green' };
  if (pathname.startsWith('/admin/orders')) return { title: 'Orders', subtitle: 'Manage all customer orders.', icon: ShoppingBag, color: 'blue' };
  if (pathname.startsWith('/admin/chats')) return { title: 'Live Chats', subtitle: 'Manage all live chat conversations.', icon: MessageSquareText, color: 'purple' };
  if (pathname.startsWith('/admin/quotations')) return { title: 'Quotations', subtitle: 'Search quotations and track status changes.', icon: FileText, color: 'orange' };
  if (pathname.startsWith('/admin/services')) return { title: 'Services & Packages', subtitle: 'Manage all services, packages and pricing.', icon: Package, color: 'green' };
  if (pathname.startsWith('/admin/projects')) return { title: 'Projects', subtitle: 'Manage all client projects.', icon: FolderPlus, color: 'blue' };
  if (pathname.startsWith('/admin/finance')) return { title: 'Finance', subtitle: 'Overview of income, expenses and payments.', icon: Wallet, color: 'gold' };
  if (pathname.startsWith('/admin/categories')) return { title: 'Categories', subtitle: 'Manage all service categories.', icon: LayoutGrid, color: 'purple' };
  if (pathname.startsWith('/admin/settings')) return { title: 'Settings', subtitle: 'Manage system settings.', icon: Settings, color: 'gray' };
  if (pathname.startsWith('/admin/notifications')) return { title: 'Notifications', subtitle: 'Track important updates and alerts.', icon: Bell, color: 'cyan' };
  return { title: 'SiteArvo Catalog Manager', subtitle: 'Manage the live catalog, packages and enquiries.', icon: LayoutDashboard, color: 'gold' };
}

function getAdminActivityIcon(action = '', entity = '') {
  const text = `${action} ${entity}`.toLowerCase();
  if (text.includes('lead')) return UserPlus;
  if (text.includes('order')) return ShoppingBag;
  if (text.includes('payment') || text.includes('invoice') || text.includes('income')) return CreditCard;
  if (text.includes('quote')) return FilePlus2;
  if (text.includes('project') && text.includes('complete')) return CircleCheck;
  if (text.includes('project')) return FolderPlus;
  if (text.includes('chat') || text.includes('message')) return MessageCircle;
  if (text.includes('category')) return LayoutGrid;
  if (text.includes('service') || text.includes('package')) return Package;
  if (text.includes('notification')) return Bell;
  return Clock3;
}

function getAdminStatusTone(value = '') {
  const text = String(value || '').toLowerCase();
  if (['new', 'draft', 'pending', 'open', 'unread'].some(token => text.includes(token))) return 'orange';
  if (['qualified', 'contacted', 'accepted', 'completed', 'converted', 'replied', 'in progress', 'in-progress', 'active', 'published'].some(token => text.includes(token))) return 'green';
  if (text.includes('cancel') || text.includes('lost') || text.includes('rejected') || text.includes('closed')) return 'red';
  if (text.includes('hold') || text.includes('paused')) return 'purple';
  return 'gray';
}

export default function AdminApp() {
  const [admin, setAdmin] = useState(undefined);
  const [notice, setNotice] = useState('');
  useEffect(() => { apiFetch('/auth/me').then(data => setAdmin(data?.id && data?.csrf ? data : null)).catch(() => setAdmin(null)); }, []);
  return (
    <AdminContext.Provider value={{ admin, setAdmin, notice, setNotice }}>
      <Routes>
        <Route path="login" element={admin === true ? <Navigate to="/admin" replace /> : <AdminLogin />} />
        <Route element={admin === undefined ? <AdminLoading /> : admin ? <AdminShell /> : <Navigate to="/admin/login" replace />}>
          <Route index element={<AdminDashboardNew />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="analytics" element={<AdminAnalyticsNew />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="quotations" element={<AdminQuotations />} />
          <Route path="carts" element={<AdminCarts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="configurator" element={<AdminConfigurator />} />
          <Route path="add-ons" element={<AdminAddons />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="finance" element={<AdminFinanceOverview />} />
          <Route path="finance/income" element={<AdminFinanceIncome />} />
          <Route path="finance/expenses" element={<AdminFinanceExpenses />} />
          <Route path="finance/accounts" element={<AdminFinanceAccounts />} />
          <Route path="finance/transactions" element={<AdminFinanceTransactions />} />
          <Route path="finance/receivables" element={<AdminFinanceReceivables />} />
          <Route path="finance/payables" element={<AdminFinancePayables />} />
          <Route path="finance/vendors" element={<AdminFinanceVendors />} />
          <Route path="finance/refunds" element={<AdminFinanceRefunds />} />
          <Route path="finance/budgets" element={<AdminFinanceBudgets />} />
          <Route path="finance/tax" element={<AdminFinanceTax />} />
          <Route path="finance/reports" element={<AdminFinanceReports />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="portfolio" element={<AdminPortfolio />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="faqs" element={<AdminFaqs />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="activity-logs" element={<AdminActivityLogs />} />
          <Route path="backup" element={<AdminBackup />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="chats" element={<AdminChats />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminContext.Provider>
  );
}

function AdminLogin() {
  const { setAdmin } = useContext(AdminContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => { document.title = 'Admin Login | SiteArvo'; }, []);
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setAdmin(await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) }));
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  return <main className="admin-login"><form onSubmit={submit}><Logo /><span>Secure administration</span><h1>SiteArvo Admin</h1><p>Manage the live catalog, packages and enquiries.</p><label>Email<input type="email" autoComplete="username" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label><label>Password<div className="admin-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /><button type="button" className="admin-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{error && <div className="admin-error" role="alert">{error}</div>}<button className="button" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button><Link to="/">Back to website</Link></form></main>;
}

function AdminShell() {
  const { admin, setAdmin, notice } = useContext(AdminContext);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useAdminViewport();
  useEffect(() => { document.title = 'Catalog Admin | SiteArvo'; }, []);
  const logout = async () => { await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {}); setAdmin(null); navigate('/admin/login'); };
  const groups = [
    { title: 'Overview', tone: 'gold', items: [['dashboard', '/admin', 'Dashboard', 'gold'], ['analytics', '/admin/analytics', 'Analytics', 'purple']] },
    { title: 'CRM', tone: 'green', items: [['leads', '/admin/leads', 'Leads', 'green'], ['customers', '/admin/customers', 'Customers', 'blue'], ['chats', '/admin/chats', 'Live Chats', 'purple']] },
    { title: 'Sales', tone: 'orange', items: [['quotations', '/admin/quotations', 'Quotations', 'orange'], ['carts', '/admin/carts', 'Carts', 'cyan'], ['orders', '/admin/orders', 'Orders', 'blue'], ['payments', '/admin/payments', 'Payments', 'gold'], ['invoices', '/admin/invoices', 'Invoices', 'pink']] },
    { title: 'Finance', tone: 'gold', items: [['finance', '/admin/finance', 'Overview', 'gold'], ['income', '/admin/finance/income', 'Income', 'green'], ['expenses', '/admin/finance/expenses', 'Expenses', 'red'], ['accounts', '/admin/finance/accounts', 'Accounts', 'blue'], ['transactions', '/admin/finance/transactions', 'Transactions', 'purple'], ['receivables', '/admin/finance/receivables', 'Receivables', 'cyan'], ['payables', '/admin/finance/payables', 'Payables', 'orange'], ['vendors', '/admin/finance/vendors', 'Vendors', 'green'], ['refunds', '/admin/finance/refunds', 'Refunds', 'red'], ['budgets', '/admin/finance/budgets', 'Budgets', 'blue'], ['tax', '/admin/finance/tax', 'Tax', 'gold'], ['reports', '/admin/finance/reports', 'Reports', 'purple']] },
    { title: 'Catalog', tone: 'cyan', items: [['categories', '/admin/categories', 'Categories', 'purple'], ['services', '/admin/services', 'Services & Packages', 'green'], ['configurator', '/admin/configurator', 'Configurator', 'cyan'], ['add-ons', '/admin/add-ons', 'Add-ons', 'pink'], ['coupons', '/admin/coupons', 'Coupons', 'orange']] },
    { title: 'Projects', tone: 'blue', items: [['projects', '/admin/projects', 'Projects', 'blue'], ['portfolio', '/admin/portfolio', 'Portfolio', 'cyan']] },
    { title: 'Content', tone: 'purple', items: [['content', '/admin/content', 'Website Content', 'gold'], ['faqs', '/admin/faqs', 'FAQs', 'blue'], ['testimonials', '/admin/testimonials', 'Testimonials', 'green'], ['media', '/admin/media', 'Media Library', 'purple']] },
    { title: 'System', tone: 'gray', items: [['notifications', '/admin/notifications', 'Notifications', 'cyan'], ['activity-logs', '/admin/activity-logs', 'Activity Logs', 'orange'], ['backup', '/admin/backup', 'Backup / Export', 'blue'], ['settings', '/admin/settings', 'Settings', 'gray'], ['users', '/admin/users', 'Admin Users', 'green']] },
  ];
  if (isMobile) return <AdminMobileShell admin={admin} notice={notice} logout={logout} groups={groups} />;
  return (
    <div className="admin-app">
      <aside className={open ? 'is-open' : ''}>
        <div className="admin-brand">
          <Logo />
          <button onClick={() => setOpen(false)} aria-label="Close admin menu"><X /></button>
        </div>
        <nav className="admin-nav-groups">
          {groups.map(group => (
            <section key={group.title} className="admin-nav-group" data-tone={group.tone}>
              <span>{group.title}</span>
              {group.items.map(([Icon, path, label, color]) => (
                <NavLink key={path} to={path} end={path === '/admin'} onClick={() => setOpen(false)}>
                  <ColoredIconBox icon={Icon} color={color} size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <div className="admin-user">
          <span>{admin.name}</span>
          <small>{admin.email}</small>
          <button onClick={logout}><LogOut /> Logout</button>
        </div>
      </aside>
      <div className="admin-main">
        <header>
          <button className="admin-menu-toggle" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu /></button>
          <div><b>SiteArvo Catalog Manager</b><span>Changes publish to the database-backed catalog.</span></div>
          <Link to="/" target="_blank">View Website</Link>
        </header>
        {notice && <div className="admin-notice" role="status">{notice}</div>}
        <div className="admin-content"><AdminOutlet /></div>
      </div>
    </div>
  );
}

function AdminMobileShell({ admin, notice, logout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const meta = getAdminMobileMeta(location.pathname);
  const adminLabel = String(admin?.name || 'Admin').trim();
  const adminInitial = adminLabel ? adminLabel.charAt(0).toUpperCase() : 'S';
  useEffect(() => { setDrawerOpen(false); }, []);
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    const toggle = () => setDrawerOpen(current => !current);
    window.addEventListener('sitearvo:toggle-admin-menu', toggle);
    return () => window.removeEventListener('sitearvo:toggle-admin-menu', toggle);
  }, []);
  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  return (
    <div className={`admin-app admin-app--mobile ${drawerOpen ? 'is-drawer-open' : ''}`}>
      <div className="admin-mobile-shell">
        <header className="admin-mobile-header">
          <button type="button" className="admin-mobile-header__button" onClick={openDrawer} aria-label="Open admin menu"><Menu /></button>
          <div className="admin-mobile-header__brand">
            <Logo />
            <div className="admin-mobile-header__brand-copy">
              <b>SiteArvo Catalog Manager</b>
              <span>{meta.title}</span>
            </div>
          </div>
          <Link to="/admin/notifications" className="admin-mobile-header__action admin-mobile-header__action--bell" aria-label="Open notifications">
            <Bell size={16} />
            <span className="admin-mobile-header__dot" />
          </Link>
          <button type="button" className="admin-mobile-header__action admin-mobile-header__action--avatar" onClick={openDrawer} aria-label="Open admin profile and menu">
            {adminInitial}
          </button>
          <a href="/" target="_blank" rel="noreferrer" className="admin-mobile-header__link">View Website</a>
        </header>
        {notice && <div className="admin-notice admin-notice--mobile" role="status">{notice}</div>}
        <main className="admin-mobile-main">
          <div className="admin-content admin-content--mobile"><AdminOutlet /></div>
        </main>
        <AdminMobileBottomNav onMore={openDrawer} />
        <AdminMobileDrawer admin={admin} open={drawerOpen} onClose={closeDrawer} onLogout={logout} />
      </div>
    </div>
  );
}

function AdminMobileBottomNav({ onMore }) {
  const location = useLocation();
  return (
    <nav className="admin-mobile-nav" aria-label="Admin navigation">
      {adminMobileNavItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/admin'}
          className={({ isActive }) => isActive || (item.to !== '/admin' && location.pathname.startsWith(item.to)) ? 'active' : ''}
        >
          <span className="admin-mobile-nav__icon"><ColoredIconBox icon={item.icon} color={item.color} size={17} /></span>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button type="button" onClick={onMore} aria-label="Open more admin options">
        <span className="admin-mobile-nav__icon"><ColoredIconBox icon={MoreHorizontal} color="gray" size={17} /></span>
        <span>More</span>
      </button>
    </nav>
  );
}

function AdminMobileDrawer({ admin, open, onClose, onLogout }) {
  const location = useLocation();
  return (
    <div className={`admin-mobile-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button type="button" className="admin-mobile-drawer__backdrop" onClick={onClose} aria-label="Close menu" />
      <section className="admin-mobile-drawer__panel" role="dialog" aria-label="Admin menu">
        <header className="admin-mobile-drawer__header">
          <div>
            <span>Menu</span>
            <h2>SiteArvo Admin</h2>
          </div>
          <button type="button" className="admin-mobile-drawer__close" onClick={onClose} aria-label="Close drawer"><X /></button>
        </header>
        <div className="admin-mobile-profile">
          <div className="admin-mobile-profile__avatar">{String(admin?.name || admin?.email || 'A').slice(0, 1).toUpperCase()}</div>
          <div>
            <b>{admin?.name || 'SiteArvo Admin'}</b>
            <span>{admin?.email || 'info@sitearvo.site'}</span>
            <small>Administrator</small>
          </div>
        </div>
        <nav className="admin-mobile-menu">
          {adminMobileMenuItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive || location.pathname.startsWith(item.to) ? 'active' : ''}
              onClick={onClose}
            >
              <ColoredIconBox icon={item.icon} color={item.color} size={16} />
              <span>{item.label}</span>
              <ArrowRight />
            </NavLink>
          ))}
        </nav>
        <div className="admin-mobile-drawer__footer">
          <button type="button" onClick={onLogout}><LogOut /> Logout</button>
          <a href="/" target="_blank" rel="noreferrer" onClick={onClose}>View Website</a>
        </div>
      </section>
    </div>
  );
}

function AdminOutlet() {
  const { pathname: path } = useLocation();
  if (path.endsWith('/leads')) return <AdminLeads />;
  if (path.endsWith('/customers')) return <AdminCustomers />;
  if (path.endsWith('/quotations')) return <AdminQuotations />;
  if (path.endsWith('/carts')) return <AdminCarts />;
  if (path.endsWith('/categories')) return <AdminCategories />;
  if (path.endsWith('/services')) return <AdminServices />;
  if (path.endsWith('/configurator')) return <AdminConfigurator />;
  if (path.endsWith('/add-ons')) return <AdminAddons />;
  if (path.endsWith('/orders')) return <AdminOrders />;
  if (path.endsWith('/payments')) return <AdminPayments />;
  if (path.endsWith('/invoices')) return <AdminInvoices />;
  if (path.endsWith('/finance')) return <AdminFinanceOverview />;
  if (path.endsWith('/finance/income')) return <AdminFinanceIncome />;
  if (path.endsWith('/finance/expenses')) return <AdminFinanceExpenses />;
  if (path.endsWith('/finance/accounts')) return <AdminFinanceAccounts />;
  if (path.endsWith('/finance/transactions')) return <AdminFinanceTransactions />;
  if (path.endsWith('/finance/receivables')) return <AdminFinanceReceivables />;
  if (path.endsWith('/finance/payables')) return <AdminFinancePayables />;
  if (path.endsWith('/finance/vendors')) return <AdminFinanceVendors />;
  if (path.endsWith('/finance/refunds')) return <AdminFinanceRefunds />;
  if (path.endsWith('/finance/budgets')) return <AdminFinanceBudgets />;
  if (path.endsWith('/finance/tax')) return <AdminFinanceTax />;
  if (path.endsWith('/finance/reports')) return <AdminFinanceReports />;
  if (path.endsWith('/projects')) return <AdminProjects />;
  if (path.endsWith('/portfolio')) return <AdminPortfolio />;
  if (path.endsWith('/content')) return <AdminContent />;
  if (path.endsWith('/faqs')) return <AdminFaqs />;
  if (path.endsWith('/testimonials')) return <AdminTestimonials />;
  if (path.endsWith('/media')) return <AdminMedia />;
  if (path.endsWith('/coupons')) return <AdminCoupons />;
  if (path.endsWith('/notifications')) return <AdminNotifications />;
  if (path.endsWith('/activity-logs')) return <AdminActivityLogs />;
  if (path.endsWith('/backup')) return <AdminBackup />;
  if (path.endsWith('/users')) return <AdminUsers />;
  if (path.endsWith('/chats')) return <AdminChats />;
  if (path.endsWith('/settings')) return <AdminSettings />;
  if (path.endsWith('/analytics')) return <AdminAnalyticsNew />;
  return <AdminDashboardNew />;
}

function useAdminData(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setData(await apiFetch(path)); } catch (requestError) { setError(requestError.message || 'The request could not be completed.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [path]);
  return { data, loading, error, load, setData };
}

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

function useAdminQueryData(path, params = {}) {
  const query = useMemo(() => buildQueryString(params), [params]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setData(await apiFetch(`${path}${query}`)); } catch (requestError) { setError(requestError.message || 'The request could not be completed.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [path, query]);
  return { data, loading, error, load, setData };
}

function AdminLoadError({ message, onRetry }) {
  return <div className="admin-loading admin-loading--error" role="alert"><b>We could not load this section.</b><p>{message || 'Please sign in again or refresh the page.'}</p>{onRetry ? <button type="button" className="button" onClick={onRetry}>Retry</button> : null}</div>;
}

function formatMoney(value, currency = 'INR') {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

const financeRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_financial_year', label: 'This Financial Year' },
  { value: 'custom', label: 'Custom Date Range' },
];

function FinanceToolbar({ range, setRange, start, setStart, end, setEnd, search, setSearch, account, setAccount, status, setStatus, category, setCategory, vendor, setVendor, children }) {
  return (
    <div className="admin-panel admin-resource-toolbar finance-toolbar">
      <div className="finance-toolbar__filters">
        {range !== undefined && <>
          <label className="admin-field admin-field--inline">
            <span>Date Range</span>
            <select value={range} onChange={e => setRange(e.target.value)}>
              {financeRangeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {range === 'custom' && <>
            <label className="admin-field admin-field--inline"><span>Start</span><input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
            <label className="admin-field admin-field--inline"><span>End</span><input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
          </>}
        </>}
        <label className="admin-field admin-field--inline"><span>Search</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records" /></label>
        {account !== undefined && <label className="admin-field admin-field--inline"><span>Account</span><input value={account} onChange={e => setAccount(e.target.value)} placeholder="Account ID" /></label>}
        {category !== undefined && <label className="admin-field admin-field--inline"><span>Category</span><input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" /></label>}
        {vendor !== undefined && <label className="admin-field admin-field--inline"><span>Vendor</span><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Vendor ID" /></label>}
        {status !== undefined && <label className="admin-field admin-field--inline"><span>Status</span><input value={status} onChange={e => setStatus(e.target.value)} placeholder="Status" /></label>}
      </div>
      <div className="finance-toolbar__actions">{children}</div>
    </div>
  );
}

function FinanceStatCard({ label, value, hint, icon: Icon, tone = '' }) {
  return <article className={`finance-stat-card ${tone}`}>{Icon && <Icon size={18} /> }<span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

function FinanceChart({ title, items = [], color = 'gold', valueLabel = 'Amount', compact = false }) {
  const max = Math.max(...items.map(item => Number(item.amount || item.value || 0)), 0) || 1;
  return (
    <section className="finance-chart">
      <header><h3>{title}</h3><span>{valueLabel}</span></header>
      <div className={`finance-chart__bars ${compact ? 'is-compact' : ''}`}>
        {items.length ? items.map(item => {
          const amount = Number(item.amount ?? item.value ?? 0);
          const width = Math.max(6, Math.round((amount / max) * 100));
          return <div key={item.label || item.month || item.name} className="finance-chart__bar"><b>{item.label || item.month || item.name}</b><div><span style={{ width: `${width}%` }} className={`tone-${color}`} /><small>{formatMoney(amount)}</small></div></div>;
        }) : <p className="finance-empty">No data in this range.</p>}
      </div>
    </section>
  );
}

function FinanceSummaryCards({ data }) {
  return <div className="finance-summary-grid">
    <FinanceStatCard label="Total Income" value={formatMoney(data.total_income, data.currency)} icon={TrendingUp} />
    <FinanceStatCard label="Total Expenses" value={formatMoney(data.total_expenses, data.currency)} icon={TrendingDown} />
    <FinanceStatCard label="Net Profit" value={formatMoney(data.net_profit, data.currency)} icon={CircleDollarSign} />
    <FinanceStatCard label="Outstanding Receivables" value={formatMoney(data.outstanding_receivables, data.currency)} icon={Banknote} />
    <FinanceStatCard label="Outstanding Payables" value={formatMoney(data.outstanding_payables, data.currency)} icon={Landmark} />
    <FinanceStatCard label="Cash Balance" value={formatMoney(data.cash_balance, data.currency)} icon={Wallet} />
    <FinanceStatCard label="Bank Balance" value={formatMoney(data.bank_balance, data.currency)} icon={Banknote} />
    <FinanceStatCard label="This Month Income" value={formatMoney(data.this_month_income, data.currency)} icon={TrendingUp} />
    <FinanceStatCard label="This Month Expenses" value={formatMoney(data.this_month_expenses, data.currency)} icon={TrendingDown} />
  </div>;
}

function formatFinanceRangeLabel(dateRange = {}) {
  if (!dateRange.start || !dateRange.end) return 'Current range';
  const start = new Date(`${dateRange.start}T00:00:00`);
  const end = new Date(`${dateRange.end}T00:00:00`);
  const options = { day: '2-digit', month: 'short' };
  const startLabel = start.toLocaleDateString('en-IN', options);
  const endLabel = end.toLocaleDateString('en-IN', options);
  const rangeLabel = dateRange.range === 'this_week' ? 'Last 7 Days' : dateRange.range === 'this_month' ? 'This Month' : dateRange.range?.replaceAll('_', ' ') || 'Current range';
  return `${rangeLabel}: ${startLabel} - ${endLabel}`;
}

function FinanceTrendChart({ title, subtitle, items = [], color = 'gold' }) {
  const points = items.map(item => ({
    label: item.month || item.label || item.name,
    amount: Number(item.amount || item.value || 0),
  }));
  const max = Math.max(...points.map(point => point.amount), 0) || 1;
  const width = 960;
  const height = 320;
  const padding = { top: 28, right: 24, bottom: 44, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const coords = points.map((point, index) => ({
    x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / Math.max(1, points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - ((point.amount || 0) / max) * chartHeight,
    ...point,
  }));
  const path = coords.length ? coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') : '';
  const areaPath = coords.length ? `${path} L ${coords.at(-1).x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z` : '';
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <section className="finance-trend">
      <header className="finance-trend__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className={`finance-trend__badge tone-${color}`}>{points.length ? `${points.length} points` : 'No data'}</span>
      </header>
      <div className="finance-trend__stats">
        <article><span>Peak</span><strong>{formatMoney(max)}</strong></article>
        <article><span>Latest</span><strong>{formatMoney(points.at(-1)?.amount || 0)}</strong></article>
        <article><span>Total</span><strong>{formatMoney(points.reduce((sum, point) => sum + point.amount, 0))}</strong></article>
      </div>
      <div className="finance-trend__chart">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <defs>
            <linearGradient id={`finance-area-${color}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color === 'green' ? '#35c67a' : '#f5a800'} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color === 'green' ? '#35c67a' : '#f5a800'} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {yTicks.map(tick => {
            const y = padding.top + chartHeight - tick * chartHeight;
            return <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} /><text x={padding.left - 10} y={y + 4} textAnchor="end">{Math.round(max * tick)}</text></g>;
          })}
          {points.length ? <>
            <path d={areaPath} fill={`url(#finance-area-${color})`} />
            <path d={path} className={`finance-trend__line tone-${color}`} />
            {coords.map(point => <g key={`${point.label}-${point.x}-${point.y}`} className="finance-trend__point"><circle cx={point.x} cy={point.y} r="4.5" /><text x={point.x} y={height - 14} textAnchor="middle">{point.label}</text></g>)}
          </> : <text x={width / 2} y={height / 2} textAnchor="middle" className="finance-trend__empty">No data in this range.</text>}
        </svg>
      </div>
    </section>
  );
}

function FinanceLineGraph({ title, subtitle, series = [], showPointValues = false, showAxisLabels = 'ends' }) {
  const labels = Array.from(new Set(series.flatMap(item => (item.items || []).map(point => point.month || point.label || point.name)).filter(Boolean)));
  const width = 960;
  const height = 400;
  const padding = { top: 30, right: 28, bottom: 54, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const lineSeries = series.map(item => ({
    name: item.name,
    color: item.color || 'gold',
    values: labels.map(label => {
      const match = (item.items || []).find(point => (point.month || point.label || point.name) === label);
      return Number(match?.amount || match?.value || 0);
    }),
  }));
  const max = Math.max(1, ...lineSeries.flatMap(item => item.values));
  const xForIndex = index => padding.left + (labels.length <= 1 ? chartWidth / 2 : (index / Math.max(1, labels.length - 1)) * chartWidth);
  const yForValue = value => padding.top + chartHeight - ((value || 0) / max) * chartHeight;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const palette = {
    gold: '#f5a800',
    green: '#35c67a',
    blue: '#4fa7ff',
    rose: '#ff7aa2',
  };
  return (
    <section className="finance-graph">
      <header className="finance-graph__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="finance-graph__legend">
          {lineSeries.map(item => <span key={item.name}><i style={{ background: palette[item.color] || palette.gold }} /> {item.name}</span>)}
        </div>
      </header>
      <div className="finance-graph__chart">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <defs>
            {lineSeries.map(item => (
              <linearGradient key={item.name} id={`finance-line-area-${item.name}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={palette[item.color] || palette.gold} stopOpacity="0.22" />
                <stop offset="100%" stopColor={palette[item.color] || palette.gold} stopOpacity="0.03" />
              </linearGradient>
            ))}
          </defs>
          {yTicks.map(tick => {
            const y = padding.top + chartHeight - tick * chartHeight;
            return <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} /><text x={padding.left - 12} y={y + 4} textAnchor="end">{Math.round(max * tick)}</text></g>;
          })}
          {labels.map((label, index) => {
            if (showAxisLabels === 'ends' && index !== 0 && index !== labels.length - 1) return null;
            return <text key={label} x={xForIndex(index)} y={height - 14} textAnchor="middle" className="finance-graph__xlabel">{label}</text>;
          })}
          {lineSeries.map(item => {
            const coords = item.values.map((value, index) => ({ x: xForIndex(index), y: yForValue(value), value }));
            const linePath = coords.length ? coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') : '';
            const areaPath = coords.length ? `${linePath} L ${coords.at(-1).x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z` : '';
            return <g key={item.name} className={`finance-graph__series tone-${item.color}`}>
              {coords.length ? <path d={areaPath} fill={`url(#finance-line-area-${item.name})`} /> : null}
              {coords.length ? <path d={linePath} className={`finance-graph__line tone-${item.color}`} /> : null}
              {coords.map(point => <g key={`${item.name}-${point.x}-${point.y}`} className="finance-graph__point"><circle cx={point.x} cy={point.y} r="4.5" />{showPointValues ? <text x={point.x} y={point.y - 10} textAnchor="middle">{formatMoney(point.value)}</text> : null}</g>)}
            </g>;
          })}
          {!labels.length && <text x={width / 2} y={height / 2} textAnchor="middle" className="finance-graph__empty">No data in this range.</text>}
        </svg>
      </div>
    </section>
  );
}

function extractFinanceRows(data) {
  return data?.items?.items || data?.items || [];
}

function FinanceCrudPage({
  title,
  description,
  endpoint,
  columns,
  fields,
  defaultRecord = {},
  createLabel = 'Add Item',
  allowCreate = true,
  allowDelete = true,
  allowEdit = true,
  rowActions,
  beforeSave,
  afterSave,
  responseTitle = title,
  filters = { search: true, range: true, account: false, status: false, category: false, vendor: false },
  extraToolbar,
  afterTable,
  rowDisabled,
  emptyMessage = 'No records found for the selected filters.',
}) {
  const [range, setRange] = useState('this_month');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [page, setPage] = useState(1);
  const query = useMemo(() => ({ range, start, end, search, account, status, category, vendor, page, per_page: 50 }), [range, start, end, search, account, status, category, vendor, page]);
  const { data, loading, error, load } = useAdminQueryData(endpoint, query);
  const [editing, setEditing] = useState(null);
  const { setNotice } = useContext(AdminContext);
  const items = extractFinanceRows(data);
  useEffect(() => { setPage(1); }, [range, start, end, search, account, status, category, vendor]);
  const save = async form => {
    const payload = { ...form };
    for (const field of fields) payload[field.name] = parseCrudValue(field, payload[field.name]);
    const body = beforeSave ? beforeSave(payload, editing) || payload : payload;
    await apiFetch(editing?.id ? `${endpoint}/${editing.id}` : endpoint, {
      method: editing?.id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    if (afterSave) await afterSave(body, editing);
    setNotice(`${responseTitle} ${editing?.id ? 'updated' : 'created'} successfully.`);
    setEditing(null);
    await load();
  };
  return (
    <>
      <AdminHeading
        title={title}
        description={description}
        action={allowCreate ? <button className="button" onClick={() => setEditing({ ...defaultRecord })}><Plus /> {createLabel}</button> : <button className="button button--secondary" onClick={() => load()}><Download /> Refresh</button>}
      />
      <FinanceToolbar
        range={filters.range ? range : undefined}
        setRange={setRange}
        start={start}
        setStart={setStart}
        end={end}
        setEnd={setEnd}
        search={search}
        setSearch={setSearch}
        account={filters.account ? account : undefined}
        setAccount={setAccount}
        status={filters.status ? status : undefined}
        setStatus={setStatus}
        category={filters.category ? category : undefined}
        setCategory={setCategory}
        vendor={filters.vendor ? vendor : undefined}
        setVendor={setVendor}
      >
        {extraToolbar}
      </FinanceToolbar>
      {allowCreate && editing && (
        <AdminEditor title={editing.id ? `Edit ${title}` : `Add ${title}`} onSubmit={() => save(editing)} onCancel={() => setEditing(null)}>
          <div className="admin-form-grid">
            {fields.map(field => (
              <CrudField
                key={field.name}
                field={field}
                value={editing[field.name] === undefined ? normalizeCrudInitial(field, defaultRecord[field.name]) : normalizeCrudInitial(field, editing[field.name])}
                onChange={value => setEditing(current => ({ ...current, [field.name]: value }))}
              />
            ))}
          </div>
        </AdminEditor>
      )}
      {loading ? <AdminLoading /> : error ? <AdminLoadError message={error} onRetry={load} /> : (
        <AdminTable headers={[...columns.map(column => column.label), 'Actions']}>
          {items.length ? items.map(item => (
            <tr key={item.id}>
              {columns.map(column => <td key={column.label}>{column.render ? column.render(item) : item[column.key]}</td>)}
              <td>
                {allowEdit && !(rowDisabled && rowDisabled(item)) && <button type="button" onClick={() => setEditing({ ...item })}>Edit</button>}
                {rowActions && rowActions(item, load, setNotice, setEditing)}
                {allowDelete && !(rowDisabled && rowDisabled(item)) && <button type="button" className="danger" onClick={async () => {
                  if (!window.confirm(`Delete ${item.name || item.title || item.id}?`)) return;
                  await apiFetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
                  await load();
                }}><Trash2 /> Delete</button>}
              </td>
            </tr>
          )) : <tr><td colSpan={columns.length + 1}><div className="admin-empty-state">{emptyMessage}</div></td></tr>}
        </AdminTable>
      )}
      {data?.items && (
        <div className="finance-pagination">
          <button type="button" className="button button--secondary" disabled={(data.items.page || 1) <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
          <span>Page {data.items.page || 1} of {data.items.total_pages || 1} · {data.items.total || items.length} records</span>
          <button type="button" className="button button--secondary" disabled={(data.items.page || 1) >= (data.items.total_pages || 1)} onClick={() => setPage(current => current + 1)}>Next</button>
        </div>
      )}
      {afterTable}
    </>
  );
}

function FinanceCategoryManager({ title, endpoint, kind, onChange }) {
  const { data, loading, error, load } = useAdminQueryData(endpoint, {});
  const items = data?.items || [];
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const save = async event => {
    event.preventDefault();
    const payload = { name, display_order: displayOrder, active: true };
    await apiFetch(editing?.id ? `${endpoint}/${editing.id}` : endpoint, { method: editing?.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    setEditing(null);
    setName('');
    setDisplayOrder(items.length + 1);
    await load();
    onChange?.();
  };
  const move = async (item, direction) => {
    const nextOrder = Math.max(1, Number(item.display_order || 1) + direction);
    await apiFetch(`${endpoint}/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, display_order: nextOrder }) });
    await load();
    onChange?.();
  };
  return (
    <section className="finance-inline-manager">
      <header><h3>{title}</h3><button type="button" className="button button--secondary" onClick={() => { setEditing({ new: true }); setName(''); setDisplayOrder(items.length + 1); }}>Add Category</button></header>
      {editing !== null && <form onSubmit={save} className="finance-inline-manager__form">
        <label><span>Name</span><input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label><span>Order</span><input type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} /></label>
        <div className="finance-inline-manager__actions">
          <button className="button button--secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
          <button className="button"><Save /> Save Category</button>
        </div>
      </form>}
      {loading ? <p>Loading categories...</p> : error ? <AdminLoadError message={error} onRetry={load} /> : <div className="finance-inline-manager__list">
        {items.map(item => (
          <article key={item.id} className={`finance-category-row ${item.active === false ? 'is-inactive' : ''}`}>
            <div><b>{item.name}</b><span>Order {item.display_order}</span></div>
            <div className="finance-category-row__actions">
              <button type="button" onClick={() => move(item, -1)}>Up</button>
              <button type="button" onClick={() => move(item, 1)}>Down</button>
              <button type="button" onClick={() => { setEditing(item); setName(item.name); setDisplayOrder(item.display_order || 1); }}>Edit</button>
              <button type="button" onClick={async () => { await apiFetch(`${endpoint}/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, active: !item.active }) }); await load(); onChange?.(); }}>{item.active === false ? 'Enable' : 'Disable'}</button>
            </div>
          </article>
        ))}
      </div>}
    </section>
  );
}

function AdminDashboard() {
  const { data, loading } = useAdminData('/admin/dashboard');
  const { data: analytics, loading: analyticsLoading } = useAdminData('/admin/analytics');
  if (loading || analyticsLoading) return <AdminLoading />;
  const analyticsCards = [
    ['Total Pageviews', analytics.total_pageviews],
    ['Unique Visitors', analytics.unique_visitors],
    ['Today Visits', analytics.today_pageviews],
    ['7-Day Visits', analytics.last_7_days_total],
  ];
  const managementCards = [
    ['Active Categories', data.active_categories],
    ['Active Services', data.active_services],
    ['Fixed Packages', data.packages],
    ['New Leads', data.new_leads],
    ['Unread Chats', data.unread_chats],
    ['Pending Quotes', data.pending_quotations],
    ['Abandoned Carts', data.abandoned_carts],
    ['New Orders', data.new_orders],
    ['Pending Payments', data.pending_payments],
    ['Active Projects', data.active_projects],
    ['Today Follow-ups', data.today_followups],
    ['Overdue Follow-ups', data.overdue_followups],
    ['Unread Notifications', data.unread_notifications],
  ];
  const financeSnapshot = data.finance_snapshot || {};
  return <>
    <AdminHeading
      title="Live Chat Inbox"
      description="Reply to website visitors in real time. Open several conversations side by side. New messages refresh automatically."
      action={<div className="admin-chat-tools"><button type="button" className={`button button--secondary admin-sound-toggle ${soundEnabled ? 'is-on' : ''}`} onClick={() => setSoundEnabled(value => !value)}>{soundEnabled ? 'Sound On' : 'Sound Off'}</button><div className="admin-chat-unread">{unreadTotal > 0 ? <><MessageSquareText /> <span>{unreadTotal} unread</span></> : <><MessageSquareText /> <span>All caught up</span></>}</div></div>}
    />
    {toast && <div className="admin-chat-toast" role="status" aria-live="polite"><MessageSquareText /><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X /></button></div>}
    {error && <div className="admin-error" role="alert">{error}</div>}
    {loading ? <AdminLoading /> : <div className="admin-chat-layout"><aside className="admin-chat-list">{conversations.length ? conversations.map(item => {
      const chatId = String(item.id);
      const isActive = String(activeId) === chatId;
      const isOpen = openIds.includes(chatId);
      return <button type="button" className={`${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`.trim()} key={item.id} onClick={() => openConversation(chatId)}><div><b>{item.visitor_name}</b><span>{item.unread_admin > 0 ? item.unread_admin : isOpen ? 'Open' : 'Preview'}</span></div><p>{item.last_message}</p><small>#{item.public_id} · {new Date(item.last_message_at.replace(' ', 'T')).toLocaleString('en-IN')}</small></button>;
    }) : <div className="admin-chat-empty"><MessageSquareText /><b>No conversations yet</b><p>New website chats will appear here.</p></div>}</aside><section className="admin-chat-workspace"><div className="admin-chat-tabs">{openIds.length ? openIds.map(id => {
      const chat = chatsById[id] || conversations.find(item => String(item.id) === String(id));
      return <div key={id} className={`admin-chat-tab ${String(activeId) === String(id) ? 'is-active' : ''}`} role="button" tabIndex={0} onClick={() => setActiveId(String(id))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveId(String(id)); } }}><span>{chat?.visitor_name || `Chat #${id}`}</span>{chat?.unread_admin > 0 && <b>{chat.unread_admin}</b>}<small>#{chat?.public_id || id}</small><button type="button" className="admin-chat-tab__close" aria-label={`Close ${chat?.visitor_name || `chat ${id}`}`} onClick={event => { event.stopPropagation(); closeConversation(id); }}><X /></button></div>;
    }) : <div className="admin-chat-tabs__empty">Open conversations from the list to compare chats side by side.</div>}</div>{openIds.length ? <div className={`admin-chat-workspace__grid ${openIds.length > 1 ? 'is-multi' : ''}`}>{openIds.map(id => { const chat = chatsById[id] || conversations.find(item => String(item.id) === String(id)); if (!chat) return <article className="admin-chat-thread-card" key={id}><div className="admin-chat-empty"><MessageSquareText /><b>Loading conversation...</b></div></article>; return <article className={`admin-chat-thread-card ${String(activeId) === String(id) ? 'is-active' : ''}`} key={id}><header><div><h2>{chat.visitor_name}</h2><p>{chat.visitor_email || 'Email not provided'} ? #{chat.public_id}</p></div><div className="admin-chat-thread-card__actions"><button type="button" className={`admin-chat-status is-${chat.status}`} onClick={() => changeStatus(id, chat.status === 'open' ? 'closed' : 'open')}>{chat.status === 'open' ? 'Close conversation' : 'Reopen conversation'}</button><button type="button" className="admin-chat-close" aria-label={`Close ${chat.visitor_name}`} onClick={() => closeConversation(id)}><X /></button></div></header><div className="admin-chat-messages">{chat.messages.map(item => <article className={`is-${item.sender}`} key={item.id}><b>{item.sender === 'visitor' ? chat.visitor_name : 'SiteArvo'}</b><p>{item.message}</p><time>{new Date(item.created_at.replace(' ', 'T')).toLocaleString('en-IN')}</time></article>)}</div><form onSubmit={event => send(id, event)}><textarea rows="2" maxLength="1500" value={drafts[id] || ''} onChange={event => setDrafts(current => ({ ...current, [id]: event.target.value }))} placeholder="Type your reply..." disabled={chat.status === 'closed'} /><button className="button" disabled={busyById[id] || chat.status === 'closed' || !(drafts[id] || '').trim()}><Send /> {busyById[id] ? 'Sending...' : 'Send Reply'}</button></form></article>; })}</div> : <div className="admin-chat-empty admin-chat-empty--workspace"><MessageSquareText /><b>Select a conversation</b><p>Pick one or more chats from the left list to keep multiple conversations open at once.</p></div>}</section></div>}
  </>;
}

function AdminAnalytics() {
  const { data, loading } = useAdminData('/admin/analytics');
  if (loading) return <AdminLoading />;
  return <>
    <AdminHeading title="Visitor Analytics" description="First-party pageview data collected from the public website and shown inside Admin." />
    <div className="admin-summary admin-summary--analytics">
      <article><span>Total Pageviews</span><strong>{data.total_pageviews ?? 0}</strong></article>
      <article><span>Unique Visitors</span><strong>{data.unique_visitors ?? 0}</strong></article>
      <article><span>Today</span><strong>{data.today_pageviews ?? 0}</strong></article>
      <article><span>7-Day Views</span><strong>{data.last_7_days_total ?? 0}</strong></article>
    </div>
    <div className="admin-panel">
      <h2>Top Pages</h2>
      <div className="admin-mini-list">
        {(data.top_pages || []).length ? data.top_pages.map(item => <div key={item.path}><b>{item.path}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No page views tracked yet.</p>}
      </div>
    </div>
    <div className="admin-analytics-grid">
      <div className="admin-panel">
        <h2>Daily Trend</h2>
        <div className="admin-mini-list">
          {(data.daily_views || []).length ? data.daily_views.map(item => <div key={item.date}><b>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No trend data yet.</p>}
        </div>
      </div>
      <div className="admin-panel">
        <h2>Top Referrers</h2>
        <div className="admin-mini-list">
          {(data.top_referrers || []).length ? data.top_referrers.map(item => <div key={item.referrer}><b>{item.referrer}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No referrer data yet.</p>}
        </div>
      </div>
    </div>
  </>;
}

const analyticsMetricMeta = {
  visits: { label: 'Visits', color: 'gold' },
  visitors: { label: 'Visitors', color: 'green' },
  orders: { label: 'Orders', color: 'purple' },
  enquiries: { label: 'Enquiries', color: 'blue' },
  revenue: { label: 'Revenue', color: 'gold' },
  conversion_rate: { label: 'Conversion Rate', color: 'rose' },
};

function analyticsDefaultDateWindow() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function relativeAnalyticsTimeLabel(value) {
  if (!value) return 'Updated just now';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Updated just now';
  const diffMinutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function AdminDashboardNew() {
  const { data, loading } = useAdminData('/admin/dashboard');
  const { data: analytics, loading: analyticsLoading } = useAdminData('/admin/analytics');
  const isMobile = useAdminViewport();
  if (loading || analyticsLoading) return <AdminLoading />;
  const analyticsReport = analytics.report || {};
  const analyticsCards = [
    { label: 'Total Pageviews', value: analytics.total_pageviews, icon: Eye, color: 'purple' },
    { label: 'Unique Visitors', value: analytics.unique_visitors, icon: Users, color: 'blue' },
    { label: 'Today Visits', value: analytics.today_pageviews, icon: CalendarCheck2, color: 'green' },
    { label: '7-Day Visits', value: analytics.last_7_days_total, icon: TrendingUp, color: 'orange' },
  ];
  const financeSnapshot = data.finance_snapshot || {};
  const managementCards = [
    { label: 'Active Categories', value: data.active_categories, icon: LayoutGrid, color: 'cyan' },
    { label: 'Active Services', value: data.active_services, icon: Package, color: 'blue' },
    { label: 'Fixed Packages', value: data.packages, icon: ShoppingBag, color: 'orange' },
    { label: 'New Leads', value: data.new_leads, icon: UserPlus, color: 'green' },
    { label: 'Unread Chats', value: data.unread_chats, icon: MessagesSquare, color: 'purple' },
    { label: 'Pending Quotes', value: data.pending_quotations, icon: FileText, color: 'pink' },
    { label: 'Abandoned Carts', value: data.abandoned_carts, icon: ShoppingCart, color: 'cyan' },
    { label: 'New Orders', value: data.new_orders, icon: ShoppingBag, color: 'blue' },
    { label: 'Pending Payments', value: data.pending_payments, icon: ReceiptText, color: 'gold' },
    { label: 'Active Projects', value: data.active_projects, icon: FolderPlus, color: 'green' },
    { label: 'Today Follow-ups', value: data.today_followups, icon: CalendarRange, color: 'orange' },
    { label: 'Overdue Follow-ups', value: data.overdue_followups, icon: Clock3, color: 'red' },
    { label: 'Unread Notifications', value: data.unread_notifications, icon: Bell, color: 'cyan' },
  ];
  const quickActions = [
    { to: '/admin/analytics', label: 'Open Analytics', icon: BarChart3, color: 'gold' },
    { to: '/admin/leads', label: 'New Lead', icon: UserPlus, color: 'green' },
    { to: '/admin/quotations', label: 'New Quote', icon: FilePlus2, color: 'blue' },
    { to: '/admin/services', label: 'New Package', icon: Package, color: 'purple' },
    { to: '/admin/projects', label: 'New Project', icon: FolderPlus, color: 'orange' },
    { to: '/admin/portfolio', label: 'Add Portfolio Project', icon: BriefcaseBusiness, color: 'cyan' },
    { to: '/admin/chats', label: 'Open Live Chats', icon: MessageSquareText, color: 'cyan' },
    { to: '/admin/orders', label: 'Review Enquiries', icon: FileText, color: 'gold' },
    { to: '/admin/finance', label: 'Open Finance', icon: Wallet, color: 'green' },
  ];
  const recentActivity = (data.recent_activity || []).slice(0, 6);
  if (isMobile) {
    return <>
      <AdminHeading title="Dashboard" description="A real-time overview of stored catalog content, enquiries and visitor traffic." />
      <section className="admin-panel admin-panel--hero admin-panel--mobile-hero">
        <div className="admin-panel__topline">
          <div>
            <span className="eyebrow">Analytics Snapshot</span>
            <h2>Visitor Metrics</h2>
          </div>
          <Link className="text-link" to="/admin/analytics">Open full analytics <BarChart3 size={16} /></Link>
        </div>
        <div className="admin-mobile-metrics">
          {analyticsCards.map(card => (
            <article key={card.label} className="admin-mobile-metric-card">
              <ColoredIconBox icon={card.icon} color={card.color} size={17} />
              <div>
                <span>{card.label}</span>
                <strong>{card.value ?? 0}</strong>
              </div>
            </article>
          ))}
        </div>
        <div className="admin-mobile-section">
          <div className="admin-mobile-section__head">
            <h3>Business Overview</h3>
          </div>
          <div className="admin-mobile-metrics">
            {managementCards.slice(0, 6).map(card => (
              <article key={card.label} className="admin-mobile-metric-card">
                <ColoredIconBox icon={card.icon} color={card.color} size={17} />
                <div>
                  <span>{card.label}</span>
                  <strong>{card.value ?? 0}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="admin-mobile-section">
          <div className="admin-mobile-section__head">
            <h3>Finance Snapshot</h3>
          </div>
          <div className="admin-mobile-metrics">
            <article className="admin-mobile-metric-card"><ColoredIconBox icon={Wallet} color="green" size={17} /><div><span>Collected This Month</span><strong>{formatMoney(financeSnapshot.collected_this_month || 0)}</strong></div></article>
            <article className="admin-mobile-metric-card"><ColoredIconBox icon={TrendingDown} color="red" size={17} /><div><span>Expenses This Month</span><strong>{formatMoney(financeSnapshot.expenses_this_month || 0)}</strong></div></article>
            <article className="admin-mobile-metric-card"><ColoredIconBox icon={CircleDollarSign} color="purple" size={17} /><div><span>Net This Month</span><strong>{formatMoney(financeSnapshot.net_this_month || 0)}</strong></div></article>
            <article className="admin-mobile-metric-card"><ColoredIconBox icon={ReceiptIndianRupee} color="blue" size={17} /><div><span>Outstanding Receivables</span><strong>{formatMoney(financeSnapshot.outstanding_receivables || 0)}</strong></div></article>
          </div>
        </div>
        <div className="admin-mobile-section">
          <div className="admin-mobile-section__head">
            <h3>Quick Actions</h3>
          </div>
          <div className="admin-mobile-actions">
            {quickActions.map(action => <Link key={action.to} to={action.to} className="admin-mobile-action"><ColoredIconBox icon={action.icon} color={action.color} size={18} /><b>{action.label}</b></Link>)}
          </div>
        </div>
        <div className="admin-mobile-section">
          <div className="admin-mobile-section__head">
            <h3>Recent Activity</h3>
          </div>
          <div className="admin-mobile-list">
            {recentActivity.length ? recentActivity.map(item => {
              const Icon = getAdminActivityIcon(item.action, item.entity);
              return <article key={item.id} className="admin-mobile-list__item"><ColoredIconBox icon={Icon} color={getAdminStatusTone(item.action || item.entity)} size={16} /><div><b>{item.action}</b><span>{item.entity} • {new Date(item.created_at).toLocaleString('en-IN')}</span></div></article>;
            }) : <p className="admin-empty-state">No recent activity yet.</p>}
          </div>
        </div>
      </section>
    </>;
  }
  return <>
    <AdminHeading title="Dashboard" description="A real-time overview of stored catalog content, enquiries and visitor traffic." />
    <div className="admin-panel admin-panel--hero">
      <div className="admin-panel__topline">
        <div>
          <span className="eyebrow">Analytics Snapshot</span>
          <h2>Visitor Metrics</h2>
        </div>
        <Link className="text-link" to="/admin/analytics">Open full analytics <BarChart3 size={16} /></Link>
      </div>
    <div className="admin-summary admin-summary--analytics admin-summary--featured">
        {analyticsCards.map(card => <article key={card.label} className={`admin-summary-card admin-summary-card--${card.color}`}><ColoredIconBox icon={card.icon} color={card.color} size={18} /><div><span>{card.label}</span><strong>{card.value ?? 0}</strong></div></article>)}
      </div>
      <div className="admin-analytics-grid">
        <section className="admin-panel admin-panel--mini-chart">
          <div className="admin-panel__topline">
            <div>
              <h3>7-Day Traffic Trend</h3>
              <p>Visits and unique visitors from the latest first-party data.</p>
            </div>
            <Link className="text-link" to="/admin/analytics">Open full analytics <BarChart3 size={16} /></Link>
          </div>
          <AnalyticsLineChart
            title="7-Day Traffic Trend"
            subtitle={formatAnalyticsRangeLabel(analyticsReport.range?.key || 'last_7_days', analyticsReport.range?.start, analyticsReport.range?.end)}
            data={analyticsReport.timeseries || []}
            series={[
              { key: 'visits', label: 'Visits', color: 'gold' },
              { key: 'visitors', label: 'Visitors', color: 'green' },
            ]}
            compact
            height={260}
          />
        </section>
        <section className="admin-panel">
          <h3>Top Pages</h3>
          <div className="admin-mini-list">
            {(analytics.top_pages || []).length ? analytics.top_pages.map(item => <div key={item.path}><b>{item.label || item.path}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No page views tracked yet.</p>}
          </div>
        </section>
      </div>
    </div>
    <div className="admin-summary">{managementCards.map(card => <article key={card.label} className={`admin-summary-card admin-summary-card--${card.color}`}><ColoredIconBox icon={card.icon} color={card.color} size={18} /><div><span>{card.label}</span><strong>{card.value ?? 0}</strong></div></article>)}</div>
    <div className="admin-panel">
      <div className="admin-panel__topline">
        <div>
          <span className="eyebrow">Finance Snapshot</span>
          <h2>Collected, spent and outstanding balances</h2>
        </div>
        <Link className="text-link" to="/admin/finance">Open Finance <ArrowLeftRight size={16} /></Link>
      </div>
      <div className="admin-summary admin-summary--analytics admin-summary--featured">
        <article><span>Collected This Month</span><strong>{formatMoney(financeSnapshot.collected_this_month || 0)}</strong></article>
        <article><span>Expenses This Month</span><strong>{formatMoney(financeSnapshot.expenses_this_month || 0)}</strong></article>
        <article><span>Net This Month</span><strong>{formatMoney(financeSnapshot.net_this_month || 0)}</strong></article>
        <article><span>Outstanding Receivables</span><strong>{formatMoney(financeSnapshot.outstanding_receivables || 0)}</strong></article>
      </div>
    </div>
    <div className="admin-actions admin-actions--spaced">
      <Link className="button" to="/admin/analytics"><BarChart3 /> Open Analytics</Link>
      <Link className="button button--secondary" to="/admin/leads"><Plus /> New Lead</Link>
      <Link className="button button--secondary" to="/admin/quotations"><Plus /> New Quote</Link>
      <Link className="button button--secondary" to="/admin/services"><Plus /> New Package</Link>
      <Link className="button button--secondary" to="/admin/projects"><Plus /> New Project</Link>
      <Link className="button button--secondary" to="/admin/portfolio"><Plus /> Add Portfolio Project</Link>
      <Link className="button button--secondary" to="/admin/chats"><MessageSquareText /> Open Live Chats</Link>
      <Link className="button button--secondary" to="/admin/orders">Review Enquiries</Link>
      <Link className="button button--secondary" to="/admin/finance"><ArrowLeftRight /> Open Finance</Link>
    </div>
    <div className="admin-panel">
      <h2>Recent Activity</h2>
      <div className="admin-mini-list">
        {(data.recent_activity || []).length ? data.recent_activity.map(item => <div key={item.id}><b>{item.action}</b><span>{item.entity} · {new Date(item.created_at).toLocaleString('en-IN')}</span></div>) : <p>No recent activity yet.</p>}
      </div>
    </div>
  </>;
}

function AdminAnalyticsNew() {
  const isMobile = useAdminViewport();
  const [range, setRange] = useState(() => (typeof window !== 'undefined' && sessionStorage.getItem('sitearvo-admin-analytics-range')) || 'last_7_days');
  const [metric, setMetric] = useState('visits');
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareMetric, setCompareMetric] = useState('visitors');
  const [compareOpen, setCompareOpen] = useState(false);
  const [start, setStart] = useState(analyticsDefaultDateWindow().start);
  const [end, setEnd] = useState(analyticsDefaultDateWindow().end);
  const params = useMemo(() => ({
    range,
    metric,
    compare: compareEnabled ? '1' : '0',
    ...(range === 'custom' ? { start, end } : {}),
  }), [range, metric, compareEnabled, start, end]);
  const { data, loading, error, load } = useAdminQueryData('/admin/analytics', params);
  const report = data?.report || {};
  const metrics = ['visits', 'visitors', 'orders', 'enquiries', 'revenue', 'conversion_rate'];
  const rangeLabel = formatAnalyticsRangeLabel(report.range?.key || range, report.range?.start, report.range?.end);
  useEffect(() => {
    if (compareEnabled && (!metrics.includes(compareMetric) || compareMetric === metric)) {
      setCompareMetric(metrics.find(item => item !== metric) || 'visitors');
    }
  }, [metric, compareMetric, compareEnabled]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sitearvo-admin-analytics-range', range);
    }
  }, [range]);
  useEffect(() => {
    if (!compareEnabled) setCompareOpen(false);
  }, [compareEnabled]);
  if (loading && !data) return <AdminLoading />;
  if (error) return <AdminLoadError message={error} onRetry={load} />;
  if (isMobile) {
    return <div className="admin-mobile-list admin-mobile-list--analytics">
      <section className="admin-mobile-section">
        <div className="admin-mobile-section__head">
          <div><h2>Analytics</h2><p>{rangeLabel} · {updatedLabel}</p></div>
          <AnalyticsExportButton filename={`sitearvo-analytics-${report.range?.key || range}.csv`} rows={report.timeseries || []} />
        </div>
        <div className="admin-mobile-metrics">
          {summaryCards.map(card => (
            <button key={card.key} type="button" className={`admin-mobile-metric-card ${card.active ? 'is-active' : ''}`} onClick={() => setMetric(card.key)}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.change === null || card.change === undefined ? 'No change' : `${card.change > 0 ? '+' : ''}${card.change}%`}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="admin-mobile-section">
        <div className="admin-mobile-section__head"><div><h2>Traffic Trend</h2><p>{analyticsMetricMeta[metric]?.label || metric}{compareEnabled ? ` vs ${analyticsMetricMeta[compareMetric]?.label || compareMetric}` : ''}</p></div></div>
        <AnalyticsLineChart
          title=""
          subtitle=""
          data={report.timeseries || []}
          series={series}
          currency={report.currency || data?.currency || 'INR'}
          emptyMessage="No analytics data for this period. Try selecting another date range."
          height={260}
          action={compareAction}
        />
      </section>
      {[
        ['Traffic Breakdown', report.traffic_sources || [], item => [item.source, `${item.pageviews} visits · ${item.share}%`]],
        ['Campaign Sources', report.campaign_sources || [], item => [item.source, `${item.pageviews} visits · ${item.share}%`]],
        ['Devices', report.devices || [], item => [item.device, `${item.pageviews} visits · ${item.share}%`]],
        ['Top Pages', report.top_pages || [], item => [item.label || item.path, `${item.pageviews} views · ${item.visitors} visitors`]],
        ['Top Services', report.top_services || [], item => [item.label, `${item.views} views · ${item.visitors} visitors`]],
        ['Popular Packages', report.top_packages || [], item => [item.label, `${item.views} views · ${item.add_to_cart} add to cart · ${item.orders} orders`]],
      ].map(([title, items, mapItem]) => (
        <section key={title} className="admin-mobile-section">
          <div className="admin-mobile-section__head"><div><h2>{title}</h2><p>Live SiteArvo data</p></div></div>
          <div className="admin-mobile-list">
            {items.length ? items.map(item => {
              const [label, meta] = mapItem(item);
              return <article key={`${title}-${label}`} className="admin-mobile-list__item"><div><b>{label}</b><span>{meta}</span></div></article>;
            }) : <article className="admin-mobile-list__item"><div><b>No data yet</b><span>Nothing tracked for this section.</span></div></article>}
          </div>
        </section>
      ))}
      <section className="admin-mobile-section">
        <div className="admin-mobile-section__head"><div><h2>Conversion Funnel</h2><p>Important tracked actions</p></div></div>
        <div className="admin-mobile-metrics">
          <article className="admin-mobile-metric-card"><span>Visitors</span><strong>{report.funnel?.visitors ?? 0}</strong></article>
          <article className="admin-mobile-metric-card"><span>Service Views</span><strong>{report.funnel?.service_views ?? 0}</strong></article>
          <article className="admin-mobile-metric-card"><span>Package Views</span><strong>{report.funnel?.package_views ?? 0}</strong></article>
          <article className="admin-mobile-metric-card"><span>Add to Cart</span><strong>{report.funnel?.add_to_cart ?? 0}</strong></article>
        </div>
      </section>
    </div>;
  }
  const selectedMetrics = compareEnabled ? [metric, compareMetric].filter((item, index, array) => item && array.indexOf(item) === index).slice(0, 2) : [metric];
  const series = selectedMetrics.map((item, index) => ({
    key: item,
    label: analyticsMetricMeta[item]?.label || item,
    color: analyticsMetricMeta[item]?.color || (index === 0 ? 'gold' : 'green'),
  }));
  const summary = report.summary || {};
  const summaryCards = metrics.map(item => ({
    key: item,
    label: analyticsMetricMeta[item]?.label || item,
    value: formatAnalyticsValue(item, summary[item]?.current ?? 0),
    change: summary[item]?.change ?? null,
    active: metric === item,
  }));
  const updatedLabel = relativeAnalyticsTimeLabel(report.updated_at);
  const compareAction = (
    <div className="analytics-compare-control">
      <button
        type="button"
        className={`analytics-compare-toggle__button ${compareEnabled ? 'is-active' : ''}`}
        aria-pressed={compareEnabled}
        onClick={() => {
          if (!compareEnabled) {
            setCompareEnabled(true);
            setCompareOpen(true);
            return;
          }
          setCompareOpen(current => !current);
        }}
      >
        <Gauge size={16} /> {compareEnabled ? `${analyticsMetricMeta[metric]?.label || metric} vs ${analyticsMetricMeta[compareMetric]?.label || compareMetric}` : 'Compare +'} <ChevronDown size={14} />
      </button>
      {compareEnabled && compareOpen && (
        <div className="analytics-compare-popover" role="menu" aria-label="Compare metrics">
          <button type="button" className="analytics-compare-popover__close" onClick={() => setCompareOpen(false)} aria-label="Close compare options"><X size={14} /></button>
          <span>Compare {analyticsMetricMeta[metric]?.label || metric} with</span>
          {metrics.filter(item => item !== metric).map(item => (
            <button
              key={item}
              type="button"
              className={compareMetric === item ? 'is-active' : ''}
              onClick={() => {
                setCompareMetric(item);
                setCompareOpen(false);
              }}
            >
              {analyticsMetricMeta[item]?.label || item}
            </button>
          ))}
          <button
            type="button"
            className="analytics-compare-popover__disable"
            onClick={() => {
              setCompareEnabled(false);
              setCompareOpen(false);
            }}
          >
            Remove comparison
          </button>
        </div>
      )}
    </div>
  );
  return <>
    <section className="admin-panel admin-panel--analytics-hero">
      <div className="admin-analytics-hero__top">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1>Visitor Analytics</h1>
          <p className="admin-analytics-hero__meta">Understand traffic, leads, orders and conversions from real SiteArvo data.</p>
        </div>
        <AnalyticsExportButton
          filename={`sitearvo-analytics-${report.range?.key || range}.csv`}
          rows={report.timeseries || []}
        />
      </div>
      <div className="admin-analytics-hero__controls">
        <AnalyticsDateRange
          compact
          hideLabel
          range={range}
          start={start}
          end={end}
          onRangeChange={value => setRange(value)}
          onStartChange={setStart}
          onEndChange={setEnd}
        />
        <p className="admin-analytics-hero__meta admin-analytics-hero__meta--status">{rangeLabel} · {updatedLabel}</p>
      </div>
    </section>
    <div className="admin-summary admin-summary--analytics admin-summary--featured analytics-summary-grid">
      {summaryCards.map(card => (
        <AnalyticsSummaryCard
          key={card.key}
          label={card.label}
          value={card.value}
          change={card.change}
          active={card.active}
          onClick={() => setMetric(card.key)}
        />
      ))}
    </div>
    <AnalyticsLineChart
      title="Traffic Trend"
      subtitle={`${analyticsMetricMeta[metric]?.label || metric}${compareEnabled ? ` vs ${analyticsMetricMeta[compareMetric]?.label || compareMetric}` : ''}`}
      data={report.timeseries || []}
      series={series}
      currency={report.currency || data?.currency || 'INR'}
      emptyMessage="No analytics data for this period. Try selecting another date range."
      height={344}
      action={compareAction}
    />
    <div className="admin-analytics-grid admin-analytics-grid--stacked">
      <section className="admin-panel">
        <h2>Traffic Breakdown</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.traffic_sources || []).length ? report.traffic_sources.map(item => <div key={item.source}><b>{item.source}</b><span>{item.pageviews} visits · {item.share}%</span></div>) : <p>No traffic source data yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Campaign Sources</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.campaign_sources || []).length ? report.campaign_sources.map(item => <div key={item.source}><b>{item.source}</b><span>{item.pageviews} visits · {item.share}%</span></div>) : <p>No campaign source data yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Devices</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.devices || []).length ? report.devices.map(item => <div key={item.device}><b>{item.device}</b><span>{item.pageviews} visits · {item.share}%</span></div>) : <p>No device data yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Top Pages</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.top_pages || []).length ? report.top_pages.map(item => <div key={item.path}><b>{item.label || item.path}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No page views tracked yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Top Services</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.top_services || []).length ? report.top_services.map(item => <div key={item.slug || item.id}><b>{item.label}</b><span>{item.views} views · {item.visitors} visitors</span></div>) : <p>No service data yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Popular Packages</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.top_packages || []).length ? report.top_packages.map(item => <div key={item.slug || item.id}><b>{item.label}</b><span>{item.views} views · {item.add_to_cart} add to cart · {item.orders} orders</span></div>) : <p>No package data yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Configurator Funnel</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          <div><b>Started</b><span>{report.configurator?.started ?? 0}</span></div>
          <div><b>Page Packages Selected</b><span>{report.configurator?.page_package_selected ?? 0}</span></div>
          <div><b>Technology Selected</b><span>{report.configurator?.technology_selected ?? 0}</span></div>
          <div><b>Add-ons Selected</b><span>{report.configurator?.addon_selected ?? 0}</span></div>
          <div><b>Added to Cart</b><span>{report.configurator?.added_to_cart ?? 0}</span></div>
          <div><b>Checkout Started</b><span>{report.configurator?.checkout_started ?? 0}</span></div>
          <div><b>Orders Submitted</b><span>{report.configurator?.order_submitted ?? 0}</span></div>
          <div><b>Cart Conversion</b><span>{report.configurator?.cart_conversion ?? 0}%</span></div>
        </div>
      </section>
      <section className="admin-panel">
        <h2>Most Selected Page Packages</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.configurator?.top_page_packages || []).length ? report.configurator.top_page_packages.map(item => <div key={item.label}><b>{item.label}</b><span>{item.selections} selections</span></div>) : <p>No configurator package selections yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Most Selected Technologies</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.configurator?.top_technologies || []).length ? report.configurator.top_technologies.map(item => <div key={item.label}><b>{item.label}</b><span>{item.selections} selections</span></div>) : <p>No configurator technology selections yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Most Selected Add-ons</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.configurator?.top_addons || []).length ? report.configurator.top_addons.map(item => <div key={item.label}><b>{item.label}</b><span>{item.selections} selections</span></div>) : <p>No configurator add-on selections yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Conversions</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          {(report.conversions || []).length ? report.conversions.map(item => <div key={item.type}><b>{item.type.replaceAll('_', ' ')}</b><span>{item.total}</span></div>) : <p>No conversion events yet.</p>}
        </div>
      </section>
      <section className="admin-panel">
        <h2>Conversion Funnel</h2>
        <div className="admin-mini-list analytics-breakdown-list">
          <div><b>Visitors</b><span>{report.funnel?.visitors ?? 0}</span></div>
          <div><b>Service Views</b><span>{report.funnel?.service_views ?? 0}</span></div>
          <div><b>Package Views</b><span>{report.funnel?.package_views ?? 0}</span></div>
          <div><b>Add to Cart</b><span>{report.funnel?.add_to_cart ?? 0}</span></div>
          <div><b>Checkout Started</b><span>{report.funnel?.checkout_started ?? 0}</span></div>
          <div><b>Orders</b><span>{report.funnel?.orders ?? 0}</span></div>
          <div><b>Enquiries</b><span>{report.funnel?.enquiries ?? 0}</span></div>
        </div>
      </section>
    </div>
  </>;
}

function AdminCategories() {
  const { data, loading, error, load } = useAdminData('/admin/categories');
  const categories = Array.isArray(data) ? data : [];
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('display_order');
  const [busyId, setBusyId] = useState(null);
  const { setNotice } = useContext(AdminContext);
  const navigate = useNavigate();
  const stats = useMemo(() => categoryMetrics(categories), [categories]);
  const filteredCategories = useMemo(() => categories
    .filter(category => categoryMatchesSearch(category, query))
    .filter(category => categoryMatchesFilter(category, filter))
    .sort((a, b) => compareCategoryOrder(a, b, sortBy)), [categories, query, filter, sortBy]);

  const saveCategory = async form => {
    const slug = slugifyCategoryText(form.slug || form.name);
    if (!slug) {
      setNotice('Please enter a valid category slug.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setNotice('Slug may only contain lowercase letters, numbers and hyphens.');
      return;
    }
    if (categories.some(category => Number(category.id) !== Number(editing?.id) && String(category.slug || '').toLowerCase() === slug)) {
      setNotice('This slug is already in use.');
      return;
    }
    try {
      await apiFetch(editing?.id ? `/admin/categories/${editing.id}` : '/admin/categories', {
        method: editing?.id ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, slug }),
      });
      setNotice(`Category ${editing?.id ? 'updated' : 'created'} successfully.`);
      setEditing(null);
      await load();
    } catch (requestError) {
      setNotice(requestError.message || 'Unable to update category.');
    }
  };

  const patchCategory = async (category, patch, message) => {
    setBusyId(category.id);
    try {
      const nextSlug = patch.slug ? slugifyCategoryText(patch.slug) : slugifyCategoryText(category.slug || category.name);
      if (nextSlug && categories.some(item => Number(item.id) !== Number(category.id) && String(item.slug || '').toLowerCase() === nextSlug)) {
        setNotice('This slug is already in use.');
        return;
      }
      await apiFetch(`/admin/categories/${category.id}`, { method: 'PUT', body: JSON.stringify({ ...category, ...patch, slug: nextSlug }) });
      setNotice(message);
      await load();
    } catch (requestError) {
      setNotice(requestError.message || 'Unable to update category.');
    } finally {
      setBusyId(null);
    }
  };

  const deactivate = async category => {
    if (!window.confirm(`Deactivate "${category.name}"? This category will be hidden from the public website.`)) return;
    await patchCategory(category, { is_active: false }, 'Category deactivated.');
  };

  const duplicate = async category => {
    const baseSlug = uniqueCategorySlug(`${category.slug || category.name}-copy`, categories);
    setBusyId(category.id);
    try {
      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: `${category.name} Copy`,
          slug: baseSlug,
          icon: category.icon || 'code',
          short_description: category.short_description || '',
          description: category.description || '',
          display_order: stats.totalCategories + 1,
          is_featured: false,
          is_active: true,
          seo_title: `${category.name} Copy | SiteArvo`,
          seo_description: category.seo_description || category.short_description || '',
        }),
      });
      setNotice('Category duplicated successfully.');
      await load();
    } catch (requestError) {
      setNotice(requestError.message || 'Unable to duplicate category.');
    } finally {
      setBusyId(null);
    }
  };

  const moveCategory = async (category, direction) => {
    const nextOrder = Math.max(1, Number(category.display_order || 1) + direction);
    await patchCategory(category, { display_order: nextOrder }, 'Display order updated.');
  };

  const openServices = category => navigate(`/admin/services?category=${encodeURIComponent(category.slug)}`);

  const renderRow = category => {
    const Icon = getCatalogIcon(category.icon);
    const serviceCount = categoryServiceCount(category);
    const packageCount = categoryPackageCount(category);
    const active = category.is_active !== false;
    const featured = Boolean(category.is_featured);
    const empty = serviceCount === 0;
    return (
      <tr key={category.id}>
        <td className="category-cell">
          <div className="category-cell__icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></div>
          <div className="category-cell__body">
            <b>{category.name}</b>
            <small>/{category.slug}</small>
            <p>{category.short_description || category.description || 'No description provided.'}</p>
            {empty && <span className="category-empty-pill">Empty Category</span>}
          </div>
        </td>
        <td>
          <Link className="category-services-link" to={`/admin/services?category=${encodeURIComponent(category.slug)}`}>{serviceCount} {serviceCount === 1 ? 'Service' : 'Services'} • {packageCount} {packageCount === 1 ? 'Product' : 'Products'} <ArrowRight size={14} /></Link>
        </td>
        <td>
          <div className="category-order-control">
            <button type="button" aria-label={`Move ${category.name} up`} disabled={busyId === category.id} onClick={() => moveCategory(category, -1)}><ArrowUp size={14} /></button>
            <strong>{category.display_order || 0}</strong>
            <button type="button" aria-label={`Move ${category.name} down`} disabled={busyId === category.id} onClick={() => moveCategory(category, 1)}><ArrowDown size={14} /></button>
          </div>
        </td>
        <td><CategoryToggle label="Featured" active={featured} busy={busyId === category.id} onToggle={() => patchCategory(category, { is_featured: !featured }, featured ? 'Category unfeatured.' : 'Category featured.')} /></td>
        <td><CategoryToggle label="Status" active={active} busy={busyId === category.id} onToggle={() => patchCategory(category, { is_active: !active }, active ? 'Category deactivated.' : 'Category activated.')} /></td>
        <td>
          <div className="category-actions-cell">
            <button type="button" className="button button--secondary button--small" onClick={() => setEditing(category)} disabled={busyId === category.id}>Edit</button>
            <CategoryRowMenu
              category={category}
              busy={busyId === category.id}
              onViewServices={() => openServices(category)}
              onDuplicate={() => duplicate(category)}
              onDeactivate={() => deactivate(category)}
              onDelete={!serviceCount ? async () => {
                if (!window.confirm(`Delete "${category.name}"? This will remove the category record.`)) return;
                setBusyId(category.id);
                try {
                  await apiFetch(`/admin/categories/${category.id}`, { method: 'DELETE' });
                  setNotice('Category deleted.');
                  await load();
                } catch (requestError) {
                  setNotice(requestError.message || 'Unable to delete category.');
                } finally {
                  setBusyId(null);
                }
              } : null}
            />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <AdminHeading
        title="Categories"
        description="Manage service categories, visibility, ordering and public navigation."
        action={<button className="button" onClick={() => setEditing({ ...blankCategory, slug: '', icon: 'code' })}><Plus /> Add Category</button>}
      />
      <div className="admin-summary admin-summary--featured admin-summary--analytics">
        <article><span>Categories</span><strong>{stats.totalCategories}</strong></article>
        <article><span>Active</span><strong>{stats.activeCategories}</strong></article>
        <article><span>Featured</span><strong>{stats.featuredCategories}</strong></article>
        <article><span>Services</span><strong>{stats.totalServices}</strong></article>
        <article><span>Products</span><strong>{stats.totalPackages}</strong></article>
      </div>
      <div className="admin-panel admin-category-toolbar">
        <label className="admin-field admin-field--inline">
          <span><Search size={16} /> Search</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search categories..." />
        </label>
        <div className="category-filter-pills" role="group" aria-label="Category filters">
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
            ['featured', 'Featured'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <label className="admin-field admin-field--inline">
          <span>Sort by</span>
          <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
            <option value="display_order">Display Order</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>
      {editing && (
        <CategoryForm
          initial={editing}
          categories={categories}
          onSave={saveCategory}
          onCancel={() => setEditing(null)}
        />
      )}
      {loading ? (
        <div className="category-skeleton-list" aria-hidden="true">
          {[1, 2, 3, 4].map(item => <div key={item} className="category-skeleton-row"><span /><span /><span /><span /></div>)}
        </div>
      ) : error ? (
        <AdminLoadError message={error} onRetry={load} />
      ) : categories.length ? (
        <>
          {filteredCategories.length ? (
            <>
          <div className="admin-categories-table">
            <AdminTable headers={['Category', 'Services', 'Order', 'Featured', 'Status', 'Actions']}>
              {filteredCategories.map(renderRow)}
            </AdminTable>
          </div>
          <div className="admin-categories-cards">
            {filteredCategories.map(category => {
              const Icon = getCatalogIcon(category.icon);
              const serviceCount = categoryServiceCount(category);
              const packageCount = categoryPackageCount(category);
              const active = category.is_active !== false;
              const featured = Boolean(category.is_featured);
              return (
                <article key={category.id} className="category-card">
                  <header>
                    <div className="category-card__title">
                      <span className="category-card__icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                      <div>
                        <b>{category.name}</b>
                        <small>/{category.slug}</small>
                      </div>
                    </div>
                    <div className="category-order-control">
                      <button type="button" aria-label={`Move ${category.name} up`} disabled={busyId === category.id} onClick={() => moveCategory(category, -1)}><ArrowUp size={14} /></button>
                      <strong>{category.display_order || 0}</strong>
                      <button type="button" aria-label={`Move ${category.name} down`} disabled={busyId === category.id} onClick={() => moveCategory(category, 1)}><ArrowDown size={14} /></button>
                    </div>
                  </header>
                  <p>{category.short_description || category.description || 'No description provided.'}</p>
                  <div className="category-card__meta">
                    <Link to={`/admin/services?category=${encodeURIComponent(category.slug)}`}>{serviceCount} {serviceCount === 1 ? 'Service' : 'Services'} • {packageCount} {packageCount === 1 ? 'Product' : 'Products'} <ArrowRight size={14} /></Link>
                    {serviceCount === 0 && <span className="category-empty-pill">Empty Category</span>}
                  </div>
                  <div className="category-card__toggles">
                    <CategoryToggle label="Featured" active={featured} busy={busyId === category.id} onToggle={() => patchCategory(category, { is_featured: !featured }, featured ? 'Category unfeatured.' : 'Category featured.')} />
                    <CategoryToggle label="Status" active={active} busy={busyId === category.id} onToggle={() => patchCategory(category, { is_active: !active }, active ? 'Category deactivated.' : 'Category activated.')} />
                  </div>
                  <footer>
                    <button type="button" className="button button--secondary button--small" onClick={() => setEditing(category)} disabled={busyId === category.id}>Edit</button>
                    <CategoryRowMenu
                      category={category}
                      busy={busyId === category.id}
                      onViewServices={() => openServices(category)}
                      onDuplicate={() => duplicate(category)}
                      onDeactivate={() => deactivate(category)}
                      onDelete={!serviceCount ? async () => {
                        if (!window.confirm(`Delete "${category.name}"? This will remove the category record.`)) return;
                        setBusyId(category.id);
                        try {
                          await apiFetch(`/admin/categories/${category.id}`, { method: 'DELETE' });
                          setNotice('Category deleted.');
                          await load();
                        } catch (requestError) {
                          setNotice(requestError.message || 'Unable to delete category.');
                        } finally {
                          setBusyId(null);
                        }
                      } : null}
                    />
                  </footer>
                </article>
              );
            })}
          </div>
            </>
          ) : <div className="category-empty-state"><h2>No matching categories</h2><p>Try a different search term or filter.</p></div>}
        </>
      ) : (
        <div className="category-empty-state">
          <h2>No Categories Yet</h2>
          <p>Create your first service category to organize SiteArvo services.</p>
          <button className="button" onClick={() => setEditing({ ...blankCategory, slug: '', icon: 'code' })}><Plus /> Add Category</button>
        </div>
      )}
    </>
  );
}

function CategoryForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...blankCategory, ...initial, slug: initial?.slug || slugifyCategoryText(initial?.name || ''), icon: initial?.icon || 'code' }));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [iconSearch, setIconSearch] = useState('');
  useEffect(() => {
    setForm({ ...blankCategory, ...initial, slug: initial?.slug || slugifyCategoryText(initial?.name || ''), icon: initial?.icon || 'code' });
    setSlugTouched(Boolean(initial?.slug));
    setIconSearch('');
  }, [initial]);
  const previewCount = categoryServiceCount({ ...initial, ...form });
  const PreviewIcon = getCatalogIcon(form.icon || 'code');
  const slugWarning = initial?.slug && slugifyCategoryText(form.slug) !== slugifyCategoryText(initial.slug);
  return (
      <AdminEditor
        title={initial.id ? 'Edit Category' : 'Add Category'}
        onSubmit={() => onSave(form)}
        onCancel={onCancel}
      >
      <div className="category-preview">
        <span className="eyebrow">Public Preview</span>
        <div className="category-preview__icon"><PreviewIcon size={20} strokeWidth={1.8} aria-hidden="true" /></div>
        <div>
          <b>{form.name || 'Category Preview'}</b>
          <small>/{slugifyCategoryText(form.slug || form.name || 'category')}</small>
          <p>{form.short_description || form.description || 'Public preview appears here while you edit.'}</p>
          <span>{previewCount} {previewCount === 1 ? 'Service' : 'Services'}</span>
        </div>
      </div>
      <div className="admin-form-grid">
        <Field label="Category Name *">
          <input
            required
            value={form.name}
            onChange={event => {
              const value = event.target.value;
              setForm(current => ({ ...current, name: value, slug: slugTouched ? current.slug : slugifyCategoryText(value) }));
            }}
          />
        </Field>
        <Field label="Slug *">
          <input
            required
            value={form.slug}
            onChange={event => {
              setSlugTouched(true);
              setForm(current => ({ ...current, slug: event.target.value }));
            }}
            placeholder="graphic-design"
          />
        </Field>
      </div>
      <CategoryIconPicker value={form.icon || 'code'} onChange={icon => setForm(current => ({ ...current, icon }))} search={iconSearch} onSearch={setIconSearch} />
      <div className="admin-form-grid">
        <Field label="Display Order">
          <input type="number" min="1" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} />
        </Field>
        <Field label="SEO Title">
          <input value={form.seo_title || ''} onChange={e => setForm({ ...form, seo_title: e.target.value })} />
        </Field>
      </div>
      <Field label="Short Description">
        <textarea rows="2" value={form.short_description || ''} onChange={e => setForm({ ...form, short_description: e.target.value })} />
      </Field>
      <Field label="Long Description">
        <textarea rows="4" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="admin-checks">
        <CheckField label="Featured" checked={form.is_featured} onChange={is_featured => setForm({ ...form, is_featured })} />
        <CheckField label="Active" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} />
      </div>
      <Field label="SEO Description">
        <textarea rows="2" value={form.seo_description || ''} onChange={e => setForm({ ...form, seo_description: e.target.value })} />
      </Field>
      {slugWarning && <p className="category-form-note">Changing this slug may affect existing links.</p>}
    </AdminEditor>
  );
}

const categoryIconChoices = iconChoices;

function slugifyCategoryText(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueCategorySlug(base, categories, ignoreId = null) {
  const cleanBase = slugifyCategoryText(base) || 'category';
  const existing = new Set(categories.filter(item => Number(item.id) !== Number(ignoreId)).map(item => String(item.slug || '').toLowerCase()));
  if (!existing.has(cleanBase)) return cleanBase;
  let index = 2;
  while (existing.has(`${cleanBase}-${index}`)) index += 1;
  return `${cleanBase}-${index}`;
}

function categoryServiceCount(category) {
  return Number(category.service_count ?? category.active_service_count ?? (category.services || []).length || 0);
}

function categoryPackageCount(category) {
  return Number(category.package_count ?? category.active_package_count ?? (category.services || []).filter(service => starterCatalogSlugSet.has(String(service.slug || '').toLowerCase())).length || 0);
}

function categoryMetrics(categories) {
  return {
    totalCategories: categories.length,
    activeCategories: categories.filter(category => category.is_active !== false).length,
    featuredCategories: categories.filter(category => category.is_featured).length,
    totalServices: categories.reduce((sum, category) => sum + Number(category.service_count ?? (category.services || []).length || 0), 0),
    totalPackages: categories.reduce((sum, category) => sum + Number(category.package_count ?? (category.services || []).filter(service => starterCatalogSlugSet.has(String(service.slug || '').toLowerCase())).length || 0), 0),
  };
}

function categoryMatchesSearch(category, query) {
  if (!query.trim()) return true;
  const value = query.toLowerCase();
  return [category.name, category.slug, category.short_description, category.description].some(field => String(field || '').toLowerCase().includes(value));
}

function categoryMatchesFilter(category, filter) {
  if (filter === 'active') return category.is_active !== false;
  if (filter === 'inactive') return category.is_active === false;
  if (filter === 'featured') return Boolean(category.is_featured);
  return true;
}

function compareCategoryOrder(a, b, sortBy) {
  if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
  if (sortBy === 'newest') return Number(b.id || 0) - Number(a.id || 0);
  return (a.display_order || 0) - (b.display_order || 0) || String(a.name || '').localeCompare(String(b.name || ''));
}

function CategoryIconPicker({ value, onChange, search, onSearch }) {
  const q = String(search || '').trim().toLowerCase();
  const options = categoryIconChoices.filter(choice => !q || `${choice.key} ${choice.label} ${choice.hint}`.toLowerCase().includes(q));
  return (
    <div className="category-icon-picker">
      <label className="admin-field">
        <span>Icon</span>
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search icons..." />
      </label>
      <div className="category-icon-picker__grid">
        {options.map(choice => {
          const Icon = getCatalogIcon(choice.key);
          const active = value === choice.key;
          return (
            <button
              key={choice.key}
              type="button"
              className={`category-icon-picker__item ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange(choice.key)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>
                <b>{choice.label}</b>
                <small>{choice.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryToggle({ active, label = 'Toggle', busy = false, onToggle }) {
  return (
    <button
      type="button"
      className={`category-toggle ${active ? 'is-active' : 'is-inactive'}`}
      aria-pressed={active}
      aria-label={`${label}: ${active ? 'Active' : 'Inactive'}`}
      disabled={busy}
      onClick={onToggle}
    >
      <span>{label}</span>
      <strong>{busy ? '…' : active ? 'ON' : 'OFF'}</strong>
    </button>
  );
}

function CategoryRowMenu({ category, onViewServices, onDuplicate, onDeactivate, onDelete, busy }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = event => {
      if (!event.target.closest?.(`[data-category-menu="${category.id}"]`)) setOpen(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [category.id]);
  return (
    <div className="category-row-menu" data-category-menu={category.id}>
      <button type="button" className="category-row-menu__button" aria-label={`More actions for ${category.name}`} aria-expanded={open} onClick={() => setOpen(current => !current)} disabled={busy}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="category-row-menu__panel" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onViewServices(); }}><Eye size={15} /> View Services</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDuplicate(); }}><Copy size={15} /> Duplicate</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDeactivate(); }}><Trash2 size={15} /> Deactivate</button>
          {onDelete && <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={15} /> Delete</button>}
        </div>
      )}
    </div>
  );
}

function AdminServices() {
  const { search } = useLocation();
  const categorySlug = useMemo(() => new URLSearchParams(search).get('category') || '', [search]);
  const { data: services, loading, load } = useAdminData('/admin/services');
  const { data: categories } = useAdminData('/admin/categories');
  const { data: addons } = useAdminData('/admin/addons');
  const navigate = useNavigate();
  const isMobile = useAdminViewport();
  const [editing, setEditing] = useState(null);
  const { setNotice } = useContext(AdminContext);
  const { refresh } = useCatalog();
  const categoryFilter = categories.find(category => category.slug === categorySlug || String(category.id) === categorySlug);
  const filteredServices = useMemo(() => (categoryFilter ? services.filter(service => (String(service.category_id) === String(categoryFilter.id) || service.category_slug === categoryFilter.slug) && starterCatalogSlugSet.has(String(service.slug || '').toLowerCase())) : services), [services, categoryFilter]);
  const mobileCategories = useMemo(() => categories.map((category, index) => ({
    ...category,
    count: services.filter(service => String(service.category_id) === String(category.id) || service.category_slug === category.slug).length,
    tone: ['blue', 'green', 'orange', 'purple', 'cyan', 'pink'][index % 6],
  })), [categories, services]);
  const isPurchasable = service => service.price_type === 'fixed' && hasValidPrice(service) && service.add_to_cart_enabled !== false;
  const save = async form => { await apiFetch(editing?.id ? `/admin/services/${editing.id}` : '/admin/services', { method: editing?.id ? 'PUT' : 'POST', body: JSON.stringify(form) }); setNotice(`Service ${editing?.id ? 'updated' : 'created'} successfully.`); setEditing(null); await load(); refresh(); };
  const deactivate = async service => { if (!window.confirm(`Deactivate "${service.name}"?`)) return; await apiFetch(`/admin/services/${service.id}`, { method: 'DELETE' }); setNotice('Service deactivated.'); load(); refresh(); };
  return <>
    <AdminHeading
      title="Services & Packages"
      description={categoryFilter ? `Filtered by ${categoryFilter.name}.` : 'Unlimited services, fixed packages, features, prices and applicable add-ons.'}
      action={<button className="button" onClick={() => setEditing({ ...blankService, category_id: categoryFilter?.id || categories[0]?.id || '' })}><Plus /> Add Product</button>}
    />
    {editing && <ServiceForm initial={editing} categories={categories} addons={addons} onSave={save} onCancel={() => setEditing(null)} />}
    {categoryFilter && <div className="admin-notice admin-notice--inline">Viewing products from <b>{categoryFilter.name}</b>.</div>}
    {loading ? <AdminLoading /> : isMobile ? (
      <div className="admin-mobile-list admin-mobile-list--categories">
        {mobileCategories.map(category => {
          const Icon = getCatalogIcon(category.icon);
          return <article key={category.id} className="admin-mobile-card admin-mobile-card--category">
            <button type="button" className="admin-mobile-card__top admin-mobile-card__top--button" onClick={() => navigate(`/admin/services?category=${encodeURIComponent(category.slug || category.id)}`)}>
              <ColoredIconBox icon={Icon} color={category.tone} size={18} />
              <div>
                <b>{category.name}</b>
                <span>{category.count} {category.count === 1 ? 'Service' : 'Services'}</span>
              </div>
              <ArrowRight size={16} />
            </button>
          </article>;
        })}
      </div>
    ) : (
      <AdminTable headers={['Product', 'Category', 'Price Type', 'Price', 'Featured', 'Add to Cart', 'Status', 'Actions']}>
        {filteredServices.map(service => (
          <tr key={service.id}>
            <td><b>{service.name}</b><small>/{service.slug}</small></td>
            <td>{service.category_name}</td>
            <td>{service.price_type?.replaceAll('_', ' ')}</td>
            <td>{priceLabel(service)}</td>
            <td>{service.is_featured ? 'Yes' : 'No'}</td>
            <td>{isPurchasable(service) ? 'Enabled' : (service.price_type === 'fixed' ? 'Price Required' : 'Disabled')}</td>
            <td><Status active={service.is_active} /></td>
            <td>
              <button onClick={() => setEditing(service)}>Edit</button>
              <button className="danger" onClick={() => deactivate(service)}><Trash2 /> Deactivate</button>
            </td>
          </tr>
        ))}
      </AdminTable>
    )}
  </>;
}

function ServiceForm({ initial, categories, addons, onSave, onCancel }) {
  const [form, setForm] = useState({ ...blankService, ...initial, features: (initial.features || []).map(feature => typeof feature === 'string' ? feature : feature.name), addon_ids: initial.addon_ids || (initial.addons || []).map(addon => addon.id) });
  const [feature, setFeature] = useState('');
  const [uploading, setUploading] = useState(false);
  const addFeature = () => { if (feature.trim()) { setForm({ ...form, features: [...form.features, feature.trim()] }); setFeature(''); } };
  const upload = async event => { const file = event.target.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { window.alert('Choose a JPG, PNG or WebP image up to 2 MB.'); return; } setUploading(true); const body = new FormData(); body.append('image', file); try { const response = await fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': sessionStorage.getItem('sitearvo-admin-csrf') || '' }, body }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setForm(current => ({ ...current, image: result.data.url })); } catch (error) { window.alert(error.message); } finally { setUploading(false); } };
  return <AdminEditor title={initial.id ? 'Edit Service / Package' : 'Add New Service / Package'} onSubmit={() => onSave(form)} onCancel={onCancel}>
    <div className="admin-form-grid">
      <Field label="Category *"><select required value={form.category_id} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })}><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
      <Field label="Service Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Slug"><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field>
      <IconField value={form.icon} onChange={icon => setForm({ ...form, icon })} />
      <Field label="Price Type *"><select value={form.price_type} onChange={e => setForm({ ...form, price_type: e.target.value })}><option value="fixed">Fixed Price</option><option value="starting_from">Starting From</option><option value="custom_quote">Custom Quote</option><option value="addon">Add-on</option></select></Field>
      <Field label="Billing Type"><select value={form.billing_type || 'one-time'} onChange={e => setForm({ ...form, billing_type: e.target.value })}><option value="one-time">One-Time</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="custom">Custom</option></select></Field>
      <Field label="Base Price"><input type="number" min="0" step="0.01" value={form.base_price ?? ''} onChange={e => setForm({ ...form, base_price: e.target.value })} /></Field>
      <Field label="Sale Price"><input type="number" min="0" step="0.01" value={form.sale_price ?? ''} onChange={e => setForm({ ...form, sale_price: e.target.value })} /></Field>
      <Field label="Display Order"><input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
      <Field label="Pages Included"><input type="number" min="0" value={form.pages_included ?? ''} onChange={e => setForm({ ...form, pages_included: e.target.value })} /></Field>
      <Field label="Delivery Time"><input value={form.delivery_time || ''} onChange={e => setForm({ ...form, delivery_time: e.target.value })} /></Field>
      <Field label="Revisions"><input value={form.revisions || ''} onChange={e => setForm({ ...form, revisions: e.target.value })} /></Field>
      <Field label="CTA Text"><input value={form.cta_text || ''} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></Field>
    </div>
    <div className="admin-checks" style={{ marginTop: '1rem' }}>
      <CheckField label="Active" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} />
      <CheckField label="Featured" checked={form.is_featured} onChange={is_featured => setForm({ ...form, is_featured })} />
      <CheckField label="Add to Cart Enabled" checked={form.add_to_cart_enabled !== false} onChange={add_to_cart_enabled => setForm({ ...form, add_to_cart_enabled })} />
    </div>
    <Field label="Short Description"><textarea rows="2" value={form.short_description || ''} onChange={e => setForm({ ...form, short_description: e.target.value })} /></Field>
    <Field label="Full Description"><textarea rows="4" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
    <div className="admin-feature-editor"><b>Package Features</b>{form.features.map((item, index) => <div key={`${item}-${index}`}><span>{item}</span><button type="button" onClick={() => setForm({ ...form, features: form.features.filter((_, itemIndex) => itemIndex !== index) })}><X /></button></div>)}<div><input placeholder="Responsive Design" value={feature} onChange={e => setFeature(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} /><button className="button button--secondary" type="button" onClick={addFeature}><Plus /> Add Feature</button></div></div>
    <fieldset className="admin-addon-options"><legend>Available Add-ons</legend>{addons.map(addon => <CheckField key={addon.id} label={addon.name} checked={form.addon_ids.includes(addon.id)} onChange={checked => setForm({ ...form, addon_ids: checked ? [...form.addon_ids, addon.id] : form.addon_ids.filter(id => id !== addon.id) })} />)}</fieldset>
    <div className="admin-form-grid"><Field label="Cover Image"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />{uploading && <small>Uploading safely...</small>}{form.image && <small>{form.image}</small>}</Field><Field label="SEO Title"><input value={form.seo_title || ''} onChange={e => setForm({ ...form, seo_title: e.target.value })} /></Field></div>
    <Field label="SEO Description"><textarea rows="2" value={form.seo_description || ''} onChange={e => setForm({ ...form, seo_description: e.target.value })} /></Field>
  </AdminEditor>;
}

function AddonForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...blankAddon, ...initial, category_ids: initial.category_ids || [] });
  return <AdminEditor title={initial.id ? 'Edit Add-on' : 'Add Add-on'} onSubmit={() => onSave(form)} onCancel={onCancel}><div className="admin-form-grid"><Field label="Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Price"><input type="number" min="0" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value })} /></Field><Field label="Pricing Type"><select value={form.pricing_type} onChange={e => setForm({ ...form, pricing_type: e.target.value })}><option value="fixed">Fixed</option><option value="per_page">Per Page</option><option value="per_item">Per Item</option><option value="per_month">Per Month</option><option value="custom_quote">Custom Quote</option></select></Field><Field label="Pricing Unit"><input placeholder="page, item or month" value={form.pricing_unit || ''} onChange={e => setForm({ ...form, pricing_unit: e.target.value })} /></Field></div><Field label="Description"><textarea rows="3" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field><fieldset className="admin-addon-options"><legend>Applicable Categories</legend>{categories.map(category => <CheckField key={category.id} label={category.name} checked={form.category_ids.includes(category.id)} onChange={checked => setForm({ ...form, category_ids: checked ? [...form.category_ids, category.id] : form.category_ids.filter(id => id !== category.id) })} />)}</fieldset><CheckField label="Active" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} /></AdminEditor>;
}

function AdminOrders() {
  const { data: orders, loading, load } = useAdminData('/admin/orders');
  const isMobile = useAdminViewport();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const statuses = ['New', 'Contacted', 'In Discussion', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
  const update = async (id, status) => { await apiFetch(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }); load(); };
  const filteredOrders = useMemo(() => (orders || []).filter(order => {
    const text = `${order.order_number} ${order.full_name} ${order.phone} ${order.service_name} ${order.status}`.toLowerCase();
    const matchesQuery = !query.trim() || text.includes(query.toLowerCase());
    const matchesTab = tab === 'All' || String(order.status || '').toLowerCase() === tab.toLowerCase();
    return matchesQuery && matchesTab;
  }), [orders, query, tab]);
  return <>
    <AdminHeading title="Orders" description="Manage all customer orders." />
    {isMobile && (
      <>
        <div className="admin-mobile-search-row">
          <label className="admin-mobile-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders..." /></label>
          <button type="button" className="admin-mobile-filter-button" aria-label="Filter orders"><SlidersHorizontal size={16} /></button>
        </div>
        <div className="admin-mobile-tabs">
          {['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'].map(item => <button key={item} type="button" className={tab === item ? 'is-active' : ''} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}
        </div>
      </>
    )}
    {loading ? <AdminLoading /> : isMobile ? <div className="admin-mobile-list admin-mobile-list--orders">{filteredOrders.map(order => {
      const serviceName = String(order.service_name || '').toLowerCase();
      const Icon = serviceName.includes('mobile') ? Smartphone : serviceName.includes('e-commerce') || serviceName.includes('commerce') ? ShoppingCart : serviceName.includes('marketing') ? BarChart3 : serviceName.includes('maintenance') ? ServerCog : Code2;
      const tone = serviceName.includes('mobile') ? 'orange' : serviceName.includes('commerce') ? 'green' : serviceName.includes('marketing') ? 'orange' : serviceName.includes('maintenance') ? 'gray' : 'blue';
      return <article key={order.id} className="admin-mobile-card">
        <div className="admin-mobile-card__top">
          <ColoredIconBox icon={Icon} color={tone} size={17} />
          <div>
            <b>{order.order_number}</b>
            <span>{order.full_name} · {order.phone}</span>
          </div>
          <span className={`admin-status-pill is-${getAdminStatusTone(order.status)}`}>{order.status}</span>
        </div>
        <div className="admin-mobile-card__meta">
          <div><span>Service</span><strong>{order.service_name}</strong></div>
          <div><span>Total</span><strong>{formatPrice(order.total_amount)}</strong></div>
          <div><span>Date</span><strong>{new Date(order.created_at).toLocaleDateString('en-IN')}</strong></div>
        </div>
        <div className="admin-mobile-card__actions">
          <label className="admin-mobile-inline-select"><span>Status</span><select value={order.status} onChange={e => update(order.id, e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
        </div>
      </article>;
    })}</div> : <AdminTable headers={['Order ID', 'Customer', 'Service', 'Total', 'Date', 'Status']}>{orders.map(order => <tr key={order.id}><td><b>{order.order_number}</b></td><td>{order.full_name}<small>{order.phone}</small></td><td>{order.service_name}</td><td>{formatPrice(order.total_amount)}</td><td>{new Date(order.created_at).toLocaleDateString('en-IN')}</td><td><select value={order.status} onChange={e => update(order.id, e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></td></tr>)}</AdminTable>}
  </>;
}

function AdminChats() {
  const isMobile = useAdminViewport();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const [conversations, setConversations] = useState([]);
  const [openIds, setOpenIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [chatsById, setChatsById] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyById, setBusyById] = useState({});
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const previousConversationIdsRef = useRef([]);
  const previousUnreadByIdRef = useRef({});
  const audioContextRef = useRef(null);
  const openIdsRef = useRef([]);
  const activeIdRef = useRef(null);

  useEffect(() => { openIdsRef.current = openIds; }, [openIds]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const playAlertTone = () => {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = context;
      if (context.state === 'suspended') context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
      oscillator.stop(context.currentTime + 0.32);
    } catch {
      // best-effort alert sound only
    }
  };

  const openToast = (title, message) => setToast({ id: `${Date.now()}-${Math.random()}`, title, message });

  const openConversation = id => {
    const chatId = String(id);
    setOpenIds(current => (current.includes(chatId) ? current : [...current, chatId]));
    setActiveId(chatId);
    loadChat(chatId);
  };

  const closeConversation = id => {
    const chatId = String(id);
    setOpenIds(current => current.filter(item => String(item) !== chatId));
    setChatsById(current => {
      const next = { ...current };
      delete next[chatId];
      return next;
    });
    setDrafts(current => {
      const next = { ...current };
      delete next[chatId];
      return next;
    });
    setActiveId(current => {
      if (String(current) !== chatId) return current;
      const remaining = openIdsRef.current.filter(item => String(item) !== chatId);
      return remaining.at(-1) || null;
    });
  };

  const loadList = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await apiFetch('/admin/chats');
      const nextIds = data.map(item => String(item.id));
      const nextUnreadById = data.reduce((accumulator, item) => {
        accumulator[String(item.id)] = Number(item.unread_admin || 0);
        return accumulator;
      }, {});
      const latestId = data[0]?.id ? String(data[0].id) : null;
      const previousIds = previousConversationIdsRef.current;
      const previousUnread = previousUnreadByIdRef.current;
      const latestConversation = data[0] || null;
      const newConversation = Boolean(latestId) && !previousIds.includes(latestId);
      const unreadIncrease = data.find(item => Number(item.unread_admin || 0) > Number(previousUnread[String(item.id)] || 0));
      if (quiet && (newConversation || unreadIncrease)) {
        const mentionName = newConversation ? latestConversation?.visitor_name || 'a visitor' : unreadIncrease?.visitor_name || 'a visitor';
        const title = newConversation ? 'New live chat' : 'New visitor message';
        const message = newConversation ? `${mentionName} just started a new conversation.` : `${mentionName} sent a new message.`;
        openToast(title, message);
        if (soundEnabled) playAlertTone();
      }
      previousConversationIdsRef.current = nextIds;
      previousUnreadByIdRef.current = nextUnreadById;
      setConversations(data);
      setOpenIds(current => {
        const normalized = current.map(item => String(item)).filter(item => nextIds.includes(item));
        if (normalized.length) {
          if (!normalized.includes(activeIdRef.current)) setActiveId(normalized.at(-1));
          return normalized;
        }
        if (latestId) {
          setActiveId(latestId);
          return [latestId];
        }
        setActiveId(null);
        return [];
      });
    } catch (requestError) { setError(requestError.message); }
    finally { if (!quiet) setLoading(false); }
  };

  const loadChat = async id => {
    const chatId = String(id || '');
    if (!chatId) return null;
    try {
      const chat = await apiFetch(`/admin/chats/${chatId}`);
      setChatsById(current => ({ ...current, [chatId]: chat }));
      setError('');
      return chat;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    }
  };

  useEffect(() => {
    loadList();
    const timer = window.setInterval(() => loadList(true), 1000);
    const refresh = () => loadList(true);
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!openIds.length) return undefined;
    let cancelled = false;
    const refresh = async () => {
      const results = await Promise.all(openIds.map(id => loadChat(id)));
      if (cancelled) return;
      if (results.some(Boolean)) setError('');
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [openIds]);

  const send = async (chatId, event) => {
    event.preventDefault();
    const draft = drafts[chatId] || '';
    if (!draft.trim()) return;
    setBusyById(current => ({ ...current, [chatId]: true }));
    try {
      await apiFetch(`/admin/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ message: draft }) });
      setDrafts(current => ({ ...current, [chatId]: '' }));
      await loadChat(chatId);
      await loadList(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyById(current => ({ ...current, [chatId]: false }));
    }
  };

  const changeStatus = async (chatId, status) => {
    await apiFetch(`/admin/chats/${chatId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    await loadChat(chatId);
    await loadList(true);
  };

  const unreadTotal = conversations.reduce((sum, item) => sum + Number(item.unread_admin || 0), 0);
  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter(item => {
      const text = `${item.visitor_name} ${item.visitor_email || ''} ${item.last_message || ''} ${item.public_id || ''}`.toLowerCase();
      const matchesQuery = !term || text.includes(term);
      const unread = Number(item.unread_admin || 0) > 0;
      const status = String(item.status || '').toLowerCase();
      const matchesTab = tab === 'All' || (tab === 'Unread' && unread) || (tab === 'Open' && status === 'open') || (tab === 'Closed' && status === 'closed');
      return matchesQuery && matchesTab;
    });
  }, [conversations, query, tab]);

  if (isMobile) {
    const activeChats = openIds.map(id => chatsById[id] || conversations.find(item => String(item.id) === String(id))).filter(Boolean);
    return <>
      <AdminHeading
        title="Live Chat Inbox"
        description="Reply to website visitors in real time. Open several conversations side by side. New messages refresh automatically."
        action={<div className="admin-chat-tools"><button type="button" className={`button button--secondary admin-sound-toggle ${soundEnabled ? 'is-on' : ''}`} onClick={() => setSoundEnabled(value => !value)}>{soundEnabled ? 'Sound On' : 'Sound Off'}</button><div className="admin-chat-unread">{unreadTotal > 0 ? <><MessageSquareText /> <span>{unreadTotal} unread</span></> : <><MessageSquareText /> <span>All caught up</span></>}</div></div>}
      />
      {toast && <div className="admin-chat-toast" role="status" aria-live="polite"><MessageSquareText /><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X /></button></div>}
      {error && <div className="admin-error" role="alert">{error}</div>}
      {loading ? <AdminLoading /> : <section className="admin-mobile-section admin-chat-mobile-shell">
        <div className="admin-mobile-search-row">
          <label className="admin-mobile-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search chats..." /></label>
          <button type="button" className="admin-mobile-filter-button" aria-label="Filter chats"><SlidersHorizontal size={16} /></button>
        </div>
        <div className="admin-mobile-tabs admin-chat-mobile-tabs">
          {['All', 'Open', 'Unread', 'Closed'].map(item => <button key={item} type="button" className={tab === item ? 'is-active' : ''} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}
        </div>
        <div className="admin-chat-mobile-list">
          {filteredConversations.length ? filteredConversations.map(item => {
            const chatId = String(item.id);
            const isOpen = openIds.includes(chatId);
            const isActive = String(activeId) === chatId;
            const unreadCount = Number(item.unread_admin || 0);
            return <button type="button" key={item.id} className={`admin-chat-mobile-card ${isOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`.trim()} onClick={() => openConversation(chatId)}>
              <div className="admin-chat-mobile-card__top">
                <div className="admin-chat-mobile-avatar">{String(item.visitor_name || 'S').charAt(0).toUpperCase()}</div>
                <div className="admin-chat-mobile-card__copy">
                  <div>
                    <b>{item.visitor_name}</b>
                    <span>{item.visitor_email || 'No email provided'}</span>
                  </div>
                  <small>{item.last_message || 'No messages yet'}</small>
                </div>
                <div className="admin-chat-mobile-card__meta">
                  {unreadCount > 0 && <span className="admin-chat-mobile-badge">{unreadCount}</span>}
                  <small>{new Date(item.last_message_at.replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small>
                </div>
              </div>
            </button>;
          }) : <div className="admin-chat-empty admin-chat-empty--mobile"><MessageSquareText /><b>No conversations yet</b><p>New website chats will appear here.</p></div>}
        </div>
        {activeChats.length ? <div className="admin-chat-mobile-thread-stack">
          <div className="admin-chat-tabs admin-chat-tabs--mobile">
            {openIds.map(id => {
              const chat = chatsById[id] || conversations.find(item => String(item.id) === String(id));
              if (!chat) return null;
              return <div role="button" tabIndex={0} key={id} className={`admin-chat-tab ${String(activeId) === String(id) ? 'is-active' : ''}`} onClick={() => setActiveId(String(id))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveId(String(id)); } }}><span>{chat?.visitor_name || `Chat #${id}`}</span>{chat?.unread_admin > 0 && <b>{chat.unread_admin}</b>}<small>#{chat?.public_id || id}</small><button type="button" className="admin-chat-tab__close" aria-label={`Close ${chat?.visitor_name || `chat ${id}`}`} onClick={event => { event.stopPropagation(); closeConversation(id); }}><X /></button></div>;
            })}
          </div>
          {activeChats.filter(chat => String(activeId) === String(chat.id)).map(chat => {
            const messageItems = Array.isArray(chat.messages) ? chat.messages : [];
            const chatId = String(chat.id);
            return <article className={`admin-chat-thread-card admin-chat-thread-card--mobile ${String(activeId) === chatId ? 'is-active' : ''}`} key={chat.id}>
              <header>
                <div>
                  <h2>{chat.visitor_name}</h2>
                  <p>{chat.visitor_email || 'Email not provided'} · #{chat.public_id}</p>
                </div>
                <div className="admin-chat-thread-card__actions">
                  <button type="button" className={`admin-chat-status is-${chat.status}`} onClick={() => changeStatus(chatId, chat.status === 'open' ? 'closed' : 'open')}>{chat.status === 'open' ? 'Close conversation' : 'Reopen conversation'}</button>
                  <button type="button" className="admin-chat-close" aria-label={`Close ${chat.visitor_name}`} onClick={() => closeConversation(chatId)}><X /></button>
                </div>
              </header>
              <div className="admin-chat-messages">{messageItems.length ? messageItems.map(item => <article className={`is-${item.sender}`} key={item.id}><b>{item.sender === 'visitor' ? chat.visitor_name : 'SiteArvo'}</b><p>{item.message}</p><time>{new Date(item.created_at.replace(' ', 'T')).toLocaleString('en-IN')}</time></article>) : <div className="admin-chat-empty admin-chat-empty--thread"><MessageSquareText /><b>No messages yet</b><p>This conversation summary is still loading or the visitor has not sent any messages.</p></div>}</div>
              <form onSubmit={event => send(chatId, event)}>
                <textarea rows="2" maxLength="1500" value={drafts[chatId] || ''} onChange={event => setDrafts(current => ({ ...current, [chatId]: event.target.value }))} placeholder="Type your reply..." disabled={chat.status === 'closed'} />
                <button className="button" disabled={busyById[chatId] || chat.status === 'closed' || !(drafts[chatId] || '').trim()}><Send /> {busyById[chatId] ? 'Sending...' : 'Send Reply'}</button>
              </form>
            </article>;
          })}
        </div> : <button type="button" className="button admin-chat-mobile-open-button" onClick={() => conversations[0] && openConversation(String(conversations[0].id))} disabled={!conversations.length}><MessageSquareText /> {conversations.length ? 'Open Chat' : 'No chats yet'}</button>}
      </section>}
    </>;
  }

  return <>
    <AdminHeading
      title="Live Chat Inbox"
      description="Reply to website visitors in real time. Open several conversations side by side. New messages refresh automatically."
      action={<div className="admin-chat-tools"><button type="button" className={`button button--secondary admin-sound-toggle ${soundEnabled ? 'is-on' : ''}`} onClick={() => setSoundEnabled(value => !value)}>{soundEnabled ? 'Sound On' : 'Sound Off'}</button><div className="admin-chat-unread">{unreadTotal > 0 ? <><MessageSquareText /> <span>{unreadTotal} unread</span></> : <><MessageSquareText /> <span>All caught up</span></>}</div></div>}
    />
    {toast && <div className="admin-chat-toast" role="status" aria-live="polite"><MessageSquareText /><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X /></button></div>}
    {error && <div className="admin-error" role="alert">{error}</div>}
    {loading ? <AdminLoading /> : <div className="admin-chat-layout"><aside className="admin-chat-list">{conversations.length ? conversations.map(item => { const chatId = String(item.id); const isActive = String(activeId) === chatId; const isOpen = openIds.includes(chatId); return <button type="button" className={`${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`.trim()} key={item.id} onClick={() => openConversation(chatId)}><div><b>{item.visitor_name}</b><span>{item.unread_admin > 0 ? item.unread_admin : isOpen ? 'Open' : 'Preview'}</span></div><p>{item.last_message}</p><small>#{item.public_id} · {new Date(item.last_message_at.replace(' ', 'T')).toLocaleString('en-IN')}</small></button>; }) : <div className="admin-chat-empty"><MessageSquareText /><b>No conversations yet</b><p>New website chats will appear here.</p></div>}</aside><section className="admin-chat-workspace"><div className="admin-chat-tabs">{openIds.length ? openIds.map(id => { const chat = chatsById[id] || conversations.find(item => String(item.id) === String(id)); return <div role="button" tabIndex={0} key={id} className={`admin-chat-tab ${String(activeId) === String(id) ? 'is-active' : ''}`} onClick={() => setActiveId(String(id))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveId(String(id)); } }}><span>{chat?.visitor_name || `Chat #${id}`}</span>{chat?.unread_admin > 0 && <b>{chat.unread_admin}</b>}<small>#{chat?.public_id || id}</small><button type="button" className="admin-chat-tab__close" aria-label={`Close ${chat?.visitor_name || `chat ${id}`}`} onClick={event => { event.stopPropagation(); closeConversation(id); }}><X /></button></div>; }) : <div className="admin-chat-tabs__empty">Open conversations from the list to compare chats side by side.</div>}</div>{openIds.length ? <div className={`admin-chat-workspace__grid ${openIds.length > 1 ? 'is-multi' : ''}`}>{openIds.map(id => { const chat = chatsById[id] || conversations.find(item => String(item.id) === String(id)); if (!chat) return <article className="admin-chat-thread-card" key={id}><div className="admin-chat-empty"><MessageSquareText /><b>Loading conversation...</b></div></article>; const messageItems = Array.isArray(chat.messages) ? chat.messages : []; return <article className={`admin-chat-thread-card ${String(activeId) === String(id) ? 'is-active' : ''}`} key={id}><header><div><h2>{chat.visitor_name}</h2><p>{chat.visitor_email || 'Email not provided'} · #{chat.public_id}</p></div><div className="admin-chat-thread-card__actions"><button type="button" className={`admin-chat-status is-${chat.status}`} onClick={() => changeStatus(id, chat.status === 'open' ? 'closed' : 'open')}>{chat.status === 'open' ? 'Close conversation' : 'Reopen conversation'}</button><button type="button" className="admin-chat-close" aria-label={`Close ${chat.visitor_name}`} onClick={() => closeConversation(id)}><X /></button></div></header><div className="admin-chat-messages">{messageItems.length ? messageItems.map(item => <article className={`is-${item.sender}`} key={item.id}><b>{item.sender === 'visitor' ? chat.visitor_name : 'SiteArvo'}</b><p>{item.message}</p><time>{new Date(item.created_at.replace(' ', 'T')).toLocaleString('en-IN')}</time></article>) : <div className="admin-chat-empty admin-chat-empty--thread"><MessageSquareText /><b>No messages yet</b><p>This conversation summary is still loading or the visitor has not sent any messages.</p></div>}</div><form onSubmit={event => send(id, event)}><textarea rows="2" maxLength="1500" value={drafts[id] || ''} onChange={event => setDrafts(current => ({ ...current, [id]: event.target.value }))} placeholder="Type your reply..." disabled={chat.status === 'closed'} /><button className="button" disabled={busyById[id] || chat.status === 'closed' || !(drafts[id] || '').trim()}><Send /> {busyById[id] ? 'Sending...' : 'Send Reply'}</button></form></article>; })}</div> : <div className="admin-chat-empty admin-chat-empty--workspace"><MessageSquareText /><b>Select a conversation</b><p>Pick one or more chats from the left list to keep multiple conversations open at once.</p></div>}</section></div>}
  </>;
}

function AdminSettings() {
  const { data, loading } = useAdminData('/admin/settings');
  const [form, setForm] = useState({});
  const { setNotice } = useContext(AdminContext);
  useEffect(() => { if (!loading) setForm(data); }, [loading, data]);
  const save = async event => { event.preventDefault(); await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(form) }); setNotice('Settings updated.'); };
  if (loading) return <AdminLoading />;
  return <><AdminHeading title="System Settings" description="Business, tax, analytics and order controls used across the site." /><form className="admin-panel admin-settings-form" onSubmit={save}><Field label="What counts as a page?"><textarea rows="4" value={form.page_explanation || ''} onChange={e => setForm({ ...form, page_explanation: e.target.value })} /></Field><div className="admin-form-grid"><Field label="Currency"><input value={form.currency || 'INR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></Field><Field label="Notify Email"><input type="email" value={form.notify_email || ''} onChange={e => setForm({ ...form, notify_email: e.target.value })} /></Field><Field label="Tax Name"><input value={form.tax_name || ''} onChange={e => setForm({ ...form, tax_name: e.target.value })} /></Field><Field label="Tax Percentage"><input type="number" value={form.tax_percentage || ''} onChange={e => setForm({ ...form, tax_percentage: e.target.value })} /></Field><Field label="Business Tax ID"><input value={form.business_tax_id || ''} onChange={e => setForm({ ...form, business_tax_id: e.target.value })} /></Field><Field label="Invoice Notes"><textarea rows="3" value={form.invoice_notes || ''} onChange={e => setForm({ ...form, invoice_notes: e.target.value })} /></Field></div><div className="admin-checks"><CheckField label="Accept new orders" checked={form.orders_enabled !== '0' && form.orders_enabled !== false} onChange={orders_enabled => setForm({ ...form, orders_enabled })} /><CheckField label="Tax enabled" checked={form.tax_enabled === '1' || form.tax_enabled === true} onChange={tax_enabled => setForm({ ...form, tax_enabled })} /><CheckField label="Exclude admin traffic" checked={form.exclude_admin_traffic !== '0' && form.exclude_admin_traffic !== false} onChange={exclude_admin_traffic => setForm({ ...form, exclude_admin_traffic })} /><CheckField label="Filter bot traffic" checked={form.filter_bot_traffic !== '0' && form.filter_bot_traffic !== false} onChange={filter_bot_traffic => setForm({ ...form, filter_bot_traffic })} /></div><button className="button"><Save /> Save Settings</button></form></>;
}

const configuratorSelectionTypes = ['single', 'multiple', 'quantity'];
const configuratorPriceTypes = ['one_time', 'per_page', 'per_item', 'monthly', 'yearly', 'included', 'custom_quote'];
const configuratorBillingPeriods = ['one-time', 'monthly', 'yearly'];

function createConfiguratorGroup(overrides = {}) {
  return {
    id: overrides.id || `group-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    name: overrides.name || 'New Group',
    slug: overrides.slug || `new-group-${Date.now()}`,
    description: overrides.description || '',
    selection_type: configuratorSelectionTypes.includes(overrides.selection_type) ? overrides.selection_type : 'single',
    display_order: Number(overrides.display_order || 0),
    active: overrides.active !== false,
    required: Boolean(overrides.required),
    options: Array.isArray(overrides.options) ? overrides.options : [],
  };
}

function createConfiguratorOption(overrides = {}) {
  return {
    id: overrides.id || `option-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    name: overrides.name || 'New Option',
    description: overrides.description || '',
    icon: overrides.icon || 'code',
    price: overrides.price ?? 0,
    price_type: configuratorPriceTypes.includes(overrides.price_type) ? overrides.price_type : 'one_time',
    billing_period: configuratorBillingPeriods.includes(overrides.billing_period) ? overrides.billing_period : 'one-time',
    display_order: Number(overrides.display_order || 0),
    featured: Boolean(overrides.featured),
    active: overrides.active !== false,
    page_delta: Number(overrides.page_delta || 0),
    applicable_category_slugs: Array.isArray(overrides.applicable_category_slugs) ? overrides.applicable_category_slugs : [],
    applicable_package_slugs: Array.isArray(overrides.applicable_package_slugs) ? overrides.applicable_package_slugs : [],
    compatible_technologies: Array.isArray(overrides.compatible_technologies) ? overrides.compatible_technologies : [],
  };
}

function parseConfiguratorList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function AdminConfigurator() {
  const { data, loading, load } = useAdminData('/admin/configurator');
  const { setNotice } = useContext(AdminContext);
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setGroups(normalizeConfiguratorGroups(data?.groups || defaultConfiguratorGroups));
  }, [loading, data]);

  const updateGroup = (groupId, patch) => setGroups(current => current.map(group => String(group.id) === String(groupId) ? { ...group, ...patch } : group));
  const updateOption = (groupId, optionId, patch) => setGroups(current => current.map(group => String(group.id) === String(groupId) ? { ...group, options: group.options.map(option => String(option.id) === String(optionId) ? { ...option, ...patch } : option) } : group));
  const addGroup = () => setGroups(current => [...current, createConfiguratorGroup({ display_order: current.length + 1 })]);
  const duplicateGroup = group => setGroups(current => [...current, createConfiguratorGroup({ ...group, id: undefined, slug: `${group.slug}-copy`, name: `${group.name} Copy`, options: (group.options || []).map((option, index) => createConfiguratorOption({ ...option, id: undefined, name: `${option.name} Copy`, display_order: index + 1 })) })]);
  const removeGroup = groupId => setGroups(current => current.filter(group => String(group.id) !== String(groupId)));
  const addOption = groupId => setGroups(current => current.map(group => String(group.id) === String(groupId) ? { ...group, options: [...group.options, createConfiguratorOption({ display_order: group.options.length + 1 })] } : group));
  const removeOption = (groupId, optionId) => setGroups(current => current.map(group => String(group.id) === String(groupId) ? { ...group, options: group.options.filter(option => String(option.id) !== String(optionId)) } : group));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/configurator', { method: 'PUT', body: JSON.stringify({ groups }) });
      setNotice('Configurator saved.');
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading && !groups.length) return <AdminLoading />;

  const preview = calculateConfiguratorSummary(groups, {});

  return <>
    <AdminHeading
      title="Website Configurator"
      description="Manage page packages, technologies, services and recurring options without editing code."
      action={<button className="button" onClick={addGroup}><Plus /> Add Group</button>}
    />
    <div className="admin-configurator-layout">
      <div className="admin-configurator-list">
        {groups.map(group => (
          <article key={group.id} className="admin-configurator-group">
            <header>
              <div>
                <span>{group.selection_type}</span>
                <h2><input value={group.name || ''} onChange={e => updateGroup(group.id, { name: e.target.value })} placeholder="Group name" /></h2>
              </div>
              <div className="admin-configurator-group-actions">
                <button type="button" onClick={() => duplicateGroup(group)}><Copy /> Duplicate</button>
                <button type="button" onClick={() => removeGroup(group.id)}><Trash2 /> Remove</button>
              </div>
            </header>
            <div className="admin-form-grid admin-configurator-meta">
              <Field label="Slug"><input value={group.slug || ''} onChange={e => updateGroup(group.id, { slug: e.target.value })} /></Field>
              <Field label="Selection Type"><select value={group.selection_type || 'single'} onChange={e => updateGroup(group.id, { selection_type: e.target.value })}>{configuratorSelectionTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
              <Field label="Display Order"><input type="number" value={group.display_order ?? 0} onChange={e => updateGroup(group.id, { display_order: Number(e.target.value) })} /></Field>
              <Field label="Description"><input value={group.description || ''} onChange={e => updateGroup(group.id, { description: e.target.value })} /></Field>
            </div>
            <div className="admin-checks">
              <CheckField label="Active" checked={group.active !== false} onChange={active => updateGroup(group.id, { active })} />
              <CheckField label="Required" checked={group.required} onChange={required => updateGroup(group.id, { required })} />
            </div>
            <div className="admin-configurator-options">
              <div className="admin-configurator-options__header">
                <b>Options</b>
                <button type="button" className="button button--secondary" onClick={() => addOption(group.id)}><Plus /> Add Option</button>
              </div>
              {group.options.map(option => (
                <article key={option.id} className="admin-configurator-option">
                  <div className="admin-form-grid admin-configurator-option__grid">
                    <Field label="Name"><input value={option.name || ''} onChange={e => updateOption(group.id, option.id, { name: e.target.value })} /></Field>
                    <Field label="Icon"><input value={option.icon || ''} onChange={e => updateOption(group.id, option.id, { icon: e.target.value })} placeholder="code" /></Field>
                    <Field label="Price"><input type="number" value={option.price ?? ''} onChange={e => updateOption(group.id, option.id, { price: e.target.value })} /></Field>
                    <Field label="Price Type"><select value={option.price_type || 'one_time'} onChange={e => updateOption(group.id, option.id, { price_type: e.target.value })}>{configuratorPriceTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                    <Field label="Billing Period"><select value={option.billing_period || 'one-time'} onChange={e => updateOption(group.id, option.id, { billing_period: e.target.value })}>{configuratorBillingPeriods.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                    <Field label="Display Order"><input type="number" value={option.display_order ?? 0} onChange={e => updateOption(group.id, option.id, { display_order: Number(e.target.value) })} /></Field>
                    <Field label="Page Delta"><input type="number" value={option.page_delta ?? 0} onChange={e => updateOption(group.id, option.id, { page_delta: Number(e.target.value) })} /></Field>
                    <Field label="Applicable Packages"><input value={(option.applicable_package_slugs || []).join(', ')} onChange={e => updateOption(group.id, option.id, { applicable_package_slugs: parseConfiguratorList(e.target.value) })} placeholder="5-page-website, 10-page-website" /></Field>
                    <Field label="Compatible Technologies"><input value={(option.compatible_technologies || []).join(', ')} onChange={e => updateOption(group.id, option.id, { compatible_technologies: parseConfiguratorList(e.target.value) })} placeholder="React, WordPress" /></Field>
                  </div>
                  <Field label="Description"><textarea rows="2" value={option.description || ''} onChange={e => updateOption(group.id, option.id, { description: e.target.value })} /></Field>
                  <div className="admin-checks">
                    <CheckField label="Featured" checked={option.featured} onChange={featured => updateOption(group.id, option.id, { featured })} />
                    <CheckField label="Active" checked={option.active !== false} onChange={active => updateOption(group.id, option.id, { active })} />
                  </div>
                  <div className="admin-configurator-option__footer">
                    <span>{option.price_type === 'custom_quote' ? 'Custom Quote' : `${formatConfiguratorMoney(option.price || 0)}${option.billing_period && option.billing_period !== 'one-time' ? ` / ${option.billing_period}` : ''}`}</span>
                    <button type="button" onClick={() => removeOption(group.id, option.id)}><Trash2 /> Remove Option</button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>
      <aside className="admin-configurator-preview">
        <AdminPanel title="Preview">
          <span>Estimated one-time total</span>
          <strong>{formatConfiguratorMoney(preview.oneTimeTotal)}</strong>
          <span>Recurring</span>
          <strong>{preview.recurringTotal ? `${formatConfiguratorMoney(preview.recurringTotal)}${preview.recurringMonthly ? '/month' : '/year'}` : '—'}</strong>
          <span>Total pages</span>
          <strong>{preview.totalPages || '—'}</strong>
          <p>Preview uses the live configurator pricing data you save here.</p>
        </AdminPanel>
      </aside>
    </div>
    <div className="admin-configurator-savebar">
      <button className="button" onClick={save} disabled={saving}><Save /> {saving ? 'Saving...' : 'Save Configurator'}</button>
    </div>
  </>;
}

function AdminPanel({ title, children }) {
  return <section className="admin-panel admin-configurator-preview-card"><h2>{title}</h2>{children}</section>;
}

function AdminHeading({ title, description, action }) { return <div className="admin-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function AdminLoading() { return <div className="admin-loading">Loading stored data...</div>; }
function Status({ active }) { return <span className={`admin-status ${active ? 'is-active' : ''}`}>{active ? 'Active' : 'Inactive'}</span>; }
function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label>; }
function IconField({ value, onChange }) { return <Field label="Icon"><select value={value || 'code'} onChange={e => onChange(e.target.value)}>{iconChoices.map(choice => <option key={choice.key} value={choice.key}>{choice.label}</option>)}</select></Field>; }
function CheckField({ label, checked, onChange }) { return <label className="admin-checkbox"><input type="checkbox" checked={Boolean(checked)} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label>; }
function AdminTable({ headers, children }) { return <div className="admin-table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function AdminEditor({ title, onSubmit, onCancel, children }) { const submit = event => { event.preventDefault(); onSubmit(); }; return <form className="admin-editor" onSubmit={submit}><header><h2>{title}</h2><button type="button" onClick={onCancel} aria-label="Close editor"><X /></button></header>{children}<footer><button type="button" className="button button--secondary" onClick={onCancel}>Cancel</button><button className="button"><Save /> Save</button></footer></form>; }

function normalizeCrudInitial(field, value) {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'json') {
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? (field.multiple ? [] : {}), null, 2);
  }
  if (field.type === 'number' || field.type === 'money') return value ?? '';
  return value ?? '';
}

function parseCrudValue(field, value) {
  if (field.type === 'number' || field.type === 'money') return value === '' ? '' : Number(value);
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'json') {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return field.multiple ? value.split('\n').map(item => item.trim()).filter(Boolean) : []; }
  }
  return value;
}

function CrudField({ field, value, onChange }) {
  if (field.type === 'checkbox') {
    return <label className="admin-checkbox"><input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} /><span>{field.label}</span></label>;
  }
  if (field.type === 'select') {
    return <Field label={field.label}><select value={value ?? ''} onChange={e => onChange(e.target.value)}>{(field.options || []).map(option => <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>{typeof option === 'string' ? option : option.label}</option>)}</select></Field>;
  }
  if (field.type === 'textarea' || field.type === 'json') {
    return <Field label={field.label}><textarea rows={field.rows || 3} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} /></Field>;
  }
  return <Field label={field.label}><input type={field.type || 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} /></Field>;
}

function AdminCrudPage({
  title,
  description,
  endpoint,
  columns,
  fields,
  defaultRecord = {},
  createLabel = 'Add Item',
  searchKeys = [],
  rowActions,
  beforeSave,
  afterSave,
  detailFormatter,
  allowCreate = true,
  allowDelete = true,
  mobileRender,
  mobileIcon,
  mobileColor = 'gold',
}) {
  const { data, loading, load } = useAdminData(endpoint);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const { setNotice } = useContext(AdminContext);
  const isMobile = useAdminViewport();
  const search = safe => String(safe || '').toLowerCase();
  const filtered = (data || []).filter(item => {
    if (!query.trim()) return true;
    const tokens = searchKeys.length ? searchKeys : columns.map(column => column.key).filter(Boolean);
    return tokens.some(key => search(item[key]).includes(search(query)));
  });
  const save = async form => {
    const payload = { ...form };
    for (const field of fields) {
      payload[field.name] = parseCrudValue(field, payload[field.name]);
    }
    const body = beforeSave ? beforeSave(payload, editing) || payload : payload;
    await apiFetch(editing?.id ? `${endpoint}/${editing.id}` : endpoint, {
      method: editing?.id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    if (afterSave) await afterSave(body, editing);
    setNotice(`${title} ${editing?.id ? 'updated' : 'created'} successfully.`);
    setEditing(null);
    await load();
  };
  return (
    <>
      <AdminHeading
        title={title}
        description={description}
        action={allowCreate ? <button className="button" onClick={() => setEditing({ ...defaultRecord })}><Plus /> {createLabel}</button> : <button className="button button--secondary" onClick={() => load()}>Refresh</button>}
      />
      <div className="admin-panel admin-resource-toolbar">
        <label className="admin-field admin-field--inline">
          <span>Search</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
        </label>
      </div>
      {allowCreate && editing && (
        <AdminEditor title={editing.id ? `Edit ${title}` : `Add ${title}`} onSubmit={() => save(editing)} onCancel={() => setEditing(null)}>
          <div className="admin-form-grid">
            {fields.map(field => (
              <CrudField
                key={field.name}
                field={field}
                value={editing[field.name] === undefined ? normalizeCrudInitial(field, defaultRecord[field.name]) : normalizeCrudInitial(field, editing[field.name])}
                onChange={value => setEditing(current => ({ ...current, [field.name]: value }))}
              />
            ))}
          </div>
          {detailFormatter && detailFormatter(editing, setEditing)}
        </AdminEditor>
      )}
      {loading ? <AdminLoading /> : isMobile ? (
        <div className="admin-mobile-list admin-mobile-list--crud">
          {filtered.length ? filtered.map(item => mobileRender ? mobileRender(item, load, setNotice, setEditing) : (
            <article key={item.id} className="admin-mobile-card">
              <div className="admin-mobile-card__top">
                <ColoredIconBox icon={mobileIcon || FileText} color={mobileColor} size={17} />
                <div>
                  <b>{item[columns[0]?.key] || item.name || item.title || item.id}</b>
                  <span>{item[columns[1]?.key] || item.description || item.status || ''}</span>
                </div>
                <button type="button" className="admin-mobile-card__edit" onClick={() => setEditing({ ...item })}>Edit</button>
              </div>
              <div className="admin-mobile-card__meta">
                {columns.slice(0, 3).map(column => (
                  <div key={column.label}>
                    <span>{column.label}</span>
                    <strong>{column.render ? column.render(item) : item[column.key] || '—'}</strong>
                  </div>
                ))}
              </div>
              <div className="admin-mobile-card__actions">
                {rowActions && rowActions(item, load, setNotice)}
                {allowDelete && <button type="button" className="danger" onClick={async () => {
                  if (!window.confirm(`Delete ${item.name || item.title || item.id}?`)) return;
                  await apiFetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
                  await load();
                }}><Trash2 /> Delete</button>}
              </div>
            </article>
          )) : <div className="admin-empty-state">{allowCreate ? `No ${title.toLowerCase()} yet.` : 'No records found.'}</div>}
        </div>
      ) : filtered.length ? (
        <AdminTable headers={[...columns.map(column => column.label), 'Actions']}>
          {filtered.map(item => (
            <tr key={item.id}>
              {columns.map(column => (
                <td key={column.label}>{column.render ? column.render(item) : item[column.key]}</td>
              ))}
              <td>
                <button type="button" onClick={() => setEditing({ ...item })}>Edit</button>
                {rowActions && rowActions(item, load, setNotice)}
                {allowDelete && <button type="button" className="danger" onClick={async () => {
                  if (!window.confirm(`Delete ${item.name || item.title || item.id}?`)) return;
                  await apiFetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
                  await load();
                }}><Trash2 /> Delete</button>}
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <div className="admin-empty-state">
          <b>{allowCreate ? `No ${title.toLowerCase()} yet.` : 'No records found.'}</b>
          <p>{allowCreate ? 'Create the first record to start using this section.' : 'Try a different search or refresh the page.'}</p>
        </div>
      )}
    </>
  );
}

function AdminLeads() {
  return (
    <AdminCrudPage
      title="Leads"
      description="Manage enquiries, follow-ups, priorities and conversion status."
      endpoint="/admin/leads"
      createLabel="New Lead"
      mobileIcon={UserPlus}
      mobileColor="green"
      searchKeys={['lead_number', 'name', 'company', 'email', 'phone', 'interested_service', 'status', 'source']}
      defaultRecord={{ name: '', phone: '', email: '', company: '', country: 'India', interested_service: '', budget: '', message: '', source: 'Manual', assigned_to: '', status: 'New', priority: 'Medium', notes: '', next_follow_up_at: '' }}
      fields={[
        { name: 'name', label: 'Name' },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'company', label: 'Company' },
        { name: 'country', label: 'Country' },
        { name: 'interested_service', label: 'Interested Service' },
        { name: 'budget', label: 'Budget' },
        { name: 'source', label: 'Source', type: 'select', options: ['Website Contact Form', 'WhatsApp', 'Live Chat', 'Phone', 'Email', 'Portfolio', 'Service Page', 'Pricing Page', 'Manual'] },
        { name: 'assigned_to', label: 'Assigned To' },
        { name: 'status', label: 'Status', type: 'select', options: ['New', 'Contacted', 'Qualified', 'Quote Sent', 'Negotiation', 'Won', 'Lost'] },
        { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'] },
        { name: 'next_follow_up_at', label: 'Next Follow-up', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
        { name: 'message', label: 'Message', type: 'textarea', rows: 5 },
      ]}
      columns={[
        { key: 'lead_number', label: 'Lead ID' },
        { key: 'name', label: 'Name' },
        { key: 'interested_service', label: 'Service' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'source', label: 'Source' },
      ]}
      mobileRender={(lead, load, setNotice, setEditing) => (
        <article key={lead.id} className="admin-mobile-card">
          <div className="admin-mobile-card__top">
            <span className="admin-mobile-avatar">{String(lead.name || lead.company || 'L').slice(0, 1).toUpperCase()}</span>
            <div>
              <b>{lead.name || 'Lead'}</b>
              <span>{lead.email || lead.phone || lead.company || 'No contact details'}</span>
            </div>
            <span className={`admin-status-pill is-${getAdminStatusTone(lead.status)}`}>{lead.status || 'New'}</span>
          </div>
          <div className="admin-mobile-card__meta">
            <div><span>Service</span><strong>{lead.interested_service || '—'}</strong></div>
            <div><span>Phone</span><strong>{lead.phone || '—'}</strong></div>
            <div><span>Priority</span><strong>{lead.priority || '—'}</strong></div>
          </div>
          <div className="admin-mobile-card__actions">
            <button type="button" className="button button--secondary" onClick={() => setEditing({ ...lead })}>Edit</button>
            <button type="button" className="button" onClick={async () => { await apiFetch(`/admin/leads/${lead.id}/convert`, { method: 'POST', body: JSON.stringify({}) }); setNotice('Lead converted to customer.'); await load(); }}>Convert</button>
          </div>
        </article>
      )}
      rowActions={(lead, load, setNotice) => (
        <button type="button" onClick={async () => { await apiFetch(`/admin/leads/${lead.id}/convert`, { method: 'POST', body: JSON.stringify({}) }); setNotice('Lead converted to customer.'); await load(); }}>
          Convert
        </button>
      )}
    />
  );
}

function AdminCustomers() {
  return (
    <AdminCrudPage
      title="Customers"
      description="Store customer profiles, contacts and relationship history."
      endpoint="/admin/customers"
      createLabel="New Customer"
      mobileIcon={Users}
      mobileColor="blue"
      searchKeys={['customer_number', 'name', 'company', 'email', 'phone', 'country']}
      defaultRecord={{ name: '', company: '', phone: '', email: '', country: 'India', total_orders: 0, active_projects: 0, notes: '' }}
      fields={[
        { name: 'name', label: 'Name' },
        { name: 'company', label: 'Company' },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'country', label: 'Country' },
        { name: 'total_orders', label: 'Total Orders', type: 'number' },
        { name: 'active_projects', label: 'Active Projects', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
      ]}
      columns={[
        { key: 'customer_number', label: 'Customer ID' },
        { key: 'name', label: 'Name' },
        { key: 'company', label: 'Company' },
        { key: 'country', label: 'Country' },
        { key: 'total_orders', label: 'Orders' },
      ]}
    />
  );
}

function AdminQuotations() {
  return (
    <AdminCrudPage
      title="Quotations"
      description="Create quotes, update status and convert accepted quotations into orders."
      endpoint="/admin/quotations"
      createLabel="New Quote"
      mobileIcon={FileText}
      mobileColor="orange"
      searchKeys={['quotation_number', 'title', 'status', 'package_name']}
      defaultRecord={{ title: '', package_name: '', status: 'Draft', validity_date: '', notes: '', terms: '', line_items: '[]' }}
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'package_name', label: 'Package' },
        { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Converted'] },
        { name: 'validity_date', label: 'Validity Date', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
        { name: 'terms', label: 'Terms', type: 'textarea', rows: 4 },
        { name: 'line_items', label: 'Line Items (JSON)', type: 'json', rows: 8, placeholder: '[{"name":"7 Page Website","quantity":1,"unit_price":6999}]' },
      ]}
      columns={[
        { key: 'quotation_number', label: 'Quotation' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'final_total', label: 'Total', render: item => formatPrice(item.final_total || 0) },
      ]}
      mobileRender={(quote, load, setNotice, setEditing) => (
        <article key={quote.id} className="admin-mobile-card">
          <div className="admin-mobile-card__top">
            <ColoredIconBox icon={FileText} color="orange" size={17} />
            <div>
              <b>{quote.quotation_number || quote.title || 'Quotation'}</b>
              <span>{quote.title || quote.package_name || 'Quote details'}</span>
            </div>
            <span className={`admin-status-pill is-${getAdminStatusTone(quote.status)}`}>{quote.status || 'Draft'}</span>
          </div>
          <div className="admin-mobile-card__meta">
            <div><span>Package</span><strong>{quote.package_name || '—'}</strong></div>
            <div><span>Total</span><strong>{formatPrice(quote.final_total || 0)}</strong></div>
          </div>
          <div className="admin-mobile-card__actions">
            <button type="button" className="button button--secondary" onClick={() => setEditing({ ...quote })}>Edit</button>
            <button type="button" className="button" onClick={async () => { await apiFetch(`/admin/quotations/${quote.id}/convert`, { method: 'POST', body: JSON.stringify({}) }); setNotice('Quotation converted to order.'); await load(); }}>Convert</button>
          </div>
        </article>
      )}
      rowActions={(quote, load, setNotice) => (
        <>
          <button type="button" onClick={async () => { await apiFetch(`/admin/quotations/${quote.id}/send`, { method: 'POST', body: JSON.stringify({}) }); await load(); }}>Send</button>
          <button type="button" onClick={async () => { await apiFetch(`/admin/quotations/${quote.id}/convert`, { method: 'POST', body: JSON.stringify({}) }); setNotice('Quotation converted to order.'); await load(); }}>Convert</button>
        </>
      )}
    />
  );
}

function AdminCarts() {
  return (
    <AdminCrudPage
      title="Carts"
      description="Track active, started, converted and abandoned carts where available."
      endpoint="/admin/carts"
      createLabel="New Cart"
      mobileIcon={ShoppingCart}
      mobileColor="cyan"
      searchKeys={['cart_number', 'visitor_name', 'visitor_email', 'package_name', 'status']}
      defaultRecord={{ visitor_name: '', visitor_email: '', visitor_phone: '', package_name: '', status: 'Active', source_page: '', entry_page: '', notes: '' }}
      fields={[
        { name: 'visitor_name', label: 'Visitor Name' },
        { name: 'visitor_email', label: 'Visitor Email', type: 'email' },
        { name: 'visitor_phone', label: 'Visitor Phone' },
        { name: 'package_name', label: 'Package' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Checkout Started', 'Converted', 'Abandoned'] },
        { name: 'source_page', label: 'Source Page' },
        { name: 'entry_page', label: 'Entry Page' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'cart_number', label: 'Cart ID' },
        { key: 'visitor_name', label: 'Visitor' },
        { key: 'package_name', label: 'Package' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

function AdminAddons() {
  return (
    <AdminCrudPage
      title="Add-ons"
      description="Manage optional extras that can be attached to services and packages."
      endpoint="/admin/addons"
      createLabel="New Add-on"
      mobileIcon={Puzzle}
      mobileColor="pink"
      searchKeys={['name', 'description', 'pricing_type']}
      defaultRecord={{ name: '', description: '', price: '', pricing_type: 'fixed', pricing_unit: '', is_active: true, category_ids: '[]' }}
      fields={[
        { name: 'name', label: 'Name' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
        { name: 'price', label: 'Price', type: 'number' },
        { name: 'pricing_type', label: 'Pricing Type', type: 'select', options: ['fixed', 'per_page', 'per_item', 'monthly', 'yearly', 'custom_quote'] },
        { name: 'pricing_unit', label: 'Pricing Unit' },
        { name: 'category_ids', label: 'Category IDs (JSON)', type: 'json', rows: 4, placeholder: '[1,2,3]' },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'pricing_type', label: 'Pricing Type' },
        { key: 'pricing_unit', label: 'Unit' },
        { key: 'is_active', label: 'Active', render: item => (item.is_active ? 'Yes' : 'No') },
      ]}
    />
  );
}

function AdminPayments() {
  return (
    <AdminCrudPage
      title="Payments"
      description="Record received, pending, failed and refunded payments manually."
      endpoint="/admin/payments"
      createLabel="New Payment"
      mobileIcon={CreditCard}
      mobileColor="green"
      searchKeys={['payment_number', 'payment_method', 'transaction_reference', 'status']}
      defaultRecord={{ order_id: '', customer_id: '', amount: '', payment_method: 'UPI', transaction_reference: '', status: 'Pending', notes: '', proof: '', paid_at: '' }}
      fields={[
        { name: 'order_id', label: 'Order ID', type: 'number' },
        { name: 'customer_id', label: 'Customer ID', type: 'number' },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'payment_method', label: 'Method', type: 'select', options: ['UPI', 'Bank Transfer', 'Cash', 'Payment Gateway', 'Other'] },
        { name: 'transaction_reference', label: 'Transaction Reference' },
        { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Failed', 'Refunded'] },
        { name: 'paid_at', label: 'Payment Date', type: 'date' },
        { name: 'proof', label: 'Proof URL' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'payment_number', label: 'Payment ID' },
        { key: 'order_id', label: 'Order' },
        { key: 'amount', label: 'Amount', render: item => formatPrice(item.amount || 0) },
        { key: 'payment_method', label: 'Method' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

function AdminInvoices() {
  return (
    <AdminCrudPage
      title="Invoices"
      description="Generate invoices from orders and keep manual billing records organized."
      endpoint="/admin/invoices"
      createLabel="New Invoice"
      mobileIcon={ReceiptText}
      mobileColor="gold"
      searchKeys={['invoice_number', 'status', 'notes']}
      defaultRecord={{ order_id: '', customer_id: '', subtotal: 0, discount_total: 0, tax_total: 0, total: 0, amount_paid: 0, balance: 0, due_date: '', status: 'Draft', notes: '', items: '[]' }}
      fields={[
        { name: 'order_id', label: 'Order ID', type: 'number' },
        { name: 'customer_id', label: 'Customer ID', type: 'number' },
        { name: 'subtotal', label: 'Subtotal', type: 'number' },
        { name: 'discount_total', label: 'Discount', type: 'number' },
        { name: 'tax_total', label: 'Tax', type: 'number' },
        { name: 'total', label: 'Total', type: 'number' },
        { name: 'amount_paid', label: 'Amount Paid', type: 'number' },
        { name: 'balance', label: 'Balance', type: 'number' },
        { name: 'due_date', label: 'Due Date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
        { name: 'items', label: 'Items (JSON)', type: 'json', rows: 8, placeholder: '[{"name":"Website Design","quantity":1,"unit_price":4999}]' },
      ]}
      columns={[
        { key: 'invoice_number', label: 'Invoice ID' },
        { key: 'order_id', label: 'Order' },
        { key: 'status', label: 'Status' },
        { key: 'total', label: 'Total', render: item => formatPrice(item.total || 0) },
      ]}
    />
  );
}

function AdminFinanceOverview() {
  const isMobile = useAdminViewport();
  const [range, setRange] = useState('this_week');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, load } = useAdminQueryData('/admin/finance', { range, start, end, search });
  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminLoadError message={error} onRetry={load} />;
  const alerts = data.alerts || {};
  const transactions = data.transactions?.items?.items || [];
  if (isMobile) {
    return <>
      <AdminHeading
        title="Finance"
        description="Overview of income, expenses and payments."
        action={<Link className="button" to="/admin/finance/reports"><BarChart3 /> Reports</Link>}
      />
      <FinanceToolbar range={range} setRange={setRange} start={start} setStart={setStart} end={end} setEnd={setEnd} search={search} setSearch={setSearch}>
        <Link className="button button--secondary" to="/admin/finance/income">Income</Link>
        <Link className="button button--secondary" to="/admin/finance/expenses">Expenses</Link>
        <Link className="button button--secondary" to="/admin/finance/accounts">Accounts</Link>
      </FinanceToolbar>
      <div className="admin-mobile-section">
        <div className="admin-mobile-section__head">
          <div><h2>Finance Snapshot</h2><p>{formatFinanceRangeLabel(data.date_range)}</p></div>
        </div>
        <div className="admin-mobile-metrics">
          <article className="admin-mobile-metric-card"><span>Total Income</span><strong>{formatMoney(data.total_income, data.currency)}</strong></article>
          <article className="admin-mobile-metric-card"><span>Total Expenses</span><strong>{formatMoney(data.total_expenses, data.currency)}</strong></article>
          <article className="admin-mobile-metric-card"><span>Net Profit</span><strong>{formatMoney(data.net_profit, data.currency)}</strong></article>
          <article className="admin-mobile-metric-card"><span>Entries</span><strong>{data.filtered_transactions || 0}</strong></article>
        </div>
      </div>
      <div className="admin-mobile-section">
        <div className="admin-mobile-section__head">
          <div><h2>Income vs Expenses</h2><p>A clean graph of your recent finance movement.</p></div>
        </div>
        <FinanceLineGraph
          title=""
          subtitle=""
          series={[
            { name: 'Income', color: 'green', items: data.daily_income_vs_expense?.income || [] },
            { name: 'Expenses', color: 'gold', items: data.daily_income_vs_expense?.expense || [] },
          ]}
          showPointValues={false}
          showAxisLabels="ends"
        />
      </div>
      <FinanceSummaryCards data={data} />
      <div className="admin-mobile-section">
        <div className="admin-mobile-section__head"><div><h2>Alerts</h2><p>Finance items needing attention</p></div></div>
        <div className="admin-mobile-list">
          <article className="admin-mobile-list__item"><div><b>Overdue Invoices</b><span>{alerts.overdue_invoices || 0}</span></div></article>
          <article className="admin-mobile-list__item"><div><b>Payments Due This Week</b><span>{alerts.dues_this_week || 0}</span></div></article>
          <article className="admin-mobile-list__item"><div><b>Outstanding Receivable</b><span>{formatMoney(alerts.receivable_outstanding || 0)}</span></div></article>
          <article className="admin-mobile-list__item"><div><b>Payable This Week</b><span>{formatMoney(alerts.payable_this_week || 0)}</span></div></article>
          <article className="admin-mobile-list__item"><div><b>Budget Near Limit</b><span>{alerts.budget_alerts || 0}</span></div></article>
        </div>
      </div>
      <div className="admin-mobile-section">
        <div className="admin-mobile-section__head">
          <div><h2>Latest financial activity</h2><p>Recent ledger entries</p></div>
          <Link className="text-link" to="/admin/finance/transactions">Open transactions <ArrowLeftRight size={16} /></Link>
        </div>
        <div className="admin-mobile-list">
          {transactions.length ? transactions.map(item => <article key={item.id} className="admin-mobile-list__item"><div><b>{item.transaction_number} · {item.type}</b><span>{item.description} · {formatMoney(item.credit || item.debit || 0)}</span></div></article>) : <article className="admin-mobile-list__item"><div><b>No financial transactions found</b><span>Try another date range.</span></div></article>}
        </div>
      </div>
    </>;
  }
  return <>
    <AdminHeading
      title="Finance Overview"
      description="Real collected income, expenses, balances and outstanding amounts based on stored transactions."
      action={<Link className="button" to="/admin/finance/reports"><BarChart3 /> Reports</Link>}
    />
    <FinanceToolbar range={range} setRange={setRange} start={start} setStart={setStart} end={end} setEnd={setEnd} search={search} setSearch={setSearch}>
      <Link className="button button--secondary" to="/admin/finance/income">Income</Link>
      <Link className="button button--secondary" to="/admin/finance/expenses">Expenses</Link>
      <Link className="button button--secondary" to="/admin/finance/accounts">Accounts</Link>
    </FinanceToolbar>
    <div className="finance-overview-shell">
      <div className="finance-overview-shell__top">
        <span className="finance-date-pill">{formatFinanceRangeLabel(data.date_range)}</span>
        <span className="finance-sync-pill">Updated just now</span>
      </div>
      <div className="finance-overview-shell__kpis">
        <article><span>Total Income</span><strong>{formatMoney(data.total_income, data.currency)}</strong></article>
        <article><span>Total Expenses</span><strong>{formatMoney(data.total_expenses, data.currency)}</strong></article>
        <article><span>Net Profit</span><strong>{formatMoney(data.net_profit, data.currency)}</strong></article>
        <article><span>Visits / Entries</span><strong>{data.filtered_transactions || 0}</strong></article>
      </div>
      <FinanceLineGraph
        title="Income vs Expenses"
        subtitle="A clean graph of your recent finance movement."
        series={[
          { name: 'Income', color: 'green', items: data.daily_income_vs_expense?.income || [] },
          { name: 'Expenses', color: 'gold', items: data.daily_income_vs_expense?.expense || [] },
        ]}
        showPointValues={false}
        showAxisLabels="ends"
      />
    </div>
    <FinanceSummaryCards data={data} />
    <div className="finance-alert-grid">
      <article><span>Overdue Invoices</span><strong>{alerts.overdue_invoices || 0}</strong></article>
      <article><span>Payments Due This Week</span><strong>{alerts.dues_this_week || 0}</strong></article>
      <article><span>Outstanding Receivable</span><strong>{formatMoney(alerts.receivable_outstanding || 0)}</strong></article>
      <article><span>Payable This Week</span><strong>{formatMoney(alerts.payable_this_week || 0)}</strong></article>
      <article><span>Budget Near Limit</span><strong>{alerts.budget_alerts || 0}</strong></article>
    </div>
    <div className="admin-panel">
      <div className="admin-panel__topline">
        <div>
          <span className="eyebrow">Recent Ledger</span>
          <h2>Latest financial activity</h2>
        </div>
        <Link className="text-link" to="/admin/finance/transactions">Open transactions <ArrowLeftRight size={16} /></Link>
      </div>
      <div className="admin-mini-list">
        {transactions.length ? transactions.map(item => (
          <div key={item.id}>
            <b>{item.transaction_number} · {item.type}</b>
            <span>{item.description} · {formatMoney(item.credit || item.debit || 0)}</span>
          </div>
        )) : <p>No financial transactions found in this range.</p>}
      </div>
    </div>
  </>;
}

function AdminFinanceIncome() {
  return (
    <FinanceCrudPage
      title="Income"
      description="Track real income from customer payments, invoice payments, project payments and manual entries."
      endpoint="/admin/finance/income"
      createLabel="Add Income"
      responseTitle="Income entry"
      filters={{ search: true, range: true, account: true, status: true, category: true }}
      allowDelete={false}
      defaultRecord={{ date: new Date().toISOString().slice(0, 10), customer_id: '', order_id: '', invoice_id: '', project_id: '', category: 'Website Development', description: '', payment_method: 'UPI', amount: '', transaction_reference: '', account_id: '', notes: '', created_by: 'SiteArvo Admin', status: 'Completed' }}
      fields={[
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'customer_id', label: 'Customer ID', type: 'number' },
        { name: 'order_id', label: 'Order ID', type: 'number' },
        { name: 'invoice_id', label: 'Invoice ID', type: 'number' },
        { name: 'project_id', label: 'Project ID', type: 'number' },
        { name: 'category', label: 'Income Category' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { name: 'payment_method', label: 'Payment Method', type: 'select', options: ['UPI', 'Bank Transfer', 'Cash', 'Payment Gateway', 'Other'] },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'transaction_reference', label: 'Transaction Reference' },
        { name: 'account_id', label: 'Account ID', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Completed', 'Voided'] },
        { name: 'created_by', label: 'Created By' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'income_number', label: 'Income ID' },
        { key: 'date', label: 'Date' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', render: item => formatMoney(item.amount || 0) },
        { key: 'status', label: 'Status' },
      ]}
      rowDisabled={item => item.is_system_generated}
      rowActions={(item, load, setNotice) => item.is_system_generated ? <span className="finance-pill">Auto</span> : <button type="button" onClick={async () => { await apiFetch(`/admin/finance/income/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, status: 'Voided' }) }); setNotice('Income voided.'); await load(); }}>Void</button>}
      afterTable={<FinanceCategoryManager title="Income Categories" endpoint="/admin/finance/income-categories" kind="income" />}
    />
  );
}

function AdminFinanceExpenses() {
  return (
    <FinanceCrudPage
      title="Expenses"
      description="Record business expenses, taxes, subscriptions, freelancer bills and vendor payments."
      endpoint="/admin/finance/expenses"
      createLabel="Add Expense"
      responseTitle="Expense"
      filters={{ search: true, range: true, account: true, status: true, category: true, vendor: true }}
      allowDelete={false}
      defaultRecord={{ date: new Date().toISOString().slice(0, 10), vendor_id: '', expense_category: 'Miscellaneous', description: '', amount: '', tax_amount: '', payment_method: 'Bank Transfer', account_id: '', reference_number: '', attachment: '', project_id: '', notes: '', status: 'Pending', created_by: 'SiteArvo Admin' }}
      fields={[
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'vendor_id', label: 'Vendor ID', type: 'number' },
        { name: 'expense_category', label: 'Expense Category' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'tax_amount', label: 'Tax Amount', type: 'number' },
        { name: 'payment_method', label: 'Payment Method', type: 'select', options: ['UPI', 'Bank Transfer', 'Cash', 'Payment Gateway', 'Other'] },
        { name: 'account_id', label: 'Paid From Account', type: 'number' },
        { name: 'reference_number', label: 'Reference Number' },
        { name: 'attachment', label: 'Attachment URL' },
        { name: 'project_id', label: 'Project ID', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Pending', 'Paid', 'Cancelled'] },
        { name: 'created_by', label: 'Created By' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'expense_number', label: 'Expense ID' },
        { key: 'date', label: 'Date' },
        { key: 'expense_category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', render: item => formatMoney(item.amount || 0) },
        { key: 'status', label: 'Status' },
      ]}
      rowActions={(item, load, setNotice) => item.status === 'Paid' ? <span className="finance-pill">Recorded</span> : <button type="button" onClick={async () => { await apiFetch(`/admin/finance/expenses/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, status: 'Paid' }) }); setNotice('Expense marked paid.'); await load(); }}>Mark Paid</button>}
      afterTable={<FinanceCategoryManager title="Expense Categories" endpoint="/admin/finance/expense-categories" kind="expense" />}
    />
  );
}

function AdminFinanceAccounts() {
  return (
    <FinanceCrudPage
      title="Accounts"
      description="Manage cash, bank, UPI and payment accounts used by the finance ledger."
      endpoint="/admin/finance/accounts"
      createLabel="Add Account"
      responseTitle="Account"
      filters={{ search: true, range: false, account: false, status: false, category: false, vendor: false }}
      allowDelete={false}
      defaultRecord={{ account_name: '', account_type: 'Cash', opening_balance: 0, currency: 'INR', active: true, notes: '' }}
      fields={[
        { name: 'account_name', label: 'Account Name' },
        { name: 'account_type', label: 'Account Type', type: 'select', options: ['Cash', 'Bank Account', 'UPI', 'Payment Gateway', 'Petty Cash', 'Other'] },
        { name: 'opening_balance', label: 'Opening Balance', type: 'number' },
        { name: 'currency', label: 'Currency' },
        { name: 'active', label: 'Active', type: 'checkbox' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'account_number', label: 'Account ID' },
        { key: 'account_name', label: 'Account Name' },
        { key: 'account_type', label: 'Type' },
        { key: 'current_balance', label: 'Current Balance', render: item => formatMoney(item.current_balance || 0, item.currency || 'INR') },
        { key: 'active', label: 'Active', render: item => (item.active ? 'Yes' : 'No') },
      ]}
      rowActions={(item, load, setNotice) => <button type="button" onClick={async () => { await apiFetch(`/admin/finance/accounts/${item.id}`, { method: 'DELETE' }); setNotice('Account disabled.'); await load(); }}>Disable</button>}
    />
  );
}

function AdminFinanceVendors() {
  return (
    <FinanceCrudPage
      title="Vendors"
      description="Store vendor contact details and review outstanding payables."
      endpoint="/admin/finance/vendors"
      createLabel="Add Vendor"
      responseTitle="Vendor"
      filters={{ search: true, range: false, account: false, status: true, category: false, vendor: false }}
      allowDelete={false}
      defaultRecord={{ vendor_name: '', contact_person: '', phone: '', email: '', address: '', tax_id: '', notes: '', active: true }}
      fields={[
        { name: 'vendor_name', label: 'Vendor Name' },
        { name: 'contact_person', label: 'Contact Person' },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', type: 'textarea', rows: 3 },
        { name: 'tax_id', label: 'Tax ID' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'vendor_number', label: 'Vendor ID' },
        { key: 'vendor_name', label: 'Vendor Name' },
        { key: 'contact_person', label: 'Contact Person' },
        { key: 'expenses', label: 'Expenses' },
        { key: 'outstanding_payables', label: 'Outstanding', render: item => formatMoney(item.outstanding_payables || 0) },
      ]}
      rowActions={(item, load, setNotice) => <button type="button" onClick={async () => { await apiFetch(`/admin/finance/vendors/${item.id}`, { method: 'DELETE' }); setNotice('Vendor archived.'); await load(); }}>Archive</button>}
    />
  );
}

function AdminFinanceRefunds() {
  return (
    <FinanceCrudPage
      title="Refunds"
      description="Track payment refunds and keep the income ledger aligned with actual money outflows."
      endpoint="/admin/finance/refunds"
      createLabel="Add Refund"
      responseTitle="Refund"
      filters={{ search: true, range: true, account: false, status: true, category: false, vendor: false }}
      defaultRecord={{ original_payment_id: '', customer_id: '', amount: '', reason: '', date: new Date().toISOString().slice(0, 10), account_id: '', transaction_reference: '', status: 'Pending', notes: '' }}
      fields={[
        { name: 'original_payment_id', label: 'Original Payment ID', type: 'number' },
        { name: 'customer_id', label: 'Customer ID', type: 'number' },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'reason', label: 'Reason', type: 'textarea', rows: 3 },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'account_id', label: 'Account ID', type: 'number' },
        { name: 'transaction_reference', label: 'Transaction Reference' },
        { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Completed', 'Failed', 'Cancelled'] },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'refund_number', label: 'Refund ID' },
        { key: 'date', label: 'Date' },
        { key: 'amount', label: 'Amount', render: item => formatMoney(item.amount || 0) },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

function AdminFinanceBudgets() {
  return (
    <FinanceCrudPage
      title="Budgets"
      description="Track monthly category budgets and highlight when spending nears the limit."
      endpoint="/admin/finance/budgets"
      createLabel="Add Budget"
      responseTitle="Budget"
      filters={{ search: true, range: false, account: false, status: false, category: true, vendor: false }}
      defaultRecord={{ category: 'Advertising', month: new Date().toISOString().slice(0, 7), amount: '', spent: '', notes: '', active: true }}
      fields={[
        { name: 'category', label: 'Category' },
        { name: 'month', label: 'Month', type: 'month' },
        { name: 'amount', label: 'Budget Amount', type: 'number' },
        { name: 'spent', label: 'Spent', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'budget_number', label: 'Budget ID' },
        { key: 'category', label: 'Category' },
        { key: 'month', label: 'Month' },
        { key: 'amount', label: 'Budget', render: item => formatMoney(item.amount || 0) },
        { key: 'spent', label: 'Spent', render: item => formatMoney(item.spent || 0) },
      ]}
      rowActions={(item, load, setNotice) => <button type="button" onClick={async () => { await apiFetch(`/admin/finance/budgets/${item.id}`, { method: 'DELETE' }); setNotice('Budget disabled.'); await load(); }}>Disable</button>}
    />
  );
}

function AdminFinanceReceivables() {
  const [range, setRange] = useState('this_month');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, load } = useAdminQueryData('/admin/finance/receivables', { range, search, status, page, per_page: 50 });
  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminLoadError message={error} onRetry={load} />;
  const items = data.items?.items || [];
  return <>
    <AdminHeading title="Receivables" description="Money customers still owe SiteArvo, based on stored invoices and payments." />
    <FinanceToolbar range={range} setRange={setRange} search={search} setSearch={setSearch} status={status} setStatus={setStatus} />
    <div className="admin-panel">
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Invoice</th><th>Order</th><th>Total</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>{items.map(item => <tr key={`${item.invoice_id}-${item.customer_id}`}><td>{item.customer_name}</td><td>{item.invoice_id}</td><td>{item.order_id}</td><td>{formatMoney(item.total_amount)}</td><td>{formatMoney(item.amount_paid)}</td><td>{formatMoney(item.balance_due)}</td><td>{item.due_date || '—'}</td><td>{item.status}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="finance-pagination">
        <button type="button" className="button button--secondary" disabled={(data.items.page || 1) <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
        <span>Page {data.items.page || 1} of {data.items.total_pages || 1}</span>
        <button type="button" className="button button--secondary" disabled={(data.items.page || 1) >= (data.items.total_pages || 1)} onClick={() => setPage(current => current + 1)}>Next</button>
      </div>
    </div>
  </>;
}

function AdminFinancePayables() {
  const [range, setRange] = useState('this_month');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, load } = useAdminQueryData('/admin/finance/payables', { range, search, status, page, per_page: 50 });
  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminLoadError message={error} onRetry={load} />;
  const items = data.items?.items || [];
  return <>
    <AdminHeading title="Payables" description="Money SiteArvo owes to vendors and freelancers." />
    <FinanceToolbar range={range} setRange={setRange} search={search} setSearch={setSearch} status={status} setStatus={setStatus} />
    <div className="admin-panel">
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Vendor</th><th>Bill</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>{items.map(item => <tr key={`${item.bill_reference}-${item.vendor_id}`}><td>{item.vendor_name}</td><td>{item.bill_reference}</td><td>{formatMoney(item.amount)}</td><td>{formatMoney(item.paid)}</td><td>{formatMoney(item.balance_due)}</td><td>{item.due_date || '—'}</td><td>{item.status}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="finance-pagination">
        <button type="button" className="button button--secondary" disabled={(data.items.page || 1) <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
        <span>Page {data.items.page || 1} of {data.items.total_pages || 1}</span>
        <button type="button" className="button button--secondary" disabled={(data.items.page || 1) >= (data.items.total_pages || 1)} onClick={() => setPage(current => current + 1)}>Next</button>
      </div>
    </div>
  </>;
}

function AdminFinanceTransactions() {
  const [range, setRange] = useState('this_month');
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const { data, loading, error, load } = useAdminQueryData('/admin/finance/transactions', { range, search, account, type, page: 1, per_page: 250 });
  const { setNotice } = useContext(AdminContext);
  const [adjustment, setAdjustment] = useState({ reason: '', amount: '', account_id: '', date: new Date().toISOString().slice(0, 10), direction: 'credit', notes: '' });
  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminLoadError message={error} onRetry={load} />;
  const items = data.items?.items || [];
  const addAdjustment = async event => {
    event.preventDefault();
    await apiFetch('/admin/finance/adjustments', { method: 'POST', body: JSON.stringify(adjustment) });
    setNotice('Manual adjustment recorded.');
    setAdjustment({ reason: '', amount: '', account_id: '', date: new Date().toISOString().slice(0, 10), direction: 'credit', notes: '' });
    await load();
  };
  return <>
    <AdminHeading title="Transactions" description="Chronological financial ledger with income, expenses, refunds and adjustments." />
    <FinanceToolbar range={range} setRange={setRange} search={search} setSearch={setSearch} account={account} setAccount={setAccount} status={undefined} setStatus={() => {}}>
      <label className="admin-field admin-field--inline"><span>Type</span><input value={type} onChange={e => setType(e.target.value)} placeholder="Income / Expense / Refund" /></label>
    </FinanceToolbar>
    <div className="finance-dashboard-grid">
      <FinanceChart title="Income vs Expenses" items={data.summary ? [
        { label: 'Collected Income', amount: data.summary.total_income || 0 },
        { label: 'Expenses', amount: data.summary.total_expenses || 0 },
      ] : []} />
      <div className="admin-panel">
        <h2>Manual Adjustment</h2>
        <form className="admin-settings-form" onSubmit={addAdjustment}>
          <div className="admin-form-grid">
            <Field label="Reason"><input value={adjustment.reason} onChange={e => setAdjustment(current => ({ ...current, reason: e.target.value }))} required /></Field>
            <Field label="Amount"><input type="number" value={adjustment.amount} onChange={e => setAdjustment(current => ({ ...current, amount: e.target.value }))} required /></Field>
            <Field label="Account ID"><input type="number" value={adjustment.account_id} onChange={e => setAdjustment(current => ({ ...current, account_id: e.target.value }))} /></Field>
            <Field label="Date"><input type="date" value={adjustment.date} onChange={e => setAdjustment(current => ({ ...current, date: e.target.value }))} /></Field>
          </div>
          <div className="admin-checks">
            <CheckField label="Credit" checked={adjustment.direction === 'credit'} onChange={checked => setAdjustment(current => ({ ...current, direction: checked ? 'credit' : 'debit' }))} />
          </div>
          <Field label="Notes"><textarea rows="3" value={adjustment.notes} onChange={e => setAdjustment(current => ({ ...current, notes: e.target.value }))} /></Field>
          <button className="button"><Save /> Save Adjustment</button>
        </form>
      </div>
    </div>
    <div className="admin-panel">
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Date</th><th>ID</th><th>Type</th><th>Description</th><th>Counterparty</th><th>Account</th><th>Debit</th><th>Credit</th><th>Reference</th><th>Status</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}><td>{item.date}</td><td>{item.transaction_number}</td><td>{item.type}</td><td>{item.description}</td><td>{item.counterparty_name || '—'}</td><td>{item.account_name || '—'}</td><td>{item.debit ? formatMoney(item.debit) : '—'}</td><td>{item.credit ? formatMoney(item.credit) : '—'}</td><td>{item.reference || '—'}</td><td>{item.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </>;
}

function AdminFinanceTax() {
  const { data, loading, error, load } = useAdminQueryData('/admin/finance/tax');
  const [form, setForm] = useState(null);
  const { setNotice } = useContext(AdminContext);
  useEffect(() => { if (data) setForm({ tax_enabled: data.tax_enabled, tax_name: data.tax_name, tax_rate: data.tax_rate, business_tax_id: data.business_tax_id, tax_included: data.tax_included }); }, [data]);
  if (loading) return <AdminLoading />;
  if (error || !form) return <AdminLoadError message={error} onRetry={load} />;
  const save = async event => {
    event.preventDefault();
    await apiFetch('/admin/finance/tax', { method: 'PUT', body: JSON.stringify(form) });
    setNotice('Tax settings updated.');
    await load();
  };
  return <>
    <AdminHeading title="Tax" description="Internal tax summary and configuration. Tax stays disabled until you switch it on." />
    <div className="admin-panel">
      <form className="admin-settings-form" onSubmit={save}>
        <div className="admin-form-grid">
          <Field label="Tax Name"><input value={form.tax_name || ''} onChange={e => setForm(current => ({ ...current, tax_name: e.target.value }))} /></Field>
          <Field label="Tax Rate"><input type="number" value={form.tax_rate || 0} onChange={e => setForm(current => ({ ...current, tax_rate: e.target.value }))} /></Field>
          <Field label="Business Tax Number"><input value={form.business_tax_id || ''} onChange={e => setForm(current => ({ ...current, business_tax_id: e.target.value }))} /></Field>
        </div>
        <div className="admin-checks">
          <CheckField label="Tax Enabled" checked={Boolean(form.tax_enabled)} onChange={tax_enabled => setForm(current => ({ ...current, tax_enabled }))} />
          <CheckField label="Tax Included" checked={Boolean(form.tax_included)} onChange={tax_included => setForm(current => ({ ...current, tax_included }))} />
        </div>
        <button className="button"><Save /> Save Tax Settings</button>
      </form>
    </div>
    <FinanceSummaryCards data={data.summary_cards || {}} />
    <div className="admin-summary admin-summary--analytics">
      <article><span>Tax Collected</span><strong>{formatMoney(data.summary?.tax_collected || 0)}</strong></article>
      <article><span>Tax Paid on Expenses</span><strong>{formatMoney(data.summary?.tax_paid_on_expenses || 0)}</strong></article>
      <article><span>Tax Adjustments</span><strong>{formatMoney(data.summary?.tax_adjustments || 0)}</strong></article>
    </div>
  </>;
}

function AdminFinanceReports() {
  const [range, setRange] = useState('this_month');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, load } = useAdminQueryData('/admin/finance/reports', { range, start, end, search });
  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminLoadError message={error} onRetry={load} />;
  return <>
    <AdminHeading title="Reports" description="Profit & loss, cash flow and service/category revenue reports built from actual records." />
    <FinanceToolbar range={range} setRange={setRange} start={start} setStart={setStart} end={end} setEnd={setEnd} search={search} setSearch={setSearch} />
    <FinanceSummaryCards data={data.summary || {}} />
    <div className="finance-dashboard-grid">
      <FinanceChart title="Revenue by Service" items={data.revenue_by_service || []} />
      <FinanceChart title="Expense by Category" items={data.expense_breakdown || []} color="green" />
      <FinanceChart title="Monthly Net Profit" items={data.monthly_profit || []} color="green" />
      <FinanceChart title="Cash Flow" items={(data.cash_flow?.monthly || []).map(item => ({ ...item, label: item.month }))} color="gold" />
    </div>
    <div className="admin-panel">
      <h2>Profit & Loss</h2>
      <div className="finance-report-grid">
        <section>
          <h3>Revenue</h3>
          <div className="admin-mini-list">{(data.profit_loss?.revenue || []).map(item => <div key={item.label}><b>{item.label}</b><span>{formatMoney(item.amount)}</span></div>)}</div>
          <p><b>Total Revenue:</b> {formatMoney(data.profit_loss?.total_revenue || 0)}</p>
        </section>
        <section>
          <h3>Expenses</h3>
          <div className="admin-mini-list">{(data.profit_loss?.expenses || []).map(item => <div key={item.label}><b>{item.label}</b><span>{formatMoney(item.amount)}</span></div>)}</div>
          <p><b>Total Expenses:</b> {formatMoney(data.profit_loss?.total_expenses || 0)}</p>
        </section>
      </div>
      <p className="finance-net-profit"><b>Net Profit:</b> {formatMoney(data.profit_loss?.net_profit || 0)}</p>
    </div>
    <div className="admin-panel">
      <h2>Cash Flow</h2>
      <div className="admin-summary admin-summary--analytics">
        <article><span>Opening Balance</span><strong>{formatMoney(data.cash_flow?.opening_balance || 0)}</strong></article>
        <article><span>Money In</span><strong>{formatMoney(data.cash_flow?.money_in || 0)}</strong></article>
        <article><span>Money Out</span><strong>{formatMoney(data.cash_flow?.money_out || 0)}</strong></article>
        <article><span>Closing Balance</span><strong>{formatMoney(data.cash_flow?.closing_balance || 0)}</strong></article>
      </div>
    </div>
    <div className="admin-panel">
      <h2>Customer Outstanding Report</h2>
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Invoices</th><th>Total Due</th><th>Overdue</th><th>Oldest Due Date</th></tr></thead>
          <tbody>{(data.customer_outstanding || []).map(item => <tr key={item.customer_name}><td>{item.customer_name}</td><td>{item.invoices}</td><td>{formatMoney(item.total_due)}</td><td>{formatMoney(item.overdue)}</td><td>{item.oldest_due_date || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="finance-report-grid">
      <section>
        <h3>Receivables Aging</h3>
        <div className="admin-summary admin-summary--analytics">
          <article><span>Current</span><strong>{formatMoney(data.aging_receivables?.current || 0)}</strong></article>
          <article><span>1–30 Days</span><strong>{formatMoney(data.aging_receivables?.one_to_30 || 0)}</strong></article>
          <article><span>31–60 Days</span><strong>{formatMoney(data.aging_receivables?.thirty_one_to_60 || 0)}</strong></article>
          <article><span>61–90 Days</span><strong>{formatMoney(data.aging_receivables?.sixty_one_to_90 || 0)}</strong></article>
          <article><span>90+ Days</span><strong>{formatMoney(data.aging_receivables?.ninety_plus || 0)}</strong></article>
        </div>
      </section>
      <section>
        <h3>Payables Aging</h3>
        <div className="admin-summary admin-summary--analytics">
          <article><span>Current</span><strong>{formatMoney(data.aging_payables?.current || 0)}</strong></article>
          <article><span>1–30 Days</span><strong>{formatMoney(data.aging_payables?.one_to_30 || 0)}</strong></article>
          <article><span>31–60 Days</span><strong>{formatMoney(data.aging_payables?.thirty_one_to_60 || 0)}</strong></article>
          <article><span>61–90 Days</span><strong>{formatMoney(data.aging_payables?.sixty_one_to_90 || 0)}</strong></article>
          <article><span>90+ Days</span><strong>{formatMoney(data.aging_payables?.ninety_plus || 0)}</strong></article>
        </div>
      </section>
    </div>
  </>;
}

function AdminProjects() {
  const isMobile = useAdminViewport();
  const { data, loading, load } = useAdminData('/admin/projects');
  const projects = Array.isArray(data) ? data : [];
  const { setNotice } = useContext(AdminContext);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => projects.filter(project => `${project.project_number} ${project.project_name} ${project.status} ${project.priority}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const statuses = ['Planning', 'Waiting for Content', 'Design', 'Development', 'Testing', 'Client Review', 'Deployment', 'Completed', 'On Hold', 'Cancelled'];
  const save = async form => { await apiFetch(editing?.id ? `/admin/projects/${editing.id}` : '/admin/projects', { method: editing?.id ? 'PUT' : 'POST', body: JSON.stringify(form) }); setNotice(`Project ${editing?.id ? 'updated' : 'created'} successfully.`); setEditing(null); await load(); };
  const complete = async project => { await apiFetch(`/admin/projects/${project.id}`, { method: 'PUT', body: JSON.stringify({ ...project, status: 'Completed', progress: 100 }) }); setNotice('Project marked complete.'); await load(); };
  const iconForProject = project => {
    const text = `${project.project_name} ${project.package_name}`.toLowerCase();
    if (text.includes('mobile')) return Smartphone;
    if (text.includes('e-commerce') || text.includes('commerce') || text.includes('shop')) return ShoppingCart;
    if (text.includes('portfolio') || text.includes('landing') || text.includes('website')) return BriefcaseBusiness;
    return Code2;
  };
  if (!isMobile) {
    return (
      <AdminCrudPage
        title="Projects"
        description="Track website projects, milestones and delivery stages."
        endpoint="/admin/projects"
        createLabel="New Project"
        searchKeys={['project_number', 'project_name', 'status', 'priority']}
        defaultRecord={{ project_name: '', package_name: '', status: 'Planning', priority: 'Medium', progress: 0, start_date: '', due_date: '', project_manager: '', notes: '', milestones: '[]' }}
        fields={[
          { name: 'project_name', label: 'Project Name' },
          { name: 'package_name', label: 'Package' },
          { name: 'status', label: 'Status', type: 'select', options: statuses },
          { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'] },
          { name: 'progress', label: 'Progress', type: 'number' },
          { name: 'start_date', label: 'Start Date', type: 'date' },
          { name: 'due_date', label: 'Due Date', type: 'date' },
          { name: 'project_manager', label: 'Project Manager' },
          { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
          { name: 'milestones', label: 'Milestones (JSON)', type: 'json', rows: 8, placeholder: '[{"name":"Requirement Finalized","completed":true}]' },
        ]}
        columns={[
          { key: 'project_number', label: 'Project ID' },
          { key: 'project_name', label: 'Project Name' },
          { key: 'status', label: 'Status' },
          { key: 'progress', label: 'Progress', render: item => `${item.progress || 0}%` },
        ]}
        mobileIcon={FolderPlus}
        mobileColor="blue"
        rowActions={(project, loadList, setNoticeMessage) => (
          <button type="button" onClick={async () => { await apiFetch(`/admin/projects/${project.id}`, { method: 'PUT', body: JSON.stringify({ ...project, status: 'Completed', progress: 100 }) }); setNoticeMessage('Project marked complete.'); await loadList(); }}>Complete</button>
        )}
      />
    );
  }
  return <>
    <AdminHeading title="Projects" description="Manage all client projects." action={<button className="button" onClick={() => setEditing({ project_name: '', package_name: '', status: 'Planning', priority: 'Medium', progress: 0, start_date: '', due_date: '', project_manager: '', notes: '', milestones: '[]' })}><Plus /> New Project</button>} />
    <div className="admin-panel admin-resource-toolbar">
      <label className="admin-field admin-field--inline"><span>Search</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects..." /></label>
    </div>
    {editing && <AdminEditor title={editing.id ? 'Edit Project' : 'Add Project'} onSubmit={() => save(editing)} onCancel={() => setEditing(null)}><div className="admin-form-grid">{[
      { name: 'project_name', label: 'Project Name' },
      { name: 'package_name', label: 'Package' },
      { name: 'status', label: 'Status', type: 'select', options: ['Planning', 'Waiting for Content', 'Design', 'Development', 'Testing', 'Client Review', 'Deployment', 'Completed', 'On Hold', 'Cancelled'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'] },
      { name: 'progress', label: 'Progress', type: 'number' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'due_date', label: 'Due Date', type: 'date' },
      { name: 'project_manager', label: 'Project Manager' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ].map(field => <CrudField key={field.name} field={field} value={editing[field.name] === undefined ? normalizeCrudInitial(field, field.type === 'select' && field.name === 'status' ? 'Planning' : field.name === 'priority' ? 'Medium' : field.name === 'progress' ? 0 : '') : normalizeCrudInitial(field, editing[field.name])} onChange={value => setEditing(current => ({ ...current, [field.name]: value }))} />)}</div></AdminEditor>}
    {loading ? <AdminLoading /> : <div className="admin-mobile-list admin-mobile-list--projects">{filtered.map(project => {
      const Icon = iconForProject(project);
      const tone = getAdminStatusTone(project.status);
      return <article key={project.id} className="admin-mobile-card">
        <div className="admin-mobile-card__top">
          <ColoredIconBox icon={Icon} color={tone === 'green' ? 'green' : tone === 'red' ? 'red' : tone === 'purple' ? 'purple' : tone === 'orange' ? 'orange' : 'blue'} size={17} />
          <div>
            <b>{project.project_name}</b>
            <span>{project.package_name || 'Project package'} · {project.project_number || 'No ID'}</span>
          </div>
          <span className={`admin-status-pill is-${tone}`}>{project.status}</span>
        </div>
        <div className="admin-mobile-card__meta">
          <div><span>Customer</span><strong>{project.customer_name || project.client_name || project.project_manager || '—'}</strong></div>
          <div><span>Progress</span><strong>{project.progress || 0}%</strong></div>
          <div><span>Due Date</span><strong>{project.due_date || '—'}</strong></div>
        </div>
        <div className="admin-mobile-progress"><span style={{ width: `${Number(project.progress || 0)}%` }} /></div>
        <div className="admin-mobile-card__actions">
          <button type="button" className="button button--secondary" onClick={() => setEditing({ ...project })}>Edit</button>
          <button type="button" className="button" onClick={() => complete(project)}>Complete</button>
        </div>
      </article>;
    })}</div>}
  </>;
}

function AdminPortfolio() {
  return (
    <AdminCrudPage
      title="Portfolio"
      description="Publish, unpublish and reorganize concept or client projects."
      endpoint="/admin/portfolio"
      createLabel="Add Project"
      searchKeys={['slug', 'title', 'category', 'industry', 'client']}
      defaultRecord={{ title: '', slug: '', project_type: 'Concept Project', category: '', industry: '', client: '', short_description: '', full_description: '', technologies: '[]', features: '[]', challenge: '', solution: '', cover_image: '', gallery: '[]', featured: false, published: false, seo_title: '', seo_description: '', display_order: 0 }}
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'slug', label: 'Slug' },
        { name: 'project_type', label: 'Project Type', type: 'select', options: ['Concept Project', 'Demo Project', 'Client Project'] },
        { name: 'category', label: 'Category' },
        { name: 'industry', label: 'Industry' },
        { name: 'client', label: 'Client / Concept' },
        { name: 'short_description', label: 'Short Description', type: 'textarea', rows: 2 },
        { name: 'full_description', label: 'Full Description', type: 'textarea', rows: 4 },
        { name: 'technologies', label: 'Technologies (JSON)', type: 'json', rows: 4 },
        { name: 'features', label: 'Features (JSON)', type: 'json', rows: 4 },
        { name: 'challenge', label: 'Challenge', type: 'textarea', rows: 3 },
        { name: 'solution', label: 'Solution', type: 'textarea', rows: 3 },
        { name: 'cover_image', label: 'Cover Image' },
        { name: 'gallery', label: 'Gallery (JSON)', type: 'json', rows: 4 },
        { name: 'featured', label: 'Featured', type: 'checkbox' },
        { name: 'published', label: 'Published', type: 'checkbox' },
        { name: 'seo_title', label: 'SEO Title' },
        { name: 'seo_description', label: 'SEO Description', type: 'textarea', rows: 2 },
        { name: 'display_order', label: 'Display Order', type: 'number' },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'project_type', label: 'Type' },
        { key: 'published', label: 'Published', render: item => (item.published ? 'Yes' : 'No') },
      ]}
    />
  );
}

function AdminContent() {
  const { data, loading } = useAdminData('/admin/content');
  const [form, setForm] = useState({});
  const { setNotice } = useContext(AdminContext);
  useEffect(() => { if (!loading) setForm(data); }, [loading, data]);
  const save = async event => { event.preventDefault(); await apiFetch('/admin/content', { method: 'PUT', body: JSON.stringify(form) }); setNotice('Content updated successfully.'); };
  if (loading) return <AdminLoading />;
  return <><AdminHeading title="Website Content" description="Edit core homepage and brand copy without changing source code." /><form className="admin-panel admin-settings-form" onSubmit={save}><Field label="Homepage Hero"><input value={form.homepage_hero || ''} onChange={e => setForm({ ...form, homepage_hero: e.target.value })} /></Field><Field label="Hero Subtitle"><textarea rows="3" value={form.hero_subtitle || ''} onChange={e => setForm({ ...form, hero_subtitle: e.target.value })} /></Field><Field label="CTA Text"><input value={form.cta_text || ''} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></Field><Field label="Footer Description"><textarea rows="2" value={form.footer_description || ''} onChange={e => setForm({ ...form, footer_description: e.target.value })} /></Field><button className="button"><Save /> Save Content</button></form></>;
}

function AdminFaqs() { return <AdminCrudPage title="FAQs" description="Manage frequently asked questions for the public website." endpoint="/admin/faqs" createLabel="New FAQ" searchKeys={['question', 'category']} defaultRecord={{ question: '', answer: '', category: '', display_order: 0, active: true }} fields={[{ name: 'question', label: 'Question' }, { name: 'answer', label: 'Answer', type: 'textarea', rows: 4 }, { name: 'category', label: 'Category' }, { name: 'display_order', label: 'Display Order', type: 'number' }, { name: 'active', label: 'Active', type: 'checkbox' }]} columns={[{ key: 'question', label: 'Question' }, { key: 'category', label: 'Category' }, { key: 'active', label: 'Active', render: item => (item.active ? 'Yes' : 'No') }]} />; }

function AdminTestimonials() { return <AdminCrudPage title="Testimonials" description="Manage real testimonials entered by the admin team." endpoint="/admin/testimonials" createLabel="New Testimonial" searchKeys={['name', 'company', 'role']} defaultRecord={{ name: '', company: '', role: '', testimonial: '', image: '', featured: false, active: true, display_order: 0 }} fields={[{ name: 'name', label: 'Name' }, { name: 'company', label: 'Company' }, { name: 'role', label: 'Role' }, { name: 'testimonial', label: 'Testimonial', type: 'textarea', rows: 5 }, { name: 'image', label: 'Image URL' }, { name: 'featured', label: 'Featured', type: 'checkbox' }, { name: 'active', label: 'Active', type: 'checkbox' }, { name: 'display_order', label: 'Display Order', type: 'number' }]} columns={[{ key: 'name', label: 'Name' }, { key: 'company', label: 'Company' }, { key: 'featured', label: 'Featured', render: item => (item.featured ? 'Yes' : 'No') }, { key: 'active', label: 'Active', render: item => (item.active ? 'Yes' : 'No') }]} />; }

function AdminMedia() { return <AdminCrudPage title="Media" description="Store uploaded images and copy shareable URLs." endpoint="/admin/media" createLabel="New Media Item" searchKeys={['media_number', 'title', 'folder']} defaultRecord={{ title: '', url: '', file_name: '', mime_type: '', alt_text: '', folder: 'library', size: 0 }} fields={[{ name: 'title', label: 'Title' }, { name: 'url', label: 'URL' }, { name: 'file_name', label: 'File Name' }, { name: 'mime_type', label: 'MIME Type' }, { name: 'alt_text', label: 'Alt Text' }, { name: 'folder', label: 'Folder' }, { name: 'size', label: 'File Size', type: 'number' }]} columns={[{ key: 'media_number', label: 'Media ID' }, { key: 'title', label: 'Title' }, { key: 'folder', label: 'Folder' }, { key: 'url', label: 'URL', render: item => item.url || '—' }]} />; }

function AdminCoupons() { return <AdminCrudPage title="Coupons" description="Configure coupon codes and discount rules." endpoint="/admin/coupons" createLabel="New Coupon" searchKeys={['code', 'discount_type']} defaultRecord={{ code: '', discount_type: 'Percentage', discount_value: 0, minimum_order: 0, maximum_discount: '', applicable_categories: '[]', applicable_packages: '[]', start_date: '', expiry_date: '', usage_limit: '', per_customer_limit: '', active: true }} fields={[{ name: 'code', label: 'Code' }, { name: 'discount_type', label: 'Discount Type', type: 'select', options: ['Percentage', 'Fixed Amount'] }, { name: 'discount_value', label: 'Discount Value', type: 'number' }, { name: 'minimum_order', label: 'Minimum Order', type: 'number' }, { name: 'maximum_discount', label: 'Maximum Discount', type: 'number' }, { name: 'applicable_categories', label: 'Applicable Categories (JSON)', type: 'json', rows: 4 }, { name: 'applicable_packages', label: 'Applicable Packages (JSON)', type: 'json', rows: 4 }, { name: 'start_date', label: 'Start Date', type: 'date' }, { name: 'expiry_date', label: 'Expiry Date', type: 'date' }, { name: 'usage_limit', label: 'Usage Limit', type: 'number' }, { name: 'per_customer_limit', label: 'Per Customer Limit', type: 'number' }, { name: 'active', label: 'Active', type: 'checkbox' }]} columns={[{ key: 'code', label: 'Code' }, { key: 'discount_type', label: 'Type' }, { key: 'discount_value', label: 'Value' }, { key: 'active', label: 'Active', render: item => (item.active ? 'Yes' : 'No') }]} />; }

function AdminNotifications() { return <AdminCrudPage allowCreate={false} allowDelete={false} title="Notifications" description="Review unread notifications and clear them when handled." endpoint="/admin/notifications" searchKeys={['title', 'type', 'message']} defaultRecord={{ title: '', message: '', type: 'info' }} fields={[{ name: 'title', label: 'Title' }, { name: 'message', label: 'Message', type: 'textarea', rows: 4 }, { name: 'type', label: 'Type', type: 'select', options: ['lead', 'chat', 'order', 'quote', 'payment', 'project', 'info'] }]} columns={[{ key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'is_read', label: 'Read', render: item => (item.is_read ? 'Yes' : 'No') }]} rowActions={(item, load) => <button type="button" onClick={async () => { await apiFetch(`/admin/notifications/${item.id}/read`, { method: 'PUT' }); await load(); }}>Mark Read</button>} />; }

function AdminActivityLogs() { return <AdminCrudPage allowCreate={false} allowDelete={false} title="Activity Logs" description="Track meaningful admin actions across the panel." endpoint="/admin/activity-logs" searchKeys={['admin_name', 'action', 'entity']} defaultRecord={{}} fields={[]} columns={[{ key: 'created_at', label: 'Date', render: item => new Date(item.created_at).toLocaleString('en-IN') }, { key: 'admin_name', label: 'Admin' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' }, { key: 'entity_id', label: 'Entity ID' }]} />; }

function AdminUsers() { return <AdminCrudPage title="Admin Users" description="Manage internal access roles where supported." endpoint="/admin/users" createLabel="New Admin User" searchKeys={['name', 'email', 'role']} defaultRecord={{ name: '', email: '', password: '', role: 'Sales', is_active: true }} fields={[{ name: 'name', label: 'Name' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'password', label: 'Password' }, { name: 'role', label: 'Role', type: 'select', options: ['Super Admin', 'Admin', 'Finance', 'Sales', 'Support', 'Content Manager'] }, { name: 'is_active', label: 'Active', type: 'checkbox' }]} columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'is_active', label: 'Active', render: item => (item.is_active ? 'Yes' : 'No') }]} />; }

function AdminBackup() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch('/admin/backup').then(response => { setData(response); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AdminLoading />;
  return <>
    <AdminHeading title="Backup / Export" description="Download snapshots of your business data for safekeeping and migration." />
    <div className="admin-panel">
      <h2>Available collections</h2>
      <div className="admin-mini-list">{Object.entries(data?.collections || {}).map(([key, value]) => <div key={key}><b>{key.replaceAll('_', ' ')}</b><span>{value}</span></div>)}</div>
      <div className="admin-actions admin-actions--spaced">
        <a className="button" href="/admin/export" target="_blank" rel="noreferrer">Download JSON Export</a>
      </div>
    </div>
  </>;
}




