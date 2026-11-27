/* ==========================================================================
   前后台共享 URL、安全校验与文本转义工具
   ========================================================================== */

export function generateId(prefix = 'bm') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeUrl(url) {
  return (url || '').trim().replace(/\/$/, '').toLowerCase();
}

export function getOriginAndPath(url) {
  try {
    const u = new URL(url);
    return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return '';
  }
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function canonicalUrlKey(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase() +
      u.pathname.replace(/\/+$/, '').toLowerCase() +
      u.search.toLowerCase();
  } catch {
    return normalizeUrl(url);
  }
}

export function isPrivateHostOrUrl(rawUrlOrHost) {
  if (!rawUrlOrHost) return true;
  let host = String(rawUrlOrHost).trim().toLowerCase();
  if (/^https?:\/\//i.test(host)) {
    try { host = new URL(host).hostname.toLowerCase(); } catch { return true; }
  }
  host = host.replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host === '::1' || host.endsWith('.local') || host.endsWith('.lan') || host.includes('hzpipeline.com')) {
    return true;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return true;
  const m172 = host.match(/^172\.(\d+)\./);
  if (m172) {
    const second = parseInt(m172[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function sanitizeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch {
    return '';
  }
}

export function sanitizeImageSrc(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return sanitizeUrl(raw);
  if (/^data:image\/(png|jpeg|jpg|webp|gif|x-icon|vnd\.microsoft\.icon|svg\+xml)[;,]/i.test(raw)) {
    return raw;
  }
  return '';
}

export function sanitizeBookmarksList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(b => b && typeof b === 'object')
    .map(b => {
      const safeUrl = sanitizeUrl(b.url);
      if (!safeUrl) return null;
      const clean = { ...b, url: safeUrl };
      if (b.customIcon) {
        const safeIcon = sanitizeImageSrc(b.customIcon);
        if (safeIcon) clean.customIcon = safeIcon;
        else delete clean.customIcon;
      }
      return clean;
    })
    .filter(Boolean);
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
