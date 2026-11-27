/* ==========================================================================
   前端主应用入口（ES Module 编排：初始化、全局事件委托与扩展存储同步监听器）
   ========================================================================== */

import { DEFAULT_WEATHER_CITY, KEYS } from '../shared/constants.js';
import { canonicalUrlKey, sanitizeBookmarksList } from '../shared/url-utils.js';
import { INITIAL_BOOKMARKS, INITIAL_SPACE_GROUPS, IS_EXTENSION, SPACES_CONFIG, state } from './state.js';
import {
  absorbPendingSaves,
  flushStorageWrites,
  recordTombstones,
  saveCoreState,
  setStorageErrorHandler,
  setSyncScheduler,
  storeGetAll,
  writeStoreInternal
} from './storage.js';
import {
  applyRightPanelUI,
  applyThemeUI,
  closeAccentPopover,
  closeActiveDialogModal,
  closeCardContextMenu,
  closeRecentPopover,
  handleBrandLogoUpload,
  initBrandLogo,
  openConfirmDialog,
  setAccentColor,
  showToast,
  toggleAccentPopover,
  toggleTheme
} from './ui-utils.js';
import {
  buildOfflineIconMaps,
  handleIconError,
  handleIconLoad,
  localizeRemoteCustomIcons,
  refreshBookmarkIcon,
  stripRedundantDictionaryIcons
} from './icons.js';
import { clearSearchQuiet, createSearchHandlers, syncKeyboardHighlight } from './search.js';
import {
  bindSpotlightContainer,
  deleteGroup,
  openCardContextMenu,
  promptAddGroup,
  renameGroup,
  renderMainContent,
  renderSingleGroupSectionHtml,
  renderSpaceDock,
  renderWorkspaceViews,
  scheduleWorkspaceRefresh,
  switchSpace,
  toggleRightPanel
} from './render.js';
import { bindNavDropDelegation, clearAllDragClasses, finishDragUpdate, moveBookmarkTo, toggleEditMode } from './dnd.js';
import {
  addTodoItem,
  changeWeatherCity,
  fetchWeatherData,
  flushMemoWriteNow,
  handleMemoInput,
  initClockAndCNY,
  initWeather,
  openBookmarkUrl,
  renderRecentVisitsList,
  renderTodoList,
  saveTodos,
  stopClockAndCNY,
  switchNoteTab,
  toggleRecentPopover,
  updateMemoCount
} from './telemetry.js';
import {
  autoSyncOnStartup,
  hideSyncConflictBanner,
  mergeConflictWithRemote,
  pullFromGist,
  pushToGist,
  saveGhSyncConfigFromModal,
  scheduleAutoSync,
  showSyncConflictBanner,
  updateSyncBadgeUI
} from './sync.js';
import {
  abortRunningLinkCheck,
  autoDetectSiteMetadata,
  checkDeadLinks,
  clearAllLocalBookmarks,
  clearAllQuickSaves,
  closeBookmarkModal,
  closeDataCenterModal,
  closeMoveGroupModal,
  confirmMoveBookmarkGroup,
  deleteBookmark,
  dismissQuickSave,
  exportData,
  importData,
  mergeMissingDefaultBookmarks,
  openBookmarkModal,
  openDataCenterModal,
  openMoveGroupModal,
  populateSelectGroups,
  resetDefaultData,
  resetUiAndCaches,
  restorePreResetSnapshot,
  saveBookmark,
  scanDuplicateBookmarks,
  togglePinBookmark,
  undoLastDelete
} from './data-center.js';
import { bindToolsEvents, closeToolModal, openToolModal } from './tools.js';

setSyncScheduler(scheduleAutoSync);
setStorageErrorHandler(msg => showToast(msg, { duration: 4800 }));

let lastFlushSyncTs = 0;

function flushPendingChangesAndSync(fromUnload = false) {
  let hasUnsyncedChange = false;
  if (state.memoWriteTimer) {
    const area = document.getElementById('quickMemoArea');
    flushMemoWriteNow(area ? area.value : '', true);
    state.localUpdatedAt = Date.now();
    writeStoreInternal({ [KEYS.updatedAt]: state.localUpdatedAt });
    hasUnsyncedChange = true;
  }
  if (state.autoSyncTimer) {
    clearTimeout(state.autoSyncTimer);
    state.autoSyncTimer = null;
    hasUnsyncedChange = true;
  }
  flushStorageWrites();

  if (hasUnsyncedChange && state.ghSyncConfig.token && state.ghSyncConfig.autoSync !== false) {
    const now = Date.now();
    if (now - lastFlushSyncTs < 500) return;
    lastFlushSyncTs = now;
    pushToGist(true, false, { keepalive: fromUnload });
  }
}

const searchHandlers = createSearchHandlers({
  renderSpaceDock,
  renderMainContent,
  openToolModal,
  openBookmarkUrl
});

