import { BarChart3, Boxes, FolderTree, LayoutDashboard, LogOut, Menu, MessageSquareText, PackagePlus, Plus, ReceiptText, Save, Send, Settings, Trash2, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { apiFetch } from '../catalog/api';
import { iconOptions } from '../catalog/icons';
import { formatPrice } from '../catalog/format';
import { useCatalog } from '../catalog/CatalogContext';

const AdminContext = createContext(null);
const blankCategory = { name: '', slug: '', icon: 'code', short_description: '', description: '', display_order: 0, is_featured: false, is_active: true, seo_title: '', seo_description: '' };
const blankService = { category_id: '', name: '', slug: '', service_type: 'custom_quote', icon: 'code', short_description: '', description: '', price_type: 'custom_quote', base_price: '', sale_price: '', pages_included: '', delivery_time: '', revisions: '', display_order: 0, is_featured: false, is_active: true, cta_text: 'View Service', seo_title: '', seo_description: '', features: [], addon_ids: [], image: '' };
const blankAddon = { name: '', description: '', price: '', pricing_type: 'fixed', pricing_unit: '', is_active: true, category_ids: [] };

export default function AdminApp() {
  const [admin, setAdmin] = useState(undefined);
  const [notice, setNotice] = useState('');
  useEffect(() => { apiFetch('/auth/me').then(data => setAdmin(data?.id && data?.csrf ? data : null)).catch(() => setAdmin(null)); }, []);
  if (admin === undefined) return <div className="admin-loading">Checking secure session...</div>;
  return <AdminContext.Provider value={{ admin, setAdmin, notice, setNotice }}><Routes><Route path="login" element={admin ? <Navigate to="/admin" replace /> : <AdminLogin />} /><Route element={admin ? <AdminShell /> : <Navigate to="/admin/login" replace />}><Route index element={<AdminDashboard />} /><Route path="analytics" element={<AdminAnalytics />} /><Route path="categories" element={<AdminCategories />} /><Route path="services" element={<AdminServices />} /><Route path="add-ons" element={<AdminAddons />} /><Route path="orders" element={<AdminOrders />} /><Route path="chats" element={<AdminChats />} /><Route path="settings" element={<AdminSettings />} /></Route><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></AdminContext.Provider>;
}

function AdminLogin() {
  const { setAdmin } = useContext(AdminContext);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = 'Admin Login | SiteArvo'; }, []);
  const submit = async event => { event.preventDefault(); setBusy(true); setError(''); try { setAdmin(await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) })); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } };
  return <main className="admin-login"><form onSubmit={submit}><Logo /><span>Secure administration</span><h1>SiteArvo Admin</h1><p>Manage the live catalog, packages and enquiries.</p><label>Email<input type="email" autoComplete="username" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label><label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></label>{error && <div className="admin-error" role="alert">{error}</div>}<button className="button" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button><Link to="/">Back to website</Link></form></main>;
}

function AdminShell() {
  const { admin, setAdmin, notice } = useContext(AdminContext);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Catalog Admin | SiteArvo'; }, []);
  const logout = async () => { await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {}); setAdmin(null); navigate('/admin/login'); };
  const links = [[LayoutDashboard, '/admin', 'Dashboard'], [BarChart3, '/admin/analytics', 'Analytics'], [MessageSquareText, '/admin/chats', 'Live Chats'], [FolderTree, '/admin/categories', 'Categories'], [PackagePlus, '/admin/services', 'Services & Packages'], [Boxes, '/admin/add-ons', 'Add-ons'], [ReceiptText, '/admin/orders', 'Orders'], [Settings, '/admin/settings', 'Settings']];
  return <div className="admin-app"><aside className={open ? 'is-open' : ''}><div className="admin-brand"><Logo /><button onClick={() => setOpen(false)} aria-label="Close admin menu"><X /></button></div><nav>{links.map(([Icon, path, label]) => <NavLink key={path} to={path} end={path === '/admin'} onClick={() => setOpen(false)}><Icon />{label}</NavLink>)}</nav><div className="admin-user"><span>{admin.name}</span><small>{admin.email}</small><button onClick={logout}><LogOut /> Logout</button></div></aside><div className="admin-main"><header><button className="admin-menu-toggle" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu /></button><div><b>SiteArvo Catalog Manager</b><span>Changes publish to the database-backed catalog.</span></div><Link to="/" target="_blank">View Website</Link></header>{notice && <div className="admin-notice" role="status">{notice}</div>}<div className="admin-content"><AdminOutlet /></div></div></div>;
}

