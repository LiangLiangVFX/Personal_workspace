/* ==========================================================================
   书签 CRUD（含 Tombstone 与撤销）、Microlink 元数据识别、数据中心与死链体检
   ========================================================================== */

import { DEFAULT_WEATHER_CITY, KEYS, PRE_RESET_SNAPSHOT_KEY, SITE_METADATA_DICT } from '../shared/constants.js';
import {
  canonicalUrlKey,
  escapeHtml,
  extractDomain,
  generateId,
  isPrivateHostOrUrl,
  sanitizeBookmarksList,
  sanitizeImageSrc,
  sanitizeUrl
} from '../shared/url-utils.js';
import { fetchWithTimeout } from '../shared/net.js';
import {
  hdUpgradedCache,
  iconBustMap,
  INITIAL_BOOKMARKS,
  INITIAL_SPACE_GROUPS,
  IS_EXTENSION,
  state
} from './state.js';
import {
  clearTombstones,
  getGroupsForSpace,
  recordTombstones,
  saveCoreState,
  storeGetAll,
  writeStoreInternal
} from './storage.js';
import { applyThemeUI, applyRightPanelUI, openConfirmDialog, setAccentColor, showToast } from './ui-utils.js';
import { findOfflineBase64, stripRedundantDictionaryIcons } from './icons.js';
import { renderWorkspaceViews, switchSpace } from './render.js';
import { finishDragUpdate } from './dnd.js';
import { changeWeatherCity, handleMemoInput, renderTodoList, saveTodos } from './telemetry.js';
import { applySettingsPayload, collectCurrentSettings, populateSyncModalFields } from './sync.js';

export function populateSelectGroups(selectEl, spaceId, selectedGroup = '') {
  if (!selectEl) return;
  const groups = getGroupsForSpace(spaceId);
  selectEl.innerHTML = groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
  if (selectedGroup && groups.includes(selectedGroup)) selectEl.value = selectedGroup;
}

export function openBookmarkModal(id = null) {
  const modal = document.getElementById('bookmarkModal');
  const spaceSel = document.getElementById('bmSpaceSelect');
  const groupSel = document.getElementById('bmGroupSelect');
  document.getElementById('bmNewGroup').value = '';

  if (id) {
    const target = state.bookmarks.find(b => b.id === id);
    if (!target) return;
    document.getElementById('modalTitle').textContent = '编辑书签信息';
    document.getElementById('bmId').value = target.id;
    spaceSel.value = target.space || 'media';
    populateSelectGroups(groupSel, target.space || 'media', target.group);
    document.getElementById('bmUrl').value = target.url || '';
    document.getElementById('bmTitle').value = target.title || '';
    document.getElementById('bmDesc').value = target.desc || '';
    document.getElementById('bmPinned').checked = !!target.pinned;
    document.getElementById('bmCustomIcon').value = target.customIcon || '';
  } else {
    document.getElementById('modalTitle').textContent = '新增书签';
    document.getElementById('bmId').value = '';
    const defSpace = ['ai', 'cg', 'media', 'software'].includes(state.currentSpace) ? state.currentSpace : 'media';
    spaceSel.value = defSpace;
    const defGroup = (state.currentSpace === defSpace && state.currentGroup !== 'all') ? state.currentGroup : '';
    populateSelectGroups(groupSel, defSpace, defGroup);
    document.getElementById('bmUrl').value = '';
    document.getElementById('bmTitle').value = '';
    document.getElementById('bmDesc').value = '';
    document.getElementById('bmPinned').checked = (state.currentSpace === 'home');
    document.getElementById('bmCustomIcon').value = '';
  }

  modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('bmUrl').focus(), 50);
}

export function closeBookmarkModal() {
  document.getElementById('bookmarkModal')?.classList.add('hidden');
}

