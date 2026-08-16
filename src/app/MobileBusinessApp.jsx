import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  Clock3,
  CreditCard,
  Filter,
  FolderKanban,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MoonStar,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TicketCheck,
  UserRound,
  X,
} from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { AnalyticsDateRange, AnalyticsLineChart, formatAnalyticsRangeLabel, formatAnalyticsValue } from '../components/analytics/AnalyticsUI';
import { apiFetch } from '../catalog/api';
import { AppIcon } from '../catalog/icons';
import { company, phoneUrl, whatsappUrl } from '../config/company';
import { effectivePrice, formatPrice } from '../catalog/format';
import { useCatalog } from '../catalog/CatalogContext';

const AppContext = createContext(null);
const bottomNav = [
  ['/app', 'Dashboard', 'dashboard'],
  ['/app/orders', 'Orders', 'orders'],
  ['/app/projects', 'Projects', 'projects'],
  ['/app/support', 'Support', 'support'],
  ['/app/profile', 'Profile', 'profile'],
];

const drawerNav = [
  ['/app', 'Dashboard', 'dashboard'],
  ['/app/orders', 'Orders', 'orders'],
  ['/app/projects', 'Projects', 'projects'],
  ['/app/support', 'Support', 'support'],
  ['/app/reports', 'Reports', 'reports'],
  ['/app/clients', 'Clients', 'clients'],
  ['/app/notifications', 'Notifications', 'notifications'],
  ['/app/settings', 'Settings', 'settings'],
  ['/app/profile', 'Profile', 'profile'],
];

const statusTone = {
  Completed: 'success',
  'In Progress': 'warning',
  Pending: 'info',
  Cancelled: 'danger',
  'On Hold': 'warning',
  Open: 'danger',
  Resolved: 'success',
  Closed: 'muted',
  Draft: 'muted',
  Sent: 'info',
  Viewed: 'info',
  Accepted: 'success',
  Rejected: 'danger',
  Expired: 'muted',
  Converted: 'success',
};

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function telHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `tel:+${digits}` : '#';
}

function waHref(phone, message = 'Hi SiteArvo, I am interested in website development services.') {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '#';
}

