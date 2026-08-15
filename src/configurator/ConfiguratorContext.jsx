import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../catalog/api';
import { buildConfiguratorSelectionState, cloneConfiguratorGroups, defaultConfiguratorGroups, normalizeConfiguratorGroups } from '../data/configurator';

const ConfiguratorContext = createContext(null);

export function ConfiguratorProvider({ children }) {
  const [groups, setGroups] = useState(cloneConfiguratorGroups(defaultConfiguratorGroups));
  const [settings, setSettings] = useState({ page_explanation: 'One unique website URL/page counts as one page, such as Home, About, Services or Contact.' });
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/configurator');
      setGroups(normalizeConfiguratorGroups(data.groups || []));
      setSettings(data.settings || {});
      setUsingFallback(false);
    } catch (requestError) {
      setGroups(cloneConfiguratorGroups(defaultConfiguratorGroups));
      setUsingFallback(true);
      setError(requestError.message || 'Could not load configurator data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    groups,
    settings,
    loading,
    usingFallback,
    error,
    refresh,
    createDefaultSelectionState: preset => buildConfiguratorSelectionState(groups, preset),
  }), [groups, settings, loading, usingFallback, error, refresh]);

  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>;
}

export function useConfigurator() {
  const value = useContext(ConfiguratorContext);
  if (!value) throw new Error('useConfigurator must be used inside ConfiguratorProvider.');
  return value;
}