export function saveBookmark(e) {
  e.preventDefault();
  const id = document.getElementById('bmId').value.trim();
  const space = document.getElementById('bmSpaceSelect').value;
  const newGroupRaw = document.getElementById('bmNewGroup').value.trim();
  const group = newGroupRaw ? (newGroupRaw.match(/^\S+\s+/) ? newGroupRaw : `📁 ${newGroupRaw}`) : document.getElementById('bmGroupSelect').value;
  let url = document.getElementById('bmUrl').value.trim();
  const title = document.getElementById('bmTitle').value.trim();
  let desc = document.getElementById('bmDesc').value.trim();
  const pinned = document.getElementById('bmPinned').checked;
  const customIconRaw = document.getElementById('bmCustomIcon').value.trim();

  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) {
    showToast('⚠️ 请输入有效的 http:// 或 https:// 网址');
    return;
  }
  url = safeUrl;
  const customIcon = customIconRaw ? sanitizeImageSrc(customIconRaw) : '';
  if (customIconRaw && !customIcon) {
    showToast('⚠️ 自定义图标仅支持 http(s) 图片链接或有效图片 Base64');
    return;
  }
  const host = extractDomain(url);
  if (!desc || desc.toLowerCase() === host.toLowerCase()) {
    desc = `${title || host} (${host.replace(/^www\./, '')}) 在线工作台与数字资源平台`;
  }

  if (!state.spaceGroups[space]) state.spaceGroups[space] = [];
  if (!state.spaceGroups[space].includes(group)) state.spaceGroups[space].push(group);

  const nowTs = Date.now();
  clearTombstones([url]);

  if (id) {
    const idx = state.bookmarks.findIndex(b => b.id === id);
    if (idx > -1) {
      const nextBm = { ...state.bookmarks[idx], space, group, url, title, desc, pinned, updatedAt: nowTs };
      if (customIcon) nextBm.customIcon = customIcon;
      else delete nextBm.customIcon;
      state.bookmarks[idx] = nextBm;
      iconBustMap.delete(id);
      showToast('✅ 书签已更新并自动保存');
    }
  } else {
    state.bookmarks.unshift({
      id: generateId('bm'),
      space,
      group,
      url,
      title,
      desc,
      pinned,
      updatedAt: nowTs,
      ...(customIcon ? { customIcon } : {})
    });
    showToast('🎉 新书签已添加并自动保存');
  }

  saveCoreState();
  closeBookmarkModal();
  switchSpace(space, group);
}

export function deleteBookmark(id) {
  const idx = state.bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return;
  const target = state.bookmarks[idx];
  const removedVisit = state.recentVisits.find(r => r.id === id) || null;
  state.lastDeletedUndo = { bm: { ...target }, index: idx, visit: removedVisit };

  state.bookmarks.splice(idx, 1);
  if (!state.bookmarks.some(b => canonicalUrlKey(b.url) === canonicalUrlKey(target.url))) {
    recordTombstones([target.url]);
  }
  state.recentVisits = state.recentVisits.filter(r => r.id !== id);
  writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
  saveCoreState();
  renderWorkspaceViews({ preserveScroll: true });

  showToast(`🗑️ 已删除「${target.title}」`, { label: '↩️ 撤销', duration: 5500 });
}

export function undoLastDelete() {
  if (!state.lastDeletedUndo) return;
  const { bm, index, visit } = state.lastDeletedUndo;
  state.lastDeletedUndo = null;
  clearTombstones([bm.url]);
  if (!state.bookmarks.some(b => b.id === bm.id)) {
    const safeIdx = Math.min(Math.max(0, index), state.bookmarks.length);
    state.bookmarks.splice(safeIdx, 0, { ...bm, updatedAt: Date.now() });
    if (!state.spaceGroups[bm.space]) state.spaceGroups[bm.space] = [];
    if (!state.spaceGroups[bm.space].includes(bm.group)) state.spaceGroups[bm.space].push(bm.group);
  }
  if (visit && !state.recentVisits.some(r => r.id === visit.id)) {
    state.recentVisits.unshift(visit);
    writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
  }
  saveCoreState();
  renderWorkspaceViews({ preserveScroll: true });
  showToast(`↩️ 已恢复书签「${bm.title}」`);
}

export function togglePinBookmark(id) {
  const bm = state.bookmarks.find(b => b.id === id);
  if (!bm) return;
  bm.pinned = !bm.pinned;
  bm.updatedAt = Date.now();
  saveCoreState();
  renderWorkspaceViews({ preserveScroll: true });
  showToast(bm.pinned ? `⭐ 已将「${bm.title}」置顶到首页` : `☆ 已取消「${bm.title}」的首页置顶`);
}

export function dismissQuickSave(bmId) {
  const bm = state.bookmarks.find(b => b.id === bmId);
  if (!bm || !bm.quickSavedAt) return;
  delete bm.quickSavedAt;
  bm.updatedAt = Date.now();
  saveCoreState();
  renderWorkspaceViews({ dock: false, sidebar: true, main: true, preserveScroll: true });
  showToast(`📤 已将「${bm.title}」移出快捷收藏（书签仍保留在「${bm.group}」）`);
}

