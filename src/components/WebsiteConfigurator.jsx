import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '../cart/CartContext';
import { useConfigurator } from '../configurator/ConfiguratorContext';
import { buildConfiguratorSelectionState, createConfiguratorSnapshot, formatConfiguratorMoney, getConfiguratorCompletionState, normalizeConfiguratorGroups } from '../data/configurator';
import { AppIcon } from '../catalog/icons';
import { priceLabel } from '../catalog/format';
import { trackAnalyticsEvent } from './Analytics';
import { whatsappUrl } from '../config/company';

const groupIconMap = {
  'page-packages': 'layers3',
  technology: 'brain-circuit',
  'domain-hosting': 'globe',
  design: 'palette',
  marketing: 'megaphone',
  support: 'wrench',
};

const resolvePresetSelection = (groups = [], presetPackage = null) => {
  if (!presetPackage) return {};
  const normalizedGroups = normalizeConfiguratorGroups(groups);
  const pageGroup = normalizedGroups.find(group => group.slug === 'page-packages');
  if (!pageGroup) return {};
  const targetSlug = String(presetPackage.pagePackageSlug || presetPackage.slug || '').toLowerCase();
  const targetPages = Number(
    presetPackage.pagesIncluded
    ?? presetPackage.pages_included
    ?? targetSlug.match(/(\d+)\s*-/)?.[1]
    ?? targetSlug.match(/(\d+)/)?.[1]
    ?? presetPackage.title?.match(/(\d+)/)?.[1]
    ?? presetPackage.name?.match(/(\d+)/)?.[1]
    ?? 0,
  ) || 0;
  const selected = pageGroup.options.find(option => String(option.id || '').toLowerCase() === targetSlug)
    || pageGroup.options.find(option => Number(option.page_delta || 0) === targetPages);
  return selected ? { [pageGroup.slug]: { selectedId: selected.id } } : {};
};

