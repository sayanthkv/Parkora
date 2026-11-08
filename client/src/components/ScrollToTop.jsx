import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Disable automatic browser scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const root = document.getElementById('root');
      if (root) root.scrollTop = 0;
    };

    // Execute immediately and queued after DOM paint
    resetScroll();
    const frameId = requestAnimationFrame(() => {
      resetScroll();
      setTimeout(resetScroll, 0);
    });

    return () => cancelAnimationFrame(frameId);
  }, [pathname, search]);

  return null;
}