/* ==========================================================================
   GitHub 私有 Gist 双文件分离同步与 Tombstone-aware 三路无损智能合并引擎
   ========================================================================== */

import { DEFAULT_WEATHER_CITY, KEYS, MAX_SYNC_LOGO_LENGTH } from '../shared/constants.js';
import { sanitizeBookmarksList, sanitizeImageSrc } from '../shared/url-utils.js';
import {
  buildGhHeaders,
  buildGistFilesPayload,
  fetchWithTimeout,
  mergeBookmarksWithTombstones,
  parseGistFilesPayload
} from '../shared/net.js';
import { INITIAL_SPACE_GROUPS, IS_EXTENSION, state } from './state.js';
import { getGroupsForSpace, saveCoreState, storeGetAll, writeStoreInternal } from './storage.js';
import { applyThemeUI, applyRightPanelUI, setAccentColor, showToast } from './ui-utils.js';
import { stripRedundantDictionaryIcons } from './icons.js';
import { renderWorkspaceViews } from './render.js';
import { changeWeatherCity, flushMemoWriteNow, handleMemoInput, renderTodoList, saveTodos, updateMemoCount } from './telemetry.js';

export function showSyncConflictBanner(info) {
  const banner = document.getElementById('syncConflictBanner');
  const text = document.getElementById('syncConflictText');
  if (!banner) return;
  const rTime = info?.remoteUpdatedAt ? new Date(info.remoteUpdatedAt).toLocaleString() : '较新时间';
  if (text) text.textContent = `检测到云端存在另一台设备更新的数据（${rTime}），已暂停覆盖保护数据安全，推荐点击「智能合并两边」无损保留双方修改：`;
  banner.classList.remove('hidden');
  updateSyncBadgeUI('conflict');
}

export function hideSyncConflictBanner() {
  document.getElementById('syncConflictBanner')?.classList.add('hidden');
}

