import api from '../api/axios';

const geoService = {
  // Régions
  getRegions: (params) => api.get('/regions', { params }),
  getAllRegions: (config = {}) => api.get('/regions/all', config),
  getRegion: (id) => api.get(`/regions/${id}`),
  createRegion: (data) => api.post('/regions', data),
  updateRegion: (id, data) => api.put(`/regions/${id}`, data),
  deleteRegion: (id) => api.delete(`/regions/${id}`),

  // Départements
  getDepartements: (params, signal) => api.get('/departements', { params, signal }),
  getAllDepartements: (params) => api.get('/departements/all', { params }),
  getDepartement: (id) => api.get(`/departements/${id}`),
  createDepartement: (data) => api.post('/departements', data),
  updateDepartement: (id, data) => api.put(`/departements/${id}`, data),
  deleteDepartement: (id) => api.delete(`/departements/${id}`),

  // Communes
  getCommunes: (params, signal) => api.get('/communes', { params, signal }),
  getAllCommunes: (params) => api.get('/communes/all', { params }),
  getCommune: (id) => api.get(`/communes/${id}`),
  createCommune: (data) => api.post('/communes', data),
  updateCommune: (id, data) => api.put(`/communes/${id}`, data),
  deleteCommune: (id) => api.delete(`/communes/${id}`),

  // Services / Commissariats
  getServices: (params, signal) => api.get('/services', { params, signal }),
  getAllServices: (params) => api.get('/services/all', { params }),
  getService: (id) => api.get(`/services/${id}`),
  createService: (data) => api.post('/services', data),
  updateService: (id, data) => api.put(`/services/${id}`, data),
  deleteService: (id) => api.delete(`/services/${id}`),
};

export default geoService;
