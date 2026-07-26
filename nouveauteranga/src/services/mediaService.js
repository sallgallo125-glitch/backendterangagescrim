import api from '../api/axios';

const VALID_TYPES = ['infractions', 'accidents', 'personnels', 'victimes', 'immigrations-clandestines'];

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

function checkType(type) {
  if (!VALID_TYPES.includes(type)) throw new Error(`Type invalide: ${type}`);
}

function validateFiles(files) {
  for (const f of Array.from(files)) {
    if (f.size > MAX_FILE_SIZE) {
      throw new Error(`"${f.name}" dépasse la limite de 10 Mo.`);
    }
    if (f.type && !ALLOWED_MIMES.has(f.type)) {
      throw new Error(`"${f.name}" : type de fichier non autorisé (${f.type}).`);
    }
  }
}

const mediaService = {
  getAll: (type, id) => {
    checkType(type);
    return api.get(`/${type}/${id}/media`);
  },

  upload: (type, id, files) => {
    checkType(type);
    validateFiles(files);
    const form = new FormData();
    Array.from(files).forEach(f => form.append('files[]', f));
    return api.post(`/${type}/${id}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  download: (mediaId, filename) => {
    return api.get(`/media/${mediaId}/download`, { responseType: 'blob' })
      .then(res => {
        // Vérifier que le Content-Type est acceptable avant de déclencher le téléchargement
        const contentType = res.headers?.['content-type'] || '';
        const isSafe = contentType.startsWith('image/')
          || contentType === 'application/pdf'
          || contentType.includes('wordprocessingml')
          || contentType === 'application/msword'
          || contentType === 'application/octet-stream';
        if (!isSafe) throw new Error('Type de fichier non autorisé au téléchargement.');
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'fichier';
        a.click();
        URL.revokeObjectURL(url);
      });
  },

  delete: (mediaId) => api.delete(`/media/${mediaId}`),
};

export default mediaService;