function bindExtensionStorageWatcher() {
  if (!IS_EXTENSION) return;

  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'APPLY_SEARCH_QUERY') {
        const q = (msg.query || '').trim();
        const sInput = document.getElementById('searchInput');
        searchHandlers.setSearchEngine('local');
        if (sInput) sInput.value = q;
        searchHandlers.applySearchQueryNow(q);
        sendResponse?.({ ok: true });
      }
    });
  }

  if (!chrome.storage?.onChanged) return;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes[KEYS.syncConflict]) {
      const cf = changes[KEYS.syncConflict].newValue;
      if (cf) showSyncConflictBanner(cf);
      else hideSyncConflictBanner();
    }
    if (changes[KEYS.lastQuickSave]?.newValue) {
      const qs = changes[KEYS.lastQuickSave].newValue;
      const spName = SPACES_CONFIG.find(s => s.id === qs.space)?.name || qs.space;
      showToast(qs.existed ? `💡 「${qs.title}」已在「${spName} · ${qs.group}」` : `⚡ 已收藏「${qs.title}」至「${spName} · ${qs.group}」`, { duration: 4000 });
    }
    if (Array.isArray(changes[KEYS.pendingSaves]?.newValue) && changes[KEYS.pendingSaves].newValue.length > 0) {
      const merged = absorbPendingSaves(changes[KEYS.pendingSaves].newValue);
      writeStoreInternal({ [KEYS.pendingSaves]: [] });
      if (merged > 0) {
        saveCoreState(false);
        scheduleWorkspaceRefresh({ preserveScroll: true });
      }
    }

    if (state.internalWritePendingCount > 0) return;
    let needRender = false;
    if (Array.isArray(changes[KEYS.bookmarks]?.newValue)) {
      state.bookmarks = sanitizeBookmarksList(changes[KEYS.bookmarks].newValue);
      stripRedundantDictionaryIcons(false);
      needRender = true;
    }
    if (changes[KEYS.spaceGroups]?.newValue) {
      state.spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...changes[KEYS.spaceGroups].newValue };
      needRender = true;
    }
    if (changes[KEYS.tombstones]?.newValue && typeof changes[KEYS.tombstones].newValue === 'object') {
      state.tombstones = changes[KEYS.tombstones].newValue;
    }
    if (changes[KEYS.ghSync]?.newValue) {
      state.ghSyncConfig = { token: '', gistId: '', autoSync: true, lastSyncAt: 0, lastRemoteUpdatedAt: 0, ...changes[KEYS.ghSync].newValue };
      updateSyncBadgeUI();
    }
    if (typeof changes[KEYS.updatedAt]?.newValue === 'number') {
      state.localUpdatedAt = changes[KEYS.updatedAt].newValue;
    }
    if (needRender) {
      scheduleWorkspaceRefresh({ preserveScroll: true });
    }
  });
}

