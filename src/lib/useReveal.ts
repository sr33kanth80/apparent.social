import { useEffect } from 'react';

/**
 * Reveal-on-scroll: any element tagged with `data-reveal` (and the `reveal`
 * class) fades and rises into place when it enters the viewport. Elements
 * already in view (e.g. the hero) animate on load. Respects reduced-motion.
 *
 * Call once near the top of a page component; it observes that page's
 * `[data-reveal]` elements after mount.
 */
export const useReveal = () => {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!els.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('reveal-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};