function initials(name = '') {
  return String(name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'S';
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIconLookup(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function resolveCatalogIconKey(services, ...terms) {
  const normalizedTerms = terms.map(normalizeIconLookup).filter(Boolean);
  const match = safeList(services).find(service => normalizedTerms.some(term => {
    const fields = [service.slug, service.title, service.name, service.shortDescription, service.categorySlug, service.categoryTitle];
    return fields.some(field => {
      const normalizedField = normalizeIconLookup(field);
      return normalizedField && (normalizedField.includes(term) || term.includes(normalizedField));
    });
  }));
  return match?.icon || 'orders';
}

function useAppSession() {
  const [admin, setAdmin] = useState(undefined);
  useEffect(() => {
    let mounted = true;
    apiFetch('/auth/me')
      .then(data => { if (mounted) setAdmin(data?.id && data?.csrf ? data : null); })
      .catch(() => { if (mounted) setAdmin(null); });
    return () => { mounted = false; };
  }, []);
  return { admin, setAdmin };
}

function useResource(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiFetch(path);
        if (mounted) setData(result);
      } catch (requestError) {
        if (mounted) setError(requestError.message || 'Unable to load data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [path, ...deps]);
  return { data, loading, error, setData };
}

function useQueryResource(path, params = {}) {
  const query = useMemo(() => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    const str = search.toString();
    return str ? `${path}?${str}` : path;
  }, [path, params]);
  return useResource(query, [query]);
}

function AppStatusBadge({ status }) {
  const tone = statusTone[status] || 'muted';
  return <span className={`app-status is-${tone}`}>{status || 'Unknown'}</span>;
}

function AppMetricCard({ icon: Icon, label, value, hint, tone = 'gold' }) {
  return <article className="app-metric-card">
    <span className={`app-metric-card__icon is-${tone}`}><Icon size={18} /></span>
    <div>
      <small>{label}</small>
      <strong>{value ?? 0}</strong>
      {hint ? <em>{hint}</em> : null}
    </div>
  </article>;
}

function AppQuickAction({ to, icon: Icon, label, hint }) {
  return <Link className="app-quick-action" to={to}>
    <span><AppIcon icon={Icon} size={18} /></span>
    <b>{label}</b>
    <small>{hint}</small>
  </Link>;
}

function AppSectionHeader({ title, description, action, compact = false }) {
  return <div className={`app-section-header ${compact ? 'is-compact' : ''}`}>
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {action}
  </div>;
}

function AppPage({ title, description, action, children, className = '' }) {
  return <section className={`app-page ${className}`}>
    <AppSectionHeader title={title} description={description} action={action} />
    {children}
  </section>;
}

function LoadingState({ title = 'Loading data...' }) {
  return <div className="app-loading">
    <div className="app-skeleton app-skeleton--title" />
    <div className="app-skeleton-grid">
      <div className="app-skeleton" />
      <div className="app-skeleton" />
      <div className="app-skeleton" />
      <div className="app-skeleton" />
    </div>
    <p>{title}</p>
  </div>;
}

function EmptyState({ title, description, action, icon: Icon = ClipboardList }) {
  return <div className="app-empty-state">
    <span><Icon size={24} /></span>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>;
}

function Shell({ admin, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { data: notifications } = useResource('/admin/notifications', [location.pathname]);
  const unreadCount = useMemo(() => safeList(notifications).filter(item => !item.is_read).length, [notifications]);
  const accountRef = useRef(null);

  useEffect(() => {
    document.title = 'SiteArvo App | Dashboard';
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointer = event => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    const handleKey = event => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    setNotificationCount(unreadCount);
  }, [unreadCount]);

  const logout = async () => {
    await onLogout();
    navigate('/admin/login?next=/app', { replace: true });
  };

  return <AppContext.Provider value={{ admin, unreadCount: notificationCount, refreshNotifications: () => setNotificationCount(current => current) }}>
    <div className={`app-shell ${drawerOpen ? 'is-drawer-open' : ''}`}>
      <aside className="app-sidebar" aria-label="App navigation">
        <div className="app-sidebar__brand">
          <Logo />
          <button type="button" className="app-sidebar__close" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="app-sidebar__nav">
          {drawerNav.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/app'} onClick={() => setDrawerOpen(false)}><AppIcon icon={icon} size={18} />{label}</NavLink>)}
        </nav>
        <div className="app-sidebar__footer">
          <Link to="/" target="_blank" rel="noreferrer">View Website</Link>
          <button type="button" onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button type="button" className="app-header__menu" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Link to="/app" className="app-header__brand">
            <Logo />
            <span>SITEARVO</span>
          </Link>
          <div className="app-header__actions">
            <NavLink to="/app/notifications" className="app-header__icon" aria-label={`Notifications with ${notificationCount} unread`}><Bell size={17} />{notificationCount > 0 && <b>{notificationCount > 99 ? '99+' : notificationCount}</b>}</NavLink>
            <div className="app-account" ref={accountRef}>
              <button type="button" className="app-account__button" onClick={() => setAccountOpen(current => !current)} aria-label="Account menu">
                <span>{initials(admin?.name)}</span>
              </button>
              {accountOpen && <div className="app-account__menu">
                <Link to="/app/profile" onClick={() => setAccountOpen(false)}>Profile</Link>
                <Link to="/app/settings" onClick={() => setAccountOpen(false)}>Settings</Link>
                <button type="button" onClick={logout}>Logout</button>
              </div>}
            </div>
          </div>
        </header>
        <main className="app-content">
          <Outlet context={{ admin, unreadCount: notificationCount, setDrawerOpen, onLogout: logout }} />
        </main>
      </div>

      <nav className="app-bottom-nav" aria-label="Primary app navigation">
        {bottomNav.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => isActive ? 'is-active' : ''}><AppIcon icon={icon} size={18} /><span>{label}</span></NavLink>)}
      </nav>
      {drawerOpen && <button type="button" className="app-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Close menu overlay" />}
    </div>
  </AppContext.Provider>;
}

function useAppContext() {
  return useOutletContext() || {};
}

function AppDashboard() {
  const { admin } = useAppContext();
  const { services: catalogServices } = useCatalog();
  const { data: dashboard, loading: dashboardLoading } = useResource('/admin/dashboard');
  const { data: analytics, loading: analyticsLoading } = useResource('/admin/analytics');
  const { data: orders, loading: ordersLoading } = useResource('/admin/orders');
  const { data: chats, loading: chatsLoading } = useResource('/admin/chats');
  if (dashboardLoading || analyticsLoading || ordersLoading || chatsLoading) return <LoadingState title="Loading dashboard..." />;

  const report = analytics?.report || {};
  const finance = dashboard?.finance_snapshot || {};
  const orderCount = report?.summary?.orders?.current ?? safeList(orders).length ?? 0;
  const revenue = finance.collected_this_month ?? report?.summary?.revenue?.current ?? 0;
  const activeProjects = dashboard?.active_projects ?? 0;
  const supportTickets = safeList(chats).filter(item => item.status !== 'closed').length;
  const recentOrders = safeList(orders).slice(0, 4);
  const topPages = safeList(analytics?.top_pages).slice(0, 3);
  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(today);
  const dayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(today);

  return <AppPage
    title={`Hello, ${admin?.name?.split(' ')[0] || 'there'}!`}
    description="Here's what's happening with your business today."
    action={<div className="app-date-card"><CalendarDays size={16} /><div><b>{dateLabel}</b><span>{dayLabel}</span></div></div>}
  >
    <div className="app-metric-grid">
      <AppMetricCard icon={ShoppingBag} label="Total Orders" value={orderCount} hint={formatAnalyticsValue('orders', orderCount)} />
      <AppMetricCard icon={CreditCard} label="Total Revenue" value={formatPrice(revenue)} hint="Collected revenue" tone="orange" />
      <AppMetricCard icon={FolderKanban} label="Active Projects" value={activeProjects} hint="In progress or open" tone="blue" />
      <AppMetricCard icon={Headphones} label="Support Tickets" value={supportTickets} hint="Open conversations" tone="green" />
    </div>

    <section className="app-panel">
      <div className="app-panel__head">
        <h2>Quick Actions</h2>
        <Link to="/app/orders">View All</Link>
      </div>
      <div className="app-actions-grid">
        <AppQuickAction to="/app/orders/new" icon={ShoppingBag} label="New Order" hint="Create enquiry" />
        <AppQuickAction to="/app/projects/new" icon={FolderKanban} label="Add Project" hint="Plan delivery" />
        <AppQuickAction to="/app/support/new" icon={TicketCheck} label="Support Ticket" hint="Start a thread" />
        <AppQuickAction to="/app/reports" icon={Sparkles} label="Reports" hint="Review trends" />
      </div>
    </section>

    <section className="app-panel">
      <div className="app-panel__head">
        <h2>Traffic Trend</h2>
        <Link to="/app/reports">Open Reports</Link>
      </div>
      <AnalyticsLineChart
        title="Traffic Trend"
        subtitle={formatAnalyticsRangeLabel(report.range?.key || 'last_7_days', report.range?.start, report.range?.end)}
        data={report.timeseries || []}
        series={[
          { key: 'visits', label: 'Visits', color: 'gold' },
          { key: 'visitors', label: 'Visitors', color: 'green' },
        ]}
        compact
        height={260}
      />
    </section>

    <section className="app-panel">
      <div className="app-panel__head">
        <h2>Recent Orders</h2>
        <Link to="/app/orders">View All</Link>
      </div>
      <div className="app-list">
        {recentOrders.length ? recentOrders.map(order => <Link key={order.id} to={`/app/orders/${order.id}`} className="app-list__item">
          <div className="app-list__icon"><AppIcon icon={resolveCatalogIconKey(catalogServices, order.service_name, order.package_name, order.order_number)} size={16} /></div>
          <div className="app-list__content">
            <b>{order.service_name || order.order_number}</b>
            <span>{order.order_number} · {formatShortDate(order.created_at)}</span>
          </div>
          <div className="app-list__meta">
            <AppStatusBadge status={order.status} />
            <strong>{formatPrice(order.total_amount || order.total || 0)}</strong>
          </div>
        </Link>) : <EmptyState title="No orders yet." description="New orders will appear here once customers submit them." action={<Link className="button" to="/app/orders/new">Create Order</Link>} icon={ShoppingBag} />}
      </div>
    </section>

    <section className="app-panel">
      <div className="app-panel__head">
        <h2>Top Pages</h2>
        <Link to="/app/reports">Analytics</Link>
      </div>
      <div className="app-list app-list--compact">
        {topPages.length ? topPages.map(item => <div key={item.path} className="app-list__item is-static">
          <div className="app-list__icon"><AppIcon icon="dashboard" size={16} /></div>
          <div className="app-list__content">
            <b>{item.label || item.path}</b>
            <span>{item.pageviews} views · {item.visitors} visitors</span>
          </div>
        </div>) : <EmptyState title="No analytics data yet." description="Page-level analytics will appear here when the site records visits." icon="dashboard" />}
      </div>
    </section>
  </AppPage>;
}

function AppOrdersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const { data, loading, error } = useResource('/admin/orders');
  const rows = safeList(data);
  const filtered = useMemo(() => rows.filter(order => {
    const text = [order.order_number, order.full_name, order.service_name, order.phone, order.email, order.status].join(' ').toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesStatus = status === 'All' || String(order.status || '').toLowerCase() === status.toLowerCase();
    return matchesQuery && matchesStatus;
  }), [rows, query, status]);

  if (loading) return <LoadingState title="Loading orders..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return <AppPage title="Orders" description="Search orders, track status and open individual enquiries." action={<Link className="button" to="/app/orders/new">New Order</Link>}>
    <div className="app-search-row">
      <label className="app-search">
        <Search size={16} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search orders..." />
      </label>
      <button type="button" className="app-filter-button" onClick={() => setStatus('All')} aria-label="Reset filters"><Filter size={16} /></button>
    </div>
    <div className="app-chip-row">
      {['All', 'Completed', 'In Progress', 'Pending', 'Cancelled'].map(item => <button key={item} type="button" className={status === item ? 'is-active' : ''} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</button>)}
    </div>
    <div className="app-list">
      {filtered.length ? filtered.map(order => <button key={order.id} type="button" className="app-list__item is-button" onClick={() => navigate(`/app/orders/${order.id}`)}>
        <div className="app-list__icon"><ClipboardList size={16} /></div>
        <div className="app-list__content">
          <b>{order.order_number}</b>
          <span>{order.service_name}</span>
          <small>{order.full_name} · {formatDateTime(order.created_at)}</small>
        </div>
        <div className="app-list__meta">
          <AppStatusBadge status={order.status} />
          <strong>{formatPrice(order.total_amount || order.total || 0)}</strong>
        </div>
      </button>) : <EmptyState title="No orders found." description="Try another search or create a new order." action={<Link className="button" to="/app/orders/new">Create Order</Link>} />}
    </div>
  </AppPage>;
}

function AppOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, setData } = useResource(`/admin/orders/${id}`, [id]);
  if (loading) return <LoadingState title="Loading order..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const order = data || {};
  const customerPhone = order.phone || '';
  const customerEmail = order.email || '';
  const updateStatus = async nextStatus => {
    await apiFetch(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) });
    setData(current => ({ ...(current || {}), status: nextStatus }));
  };

  return <AppPage
    title={order.order_number || 'Order'}
    description={order.service_name || 'Order details'}
    action={<button type="button" className="button button--secondary" onClick={() => navigate('/app/orders')}>Back</button>}
  >
    <div className="app-detail-hero">
      <div className="app-detail-hero__card">
        <span>Customer</span>
        <b>{order.full_name || 'Customer'}</b>
        <small>{customerPhone || 'Phone not provided'}</small>
        <small>{customerEmail || 'Email not provided'}</small>
      </div>
      <div className="app-detail-hero__card">
        <span>Order Status</span>
        <AppStatusBadge status={order.status} />
      </div>
      <div className="app-detail-hero__card">
        <span>Total</span>
        <b>{formatPrice(order.total_amount || order.total || 0)}</b>
      </div>
    </div>
    <div className="app-panel">
      <h2>Price Breakdown</h2>
      <div className="app-lines">
        <div><span>Package</span><strong>{formatPrice(order.base_amount || order.base_price || order.total_amount || 0)}</strong></div>
        <div><span>Paid</span><strong>{formatPrice(order.amount_paid || 0)}</strong></div>
        <div><span>Payment Status</span><strong>{order.payment_status || 'Pending'}</strong></div>
      </div>
    </div>
    <div className="app-panel">
      <h2>Selected Add-ons</h2>
      {safeList(order.addons).length ? <div className="app-pill-grid">{safeList(order.addons).map(item => <span key={item.id || item.name}>{item.name || item.label} × {item.quantity || 1}</span>)}</div> : <p className="app-muted">No add-ons selected.</p>}
    </div>
    <div className="app-panel">
      <h2>Notes</h2>
      <p className="app-copy">{order.project_description || order.notes || 'No notes provided.'}</p>
    </div>
    <div className="app-actions-stack">
      <a className="button button--secondary" href={customerPhone ? telHref(customerPhone) : '#'} onClick={event => !customerPhone && event.preventDefault()}>Call</a>
      <a className="button button--secondary" href={customerPhone ? waHref(customerPhone) : '#'} target="_blank" rel="noreferrer" onClick={event => !customerPhone && event.preventDefault()}>WhatsApp</a>
      <a className="button button--secondary" href={customerEmail ? `mailto:${customerEmail}` : '#'} onClick={event => !customerEmail && event.preventDefault()}>Email</a>
      <button type="button" className="button" onClick={() => updateStatus(order.status === 'In Progress' ? 'Completed' : 'In Progress')}>Update Status</button>
      <button type="button" className="button button--secondary" onClick={async () => { await apiFetch(`/admin/orders/${id}/convert-project`, { method: 'POST' }); navigate('/app/projects'); }}>Create Project</button>
      <Link className="button button--secondary" to="/admin/invoices" target="_blank" rel="noreferrer">Create Invoice</Link>
    </div>
  </AppPage>;
}

