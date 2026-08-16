import { MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import { trackAnalyticsEvent } from '../components/Analytics';
import { useCart } from '../cart/CartContext';
import { apiFetch } from '../catalog/api';
import { AppIcon } from '../catalog/icons';
import { effectivePrice, formatPrice } from '../catalog/format';
import { company, phoneUrl, whatsappUrl } from '../config/company';
import { formatConfiguratorMoney } from '../data/configurator';

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
  const configurationSummary = item?.configurationSummary || item?.configuration?.summary || null;

  useEffect(() => {
    if (!item) return;
    trackAnalyticsEvent('checkout_started', {
      service_id: item?.serviceId || item?.service?.id || item?.configuration?.configuration_id || 'website-configurator',
      service_slug: item?.slug || item?.service?.slug || 'website-configurator',
      service_name: item?.service?.title || item?.service?.name || configurationSummary?.configurationTitle || 'Customized Website',
      package_name: item?.service?.title || item?.service?.name || configurationSummary?.configurationTitle || 'Customized Website',
      onceKey: `checkout_started:${item?.slug || item?.serviceId || configurationSummary?.configurationId || 'unknown'}`,
    });
    if (item.kind === 'website-configurator') {
      trackAnalyticsEvent('configurator_checkout_started', {
        service_id: 'website-configurator',
        service_slug: 'website-configurator',
        service_name: 'Customized Website',
        package_name: 'Customized Website',
        configuration_id: configurationSummary?.configurationId || item?.configuration?.configuration_id || 'unknown',
        onceKey: `configurator_checkout_started:${item?.configuration?.configuration_id || configurationSummary?.configurationId || 'unknown'}`,
      });
    }
  }, [item, configurationSummary]);

  const validate = () => {
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'Full name is required.';
    if (!/^\+?[0-9\s-]{8,16}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.project_description.trim()) next.project_description = 'Please describe your project.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createServiceMessage = summary => {
    const addonLines = (summary?.addons || item?.addons || []).map(entry => {
      const addon = entry.addon || entry;
      const quantity = entry.quantity || 1;
      const lineTotal = entry.line_total ?? effectivePrice(addon) * quantity;
      return `${addon.name} × ${quantity} — ${formatPrice(lineTotal)}`;
    });
    return `Hi SiteArvo,\n\nI would like to order a website/service package.\n\nReference: ${summary?.order_id || 'New enquiry'}\nPackage: ${summary?.service_name || item.service.title}\nBase Price: ${formatPrice(summary?.base_price ?? effectivePrice(item?.service))}\nAdd-ons:\n${addonLines.length ? addonLines.join('\n') : 'None'}\n\nTotal: ${formatPrice(summary?.total ?? total)}\n\nName: ${form.full_name}\nCompany: ${form.company_name || 'Not provided'}\nPhone: ${form.phone}\nEmail: ${form.email}\nCountry: ${form.country}\nBusiness Type: ${form.business_type || 'Not provided'}\nPreferred Contact: ${form.preferred_contact}\n\nProject Details:\n${form.project_description}`;
  };

  const createConfiguratorMessage = summary => {
    const recurring = [];
    if (summary?.recurringMonthly) recurring.push(`Monthly Recurring: ${formatConfiguratorMoney(summary.recurringMonthly)}/month`);
    if (summary?.recurringYearly) recurring.push(`Yearly Recurring: ${formatConfiguratorMoney(summary.recurringYearly)}/year`);
    return `Hi SiteArvo,\n\nI have configured a website package.\n\nConfiguration ID: ${summary?.configurationId || item?.configuration?.configuration_id || 'New configuration'}\n\nPages:\n${summary?.selectedPagePackage?.name || 'Not selected'}\n\nTechnology:\n${summary?.selectedTechnology?.name || 'Not selected'}\n\nSelected Services:\n${(summary?.items || []).length ? summary.items.map(selection => `- ${selection.optionName}${selection.quantity > 1 ? ` × ${selection.quantity}` : ''}${selection.lineTotal === null ? ' — Quote required' : ` — ${formatConfiguratorMoney(selection.lineTotal)}`}`).join('\n') : 'None'}\n\nTotal Pages: ${summary?.totalPages || 0}\n\nOne-Time Total: ${formatConfiguratorMoney(summary?.oneTimeTotal || total)}\n${recurring.length ? `${recurring.join('\n')}\n` : ''}\n${summary?.requiresQuote ? '\nNote: Some selections require a custom quote.' : ''}\n\nName: ${form.full_name}\nCompany: ${form.company_name || 'Not provided'}\nPhone: ${form.phone}\nEmail: ${form.email}\n\nPlease contact me regarding this website.`;
  };

  const submit = async event => {
    event.preventDefault();
    if (!validate() || !item) return;
    setSubmitting(true);
    setStatus('');
    try {
      const isConfigurator = item.kind === 'website-configurator';
      const summary = isConfigurator ? (item.configurationSummary || item.configuration?.summary || null) : null;
      const message = isConfigurator ? createConfiguratorMessage(summary) : createServiceMessage();

      if (isConfigurator && summary?.requiresQuote) {
        window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
        setStatus('Your project details are ready. Continue on WhatsApp to send your enquiry, or connect a form service before production.');
        trackAnalyticsEvent('configurator_order_submitted', {
          service_id: 'website-configurator',
          service_slug: 'website-configurator',
          service_name: 'Customized Website',
          package_name: 'Customized Website',
          configuration_id: summary?.configurationId || item?.configuration?.configuration_id || 'unknown',
          requires_quote: true,
          onceKey: `configurator_order_submitted:${summary?.configurationId || item?.configuration?.configuration_id || 'unknown'}`,
        });
        return;
      }

      const payload = isConfigurator
        ? { ...form, configuration: item.configuration || { selection_state: summary?.selectionState || {} } }
        : { ...form, service_id: item.serviceId, service_slug: item.slug, addons: item.addons.map(selection => ({ addon_id: selection.addon.id, quantity: selection.quantity })) };

      const result = await apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });
      window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
      setCompletedOrder(result);
      clear();
      trackAnalyticsEvent('checkout_completed', {
        order_id: result.order_id,
        service_id: item.serviceId || item?.service?.id || item?.configuration?.configuration_id || 'website-configurator',
        service_slug: item.slug || item?.service?.slug || 'website-configurator',
        service_name: result.service_name || item?.service?.title || item?.service?.name || summary?.configurationTitle || 'Customized Website',
        package_name: result.service_name || item?.service?.title || item?.service?.name || summary?.configurationTitle || 'Customized Website',
        onceKey: `checkout_completed:${result.order_id}`,
      });
      if (isConfigurator) {
        trackAnalyticsEvent('configurator_order_submitted', {
          service_id: 'website-configurator',
          service_slug: 'website-configurator',
          service_name: 'Customized Website',
          package_name: 'Customized Website',
          configuration_id: summary?.configurationId || item?.configuration?.configuration_id || result.order_id || 'unknown',
          order_id: result.order_id,
          requires_quote: Boolean(summary?.requiresQuote),
          onceKey: `configurator_order_submitted:${result.order_id}`,
        });
      }
      setStatus(`Project ${result.order_id} was recorded. WhatsApp has been opened with the verified order summary.`);
    } catch (error) {
      if (error.status === 409 && item.kind === 'website-configurator') {
        window.open(whatsappUrl(createConfiguratorMessage(configurationSummary)), '_blank', 'noopener,noreferrer');
        setStatus('Some selections require a custom quote. WhatsApp has been opened with the full configuration.');
      } else {
        setStatus(error.status === 503 ? 'Ordering API is not configured yet. Ask SiteArvo to complete the database setup before accepting fixed-price orders.' : error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (completedOrder) return <><SEO title="Enquiry Recorded" description="Your SiteArvo service enquiry has been recorded." path="/checkout" noIndex /><section className="service-not-found"><div className="container"><span className="eyebrow">Enquiry recorded</span><h1>Your Project Details Are Ready</h1><p>Reference <b>{completedOrder.order_id}</b> was saved with the server-verified total of <b>{formatPrice(completedOrder.total)}</b>. WhatsApp was opened with the full order summary; no payment has been collected.</p><a className="button" href={whatsappUrl(item?.kind === 'website-configurator' ? createConfiguratorMessage(item.configurationSummary || item.configuration?.summary || {}) : createServiceMessage(completedOrder))} target="_blank" rel="noreferrer"><AppIcon icon="message-circle" /> Continue on WhatsApp</a> <Link className="button button--secondary" to="/services">Browse More Services</Link></div></section></>;
  if (!item) return <><SEO title="Service Checkout" description="Complete a SiteArvo fixed-price service enquiry." path="/checkout" noIndex /><section className="service-not-found"><div className="container"><h1>No Package Selected</h1><p>Add a fixed-price package before checking out.</p><button className="button" type="button" onClick={() => navigate('/pricing')}>Browse Packages</button></div></section></>;

  const isConfigurator = item.kind === 'website-configurator';
  const summary = isConfigurator ? (item.configurationSummary || item.configuration?.summary || null) : null;

  return <>
    <SEO title="Service Checkout" description="Send your SiteArvo service package enquiry with a clear, verified order summary." path="/checkout" noIndex />
    <PageHero eyebrow="Project details" title="Complete Your Enquiry">No payment is collected. Your prices are verified by the server and the complete order is sent to SiteArvo.</PageHero>
    <section className="section"><div className="container checkout-layout"><form className="checkout-form" onSubmit={submit} noValidate><div className="form-grid">{[
      ['full_name', 'Full Name *', 'text'], ['phone', 'Phone *', 'tel'], ['email', 'Email *', 'email'], ['company_name', 'Company Name', 'text'], ['country', 'Country', 'text'], ['business_type', 'Business Type', 'text'],
    ].map(([name, label, type]) => <label key={name}>{label}<input type={type} value={form[name]} onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))} aria-invalid={Boolean(errors[name])} />{errors[name] && <small className="field-error">{errors[name]}</small>}</label>)}</div><label>Preferred Contact Method<select value={form.preferred_contact} onChange={event => setForm(current => ({ ...current, preferred_contact: event.target.value }))}><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option><option value="email">Email</option></select></label><label>Project Description *<textarea rows="6" value={form.project_description} onChange={event => setForm(current => ({ ...current, project_description: event.target.value }))} aria-invalid={Boolean(errors.project_description)} />{errors.project_description && <small className="field-error">{errors.project_description}</small>}</label>{status && <div className="form-status" role="status">{status}</div>}<button className="button" disabled={submitting} type="submit"><AppIcon icon="message-circle" /> {submitting ? 'Verifying Prices...' : isConfigurator ? 'Order on WhatsApp' : 'Order on WhatsApp'}</button></form><aside className="order-summary"><span>Order summary</span><h2>{isConfigurator ? summary?.configurationTitle || 'Customized Website' : item.service.title}</h2>{isConfigurator ? <>{summary?.items?.map(selection => <div key={`${selection.groupSlug}-${selection.optionId}`}><span>{selection.optionName}{selection.quantity > 1 ? ` × ${selection.quantity}` : ''}</span><strong>{selection.lineTotal === null ? 'Quote required' : formatConfiguratorMoney(selection.lineTotal)}</strong></div>)}<div><span>One-Time</span><strong>{formatConfiguratorMoney(summary?.oneTimeTotal || 0)}</strong></div>{summary?.recurringMonthly ? <div><span>Recurring Monthly</span><strong>{formatConfiguratorMoney(summary.recurringMonthly)}/month</strong></div> : null}{summary?.recurringYearly ? <div><span>Recurring Yearly</span><strong>{formatConfiguratorMoney(summary.recurringYearly)}/year</strong></div> : null}<div className="order-total"><span>Total</span><strong>{formatConfiguratorMoney(summary?.oneTimeTotal || 0)}</strong></div><p>{summary?.requiresQuote ? 'Some selections require a custom quote.' : 'One-time and recurring services are shown separately.'}</p></> : <>{<><div><span>Base</span><strong>{formatPrice(effectivePrice(item.service))}</strong></div>{item.addons.map(selection => <div key={selection.addon.id}><span>{selection.addon.name} × {selection.quantity}</span><strong>{formatPrice(effectivePrice(selection.addon) * selection.quantity)}</strong></div>)}</>}<div className="order-total"><span>Total</span><strong>{formatPrice(total)}</strong></div><p>No payment is collected on this website.</p></>}<a href={phoneUrl()} className="text-link"><AppIcon icon="phone" /> Call {company.phone}</a><a href={`mailto:${company.email}`} className="text-link"><AppIcon icon="mail" /> {company.email}</a><Link to="/cart" className="button button--secondary">Back to Cart</Link></aside></div></section>
  </>;
}

