// Site type context — the words (terms), modules and pass categories for the
// manager's current site (estate / school / hotel / industrial / hospital).
// Renders straight away from the estate's site type (or estate defaults) and
// is replaced by GET /api/site once it answers. Refetches when the manager
// switches estates and on the socket `site_update` event.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { siteAPI } from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { fallbackSite, MODULES } from '../utils/siteTypes';

const SiteContext = createContext(null);

export const SiteProvider = ({ children }) => {
  const { user } = useAuth();
  const socketCtx = useSocket();
  const estateObj = user?.estateId && typeof user.estateId === 'object' ? user.estateId : null;
  const estateId = estateObj?._id || (typeof user?.estateId === 'string' ? user.estateId : null);
  const estateType = estateObj?.site?.type;

  const [site, setSite] = useState(() => fallbackSite(estateType));
  const [loaded, setLoaded] = useState(false);
  const reqRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!estateId) return;
    const id = ++reqRef.current;
    try {
      const { data } = await siteAPI.get();
      if (id !== reqRef.current) return; // a newer request (estate switch) won
      setSite({ ...fallbackSite(data.data?.type), ...data.data });
      setLoaded(true);
    } catch {
      /* keep the fallback — the UI still works with estate defaults */
    }
  }, [estateId]);

  // New estate (login / switch): reset to its fallback, then fetch
  useEffect(() => {
    setSite(fallbackSite(estateType));
    setLoaded(false);
    if (estateId) refresh();
  }, [estateId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates when a manager changes the site settings
  useEffect(() => {
    if (!socketCtx?.subscribe || !estateId) return;
    return socketCtx.subscribe('site_update', (cfg) => {
      if (!cfg || typeof cfg !== 'object') return;
      // The socket payload has no catalog / overrides — refetch for those
      setSite(prev => ({ ...prev, ...cfg }));
      refresh();
    });
  }, [socketCtx, estateId, refresh]);

  // 403 MODULE_OFF from any API call → refetch and tell the user once
  useEffect(() => {
    let last = 0;
    const onOff = (e) => {
      refresh();
      if (Date.now() - last < 4000) return;
      last = Date.now();
      const label = MODULES[e.detail?.module]?.label || 'This feature';
      toast(`${label} is switched off for this site. Turn it on in Settings → Site type & features.`, { icon: 'ℹ️' });
    };
    window.addEventListener('site:module-off', onOff);
    return () => window.removeEventListener('site:module-off', onOff);
  }, [refresh]);

  const value = useMemo(() => {
    const terms = site.terms || {};
    return {
      ...site,
      loaded,
      refresh,
      setSite,
      // t('members') → 'Guests'; unknown keys fall back to the key itself
      t: (key) => terms[key] ?? key,
      // Module on? Unknown modules count as on so nothing disappears by accident
      on: (key) => site.modules?.[key] !== false,
      isEstate: site.type === 'estate',
    };
  }, [site, loaded, refresh]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

// Safe outside the provider too (returns the estate defaults)
const FALLBACK = (() => {
  const s = fallbackSite('estate');
  return { ...s, loaded: false, refresh: () => {}, setSite: () => {}, t: (k) => s.terms[k] ?? k, on: (k) => s.modules[k] !== false, isEstate: true };
})();

export const useSite = () => useContext(SiteContext) || FALLBACK;
