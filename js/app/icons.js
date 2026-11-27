/* ==========================================================================
   双层渐进式超清图标引擎（支持 48×48 WebP 压缩、单站刷新与冗余字典剥离）
   ========================================================================== */

import {
  BROKEN_BASE64_HOSTS,
  KEYS,
  MAX_SYNC_ICON_LENGTH,
  OFFICIAL_BRAND_SVGS,
  SPACE_GRAD_MAP
} from '../shared/constants.js';
import {
  escapeHtml,
  extractDomain,
  getOriginAndPath,
  isPrivateHostOrUrl,
  normalizeUrl,
  sanitizeImageSrc
} from '../shared/url-utils.js';
import { fetchWithTimeout } from '../shared/net.js';
import {
  hdUpgradedCache,
  iconBustMap,
  IS_EXTENSION,
  offlineIconMapByHost,
  offlineIconMapByUrl,
  state
} from './state.js';
import { saveCoreState, writeStoreInternal } from './storage.js';
import { showToast } from './ui-utils.js';

const OFFICIAL_BRAND_ENTRIES = Object.entries(OFFICIAL_BRAND_SVGS);
const ICON_LOCALIZE_CONCURRENCY = 4;

export function buildOfflineIconMaps() {
  if (!Array.isArray(window.DEFAULT_BOOKMARKS)) return;
  window.DEFAULT_BOOKMARKS.forEach(item => {
    if (item.icon && item.icon.startsWith('data:image')) {
      const h = (item.host || extractDomain(item.url)).toLowerCase();
      if (BROKEN_BASE64_HOSTS.has(h)) return;
      if (item.url) {
        offlineIconMapByUrl.set(normalizeUrl(item.url), item.icon);
        const cleanPath = getOriginAndPath(item.url);
        if (cleanPath) offlineIconMapByUrl.set(cleanPath, item.icon);
      }
      if (h && !(h === 'github.com' && item.id === 'bm_4')) {
        if (!offlineIconMapByHost.has(h)) offlineIconMapByHost.set(h, item.icon);
        const rootH = h.replace(/^www\./, '');
        if (!offlineIconMapByHost.has(rootH)) offlineIconMapByHost.set(rootH, item.icon);
      }
    }
  });
  if (offlineIconMapByHost.has('www.unrealengine.com')) {
    offlineIconMapByHost.set('www.fab.com', offlineIconMapByHost.get('www.unrealengine.com'));
    offlineIconMapByHost.set('fab.com', offlineIconMapByHost.get('www.unrealengine.com'));
  }
}

export function findOfflineBase64(url) {
  if (!url) return '';
  const norm = normalizeUrl(url);
  const pathKey = getOriginAndPath(url);
  const h = extractDomain(url).toLowerCase();
  const rootH = h.replace(/^www\./, '');
  return offlineIconMapByUrl.get(norm) ||
    offlineIconMapByUrl.get(pathKey) ||
    offlineIconMapByHost.get(h) ||
    offlineIconMapByHost.get(rootH) ||
    '';
}

export function stripRedundantDictionaryIcons(persistIfChanged = false) {
  let changed = false;
  state.bookmarks.forEach(bm => {
    if (!bm.icon) return;
    const dictIcon = findOfflineBase64(bm.url);
    if (dictIcon && bm.icon === dictIcon) {
      delete bm.icon;
      changed = true;
    }
  });
  if (changed && persistIfChanged) {
    writeStoreInternal({ [KEYS.bookmarks]: state.bookmarks });
  }
  return changed;
}

export function getHighDefIconInfo(bm) {
  const host = extractDomain(bm.url).toLowerCase();
  const cleanHost = host.replace(/^www\./, '');
  const bustTs = iconBustMap.get(bm.id);
  const safeCustomIcon = sanitizeImageSrc(bm.customIcon);

  if (safeCustomIcon && !bustTs) return { primarySrc: safeCustomIcon, hd1: '', hd2: '', fb1: '', host };

  if (!bustTs) {
    for (let i = 0; i < OFFICIAL_BRAND_ENTRIES.length; i++) {
      const [domainKey, svgDataUri] = OFFICIAL_BRAND_ENTRIES[i];
      if (cleanHost === domainKey || cleanHost.endsWith('.' + domainKey)) {
        return { primarySrc: svgDataUri, hd1: '', hd2: '', fb1: '', host };
      }
    }
  }

  const isPrivateHost = isPrivateHostOrUrl(host);
  const suffix = bustTs ? `&_t=${bustTs}` : '';
  const iowenSuffix = bustTs ? `?_t=${bustTs}` : '';
  const favImHd = !isPrivateHost ? `https://favicon.im/${host}?larger=true${suffix}` : '';
  const googleHd = !isPrivateHost ? `https://www.google.com/s2/favicons?domain=${host}&sz=128${suffix}` : '';
  const iowenHd = !isPrivateHost ? `https://api.iowen.cn/favicon/${host}.png${iowenSuffix}` : '';

  if (bustTs) {
    return { primarySrc: favImHd || googleHd, hd1: '', hd2: iowenHd, fb1: googleHd || findOfflineBase64(bm.url), host };
  }

  if (hdUpgradedCache.has(host)) {
    return { primarySrc: hdUpgradedCache.get(host), hd1: '', hd2: '', fb1: findOfflineBase64(bm.url), host };
  }

  const offlineBase64 = (bm.icon && bm.icon.startsWith('data:image')) ? bm.icon : findOfflineBase64(bm.url);
  if (offlineBase64) return { primarySrc: offlineBase64, hd1: favImHd, hd2: googleHd, fb1: iowenHd, host };
  return { primarySrc: favImHd || googleHd, hd1: '', hd2: iowenHd, fb1: googleHd || iowenHd, host };
}

