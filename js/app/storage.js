/* ==========================================================================
   存储适配层、Tombstone 墓碑维护与核心状态持久化
   ========================================================================== */

import { KEYS } from '../shared/constants.js';
import { canonicalUrlKey, sanitizeBookmarksList } from '../shared/url-utils.js';
import { pruneTombstones } from '../shared/net.js';
import { IS_EXTENSION, state } from './state.js';

let syncSchedulerFn = () => {};
let storageErrorHandlerFn = null;
let lastStorageErrorAt = 0;

let pendingBatchObj = {};
let batchFlushScheduled = false;
let pendingBatchResolvers = [];
let inFlightBatchPromise = null;

export function setSyncScheduler(fn) {
  if (typeof fn === 'function') syncSchedulerFn = fn;
}

export function setStorageErrorHandler(fn) {
  if (typeof fn === 'function') storageErrorHandlerFn = fn;
}

export function triggerScheduledSync() {
  syncSchedulerFn();
}

function notifyStorageError(err) {
  console.error('本地存储写入失败:', err);
  const now = Date.now();
  if (now - lastStorageErrorAt < 8000) return;
  lastStorageErrorAt = now;
  const msg = /quota/i.test(String(err?.message || err))
    ? '⚠️ 本地存储空间已满（配额超限），请先导出 JSON 备份并清理大图标'
    : '⚠️ 本地数据持久化失败，请检查浏览器存储权限';
  storageErrorHandlerFn?.(msg);
}

export async function storeGetAll(keyList) {
  if (IS_EXTENSION) {
    try {
      const res = await chrome.storage.local.get(keyList);
      return res || {};
    } catch (err) {
      console.error('读取 chrome.storage.local 失败:', err);
      return {};
    }
  }
  const out = {};
  keyList.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw !== null) out[k] = JSON.parse(raw);
    } catch {
      const raw = localStorage.getItem(k);
      if (raw !== null) out[k] = raw;
    }
  });
  return out;
}

export async function storeSet(obj) {
  if (IS_EXTENSION) {
    try {
      await chrome.storage.local.set(obj);
      if (chrome.runtime?.lastError) {
        notifyStorageError(new Error(chrome.runtime.lastError.message));
        return false;
      }
      return true;
    } catch (err) {
      notifyStorageError(err);
      return false;
    }
  }
  let ok = true;
  Object.entries(obj).forEach(([k, v]) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (err) {
      ok = false;
      notifyStorageError(err);
    }
  });
  return ok;
}

function executeFlushBatch() {
  batchFlushScheduled = false;
  const payload = pendingBatchObj;
  const resolvers = pendingBatchResolvers;
  pendingBatchObj = {};
  pendingBatchResolvers = [];

  if (Object.keys(payload).length === 0) {
    resolvers.forEach(resolve => resolve(true));
    return Promise.resolve(true);
  }

  state.internalWritePendingCount++;
  const p = storeSet(payload).finally(() => {
    setTimeout(() => {
      state.internalWritePendingCount = Math.max(0, state.internalWritePendingCount - 1);
    }, 60);
    if (inFlightBatchPromise === p) inFlightBatchPromise = null;
  });

  inFlightBatchPromise = p;
  p.then(
    ok => resolvers.forEach(resolve => resolve(ok)),
    () => resolvers.forEach(resolve => resolve(false))
  );
  return p;
}

export function flushStorageWrites() {
  if (Object.keys(pendingBatchObj).length > 0) {
    return executeFlushBatch();
  }
  return inFlightBatchPromise || Promise.resolve(true);
}

export function writeStoreInternal(obj) {
  if (!obj || typeof obj !== 'object') return Promise.resolve(true);
  Object.assign(pendingBatchObj, obj);
  return new Promise(resolve => {
    pendingBatchResolvers.push(resolve);
    if (!batchFlushScheduled) {
      batchFlushScheduled = true;
      queueMicrotask(() => {
        if (batchFlushScheduled) executeFlushBatch();
      });
    }
  });
}

export function markLocalChangeAndSync() {
  state.localUpdatedAt = Date.now();
  writeStoreInternal({ [KEYS.updatedAt]: state.localUpdatedAt });
  triggerScheduledSync();
}

export function saveCoreState(skipSync = false) {
  if (!skipSync) {
    state.localUpdatedAt = Date.now();
  }
  writeStoreInternal({
    [KEYS.bookmarks]: state.bookmarks,
    [KEYS.spaceGroups]: state.spaceGroups,
    [KEYS.tombstones]: state.tombstones,
    [KEYS.updatedAt]: state.localUpdatedAt,
    [KEYS.initialized]: true
  });
  if (!skipSync) {
    triggerScheduledSync();
  }
}

export function getGroupsForSpace(spaceId) {
  const set = new Set(state.spaceGroups[spaceId] || []);
  state.bookmarks.forEach(b => {
    if (b.space === spaceId && b.group) set.add(b.group);
  });
  return Array.from(set);
}

export function recordTombstones(urls, ts = Date.now()) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  urls.forEach(u => {
    const key = canonicalUrlKey(u);
    if (key) state.tombstones[key] = ts;
  });
  state.tombstones = pruneTombstones(state.tombstones, ts);
}

export function clearTombstones(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  let changed = false;
  urls.forEach(u => {
    const key = canonicalUrlKey(u);
    if (key && key in state.tombstones) {
      delete state.tombstones[key];
      changed = true;
    }
  });
  if (changed) {
    writeStoreInternal({ [KEYS.tombstones]: state.tombstones });
  }
}

export function absorbPendingSaves(pendingList) {
  if (!Array.isArray(pendingList) || pendingList.length === 0) return 0;
  let merged = 0;
  sanitizeBookmarksList(pendingList).forEach(item => {
    clearTombstones([item.url]);
    if (!state.bookmarks.some(b => canonicalUrlKey(b.url) === canonicalUrlKey(item.url))) {
      state.bookmarks.unshift(item);
      if (!state.spaceGroups[item.space]) state.spaceGroups[item.space] = [];
      if (!state.spaceGroups[item.space].includes(item.group)) state.spaceGroups[item.space].push(item.group);
      merged++;
    }
  });
  return merged;
}
