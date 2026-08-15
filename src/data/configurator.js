const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const uid = prefix => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

const clone = value => JSON.parse(JSON.stringify(value));

const option = (id, name, extras = {}) => ({
  id,
  name,
  description: '',
  icon: 'circle-dot',
  price: 0,
  price_type: 'one_time',
  billing_period: 'one-time',
  display_order: 0,
  featured: false,
  active: true,
  page_delta: 0,
  applicable_category_slugs: [],
  applicable_package_slugs: [],
  compatible_technologies: [],
  ...extras,
});

const group = (id, name, selection_type, extras = {}) => ({
  id,
  name,
  slug: extras.slug || id,
  description: '',
  selection_type,
  display_order: 0,
  active: true,
  required: false,
  options: [],
  ...extras,
});

export const defaultConfiguratorGroups = [
  group('page-packages', 'Page Packages', 'single', {
    description: 'Choose the core page bundle for your website.',
    display_order: 1,
    required: true,
    options: [
      option('pages-3', '3 Page Website', { price: 0, page_delta: 3, display_order: 1, featured: false, description: 'Ideal for simple brochure websites.' }),
      option('pages-5', '5 Page Website', { price: 2999, page_delta: 5, display_order: 2, featured: true, description: 'A balanced choice for most business websites.' }),
      option('pages-7', '7 Page Website', { price: 4999, page_delta: 7, display_order: 3, description: 'More space for services, portfolio and credibility.' }),
      option('pages-10', '10 Page Website', { price: 7999, page_delta: 10, display_order: 4, description: 'Best for fuller business sites and richer content.' }),
      option('pages-custom', 'Custom / 10+ Pages', { price_type: 'custom_quote', billing_period: 'one-time', display_order: 5, description: 'For larger or more complex requirements.', page_delta: 0 }),
    ],
  }),
  group('technology', 'Technology', 'single', {
    description: 'Pick the primary platform or stack for the build.',
    display_order: 2,
    required: true,
    options: [
      option('tech-react', 'React', { price: 0, description: 'Fast, modern and reusable component architecture.', featured: true, compatible_technologies: ['React'] }),
      option('tech-wordpress', 'WordPress', { price: 0, price_type: 'included', description: 'Easy content management for business teams.', featured: true, compatible_technologies: ['WordPress'] }),
      option('tech-html', 'HTML/CSS/JavaScript', { price: 0, price_type: 'included', description: 'Lightweight static website stack.', compatible_technologies: ['HTML/CSS/JavaScript'] }),
      option('tech-php', 'PHP', { price: 2500, description: 'Dynamic server-rendered implementation.', compatible_technologies: ['PHP'] }),
      option('tech-laravel', 'Laravel', { price: 6000, description: 'Advanced custom web application development.', compatible_technologies: ['Laravel'] }),
      option('tech-shopify', 'Shopify', { price: 7500, description: 'E-commerce oriented storefronts and product journeys.', compatible_technologies: ['Shopify'], applicable_category_slugs: ['e-commerce'] }),
      option('tech-woocommerce', 'WooCommerce', { price: 5500, description: 'WordPress commerce with a practical checkout flow.', compatible_technologies: ['WooCommerce'], applicable_category_slugs: ['e-commerce'] }),
      option('tech-custom', 'Other / Custom', { price_type: 'custom_quote', billing_period: 'one-time', description: 'Use when the stack depends on the exact project scope.' }),
    ],
  }),
  group('domain-hosting', 'Domain & Hosting', 'multiple', {
    description: 'Recurring essentials for launch, hosting and website connection.',
    display_order: 3,
    options: [
      option('domain-registration', 'Domain Registration', { price: 1200, billing_period: 'yearly', price_type: 'yearly', description: 'Domain setup assistance, DNS configuration and website connection.', featured: true }),
      option('domain-setup', 'Domain Setup Service', { price: 800, price_type: 'one_time', billing_period: 'one-time', description: 'Connect an existing domain and complete technical setup.', featured: false }),
      option('hosting', 'Website Hosting', { price: 2500, billing_period: 'yearly', price_type: 'yearly', description: 'Hosting setup, SSL configuration and deployment assistance.', featured: true }),
    ],
  }),
  group('design', 'Design', 'multiple', {
    description: 'Visual and interaction upgrades for the website.',
    display_order: 4,
    options: [
      option('logo-design', 'Logo Design', { price: 1500, billing_period: 'one-time', price_type: 'one_time', description: 'Concept-based logo design with revisions and final files.' }),
      option('live-chat', 'Website Live Chat', { price: 1500, billing_period: 'one-time', price_type: 'one_time', description: 'Embedded website chat widget or messaging helper.' }),
      option('whatsapp-chat', 'WhatsApp Chat Integration', { price: 900, billing_period: 'one-time', price_type: 'one_time', description: 'Click-to-chat integration using the SiteArvo WhatsApp line.' }),
      option('contact-form', 'Advanced Contact Form', { price: 1800, billing_period: 'one-time', price_type: 'one_time', description: 'Custom form with service selection and enquiry routing.' }),
      option('google-maps', 'Google Maps Embed', { price: 300, billing_period: 'one-time', price_type: 'one_time', description: 'Map embed for location and directions.', featured: false }),
    ],
  }),
  group('marketing', 'Marketing', 'single', {
    description: 'Choose one SEO level for the initial build.',
    display_order: 5,
    options: [
      option('seo-none', 'No SEO Upgrade', { price: 0, price_type: 'included', description: 'No additional SEO setup beyond the base build.' }),
      option('seo-basic', 'Basic SEO', { price: 2500, price_type: 'one_time', billing_period: 'one-time', description: 'Technical and on-page SEO foundations for launch.', featured: true }),
      option('seo-advanced', 'Advanced SEO', { price: 6500, price_type: 'one_time', billing_period: 'one-time', description: 'Deeper SEO setup for a more competitive launch.' }),
    ],
  }),
  group('support', 'Support', 'quantity', {
    description: 'Adjustable recurring and per-page support items.',
    display_order: 6,
    options: [
      option('content-writing', 'Content Writing', { price: 700, price_type: 'per_page', billing_period: 'one-time', description: 'Copywriting per page to help the site launch faster.', page_delta: 0, featured: true }),
      option('additional-page', 'Additional Page', { price: 700, price_type: 'per_item', billing_period: 'one-time', description: 'Add more pages to the selected package.', page_delta: 1, featured: true }),
      option('maintenance-monthly', 'Website Maintenance', { price: 2500, price_type: 'monthly', billing_period: 'monthly', description: 'Ongoing support, updates and maintenance.', featured: true }),
    ],
  }),
];