export function renderCardIconInnerHtml(bm) {
  const host = extractDomain(bm.url);
  const firstChar = ((bm.title || host || 'W').replace(/[^\w\u4e00-\u9fa5]/g, '')[0] || '⚡').toUpperCase();
  const gradClass = SPACE_GRAD_MAP[bm.space] || 'from-indigo-500 to-purple-600';
  const { primarySrc, hd1, hd2, fb1 } = getHighDefIconInfo(bm);
  return primarySrc ? `
    <img
      src="${escapeHtml(primarySrc)}"
      data-hd1="${escapeHtml(hd1)}"
      data-hd2="${escapeHtml(hd2)}"
      data-fb1="${escapeHtml(fb1)}"
      data-host="${escapeHtml(host)}"
      data-step="0"
      alt=""
      loading="lazy"
      class="icon-img w-7 h-7 object-contain rounded-md"
    >
    <span class="hidden icon-img w-full h-full items-center justify-center font-extrabold text-sm bg-gradient-to-br ${gradClass} text-white rounded-xl">${escapeHtml(firstChar)}</span>
  ` : `
    <span class="icon-img w-full h-full flex items-center justify-center font-extrabold text-sm bg-gradient-to-br ${gradClass} text-white rounded-xl">${escapeHtml(firstChar)}</span>
  `;
}

export function updateCardIconDom(bmId) {
  const bm = state.bookmarks.find(b => b.id === bmId);
  if (!bm) return false;
  const containers = document.querySelectorAll(`#mainContent .bookmark-card[data-bm-id="${CSS.escape(bmId)}"] .icon-container`);
  if (!containers.length) return false;
  const inner = renderCardIconInnerHtml(bm);
  containers.forEach(c => { c.innerHTML = inner; });
  return true;
}

export function handleIconError(imgEl) {
  const step = parseInt(imgEl.getAttribute('data-step') || '0', 10);
  const fb1 = imgEl.getAttribute('data-fb1') || '';
  const hd2 = imgEl.getAttribute('data-hd2') || '';
  if (step === 0 && fb1 && imgEl.src !== fb1) { imgEl.setAttribute('data-step', '1'); imgEl.src = fb1; return; }
  if (step <= 1 && hd2 && imgEl.src !== hd2) { imgEl.setAttribute('data-step', '2'); imgEl.src = hd2; return; }
  imgEl.style.display = 'none';
  if (imgEl.nextElementSibling) imgEl.nextElementSibling.style.display = 'flex';
}

export function handleIconLoad(imgEl) {
  if (imgEl.naturalWidth > 0 && imgEl.naturalWidth <= 1 && imgEl.naturalHeight <= 1) {
    handleIconError(imgEl);
    return;
  }
  if (imgEl.getAttribute('data-hd-upgraded') !== '1' && imgEl.naturalWidth > 0 && imgEl.naturalWidth < 48) {
    const hd1 = imgEl.getAttribute('data-hd1');
    const hd2 = imgEl.getAttribute('data-hd2');
    const host = imgEl.getAttribute('data-host') || '';
    if (!hd1 && !hd2) return;
    imgEl.setAttribute('data-hd-upgraded', '1');
    const tryUpgrade = (srcUrl, nextUrl) => {
      if (!srcUrl) return;
      const probe = new Image();
      probe.onload = () => {
        if (probe.naturalWidth >= 32 && probe.naturalWidth > imgEl.naturalWidth) {
          imgEl.src = srcUrl;
          if (host) hdUpgradedCache.set(host, srcUrl);
        } else if (nextUrl) {
          tryUpgrade(nextUrl, '');
        }
      };
      probe.onerror = () => { if (nextUrl) tryUpgrade(nextUrl, ''); };
      probe.src = srcUrl;
    };
    tryUpgrade(hd1, hd2);
  }
}