export function clearAllQuickSaves() {
  const nowTs = Date.now();
  let count = 0;
  state.bookmarks.forEach(b => {
    if (b.quickSavedAt) {
      delete b.quickSavedAt;
      b.updatedAt = nowTs;
      count++;
    }
  });
  if (count === 0) return;
  saveCoreState();
  renderWorkspaceViews({ dock: false, sidebar: true, main: true, preserveScroll: true });
  showToast(`🧹 已清空 ${count} 条快捷收藏收件箱（所有书签均完好保留在原分组）`);
}

export function openMoveGroupModal(bmId) {
  const bm = state.bookmarks.find(b => b.id === bmId);
  if (!bm) return;
  document.getElementById('moveBmId').value = bm.id;
  document.getElementById('moveTargetTitle').textContent = `当前书签：${bm.title}`;
  const spSel = document.getElementById('moveSpaceSelect');
  spSel.value = bm.space || 'media';
  document.getElementById('moveNewGroupInput').value = '';
  populateSelectGroups(document.getElementById('moveGroupSelect'), bm.space || 'media', bm.group);
  document.getElementById('moveGroupModal').classList.remove('hidden');
}

export function closeMoveGroupModal() {
  document.getElementById('moveGroupModal')?.classList.add('hidden');
}

export function confirmMoveBookmarkGroup() {
  const bmId = document.getElementById('moveBmId').value;
  const targetSpace = document.getElementById('moveSpaceSelect').value;
  const newG = document.getElementById('moveNewGroupInput').value.trim();
  const targetGroup = newG ? (newG.match(/^\S+\s+/) ? newG : `📁 ${newG}`) : document.getElementById('moveGroupSelect').value;
  const bm = state.bookmarks.find(b => b.id === bmId);
  if (bm && (bm.space !== targetSpace || bm.group !== targetGroup)) {
    bm.space = targetSpace;
    bm.group = targetGroup;
    bm.updatedAt = Date.now();
    if (!state.spaceGroups[targetSpace]) state.spaceGroups[targetSpace] = [];
    if (!state.spaceGroups[targetSpace].includes(targetGroup)) state.spaceGroups[targetSpace].push(targetGroup);
    finishDragUpdate(`📂 已将「${bm.title}」移至「${targetGroup}」`);
  }
  closeMoveGroupModal();
}