function AppOrderNewPage() {
  const navigate = useNavigate();
  const { data: services } = useResource('/admin/services');
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company_name: '', service_slug: '', project_description: '', project_type: 'Fixed Price', amount: '' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const options = safeList(services);
  const selectedService = options.find(item => String(item.slug) === String(form.service_slug));

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        company_name: form.company_name,
        service_slug: form.service_slug,
        project_description: form.project_description,
        project_type: form.project_type,
        amount: form.amount,
      };
      await apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });
      setStatus('Order created successfully.');
      navigate('/app/orders');
    } catch (requestError) {
      setStatus(requestError.message || 'Could not create order.');
    } finally {
      setBusy(false);
    }
  };

  return <AppPage title="Add New Order" description="Create a customer enquiry using the existing order workflow." action={<Link className="button button--secondary" to="/app/orders">Back</Link>}>
    <form className="app-form" onSubmit={submit}>
      <fieldset>
        <legend>Client Information</legend>
        <label>Client Name<input required value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))} /></label>
        <label>Email Address<input type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
        <label>Phone Number<input type="tel" required value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></label>
      </fieldset>
      <fieldset>
        <legend>Order Details</legend>
        <label>Company Name<input value={form.company_name} onChange={event => setForm(current => ({ ...current, company_name: event.target.value }))} /></label>
        <label>Service / Package<select required value={form.service_slug} onChange={event => setForm(current => ({ ...current, service_slug: event.target.value }))}>
          <option value="">Select package</option>
          {options.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select></label>
        <label>Project Type<select value={form.project_type} onChange={event => setForm(current => ({ ...current, project_type: event.target.value }))}><option>Fixed Price</option><option>Custom</option></select></label>
        <label>Amount<input type="number" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} placeholder={selectedService ? formatPrice(effectivePrice(selectedService)) : '0'} /></label>
      </fieldset>
      <fieldset>
        <legend>Notes</legend>
        <label>Project Description<textarea rows="5" required value={form.project_description} onChange={event => setForm(current => ({ ...current, project_description: event.target.value }))} /></label>
      </fieldset>
      {status && <div className="app-form-status" role="status">{status}</div>}
      <button className="button" disabled={busy}>{busy ? 'Creating...' : 'Create Order'}</button>
    </form>
  </AppPage>;
}

function AppProjectsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const { data, loading, error } = useResource('/admin/projects');
  const rows = safeList(data);
  const filtered = useMemo(() => rows.filter(project => {
    const text = [project.project_number, project.project_name, project.package_name, project.project_manager, project.status].join(' ').toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesTab = tab === 'All' || String(project.status || '').toLowerCase() === tab.toLowerCase();
    return matchesQuery && matchesTab;
  }), [rows, query, tab]);

  if (loading) return <LoadingState title="Loading projects..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return <AppPage title="Projects" description="Track delivery status, progress and due dates." action={<Link className="button" to="/app/projects/new">Add Project</Link>}>
    <div className="app-search-row">
      <label className="app-search">
        <Search size={16} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search projects..." />
      </label>
    </div>
    <div className="app-chip-row">
      {['All', 'Planning', 'Design', 'Development', 'Testing', 'Client Review', 'Deployment', 'Completed', 'On Hold'].map(item => <button key={item} type="button" className={tab === item ? 'is-active' : ''} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}
    </div>
    <div className="app-list">
      {filtered.length ? filtered.map(project => <button key={project.id} type="button" className="app-list__item is-button" onClick={() => navigate(`/app/projects/${project.id}`)}>
        <div className="app-list__icon"><AppIcon icon="projects" size={16} /></div>
        <div className="app-list__content">
          <b>{project.project_name}</b>
          <span>{project.package_name || 'Project package'} · Due {formatShortDate(project.due_date)}</span>
          <small>Client: {project.project_manager || project.client || '—'}</small>
        </div>
        <div className="app-list__meta">
          <AppStatusBadge status={project.status} />
          <strong>{Math.max(0, Math.min(100, Number(project.progress || 0)))}%</strong>
        </div>
      </button>) : <EmptyState title="No projects found." description="Create the first project to get started." action={<Link className="button" to="/app/projects/new">Add Project</Link>} />}
    </div>
  </AppPage>;
}

function AppProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, setData } = useResource(`/admin/projects/${id}`, [id]);
  if (loading) return <LoadingState title="Loading project..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const project = data || {};
  const milestones = safeList(project.milestones).length ? safeList(project.milestones) : ['Requirement', 'Design', 'Development', 'Testing', 'Client Review', 'Deployment'].map(name => ({ name, completed: false }));
  return <AppPage title={project.project_name || 'Project'} description={project.package_name || 'Project details'} action={<Link className="button button--secondary" to="/app/projects">Back</Link>}>
    <div className="app-detail-grid">
      <div className="app-panel">
        <h2>Overview</h2>
        <div className="app-lines">
          <div><span>Client</span><strong>{project.customer_name || project.client || '—'}</strong></div>
          <div><span>Status</span><strong><AppStatusBadge status={project.status} /></strong></div>
          <div><span>Progress</span><strong>{Math.max(0, Math.min(100, Number(project.progress || 0)))}%</strong></div>
          <div><span>Due Date</span><strong>{formatShortDate(project.due_date)}</strong></div>
        </div>
      </div>
      <div className="app-panel">
        <h2>Milestones</h2>
        <div className="app-milestones">
          {milestones.map(item => <div key={item.name} className={item.completed ? 'is-complete' : ''}><CheckCircle2 size={16} /><span>{item.name}</span></div>)}
        </div>
      </div>
    </div>
    <div className="app-panel">
      <h2>Notes</h2>
      <p className="app-copy">{project.notes || 'No notes provided.'}</p>
    </div>
    <div className="app-actions-stack">
      <button type="button" className="button" onClick={async () => { await apiFetch(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify({ progress: Math.min(100, Number(project.progress || 0) + 10) }) }); setData(current => ({ ...(current || {}), progress: Math.min(100, Number(project.progress || 0) + 10) })); }}>Update Progress</button>
      <Link className="button button--secondary" to="/app/orders/new">Create Linked Order</Link>
      <Link className="button button--secondary" to="/app/reports">Financial Summary</Link>
    </div>
  </AppPage>;
}

