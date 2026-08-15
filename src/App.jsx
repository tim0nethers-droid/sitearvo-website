import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import LiveChatWidget from './components/LiveChatWidget';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Portfolio from './pages/Portfolio';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import NotFound from './pages/NotFound';
import ProjectDetail from './pages/ProjectDetail';
import Industries from './pages/Industries';
import ServiceDetail from './pages/ServiceDetail';
import InstallAppButton from './components/InstallAppButton';
import MobileBottomNav from './components/MobileBottomNav';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import ServiceCategory from './pages/ServiceCategory';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminApp from './admin/AdminApp';
import SeoLandingPage from './pages/SeoLandingPage';
import Analytics from './components/Analytics';
import WebsiteBuilder from './pages/WebsiteBuilder';

export default function App() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return <Routes><Route path="/admin/*" element={<AdminApp />} /></Routes>;
  return (
    <>
      <Analytics />
      <ScrollToTop />
      <Navbar />
      <main>
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
      </main>
      <Footer />
      <LiveChatWidget />
      <InstallAppButton />
      <MobileBottomNav />
      <PWAUpdatePrompt />
    </>
  );
}