export async function refreshMaintenanceUI() {
  document.getElementById('dcDangerBox')?.classList.add('hidden');
  const arrow = document.getElementById('dcDangerArrow');
  if (arrow) arrow.textContent = '▾';

  const resetBtn = document.getElementById('dcResetBtn');
  if (resetBtn) {
    resetBtn.textContent = INITIAL_BOOKMARKS.length > 0
      ? `🔄 恢复默认 (${INITIAL_BOOKMARKS.length}条)`
      : '🔄 恢复出厂默认';
  }

  const snapBtn = document.getElementById('dcRestoreSnapshotBtn');
  const snapText = document.getElementById('dcRestoreSnapshotText');
  if (!snapBtn) return;
  const saved = await storeGetAll([PRE_RESET_SNAPSHOT_KEY]);
  const snap = saved[PRE_RESET_SNAPSHOT_KEY];
  if (snap && Array.isArray(snap.bookmarks) && snap.bookmarks.length > 0) {
    const tStr = snap.savedAt
      ? new Date(snap.savedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '';
    if (snapText) snapText.textContent = `恢复重置前快照 (${snap.bookmarks.length} 条${tStr ? ' · ' + tStr : ''})`;
    snapBtn.classList.remove('hidden');
  } else {
    snapBtn.classList.add('hidden');
  }
}

export function openDataCenterModal() {
  const el = document.getElementById('dcTotalCount');
  if (el) el.textContent = `${state.bookmarks.length} 个书签`;
  const report = document.getElementById('duplicateReportBox');
  if (report) { report.innerHTML = ''; report.classList.add('hidden'); }
  populateSyncModalFields();
  refreshMaintenanceUI();
  document.getElementById('dataCenterModal')?.classList.remove('hidden');
}

export function abortRunningLinkCheck() {
  if (state.activeLinkCheckPort) {
    try { state.activeLinkCheckPort.postMessage({ type: 'ABORT' }); } catch {}
    try { state.activeLinkCheckPort.disconnect(); } catch {}
    state.activeLinkCheckPort = null;
  }
  if (state.linkCheckAbortController) {
    state.linkCheckAbortController.abort();
    state.linkCheckAbortController = null;
  }
}

export function closeDataCenterModal() {
  abortRunningLinkCheck();
  document.getElementById('dataCenterModal')?.classList.add('hidden');
}

export function scanDuplicateBookmarks() {
  abortRunningLinkCheck();
  const box = document.getElementById('duplicateReportBox');
  if (!box) return;
  const map = new Map();
  state.bookmarks.forEach(bm => {
    const key = canonicalUrlKey(bm.url);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(bm);
  });

  const dupGroups = Array.from(map.values()).filter(arr => arr.length > 1);
  box.classList.remove('hidden');

  if (dupGroups.length === 0) {
    box.innerHTML = `<div class="text-center py-2 text-emerald-500 font-semibold">✅ 体检通过！当前 ${state.bookmarks.length} 个书签中没有任何重复网址</div>`;
    return;
  }

  const dupTotal = dupGroups.reduce((acc, g) => acc + (g.length - 1), 0);
  box.innerHTML = `
    <div class="flex items-center justify-between pb-1.5 border-b border-slate-200/70 dark:border-slate-700/70">
      <span class="font-bold text-amber-500">发现 ${dupGroups.length} 组重复（共 ${dupTotal} 条冗余）</span>
      <button type="button" data-dup-clean-all="1" class="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-bold transition">🧹 一键去重</button>
    </div>
    ${dupGroups.map(g => `
      <div class="space-y-1 py-1 border-b border-slate-200/40 dark:border-slate-800 last:border-0">
        <div class="font-mono text-[10px] text-slate-400 truncate">${escapeHtml(g[0].url)}</div>
        ${g.map((item, idx) => `
          <div class="flex items-center justify-between gap-2 pl-2">
            <span class="truncate">${idx === 0 ? '✅ 保留：' : '⚠️ 重复：'}${escapeHtml(item.title)} <span class="text-slate-400">(${escapeHtml(item.group)})</span></span>
            ${idx > 0 ? `<button type="button" data-dup-del-id="${escapeHtml(item.id)}" class="text-rose-500 hover:underline shrink-0">删除</button>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

// 四级真实状态码死链体检（扩展模式通过后台 Service Worker + optional_host_permissions 实现）
export async function checkDeadLinks() {
  const box = document.getElementById('duplicateReportBox');
  if (!box) return;

  if (state.activeLinkCheckPort || state.linkCheckAbortController) {
    abortRunningLinkCheck();
    showToast('⏹️ 已停止书签连通性体检');
    return;
  }

  let hasFullOriginPerm = false;
  if (IS_EXTENSION && chrome.permissions?.request) {
    try {
      hasFullOriginPerm = await chrome.permissions.request({ origins: ['https://*/*', 'http://*/*'] });
    } catch {
      hasFullOriginPerm = false;
    }
    if (!hasFullOriginPerm) {
      showToast('⚠️ 未授予全网 HTTP 状态探测权限，请在弹窗中允许后重试');
      return;
    }
  }

  const total = state.bookmarks.length;
  const deadList = [];
  const verifyList = [];
  const slowList = [];
  let skippedCount = 0;
  let checked = 0;

  box.classList.remove('hidden');

  const renderItemRow = (item, level) => {
    let badge = '';
    if (level === 'dead') {
      badge = `<span class="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-mono shrink-0">${escapeHtml(item.reason || '失效')}</span>`;
    } else if (level === 'verify') {
      badge = `<span class="px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-500 dark:text-violet-300 border border-violet-500/20 text-[9px] font-mono shrink-0">${escapeHtml(item.reason || '需复核')}</span>`;
    } else {
      badge = `<span class="px-1.5 py-0.2 rounded bg-amber-500/12 text-amber-500 border border-amber-500/25 text-[9px] font-mono shrink-0">${(item.ms / 1000).toFixed(1)}s 较慢</span>`;
    }
    return `
      <div data-dead-row="1" data-dead-level="${level}" class="flex items-center justify-between gap-2 py-1 border-b border-slate-200/40 dark:border-slate-800 last:border-0">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            ${badge}
            <span class="font-semibold truncate text-slate-700 dark:text-slate-200">${escapeHtml(item.bm.title)}</span>
          </div>
          <div class="font-mono text-[10px] text-slate-400 truncate">${escapeHtml(item.bm.url)}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" data-dead-open-url="${escapeHtml(sanitizeUrl(item.bm.url) || '#')}" class="theme-text hover:underline">验证</button>
          <button type="button" data-dead-del-id="${escapeHtml(item.bm.id)}" class="text-rose-500 hover:underline">删除</button>
        </div>
      </div>
    `;
  };

  const renderProgress = (done = false, modeLabel = '真实 HTTP 状态码探测') => {
    const pct = total ? Math.round((checked / total) * 100) : 100;
    const rows = [
      ...deadList.map(item => renderItemRow(item, 'dead')),
      ...verifyList.map(item => renderItemRow(item, 'verify')),
      ...slowList.map(item => renderItemRow(item, 'slow'))
    ].join('');

    const summaryHtml = `
      <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
        <span class="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">失效/异常 <span id="deadCountBadge">${deadList.length}</span></span>
        <span class="px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-300 border border-violet-500/20">拦截需复核 <span id="verifyCountBadge">${verifyList.length}</span></span>
        <span class="px-2 py-0.5 rounded-lg bg-amber-500/12 text-amber-500 border border-amber-500/25">响应较慢 <span id="slowCountBadge">${slowList.length}</span></span>
        <span class="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">内网跳过 ${skippedCount}</span>
      </div>
    `;

    box.innerHTML = `
      <div class="space-y-1.5 pb-1.5 border-b border-slate-200/70 dark:border-slate-700/70">
        <div class="flex items-center justify-between">
          <span class="font-bold ${done ? 'text-emerald-500' : 'theme-text'}">
            ${done ? '🩺 四级精确体检完成' : `🩺 正在并发探测 (${checked}/${total} · ${pct}%)...`}
          </span>
          ${!done ? `<button type="button" data-dead-stop="1" class="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">停止</button>` : ''}
        </div>
        <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full theme-solid-bg rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        ${summaryHtml}
        <div class="text-[10px] text-slate-400">模式：${escapeHtml(modeLabel)}（401/403/429 多为防爬或登录墙，删前请点「验证」复核）</div>
      </div>
      ${rows || (done ? `<div class="text-center py-2 text-emerald-500 font-semibold">✅ 所有可检测书签均正常返回 2xx/3xx 且响应迅速！</div>` : '')}
    `;
  };

  if (IS_EXTENSION && chrome.runtime?.connect && hasFullOriginPerm) {
    renderProgress(false, '后台 Service Worker HEAD/GET 真实状态码');
    const port = chrome.runtime.connect({ name: 'ws-link-check' });
    state.activeLinkCheckPort = port;

    port.onMessage.addListener(msg => {
      if (state.activeLinkCheckPort !== port) return;
      if (msg?.type === 'ITEM') {
        checked = msg.checked;
        const lv = msg.result?.level;
        if (lv === 'skipped') skippedCount++;
        else if (lv === 'dead') deadList.push({ bm: msg.bm, ms: msg.result.ms, reason: msg.result.reason });
        else if (lv === 'verify') verifyList.push({ bm: msg.bm, ms: msg.result.ms, reason: msg.result.reason });
        else if (lv === 'slow') slowList.push({ bm: msg.bm, ms: msg.result.ms, reason: msg.result.reason });
        if (checked % 3 === 0 || checked === total) renderProgress(false, '后台 Service Worker HEAD/GET 真实状态码');
      } else if (msg?.type === 'DONE') {
        state.activeLinkCheckPort = null;
        try { port.disconnect(); } catch {}
        renderProgress(true, '后台 Service Worker HEAD/GET 真实状态码');
      }
    });

    port.onDisconnect.addListener(() => {
      if (state.activeLinkCheckPort === port) {
        state.activeLinkCheckPort = null;
      }
    });

    port.postMessage({
      type: 'START',
      bookmarks: state.bookmarks.map(b => ({ id: b.id, title: b.title, url: b.url }))
    });
    return;
  }

  // 非扩展页面降级兜底
  const controller = new AbortController();
  state.linkCheckAbortController = controller;
  renderProgress(false, '浏览器受限模式（仅连通性与超时检测）');
  const queue = [...state.bookmarks];
  const probeOne = async bm => {
    if (controller.signal.aborted) return;
    if (isPrivateHostOrUrl(bm.url)) {
      skippedCount++;
    } else {
      const tCtrl = new AbortController();
      const timer = setTimeout(() => tCtrl.abort(), 5500);
      const onParentAbort = () => tCtrl.abort();
      controller.signal.addEventListener('abort', onParentAbort, { once: true });
      const startMs = Date.now();
      try {
        await fetch(bm.url, { mode: 'no-cors', cache: 'no-store', signal: tCtrl.signal });
        const elapsed = Date.now() - startMs;
        if (!controller.signal.aborted && elapsed >= 2800) slowList.push({ bm, ms: elapsed, reason: '较慢' });
      } catch {
        if (!controller.signal.aborted) deadList.push({ bm, ms: Date.now() - startMs, reason: '超时/失败' });
      } finally {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onParentAbort);
      }
    }
    checked++;
    if (!controller.signal.aborted && (checked % 4 === 0 || checked === total)) {
      renderProgress(false, '浏览器受限模式（仅连通性与超时检测）');
    }
  };
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length > 0 && !controller.signal.aborted) await probeOne(queue.shift());
  }));
  if (state.linkCheckAbortController === controller) {
    state.linkCheckAbortController = null;
    renderProgress(true, '浏览器受限模式（仅连通性与超时检测）');
  }
}

