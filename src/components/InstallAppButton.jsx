import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIOSHelp, setShowIOSHelp] = useState(() => {
    try { return isIOS() && !isStandalone() && localStorage.getItem('sitearvo-ios-install-dismissed') !== 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    const capturePrompt = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIOSHelp(false);
    };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  const dismissIOSHelp = () => {
    try { localStorage.setItem('sitearvo-ios-install-dismissed', 'true'); } catch { /* Storage may be unavailable. */ }
    setShowIOSHelp(false);
  };

  if (installed) return null;

  return <div className="pwa-install-tools">
    {installPrompt && <button type="button" className="install-app-button" onClick={install}><Download aria-hidden="true" />Install SiteArvo</button>}
    {showIOSHelp && <aside className="ios-install-help" aria-label="Install SiteArvo on iOS"><Share aria-hidden="true" /><p>Add SiteArvo to your Home Screen for an app-like experience.</p><button type="button" onClick={dismissIOSHelp} aria-label="Dismiss install instructions"><X /></button></aside>}
  </div>;
}