function AppProjectNewPage() {
  const navigate = useNavigate();
  const { data: services } = useResource('/admin/services');
  const { data: customers } = useResource('/admin/customers');
  const [form, setForm] = useState({ project_name: '', customer_id: '', service_id: '', package_name: '', project_manager: '', start_date: '', due_date: '', priority: 'Medium', status: 'Planning', progress: 0, notes: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      await apiFetch('/admin/projects', { method: 'POST', body: JSON.stringify(form) });
      navigate('/app/projects');
    } catch (requestError) {
      setStatus(requestError.message || 'Could not create project.');
    } finally {
      setBusy(false);
    }
  };
  return <AppPage title="Add New Project" description="Create a project from an existing customer or package." action={<Link className="button button--secondary" to="/app/projects">Back</Link>}>
    <form className="app-form" onSubmit={submit}>
      <fieldset>
        <legend>Project Information</legend>
        <label>Project Name<input required value={form.project_name} onChange={event => setForm(current => ({ ...current, project_name: event.target.value }))} /></label>
        <label>Client<select value={form.customer_id} onChange={event => setForm(current => ({ ...current, customer_id: event.target.value }))}><option value="">Select client</option>{safeList(customers).map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label>Service / Package<select value={form.service_id} onChange={event => setForm(current => ({ ...current, service_id: event.target.value }))}><option value="">Select service</option>{safeList(services).map(service => <option key={service.id} value={service.id}>{service.name || service.title}</option>)}</select></label>
        <label>Package Name<input value={form.package_name} onChange={event => setForm(current => ({ ...current, package_name: event.target.value }))} /></label>
        <label>Project Manager<input value={form.project_manager} onChange={event => setForm(current => ({ ...current, project_manager: event.target.value }))} /></label>
      </fieldset>
      <fieldset>
        <legend>Timeline</legend>
        <label>Start Date<input type="date" value={form.start_date} onChange={event => setForm(current => ({ ...current, start_date: event.target.value }))} /></label>
        <label>Due Date<input type="date" value={form.due_date} onChange={event => setForm(current => ({ ...current, due_date: event.target.value }))} /></label>
        <label>Priority<select value={form.priority} onChange={event => setForm(current => ({ ...current, priority: event.target.value }))}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label>
        <label>Status<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option>Planning</option><option>Waiting for Content</option><option>Design</option><option>Development</option><option>Testing</option><option>Client Review</option><option>Deployment</option><option>Completed</option><option>On Hold</option><option>Cancelled</option></select></label>
        <label>Progress<input type="number" min="0" max="100" value={form.progress} onChange={event => setForm(current => ({ ...current, progress: event.target.value }))} /></label>
      </fieldset>
      <fieldset>
        <legend>Notes</legend>
        <label>Project Notes<textarea rows="5" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      </fieldset>
      {status && <div className="app-form-status" role="status">{status}</div>}
      <button className="button" disabled={busy}>{busy ? 'Creating...' : 'Create Project'}</button>
    </form>
  </AppPage>;
}

function AppSupportPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const { data, loading, error } = useResource('/admin/chats');
  const tickets = safeList(data);
  const filtered = useMemo(() => tickets.filter(item => {
    const text = [item.public_id, item.visitor_name, item.visitor_email, item.last_message, item.status].join(' ').toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesTab = tab === 'All' || String(item.status || '').toLowerCase() === tab.toLowerCase();
    return matchesQuery && matchesTab;
  }), [tickets, query, tab]);
  if (loading) return <LoadingState title="Loading support tickets..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  return <AppPage title="Support Tickets" description="Open conversations, reply faster and keep multiple tickets visible when needed." action={<Link className="button" to="/app/support/new">New Ticket</Link>}>
    <div className="app-search-row">
      <label className="app-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tickets..." /></label>
    </div>
    <div className="app-chip-row">
      {['All', 'open', 'in progress', 'resolved', 'closed'].map(item => <button key={item} type="button" className={tab === item ? 'is-active' : ''} aria-pressed={tab === item} onClick={() => setTab(item)}>{item === 'All' ? 'All' : item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>
    <div className="app-list">
      {filtered.length ? filtered.map(item => <button key={item.id} type="button" className="app-list__item is-button" onClick={() => navigate(`/app/support/${item.id}`)}>
        <div className="app-list__icon"><AppIcon icon="support" size={16} /></div>
        <div className="app-list__content">
          <b>{item.public_id}</b>
          <span>{item.visitor_name}</span>
          <small>{item.last_message || 'No messages yet'} · {formatDateTime(item.last_message_at)}</small>
        </div>
        <div className="app-list__meta">
          <AppStatusBadge status={item.status === 'open' ? 'Open' : item.status} />
          {item.unread_admin > 0 && <strong>{item.unread_admin}</strong>}
        </div>
      </button>) : <EmptyState title="No support tickets." description="Open a new ticket or let visitor chats appear here automatically." action={<Link className="button" to="/app/support/new">Create Ticket</Link>} icon={Headphones} />}
    </div>
  </AppPage>;
}

function AppSupportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, setData } = useResource(`/admin/chats/${id}`, [id]);
  const [message, setMessage] = useState('');
  if (loading) return <LoadingState title="Loading support ticket..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const ticket = data || {};
  const sendReply = async event => {
    event.preventDefault();
    if (!message.trim()) return;
    await apiFetch(`/admin/chats/${id}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
    const latest = await apiFetch(`/admin/chats/${id}`);
    setData(latest);
    setMessage('');
  };
  const changeStatus = async nextStatus => {
    await apiFetch(`/admin/chats/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) });
    setData(current => ({ ...(current || {}), status: nextStatus }));
  };
  return <AppPage title={ticket.public_id || 'Support Ticket'} description={ticket.visitor_name || 'Conversation details'} action={<Link className="button button--secondary" to="/app/support">Back</Link>}>
    <div className="app-panel">
      <h2>Conversation</h2>
      <div className="app-chat-thread">
        {safeList(ticket.messages).length ? safeList(ticket.messages).map(item => <article key={item.id} className={`app-chat-message is-${item.sender}`}>
          <b>{item.sender === 'visitor' ? ticket.visitor_name : company.name}</b>
          <p>{item.message}</p>
          <time>{formatDateTime(item.created_at)}</time>
        </article>) : <EmptyState title="No messages yet." description="This ticket is ready for the first reply." icon={MessageSquareText} />}
      </div>
    </div>
    <div className="app-actions-stack">
      <button type="button" className="button button--secondary" onClick={() => changeStatus(ticket.status === 'open' ? 'closed' : 'open')}>{ticket.status === 'open' ? 'Close Ticket' : 'Reopen Ticket'}</button>
      <button type="button" className="button button--secondary" onClick={() => navigate('/app/support/new')}>New Ticket</button>
    </div>
    <form className="app-form app-form--compact" onSubmit={sendReply}>
      <label>Reply<textarea rows="4" value={message} onChange={event => setMessage(event.target.value)} placeholder="Type your reply..." /></label>
      <button className="button" disabled={!message.trim()}><Send size={16} /> Send Reply</button>
    </form>
  </AppPage>;
}

