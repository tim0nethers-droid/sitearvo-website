import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import { useCart } from '../cart/CartContext';
import { apiFetch } from '../catalog/api';
import { effectivePrice, formatPrice } from '../catalog/format';
import { company, phoneUrl, whatsappUrl } from '../config/company';

const initialForm = { full_name: '', phone: '', email: '', company_name: '', country: 'India', business_type: '', project_description: '', preferred_contact: 'whatsapp' };

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const item = items[0];

  const validate = () => {
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'Full name is required.';
    if (!/^\+?[0-9\s-]{8,16}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.project_description.trim()) next.project_description = 'Please describe your project.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMessage = summary => {
    const addonLines = (summary?.addons || item?.addons || []).map(entry => {
      const addon = entry.addon || entry;
      const quantity = entry.quantity || 1;
      const lineTotal = entry.line_total ?? effectivePrice(addon) * quantity;
      return `${addon.name} × ${quantity} — ${formatPrice(lineTotal)}`;
    });
    return `Hi SiteArvo,\n\nI would like to order a website/service package.\n\nReference: ${summary?.order_id || 'New enquiry'}\nPackage: ${summary?.service_name || item?.service.title}\nBase Price: ${formatPrice(summary?.base_price ?? effectivePrice(item?.service))}\nAdd-ons:\n${addonLines.length ? addonLines.join('\n') : 'None'}\n\nTotal: ${formatPrice(summary?.total ?? total)}\n\nName: ${form.full_name}\nCompany: ${form.company_name || 'Not provided'}\nPhone: ${form.phone}\nEmail: ${form.email}\nCountry: ${form.country}\nBusiness Type: ${form.business_type || 'Not provided'}\nPreferred Contact: ${form.preferred_contact}\n\nProject Details:\n${form.project_description}`;
  };

  const submit = async event => {
    event.preventDefault();
    if (!validate() || !item) return;
    setSubmitting(true);
    setStatus('');
    try {
      const summary = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ ...form, service_id: item.serviceId, addons: item.addons.map(selection => ({ addon_id: selection.addon.id, quantity: selection.quantity })) }) });
      window.open(whatsappUrl(createMessage(summary)), '_blank', 'noopener,noreferrer');
      setCompletedOrder(summary);
      clear();
      setStatus(`Enquiry ${summary.order_id} was recorded. WhatsApp has been opened with the verified order summary.`);
    } catch (error) {
      setStatus(error.status === 503 ? 'Ordering API is not configured yet. Ask SiteArvo to complete the database setup before accepting fixed-price orders.' : error.message);
    } finally { setSubmitting(false); }
  };

  if (completedOrder) return <><SEO title="Enquiry Recorded" description="Your SiteArvo service enquiry has been recorded." path="/checkout" noIndex /><section className="service-not-found"><div className="container"><span className="eyebrow">Enquiry recorded</span><h1>Your Project Details Are Ready</h1><p>Reference <b>{completedOrder.order_id}</b> was saved with the server-verified total of <b>{formatPrice(completedOrder.total)}</b>. WhatsApp was opened with the full order summary; no payment has been collected.</p><a className="button" href={whatsappUrl(createMessage(completedOrder))} target="_blank" rel="noreferrer"><MessageCircle /> Continue on WhatsApp</a> <Link className="button button--secondary" to="/services">Browse More Services</Link></div></section></>;
  if (!item) return <><SEO title="Service Checkout" description="Complete a SiteArvo fixed-price service enquiry." path="/checkout" noIndex /><section className="service-not-found"><div className="container"><h1>No Package Selected</h1><p>Add a fixed-price package before checking out.</p><button className="button" type="button" onClick={() => navigate('/pricing')}>Browse Packages</button></div></section></>;

  return <>
    <SEO title="Service Checkout" description="Send your SiteArvo service package enquiry with a clear, verified order summary." path="/checkout" noIndex />
    <PageHero eyebrow="Project details" title="Complete Your Enquiry">No payment is collected. Your prices are verified by the server and the complete order is sent to SiteArvo.</PageHero>
    <section className="section"><div className="container checkout-layout"><form className="checkout-form" onSubmit={submit} noValidate><div className="form-grid">{[
      ['full_name', 'Full Name *', 'text'], ['phone', 'Phone *', 'tel'], ['email', 'Email *', 'email'], ['company_name', 'Company Name', 'text'], ['country', 'Country', 'text'], ['business_type', 'Business Type', 'text'],
    ].map(([name, label, type]) => <label key={name}>{label}<input type={type} value={form[name]} onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))} aria-invalid={Boolean(errors[name])} />{errors[name] && <small className="field-error">{errors[name]}</small>}</label>)}</div><label>Preferred Contact Method<select value={form.preferred_contact} onChange={event => setForm(current => ({ ...current, preferred_contact: event.target.value }))}><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option><option value="email">Email</option></select></label><label>Project Description *<textarea rows="6" value={form.project_description} onChange={event => setForm(current => ({ ...current, project_description: event.target.value }))} aria-invalid={Boolean(errors.project_description)} />{errors.project_description && <small className="field-error">{errors.project_description}</small>}</label>{status && <div className="form-status" role="status">{status}</div>}<button className="button" disabled={submitting} type="submit"><MessageCircle /> {submitting ? 'Verifying Prices...' : 'Order on WhatsApp'}</button></form><aside className="order-summary"><span>Order summary</span><h2>{item.service.title}</h2><div><span>Base</span><strong>{formatPrice(effectivePrice(item.service))}</strong></div>{item.addons.map(selection => <div key={selection.addon.id}><span>{selection.addon.name} × {selection.quantity}</span><strong>{formatPrice(effectivePrice(selection.addon) * selection.quantity)}</strong></div>)}<div className="order-total"><span>Total</span><strong>{formatPrice(total)}</strong></div><p>No payment is collected on this website.</p><a href={phoneUrl()} className="text-link"><Phone /> Call {company.phone}</a><a href={`mailto:${company.email}`} className="text-link"><Mail /> {company.email}</a><Link to="/cart" className="button button--secondary">Back to Cart</Link></aside></div></section>
  </>;
}
