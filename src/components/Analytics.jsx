import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || '';
const visitorKey = 'sitearvo-visitor-id';
const lastPathKey = 'sitearvo-last-analytics-path';

const canonicalPath = (pathname, search) => `${pathname || '/'}${search || ''}`;

const getVisitorId = () => {
  try {
    const existing = localStorage.getItem(visitorKey);
    if (existing) return existing;
    const value = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(visitorKey, value);
    return value;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const loadGoogleAnalytics = id => {
  if (typeof window === 'undefined' || !id) return;
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false,
    anonymize_ip: true,
  });
};

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    if (!measurementId) return;
    loadGoogleAnalytics(measurementId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = canonicalPath(location.pathname, location.search);
    try {
      if (sessionStorage.getItem(lastPathKey) === path) return;
      sessionStorage.setItem(lastPathKey, path);
    } catch {
      // Ignore storage failures in private browsing modes.
    }

    const payload = JSON.stringify({
      path,
      title: document.title,
      referrer: document.referrer || '',
      visitor_id: getVisitorId(),
    });

    if (navigator.sendBeacon) {
      const beaconBlob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/pageview', beaconBlob);
    } else {
      void fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }

    if (!measurementId || typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
}
