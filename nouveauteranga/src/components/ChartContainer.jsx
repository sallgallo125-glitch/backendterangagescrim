import { useRef, useState, useEffect, cloneElement, Children } from 'react';

export default function ChartContainer({ height = 250, children }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect && rect.width > 0) setWidth(Math.floor(rect.width));
    };
    measure();
    const timer = setTimeout(measure, 100);
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, []);

  const chartWidth = width || 600;

  return (
    <div ref={ref} style={{ width: '100%', height, minHeight: height }}>
      {width > 0 && Children.map(children, child =>
        child ? cloneElement(child, { width: chartWidth, height }) : null
      )}
    </div>
  );
}