export const formatConfiguratorMoney = value => {
  const amount = Number(value || 0);
  return amount === 0 ? 'FREE' : currencyFormatter.format(amount);
};

export const isRecurringPriceType = priceType => ['monthly', 'yearly'].includes(String(priceType || '').toLowerCase());

export function cloneConfiguratorGroups(groups = defaultConfiguratorGroups) {
  return clone(groups);
}

export function normalizeConfiguratorGroups(groups = []) {
  return (Array.isArray(groups) && groups.length ? groups : defaultConfiguratorGroups).map((rawGroup, groupIndex) => {
    const groupId = rawGroup.id || rawGroup.slug || uid('group');
    const normalizedGroup = {
      id: groupId,
      name: rawGroup.name || 'Untitled Group',
      slug: rawGroup.slug || String(groupId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      description: rawGroup.description || '',
      selection_type: ['single', 'multiple', 'quantity'].includes(String(rawGroup.selection_type || '').toLowerCase()) ? String(rawGroup.selection_type).toLowerCase() : 'single',
      display_order: Number(rawGroup.display_order ?? groupIndex + 1) || 0,
      active: rawGroup.active === undefined ? true : Boolean(rawGroup.active),
      required: Boolean(rawGroup.required),
      options: [],
    };

    normalizedGroup.options = (Array.isArray(rawGroup.options) && rawGroup.options.length ? rawGroup.options : []).map((rawOption, optionIndex) => ({
      id: rawOption.id || rawOption.slug || uid('option'),
      name: rawOption.name || 'Untitled Option',
      description: rawOption.description || '',
      icon: rawOption.icon || 'circle-dot',
      price: rawOption.price === '' || rawOption.price === null || rawOption.price === undefined ? null : Number(rawOption.price),
      price_type: ['one_time', 'per_page', 'per_item', 'monthly', 'yearly', 'included', 'custom_quote'].includes(String(rawOption.price_type || '').toLowerCase()) ? String(rawOption.price_type).toLowerCase() : 'one_time',
      billing_period: ['one-time', 'monthly', 'yearly'].includes(String(rawOption.billing_period || '').toLowerCase()) ? String(rawOption.billing_period).toLowerCase() : ['monthly', 'yearly'].includes(String(rawOption.price_type || '').toLowerCase()) ? String(rawOption.price_type).toLowerCase() : 'one-time',
      display_order: Number(rawOption.display_order ?? optionIndex + 1) || 0,
      featured: Boolean(rawOption.featured ?? rawOption.is_featured),
      active: rawOption.active === undefined && rawOption.is_active === undefined ? true : Boolean(rawOption.active ?? rawOption.is_active),
      page_delta: Number(rawOption.page_delta ?? rawOption.pages_included ?? 0) || 0,
      applicable_category_slugs: Array.isArray(rawOption.applicable_category_slugs) ? rawOption.applicable_category_slugs.map(String) : Array.isArray(rawOption.category_slugs) ? rawOption.category_slugs.map(String) : [],
      applicable_package_slugs: Array.isArray(rawOption.applicable_package_slugs) ? rawOption.applicable_package_slugs.map(String) : [],
      compatible_technologies: Array.isArray(rawOption.compatible_technologies) ? rawOption.compatible_technologies.map(String) : [],
      quantity_default: Number(rawOption.quantity_default ?? rawOption.default_quantity ?? 0) || 0,
    })).sort((a, b) => a.display_order - b.display_order || String(a.name).localeCompare(String(b.name)));

    return normalizedGroup;
  }).sort((a, b) => a.display_order - b.display_order || String(a.name).localeCompare(String(b.name)));
}

export function buildConfiguratorSelectionState(groups = defaultConfiguratorGroups, existing = {}) {
  const normalizedGroups = normalizeConfiguratorGroups(groups);
  const next = {};
  for (const group of normalizedGroups) {
    const current = existing?.[group.slug] || {};
    if (group.selection_type === 'single') {
      const valid = group.options.find(option => option.id === current.selectedId && option.active !== false);
      const fallback = valid || group.options.find(option => option.active !== false && option.featured) || group.options.find(option => option.active !== false) || group.options[0] || null;
      next[group.slug] = { selectedId: current.selectedId && valid ? current.selectedId : (fallback?.id || '') };
      continue;
    }
    if (group.selection_type === 'quantity') {
      const quantities = {};
      for (const option of group.options) {
        const quantity = Number(current.quantities?.[option.id] ?? current[option.id] ?? 0) || 0;
        if (quantity > 0) quantities[option.id] = quantity;
      }
      next[group.slug] = { quantities };
      continue;
    }
    const selectedIds = Array.isArray(current.selectedIds) ? current.selectedIds : Array.isArray(current.selected) ? current.selected : [];
    next[group.slug] = { selectedIds: selectedIds.filter(selectedId => group.options.some(option => option.id === selectedId && option.active !== false)) };
  }
  return next;
}

export function selectionStateToPayload(selectionState = {}) {
  return clone(selectionState);
}

export function calculateConfiguratorSummary(groups = defaultConfiguratorGroups, selectionState = {}) {
  const normalizedGroups = normalizeConfiguratorGroups(groups);
  const normalizedSelections = buildConfiguratorSelectionState(normalizedGroups, selectionState);
  const items = [];
  let oneTimeTotal = 0;
  let recurringMonthly = 0;
  let recurringYearly = 0;
  let totalPages = 0;
  let requiresQuote = false;
  let selectedPagePackage = null;
  let selectedTechnology = null;

  for (const group of normalizedGroups) {
    if (group.active === false) continue;
    const selection = normalizedSelections[group.slug] || {};
    if (group.selection_type === 'single') {
      const selected = group.options.find(option => option.id === selection.selectedId && option.active !== false);
      if (!selected) continue;
      const quantity = 1;
      const priceType = selected.price_type || 'one_time';
      const rawPrice = selected.price === null || selected.price === undefined ? null : Number(selected.price);
      const lineTotal = priceType === 'included' ? 0 : priceType === 'custom_quote' || rawPrice === null || Number.isNaN(rawPrice) ? null : rawPrice * quantity;
      if (String(group.slug) === 'page-packages') {
        selectedPagePackage = selected;
      }
      if (String(group.slug) === 'technology') {
        selectedTechnology = selected;
      }
      if (lineTotal === null) requiresQuote = true;
      else if (isRecurringPriceType(selected.billing_period || priceType)) {
        if ((selected.billing_period || priceType) === 'monthly') recurringMonthly += lineTotal;
        else recurringYearly += lineTotal;
      } else {
        oneTimeTotal += lineTotal;
      }
      totalPages += Number(selected.page_delta || 0);
      items.push({
        groupId: group.id,
        groupSlug: group.slug,
        groupName: group.name,
        optionId: selected.id,
        optionName: selected.name,
        description: selected.description,
        icon: selected.icon,
        quantity,
        price: rawPrice,
        priceType,
        billingPeriod: selected.billing_period || (isRecurringPriceType(priceType) ? priceType : 'one-time'),
        lineTotal,
        recurringMonthly: (selected.billing_period || priceType) === 'monthly' && lineTotal !== null ? lineTotal : 0,
        recurringYearly: (selected.billing_period || priceType) === 'yearly' && lineTotal !== null ? lineTotal : 0,
        featured: selected.featured,
        included: priceType === 'included',
        pageDelta: Number(selected.page_delta || 0),
      });
      continue;
    }

    if (group.selection_type === 'multiple') {
      for (const selectedId of selection.selectedIds || []) {
        const selected = group.options.find(option => option.id === selectedId && option.active !== false);
        if (!selected) continue;
        const quantity = 1;
        const priceType = selected.price_type || 'one_time';
        const rawPrice = selected.price === null || selected.price === undefined ? null : Number(selected.price);
        const lineTotal = priceType === 'included' ? 0 : priceType === 'custom_quote' || rawPrice === null || Number.isNaN(rawPrice) ? null : rawPrice * quantity;
        if (lineTotal === null) requiresQuote = true;
        else if (isRecurringPriceType(selected.billing_period || priceType)) {
          if ((selected.billing_period || priceType) === 'monthly') recurringMonthly += lineTotal;
          else recurringYearly += lineTotal;
        } else {
          oneTimeTotal += lineTotal;
        }
        totalPages += Number(selected.page_delta || 0);
        items.push({
          groupId: group.id,
          groupSlug: group.slug,
          groupName: group.name,
          optionId: selected.id,
          optionName: selected.name,
          description: selected.description,
          icon: selected.icon,
          quantity,
          price: rawPrice,
          priceType,
          billingPeriod: selected.billing_period || (isRecurringPriceType(priceType) ? priceType : 'one-time'),
          lineTotal,
          recurringMonthly: (selected.billing_period || priceType) === 'monthly' && lineTotal !== null ? lineTotal : 0,
          recurringYearly: (selected.billing_period || priceType) === 'yearly' && lineTotal !== null ? lineTotal : 0,
          featured: selected.featured,
          included: priceType === 'included',
          pageDelta: Number(selected.page_delta || 0),
        });
      }
      continue;
    }

    if (group.selection_type === 'quantity') {
      for (const selectedOption of group.options) {
        const quantity = Math.max(0, Number(selection.quantities?.[selectedOption.id] || 0));
        if (!quantity) continue;
        const priceType = selectedOption.price_type || 'one_time';
        const rawPrice = selectedOption.price === null || selectedOption.price === undefined ? null : Number(selectedOption.price);
        const lineTotal = priceType === 'included' ? 0 : priceType === 'custom_quote' || rawPrice === null || Number.isNaN(rawPrice) ? null : rawPrice * quantity;
        if (lineTotal === null) requiresQuote = true;
        else if (isRecurringPriceType(selectedOption.billing_period || priceType)) {
          if ((selectedOption.billing_period || priceType) === 'monthly') recurringMonthly += lineTotal;
          else recurringYearly += lineTotal;
        } else {
          oneTimeTotal += lineTotal;
        }
        totalPages += Number(selectedOption.page_delta || 0) * quantity;
        items.push({
          groupId: group.id,
          groupSlug: group.slug,
          groupName: group.name,
          optionId: selectedOption.id,
          optionName: selectedOption.name,
          description: selectedOption.description,
          icon: selectedOption.icon,
          quantity,
          price: rawPrice,
          priceType,
          billingPeriod: selectedOption.billing_period || (isRecurringPriceType(priceType) ? priceType : 'one-time'),
          lineTotal,
          recurringMonthly: (selectedOption.billing_period || priceType) === 'monthly' && lineTotal !== null ? lineTotal : 0,
          recurringYearly: (selectedOption.billing_period || priceType) === 'yearly' && lineTotal !== null ? lineTotal : 0,
          featured: selectedOption.featured,
          included: priceType === 'included',
          pageDelta: Number(selectedOption.page_delta || 0),
        });
      }
    }
  }

  return {
    configurationType: 'website-configurator',
    configurationTitle: 'Customized Website',
    configurationId: `WSC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    items,
    selectedPagePackage,
    selectedTechnology,
    totalPages,
    oneTimeTotal: Math.round(oneTimeTotal * 100) / 100,
    recurringMonthly: Math.round(recurringMonthly * 100) / 100,
    recurringYearly: Math.round(recurringYearly * 100) / 100,
    recurringTotal: Math.round((recurringMonthly + recurringYearly) * 100) / 100,
    requiresQuote,
    selectionState: normalizedSelections,
  };
}

export function getConfiguratorCompletionState(groups = defaultConfiguratorGroups, selectionState = {}) {
  const normalizedGroups = normalizeConfiguratorGroups(groups);
  const normalizedSelections = buildConfiguratorSelectionState(normalizedGroups, selectionState);
  const missingRequiredGroups = [];

  for (const group of normalizedGroups) {
    if (group.active === false || !group.required) continue;
    const selection = normalizedSelections[group.slug] || {};
    let hasSelection = false;

    if (group.selection_type === 'single') {
      hasSelection = group.options.some(option => option.active !== false && option.id === selection.selectedId);
    } else if (group.selection_type === 'multiple') {
      hasSelection = (selection.selectedIds || []).some(selectedId => group.options.some(option => option.active !== false && option.id === selectedId));
    } else if (group.selection_type === 'quantity') {
      hasSelection = group.options.some(option => Number(selection.quantities?.[option.id] || 0) > 0 && option.active !== false);
    }

    if (!hasSelection) missingRequiredGroups.push(group);
  }

  return {
    isComplete: missingRequiredGroups.length === 0,
    missingRequiredGroups,
    normalizedSelections,
  };
}

export function createConfiguratorSnapshot(groups = defaultConfiguratorGroups, selectionState = {}) {
  const summary = calculateConfiguratorSummary(groups, selectionState);
  return {
    configuration_type: summary.configurationType,
    configuration_id: summary.configurationId,
    configuration_title: summary.configurationTitle,
    groups: cloneConfiguratorGroups(groups),
    selection_state: selectionStateToPayload(selectionState),
    summary,
  };
}