export async function exportData() {
  const memo = document.getElementById('quickMemoArea')?.value || '';
  const settings = await collectCurrentSettings();
  const cleanBookmarks = state.bookmarks.map(b => {
    const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
    if (b.pinned) item.pinned = true;
    if (b.quickSavedAt) item.quickSavedAt = b.quickSavedAt;
    if (b.updatedAt) item.updatedAt = b.updatedAt;
    if (b.customIcon) item.customIcon = b.customIcon;
    if (b.icon && b.icon !== findOfflineBase64(b.url)) item.icon = b.icon;
    return item;
  });
  const payload = { version: 11.2, spaceGroups: state.spaceGroups, bookmarks: cleanBookmarks, todos: state.todos, memo, tombstones: state.tombstones, settings };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('📤 已导出完整 JSON 备份（含界面偏好，不含私密 Token）');
}

export function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && Array.isArray(parsed.bookmarks)) {
        state.bookmarks = sanitizeBookmarksList(parsed.bookmarks);
        if (parsed.spaceGroups) state.spaceGroups = parsed.spaceGroups;
        if (parsed.tombstones && typeof parsed.tombstones === 'object') state.tombstones = parsed.tombstones;
        if (Array.isArray(parsed.todos)) { state.todos = parsed.todos; saveTodos(true); renderTodoList(); }
        if (typeof parsed.memo === 'string') {
          const area = document.getElementById('quickMemoArea');
          if (area) { area.value = parsed.memo; handleMemoInput(parsed.memo, true); }
        }
        if (parsed.settings) applySettingsPayload(parsed.settings);
      } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].space) {
        state.bookmarks = sanitizeBookmarksList(parsed);
      } else {
        showToast('❌ JSON 格式不兼容当前架构');
        return;
      }
      clearTombstones(state.bookmarks.map(b => b.url));
      stripRedundantDictionaryIcons(false);
      saveCoreState();
      closeDataCenterModal();
      switchSpace('home', 'all');
      showToast(`📥 成功恢复 ${state.bookmarks.length} 个书签与偏好设置`);
    } catch { showToast('❌ 解析 JSON 备份文件失败'); }
  };
  reader.readAsText(file);
}

