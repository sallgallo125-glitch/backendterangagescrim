import api from '../api/axios';

const infractionService = {
  getAll: (params, options) => api.get('/infractions', { params, ...options }),
  getOne: (id) => api.get(`/infractions/${id}`),
  create: (data) => api.post('/infractions', data),
  update: (id, data) => api.put(`/infractions/${id}`, data),
  delete: (id) => api.delete(`/infractions/${id}`),

  // Types & Catégories
  getCategories: () => api.get('/categories-infractions'),
  createCategorie: (data) => api.post('/categories-infractions', data),
  updateCategorie: (id, data) => api.put(`/categories-infractions/${id}`, data),
  deleteCategorie: (id) => api.delete(`/categories-infractions/${id}`),

  getTypes: () => api.get('/types-infractions'),
  createType: (data) => api.post('/types-infractions', data),
  updateType: (id, data) => api.put(`/types-infractions/${id}`, data),
  deleteType: (id) => api.delete(`/types-infractions/${id}`),
};

export default infractionService;
