import { Check, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { priceLabel } from '../catalog/format';
import { AppIcon } from '../catalog/icons';

export default function PackageComparison({ packages }) {
  if (packages.length < 2) return null;
  const featureNames = [...new Set(packages.flatMap(item => (item.features || []).map(feature => typeof feature === 'string' ? feature : feature.name)))].slice(0, 10);
  return <div className="package-comparison"><h2>Compare Packages</h2><p>Every value below comes from the live package catalog.</p><div className="comparison-scroll"><table><thead><tr><th>Package</th>{packages.map(item => <th key={item.id}><AppIcon icon={item.icon || 'layers3'} size={16} /> {item.title}<strong>{priceLabel(item)}</strong></th>)}</tr></thead><tbody><tr><th>Pages</th>{packages.map(item => <td key={item.id}>{item.pagesIncluded || 'Custom'}</td>)}</tr><tr><th>Delivery</th>{packages.map(item => <td key={item.id}>{item.deliveryTime || 'Discuss'}</td>)}</tr><tr><th>Revisions</th>{packages.map(item => <td key={item.id}>{item.revisions || 'Discuss'}</td>)}</tr>{featureNames.map(feature => <tr key={feature}><th>{feature}</th>{packages.map(item => { const included = (item.features || []).some(entry => (typeof entry === 'string' ? entry : entry.name) === feature); return <td key={item.id} aria-label={included ? 'Included' : 'Not included'}>{included ? <Check className="comparison-yes" /> : <Minus className="comparison-no" />}</td>; })}</tr>)}<tr><th>Details</th>{packages.map(item => <td key={item.id}><Link className="text-link" to={`/services/${item.slug}`}>View Package</Link></td>)}</tr></tbody></table></div></div>;
}
