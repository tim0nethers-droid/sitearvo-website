import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export default function PWAUpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [updateApp, setUpdateApp] = useState(() => () => {});

  useEffect(() => {
    const updateSW = registerSW({ onNeedRefresh: () => setNeedsRefresh(true) });
    setUpdateApp(() => updateSW);
  }, []);

  if (!needsRefresh) return null;
  return <aside className="pwa-update-prompt" aria-live="polite"><RefreshCw aria-hidden="true" /><p><b>SiteArvo update available</b><span>Reload to use the latest version.</span></p><button className="pwa-update-action" type="button" onClick={() => updateApp(true)}>Reload</button><button className="pwa-update-close" type="button" onClick={() => setNeedsRefresh(false)} aria-label="Dismiss update"><X /></button></aside>;
}