function AdminOutlet() {
  const { pathname: path } = useLocation();
  if (path.endsWith('/categories')) return <AdminCategories />;
  if (path.endsWith('/services')) return <AdminServices />;
  if (path.endsWith('/add-ons')) return <AdminAddons />;
  if (path.endsWith('/orders')) return <AdminOrders />;
  if (path.endsWith('/chats')) return <AdminChats />;
  if (path.endsWith('/settings')) return <AdminSettings />;
  if (path.endsWith('/analytics')) return <AdminAnalytics />;
  return <AdminDashboard />;
}

function useAdminData(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setData(await apiFetch(path)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [path]);
  return { data, loading, load, setData };
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
    ['New Enquiries', data.new_orders],
    ['Unread Chats', data.unread_chats],
  ];
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
        {analyticsCards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value ?? 0}</strong></article>)}
      </div>
      <div className="admin-analytics-grid">
        <section>
          <h3>Top Pages</h3>
          <div className="admin-mini-list">{(analytics.top_pages || []).length ? analytics.top_pages.map(item => <div key={item.path}><b>{item.path}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No page views tracked yet.</p>}</div>
        </section>
        <section>
          <h3>7-Day Trend</h3>
          <div className="admin-mini-list">{(analytics.daily_views || []).length ? analytics.daily_views.map(item => <div key={item.date}><b>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</b><span>{item.pageviews} views · {item.visitors} visitors</span></div>) : <p>No trend data yet.</p>}</div>
        </section>
      </div>
    </div>
    <div className="admin-summary">{managementCards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value ?? 0}</strong></article>)}</div>
    <div className="admin-actions admin-actions--spaced"><Link className="button" to="/admin/analytics"><BarChart3 /> Open Analytics</Link><Link className="button button--secondary" to="/admin/chats"><MessageSquareText /> Open Live Chats</Link><Link className="button button--secondary" to="/admin/orders">Review Enquiries</Link></div>
    <div className="admin-panel"><h2>Quick actions</h2><div className="admin-actions"><Link className="button button--secondary" to="/admin/categories"><Plus /> Add Category</Link><Link className="button button--secondary" to="/admin/services"><Plus /> Add Package</Link></div></div>
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

function AdminCategories() {
  const { data: categories, loading, load } = useAdminData('/admin/categories');
  const [editing, setEditing] = useState(null);
  const { setNotice } = useContext(AdminContext);
  const save = async form => { await apiFetch(editing?.id ? `/admin/categories/${editing.id}` : '/admin/categories', { method: editing?.id ? 'PUT' : 'POST', body: JSON.stringify(form) }); setNotice(`Category ${editing?.id ? 'updated' : 'created'} successfully.`); setEditing(null); load(); };
  const deactivate = async category => { if (!window.confirm(`Deactivate "${category.name}"? Existing order history will be preserved.`)) return; await apiFetch(`/admin/categories/${category.id}`, { method: 'DELETE' }); setNotice('Category deactivated.'); load(); };
  return <><AdminHeading title="Categories" description="Create, order, feature and publish service categories without code." action={<button className="button" onClick={() => setEditing(blankCategory)}><Plus /> Add Category</button>} />{editing && <CategoryForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}{loading ? <AdminLoading /> : <AdminTable headers={['Category', 'Order', 'Featured', 'Status', 'Actions']}>{categories.map(category => <tr key={category.id}><td><b>{category.name}</b><small>/{category.slug}</small></td><td>{category.display_order}</td><td>{category.is_featured ? 'Yes' : 'No'}</td><td><Status active={category.is_active} /></td><td><button onClick={() => setEditing(category)}>Edit</button><button className="danger" onClick={() => deactivate(category)}><Trash2 /> Deactivate</button></td></tr>)}</AdminTable>}</>;
}

