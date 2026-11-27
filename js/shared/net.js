/* ==========================================================================
   前后台共享网络请求、Gist 双文件拆装与 Tombstone 裁剪工具
   ========================================================================== */

import {
  GIST_FILENAME,
  GIST_ICONS_FILENAME,
  MAX_SYNC_ICON_LENGTH,
  MAX_SYNC_LOGO_LENGTH,
  TOMBSTONE_MAX_AGE_MS,
  TOMBSTONE_MAX_COUNT
} from './constants.js';
import { canonicalUrlKey, sanitizeBookmarksList, sanitizeImageSrc } from './url-utils.js';

export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function buildGhHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

export function pruneTombstones(rawMap, now = Date.now()) {
  if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
  const minTs = now - TOMBSTONE_MAX_AGE_MS;
  const entries = Object.entries(rawMap)
    .filter(([k, ts]) => typeof k === 'string' && k && typeof ts === 'number' && ts > minTs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOMBSTONE_MAX_COUNT);
  return Object.fromEntries(entries);
}

export function mergeTombstones(localMap, remoteMap, now = Date.now()) {
  const merged = {};
  for (const src of [localMap, remoteMap]) {
    if (!src || typeof src !== 'object') continue;
    for (const [k, ts] of Object.entries(src)) {
      if (typeof ts === 'number' && (!merged[k] || ts > merged[k])) {
        merged[k] = ts;
      }
    }
  }
  return pruneTombstones(merged, now);
}

async function readGistFileContent(fileObj) {
  if (!fileObj) return '';
  if (fileObj.truncated && fileObj.raw_url) {
    const rawRes = await fetchWithTimeout(fileObj.raw_url, { cache: 'no-store' }, 10000);
    if (rawRes.ok) return rawRes.text();
  }
  return fileObj.content || '';
}

export async function parseGistFilesPayload(gistJson) {
  const files = gistJson?.files || {};
  const mainFile = files[GIST_FILENAME] || Object.values(files).find(f => f?.filename?.endsWith('.json') && f.filename !== GIST_ICONS_FILENAME);
  if (!mainFile) throw new Error('Gist 中未找到同步数据文件');

  const mainRaw = await readGistFileContent(mainFile);
  const data = JSON.parse(mainRaw);
  const cleanBms = sanitizeBookmarksList(data.bookmarks);

  const iconsFile = files[GIST_ICONS_FILENAME];
  if (iconsFile) {
    try {
      const iconsRaw = await readGistFileContent(iconsFile);
      const iconsPayload = JSON.parse(iconsRaw);
      const iconDict = iconsPayload?.icons && typeof iconsPayload.icons === 'object' ? iconsPayload.icons : {};
      cleanBms.forEach(bm => {
        const k = canonicalUrlKey(bm.url);
        if (!bm.customIcon && iconDict[k]) {
          const safe = sanitizeImageSrc(iconDict[k]);
          if (safe) bm.customIcon = safe;
        }
      });
      if (iconsPayload?.customLogo && (!data.settings || !data.settings.customLogo)) {
        const safeLogo = sanitizeImageSrc(iconsPayload.customLogo);
        if (safeLogo) {
          data.settings = { ...(data.settings || {}), customLogo: safeLogo };
        }
      }
    } catch {}
  }

  data.bookmarks = cleanBms;
  data.tombstones = pruneTombstones(data.tombstones);
  return data;
}