export function mergeMissingDefaultBookmarks() {
  if (INITIAL_BOOKMARKS.length === 0) {
    showToast('⚠️ 未检测到 js/default-bookmarks.js，无法补全');
    return;
  }
  const existingKeys = new Set(state.bookmarks.map(b => canonicalUrlKey(b.url)));
  let added = 0;
  const addedUrls = [];

  INITIAL_BOOKMARKS.forEach(seed => {
    const key = canonicalUrlKey(seed.url);
    if (!existingKeys.has(key)) {
      const cloned = JSON.parse(JSON.stringify(seed));
      cloned.updatedAt = Date.now();
      state.bookmarks.push(cloned);
      existingKeys.add(key);
      addedUrls.push(cloned.url);
      if (!state.spaceGroups[cloned.space]) state.spaceGroups[cloned.space] = [];
      if (!state.spaceGroups[cloned.space].includes(cloned.group)) {
        state.spaceGroups[cloned.space].push(cloned.group);
      }
      added++;
    }
  });

  if (added === 0) {
    showToast(`✅ 当前书签库已包含全部 ${INITIAL_BOOKMARKS.length} 条默认站点，无需补全`);
    return;
  }

  clearTombstones(addedUrls);
  stripRedundantDictionaryIcons(false);
  saveCoreState(false);
  const el = document.getElementById('dcTotalCount');
  if (el) el.textContent = `${state.bookmarks.length} 个书签`;
  renderWorkspaceViews({ preserveScroll: true });
  showToast(`✨ 已安全补全 ${added} 条缺失的默认书签（自建内容不受影响）`);
}

