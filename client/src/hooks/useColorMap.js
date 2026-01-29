import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api.js';

/**
 * Hook to load and cache MARD color data with O(1) lookup by code
 * @returns {{ colors: Array, colorMap: Map, getHex: Function, loading: boolean }}
 */
export function useColorMap() {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadColors() {
      try {
        const result = await api.colors.list();
        if (mounted) {
          setColors(result);
        }
      } catch (err) {
        console.error('Failed to load colors:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadColors();

    return () => {
      mounted = false;
    };
  }, []);

  // Build code -> color map for O(1) lookup
  const colorMap = useMemo(() => {
    const map = new Map();
    for (const color of colors) {
      map.set(color.code, color);
    }
    return map;
  }, [colors]);

  // Helper function to get hex by code
  const getHex = (code) => {
    const color = colorMap.get(code);
    return color?.hex || '#000000';
  };

  return { colors, colorMap, getHex, loading };
}

export default useColorMap;
