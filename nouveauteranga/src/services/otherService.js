import api from '../api/axios';

export const serviceRemunereService = {
  getAll: (params) => api.get('/services-remuneres', { params }),
  getOne: (id) => api.get(`/services-remuneres/${id}`),
  create: (data) => api.post('/services-remuneres', data),
  update: (id, data) => api.put(`/services-remuneres/${id}`, data),
  delete: (id) => api.delete(`/services-remuneres/${id}`),
};

export const amendePieceSaisieService = {
  getAll: (params) => api.get('/amendes-pieces-saisies', { params }),
  getOne: (id) => api.get(`/amendes-pieces-saisies/${id}`),
  create: (data) => api.post('/amendes-pieces-saisies', data),
  update: (id, data) => api.put(`/amendes-pieces-saisies/${id}`, data),
  delete: (id) => api.delete(`/amendes-pieces-saisies/${id}`),
};

export const immigrationService = {
  getAll: (params) => api.get('/immigrations-clandestines', { params }),
  getOne: (id) => api.get(`/immigrations-clandestines/${id}`),
  create: (data) => api.post('/immigrations-clandestines', data),
  update: (id, data) => api.put(`/immigrations-clandestines/${id}`, data),
  delete: (id) => api.delete(`/immigrations-clandestines/${id}`),
};
