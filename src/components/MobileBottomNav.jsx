import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { AppIcon } from '../catalog/icons';

const items = [
  ['/', 'Home', 'home'],
  ['/services', 'Services', 'services'],
  ['/portfolio', 'Portfolio', 'portfolio'],
  ['/cart', 'Cart', 'cart'],
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { cartCount } = useCart();
  return <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
    {items.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive || (to !== '/' && location.pathname.startsWith(`${to}/`)) ? 'active' : ''}><span className="mobile-nav-icon"><AppIcon icon={icon} aria-hidden="true" />{to === '/cart' && cartCount > 0 && <b aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</b>}</span><span>{label}</span>{to === '/cart' && <span className="sr-only">, {cartCount} items</span>}</NavLink>)}
    <button type="button" onClick={() => window.dispatchEvent(new Event('sitearvo:toggle-mobile-menu'))} aria-label="Open main menu"><AppIcon icon="menu" aria-hidden="true" /><span>Menu</span></button>
  </nav>;
}
