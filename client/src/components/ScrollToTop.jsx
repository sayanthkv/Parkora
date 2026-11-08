import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window smoothly or instantly to top (0, 0)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant', // use 'instant' so the user doesn't see a jumpy animation on page transition
    });
  }, [pathname]);

  return null;
}