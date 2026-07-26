const SENEGAL_BOUNDS = { latMin: 12, latMax: 17, lngMin: -18, lngMax: -11 };

export const isValidSenegalCoord = (lat, lng) =>
  lat >= SENEGAL_BOUNDS.latMin && lat <= SENEGAL_BOUNDS.latMax &&
  lng >= SENEGAL_BOUNDS.lngMin && lng <= SENEGAL_BOUNDS.lngMax;
