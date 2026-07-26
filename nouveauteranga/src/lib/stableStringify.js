export const stableStringify = (val) => {
  if (val === null || val === undefined || typeof val !== 'object') return JSON.stringify(val);
  if (Array.isArray(val)) return '[' + val.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(val).sort().map(k => `${JSON.stringify(k)}:${stableStringify(val[k])}`).join(',') + '}';
};