export default function WebsiteConfigurator({
  compact = false,
  className = '',
  editConfiguration = null,
  onEditComplete = null,
  presetPackage = null,
  onAddedToCart = null,
  autoNavigateToCart = true,
}) {
  const navigate = useNavigate();
  const { groups, settings, loading, error } = useConfigurator();
  const { items, addConfiguredItem } = useCart();
  const activeGroups = useMemo(() => normalizeConfiguratorGroups(groups).filter(group => group.active !== false), [groups]);
  const presetSelectionState = useMemo(() => resolvePresetSelection(activeGroups, presetPackage), [activeGroups, presetPackage]);
  const [selectionState, setSelectionState] = useState(() => buildConfiguratorSelectionState(activeGroups, {
    ...presetSelectionState,
    ...(editConfiguration?.selection_state || editConfiguration?.selectionState || editConfiguration?.configuration?.selection_state || {}),
  }));

  useEffect(() => {
    if (!activeGroups.length) return;
    const existing = editConfiguration?.selection_state || editConfiguration?.selectionState || editConfiguration?.configuration?.selection_state || {};
    setSelectionState(buildConfiguratorSelectionState(activeGroups, {
      ...presetSelectionState,
      ...existing,
    }));
  }, [activeGroups, editConfiguration, presetSelectionState]);

  const summary = useMemo(() => createConfiguratorSnapshot(activeGroups, selectionState).summary, [activeGroups, selectionState]);
  const completionState = useMemo(() => getConfiguratorCompletionState(activeGroups, selectionState), [activeGroups, selectionState]);
  const selectedCartItem = items.find(item => item.kind === 'website-configurator');
  const isEditingCartItem = Boolean(editConfiguration || selectedCartItem);

  const buildWhatsAppMessage = useMemo(() => {
    const selectedItems = summary.items.map(item => {
      const quantityLabel = item.quantity > 1 ? ` x ${item.quantity}` : '';
      const period = item.billingPeriod && item.billingPeriod !== 'one-time' ? ` (${item.billingPeriod})` : '';
      return `- ${item.optionName}${quantityLabel}${period}${item.lineTotal === null ? ' - Quote required' : ` - ${formatConfiguratorMoney(item.lineTotal)}`}`;
    });
    const recurringLines = [];
    if (summary.recurringMonthly) recurringLines.push(`Monthly Recurring: ${formatConfiguratorMoney(summary.recurringMonthly)}/month`);
    if (summary.recurringYearly) recurringLines.push(`Yearly Recurring: ${formatConfiguratorMoney(summary.recurringYearly)}/year`);
    return `Hi SiteArvo,\n\nI have configured a website package.\n\nConfiguration ID: ${summary.configurationId}\n\nPages:\n${summary.selectedPagePackage?.name || 'Not selected'}\n\nTechnology:\n${summary.selectedTechnology?.name || 'Not selected'}\n\nSelected Services:\n${selectedItems.length ? selectedItems.join('\n') : 'None'}\n\nTotal Pages: ${summary.totalPages || 0}\n\nOne-Time Total: ${formatConfiguratorMoney(summary.oneTimeTotal)}\n${recurringLines.length ? `${recurringLines.join('\n')}\n` : ''}${summary.requiresQuote ? '\nNote: Some selections require a custom quote.' : ''}\n\nName:\nPhone:\nEmail:\n\nPlease contact me regarding this website.`;
  }, [summary]);

  useEffect(() => {
    if (!activeGroups.length) return;
    trackAnalyticsEvent('configurator_started', {
      source: 'website_builder',
      onceKey: 'configurator_started',
    });
  }, [activeGroups.length]);

  const updateSingle = (group, optionId) => {
    const option = group.options.find(item => item.id === optionId);
    trackAnalyticsEvent(
      group.slug === 'page-packages'
        ? 'configurator_page_package_selected'
        : group.slug === 'technology'
          ? 'configurator_technology_selected'
          : 'configurator_addon_selected',
      {
        source: 'website_builder',
        selection_group: group.slug,
        option_id: option?.id || optionId,
        option_name: option?.name || '',
        price_type: option?.price_type || 'one_time',
        billing_period: option?.billing_period || 'one-time',
        quantity: 1,
      },
    );
    setSelectionState(current => ({ ...current, [group.slug]: { selectedId: optionId } }));
  };
  const toggleMulti = (group, optionId) => setSelectionState(current => {
    const existing = new Set(current[group.slug]?.selectedIds || []);
    const action = existing.has(optionId) ? 'remove' : 'add';
    const option = group.options.find(item => item.id === optionId);
    trackAnalyticsEvent('configurator_addon_selected', {
      source: 'website_builder',
      selection_group: group.slug,
      option_id: option?.id || optionId,
      option_name: option?.name || '',
      action,
      quantity: action === 'remove' ? 0 : 1,
      price_type: option?.price_type || 'one_time',
      billing_period: option?.billing_period || 'one-time',
    });
    if (existing.has(optionId)) existing.delete(optionId); else existing.add(optionId);
    return { ...current, [group.slug]: { selectedIds: [...existing] } };
  });
  const updateQuantity = (group, optionId, delta) => setSelectionState(current => {
    const quantities = { ...(current[group.slug]?.quantities || {}) };
    const next = Math.max(0, Number(quantities[optionId] || 0) + delta);
    if (next <= 0) delete quantities[optionId]; else quantities[optionId] = next;
    const option = group.options.find(item => item.id === optionId);
    trackAnalyticsEvent('configurator_addon_selected', {
      source: 'website_builder',
      selection_group: group.slug,
      option_id: option?.id || optionId,
      option_name: option?.name || '',
      action: 'quantity',
      quantity: next,
      price_type: option?.price_type || 'one_time',
      billing_period: option?.billing_period || 'one-time',
    });
    return { ...current, [group.slug]: { quantities } };
  });

  const selectedTechnology = summary.selectedTechnology?.name || '';
  const selectedPagePackage = summary.selectedPagePackage?.slug || '';
  const selectedPagePackageItem = summary.selectedPagePackage || null;

  const isVisible = option => {
    if (option.active === false) return false;
    if (option.applicable_package_slugs?.length && selectedPagePackage && !option.applicable_package_slugs.includes(selectedPagePackage)) return false;
    if (option.compatible_technologies?.length && selectedTechnology && !option.compatible_technologies.some(item => String(item).toLowerCase() === String(selectedTechnology).toLowerCase())) return false;
    return true;
  };

  const addToCart = () => {
    if (!completionState.isComplete) return;
    const snapshot = createConfiguratorSnapshot(activeGroups, selectionState);
    addConfiguredItem(snapshot, selectionState, activeGroups);
    trackAnalyticsEvent('configurator_added_to_cart', {
      source: 'website_builder',
      configuration_id: snapshot.configuration_id,
      service_id: 'website-configurator',
      service_slug: 'website-configurator',
      package_name: 'Customized Website',
      onceKey: `configurator_added:${snapshot.configuration_id}`,
    });
    onEditComplete?.();
    if (onAddedToCart) {
      onAddedToCart(snapshot);
      return;
    }
    if (autoNavigateToCart) navigate('/cart');
  };

  const orderOnWhatsApp = () => {
    trackAnalyticsEvent('configurator_checkout_started', {
      source: 'website_builder',
      configuration_id: summary.configurationId,
      service_id: 'website-configurator',
      service_slug: 'website-configurator',
      package_name: 'Customized Website',
      onceKey: `configurator_checkout_started:${summary.configurationId}`,
    });
    const url = whatsappUrl(buildWhatsAppMessage);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const resetSelection = () => setSelectionState(buildConfiguratorSelectionState(activeGroups));

  if (loading && !activeGroups.length) return <div className="builder-loading">Loading the latest configurator...</div>;

  return (
    <section className={`website-builder ${className} ${compact ? 'is-compact' : ''}`}>
      {!compact && (
        <header className="builder-intro">
          <span className="eyebrow">Build Your Website</span>
          <h2>{presetPackage?.title ? 'Customize Your Website' : 'Customize Your Website Package'}</h2>
          <p>{presetPackage?.title ? `${presetPackage.title} — ${priceLabel(presetPackage)}. Configure your website and see the total instantly.` : 'Choose your pages, technology and optional services. Your total updates automatically.'}</p>
        </header>
      )}
      {error && <div className="builder-alert" role="status">{error}</div>}
      <div className={`builder-layout ${compact ? 'is-compact' : ''}`}>
        <div className="builder-configurator">
          {activeGroups.map(group => {
            const iconKey = groupIconMap[group.slug] || 'code2';
            const current = selectionState[group.slug] || {};
            return (
              <article className="builder-group" key={group.id}>
                <header className="builder-group__header">
                  <div>
                    <span className="builder-group__eyebrow">{group.selection_type === 'single' ? 'Single select' : group.selection_type === 'multiple' ? 'Multiple select' : 'Quantity'}</span>
                    <h3><AppIcon icon={iconKey} size={18} /> {group.name}</h3>
                    <p>{group.description}</p>
                  </div>
                  {group.required && <span className="builder-required">Required</span>}
                </header>
                {group.slug === 'page-packages' && <p className="builder-page-explanation"><b>What counts as a page?</b> {settings.page_explanation}</p>}
                <div className={`builder-options builder-options--${group.selection_type}`}>
                  {group.options.filter(isVisible).map(option => {
                    const selected = group.selection_type === 'single' ? current.selectedId === option.id : group.selection_type === 'multiple' ? (current.selectedIds || []).includes(option.id) : Number(current.quantities?.[option.id] || 0) > 0;
                    const amount = option.price_type === 'included' ? 'Included' : option.price_type === 'custom_quote' || option.price === null || option.price === undefined ? 'Custom Quote' : `${formatConfiguratorMoney(option.price)}${option.billing_period && option.billing_period !== 'one-time' ? ` / ${option.billing_period}` : ''}`;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={`builder-option ${selected ? 'is-selected' : ''} ${option.featured ? 'is-featured' : ''}`}
                        onClick={() => {
                          if (group.selection_type === 'single') updateSingle(group, option.id);
                          else if (group.selection_type === 'multiple') toggleMulti(group, option.id);
                          else updateQuantity(group, option.id, 1);
                        }}
                      >
                        <span className="builder-option__top"><b>{option.name}</b><small>{amount}</small></span>
                        {option.description && <p>{option.description}</p>}
                        {group.selection_type === 'quantity' ? (
                          <span className="builder-option__qty" onClick={event => event.stopPropagation()}>
                            <button type="button" aria-label={`Decrease ${option.name}`} onClick={() => updateQuantity(group, option.id, -1)}><Minus size={14} /></button>
                            <output>{current.quantities?.[option.id] || 0}</output>
                            <button type="button" aria-label={`Increase ${option.name}`} onClick={() => updateQuantity(group, option.id, 1)}><Plus size={14} /></button>
                          </span>
                        ) : selected && <Check size={16} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        {!compact && (
          <aside className="builder-summary">
            <span className="builder-summary__eyebrow">Your website</span>
            <h3>{summary.configurationTitle}</h3>
            <p>{summary.requiresQuote ? 'A few selected items require a custom quote.' : 'Estimated total updates instantly as you change options.'}</p>
            {selectedPagePackageItem && <div className="builder-summary__base"><span className="builder-summary__base-label">Base Package</span><strong>{selectedPagePackageItem.name || selectedPagePackageItem.title}</strong><small>Included Pages: {selectedPagePackageItem.page_delta || selectedPagePackageItem.pagesIncluded || selectedPagePackageItem.pages_included || 'Custom'}</small><small>Base Price: {formatConfiguratorMoney(selectedPagePackageItem.price ?? selectedPagePackageItem.base_price ?? 0)}</small></div>}
            <div className="builder-summary__stats">
              <div><span>One-Time</span><strong>{formatConfiguratorMoney(summary.oneTimeTotal)}</strong></div>
              <div><span>Recurring</span><strong>{summary.recurringTotal ? `${formatConfiguratorMoney(summary.recurringTotal)}${summary.recurringMonthly ? '/month' : '/year'}` : '—'}</strong></div>
              <div><span>Total Pages</span><strong>{summary.totalPages || '—'}</strong></div>
            </div>
            <div className="builder-summary__line-items">
              {summary.items.map(item => <div key={`${item.groupSlug}-${item.optionId}`}><b>{item.optionName}</b><span>{item.lineTotal === null ? 'Quote required' : formatConfiguratorMoney(item.lineTotal)}{item.quantity > 1 ? ` x ${item.quantity}` : ''}</span></div>)}
            </div>
              <div className="builder-summary__actions">
              <button type="button" className="button" onClick={addToCart} disabled={!completionState.isComplete}><ShoppingCart size={18} /> {isEditingCartItem ? 'Update Cart' : 'Add Customized Package to Cart'}</button>
              <button type="button" className="button button--secondary" onClick={orderOnWhatsApp}><MessageCircle size={18} /> {summary.requiresQuote ? 'Request Quote on WhatsApp' : 'Order on WhatsApp'}</button>
            </div>
            {!completionState.isComplete && <p className="builder-summary__note">Choose {completionState.missingRequiredGroups[0]?.name || 'the required options'} to continue.</p>}
            <button type="button" className="builder-summary__reset" onClick={resetSelection}>Reset configuration</button>
            <p className="builder-summary__note">One-time charges and recurring services are kept separate. You can edit this configuration from the cart later.</p>
          </aside>
        )}
      </div>
      {compact && (
        <div className="builder-compact-footer">
          <div><span>One-Time</span><strong>{formatConfiguratorMoney(summary.oneTimeTotal)}</strong></div>
          <div><span>Recurring</span><strong>{summary.recurringTotal ? `${formatConfiguratorMoney(summary.recurringTotal)}${summary.recurringMonthly ? '/month' : '/year'}` : '—'}</strong></div>
          <button type="button" className="button button--secondary" onClick={() => navigate('/website-builder')}>View Summary</button>
          <button type="button" className="button" onClick={addToCart} disabled={!completionState.isComplete}><ShoppingCart size={18} /> Add to Cart</button>
          <button type="button" className="button button--secondary" onClick={orderOnWhatsApp}><MessageCircle size={18} /> Order on WhatsApp</button>
        </div>
      )}
    </section>
  );
}
