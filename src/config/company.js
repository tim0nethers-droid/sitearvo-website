export const company = {
  name: 'SiteArvo',
  email: 'info@sitearvo.site',
  phone: '+91 7987591456',
  phoneRaw: '917987591456',
  whatsapp: '917987591456',
  location: 'India',
  domain: 'https://sitearvo.site',
};

export const isConfiguredContact = value => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return Boolean(normalized) && normalized !== '#' && !/^YOUR_/i.test(normalized) && !/X{4,}/i.test(normalized);
};

export const phoneUrl = () => {
  if (!isConfiguredContact(company.phoneRaw)) return null;
  return `tel:+${company.phoneRaw.replace(/\D/g, '')}`;
};

export const whatsappUrl = (message = 'Hi SiteArvo, I am interested in website development services.') => {
  if (!isConfiguredContact(company.whatsapp)) return null;
  const number = company.whatsapp.replace(/\D/g, '');
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

export const contactAvailability = {
  email: isConfiguredContact(company.email),
  phone: isConfiguredContact(company.phone) && isConfiguredContact(company.phoneRaw),
  whatsapp: isConfiguredContact(company.whatsapp),
  instagram: false,
  linkedin: false,
};