export function buildGistFilesPayload({ rawBms, spaceGroups, todos, memo, settings, tombstones, nowTs }) {
  const iconsMap = {};
  const cleanBookmarks = (Array.isArray(rawBms) ? rawBms : []).map(b => {
    const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
    if (b.pinned) item.pinned = true;
    if (b.quickSavedAt) item.quickSavedAt = b.quickSavedAt;
    if (typeof b.updatedAt === 'number' && b.updatedAt > 0) item.updatedAt = b.updatedAt;
    if (b.customIcon) {
      const safeIcon = sanitizeImageSrc(b.customIcon);
      if (safeIcon) {
        if (safeIcon.startsWith('data:image')) {
          if (safeIcon.length <= MAX_SYNC_ICON_LENGTH) {
            iconsMap[canonicalUrlKey(b.url)] = safeIcon;
          }
        } else {
          item.customIcon = safeIcon;
        }
      }
    }
    return item;
  });

  const rawLogo = typeof settings?.customLogo === 'string' && settings.customLogo.length <= MAX_SYNC_LOGO_LENGTH
    ? sanitizeImageSrc(settings.customLogo)
    : '';
  const cleanSettings = { ...(settings || {}), customLogo: '' };

  const mainPayload = {
    version: 11.2,
    updatedAt: nowTs,
    spaceGroups: spaceGroups || {},
    bookmarks: cleanBookmarks,
    todos: Array.isArray(todos) ? todos : [],
    memo: typeof memo === 'string' ? memo : '',
    tombstones: pruneTombstones(tombstones, nowTs),
    settings: cleanSettings
  };

  const files = {
    [GIST_FILENAME]: { content: JSON.stringify(mainPayload, null, 2) }
  };

  if (Object.keys(iconsMap).length > 0 || rawLogo) {
    files[GIST_ICONS_FILENAME] = {
      content: JSON.stringify({ version: 11.2, updatedAt: nowTs, customLogo: rawLogo, icons: iconsMap })
    };
  }

  return files;
}

export function mergeBookmarksWithTombstones(localBms, remoteBms, localTombs = {}, remoteTombs = {}, now = Date.now()) {
  const mergedTombstones = mergeTombstones(localTombs, remoteTombs, now);
  const localList = Array.isArray(localBms) ? localBms : [];
  const remoteList = Array.isArray(remoteBms) ? remoteBms : [];

  const remoteMap = new Map();
  remoteList.forEach(rb => {
    const k = canonicalUrlKey(rb.url);
    if (k && !remoteMap.has(k)) remoteMap.set(k, rb);
  });

  const result = [];
  const seenKeys = new Set();
  let removedByRemote = 0;
  let addedFromRemote = 0;
  let skippedByLocalTomb = 0;

  localList.forEach(lb => {
    const k = canonicalUrlKey(lb.url);
    if (!k || seenKeys.has(k)) return;
    seenKeys.add(k);

    const rb = remoteMap.get(k);
    const lbTime = typeof lb.updatedAt === 'number' ? lb.updatedAt : 0;

    if (rb) {
      const rbTime = typeof rb.updatedAt === 'number' ? rb.updatedAt : 0;
      const maxBmTime = Math.max(lbTime, rbTime);
      const tombTime = mergedTombstones[k] || 0;
      if (tombTime > maxBmTime) {
        removedByRemote++;
        return;
      }
      if (rbTime > lbTime) {
        result.push({ ...lb, ...rb, customIcon: rb.customIcon || lb.customIcon });
      } else {
        const next = { ...lb };
        if (rb.pinned && !next.pinned) next.pinned = true;
        if (!next.customIcon && rb.customIcon) next.customIcon = rb.customIcon;
        result.push(next);
      }
    } else {
      const remoteTombAt = (remoteTombs && typeof remoteTombs[k] === 'number') ? remoteTombs[k] : 0;
      if (remoteTombAt > lbTime) {
        removedByRemote++;
        return;
      }
      result.push(lb);
    }
  });

  remoteList.forEach(rb => {
    const k = canonicalUrlKey(rb.url);
    if (!k || seenKeys.has(k)) return;
    seenKeys.add(k);

    const rbTime = typeof rb.updatedAt === 'number' ? rb.updatedAt : 0;
    const localTombAt = (localTombs && typeof localTombs[k] === 'number') ? localTombs[k] : 0;
    if (localTombAt > rbTime) {
      skippedByLocalTomb++;
      return;
    }
    result.push(rb);
    addedFromRemote++;
  });

  result.forEach(bm => {
    const k = canonicalUrlKey(bm.url);
    const bmTime = typeof bm.updatedAt === 'number' ? bm.updatedAt : 0;
    if (k in mergedTombstones && bmTime >= mergedTombstones[k]) {
      delete mergedTombstones[k];
    }
  });

  return {
    bookmarks: result,
    tombstones: pruneTombstones(mergedTombstones, now),
    addedFromRemote,
    removedByRemote,
    skippedByLocalTomb
  };
}