export function updateSyncBadgeUI(status = 'idle') {
  const pill = document.getElementById('storageBadgePill');
  const modalStatus = document.getElementById('ghSyncStatusText');
  const timeStr = state.ghSyncConfig.lastSyncAt
    ? new Date(state.ghSyncConfig.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  if (pill) {
    if (status === 'syncing') {
      pill.textContent = '☁️ 同步中...';
      pill.className = 'py-2 px-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/25 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
    } else if (status === 'conflict') {
      pill.textContent = '⚠️ 发现冲突';
      pill.className = 'py-2 px-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
    } else if (status === 'error') {
      pill.textContent = '⚠️ 同步异常';
      pill.className = 'py-2 px-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
    } else if (state.ghSyncConfig.token && state.ghSyncConfig.gistId) {
      pill.textContent = timeStr ? `☁️ ${timeStr}` : '☁️ 云同步';
      pill.className = 'py-2 px-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
    } else {
      pill.textContent = '● 本地存';
      pill.className = 'py-2 px-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
    }
  }

  if (modalStatus) {
    if (status === 'syncing') modalStatus.textContent = '正在连接 GitHub...';
    else if (status === 'conflict') modalStatus.textContent = '存在双机冲突，请在主页面顶部选择';
    else if (status === 'error') modalStatus.textContent = '同步失败，请检查网络或 Token';
    else if (state.ghSyncConfig.token && state.ghSyncConfig.gistId) modalStatus.textContent = timeStr ? `上次同步 ${timeStr}` : '已连接私有 Gist';
    else if (state.ghSyncConfig.token) modalStatus.textContent = '配置已自动保存 · 待首次上传';
    else modalStatus.textContent = '未配置';
  }
}

export function populateSyncModalFields() {
  const tEl = document.getElementById('ghTokenInput');
  const gEl = document.getElementById('ghGistIdInput');
  const aEl = document.getElementById('ghAutoSyncToggle');
  if (tEl) tEl.value = state.ghSyncConfig.token || '';
  if (gEl) gEl.value = state.ghSyncConfig.gistId || '';
  if (aEl) aEl.checked = state.ghSyncConfig.autoSync !== false;
  updateSyncBadgeUI();
}

export function saveGhSyncConfigFromModal(notify = true) {
  state.ghSyncConfig.token = (document.getElementById('ghTokenInput')?.value || '').trim();
  state.ghSyncConfig.gistId = (document.getElementById('ghGistIdInput')?.value || '').trim();
  state.ghSyncConfig.autoSync = !!document.getElementById('ghAutoSyncToggle')?.checked;
  const p = writeStoreInternal({ [KEYS.ghSync]: state.ghSyncConfig });
  updateSyncBadgeUI();
  if (notify) showToast('✅ GitHub 同步配置已保存');
  return p;
}

export async function collectCurrentSettings() {
  const saved = await storeGetAll([KEYS.theme, KEYS.accent, KEYS.rightPanel, KEYS.city, KEYS.collapsed, KEYS.customLogo]);
  const customLogo = typeof saved[KEYS.customLogo] === 'string' && saved[KEYS.customLogo].length <= MAX_SYNC_LOGO_LENGTH
    ? saved[KEYS.customLogo]
    : '';
  return {
    theme: saved[KEYS.theme] || (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    accent: saved[KEYS.accent] || document.body.getAttribute('data-accent') || 'indigo',
    rightPanel: state.isRightPanelCollapsed ? 'collapsed' : 'expanded',
    city: saved[KEYS.city] || DEFAULT_WEATHER_CITY,
    collapsed: state.collapsedGroups || {},
    customLogo
  };
}

export function applySettingsPayload(settings) {
  if (!settings || typeof settings !== 'object') return;
  const toSave = {};
  if (settings.theme === 'light' || settings.theme === 'dark') {
    applyThemeUI(settings.theme);
    toSave[KEYS.theme] = settings.theme;
  }
  if (typeof settings.accent === 'string') {
    setAccentColor(settings.accent, false, true);
    toSave[KEYS.accent] = settings.accent;
  }
  if (settings.rightPanel === 'collapsed' || settings.rightPanel === 'expanded') {
    state.isRightPanelCollapsed = settings.rightPanel === 'collapsed';
    applyRightPanelUI();
    toSave[KEYS.rightPanel] = settings.rightPanel;
  }
  if (typeof settings.city === 'string' && settings.city) {
    toSave[KEYS.city] = settings.city;
    const sel = document.getElementById('citySelector');
    if (sel && sel.value !== settings.city) {
      const hasOption = Array.from(sel.options).some(o => o.value === settings.city);
      if (hasOption) sel.value = settings.city;
      changeWeatherCity(settings.city, false, true);
    }
  }
  if (settings.collapsed && typeof settings.collapsed === 'object') {
    state.collapsedGroups = settings.collapsed;
    toSave[KEYS.collapsed] = state.collapsedGroups;
  }
  const safeLogo = sanitizeImageSrc(settings.customLogo);
  if (safeLogo) {
    toSave[KEYS.customLogo] = safeLogo;
    const img = document.getElementById('brandLogoImg');
    const fav = document.getElementById('pageFavicon');
    if (img) img.src = safeLogo;
    if (fav) fav.href = safeLogo;
  }
  if (Object.keys(toSave).length > 0) writeStoreInternal(toSave);
}

export function applySyncPayload(data) {
  if (!data || !Array.isArray(data.bookmarks)) return false;
  state.bookmarks = sanitizeBookmarksList(data.bookmarks);
  if (data.spaceGroups && typeof data.spaceGroups === 'object') {
    state.spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...data.spaceGroups };
  }
  if (data.tombstones && typeof data.tombstones === 'object') {
    state.tombstones = data.tombstones;
  }
  if (Array.isArray(data.todos)) {
    state.todos = data.todos;
    saveTodos(true);
    renderTodoList();
  }
  if (typeof data.memo === 'string') {
    const area = document.getElementById('quickMemoArea');
    if (area) area.value = data.memo;
    handleMemoInput(data.memo, true);
  }
  if (data.settings) {
    applySettingsPayload(data.settings);
  }
  if (state.currentSpace !== 'home' && state.currentSpace !== 'tools' && state.currentGroup !== 'all') {
    if (!getGroupsForSpace(state.currentSpace).includes(state.currentGroup)) state.currentGroup = 'all';
  }
  state.localUpdatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : Date.now();
  stripRedundantDictionaryIcons(false);
  saveCoreState(true);
  renderWorkspaceViews({ preserveScroll: true });
  return true;
}

async function fetchRemoteGistData() {
  const res = await fetchWithTimeout(`https://api.github.com/gists/${encodeURIComponent(state.ghSyncConfig.gistId)}`, {
    headers: buildGhHeaders(state.ghSyncConfig.token),
    cache: 'no-store'
  }, 10000);

  if (!res.ok) {
    if (res.status === 401) throw new Error('Token 无效或已过期');
    if (res.status === 404) throw new Error('找不到对应的 Gist ID');
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  return parseGistFilesPayload(json);
}

const MAX_PUSH_RETRY_PASSES = 3;
let pendingForcePush = false;

async function executePushViaExtension(silent, force) {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'SYNC_PUSH', force });
    if (res?.conflict) {
      showSyncConflictBanner({ remoteUpdatedAt: res.remoteUpdatedAt });
      showToast('⚠️ 检测到云端有另一台设备的新改动，推荐点击顶部「智能合并两边」');
      return false;
    }
    if (res?.ok) {
      hideSyncConflictBanner();
      if (res.gistId) {
        state.ghSyncConfig.gistId = res.gistId;
        const gEl = document.getElementById('ghGistIdInput');
        if (gEl) gEl.value = res.gistId;
      }
      if (res.updatedAt) {
        state.localUpdatedAt = res.updatedAt;
        state.ghSyncConfig.lastRemoteUpdatedAt = res.updatedAt;
      }
      state.ghSyncConfig.lastSyncAt = Date.now();
      updateSyncBadgeUI('idle');
      if (!silent) {
        showToast(res.isCreate ? '🎉 已自动创建私有 Gist 并上传！请复制 Gist ID 给另一台电脑' : '☁️ 已成功上传书签与界面配置到私有 Gist');
      }
      return true;
    }
    if (res?.skipped) {
      updateSyncBadgeUI('idle');
      return false;
    }
    throw new Error(res?.error || '请检查网络');
  } catch (err) {
    console.error('后台 Gist 上传失败:', err);
    updateSyncBadgeUI('error');
    if (!silent) showToast(`❌ 上传失败：${err.message || '请检查网络'}`);
    return false;
  }
}

