import { FolderKanban, House, LayoutGrid, Menu, ShoppingCart } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../cart/CartContext';

const items = [
  ['/', 'Home', House],
  ['/services', 'Services', LayoutGrid],
  ['/portfolio', 'Portfolio', FolderKanban],
  ['/cart', 'Cart', ShoppingCart],
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { cartCount } = useCart();
  return <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
    {items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive || (to !== '/' && location.pathname.startsWith(`${to}/`)) ? 'active' : ''}><span className="mobile-nav-icon"><Icon aria-hidden="true" />{to === '/cart' && cartCount > 0 && <b aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</b>}</span><span>{label}</span>{to === '/cart' && <span className="sr-only">, {cartCount} items</span>}</NavLink>)}
    <button type="button" onClick={() => window.dispatchEvent(new Event('sitearvo:toggle-mobile-menu'))} aria-label="Open main menu"><Menu aria-hidden="true" /><span>Menu</span></button>
  </nav>;
}
