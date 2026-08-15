import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import { trackAnalyticsEvent } from '../components/Analytics';
import { useCart } from '../cart/CartContext';
import { effectivePrice, formatPrice } from '../catalog/format';
import { formatConfiguratorMoney } from '../data/configurator';

export default function Cart() {
  const { items, removeItem, updateAddons, subtotal, addonsTotal, recurringTotal, grandTotal } = useCart();

  useEffect(() => {
    trackAnalyticsEvent('cart_viewed', { onceKey: 'cart_viewed' });
  }, []);

  const item = items[0];
  const changeQuantity = (cartItem, selection, quantity) => {
    if (cartItem.kind === 'website-configurator') return;
    updateAddons(cartItem.serviceId, cartItem.addons.map(current => current.addon.id === selection.addon.id ? { ...current, quantity: Math.max(0, quantity) } : current).filter(current => current.quantity > 0));
  };

  return <>
    <SEO title="Service Cart" description="Review your selected SiteArvo package, add-ons and estimated final price." path="/cart" noIndex />
    <PageHero eyebrow="Your selection" title="Your Cart">Review the package, optional add-ons and price before sending your project details.</PageHero>
    <section className="section"><div className="container cart-layout">
      <div className="cart-items">
        {items.length ? items.map(cartItem => {
          if (cartItem.kind === 'website-configurator') {
            const summary = cartItem.configurationSummary || cartItem.configuration?.summary || {};
            return <article className="cart-item cart-item--configurator" key={cartItem.configuration?.configuration_id || cartItem.configurationSummary?.configurationId || cartItem.slug}>
              <header>
                <div>
                  <span>Website Configuration</span>
                  <h2>{cartItem.configuration?.configuration_title || summary.configurationTitle || 'Customized Website'}</h2>
                </div>
                <div className="cart-item__actions">
                  <Link className="text-link" to="/website-builder?edit=1">Edit Configuration</Link>
                  <button type="button" className="icon-button" onClick={() => removeItem(cartItem.serviceId || cartItem.slug)} aria-label="Remove configuration"><Trash2 /></button>
                </div>
              </header>
              <div className="cart-line"><span>Configuration ID</span><strong>{cartItem.configuration?.configuration_id || summary.configurationId || '—'}</strong></div>
              <div className="cart-line"><span>One-Time Total</span><strong>{formatConfiguratorMoney(summary.oneTimeTotal || cartItem.subtotal || 0)}</strong></div>
              <div className="cart-line"><span>Recurring</span><strong>{summary.recurringTotal ? `${formatConfiguratorMoney(summary.recurringTotal)}${summary.recurringMonthly ? '/month' : '/year'}` : '—'}</strong></div>
              <div className="cart-line"><span>Total Pages</span><strong>{summary.totalPages || '—'}</strong></div>
              <div className="cart-config-summary">
                {(summary.items || []).map(selection => <div key={`${selection.groupSlug}-${selection.optionId}`}><b>{selection.optionName}</b><small>{selection.quantity > 1 ? `× ${selection.quantity}` : ''}{selection.lineTotal === null ? 'Custom Quote' : ` ${formatConfiguratorMoney(selection.lineTotal)}`}</small></div>)}
              </div>
              <Link className="button button--secondary" to="/website-builder?edit=1">Edit Configuration</Link>
            </article>;
          }

          const features = (cartItem.service.features || []).map(feature => typeof feature === 'string' ? feature : feature.name).filter(Boolean);
          return <article className="cart-item" key={cartItem.serviceId}>
            <header>
              <div>
                <span>{cartItem.service.categoryTitle || 'Primary package'}</span>
                <h2>{cartItem.service.title}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => removeItem(cartItem.serviceId)} aria-label={`Remove ${cartItem.service.title}`}><Trash2 /></button>
            </header>
            <div className="cart-line"><span>Package price</span><strong>{formatPrice(effectivePrice(cartItem.service))}</strong></div>
            {(cartItem.service.pagesIncluded || features.length > 0) && <div className="cart-included"><b>Included</b>{cartItem.service.pagesIncluded && <span>{cartItem.service.pagesIncluded} Pages</span>}{features.slice(0, 5).map(feature => <span key={feature}>{feature}</span>)}</div>}
            {cartItem.addons.length > 0 && <h3 className="cart-addon-heading">Add-ons</h3>}
            {cartItem.addons.map(selection => <div className="cart-addon" key={selection.addon.id}><div><b>{selection.addon.name}</b><small>{formatPrice(effectivePrice(selection.addon))} × {selection.quantity}</small><button type="button" className="cart-remove-addon" onClick={() => changeQuantity(cartItem, selection, 0)}>Remove</button></div><div className="quantity-control"><button type="button" onClick={() => changeQuantity(cartItem, selection, selection.quantity - 1)} aria-label={`Reduce ${selection.addon.name}`}><Minus /></button><output aria-label={`${selection.addon.name} quantity`}>{selection.quantity}</output><button type="button" onClick={() => changeQuantity(cartItem, selection, selection.quantity + 1)} aria-label={`Increase ${selection.addon.name}`}><Plus /></button></div><strong>{formatPrice(effectivePrice(selection.addon) * selection.quantity)}</strong></div>)}
            <Link className="text-link" to={`/services/${cartItem.slug}`}>Customize package</Link>
          </article>;
        }) : <div className="empty-cart"><ShoppingBag /><h2>Your service cart is empty</h2><p>Choose a configured fixed-price package to get started.</p><Link className="button" to="/pricing">Browse Packages</Link></div>}
      </div>
      {items.length > 0 && <aside className="order-summary"><span>Order summary</span><div><span>Package</span><strong>{formatPrice(subtotal)}</strong></div><div><span>Add-ons</span><strong>{formatPrice(addonsTotal)}</strong></div>{recurringTotal > 0 && <div><span>Recurring</span><strong>{formatPrice(recurringTotal)}</strong></div>}<div className="order-total"><span>Total</span><strong>{formatPrice(grandTotal)}</strong></div><p>Prices are rechecked securely against the live catalog before your enquiry is recorded.</p><Link className="button" to="/checkout">Proceed to Checkout</Link><Link className="button button--secondary" to="/services">Continue Browsing</Link></aside>}
    </div></section>
  </>;
}
