import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../config/company';

export default function CTA() {
  const url = whatsappUrl();
  return <section className="cta-section section"><div className="container cta-box"><div><span className="eyebrow">Start a conversation</span><h2>Have a Project in Mind?</h2><p>Let's build a website that looks great, performs fast and helps your business grow.</p></div><div className="cta-actions"><Link className="button" to="/contact">Get a Free Quote</Link>{url && <a className="button button--secondary" href={url} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chat on WhatsApp</a>}</div></div></section>;
}