function bindAllEvents() {
  // 1) 左栏控件 & 云同步配置
  document.getElementById('brandLogoBtn')?.addEventListener('click', e => {
    if (state.isEditMode) { e.stopPropagation(); document.getElementById('brandLogoInput')?.click(); }
    else { clearSearchQuiet(); switchSpace('home', 'all'); }
  });
  document.getElementById('brandLogoInput')?.addEventListener('change', e => {
    handleBrandLogoUpload(e.target.files?.[0]);
    e.target.value = '';
  });
  document.getElementById('addGroupBtn')?.addEventListener('click', promptAddGroup);
  document.getElementById('openAddBookmarkBtn')?.addEventListener('click', () => openBookmarkModal());
  document.getElementById('editModeBtn')?.addEventListener('click', toggleEditMode);
  document.getElementById('exitEditModeBtn')?.addEventListener('click', toggleEditMode);
  document.getElementById('openDataCenterBtn')?.addEventListener('click', openDataCenterModal);
  document.getElementById('storageBadgePill')?.addEventListener('click', openDataCenterModal);

  document.getElementById('conflictMergeBtn')?.addEventListener('click', mergeConflictWithRemote);
  document.getElementById('conflictPullBtn')?.addEventListener('click', () => pullFromGist(false));
  document.getElementById('conflictForcePushBtn')?.addEventListener('click', () => pushToGist(false, true));

  const autoSaveGhInputs = () => {
    clearTimeout(state.configSaveTimer);
    state.configSaveTimer = setTimeout(() => {
      saveGhSyncConfigFromModal(false);
      const st = document.getElementById('ghSyncStatusText');
      if (st && state.ghSyncConfig.token) st.textContent = '配置已自动保存';
    }, 350);
  };
  document.getElementById('ghTokenInput')?.addEventListener('input', autoSaveGhInputs);
  document.getElementById('ghGistIdInput')?.addEventListener('input', autoSaveGhInputs);
  document.getElementById('ghAutoSyncToggle')?.addEventListener('change', () => {
    saveGhSyncConfigFromModal(false);
    showToast(state.ghSyncConfig.autoSync ? '☁️ 已开启自动云同步' : '⏸️ 已暂停自动云同步（仍可手动推拉）');
  });

  document.getElementById('ghSaveConfigBtn')?.addEventListener('click', () => saveGhSyncConfigFromModal(true));
  document.getElementById('ghPushBtn')?.addEventListener('click', async () => { await saveGhSyncConfigFromModal(false); pushToGist(false, true); });
  document.getElementById('ghPullBtn')?.addEventListener('click', async () => { await saveGhSyncConfigFromModal(false); pullFromGist(false); });
  document.getElementById('ghCopyGistIdBtn')?.addEventListener('click', () => {
    const gid = (document.getElementById('ghGistIdInput')?.value || state.ghSyncConfig.gistId || '').trim();
    if (!gid) { showToast('💡 请先点击「立即上传」自动生成 Gist ID'); return; }
    navigator.clipboard.writeText(gid).then(() => showToast('📋 Gist ID 已复制，可粘贴到另一台电脑'));
  });

  // 2) 搜索舱右上角图标与弹窗
  document.getElementById('accentPopoverBtn')?.addEventListener('click', toggleAccentPopover);
  document.getElementById('accentColorPopover')?.addEventListener('click', e => {
    e.stopPropagation();
    const dot = e.target.closest('[data-color]');
    if (dot) setAccentColor(dot.getAttribute('data-color'));
  });
  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('recentPopoverBtn')?.addEventListener('click', toggleRecentPopover);
  document.getElementById('recentVisitsPopover')?.addEventListener('click', e => e.stopPropagation());
  document.getElementById('closeRecentPopoverBtn')?.addEventListener('click', closeRecentPopover);
  document.getElementById('clearAllHistoryBtn')?.addEventListener('click', () => {
    if (!state.recentVisits.length) return;
    state.recentVisits = [];
    writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
    renderRecentVisitsList();
    showToast('🧹 已清空访问足迹');
  });
  document.getElementById('recentVisitsList')?.addEventListener('click', e => {
    const delBtn = e.target.closest('[data-recent-del-id]');
    if (delBtn) {
      e.stopPropagation();
      const delId = delBtn.getAttribute('data-recent-del-id');
      state.recentVisits = state.recentVisits.filter(r => r.id !== delId);
      writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
      renderRecentVisitsList();
      return;
    }
    const openItem = e.target.closest('[data-recent-open-url]');
    if (openItem) {
      openBookmarkUrl(openItem.getAttribute('data-recent-open-id'), openItem.getAttribute('data-recent-open-url'), e.ctrlKey || e.metaKey);
    }
  });
  document.getElementById('toggleRightPanelBtn')?.addEventListener('click', toggleRightPanel);

  // 3) 搜索引擎、搜索框与热门快筛
  document.getElementById('searchEngineTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-engine]');
    if (tab) searchHandlers.setSearchEngine(tab.getAttribute('data-engine'));
  });
  document.getElementById('searchForm')?.addEventListener('submit', searchHandlers.handleSearchSubmit);
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('compositionstart', () => { state.isSearchComposing = true; });
  searchInput?.addEventListener('compositionend', e => {
    state.isSearchComposing = false;
    searchHandlers.handleSearchInput(e.target.value);
  });
  searchInput?.addEventListener('input', e => searchHandlers.handleSearchInput(e.target.value));
  searchInput?.addEventListener('keydown', searchHandlers.handleSearchKeydown);
  document.getElementById('clearSearchBtn')?.addEventListener('click', searchHandlers.clearSearch);
  document.getElementById('hotFilterBar')?.addEventListener('click', e => {
    const tagBtn = e.target.closest('[data-quick-tag]');
    if (tagBtn) {
      const tag = tagBtn.getAttribute('data-quick-tag');
      searchHandlers.setSearchEngine('local');
      if (searchInput) searchInput.value = tag;
      searchHandlers.applySearchQueryNow(tag);
      showToast(`🔥 已快速筛选「${tag}」相关站点`);
      return;
    }
    const spBtn = e.target.closest('[data-quick-space]');
    if (spBtn) {
      clearSearchQuiet();
      switchSpace(spBtn.getAttribute('data-quick-space'), spBtn.getAttribute('data-quick-group') || 'all');
    }
  });

  // 4) 底部居中玻璃空间 Dock
  const dock = document.getElementById('spaceDockBar');
  dock?.addEventListener('click', e => {
    const btn = e.target.closest('[data-dock-space]');
    if (btn) { clearSearchQuiet(); switchSpace(btn.getAttribute('data-dock-space'), 'all'); }
  });
  bindNavDropDelegation(dock);

  // 5) 左侧分组目录
  const catNav = document.getElementById('categoryNav');
  catNav?.addEventListener('click', e => {
    const opBtn = e.target.closest('[data-group-op]');
    if (opBtn) {
      e.stopPropagation();
      const op = opBtn.getAttribute('data-group-op');
      const sp = opBtn.getAttribute('data-op-space');
      const gr = opBtn.getAttribute('data-op-group');
      if (op === 'rename') renameGroup(sp, gr);
      else if (op === 'delete') deleteGroup(sp, gr);
      return;
    }
    const toolBtn = e.target.closest('[data-open-tool]');
    if (toolBtn) { openToolModal(toolBtn.getAttribute('data-open-tool')); return; }
    const navBtn = e.target.closest('[data-nav-space]');
    if (navBtn) switchSpace(navBtn.getAttribute('data-nav-space'), navBtn.getAttribute('data-nav-group') || 'all');
  });
  catNav?.addEventListener('dragstart', e => {
    if (!state.isEditMode) return;
    const btn = e.target.closest('[data-drag-group-name]');
    if (!btn) return;
    state.draggedBookmarkId = null;
    state.draggedGroupInfo = { spaceId: btn.getAttribute('data-drag-group-space'), groupName: btn.getAttribute('data-drag-group-name') };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'GROUP::' + state.draggedGroupInfo.groupName);
    setTimeout(() => btn.classList.add('group-dragging'), 0);
  });
  catNav?.addEventListener('dragend', () => {
    state.draggedBookmarkId = null;
    state.draggedGroupInfo = null;
    clearAllDragClasses();
  });
  bindNavDropDelegation(catNav);

  // 6) 中栏主内容区 & 右侧仪表盘事件委托
  bindSpotlightContainer(document.getElementById('rightTelemetryPanel'));
  const main = document.getElementById('mainContent');
  bindSpotlightContainer(main);
  if (main) {
    main.addEventListener('load', e => {
      if (e.target.tagName === 'IMG' && e.target.classList.contains('icon-img')) handleIconLoad(e.target);
    }, true);
    main.addEventListener('error', e => {
      if (e.target.tagName === 'IMG' && e.target.classList.contains('icon-img')) handleIconError(e.target);
    }, true);

    main.addEventListener('auxclick', e => {
      if (e.button !== 1) return;
      const bmCard = e.target.closest('.bookmark-card[data-bm-id]');
      if (!bmCard || e.target.closest('.card-action-bar')) return;
      e.preventDefault();
      const id = bmCard.getAttribute('data-bm-id');
      const bm = state.bookmarks.find(b => b.id === id);
      openBookmarkUrl(id, bm ? bm.url : bmCard.getAttribute('data-kbd-url'), true);
    });

    main.addEventListener('click', e => {
      const cardAct = e.target.closest('[data-card-action]');
      if (cardAct) {
        e.stopPropagation();
        const act = cardAct.getAttribute('data-card-action');
        const id = cardAct.getAttribute('data-bm-id');
        if (act === 'pin') togglePinBookmark(id);
        else if (act === 'move') openMoveGroupModal(id);
        else if (act === 'edit') openBookmarkModal(id);
        else if (act === 'delete') deleteBookmark(id);
        else if (act === 'dismiss-quick') dismissQuickSave(id);
        return;
      }
      if (e.target.closest('[data-clear-all-quick]')) { clearAllQuickSaves(); return; }
      const collapseBtn = e.target.closest('[data-collapse-key]');
      if (collapseBtn) {
        const key = collapseBtn.getAttribute('data-collapse-key');
        state.collapsedGroups[key] = !state.collapsedGroups[key];
        writeStoreInternal({ [KEYS.collapsed]: state.collapsedGroups });
        markLocalChangeAndSync();
        const secEl = collapseBtn.closest('section[data-section-collapse-key]');
        const singleHtml = secEl ? renderSingleGroupSectionHtml(key) : '';
        if (secEl && singleHtml) {
          secEl.outerHTML = singleHtml;
          syncKeyboardHighlight(false);
        } else {
          renderMainContent(false);
        }
        return;
      }
      if (e.target.closest('[data-goto-tools]')) { switchSpace('tools', 'all'); return; }
      if (e.target.closest('[data-empty-add-bm]')) { openBookmarkModal(); return; }
      if (e.target.closest('[data-reset-home]')) { searchHandlers.clearSearch(); switchSpace('home', 'all'); return; }

      const toolCard = e.target.closest('[data-open-tool]');
      if (toolCard) { openToolModal(toolCard.getAttribute('data-open-tool')); return; }

      const bmCard = e.target.closest('.bookmark-card[data-bm-id]');
      if (bmCard && !e.target.closest('.card-action-bar')) {
        const id = bmCard.getAttribute('data-bm-id');
        const bm = state.bookmarks.find(b => b.id === id);
        openBookmarkUrl(id, bm ? bm.url : bmCard.getAttribute('data-kbd-url'), e.ctrlKey || e.metaKey);
      }
    });

    main.addEventListener('contextmenu', e => {
      const bmCard = e.target.closest('.bookmark-card[data-bm-id]');
      if (bmCard) openCardContextMenu(e, bmCard.getAttribute('data-bm-id'));
    });

    main.addEventListener('dragstart', e => {
      if (!state.isEditMode) return;
      const card = e.target.closest('.bookmark-card[data-bm-id]');
      if (!card) return;
      state.draggedGroupInfo = null;
      state.draggedBookmarkId = card.getAttribute('data-bm-id');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', state.draggedBookmarkId);
      setTimeout(() => card.classList.add('dragging-card'), 0);
    });

    main.addEventListener('dragover', e => {
      if (!state.isEditMode || !state.draggedBookmarkId) return;
      if (e.target.closest('.bookmark-card[data-bm-id]') || e.target.closest('[data-drop-section-group]')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    main.addEventListener('dragenter', e => {
      if (!state.isEditMode || !state.draggedBookmarkId) return;
      const card = e.target.closest('.bookmark-card[data-bm-id]');
      if (card && card.getAttribute('data-bm-id') !== state.draggedBookmarkId) { card.classList.add('drag-over-card'); return; }
      const sec = e.target.closest('[data-drop-section-group]');
      if (sec) sec.classList.add('section-drop-target');
    });

    main.addEventListener('dragleave', e => {
      const card = e.target.closest('.bookmark-card[data-bm-id]');
      if (card && !card.contains(e.relatedTarget)) card.classList.remove('drag-over-card');
      const sec = e.target.closest('[data-drop-section-group]');
      if (sec && !sec.contains(e.relatedTarget)) sec.classList.remove('section-drop-target');
    });

    main.addEventListener('drop', e => {
      if (!state.isEditMode || !state.draggedBookmarkId) return;
      const card = e.target.closest('.bookmark-card[data-bm-id]');
      if (card) {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-over-card');
        const targetBmId = card.getAttribute('data-bm-id');
        if (!targetBmId || targetBmId === state.draggedBookmarkId) return;
        const srcCard = main.querySelector(`.bookmark-card[data-bm-id="${CSS.escape(state.draggedBookmarkId)}"]`);
        if (card.closest('[data-non-sortable="1"]') || srcCard?.closest('[data-non-sortable="1"]')) {
          state.draggedBookmarkId = null;
          clearAllDragClasses();
          showToast('💡 快捷收藏/高频访问/搜索结果按动态规则排序，可拖至左侧分组或顶部空间移动');
          return;
        }
        const fromIdx = state.bookmarks.findIndex(b => b.id === state.draggedBookmarkId);
        const toIdx = state.bookmarks.findIndex(b => b.id === targetBmId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [movedItem] = state.bookmarks.splice(fromIdx, 1);
        const targetItem = state.bookmarks.find(b => b.id === targetBmId);
        const isVirtualView = state.currentSpace === 'home' || !!state.searchQuery.trim();
        if (!isVirtualView && targetItem) {
          movedItem.space = targetItem.space;
          movedItem.group = targetItem.group;
        }
        movedItem.updatedAt = Date.now();
        const newToIdx = state.bookmarks.findIndex(b => b.id === targetBmId);
        state.bookmarks.splice(fromIdx < toIdx ? newToIdx + 1 : newToIdx, 0, movedItem);
        finishDragUpdate(`✨ 已调整「${movedItem.title}」的排列顺序`);
        return;
      }
      const sec = e.target.closest('[data-drop-section-group]');
      if (sec) {
        e.preventDefault();
        e.stopPropagation();
        sec.classList.remove('section-drop-target');
        moveBookmarkTo(state.draggedBookmarkId, sec.getAttribute('data-drop-section-space'), sec.getAttribute('data-drop-section-group'));
      }
    });

    main.addEventListener('dragend', () => {
      state.draggedBookmarkId = null;
      state.draggedGroupInfo = null;
      clearAllDragClasses();
    });
  }

  // 7) 右栏天气、便签与待办
  document.getElementById('citySelector')?.addEventListener('change', e => changeWeatherCity(e.target.value, true, false));
  const retryWeather = () => fetchWeatherData(state.lastWeatherArgs.lat, state.lastWeatherArgs.lon, state.lastWeatherArgs.cityName, true);
  document.getElementById('weatherIcon')?.addEventListener('click', retryWeather);
  document.getElementById('weatherCityBadge')?.addEventListener('click', retryWeather);

  document.getElementById('tabBtnMemo')?.addEventListener('click', () => switchNoteTab('memo'));
  document.getElementById('tabBtnTodo')?.addEventListener('click', () => switchNoteTab('todo'));
  document.getElementById('quickMemoArea')?.addEventListener('input', e => handleMemoInput(e.target.value));
  window.addEventListener('pagehide', () => {
    flushPendingChangesAndSync(true);
    stopClockAndCNY();
  });
  window.addEventListener('pageshow', e => {
    if (e.persisted) initClockAndCNY();
  });
  document.getElementById('insertMemoTimeBtn')?.addEventListener('click', () => {
    const area = document.getElementById('quickMemoArea');
    if (!area) return;
    const now = new Date();
    const stamp = `[${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}] `;
    area.value += (area.value && !area.value.endsWith('\n') ? '\n' : '') + stamp;
    area.focus();
    handleMemoInput(area.value);
  });
  document.getElementById('copyMemoBtn')?.addEventListener('click', () => {
    const area = document.getElementById('quickMemoArea');
    if (!area || !area.value.trim()) { showToast('💡 便签内容为空'); return; }
    navigator.clipboard.writeText(area.value).then(() => showToast('📋 便签内容已复制'));
  });
  document.getElementById('clearMemoBtn')?.addEventListener('click', async () => {
    const area = document.getElementById('quickMemoArea');
    if (!area || !area.value) return;
    const confirmed = await openConfirmDialog({
      title: '清空灵感便签',
      message: '确定清空当前便签内容吗？',
      confirmText: '确认清空',
      danger: true
    });
    if (confirmed) {
      area.value = '';
      flushMemoWriteNow('', false);
      updateMemoCount('');
      showToast('🧹 便签已清空');
    }
  });
  document.getElementById('todoForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const text = (input?.value || '').trim();
    if (!text) return;
    addTodoItem(text);
    input.value = '';
  });
  document.getElementById('todoList')?.addEventListener('change', e => {
    const cb = e.target.closest('[data-todo-toggle]');
    if (!cb) return;
    const item = state.todos.find(t => t.id === cb.getAttribute('data-todo-toggle'));
    if (item) { item.done = cb.checked; saveTodos(); renderTodoList(); }
  });
  document.getElementById('todoList')?.addEventListener('click', e => {
    const del = e.target.closest('[data-todo-del]');
    if (!del) return;
    state.todos = state.todos.filter(t => t.id !== del.getAttribute('data-todo-del'));
    saveTodos();
    renderTodoList();
  });
  document.getElementById('clearDoneTodosBtn')?.addEventListener('click', () => {
    const before = state.todos.length;
    state.todos = state.todos.filter(t => !t.done);
    if (state.todos.length === before) { showToast('💡 没有已完成的待办项'); return; }
    saveTodos();
    renderTodoList();
    showToast(`🧹 已清理 ${before - state.todos.length} 条已完成待办`);
  });

  // 8) 右键菜单
  document.getElementById('cardContextMenu')?.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('[data-ctx-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-ctx-action');
    const id = state.contextMenuBmId;
    closeCardContextMenu();
    const bm = state.bookmarks.find(b => b.id === id);
    if (!bm) return;
    if (action === 'open-bg') openBookmarkUrl(id, bm.url, true);
    else if (action === 'pin') togglePinBookmark(id);
    else if (action === 'copy') navigator.clipboard.writeText(bm.url).then(() => showToast('📋 网址已复制到剪贴板'));
    else if (action === 'refresh-icon') refreshBookmarkIcon(id, () => renderMainContent(false));
    else if (action === 'dismiss-quick') dismissQuickSave(id);
    else if (action === 'move') openMoveGroupModal(id);
    else if (action === 'edit') openBookmarkModal(id);
    else if (action === 'delete') deleteBookmark(id);
  });

  // 9) 书签、移动分组、数据中心弹窗
  document.getElementById('bookmarkModal')?.addEventListener('click', e => { if (e.target.id === 'bookmarkModal') closeBookmarkModal(); });
  document.getElementById('closeBookmarkModalBtn')?.addEventListener('click', closeBookmarkModal);
  document.getElementById('cancelBookmarkModalBtn')?.addEventListener('click', closeBookmarkModal);
  document.getElementById('bookmarkForm')?.addEventListener('submit', saveBookmark);
  document.getElementById('bmSpaceSelect')?.addEventListener('change', e => populateSelectGroups(document.getElementById('bmGroupSelect'), e.target.value));
  document.getElementById('autoDetectBtn')?.addEventListener('click', () => autoDetectSiteMetadata(true));
  document.getElementById('bmUrl')?.addEventListener('blur', () => autoDetectSiteMetadata(false));

  document.getElementById('moveGroupModal')?.addEventListener('click', e => { if (e.target.id === 'moveGroupModal') closeMoveGroupModal(); });
  document.getElementById('closeMoveGroupModalBtn')?.addEventListener('click', closeMoveGroupModal);
  document.getElementById('cancelMoveGroupModalBtn')?.addEventListener('click', closeMoveGroupModal);
  document.getElementById('moveSpaceSelect')?.addEventListener('change', e => populateSelectGroups(document.getElementById('moveGroupSelect'), e.target.value));
  document.getElementById('confirmMoveGroupBtn')?.addEventListener('click', confirmMoveBookmarkGroup);

  document.getElementById('dataCenterModal')?.addEventListener('click', e => { if (e.target.id === 'dataCenterModal') closeDataCenterModal(); });
  document.getElementById('closeDataCenterModalBtn')?.addEventListener('click', closeDataCenterModal);
  document.getElementById('closeDataCenterFooterBtn')?.addEventListener('click', closeDataCenterModal);
  document.getElementById('dcExportBtn')?.addEventListener('click', exportData);
  document.getElementById('importFile')?.addEventListener('change', e => { importData(e.target.files?.[0]); e.target.value = ''; });
  document.getElementById('dcScanDupBtn')?.addEventListener('click', scanDuplicateBookmarks);
  document.getElementById('dcCheckLinksBtn')?.addEventListener('click', checkDeadLinks);
  document.getElementById('dcMergeDefaultBtn')?.addEventListener('click', mergeMissingDefaultBookmarks);
  document.getElementById('dcResetUiBtn')?.addEventListener('click', resetUiAndCaches);
  document.getElementById('dcRestoreSnapshotBtn')?.addEventListener('click', restorePreResetSnapshot);
  document.getElementById('dcDangerToggleBtn')?.addEventListener('click', () => {
    const box = document.getElementById('dcDangerBox');
    const arrow = document.getElementById('dcDangerArrow');
    if (!box) return;
    const hidden = box.classList.toggle('hidden');
    if (arrow) arrow.textContent = hidden ? '▾' : '▴';
  });
  document.getElementById('dcResetBtn')?.addEventListener('click', resetDefaultData);
  document.getElementById('dcClearAllBtn')?.addEventListener('click', clearAllLocalBookmarks);

  document.getElementById('duplicateReportBox')?.addEventListener('click', e => {
    if (e.target.closest('[data-dead-stop]')) {
      abortRunningLinkCheck();
      showToast('⏹️ 已停止体检');
      return;
    }
    const openDead = e.target.closest('[data-dead-open-url]');
    if (openDead) {
      window.open(openDead.getAttribute('data-dead-open-url'), '_blank', 'noopener,noreferrer');
      return;
    }
    const delDead = e.target.closest('[data-dead-del-id]');
    if (delDead) {
      const id = delDead.getAttribute('data-dead-del-id');
      const row = delDead.closest('[data-dead-row]') || delDead.closest('.flex.items-center.justify-between');
      const level = row?.getAttribute('data-dead-level');
      deleteBookmark(id);
      document.getElementById('dcTotalCount').textContent = `${state.bookmarks.length} 个书签`;
      const badgeMap = { dead: 'deadCountBadge', verify: 'verifyCountBadge', slow: 'slowCountBadge' };
      const badgeEl = badgeMap[level] ? document.getElementById(badgeMap[level]) : null;
      if (badgeEl) badgeEl.textContent = String(Math.max(0, parseInt(badgeEl.textContent || '0', 10) - 1));
      row?.remove();
      return;
    }
    if (e.target.closest('[data-dup-clean-all]')) {
      const seen = new Set();
      const removedIds = new Set();
      state.bookmarks = state.bookmarks.filter(bm => {
        const k = canonicalUrlKey(bm.url);
        if (seen.has(k)) { removedIds.add(bm.id); return false; }
        seen.add(k);
        return true;
      });
      if (removedIds.size > 0) {
        state.recentVisits = state.recentVisits.filter(r => !removedIds.has(r.id));
        writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
        saveCoreState();
        document.getElementById('dcTotalCount').textContent = `${state.bookmarks.length} 个书签`;
        renderWorkspaceViews({ preserveScroll: true }); scanDuplicateBookmarks();
        showToast(`🧹 已一键清理 ${removedIds.size} 条重复书签`);
      }
      return;
    }
    const delOne = e.target.closest('[data-dup-del-id]');
    if (delOne) {
      const id = delOne.getAttribute('data-dup-del-id');
      const removed = state.bookmarks.find(b => b.id === id);
      state.bookmarks = state.bookmarks.filter(b => b.id !== id);
      if (removed && !state.bookmarks.some(b => canonicalUrlKey(b.url) === canonicalUrlKey(removed.url))) {
        recordTombstones([removed.url]);
      }
      state.recentVisits = state.recentVisits.filter(r => r.id !== id);
      writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
      saveCoreState();
      document.getElementById('dcTotalCount').textContent = `${state.bookmarks.length} 个书签`;
      renderWorkspaceViews({ preserveScroll: true }); scanDuplicateBookmarks();
      showToast('🗑️ 已移除重复书签');
    }
  });

  // 10) 工具箱事件委托
  bindToolsEvents();

  // 11) Toast、回到顶部、全局快捷键与唤醒拉取
  document.getElementById('toastContainer')?.addEventListener('click', e => {
    const undoBtn = e.target.closest('[data-toast-undo]');
    if (undoBtn) {
      undoLastDelete();
      undoBtn.closest('.toast-animate')?.remove();
      return;
    }
    if (e.target.closest('[data-toast-close]')) e.target.closest('.toast-animate')?.remove();
  });
  document.getElementById('backToTopBtn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const dialogEl = document.getElementById('dialogModal');
    const isDialogOpen = dialogEl && !dialogEl.classList.contains('hidden');
    const hasOpenModal = isDialogOpen || ['bookmarkModal', 'moveGroupModal', 'dataCenterModal', 'toolModal'].some(id => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      if (isDialogOpen) return;
      e.preventDefault(); searchInput?.focus(); searchInput?.select();
    } else if (e.key === '/' && !isTyping && !hasOpenModal && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); searchInput?.focus(); searchInput?.select();
    } else if (!isTyping && !hasOpenModal && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-6]$/.test(e.key)) {
      const sp = SPACES_CONFIG[parseInt(e.key, 10) - 1];
      if (sp) { clearSearchQuiet(); switchSpace(sp.id, 'all'); }
    } else if (e.key === 'Escape') {
      if (isDialogOpen) {
        closeActiveDialogModal();
        return;
      }
      closeBookmarkModal(); closeMoveGroupModal(); closeDataCenterModal();
      closeToolModal(); closeRecentPopover(); closeAccentPopover(); closeCardContextMenu();
    }
  });

  document.addEventListener('click', () => { closeRecentPopover(); closeAccentPopover(); closeCardContextMenu(); });

  const checkRemoteOnWake = () => {
    if (document.visibilityState === 'hidden') return;
    if (!state.ghSyncConfig.token || !state.ghSyncConfig.gistId || !state.ghSyncConfig.autoSync) return;
    const now = Date.now();
    if (now - state.lastWakePullAt < 60000) return;
    state.lastWakePullAt = now;
    pullFromGist(true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingChangesAndSync(true);
      stopClockAndCNY();
    } else {
      initClockAndCNY();
      checkRemoteOnWake();
    }
  });
  window.addEventListener('focus', checkRemoteOnWake);

  const backBtn = document.getElementById('backToTopBtn');
  let scrollRafId = 0;
  let lastShowBackBtn = null;
  window.addEventListener('scroll', () => {
    if (state.contextMenuBmId !== null) closeCardContextMenu();
    if (!backBtn || scrollRafId) return;
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = 0;
      const show = window.scrollY > 260;
      if (show === lastShowBackBtn) return;
      lastShowBackBtn = show;
      backBtn.classList.toggle('opacity-0', !show);
      backBtn.classList.toggle('pointer-events-none', !show);
      backBtn.classList.toggle('translate-y-4', !show);
      backBtn.classList.toggle('opacity-100', show);
      backBtn.classList.toggle('translate-y-0', show);
    });
  }, { passive: true });
}

