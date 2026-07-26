import api from '../api/axios';

const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  setup2fa: () => api.post('/auth/2fa/setup'),
  enable2fa: (otp) => api.post('/auth/2fa/enable', { otp }),
};

export default authService;
