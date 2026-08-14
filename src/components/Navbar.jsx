import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Mail, Menu, MessageCircle, Phone, ShoppingCart, X } from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { company, contactAvailability, phoneUrl, whatsappUrl } from '../config/company';
import { useCatalog } from '../catalog/CatalogContext';
import { getCatalogIcon } from '../catalog/icons';
import { useCart } from '../cart/CartContext';

const links = [['/', 'Home'], ['/about', 'About Us'], ['/industries', 'Industries'], ['/portfolio', 'Portfolio'], ['/pricing', 'Pricing'], ['/contact', 'Contact']];
const defaultServiceCategory = 'web-development';
const isDesktopMenu = () => window.matchMedia('(min-width: 821px)').matches;
const categoryMenuTitle = category => category.id === 'mobile-app-development' ? category.title : category.shortTitle;
const serviceMenuTitle = title => title.replace(/ — (SEO|SMM|PPC)$/, '');

export default function Navbar() {
  const { categories: serviceCategories } = useCatalog();
  const { cartCount } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [activeServiceCategory, setActiveServiceCategory] = useState(defaultServiceCategory);
  const servicesMenuRef = useRef(null);
  const servicesButtonRef = useRef(null);
  const location = useLocation();
  const activeCategory = serviceCategories.find(category => category.id === activeServiceCategory) || serviceCategories.find(category => category.slug === activeServiceCategory) || serviceCategories[0];

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
    setActiveServiceCategory(defaultServiceCategory);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const toggleMobileMenu = () => {
      setOpen(current => !current);
      setServicesOpen(false);
    };
    window.addEventListener('sitearvo:toggle-mobile-menu', toggleMobileMenu);
    return () => window.removeEventListener('sitearvo:toggle-mobile-menu', toggleMobileMenu);
  }, []);

  useEffect(() => {
    const onPointerDown = event => {
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(event.target)) setServicesOpen(false);
    };
    const onKeyDown = event => {
      if (event.key !== 'Escape' || !servicesOpen) return;
      setServicesOpen(false);
      servicesButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [servicesOpen]);

  useEffect(() => {
    const closeMobileMenu = event => {
      if (event.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', closeMobileMenu);
    return () => document.removeEventListener('keydown', closeMobileMenu);
  }, [open]);

  const openServices = () => {
    if (!servicesOpen) setActiveServiceCategory(serviceCategories[0]?.id || defaultServiceCategory);
    setServicesOpen(true);
  };

  const toggleServices = () => {
    if (!servicesOpen) setActiveServiceCategory(serviceCategories[0]?.id || defaultServiceCategory);
    setServicesOpen(current => !current);
  };

  const selectCategory = categoryId => {
    if (isDesktopMenu()) {
      setActiveServiceCategory(categoryId);
      return;
    }
    setActiveServiceCategory(current => current === categoryId ? '' : categoryId);
  };

  const closeNavigation = () => {
    setServicesOpen(false);
    setOpen(false);
  };

  return <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
    <div className="topbar"><div className="container topbar-inner"><span>Need a website for your business? Let's talk.</span><div className="topbar-links">{contactAvailability.email && <a href={`mailto:${company.email}`}><Mail />{company.email}</a>}{contactAvailability.phone && <a href={phoneUrl()}><Phone />{company.phone}</a>}{contactAvailability.whatsapp && <a href={whatsappUrl()} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a>}<Link to="/contact">Post Your Enquiry</Link></div></div></div>
    <div className="navbar"><div className="container nav-inner">
      <Logo />
      <Link to="/contact" className="mobile-header-quote">Get a Quote</Link>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-menu" aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X /> : <Menu />}</button>
      <nav id="main-menu" className={`nav-menu ${open ? 'is-open' : ''}`} aria-label="Primary navigation">
        {links.slice(0, 2).map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
        <div
          ref={servicesMenuRef}
          className={`services-menu ${servicesOpen ? 'is-open' : ''}`}
          onMouseEnter={() => { if (isDesktopMenu()) openServices(); }}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setServicesOpen(false); }}
        >
          <button ref={servicesButtonRef} type="button" aria-expanded={servicesOpen} aria-controls="services-mega-menu" onClick={() => isDesktopMenu() ? openServices() : toggleServices()}>Services <ChevronDown /></button>
          <div id="services-mega-menu" className="services-mega-menu" aria-label="Services navigation">
            <div className="mega-layout">
              <section className="mega-category-list" aria-label="Service categories">
                <span className="mega-nav-title">Service categories</span>
                {serviceCategories.map(category => {
                  const expanded = activeServiceCategory === category.id;
                  const CategoryIcon = getCatalogIcon(category.icon);
                  return <div className={`mega-category-row ${expanded ? 'is-active' : ''}`} key={category.id}>
                    <button
                      type="button"
                      className="mega-category-button"
                      aria-expanded={expanded}
                      aria-controls={`mobile-services-${category.id}`}
                      onMouseEnter={() => { if (isDesktopMenu()) setActiveServiceCategory(category.id); }}
                      onClick={() => selectCategory(category.id)}
                    >
                      <CategoryIcon className="mega-category-icon" size={18} strokeWidth={1.9} aria-hidden="true" />
                      <span>{categoryMenuTitle(category)}</span>
                      <ChevronRight className="category-chevron category-chevron--desktop" aria-hidden="true" />
                      <ChevronDown className="category-chevron category-chevron--mobile" aria-hidden="true" />
                    </button>
                    <div id={`mobile-services-${category.id}`} className="mega-mobile-services" hidden={!expanded}>
                      {(category.services || []).map(service => { const ServiceIcon = getCatalogIcon(service.icon); return <Link key={service.slug} to={`/services/${service.slug}`} onClick={closeNavigation}><ServiceIcon size={15} strokeWidth={1.9} aria-hidden="true" /><span>{serviceMenuTitle(service.title)}</span></Link>; })}
                    </div>
                  </div>;
                })}
              </section>

              {activeCategory && <section className="mega-service-panel" aria-live="polite" aria-label={`${activeCategory.title} services`}>
                <div className="mega-service-heading"><span>Selected category</span><h3>{(() => { const ActiveCategoryIcon = getCatalogIcon(activeCategory.icon); return <><ActiveCategoryIcon size={20} strokeWidth={1.9} aria-hidden="true" />{categoryMenuTitle(activeCategory)}</>; })()}</h3><p>{activeCategory.description}</p></div>
                <div className="mega-service-links">
                  {(activeCategory.services || []).map(service => { const ServiceIcon = getCatalogIcon(service.icon); return <Link key={service.slug} to={`/services/${service.slug}`} onClick={closeNavigation}><ServiceIcon size={17} strokeWidth={1.9} aria-hidden="true" /><span>{serviceMenuTitle(service.title)}</span><ChevronRight aria-hidden="true" /></Link>; })}
                </div>
              </section>}
            </div>
            <div className="mega-menu-footer"><Link className="mega-view-all" to="/services" onClick={closeNavigation}>View All Services <ChevronRight aria-hidden="true" /></Link></div>
          </div>
        </div>
        {links.slice(2).map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
        <NavLink to="/cart" className={({ isActive }) => `nav-cart ${isActive ? 'active' : ''}`} aria-label={`Shopping cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
          <ShoppingCart aria-hidden="true" />
          <span className="nav-cart-label">Cart</span>
          {cartCount > 0 && <span className="nav-cart-badge" aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</span>}
        </NavLink>
        <Link to="/contact" className="button button--small nav-cta">Get a Quote</Link>
      </nav>
    </div></div>
    {open && <button type="button" className="mobile-menu-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation menu" />}
  </header>;
}