async function initApp() {
  const badgeEl = document.getElementById('storageStatusBadge');
  if (badgeEl) {
    badgeEl.textContent = IS_EXTENSION ? 'Chrome 扩展本地存储 (chrome.storage.local)' : '浏览器本地存储 (localStorage)';
  }

  buildOfflineIconMaps();
  const saved = await storeGetAll(Object.values(KEYS));

  applyThemeUI(saved[KEYS.theme] === 'light' ? 'light' : 'dark');
  setAccentColor(saved[KEYS.accent] || 'indigo', false, true);
  state.isRightPanelCollapsed = saved[KEYS.rightPanel] === 'collapsed';
  applyRightPanelUI();
  initBrandLogo(saved[KEYS.customLogo] || '');

  if (Array.isArray(saved[KEYS.bookmarks]) && saved[KEYS.bookmarks].length > 0 && saved[KEYS.bookmarks][0].space) {
    state.bookmarks = sanitizeBookmarksList(saved[KEYS.bookmarks]);
    if (!saved[KEYS.initialized]) writeStoreInternal({ [KEYS.initialized]: true });
  } else if (Array.isArray(saved[KEYS.bookmarks]) && saved[KEYS.bookmarks].length === 0 && saved[KEYS.initialized]) {
    state.bookmarks = [];
  } else {
    state.bookmarks = JSON.parse(JSON.stringify(INITIAL_BOOKMARKS));
    writeStoreInternal({ [KEYS.bookmarks]: state.bookmarks, [KEYS.initialized]: true });
  }

  if (saved[KEYS.spaceGroups] && typeof saved[KEYS.spaceGroups] === 'object') {
    state.spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...saved[KEYS.spaceGroups] };
  } else {
    state.spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
    writeStoreInternal({ [KEYS.spaceGroups]: state.spaceGroups });
  }

  state.tombstones = (saved[KEYS.tombstones] && typeof saved[KEYS.tombstones] === 'object') ? saved[KEYS.tombstones] : {};

  if (Array.isArray(saved[KEYS.pendingSaves]) && saved[KEYS.pendingSaves].length > 0) {
    const merged = absorbPendingSaves(saved[KEYS.pendingSaves]);
    writeStoreInternal({ [KEYS.pendingSaves]: [] });
    if (merged > 0) saveCoreState(false);
  }

  state.collapsedGroups = (saved[KEYS.collapsed] && typeof saved[KEYS.collapsed] === 'object') ? saved[KEYS.collapsed] : {};
  state.recentVisits = Array.isArray(saved[KEYS.recentVisits]) ? saved[KEYS.recentVisits] : [];
  state.todos = Array.isArray(saved[KEYS.todos]) ? saved[KEYS.todos] : [];
  state.weatherCacheMap = (saved[KEYS.weatherCache] && typeof saved[KEYS.weatherCache] === 'object') ? saved[KEYS.weatherCache] : {};

  if (saved[KEYS.ghSync] && typeof saved[KEYS.ghSync] === 'object') {
    state.ghSyncConfig = { token: '', gistId: '', autoSync: true, lastSyncAt: 0, lastRemoteUpdatedAt: 0, ...saved[KEYS.ghSync] };
  }
  state.localUpdatedAt = typeof saved[KEYS.updatedAt] === 'number' ? saved[KEYS.updatedAt] : 0;

  if (saved[KEYS.syncConflict]) showSyncConflictBanner(saved[KEYS.syncConflict]);

  stripRedundantDictionaryIcons(true);

  const memoArea = document.getElementById('quickMemoArea');
  const savedMemo = typeof saved[KEYS.memo] === 'string' ? saved[KEYS.memo] : '';
  if (memoArea) memoArea.value = savedMemo;
  updateMemoCount(savedMemo);
  renderTodoList();
  switchNoteTab(saved[KEYS.noteTab] || 'memo', false);

  bindAllEvents();
  bindExtensionStorageWatcher();

  const urlQ = new URLSearchParams(window.location.search).get('q');
  if (urlQ && urlQ.trim()) {
    const sInput = document.getElementById('searchInput');
    if (sInput) sInput.value = urlQ.trim();
    state.searchQuery = urlQ.trim();
    state.kbdSelectedIndex = 0;
    document.getElementById('clearSearchBtn')?.classList.remove('hidden');
  }

  switchSpace('home', 'all');
  initClockAndCNY();
  initWeather(saved[KEYS.city] || DEFAULT_WEATHER_CITY);
  updateSyncBadgeUI();
  autoSyncOnStartup();

  if (state.bookmarks.length === 0 && INITIAL_BOOKMARKS.length === 0) {
    showToast('⚠️ 未检测到 js/default-bookmarks.js，请确认文件位于 js/ 目录并在 index.html 中引入', { duration: 6000 });
  }
}

window.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('load', () => { setTimeout(localizeRemoteCustomIcons, 1200); });
