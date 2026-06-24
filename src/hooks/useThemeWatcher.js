import { useEffect, useState } from 'react';

export function useThemeWatcher() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => forceUpdate(n => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
}
