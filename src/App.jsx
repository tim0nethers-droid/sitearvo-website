import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import LiveChatWidget from './components/LiveChatWidget';
import InstallAppButton from './components/InstallAppButton';
import MobileBottomNav from './components/MobileBottomNav';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import Analytics from './components/Analytics';
import RouteLoader from './components/RouteLoader';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Contact = lazy(() => import('./pages/Contact'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Industries = lazy(() => import('./pages/Industries'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const ServiceCategory = lazy(() => import('./pages/ServiceCategory'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const MobileBusinessApp = lazy(() => import('./app/MobileBusinessApp'));
const SeoLandingPage = lazy(() => import('./pages/SeoLandingPage'));
const WebsiteBuilder = lazy(() => import('./pages/WebsiteBuilder'));

export default function App() {
  const location = useLocation();
  if (location.pathname.startsWith('/app')) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes><Route path="/app/*" element={<MobileBusinessApp />} /></Routes>
      </Suspense>
    );
  }
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes><Route path="/admin/*" element={<AdminApp />} /></Routes>
      </Suspense>
    );
  }
  return (
    <>
      <Analytics />
      <ScrollToTop />
      <Navbar />
      <main>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/category/:slug" element={<ServiceCategory />} />
            <Route path="/services/:slug" element={<ServiceDetail key={location.pathname} />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/portfolio/:slug" element={<ProjectDetail />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/website-builder" element={<WebsiteBuilder />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsConditions />} />
            <Route path="/guides/:slug" element={<SeoLandingPage guide />} />
            <Route path="/:slug" element={<SeoLandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <LiveChatWidget />
      <InstallAppButton />
      <MobileBottomNav />
      <PWAUpdatePrompt />
    </>
  );
}
