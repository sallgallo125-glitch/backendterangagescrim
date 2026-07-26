import api from '../api/axios';

const exportService = {
  // PDF — GET (routes backend déclarées en GET)
  infractionsPdf: (params) => api.get('/export/infractions/pdf', { params, responseType: 'blob' }),
  accidentsPdf:   (params) => api.get('/export/accidents/pdf',   { params, responseType: 'blob' }),

  // CSV backend (infractions + accidents)
  infractionsCsv: (params) => api.get('/export/infractions/csv', { params, responseType: 'blob' }),
  accidentsCsv:   (params) => api.get('/export/accidents/csv',   { params, responseType: 'blob' }),

  // CSV client-side — bypass cache axios (no-store) pour toujours avoir les données fraîches
  personnelCsv: async (params) => {
    const r = await api.get('/personnels', {
      params: { ...params, per_page: 1000 },
      headers: { 'Cache-Control': 'no-store' },
    });
    const raw = r.data?.data ?? r.data;
    const rows = Array.isArray(raw) ? raw : [];
    if (rows.length === 0) throw Object.assign(new Error('Aucun personnel à exporter pour ces filtres.'), { code: 'EMPTY_EXPORT' });
    const header = ['CCAP', 'Nom', 'Prénom', 'Grade', 'Sexe', 'Service', 'Statut', 'Téléphone'];
    const body = rows.map(p => [
      p.ccap || '', p.nom || '', p.prenom || '', p.grade || '',
      p.sexe || '', p.service?.nom || '', p.statut || '', p.telephone || '',
    ]);
    return _buildCsvBlob(header, body);
  },

  victimesCsv: async (params) => {
    const r = await api.get('/victimes', {
      params: { ...params, per_page: 1000 },
      headers: { 'Cache-Control': 'no-store' },
    });
    const raw = r.data?.data ?? r.data;
    const rows = Array.isArray(raw) ? raw : [];
    if (rows.length === 0) throw Object.assign(new Error('Aucune victime à exporter pour ces filtres.'), { code: 'EMPTY_EXPORT' });
    const header = ['Nom', 'Prénom', 'CIN/Passeport', 'Sexe', 'Âge', 'Nationalité', 'Infraction ID', 'Accident ID'];
    const body = rows.map(v => [
      v.nom || '', v.prenom || '', v.no_cin_passeport || '', v.sexe || '',
      v.age || '', v.nationalite || '', v.infraction_id || '', v.accident_id || '',
    ]);
    return _buildCsvBlob(header, body);
  },

  immigrationCsv: async (params) => {
    const r = await api.get('/immigrations-clandestines', {
      params: { ...params, per_page: 1000 },
      headers: { 'Cache-Control': 'no-store' },
    });
    const raw = r.data?.data ?? r.data;
    const rows = Array.isArray(raw) ? raw : [];
    if (rows.length === 0) throw Object.assign(new Error("Aucun dossier d'immigration à exporter pour ces filtres."), { code: 'EMPTY_EXPORT' });
    const header = ['Date', 'Service', 'Total', 'Hommes', 'Femmes', 'Enfants', 'Sénégalais', 'Étrangers', 'Zone départ', 'Zone arrivée'];
    const body = rows.map(i => [
      i.date || '', i.service?.nom || '', i.nombre_interpellation || '',
      i.nombre_hommes || '', i.nombre_femmes || '', i.nombre_enfants || '',
      i.nombre_senegalais || '', i.nombre_etrangers || '',
      i.zone_depart || '', i.zone_arrivee_prevue || '',
    ]);
    return _buildCsvBlob(header, body);
  },

  importJson: (file) => {
    if (!file) return Promise.reject(new Error('Aucun fichier fourni.'));
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return Promise.reject(new Error('Le fichier doit être au format JSON.'));
    }
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/export/import/json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

function _buildCsvBlob(header, rows) {
  const csv = [header, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  return { data: new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }) };
}

export default exportService;
