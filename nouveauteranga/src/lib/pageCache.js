const TTL_MS = 5 * 60 * 1000; // 5 minutes

// userId courant — mis à jour au login, effacé au logout
let _userId = null;

export function setPageCacheUserId(userId) {
  _userId = userId ?? null;
}

// Préfixe la clé avec le userId pour isoler les caches entre sessions
const prefixed = (key) => (_userId !== null ? `u:${_userId}:${key}` : `anon:${key}`);

const store = new Map();

export function getCached(key) {
  const entry = store.get(prefixed(key));
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    store.delete(prefixed(key));
    return null;
  }
  return entry.data;
}

export function setCached(key, data) {
  store.set(prefixed(key), { data, ts: Date.now() });
}

export function hasCached(key) {
  return getCached(key) !== null;
}

export function clearCached(key) {
  if (key) store.delete(prefixed(key));
  else store.clear();
}

// Appelée au logout : vide toutes les entrées de l'utilisateur courant puis réinitialise l'userId
export function clearPageCache() {
  if (_userId !== null) {
    const prefix = `u:${_userId}:`;
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  }
  _userId = null;
}