function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...blankCategory, ...initial });
  return <AdminEditor title={initial.id ? 'Edit Category' : 'Add Category'} onSubmit={() => onSave(form)} onCancel={onCancel}><div className="admin-form-grid"><Field label="Category Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Slug"><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field><IconField value={form.icon} onChange={icon => setForm({ ...form, icon })} /><Field label="Display Order"><input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></Field></div><Field label="Short Description"><textarea rows="2" value={form.short_description || ''} onChange={e => setForm({ ...form, short_description: e.target.value })} /></Field><Field label="Long Description"><textarea rows="4" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field><div className="admin-checks"><CheckField label="Active" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} /><CheckField label="Featured" checked={form.is_featured} onChange={is_featured => setForm({ ...form, is_featured })} /></div><div className="admin-form-grid"><Field label="SEO Title"><input value={form.seo_title || ''} onChange={e => setForm({ ...form, seo_title: e.target.value })} /></Field><Field label="SEO Description"><textarea rows="2" value={form.seo_description || ''} onChange={e => setForm({ ...form, seo_description: e.target.value })} /></Field></div></AdminEditor>;
}

function AdminServices() {
  const { data: services, loading, load } = useAdminData('/admin/services');
  const { data: categories } = useAdminData('/admin/categories');
  const { data: addons } = useAdminData('/admin/addons');
  const [editing, setEditing] = useState(null);
  const { setNotice } = useContext(AdminContext);
  const { refresh } = useCatalog();
  const save = async form => { await apiFetch(editing?.id ? `/admin/services/${editing.id}` : '/admin/services', { method: editing?.id ? 'PUT' : 'POST', body: JSON.stringify(form) }); setNotice(`Service ${editing?.id ? 'updated' : 'created'} successfully.`); setEditing(null); await load(); refresh(); };
  const deactivate = async service => { if (!window.confirm(`Deactivate "${service.name}"?`)) return; await apiFetch(`/admin/services/${service.id}`, { method: 'DELETE' }); setNotice('Service deactivated.'); load(); refresh(); };
  return <><AdminHeading title="Services & Packages" description="Unlimited services, fixed packages, features, prices and applicable add-ons." action={<button className="button" onClick={() => setEditing({ ...blankService, category_id: categories[0]?.id || '' })}><Plus /> Add Service / Package</button>} />{editing && <ServiceForm initial={editing} categories={categories} addons={addons} onSave={save} onCancel={() => setEditing(null)} />}{loading ? <AdminLoading /> : <AdminTable headers={['Service', 'Category', 'Price', 'Type', 'Status', 'Actions']}>{services.map(service => <tr key={service.id}><td><b>{service.name}</b><small>/{service.slug}</small></td><td>{service.category_name}</td><td>{service.price_type === 'custom_quote' ? 'Custom Quote' : formatPrice(service.sale_price ?? service.base_price)}</td><td>{service.price_type?.replaceAll('_', ' ')}</td><td><Status active={service.is_active} /></td><td><button onClick={() => setEditing(service)}>Edit</button><button className="danger" onClick={() => deactivate(service)}><Trash2 /> Deactivate</button></td></tr>)}</AdminTable>}</>;
}

