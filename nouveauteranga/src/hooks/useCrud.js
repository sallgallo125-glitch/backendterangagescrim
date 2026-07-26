import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export default function useCrud(fetchFn, params = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetch = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFn(paramsRef.current, { signal });
      if (signal?.aborted) return;
      const result = response.data?.data ?? response.data ?? [];
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || signal?.aborted) return;
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [fetchFn, paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetch(controller.signal);
    return () => controller.abort();
  }, [fetch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refresh = useCallback(() => {
    const controller = new AbortController();
    fetch(controller.signal);
  }, [fetch]);

  return { data, loading, error, refresh, setData };
}
