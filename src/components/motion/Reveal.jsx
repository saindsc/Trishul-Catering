import { useEffect, useRef } from 'react';

export function Reveal({ children, className = '', type = 'up', delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.classList.add('is-visible'); observer.unobserve(element); }
    }, { threshold: .12 });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal reveal--${type} ${className}`} style={{ '--delay': `${delay}ms` }}>{children}</div>;
}

export function Stagger({ children, className = '' }) { return <div className={`stagger ${className}`}>{children}</div>; }
