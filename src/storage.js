const STORAGE_KEY = 'upstream-monitor-sites-v1';

export function loadSites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveSites(sites) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

export function exportSites(sites) {
  const blob = new Blob([JSON.stringify({ sites }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `upstream-monitor-sites-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSites(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.sites)) {
    throw new Error('文件格式错误，缺少 sites 数组');
  }
  return parsed.sites;
}
