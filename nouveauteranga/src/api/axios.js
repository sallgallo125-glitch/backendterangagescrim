import axios from 'axios';
import { stableStringify } from '../lib/stableStringify';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Identifies XHR requests to the backend (CSRF double-submit defense on non-cookie flows)
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  timeout: 30000,
});

// Token en mémoire + localStorage pour survivre aux rechargements de page.
// Note: le cookie HttpOnly (web) est la source d'auth principale pour les navigateurs.
// localStorage est utilisé comme fallback pour les clients non-cookie (mobile/desktop PWA).
// Ne pas stocker de données sensibles supplémentaires dans localStorage.
let memoryToken = null;

// Recharge le token depuis localStorage au démarrage (avant le premier /auth/me)
try {
  const stored = localStorage.getItem('jwt');
  if (stored) {
    memoryToken = stored;
    api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
  }
} catch { }

// Empêche les races condition sur le refresh 401 concurrent :
// toutes les requêtes en attente partagent la même promesse de refresh.
let refreshPromise = null;

export const setMemoryToken = (token) => {
  memoryToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try { localStorage.setItem('jwt', token); } catch { }
  } else {
    delete api.defaults.headers.common['Authorization'];
    try { localStorage.removeItem('jwt'); } catch { }
    try { sessionStorage.removeItem('jwt'); } catch { }
  }
};

export const getMemoryToken = () => memoryToken;

// Cache isolé par utilisateur (max 200 entrées par utilisateur)
const REQUEST_CACHE_MAX = 200;
// userId → Map<cacheKey, data>
const userCaches = new Map();

let _currentUserId = null;

export const setCacheUserId = (userId) => {
  _currentUserId = userId;
};

export const clearUserCache = () => {
  if (_currentUserId !== null) {
    userCaches.delete(_currentUserId);
  }
  _currentUserId = null;
};

const getCache = () => {
  if (_currentUserId === null) return null;
  if (!userCaches.has(_currentUserId)) {
    userCaches.set(_currentUserId, new Map());
  }
  return userCaches.get(_currentUserId);
};

const getCacheKey = (url, params) => `${url}?${stableStringify(params ?? {})}`;

api.getCachedData = (url, params) => {
  const cache = getCache();
  if (!cache) return null;
  const key = getCacheKey(url, params);
  return cache.get(key) || null;
};

api.clearCache = (url = null) => {
  const cache = getCache();
  if (!cache) return;
  if (!url) { cache.clear(); return; }
  const baseResource = url.startsWith('/') ? url.split('/')[1] : url.split('/')[0];
  for (const key of cache.keys()) {
    if (key.startsWith(`/${baseResource}`) || key.startsWith(baseResource)) {
      cache.delete(key);
    }
  }
};

api.interceptors.response.use(
  (response) => {
    // Ne jamais mettre en cache les blobs (exports PDF/CSV)
    const isBlob  = response.config.responseType === 'blob';
    const noStore = response.config.headers?.['Cache-Control'] === 'no-store';
    if (response.config.method === 'get' && !isBlob && !noStore) {
      const cache = getCache();
      if (cache) {
        const key = getCacheKey(response.config.url, response.config.params);
        if (cache.size >= REQUEST_CACHE_MAX) {
          cache.delete(cache.keys().next().value);
        }
        cache.set(key, response.data);
      }
    } else if (['post', 'put', 'delete', 'patch'].includes(response.config.method)) {
      api.clearCache(response.config.url);
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const cfg    = error.config;

    // Retry automatique une fois sur 503/504/500 et timeouts réseau
    const isRetryable = status === 503 || status === 504 || status === 500
      || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
    if (isRetryable && cfg && !cfg._retried) {
      cfg._retried = true;
      await new Promise(r => setTimeout(r, Math.random() * 300 + 400));
      return api(cfg);
    }

    // Si la réponse d'erreur est un blob (ex: export avec responseType:'blob'),
    // lire le JSON pour extraire le message avant de propager l'erreur
    if (cfg?.responseType === 'blob' && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        error.response.data = json;
        // UNKNOWN_DEVICE : effacer le device_id uniquement si la réponse 401 vient bien de notre API
        // (évite qu'un serveur compromis spoofie le code pour effacer le device_id)
        if (json.code === 'UNKNOWN_DEVICE' && error.response?.status === 401) {
          localStorage.removeItem('device_id');
          delete api.defaults.headers.common['X-Device-Id'];
        }
      } catch (e) { if (import.meta.env.DEV) console.error('Failed to parse blob error response', e); }
    }

    if (status === 403) {
      // Accès interdit — propager sans retry (la page doit afficher une erreur)
      return Promise.reject(error);
    }

    if (status === 401) {
      const requestUrl     = cfg?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/login')
        || requestUrl.includes('/auth/2fa')
        || requestUrl.includes('/auth/refresh')
        || requestUrl.includes('/auth/me');

      // Sur les endpoints d'auth on ne tente pas de refresh — laisser l'erreur remonter
      if (!isAuthEndpoint) {
        // Partage une seule promesse de refresh entre toutes les requêtes 401 concurrentes
        if (!refreshPromise) {
          const deviceId = (() => { try { return localStorage.getItem('device_id') || ''; } catch { return ''; } })();
          refreshPromise = axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${memoryToken}`,
                'X-Device-Id': deviceId,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              withCredentials: true,
            }
          ).finally(() => { refreshPromise = null; });
        }

        try {
          const refreshResp = await refreshPromise;
          const newToken = refreshResp.data?.access_token ?? refreshResp.data?.data?.access_token;
          if (newToken) {
            setMemoryToken(newToken);
            cfg.headers['Authorization'] = `Bearer ${newToken}`;
            return api(cfg);
          }
        } catch {
          // Refresh a échoué → vraie déconnexion
        }

        // Refresh impossible : nettoyer et rediriger
        setMemoryToken(null);
        clearUserCache();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