function AppSupportNewPage() {
  const navigate = useNavigate();
  const { data: customers } = useResource('/admin/customers');
  const [form, setForm] = useState({ visitor_name: '', visitor_email: '', interested_service: 'Live Chat', message: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const result = await apiFetch('/chat/start', { method: 'POST', body: JSON.stringify({ ...form, visitor_id: crypto.randomUUID() }) });
      navigate(`/app/support/${result.id}`);
    } catch (requestError) {
      setStatus(requestError.message || 'Could not create support ticket.');
    } finally {
      setBusy(false);
    }
  };
  return <AppPage title="Create Support Ticket" description="Open a live conversation from the app dashboard." action={<Link className="button button--secondary" to="/app/support">Back</Link>}>
    <form className="app-form" onSubmit={submit}>
      <fieldset>
        <legend>Customer</legend>
        <label>Customer<select value={form.visitor_name} onChange={event => {
          const customer = safeList(customers).find(item => String(item.id) === event.target.value);
          setForm(current => ({ ...current, visitor_name: customer?.name || '', visitor_email: customer?.email || '' }));
        }}>
          <option value="">Select client</option>
          {safeList(customers).map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select></label>
        <label>Name<input required value={form.visitor_name} onChange={event => setForm(current => ({ ...current, visitor_name: event.target.value }))} /></label>
        <label>Email<input type="email" value={form.visitor_email} onChange={event => setForm(current => ({ ...current, visitor_email: event.target.value }))} /></label>
      </fieldset>
      <fieldset>
        <legend>Ticket Details</legend>
        <label>Category<select value={form.interested_service} onChange={event => setForm(current => ({ ...current, interested_service: event.target.value }))}><option>Live Chat</option><option>Website Issue</option><option>Hosting</option><option>Domain</option><option>Payment</option><option>Project Update</option><option>Other</option></select></label>
        <label>Description<textarea rows="5" required value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} /></label>
      </fieldset>
      {status && <div className="app-form-status" role="status">{status}</div>}
      <button className="button" disabled={busy}>{busy ? 'Creating...' : 'Create Ticket'}</button>
    </form>
  </AppPage>;
}

function AppReportsPage() {
  const [range, setRange] = useState(() => sessionStorage.getItem('sitearvo-app-report-range') || 'last_7_days');
  const { data, loading, error } = useQueryResource('/admin/analytics', { range });
  const { data: dashboard, loading: dashLoading } = useResource('/admin/dashboard');
  useEffect(() => { sessionStorage.setItem('sitearvo-app-report-range', range); }, [range]);
  if (loading || dashLoading) return <LoadingState title="Loading reports..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const report = data?.report || {};
  const finance = dashboard?.finance_snapshot || {};
  const summary = report.summary || {};
  const topServices = safeList(report.top_services).slice(0, 5);
  return <AppPage title="Reports" description="Revenue, orders and traffic overview from real SiteArvo data." action={<AnalyticsDateRange compact hideLabel range={range} onRangeChange={setRange} start={report.range?.start} end={report.range?.end} />}>
    <div className="app-metric-grid">
      <AppMetricCard icon={CreditCard} label="Total Revenue" value={formatPrice(finance.collected_this_month || summary.revenue?.current || 0)} />
      <AppMetricCard icon={ShoppingBag} label="Total Orders" value={summary.orders?.current ?? 0} />
      <AppMetricCard icon={UserRound} label="New Clients" value={summary.new_clients?.current ?? 0} />
      <AppMetricCard icon={FolderKanban} label="Projects Completed" value={summary.projects_completed?.current ?? 0} />
    </div>
    <section className="app-panel">
      <h2>Revenue Overview</h2>
      <AnalyticsLineChart title="Revenue Overview" subtitle={formatAnalyticsRangeLabel(report.range?.key || range, report.range?.start, report.range?.end)} data={report.timeseries || []} series={[{ key: 'revenue', label: 'Revenue', color: 'gold' }]} compact height={260} />
    </section>
    <section className="app-panel">
      <h2>Top Services</h2>
      <div className="app-list app-list--compact">
        {topServices.length ? topServices.map(item => <div key={item.slug || item.label} className="app-list__item is-static">
          <div className="app-list__icon"><Sparkles size={16} /></div>
          <div className="app-list__content"><b>{item.label}</b><span>{item.views} views · {item.visitors} visitors</span></div>
        </div>) : <EmptyState title="No service analytics yet." description="Service trends will appear here when traffic is recorded." icon={Sparkles} />}
      </div>
    </section>
  </AppPage>;
}

function AppClientsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data, loading, error } = useResource('/admin/customers');
  const clients = safeList(data);
  const filtered = useMemo(() => clients.filter(client => [client.name, client.company, client.email, client.phone].join(' ').toLowerCase().includes(query.toLowerCase())), [clients, query]);
  if (loading) return <LoadingState title="Loading clients..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  return <AppPage title="Clients" description="Customers, totals and quick contact actions." action={<Link className="button" to="/app/clients/new">+ Add Client</Link>}>
    <div className="app-search-row">
      <label className="app-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search clients..." /></label>
    </div>
    <div className="app-list">
      {filtered.length ? filtered.map(client => <button key={client.id} type="button" className="app-list__item is-button" onClick={() => navigate(`/app/clients/${client.id}`)}>
        <div className="app-list__avatar">{initials(client.name)}</div>
        <div className="app-list__content">
          <b>{client.name}</b>
          <span>{client.email || 'Email not provided'}</span>
          <small>{client.phone || 'Phone not provided'}</small>
        </div>
        <div className="app-list__meta">
          <strong>{client.total_orders ?? 0} orders</strong>
          <span>{formatPrice(client.total_spent || 0)}</span>
        </div>
      </button>) : <EmptyState title="No clients found." description="Create a customer or import one from an order." action={<Link className="button" to="/app/orders/new">Create Order</Link>} icon={UserRound} />}
    </div>
  </AppPage>;
}

function AppClientDetailPage() {
  const { id } = useParams();
  const { data: customer, loading, error } = useResource(`/admin/customers/${id}`, [id]);
  const { data: orders } = useResource('/admin/orders');
  const { data: projects } = useResource('/admin/projects');
  if (loading) return <LoadingState title="Loading client..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const clientOrders = safeList(orders).filter(order => String(order.customer_id) === String(id));
  const clientProjects = safeList(projects).filter(project => String(project.customer_id) === String(id));
  return <AppPage title={customer?.name || 'Client'} description={customer?.company || 'Client details'}>
    <div className="app-detail-grid">
      <div className="app-panel">
        <h2>Contact</h2>
        <div className="app-lines">
          <div><span>Email</span><strong>{customer?.email || '—'}</strong></div>
          <div><span>Phone</span><strong>{customer?.phone || '—'}</strong></div>
          <div><span>Country</span><strong>{customer?.country || 'India'}</strong></div>
        </div>
      </div>
      <div className="app-panel">
        <h2>Summary</h2>
        <div className="app-lines">
          <div><span>Orders</span><strong>{clientOrders.length}</strong></div>
          <div><span>Projects</span><strong>{clientProjects.length}</strong></div>
          <div><span>Outstanding</span><strong>{formatPrice(0)}</strong></div>
        </div>
      </div>
    </div>
    <div className="app-panel">
      <h2>Recent Orders</h2>
      <div className="app-list app-list--compact">
        {clientOrders.length ? clientOrders.slice(0, 3).map(order => <Link key={order.id} className="app-list__item" to={`/app/orders/${order.id}`}>
          <div className="app-list__icon"><AppIcon icon="orders" size={16} /></div>
          <div className="app-list__content"><b>{order.order_number}</b><span>{order.service_name}</span></div>
          <div className="app-list__meta"><AppStatusBadge status={order.status} /><strong>{formatPrice(order.total_amount || 0)}</strong></div>
        </Link>) : <EmptyState title="No recent orders." description="Orders linked to this customer will appear here." icon={ShoppingBag} />}
      </div>
    </div>
    <div className="app-panel">
      <h2>Active Projects</h2>
      <div className="app-list app-list--compact">
        {clientProjects.length ? clientProjects.slice(0, 3).map(project => <Link key={project.id} className="app-list__item" to={`/app/projects/${project.id}`}>
          <div className="app-list__icon"><AppIcon icon="projects" size={16} /></div>
          <div className="app-list__content"><b>{project.project_name}</b><span>{project.package_name || 'Package'}</span></div>
          <div className="app-list__meta"><AppStatusBadge status={project.status} /><strong>{Math.max(0, Math.min(100, Number(project.progress || 0)))}%</strong></div>
        </Link>) : <EmptyState title="No active projects." description="Projects linked to this client will show here." icon={FolderKanban} />}
      </div>
    </div>
    <div className="app-actions-stack">
      <a className="button button--secondary" href={customer?.phone ? telHref(customer.phone) : '#'} onClick={event => !customer?.phone && event.preventDefault()}>Call</a>
      <a className="button button--secondary" href={customer?.phone ? waHref(customer.phone) : '#'} target="_blank" rel="noreferrer" onClick={event => !customer?.phone && event.preventDefault()}>WhatsApp</a>
      <a className="button button--secondary" href={customer?.email ? `mailto:${customer.email}` : '#'} onClick={event => !customer?.email && event.preventDefault()}>Email</a>
      <Link className="button" to="/app/orders/new">Create Order</Link>
      <Link className="button button--secondary" to="/app/projects/new">Create Project</Link>
    </div>
  </AppPage>;
}

function AppProfilePage() {
  const { admin, onLogout } = useAppContext();
  return <AppPage title="Profile" description="Account and personal preferences." action={<button type="button" className="button button--secondary" onClick={onLogout}>Logout</button>}>
    <div className="app-profile-card">
      <div className="app-profile-avatar">{initials(admin?.name)}</div>
      <div>
        <b>{admin?.name || 'Admin'}</b>
        <span>{admin?.email || company.email}</span>
        <small>{admin?.role || 'Administrator'}</small>
      </div>
    </div>
    <div className="app-menu-list">
      <Link to="/app/settings">Personal Information</Link>
      <Link to="/app/settings">Change Password</Link>
      <Link to="/app/notifications">Notification Preferences</Link>
      <Link to="/app/settings">Security</Link>
      <Link to="/app/settings">Theme Settings</Link>
      <Link to="/app/settings">Language</Link>
    </div>
  </AppPage>;
}

function AppClientNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', country: 'India', notes: '' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      await apiFetch('/admin/customers', { method: 'POST', body: JSON.stringify(form) });
      navigate('/app/clients');
    } catch (requestError) {
      setStatus(requestError.message || 'Could not create client.');
    } finally {
      setBusy(false);
    }
  };
  return <AppPage title="Add Client" description="Create a customer record for upcoming orders and projects." action={<Link className="button button--secondary" to="/app/clients">Back</Link>}>
    <form className="app-form" onSubmit={submit}>
      <label>Name<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
      <label>Company<input value={form.company} onChange={event => setForm(current => ({ ...current, company: event.target.value }))} /></label>
      <label>Email<input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
      <label>Phone<input type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></label>
      <label>Country<input value={form.country} onChange={event => setForm(current => ({ ...current, country: event.target.value }))} /></label>
      <label>Notes<textarea rows="5" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      {status && <div className="app-form-status" role="status">{status}</div>}
      <button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save Client'}</button>
    </form>
  </AppPage>;
}