function ServiceForm({ initial, categories, addons, onSave, onCancel }) {
  const [form, setForm] = useState({ ...blankService, ...initial, features: (initial.features || []).map(feature => typeof feature === 'string' ? feature : feature.name), addon_ids: initial.addon_ids || (initial.addons || []).map(addon => addon.id) });
  const [feature, setFeature] = useState('');
  const [uploading, setUploading] = useState(false);
  const addFeature = () => { if (feature.trim()) { setForm({ ...form, features: [...form.features, feature.trim()] }); setFeature(''); } };
  const upload = async event => { const file = event.target.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { window.alert('Choose a JPG, PNG or WebP image up to 2 MB.'); return; } setUploading(true); const body = new FormData(); body.append('image', file); try { const response = await fetch('/api/admin/uploads', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': sessionStorage.getItem('sitearvo-admin-csrf') || '' }, body }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setForm(current => ({ ...current, image: result.data.url })); } catch (error) { window.alert(error.message); } finally { setUploading(false); } };
  return <AdminEditor title={initial.id ? 'Edit Service / Package' : 'Add New Service / Package'} onSubmit={() => onSave(form)} onCancel={onCancel}><div className="admin-form-grid"><Field label="Category *"><select required value={form.category_id} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })}><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Service Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Slug"><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></Field><IconField value={form.icon} onChange={icon => setForm({ ...form, icon })} /><Field label="Price Type *"><select value={form.price_type} onChange={e => setForm({ ...form, price_type: e.target.value })}><option value="fixed">Fixed Price</option><option value="starting_from">Starting From</option><option value="custom_quote">Custom Quote</option><option value="addon">Add-on</option></select></Field><Field label="Base Price"><input type="number" min="0" step="0.01" value={form.base_price ?? ''} onChange={e => setForm({ ...form, base_price: e.target.value })} /></Field><Field label="Sale Price"><input type="number" min="0" step="0.01" value={form.sale_price ?? ''} onChange={e => setForm({ ...form, sale_price: e.target.value })} /></Field><Field label="Display Order"><input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></Field><Field label="Pages Included"><input type="number" min="0" value={form.pages_included ?? ''} onChange={e => setForm({ ...form, pages_included: e.target.value })} /></Field><Field label="Delivery Time"><input value={form.delivery_time || ''} onChange={e => setForm({ ...form, delivery_time: e.target.value })} /></Field><Field label="Revisions"><input value={form.revisions || ''} onChange={e => setForm({ ...form, revisions: e.target.value })} /></Field><Field label="CTA Text"><input value={form.cta_text || ''} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></Field></div><Field label="Short Description"><textarea rows="2" value={form.short_description || ''} onChange={e => setForm({ ...form, short_description: e.target.value })} /></Field><Field label="Full Description"><textarea rows="4" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field><div className="admin-feature-editor"><b>Package Features</b>{form.features.map((item, index) => <div key={`${item}-${index}`}><span>{item}</span><button type="button" onClick={() => setForm({ ...form, features: form.features.filter((_, itemIndex) => itemIndex !== index) })}><X /></button></div>)}<div><input placeholder="Responsive Design" value={feature} onChange={e => setFeature(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} /><button className="button button--secondary" type="button" onClick={addFeature}><Plus /> Add Feature</button></div></div><fieldset className="admin-addon-options"><legend>Available Add-ons</legend>{addons.map(addon => <CheckField key={addon.id} label={addon.name} checked={form.addon_ids.includes(addon.id)} onChange={checked => setForm({ ...form, addon_ids: checked ? [...form.addon_ids, addon.id] : form.addon_ids.filter(id => id !== addon.id) })} />)}</fieldset><div className="admin-checks"><CheckField label="Active" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} /><CheckField label="Featured" checked={form.is_featured} onChange={is_featured => setForm({ ...form, is_featured })} /></div><div className="admin-form-grid"><Field label="Cover Image"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />{uploading && <small>Uploading safely...</small>}{form.image && <small>{form.image}</small>}</Field><Field label="SEO Title"><input value={form.seo_title || ''} onChange={e => setForm({ ...form, seo_title: e.target.value })} /></Field></div><Field label="SEO Description"><textarea rows="2" value={form.seo_description || ''} onChange={e => setForm({ ...form, seo_description: e.target.value })} /></Field></AdminEditor>;
}

function AdminAddons() {
  const { data: addons, loading, load } = useAdminData('/admin/addons');
  const { data: categories } = useAdminData('/admin/categories');
  const [editing, setEditing] = useState(null);
  const { setNotice } = useContext(AdminContext);
  const save = async form => { await apiFetch(editing?.id ? `/admin/addons/${editing.id}` : '/admin/addons', { method: editing?.id ? 'PUT' : 'POST', body: JSON.stringify(form) }); setNotice(`Add-on ${editing?.id ? 'updated' : 'created'}.`); setEditing(null); load(); };
  const deactivate = async addon => { if (!window.confirm(`Deactivate "${addon.name}"?`)) return; await apiFetch(`/admin/addons/${addon.id}`, { method: 'DELETE' }); load(); };
  return <><AdminHeading title="Add-ons" description="Create reusable fixed, per-page, per-item, monthly or custom add-ons." action={<button className="button" onClick={() => setEditing(blankAddon)}><Plus /> Add Add-on</button>} />{editing && <AddonForm initial={editing} categories={categories} onSave={save} onCancel={() => setEditing(null)} />}{loading ? <AdminLoading /> : <AdminTable headers={['Add-on', 'Price', 'Pricing', 'Status', 'Actions']}>{addons.map(addon => <tr key={addon.id}><td><b>{addon.name}</b><small>{addon.description}</small></td><td>{addon.pricing_type === 'custom_quote' ? 'Custom Quote' : formatPrice(addon.price)}</td><td>{addon.pricing_type?.replaceAll('_', ' ')}</td><td><Status active={addon.is_active} /></td><td><button onClick={() => setEditing(addon)}>Edit</button><button className="danger" onClick={() => deactivate(addon)}><Trash2 /> Deactivate</button></td></tr>)}</AdminTable>}</>;
}

function AddonForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...blankAddon, ...initial, category_ids: initial.category_ids || [] });
  return <AdminEditor title={initial.id ? 'Edit Add-on' : 'Add Add-on'} onSubmit={() => onSave(form)} onCancel={onCancel}><div className="admin-form-grid"><Field label="Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Price"><input type="number" min="0" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value })} /></Field><Field label="Pricing Type"><select value={form.pricing_type} onChange={e => setForm({ ...form, pricing_type: e.target.value })}><option value="fixed">Fixed</option><option value="per_page">Per Page</option><option value="per_item">Per Item</option><option value="per_month">Per Month</option><option value="custom_quote">Custom Quote</option></select></Field><Field label="Pricing Unit"><input placeholder="page, item or month" value={form.pricing_unit || ''} onChange={e => setForm({ ...form, pricing_unit: e.target.value })} /></Field></div><Field label="Description"><textarea rows="3" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field><fieldset className="admin-addon-options"><legend>Applicable Categories</legend>{categories.map(category => <CheckField key={category.id} label={category.name} checked={form.category_ids.includes(category.id)} onChange={checked => setForm({ ...form, category_ids: checked ? [...form.category_ids, category.id] : form.category_ids.filter(id => id !== category.id) })} />)}</fieldset><CheckField label="Active" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} /></AdminEditor>;
}

