import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api, { setMemoryToken, getMemoryToken, setCacheUserId, clearUserCache } from '../api/axios';
import { setPageCacheUserId, clearPageCache } from '../lib/pageCache';

const AuthContext = createContext(null);

// device_id stable entre sessions (non sensible — identifiant matériel)
const getStoredDeviceId = () => { try { return localStorage.getItem('device_id') || ''; } catch { return ''; } };
const storeDeviceId = (id) => { try { if (id) localStorage.setItem('device_id', id); } catch { } };

// Token JWT en localStorage — survit aux rafraîchissements et à la fermeture de l'onglet
const getSessionToken = () => { try { return localStorage.getItem('jwt') || null; } catch { return null; } };
const storeSessionToken = (token) => { try { if (token) localStorage.setItem('jwt', token); else { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt'); } } catch { } };

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const deviceId = getStoredDeviceId();
    const headers  = deviceId ? { 'X-Device-Id': deviceId } : {};

    // Réinjecter dans les defaults axios au rechargement de page
    if (deviceId) api.defaults.headers.common['X-Device-Id'] = deviceId;

    // Restaurer le token JWT depuis sessionStorage avant /auth/me
    const sessionToken = getSessionToken();
    if (sessionToken) setMemoryToken(sessionToken);

    const timeout = setTimeout(() => {
      controller.abort();
      setUser(null);
      setLoading(false);
    }, 15000);

    api.get('/auth/me', { signal: controller.signal, headers })
      .then(res => {
        clearTimeout(timeout);
        if (controller.signal.aborted) return;
        const userData = res.data?.data;
        if (userData?.id) { setCacheUserId(userData.id); setPageCacheUserId(userData.id); }
        setUser(userData);
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timeout);
        if (err?.code === 'ERR_CANCELED' || controller.signal.aborted) return;
        setUser(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  // Refresh proactif — rafraîchit le token avant expiration tant que l'utilisateur est connecté
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) {
      clearInterval(refreshIntervalRef.current);
      return;
    }

    const REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes

    const doRefresh = async () => {
      const token = getMemoryToken();
      if (!token) return;
      const deviceId = getStoredDeviceId();
      try {
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Device-Id': deviceId,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        );
        const newToken = res.data?.access_token ?? res.data?.data?.access_token;
        if (newToken) {
          storeSessionToken(newToken);
          setMemoryToken(newToken);
        }
      } catch {}
    };

    refreshIntervalRef.current = setInterval(doRefresh, REFRESH_INTERVAL);
    return () => clearInterval(refreshIntervalRef.current);
  }, [user]);

  /**
   * Étape 1 : email + password
   * Retourne :
   *   { success: true }                     → connecté directement
   *   { requires2fa: true, ticket: '...' }  → 2FA requis
   *   { success: false, message: '...' }    → erreur
   */
  const login = async (email, password) => {
    try {
      const deviceId = getStoredDeviceId();
      const headers  = deviceId ? { 'X-Device-Id': deviceId } : {};

      const response = await api.post(
        '/auth/login',
        { email, password },
        { headers, timeout: 90000 }
      );

      if (!response.data.success) {
        return { success: false, message: response.data.message || 'Erreur de connexion' };
      }

      const data = response.data.data;

      // Le backend demande un code OTP
      if (data.requires_2fa) {
        return {
          requires2fa: true,
          ticket: data.two_factor_ticket,
          emailHint: data.email_hint || '',
        };
      }

      // Connexion directe (pas de 2FA)
      return finalize(data);

    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la connexion au serveur';
      const code    = error.response?.status === 403 ? 'WEB_AGENT_FORBIDDEN' : null;
      return { success: false, message, code };
    }
  };

  /**
   * Étape 2 : vérifier le code OTP
   */
  const verify2fa = async (ticket, code) => {
    try {
      const response = await api.post('/auth/2fa/verify', { ticket, code });

      if (!response.data.success) {
        return { success: false, message: response.data.message || 'Code incorrect' };
      }

      return finalize(response.data.data);

    } catch (error) {
      const message = error.response?.data?.message || 'Erreur de vérification OTP';
      return { success: false, message };
    }
  };

  // Commun à login direct et post-2FA
  const finalize = (data) => {
    const { user, access_token, device_id } = data;

    // Injecter device_id AVANT le token pour que la première requête soit complète (C3)
    if (device_id) {
      storeDeviceId(device_id);
      api.defaults.headers.common['X-Device-Id'] = device_id;
    }

    storeSessionToken(access_token);
    setMemoryToken(access_token);
    if (user?.id) { setCacheUserId(user.id); setPageCacheUserId(user.id); }
    setUser(user);
    setLoading(false);

    return { success: true };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur lors de la déconnexion sur le serveur', error);
    } finally {
      storeSessionToken(null);
      setMemoryToken(null);
      clearUserCache();
      clearPageCache();
      setUser(null);
    }
  };

  const updateUser = (patch) => setUser(prev => ({ ...prev, ...patch }));

  return (
    <AuthContext.Provider value={{ user, login, verify2fa, logout, updateUser, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
