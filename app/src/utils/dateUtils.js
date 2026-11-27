export function getNewYorkTodayStr(input) {
  try {
    const d = input ? (input instanceof Date ? input : new Date(input)) : new Date();
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

export function formatDateOnlyNY(val, fallback = 'N/A') {
  if (!val || val === 'N/A') return fallback;
  const str = String(val).trim();
  const datePart = str.includes('T') ? str.split('T')[0] : str;
  const parts = datePart.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (y && m && d) {
      return `${m}/${d}/${y}`;
    }
  }
  try {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
    }
  } catch (e) {}
  return str;
}