export async function resetUiAndCaches() {
  const confirmed = await openConfirmDialog({
    title: '重置界面与缓存',
    message: '将恢复默认深色主题、极光靛蓝强调色、展开全部折叠分组，并清理天气与图标缓存。\n\n你的书签、便签和待办完全不会受影响，是否继续？',
    confirmText: '确认重置'
  });
  if (!confirmed) return;
  applyThemeUI('dark');
  setAccentColor('indigo', false, true);
  state.isRightPanelCollapsed = false;
  applyRightPanelUI();
  state.collapsedGroups = {};
  state.weatherCacheMap = {};
  hdUpgradedCache.clear();
  iconBustMap.clear();

  writeStoreInternal({
    [KEYS.theme]: 'dark',
    [KEYS.accent]: 'indigo',
    [KEYS.rightPanel]: 'expanded',
    [KEYS.collapsed]: {},
    [KEYS.weatherCache]: {},
    [KEYS.city]: DEFAULT_WEATHER_CITY
  });

  const citySel = document.getElementById('citySelector');
  if (citySel) citySel.value = DEFAULT_WEATHER_CITY;
  changeWeatherCity(DEFAULT_WEATHER_CITY, false, true);
  renderWorkspaceViews({ dock: false, sidebar: false, main: true, preserveScroll: true });
  showToast('🎨 已重置界面外观与本地缓存（书签与便签完好保留）');
}

