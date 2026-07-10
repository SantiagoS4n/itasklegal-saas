/** Formatea número con separadores de miles */
export function fmtMoney(val) {
  if (val === null || val === undefined || val === '') return '';
  return parseFloat(val).toLocaleString('en-US');
}

/** Extrae URL segura de un campo que puede ser string, objeto o array */
export function safeUrl(field) {
  if (!field) return '';
  if (Array.isArray(field)) field = field[0];
  if (typeof field === 'object' && field !== null) return field.url || field.URL || '';
  const s = String(field).trim();
  if (!s || s === 'undefined' || s === 'null') return '';
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
}

/** Genera las iniciales de un nombre */
export function initials(name = '') {
  return name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