async function executePushStandalone(silent, force, { keepalive = false } = {}) {
  try {
    const settings = await collectCurrentSettings();
    const nowTs = Math.max(Date.now(), state.localUpdatedAt);
    const files = buildGistFilesPayload({
      rawBms: state.bookmarks,
      spaceGroups: state.spaceGroups,
      todos: state.todos,
      memo: document.getElementById('quickMemoArea')?.value || '',
      tombstones: state.tombstones,
      nowTs,
      settings
    });
    const isCreate = !state.ghSyncConfig.gistId;
    const endpoint = isCreate
      ? 'https://api.github.com/gists'
      : `https://api.github.com/gists/${encodeURIComponent(state.ghSyncConfig.gistId)}`;
    const body = { description: 'Personal Workspace OS - Private Sync Data (v11.2)', files };
    if (isCreate) body.public = false;
    const bodyStr = JSON.stringify(body);
    const canKeepalive = keepalive && new TextEncoder().encode(bodyStr).length < 60000;

    const fetchOpts = {
      method: isCreate ? 'POST' : 'PATCH',
      headers: buildGhHeaders(state.ghSyncConfig.token),
      body: bodyStr
    };
    if (canKeepalive) fetchOpts.keepalive = true;

    const res = await fetchWithTimeout(endpoint, fetchOpts, 12000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (isCreate && json.id) {
      state.ghSyncConfig.gistId = json.id;
      const gEl = document.getElementById('ghGistIdInput');
      if (gEl) gEl.value = json.id;
    }
    state.localUpdatedAt = nowTs;
    state.ghSyncConfig.lastSyncAt = Date.now();
    state.ghSyncConfig.lastRemoteUpdatedAt = nowTs;
    writeStoreInternal({ [KEYS.ghSync]: state.ghSyncConfig, [KEYS.updatedAt]: state.localUpdatedAt });
    updateSyncBadgeUI('idle');
    if (!silent) showToast('☁️ 已成功上传最新数据到 GitHub 私有 Gist');
    return true;
  } catch (err) {
    updateSyncBadgeUI('error');
    if (!silent) showToast(`❌ 上传失败：${err.message || '请检查网络'}`);
    return false;
  }
}

export async function pushToGist(silent = false, force = false, opts = {}) {
  if (!state.ghSyncConfig.token) {
    if (!silent) showToast('💡 请先填写 GitHub Token');
    return false;
  }

  if (IS_EXTENSION && chrome.runtime && chrome.runtime.sendMessage) {
    updateSyncBadgeUI('syncing');
    return executePushViaExtension(silent, force);
  }

  if (state.isSyncing) {
    state.pendingPushAfterSync = true;
    if (force) pendingForcePush = true;
    return false;
  }

  state.isSyncing = true;
  updateSyncBadgeUI('syncing');
  let ok = false;
  let currentForce = force;
  let passes = 0;

  try {
    do {
      state.pendingPushAfterSync = false;
      pendingForcePush = false;
      passes++;
      ok = await executePushStandalone(silent, currentForce, opts);
      currentForce = pendingForcePush;
      if (!ok) break;
    } while (state.pendingPushAfterSync && passes < MAX_PUSH_RETRY_PASSES);
  } finally {
    state.isSyncing = false;
    state.pendingPushAfterSync = false;
    pendingForcePush = false;
  }
  return ok;
}

export async function mergeConflictWithRemote() {
  if (!state.ghSyncConfig.token || !state.ghSyncConfig.gistId) {
    showToast('💡 请先配置 GitHub Token 和 Gist ID');
    return;
  }
  if (state.isSyncing) return;
  state.isSyncing = true;
  updateSyncBadgeUI('syncing');

  try {
    const remoteData = await fetchRemoteGistData();
    const remoteBms = sanitizeBookmarksList(remoteData.bookmarks);
    const mergedResult = mergeBookmarksWithTombstones(
      state.bookmarks,
      remoteBms,
      state.tombstones,
      remoteData.tombstones,
      Date.now()
    );
    state.bookmarks = mergedResult.bookmarks;
    state.tombstones = mergedResult.tombstones;

    if (remoteData.spaceGroups && typeof remoteData.spaceGroups === 'object') {
      Object.entries(remoteData.spaceGroups).forEach(([sp, list]) => {
        if (!Array.isArray(list)) return;
        if (!state.spaceGroups[sp]) state.spaceGroups[sp] = [];
        list.forEach(g => { if (!state.spaceGroups[sp].includes(g)) state.spaceGroups[sp].push(g); });
      });
    }
    state.bookmarks.forEach(b => {
      if (!state.spaceGroups[b.space]) state.spaceGroups[b.space] = [];
      if (b.group && !state.spaceGroups[b.space].includes(b.group)) state.spaceGroups[b.space].push(b.group);
    });

    const remoteTodos = Array.isArray(remoteData.todos) ? remoteData.todos : [];
    const localTodoIds = new Set(state.todos.map(t => t.id));
    const localTodoTexts = new Set(state.todos.map(t => (t.text || '').trim().toLowerCase()));
    let addedTodos = 0;
    remoteTodos.forEach(rt => {
      const normText = (rt.text || '').trim().toLowerCase();
      if (!localTodoIds.has(rt.id) && !localTodoTexts.has(normText)) {
        state.todos.push(rt);
        localTodoIds.add(rt.id);
        localTodoTexts.add(normText);
        addedTodos++;
      }
    });

    const area = document.getElementById('quickMemoArea');
    const localMemo = (area ? area.value : '').trim();
    const remoteMemo = (typeof remoteData.memo === 'string' ? remoteData.memo : '').trim();
    let mergedMemo = localMemo;
    if (remoteMemo && remoteMemo !== localMemo) {
      if (!localMemo) mergedMemo = remoteMemo;
      else if (remoteMemo.includes(localMemo)) mergedMemo = remoteMemo;
      else if (!localMemo.includes(remoteMemo)) mergedMemo = `${localMemo}\n\n--- [另一台设备合并] ---\n${remoteMemo}`;
    }
    if (area) area.value = mergedMemo;

    if (remoteData.settings?.collapsed && typeof remoteData.settings.collapsed === 'object') {
      state.collapsedGroups = { ...remoteData.settings.collapsed, ...state.collapsedGroups };
      writeStoreInternal({ [KEYS.collapsed]: state.collapsedGroups });
    }

    state.localUpdatedAt = Date.now();
    stripRedundantDictionaryIcons(false);
    saveTodos(true);
    renderTodoList();
    flushMemoWriteNow(mergedMemo, true);
    updateMemoCount(mergedMemo);
    saveCoreState(true);
    renderWorkspaceViews({ preserveScroll: true });

    const pushed = (IS_EXTENSION && chrome.runtime && chrome.runtime.sendMessage)
      ? await executePushViaExtension(true, true)
      : await executePushStandalone(true, true);
    const summaryParts = [];
    if (mergedResult.addedFromRemote > 0) summaryParts.push(`补入 ${mergedResult.addedFromRemote} 条书签`);
    if (mergedResult.removedByRemote > 0) summaryParts.push(`同步删除 ${mergedResult.removedByRemote} 条`);
    if (addedTodos > 0) summaryParts.push(`${addedTodos} 条待办`);
    const summaryTxt = summaryParts.length > 0 ? summaryParts.join('、') : '数据一致';

    if (pushed) {
      hideSyncConflictBanner();
      showToast(`🔀 无损合并完成（${summaryTxt}）并已同步上云`, { duration: 4200 });
    } else {
      showToast(`🔀 已在本机合并完成（${summaryTxt}），但推送上云失败，请稍后重试上传`, { duration: 4500 });
    }
  } catch (err) {
    console.error('智能合并失败:', err);
    updateSyncBadgeUI('error');
    showToast(`❌ 智能合并失败：${err.message || '请检查网络'}`);
  } finally {
    state.isSyncing = false;
    state.pendingPushAfterSync = false;
    pendingForcePush = false;
  }
}

export async function pullFromGist(onlyIfNewer = false) {
  if (!state.ghSyncConfig.token || !state.ghSyncConfig.gistId) {
    if (!onlyIfNewer) showToast('💡 请先填写 GitHub Token 和 Gist ID');
    return;
  }
  if (state.isSyncing) return;
  state.isSyncing = true;
  updateSyncBadgeUI('syncing');

  try {
    const remoteData = await fetchRemoteGistData();
    const remoteTime = typeof remoteData.updatedAt === 'number' ? remoteData.updatedAt : 0;
    const lastKnownRemote = typeof state.ghSyncConfig.lastRemoteUpdatedAt === 'number' ? state.ghSyncConfig.lastRemoteUpdatedAt : 0;

    if (onlyIfNewer) {
      const hasLocalUnsynced = state.localUpdatedAt > 0 && (
        (lastKnownRemote > 0 && state.localUpdatedAt > lastKnownRemote) ||
        (lastKnownRemote === 0 && !state.ghSyncConfig.lastSyncAt)
      );
      if (hasLocalUnsynced && remoteTime > lastKnownRemote) {
        const conflictInfo = { detectedAt: Date.now(), remoteUpdatedAt: remoteTime, localUpdatedAt: state.localUpdatedAt };
        writeStoreInternal({ [KEYS.syncConflict]: conflictInfo });
        showSyncConflictBanner(conflictInfo);
        return;
      }
      if (remoteTime <= state.localUpdatedAt && state.localUpdatedAt > 0) {
        state.ghSyncConfig.lastSyncAt = Date.now();
        state.ghSyncConfig.lastRemoteUpdatedAt = Math.max(lastKnownRemote, remoteTime);
        writeStoreInternal({ [KEYS.ghSync]: state.ghSyncConfig, [KEYS.syncConflict]: null });
        hideSyncConflictBanner();
        updateSyncBadgeUI('idle');
        return;
      }
    }

    if (applySyncPayload(remoteData)) {
      state.ghSyncConfig.lastSyncAt = Date.now();
      state.ghSyncConfig.lastRemoteUpdatedAt = remoteTime || state.localUpdatedAt;
      writeStoreInternal({ [KEYS.ghSync]: state.ghSyncConfig, [KEYS.syncConflict]: null });
      hideSyncConflictBanner();
      updateSyncBadgeUI('idle');
      const dcEl = document.getElementById('dcTotalCount');
      if (dcEl) dcEl.textContent = `${state.bookmarks.length} 个书签`;
      showToast(onlyIfNewer ? '☁️ 已自动同步另一台设备的最新更改与偏好' : `☁️ 已从云端拉取 ${state.bookmarks.length} 个书签与偏好设置`);
    }
  } catch (err) {
    console.error('Gist 拉取失败:', err);
    updateSyncBadgeUI('error');
    if (!onlyIfNewer) showToast(`❌ 拉取失败：${err.message || '请检查网络'}`);
  } finally {
    state.isSyncing = false;
  }
}

export function scheduleAutoSync() {
  if (!state.ghSyncConfig.token || !state.ghSyncConfig.autoSync) return;
  clearTimeout(state.autoSyncTimer);
  state.autoSyncTimer = setTimeout(() => pushToGist(true, false), 1800);
}

export async function autoSyncOnStartup() {
  if (!state.ghSyncConfig.token || !state.ghSyncConfig.gistId || !state.ghSyncConfig.autoSync) return;
  state.lastWakePullAt = Date.now();
  await pullFromGist(true);
}