export function savePreResetSnapshot() {
  if (state.bookmarks.length === 0) return;
  const cleanBms = state.bookmarks.map(b => {
    const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
    if (b.pinned) item.pinned = true;
    if (b.quickSavedAt) item.quickSavedAt = b.quickSavedAt;
    if (b.updatedAt) item.updatedAt = b.updatedAt;
    if (b.customIcon) item.customIcon = b.customIcon;
    return item;
  });
  const memo = document.getElementById('quickMemoArea')?.value || '';
  const snapshot = {
    savedAt: Date.now(),
    bookmarks: cleanBms,
    spaceGroups: JSON.parse(JSON.stringify(state.spaceGroups)),
    todos: JSON.parse(JSON.stringify(state.todos)),
    memo
  };
  writeStoreInternal({ [PRE_RESET_SNAPSHOT_KEY]: snapshot });

  try {
    const blob = new Blob([JSON.stringify({ version: 11.2, ...snapshot }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre_reset_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {}
}

export async function restorePreResetSnapshot() {
  const saved = await storeGetAll([PRE_RESET_SNAPSHOT_KEY]);
  const snap = saved[PRE_RESET_SNAPSHOT_KEY];
  if (!snap || !Array.isArray(snap.bookmarks)) {
    showToast('💡 暂无可恢复的重置前快照');
    return;
  }
  state.bookmarks = sanitizeBookmarksList(snap.bookmarks);
  if (snap.spaceGroups) state.spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...snap.spaceGroups };
  if (Array.isArray(snap.todos)) { state.todos = snap.todos; saveTodos(true); renderTodoList(); }
  if (typeof snap.memo === 'string') {
    const area = document.getElementById('quickMemoArea');
    if (area) area.value = snap.memo;
    handleMemoInput(snap.memo, true);
  }
  stripRedundantDictionaryIcons(false);
  saveCoreState(true);
  closeDataCenterModal();
  switchSpace('home', 'all');
  showToast(`↩️ 已成功恢复重置前的 ${state.bookmarks.length} 条书签与便签数据`);
}

export async function resetDefaultData() {
  if (INITIAL_BOOKMARKS.length === 0) {
    showToast('⚠️ 未检测到 js/default-bookmarks.js，无法恢复默认');
    return;
  }
  const msg = `当前本机共有 ${state.bookmarks.length} 条书签，确定要替换为出厂默认的 ${INITIAL_BOOKMARKS.length} 条吗？\n\n🛡️ 安全保障：\n1. 重置前会自动保存本机快照并下载 JSON 备份（随时可还原）\n2. 仅重置本机，不会自动覆盖 GitHub 云端 Gist`;
  const confirmed = await openConfirmDialog({
    title: '恢复出厂默认数据',
    message: msg,
    confirmText: '确认恢复默认',
    danger: true
  });
  if (!confirmed) return;

  savePreResetSnapshot();
  clearTimeout(state.autoSyncTimer);

  state.bookmarks = JSON.parse(JSON.stringify(INITIAL_BOOKMARKS));
  state.spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
  state.collapsedGroups = {};
  hdUpgradedCache.clear();
  iconBustMap.clear();
  state.localUpdatedAt = Date.now();
  writeStoreInternal({ [KEYS.collapsed]: state.collapsedGroups });
  stripRedundantDictionaryIcons(false);
  saveCoreState(true);

  closeDataCenterModal();
  switchSpace('home', 'all');
  showToast(`🔄 本机已恢复默认 ${state.bookmarks.length} 条（已自动留底快照，云端数据未受影响）`, { duration: 4500 });
}

export async function clearAllLocalBookmarks() {
  if (state.bookmarks.length === 0) {
    showToast('💡 本机书签列表已经是空的');
    return;
  }
  const msg = `⚠️ 高危操作：确定要清空本机全部 ${state.bookmarks.length} 条书签吗？\n\n🛡️ 执行前会自动保存快照并下载 JSON 备份，且不会覆盖 GitHub 云端数据。`;
  const confirmed = await openConfirmDialog({
    title: '清空全部本机书签',
    message: msg,
    confirmText: '确认全部清空',
    danger: true
  });
  if (!confirmed) return;

  savePreResetSnapshot();
  clearTimeout(state.autoSyncTimer);

  state.bookmarks = [];
  state.spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
  state.collapsedGroups = {};
  state.recentVisits = [];
  state.localUpdatedAt = Date.now();
  writeStoreInternal({ [KEYS.collapsed]: state.collapsedGroups, [KEYS.recentVisits]: state.recentVisits, [KEYS.initialized]: true });
  saveCoreState(true);

  closeDataCenterModal();
  switchSpace('home', 'all');
  showToast('🧹 已清空本机书签（随时可在数据中心一键恢复快照或拉取云端）', { duration: 4500 });
}

export async function autoDetectSiteMetadata(forceOverwrite = false) {
  const urlInput = document.getElementById('bmUrl');
  const titleInput = document.getElementById('bmTitle');
  const descInput = document.getElementById('bmDesc');
  const btnText = document.getElementById('autoDetectBtnText');
  if (!urlInput) return;

  let rawUrl = urlInput.value.trim();
  if (!rawUrl) { if (forceOverwrite) showToast('💡 请先粘贴网址链接'); return; }
  if (!/^https?:\/\//i.test(rawUrl)) { rawUrl = 'https://' + rawUrl; urlInput.value = rawUrl; }

  const currentHost = extractDomain(rawUrl).toLowerCase();
  const hasTitle = titleInput.value.trim() && titleInput.value.trim().toLowerCase() !== currentHost;
  const hasDesc = descInput.value.trim() && descInput.value.trim().toLowerCase() !== currentHost;
  if (!forceOverwrite && hasTitle && hasDesc) return;

  const cleanHost = currentHost.replace(/^www\./, '');
  for (const [domainKey, meta] of Object.entries(SITE_METADATA_DICT)) {
    if (cleanHost === domainKey || cleanHost.endsWith('.' + domainKey)) {
      if (forceOverwrite || !hasTitle) titleInput.value = meta.title;
      if (forceOverwrite || !hasDesc) descInput.value = meta.desc;
      if (forceOverwrite) showToast('⚡ 已自动识别网站名称与描述');
      return;
    }
  }

  if (btnText) btnText.textContent = '抓取中...';
  try {
    const res = await fetchWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(rawUrl)}`, {}, 5000);
    const json = await res.json();
    if (json && json.status === 'success' && json.data) {
      const ft = (json.data.title || '').trim();
      const fd = (json.data.description || '').trim();
      if (ft && (forceOverwrite || !hasTitle)) titleInput.value = ft.length > 42 ? ft.slice(0, 42) : ft;
      if (fd && (forceOverwrite || !hasDesc)) descInput.value = fd.length > 90 ? fd.slice(0, 90) + '...' : fd;
      if (btnText) btnText.textContent = '自动识别名称与描述';
      showToast('🎉 已成功抓取网站名称与功能说明');
      return;
    }
  } catch {}

  if (btnText) btnText.textContent = '自动识别名称与描述';
  const brand = cleanHost.split('.')[0];
  const fmtBrand = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : '站点';
  if (forceOverwrite || !hasTitle) titleInput.value = `${fmtBrand} 官方平台`;
  if (forceOverwrite || !hasDesc) descInput.value = `${fmtBrand} (${cleanHost}) 在线创作工具与数字资源平台`;
}
