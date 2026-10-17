import React, { useEffect, useRef } from 'react';

// Pointer-only presentation: updates CSS variables without React rerenders.
export default function DepthSurface({ as: Tag = 'div', className = '', children, depth = 3, ...props }) {
  const surface = useRef(null);
  const frame = useRef(null);
  const point = useRef(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const reset = () => {
    cancelAnimationFrame(frame.current);
    frame.current = null;
    point.current = null;
    const element = surface.current;
    if (!element) return;
    element.removeAttribute('data-tilting');
    ['--tilt-x', '--tilt-y', '--light-x', '--light-y'].forEach(name => element.style.removeProperty(name));
  };
  const move = event => {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    point.current = { x: event.clientX, y: event.clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const element = surface.current;
      if (!element || !point.current) return;
      const rect = element.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (point.current.x - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (point.current.y - rect.top) / rect.height));
      element.style.setProperty('--tilt-x', `${(0.5 - y) * depth}deg`);
      element.style.setProperty('--tilt-y', `${(x - 0.5) * depth}deg`);
      element.style.setProperty('--light-x', `${x * 100}%`);
      element.style.setProperty('--light-y', `${y * 100}%`);
      element.dataset.tilting = 'true';
    });
  };
  return <Tag {...props} ref={surface} className={`depth-surface ${className}`} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) reset(); }}>{children}</Tag>;
}
