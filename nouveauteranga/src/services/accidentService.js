import api from '../api/axios';

let lastParams = null;
let accidentsCache = null;
let metaCache = null;

const accidentService = {
  getAll: async (params, options) => {
    const response = await api.get('/accidents', { params, ...options });
    lastParams = params;
    accidentsCache = response.data?.data ?? null;
    metaCache = response.data?.meta ?? null;
    return response;
  },
  getCachedData: (params) => {
    if (!accidentsCache) return null;
    if (params && JSON.stringify(params) !== JSON.stringify(lastParams)) return null;
    return { data: accidentsCache, meta: metaCache };
  },
  clearCache: () => {
    lastParams = null;
    accidentsCache = null;
    metaCache = null;
  },
  getOne: (id) => api.get(`/accidents/${id}`),
  create: async (data) => {
    const res = await api.post('/accidents', data);
    accidentService.clearCache();
    return res;
  },
  update: async (id, data) => {
    const res = await api.put(`/accidents/${id}`, data);
    accidentService.clearCache();
    return res;
  },
  delete: async (id) => {
    const res = await api.delete(`/accidents/${id}`);
    accidentService.clearCache();
    return res;
  },
};

export default accidentService;
