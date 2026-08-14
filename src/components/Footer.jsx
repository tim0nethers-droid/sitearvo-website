import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Logo from './Logo';
import { company, contactAvailability, phoneUrl, whatsappUrl } from '../config/company';

const serviceGroups = [
  ['Web', [['Website Design', 'website-designing'], ['ReactJS', 'reactjs-development'], ['Node.js', 'nodejs-development'], ['WordPress', 'wordpress-development']]],
  ['Mobile', [['Android', 'android-app-development'], ['iOS', 'ios-app-development'], ['React Native', 'react-native-app-development']]],
  ['E-commerce', [['Shopify', 'shopify-development'], ['WooCommerce', 'woocommerce-development'], ['Magento', 'magento-development']]],
  ['Marketing', [['SEO', 'seo'], ['PPC', 'pay-per-click-advertising'], ['Social Media', 'social-media-marketing']]],
];

export default function Footer() {
  const whatsapp = whatsappUrl();
  return <footer className="footer">
    <div className="container footer-grid footer-services-grid">
      <div className="footer-brand"><Logo footer /><p>Modern websites designed to help businesses grow online.</p><div className="footer-contact"><MapPin size={17} /> {company.location}</div><Link to="/services" className="text-link footer-view-all">View All Services</Link></div>
      {serviceGroups.map(([title, links]) => <div key={title}><h3>{title}</h3>{links.map(([label, slug]) => <Link key={slug} to={`/services/${slug}`}>{label}</Link>)}</div>)}
    </div>
    <div className="container footer-utility"><nav aria-label="Footer company links"><Link to="/about">About</Link><Link to="/industries">Industries</Link><Link to="/portfolio">Portfolio</Link><Link to="/pricing">Pricing</Link><Link to="/contact">Contact</Link><Link to="/privacy-policy">Privacy Policy</Link><Link to="/terms-and-conditions">Terms &amp; Conditions</Link></nav><div className="footer-connect">{contactAvailability.email && <a href={`mailto:${company.email}`}><Mail /> {company.email}</a>}{contactAvailability.phone && <a href={phoneUrl()}><Phone /> {company.phone}</a>}{contactAvailability.whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>}</div></div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} SiteArvo. All Rights Reserved.</span><span>Design • Develop • Grow</span></div>
  </footer>;
}