function AdminOrders() {
  const { data: orders, loading, load } = useAdminData('/admin/orders');
  const statuses = ['New', 'Contacted', 'In Discussion', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
  const update = async (id, status) => { await apiFetch(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }); load(); };
  return <><AdminHeading title="Orders & Enquiries" description="Stored customer enquiries with verified server-side totals. No revenue is implied." />{loading ? <AdminLoading /> : <AdminTable headers={['Order ID', 'Customer', 'Service', 'Total', 'Date', 'Status']}>{orders.map(order => <tr key={order.id}><td><b>{order.order_number}</b></td><td>{order.full_name}<small>{order.phone}</small></td><td>{order.service_name}</td><td>{formatPrice(order.total_amount)}</td><td>{new Date(order.created_at).toLocaleDateString('en-IN')}</td><td><select value={order.status} onChange={e => update(order.id, e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></td></tr>)}</AdminTable>}</>;
}

function AdminChats() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loadList = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await apiFetch('/admin/chats');
      setConversations(data);
      setSelectedId(current => current || data[0]?.id || null);
    } catch (requestError) { setError(requestError.message); }
    finally { if (!quiet) setLoading(false); }
  };
  const loadChat = async id => {
    if (!id) return;
    try { setChat(await apiFetch(`/admin/chats/${id}`)); setError(''); }
    catch (requestError) { setError(requestError.message); }
  };
  useEffect(() => { loadList(); const timer = window.setInterval(() => loadList(true), 5000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (selectedId) { loadChat(selectedId); const timer = window.setInterval(() => loadChat(selectedId), 4000); return () => window.clearInterval(timer); } return undefined; }, [selectedId]);
  const send = async event => {
    event.preventDefault(); if (!message.trim() || !selectedId) return;
    setBusy(true);
    try { await apiFetch(`/admin/chats/${selectedId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }); setMessage(''); await loadChat(selectedId); await loadList(true); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const changeStatus = async status => {
    await apiFetch(`/admin/chats/${selectedId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    await loadChat(selectedId); await loadList(true);
  };
  return <><AdminHeading title="Live Chat Inbox" description="Reply to website visitors in real time. New messages refresh automatically." />{error && <div className="admin-error" role="alert">{error}</div>}{loading ? <AdminLoading /> : <div className="admin-chat-layout"><aside className="admin-chat-list">{conversations.length ? conversations.map(item => <button type="button" className={selectedId === item.id ? 'is-active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}><div><b>{item.visitor_name}</b>{item.unread_admin > 0 && <span>{item.unread_admin}</span>}</div><p>{item.last_message}</p><small>#{item.public_id} · {new Date(item.last_message_at.replace(' ', 'T')).toLocaleString('en-IN')}</small></button>) : <div className="admin-chat-empty"><MessageSquareText /><b>No conversations yet</b><p>New website chats will appear here.</p></div>}</aside><section className="admin-chat-thread">{chat ? <><header><div><h2>{chat.visitor_name}</h2><p>{chat.visitor_email || 'Email not provided'} · #{chat.public_id}</p></div><button type="button" className={`admin-chat-status is-${chat.status}`} onClick={() => changeStatus(chat.status === 'open' ? 'closed' : 'open')}>{chat.status === 'open' ? 'Close conversation' : 'Reopen conversation'}</button></header><div className="admin-chat-messages">{chat.messages.map(item => <article className={`is-${item.sender}`} key={item.id}><b>{item.sender === 'visitor' ? chat.visitor_name : 'SiteArvo'}</b><p>{item.message}</p><time>{new Date(item.created_at.replace(' ', 'T')).toLocaleString('en-IN')}</time></article>)}</div><form onSubmit={send}><textarea rows="2" maxLength="1500" value={message} onChange={event => setMessage(event.target.value)} placeholder="Type your reply..." disabled={chat.status === 'closed'} /><button className="button" disabled={busy || chat.status === 'closed' || !message.trim()}><Send /> {busy ? 'Sending...' : 'Send Reply'}</button></form></> : <div className="admin-chat-empty"><MessageSquareText /><b>Select a conversation</b></div>}</section></div>}</>;
}

function AdminSettings() {
  const { data, loading } = useAdminData('/admin/settings');
  const [form, setForm] = useState({});
  const { setNotice } = useContext(AdminContext);
  useEffect(() => { if (!loading) setForm(data); }, [loading, data]);
  const save = async event => { event.preventDefault(); await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(form) }); setNotice('Settings updated.'); };
  if (loading) return <AdminLoading />;
  return <><AdminHeading title="General Pricing Settings" description="Central explanations and ordering controls used by the public catalog." /><form className="admin-panel admin-settings-form" onSubmit={save}><Field label="What counts as a page?"><textarea rows="4" value={form.page_explanation || ''} onChange={e => setForm({ ...form, page_explanation: e.target.value })} /></Field><Field label="Currency"><input value={form.currency || 'INR'} onChange={e => setForm({ ...form, currency: e.target.value })} /></Field><CheckField label="Accept new orders" checked={form.orders_enabled !== '0' && form.orders_enabled !== false} onChange={orders_enabled => setForm({ ...form, orders_enabled })} /><button className="button"><Save /> Save Settings</button></form></>;
}

function AdminHeading({ title, description, action }) { return <div className="admin-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function AdminLoading() { return <div className="admin-loading">Loading stored data...</div>; }
function Status({ active }) { return <span className={`admin-status ${active ? 'is-active' : ''}`}>{active ? 'Active' : 'Inactive'}</span>; }
function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label>; }
function IconField({ value, onChange }) { return <Field label="Icon"><select value={value || 'code'} onChange={e => onChange(e.target.value)}>{iconOptions.map(icon => <option key={icon} value={icon}>{icon}</option>)}</select></Field>; }
function CheckField({ label, checked, onChange }) { return <label className="admin-checkbox"><input type="checkbox" checked={Boolean(checked)} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label>; }
function AdminTable({ headers, children }) { return <div className="admin-table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function AdminEditor({ title, onSubmit, onCancel, children }) { const submit = event => { event.preventDefault(); onSubmit(); }; return <form className="admin-editor" onSubmit={submit}><header><h2>{title}</h2><button type="button" onClick={onCancel} aria-label="Close editor"><X /></button></header>{children}<footer><button type="button" className="button button--secondary" onClick={onCancel}>Cancel</button><button className="button"><Save /> Save</button></footer></form>; }
