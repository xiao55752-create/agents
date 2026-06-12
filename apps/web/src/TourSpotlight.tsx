import { useEffect, useState } from 'react';

interface TourSpotlightProps {
  selector?: string;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;

export function TourSpotlight({ selector }: TourSpotlightProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    function measure() {
      const el = document.querySelector(selector!);
      if (!el) {
        if (!cancelled) setRect(null);
        return false;
      }
      const box = el.getBoundingClientRect();
      if (!cancelled) {
        setRect({
          top: Math.max(8, box.top - PAD),
          left: Math.max(8, box.left - PAD),
          width: Math.min(window.innerWidth - 16, box.width + PAD * 2),
          height: box.height + PAD * 2,
        });
      }
      return true;
    }

    function tryMeasure() {
      if (measure()) {
        document.querySelector(selector!)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    tryMeasure();

    const poll = window.setInterval(() => {
      attempts += 1;
      if (measure() || attempts >= 24) {
        window.clearInterval(poll);
      }
    }, 120);

    const onLayout = () => measure();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [selector]);

  if (!rect) return null;

  return (
    <div
      className="tour-spotlight-ring"
      aria-hidden
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
