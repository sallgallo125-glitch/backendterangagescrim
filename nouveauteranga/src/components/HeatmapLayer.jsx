import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * Couche heatmap pour React Leaflet.
 * Props:
 *   points  — array de [lat, lng, intensity?]
 *   options — options leaflet.heat (radius, blur, maxZoom, gradient)
 */
export default function HeatmapLayer({ points = [], options = {} }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!points.length) return;

    const defaultOptions = {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.2: '#3B82F6', 0.4: '#10B981', 0.6: '#F59E0B', 0.8: '#EF4444', 1.0: '#7C3AED' },
      ...options,
    };

    heatRef.current = L.heatLayer(points, defaultOptions).addTo(map);

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [points, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