function AppSettingsPage() {
  const { data, loading, error } = useResource('/admin/settings');
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);
  if (loading || !form) return <LoadingState title="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const updated = await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(form) });
      setForm(updated);
      setStatus('Settings saved successfully.');
    } catch (requestError) {
      setStatus(requestError.message || 'Unable to save settings.');
    } finally {
      setBusy(false);
    }
  };
  return <AppPage title="Settings" description="Company, customization and system preferences.">
    <form className="app-form" onSubmit={submit}>
      <fieldset>
        <legend>General</legend>
        <label>Company Information<input value={form.company_name || ''} onChange={event => setForm(current => ({ ...current, company_name: event.target.value }))} /></label>
        <label>Business Settings<input value={form.page_explanation || ''} onChange={event => setForm(current => ({ ...current, page_explanation: event.target.value }))} /></label>
        <label>Tax Settings<input value={form.tax_name || ''} onChange={event => setForm(current => ({ ...current, tax_name: event.target.value }))} /></label>
      </fieldset>
      <fieldset>
        <legend>Customization</legend>
        <label>Email Templates<input value={form.notify_email || ''} onChange={event => setForm(current => ({ ...current, notify_email: event.target.value }))} /></label>
        <label>Invoice Settings<textarea rows="4" value={form.invoice_notes || ''} onChange={event => setForm(current => ({ ...current, invoice_notes: event.target.value }))} /></label>
        <label>Custom Fields<input value={form.business_tax_id || ''} onChange={event => setForm(current => ({ ...current, business_tax_id: event.target.value }))} /></label>
      </fieldset>
      <fieldset>
        <legend>System</legend>
        <label>Users & Roles<input value={form.default_currency || 'INR'} onChange={event => setForm(current => ({ ...current, default_currency: event.target.value }))} /></label>
        <label>Backup & Restore<input value={form.financial_year_start_month || '4'} onChange={event => setForm(current => ({ ...current, financial_year_start_month: event.target.value }))} /></label>
        <label>API Settings<input value={form.currency || 'INR'} onChange={event => setForm(current => ({ ...current, currency: event.target.value }))} /></label>
      </fieldset>
      {status && <div className="app-form-status" role="status">{status}</div>}
      <button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save Settings'}</button>
    </form>
  </AppPage>;
}

function AppNotificationsPage() {
  const { data, loading, error } = useResource('/admin/notifications');
  const notifications = safeList(data);
  const unread = notifications.filter(item => !item.is_read);
  const markAll = async () => {
    await Promise.all(unread.map(item => apiFetch(`/admin/notifications/${item.id}/read`, { method: 'PUT' }).catch(() => {})));
    window.location.reload();
  };
  if (loading) return <LoadingState title="Loading notifications..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  return <AppPage title="Notifications" description="Unread order, payment and project updates." action={<button type="button" className="button button--secondary" onClick={markAll}>Mark all as read</button>}>
    <div className="app-list">
      {notifications.length ? notifications.map(notification => <div key={notification.id} className={`app-list__item is-static ${notification.is_read ? 'is-read' : 'is-unread'}`}>
        <div className="app-list__icon"><AppIcon icon="notifications" size={16} /></div>
        <div className="app-list__content">
          <b>{notification.title}</b>
          <span>{notification.message}</span>
          <small>{formatDateTime(notification.created_at)}</small>
        </div>
        <div className="app-list__meta"><AppStatusBadge status={notification.is_read ? 'Closed' : 'Open'} /></div>
      </div>) : <EmptyState title="No notifications." description="You’re all caught up." icon={Bell} />}
    </div>
  </AppPage>;
}

function ErrorState({ message, onRetry }) {
  return <div className="app-error">
    <h3>Unable to load data.</h3>
    <p>{message || 'Please try again.'}</p>
    {onRetry ? <button type="button" className="button" onClick={onRetry}>Retry</button> : null}
  </div>;
}

function AppPlaceholder({ title, description, icon = Sparkles }) {
  return <AppPage title={title} description={description}>
    <EmptyState title={`${title} is ready.`} description="This screen is intentionally lightweight while it reuses the live SiteArvo backend." icon={icon} />
  </AppPage>;
}

function MobileBusinessApp() {
  const { admin, setAdmin } = useAppSession();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    document.body.classList.add('has-app-shell');
    return () => document.body.classList.remove('has-app-shell');
  }, []);
  if (admin === undefined) return <div className="app-shell app-shell--loading"><LoadingState title="Checking secure session..." /></div>;
  if (!admin) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    setAdmin(null);
    navigate('/admin/login?next=/app', { replace: true });
  };
  return <Routes>
    <Route element={<Shell admin={admin} onLogout={logout} />}>
      <Route index element={<AppDashboard />} />
      <Route path="orders" element={<AppOrdersPage />} />
      <Route path="orders/new" element={<AppOrderNewPage />} />
      <Route path="orders/:id" element={<AppOrderDetailPage />} />
      <Route path="projects" element={<AppProjectsPage />} />
      <Route path="projects/new" element={<AppProjectNewPage />} />
      <Route path="projects/:id" element={<AppProjectDetailPage />} />
      <Route path="support" element={<AppSupportPage />} />
      <Route path="support/new" element={<AppSupportNewPage />} />
      <Route path="support/:id" element={<AppSupportDetailPage />} />
      <Route path="reports" element={<AppReportsPage />} />
      <Route path="clients" element={<AppClientsPage />} />
      <Route path="clients/new" element={<AppClientNewPage />} />
      <Route path="clients/:id" element={<AppClientDetailPage />} />
      <Route path="profile" element={<AppProfilePage />} />
      <Route path="settings" element={<AppSettingsPage />} />
      <Route path="notifications" element={<AppNotificationsPage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Route>
  </Routes>;
}

export default MobileBusinessApp;
