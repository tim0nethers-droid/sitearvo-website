import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../config/company';

export default function WhatsAppButton() {
  const url = whatsappUrl();
  if (!url) return null;
  return <a className="whatsapp-float" href={url} target="_blank" rel="noreferrer" aria-label="Chat with SiteArvo on WhatsApp"><MessageCircle aria-hidden="true" /></a>;
}
