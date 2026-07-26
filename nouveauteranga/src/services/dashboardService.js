import api from '../api/axios';

const dashboardService = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getInfractionsParRegion: (params) => api.get('/dashboard/infractions-par-region', { params }),
  getAccidentsParType: (params) => api.get('/dashboard/accidents-par-type', { params }),
  getTendancesMensuelles: (params) => api.get('/dashboard/tendances-mensuelles', { params }),
  getInfractionsParType: (params) => api.get('/dashboard/infractions-par-type', { params }),
  getPersonnelParService: (params) => api.get('/dashboard/personnel-par-service', { params }),
  getSaisiesParHeure: (params) => api.get('/dashboard/saisies-par-heure', { params }),
};

export default dashboardService;
