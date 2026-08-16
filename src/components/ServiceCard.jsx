import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../catalog/icons';

export default function ServiceCard({ icon: Icon, title, description, href = '/services' }) {
  return <article className="card service-card"><div className="icon-box"><AppIcon icon={Icon} size={20} /></div><h3>{title}</h3><p>{description}</p><Link to={href} className="text-link">Learn More <ArrowUpRight size={17} /></Link></article>;
}