export async function fetchIconAsLocalBase64(url) {
  const res = await fetchWithTimeout(url, { cache: 'no-store' }, 4500);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  if (!blob || blob.size < 60) throw new Error('empty');
  if (blob.type && !blob.type.startsWith('image/') && !blob.type.includes('icon') && blob.type !== 'application/octet-stream') {
    throw new Error('not-image');
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  if (blob.type && blob.type.includes('svg') && typeof dataUrl === 'string' && dataUrl.length <= MAX_SYNC_ICON_LENGTH) {
    return dataUrl;
  }

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => (el.naturalWidth >= 16 && el.naturalHeight >= 16 ? resolve(el) : reject(new Error('too-small')));
    el.onerror = reject;
    el.src = dataUrl;
  });

  const maxSide = 48;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(16, Math.round(img.naturalWidth * scale));
  const h = Math.max(16, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  let webp = canvas.toDataURL('image/webp', 0.80);
  if (webp.length > MAX_SYNC_ICON_LENGTH) {
    webp = canvas.toDataURL('image/webp', 0.62);
  }
  return webp;
}

export async function fetchFastestHostIconBase64(host, pageUrl = '') {
  const isPrivate = isPrivateHostOrUrl(host);
  const chromeLocal = (IS_EXTENSION && pageUrl)
    ? chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=64`)
    : '';

  if (isPrivate) {
    const localSources = [chromeLocal, host ? `https://${host}/favicon.ico` : ''].filter(Boolean);
    for (const src of localSources) {
      try { return await fetchIconAsLocalBase64(src); } catch {}
    }
    throw new Error('private-icon-fail');
  }

  const ts = Date.now();
  const candidates = [
    `https://www.google.com/s2/favicons?domain=${host}&sz=128&_t=${ts}`,
    `https://api.iowen.cn/favicon/${host}.png?_t=${ts}`,
    `https://favicon.im/${host}?larger=true&_t=${ts}`
  ];
  try {
    return await Promise.any(candidates.map(url => fetchIconAsLocalBase64(url)));
  } catch {
    if (chromeLocal) return fetchIconAsLocalBase64(chromeLocal);
    throw new Error('all-icon-sources-failed');
  }
}

export async function refreshBookmarkIcon(bmId, fallbackRender) {
  const bm = state.bookmarks.find(b => b.id === bmId);
  if (!bm) return;
  const host = extractDomain(bm.url).toLowerCase();
  if (!host) { showToast('⚠️ 无法解析域名'); return; }

  hdUpgradedCache.delete(host);
  iconBustMap.delete(bm.id);
  showToast('🔄 正在刷新图标...');

  try {
    const base64Icon = await fetchFastestHostIconBase64(host, bm.url);
    bm.customIcon = base64Icon;
    bm.updatedAt = Date.now();
    hdUpgradedCache.set(host, base64Icon);
    saveCoreState();
    if (!updateCardIconDom(bmId)) fallbackRender?.();
    showToast('✅ 图标已刷新并缓存');
  } catch {
    showToast('⚠️ 图标刷新失败');
  }
}

export async function localizeRemoteCustomIcons() {
  if (!Array.isArray(state.bookmarks) || state.bookmarks.length === 0) return;
  const targets = state.bookmarks.filter(b =>
    typeof b.customIcon === 'string' && /^https?:\/\//i.test(b.customIcon)
  );
  if (targets.length === 0) return;

  let converted = 0;
  const updatedIds = [];
  let cursor = 0;

  const processNext = async () => {
    while (cursor < targets.length) {
      const target = targets[cursor++];
      if (!target) continue;
      const host = extractDomain(target.url).toLowerCase();
      let base64Icon = '';
      try {
        base64Icon = await fetchIconAsLocalBase64(target.customIcon);
      } catch {
        if (host) {
          try { base64Icon = await fetchFastestHostIconBase64(host, target.url); } catch {}
        }
      }
      if (base64Icon) {
        const liveBm = state.bookmarks.find(b => b.id === target.id);
        if (liveBm) {
          liveBm.customIcon = base64Icon;
          if (host) hdUpgradedCache.set(host, base64Icon);
          updatedIds.push(liveBm.id);
          converted++;
        }
      }
    }
  };

  const workerCount = Math.min(ICON_LOCALIZE_CONCURRENCY, targets.length);
  await Promise.all(Array.from({ length: workerCount }, processNext));

  if (converted > 0) {
    saveCoreState(true);
    updatedIds.forEach(id => updateCardIconDom(id));
    showToast(`⚡ 已自动将 ${converted} 个在线图标转为本地离线缓存`);
  }
}
