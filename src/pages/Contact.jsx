import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import { company, contactAvailability, phoneUrl, whatsappUrl } from '../config/company';
import { serviceBySlug, serviceCategories } from '../data/services';

const initial = { name: '', email: '', phone: '', company: '', projectTitle: '', country: '', service: '', budget: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [searchParams] = useSearchParams();
  const selectedService = serviceBySlug(form.service);
  useEffect(() => {
    const requestedService = searchParams.get('service');
    if (serviceBySlug(requestedService)) setForm(current => ({ ...current, service: requestedService }));
  }, [searchParams]);
  const enquiryMessage = [
    `Hi ${company.name},`,
    '',
    'I would like to discuss a project.',
    '',
    `Name: ${form.name}`,
    `Email: ${form.email}`,
    `Phone: ${form.phone}`,
    `Company: ${form.company || 'Not provided'}`,
    `Project Title: ${form.projectTitle}`,
    `Country: ${form.country}`,
    `Service: ${selectedService?.title || form.service}`,
    `Budget: ${form.budget}`,
    '',
    `Project Details: ${form.message}`,
  ].join('\n');
  const formWhatsAppUrl = whatsappUrl(enquiryMessage);
  const generalWhatsAppUrl = whatsappUrl();
  const update = event => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = event => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Please enter a valid email address.';
    if (!/^[+\d][\d\s-]{7,}$/.test(form.phone)) next.phone = 'Please enter a valid phone number.';
    if (form.projectTitle.trim().length < 2) next.projectTitle = 'Please enter a project title.';
    if (form.country.trim().length < 2) next.country = 'Please enter your country.';
    if (!form.service) next.service = 'Please select a service.';
    if (!form.budget) next.budget = 'Please select a project budget.';
    if (form.message.trim().length < 20) next.message = 'Please share at least 20 characters about your project.';
    setErrors(next);
    if (!Object.keys(next).length) setSubmitted(true);
  };
  return <><SEO title="Contact SiteArvo" description="Tell SiteArvo about your website project and get a clear, no-pressure recommendation for the right next step." path="/contact" /><PageHero eyebrow="Let's talk" title="Let's Build Something Great">Share what you are planning. We will review your requirements and help you find the clearest way forward.</PageHero><section className="section"><div className="container contact-grid"><aside className="contact-aside"><span className="eyebrow">Start a project</span><h2>Good websites start with a good conversation.</h2><p>Whether you need a focused landing page, a complete business website or custom development, tell us what success looks like.</p><div className="contact-options">{contactAvailability.email && <a href={`mailto:${company.email}`}><Mail /><span><b>Email</b>{company.email}</span></a>}{contactAvailability.phone && <a href={phoneUrl()}><Phone /><span><b>Phone</b>{company.phone}</span></a>}{contactAvailability.whatsapp && <a href={generalWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle /><span><b>WhatsApp</b>Start a quick chat</span></a>}<div><MapPin /><span><b>Location</b>{company.location}</span></div><div><Clock3 /><span><b>Response time</b>Usually within one business day</span></div></div></aside><div className="form-panel">{submitted ? <div className="success-message"><span>✓</span><h2>Your project details are ready.</h2><p>{formWhatsAppUrl ? 'Continue on WhatsApp to send your enquiry, or connect a form service before production.' : 'Connect a form service or add the business WhatsApp number in the company configuration before production.'}</p>{formWhatsAppUrl && <a href={formWhatsAppUrl} target="_blank" rel="noreferrer" className="button"><MessageCircle /> Continue on WhatsApp</a>}<button className="text-button" onClick={() => { setSubmitted(false); setForm(initial); }}>Edit or start another enquiry</button></div> : <form onSubmit={submit} noValidate><div className="form-grid"><Field label="Full Name" name="name" value={form.name} onChange={update} error={errors.name} required /><Field label="Email" name="email" type="email" value={form.email} onChange={update} error={errors.email} required /><Field label="Phone" name="phone" type="tel" value={form.phone} onChange={update} error={errors.phone} required /><Field label="Company Name" name="company" value={form.company} onChange={update} /><Field label="Project Title" name="projectTitle" value={form.projectTitle} onChange={update} error={errors.projectTitle} required /><Field label="Country" name="country" value={form.country} onChange={update} error={errors.country} required /><ServiceSelect value={form.service} onChange={update} error={errors.service} /><Select label="Project Budget" name="budget" value={form.budget} onChange={update} error={errors.budget} options={['Under ₹10,000', '₹10,000 – ₹25,000', '₹25,000 – ₹50,000', '₹50,000+', "Let's Discuss"]} /></div><label className="field field--full"><span>Message *</span><textarea name="message" rows="6" value={form.message} onChange={update} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-error' : undefined} placeholder="Tell us about your business, goals and ideal timeline..."></textarea>{errors.message && <small id="message-error">{errors.message}</small>}</label><button className="button submit-button" type="submit">Prepare Project Enquiry <ArrowRight /></button><p className="form-disclaimer">This form validates and prepares your details locally. It does not send data until WhatsApp or a form service is used.</p></form>}</div></div></section></>;
}

function Field({ label, name, type = 'text', value, onChange, error, required }) {
  const errorId = `${name}-error`;
  return <label className="field"><span>{label}{required && ' *'}</span><input type={type} name={name} value={value} onChange={onChange} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />{error && <small id={errorId}>{error}</small>}</label>;
}

function Select({ label, name, value, onChange, error, options }) {
  const errorId = `${name}-error`;
  return <label className="field"><span>{label} *</span><select name={name} value={value} onChange={onChange} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}><option value="">Select an option</option>{options.map(option => <option key={option}>{option}</option>)}</select>{error && <small id={errorId}>{error}</small>}</label>;
}

function ServiceSelect({ value, onChange, error }) {
  const errorId = 'service-error';
  return <label className="field"><span>Service Required *</span><select name="service" value={value} onChange={onChange} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}><option value="">Select a service</option>{serviceCategories.map(category => <optgroup label={category.title} key={category.id}>{category.services.map(service => <option key={service.slug} value={service.slug}>{service.title}</option>)}</optgroup>)}</select>{error && <small id={errorId}>{error}</small>}</label>;
}
