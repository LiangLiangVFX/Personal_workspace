/* ==========================================================================
   核心 UI 渲染引擎（空间 Dock、左侧分组、卡片与分组局部 DOM 更新、Spotlight）
   ========================================================================== */

import { BUILTIN_TOOLS, KEYS } from '../shared/constants.js';
import { escapeHtml, extractDomain, sanitizeUrl } from '../shared/url-utils.js';
import { SPACES_CONFIG, state } from './state.js';
import { getGroupsForSpace, markLocalChangeAndSync, saveCoreState, writeStoreInternal } from './storage.js';
import {
  applyRightPanelUI,
  closeAccentPopover,
  closeRecentPopover,
  openConfirmDialog,
  openPromptDialog,
  showToast
} from './ui-utils.js';
import { renderCardIconInnerHtml } from './icons.js';
import { searchBookmarksWeighted, searchBuiltinTools, syncKeyboardHighlight } from './search.js';

const SPACE_META_MAP = new Map(SPACES_CONFIG.map(sp => [sp.id, sp]));
let pendingRefreshOpts = null;
let refreshRafId = 0;

export function getCardGridClass() {
  return state.isRightPanelCollapsed
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5';
}

export function renderSpaceDock() {
  const dock = document.getElementById('spaceDockBar');
  if (!dock) return;

  dock.innerHTML = SPACES_CONFIG.map((sp, idx) => {
    const active = state.currentSpace === sp.id && !state.searchQuery.trim();
    let count = 0;
    if (sp.id === 'home') count = state.bookmarks.filter(b => b.pinned).length;
    else if (sp.isTools) count = BUILTIN_TOOLS.length;
    else count = state.bookmarks.filter(b => b.space === sp.id).length;

    const dropType = (state.isEditMode && !sp.isTools)
      ? (sp.id === 'home' ? 'data-drop-type="pin"' : `data-drop-type="space" data-drop-space="${escapeHtml(sp.id)}"`)
      : '';

    return `
      <button
        type="button"
        data-dock-space="${escapeHtml(sp.id)}"
        title="快捷键 ${idx + 1} 快速切换至${escapeHtml(sp.name)}"
        ${dropType}
        class="shrink-0 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
          active
            ? 'dock-item-active border-transparent'
            : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-800/80'
        }"
      >
        <span>${escapeHtml(sp.icon)}</span>
        <span>${escapeHtml(sp.name)}</span>
        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }">${count}</span>
      </button>
    `;
  }).join('');
}

export function renderSidebarGroups() {
  const nav = document.getElementById('categoryNav');
  const header = document.getElementById('sidebarGroupHeader');
  const badge = document.getElementById('sidebarCountBadge');
  const addBtn = document.getElementById('addGroupBtn');
  const dragTip = document.getElementById('sidebarDragTip');
  if (!nav) return;

  const spObj = SPACES_CONFIG.find(s => s.id === state.currentSpace) || SPACES_CONFIG[0] || { id: 'home', name: '首页聚焦', virtual: true };
  if (header) header.textContent = spObj.name;
  if (addBtn) addBtn.classList.toggle('hidden', !!spObj.virtual || !!spObj.isTools);
  if (dragTip) dragTip.classList.toggle('hidden', !state.isEditMode || !!spObj.isTools);

  let html = '';

  if (state.currentSpace === 'home') {
    const pinnedCount = state.bookmarks.filter(b => b.pinned).length;
    const recentCount = state.recentVisits.filter(r => state.bookmarks.some(b => b.id === r.id)).length;
    if (badge) badge.textContent = state.bookmarks.length;

    const quickSavedCount = state.bookmarks.filter(b => b.quickSavedAt).length;
    const homeItems = [
      { key: 'all', icon: '⚡', label: '聚焦总览 (置顶+高频)', count: pinnedCount, droppablePin: false },
      { key: 'quick', icon: '📥', label: '最近快捷收藏', count: quickSavedCount, droppablePin: false },
      { key: 'pinned', icon: '⭐', label: '常用置顶站点', count: pinnedCount, droppablePin: true },
      { key: 'recent', icon: '🕒', label: '最近高频访问', count: recentCount, droppablePin: false },
      { key: 'everything', icon: '📚', label: `全站 ${state.bookmarks.length} 书签汇总`, count: state.bookmarks.length, droppablePin: false }
    ];

    html = homeItems.map(item => {
      const active = state.currentGroup === item.key;
      const dropAttr = (state.isEditMode && item.droppablePin) ? 'data-drop-type="pin"' : '';
      return `
        <button type="button" data-nav-space="home" data-nav-group="${item.key}" ${dropAttr} class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
          active ? 'theme-badge font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border-transparent'
        }">
          <span class="flex items-center gap-2 truncate"><span class="nav-icon">${escapeHtml(item.icon)}</span><span class="truncate">${escapeHtml(item.label)}</span></span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${item.count}</span>
        </button>
      `;
    }).join('');

    html += `<div class="hidden lg:block pt-3 mt-2 border-t border-slate-200/60 dark:border-slate-800/80 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">空间分组直达</div>`;
    SPACES_CONFIG.filter(s => !s.virtual && !s.isTools).forEach(sp => {
      const spCount = state.bookmarks.filter(b => b.space === sp.id).length;
      const dropAttr = state.isEditMode ? `data-drop-type="space" data-drop-space="${escapeHtml(sp.id)}"` : '';
      html += `
        <button type="button" data-nav-space="${escapeHtml(sp.id)}" data-nav-group="all" ${dropAttr} class="nav-btn hidden lg:flex w-full items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border border-transparent transition-all">
          <span class="flex items-center gap-2 truncate"><span class="nav-icon">${escapeHtml(sp.icon)}</span><span class="truncate">${escapeHtml(sp.name)}</span></span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${spCount}</span>
        </button>
      `;
    });
  } else if (state.currentSpace === 'tools') {
    if (badge) badge.textContent = BUILTIN_TOOLS.length;
    html = `
      <button type="button" data-nav-space="tools" data-nav-group="all" class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold theme-badge border transition-all">
        <span class="flex items-center gap-2 truncate"><span class="nav-icon">🛠️</span><span>全部本地工具</span></span>
        <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800">${BUILTIN_TOOLS.length}</span>
      </button>
    `;
    BUILTIN_TOOLS.forEach(t => {
      html += `
        <button type="button" data-open-tool="${escapeHtml(t.type)}" class="nav-btn shrink-0 w-auto lg:w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border border-transparent transition-all">
          <span class="nav-icon">${escapeHtml(t.icon)}</span>
          <span class="truncate">${escapeHtml(t.title)}</span>
        </button>
      `;
    });
  } else {
    const groups = getGroupsForSpace(state.currentSpace);
    const spaceItems = state.bookmarks.filter(b => b.space === state.currentSpace);
    if (badge) badge.textContent = spaceItems.length;

    html = `
      <button type="button" data-nav-space="${escapeHtml(state.currentSpace)}" data-nav-group="all" class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
        state.currentGroup === 'all' ? 'theme-badge font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border-transparent'
      }">
        <span class="flex items-center gap-2 truncate"><span class="nav-icon">⚡</span><span>全部${escapeHtml(spObj.name)}</span></span>
        <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${spaceItems.length}</span>
      </button>
    `;

    groups.forEach(gName => {
      const active = state.currentGroup === gName;
      const count = spaceItems.filter(b => b.group === gName).length;
      const m = gName.match(/^(\S+)\s+(.*)$/);
      const icon = m ? m[1] : '📁';
      const label = m ? m[2] : gName;
      const escG = escapeHtml(gName);
      const escSp = escapeHtml(state.currentSpace);

      const dragAttrs = state.isEditMode
        ? `draggable="true" data-drag-group-space="${escSp}" data-drag-group-name="${escG}" data-drop-type="group" data-drop-space="${escSp}" data-drop-group="${escG}"`
        : '';

      const groupOps = state.isEditMode ? `
        <span class="flex items-center gap-0.5 shrink-0 ml-1">
          <span data-group-op="rename" data-op-space="${escSp}" data-op-group="${escG}" title="重命名分组" class="w-5 h-5 rounded hover:bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] cursor-pointer">✏️</span>
          <span data-group-op="delete" data-op-space="${escSp}" data-op-group="${escG}" title="删除分组" class="w-5 h-5 rounded hover:bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] cursor-pointer">✕</span>
        </span>
      ` : '';

      html += `
        <button type="button" data-nav-space="${escSp}" data-nav-group="${escG}" ${dragAttrs} class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
          active ? 'theme-badge font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border-transparent'
        }">
          <span class="flex items-center gap-1.5 truncate min-w-0">
            ${state.isEditMode ? `<span class="text-[10px] text-amber-500/80 select-none cursor-grab">⠿</span>` : ''}
            <span class="nav-icon text-sm">${escapeHtml(icon)}</span>
            <span class="truncate">${escapeHtml(label)}</span>
          </span>
          <span class="flex items-center shrink-0">
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${count}</span>
            ${groupOps}
          </span>
        </button>
      `;
    });
  }

  nav.innerHTML = html;
}

export function createBookmarkCardHtml(bm, opts = {}) {
  const host = extractDomain(bm.url);
  const safeUrl = escapeHtml(sanitizeUrl(bm.url) || '#');
  const safeId = escapeHtml(bm.id);
  const isQuickSection = !!opts.isQuickSection;

  let footerHtml = '';
  if (state.isEditMode) {
    footerHtml = `
      <div class="card-action-bar mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-1 relative z-20">
        <div class="flex items-center gap-1">
          <button type="button" data-card-action="pin" data-bm-id="${safeId}" title="${bm.pinned ? '取消首页置顶' : '置顶到首页聚焦'}" class="px-1.5 py-1 rounded-lg ${bm.pinned ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'} text-[11px] font-bold transition">
            ${bm.pinned ? '⭐' : '☆'}
          </button>
          <button type="button" data-card-action="move" data-bm-id="${safeId}" title="移动到其他空间或分组" class="px-2 py-1 rounded-lg bg-indigo-500/12 hover:bg-indigo-500 hover:text-white text-[11px] font-semibold text-indigo-500 dark:text-indigo-300 transition flex items-center gap-0.5">
            <span>📂</span><span>移动</span>
          </button>
        </div>
        <div class="flex items-center gap-1">
          ${isQuickSection ? `<button type="button" data-card-action="dismiss-quick" data-bm-id="${safeId}" title="仅移出快捷收藏列表，不删除书签" class="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-[11px] font-semibold text-emerald-500 transition">✓ 移出</button>` : ''}
          <button type="button" data-card-action="edit" data-bm-id="${safeId}" class="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-[11px] font-semibold text-amber-600 dark:text-amber-400 transition">编辑</button>
          <button type="button" data-card-action="delete" data-bm-id="${safeId}" class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-[11px] font-semibold text-rose-600 dark:text-rose-400 transition">删除</button>
        </div>
      </div>
    `;
  } else if (isQuickSection) {
    const spObj = SPACE_META_MAP.get(bm.space);
    const locLabel = `${spObj ? spObj.icon : '📁'} ${bm.group || ''}`.trim();
    footerHtml = `
      <div class="card-action-bar mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 relative z-20">
        <span class="text-[10px] text-slate-400 truncate" title="存放位置：${escapeHtml(locLabel)}">${escapeHtml(locLabel)}</span>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-card-action="move" data-bm-id="${safeId}" title="移动到其他空间或分组" class="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-300 transition">📂 换组</button>
          <button type="button" data-card-action="dismiss-quick" data-bm-id="${safeId}" title="移出快捷收藏（书签仍保留在原分组）" class="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 border border-emerald-500/20 text-[10px] font-bold transition">✓ 移出</button>
        </div>
      </div>
    `;
  }

  return `
    <div
      data-bm-id="${safeId}"
      data-kbd-type="bookmark"
      data-kbd-url="${safeUrl}"
      ${state.isEditMode ? 'draggable="true"' : ''}
      class="specular-card spotlight-card bookmark-card rounded-2xl p-4 cursor-pointer flex flex-col justify-between group h-full"
    >
      <div class="flex items-start gap-3.5 relative z-10 pointer-events-none">
        <div class="icon-wrapper shrink-0 mt-0.5">
          <div class="icon-container w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-center shadow-sm">
            ${renderCardIconInnerHtml(bm)}
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-1.5">
            <h3 class="font-bold text-[13.5px] text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors leading-snug break-words">
              ${escapeHtml(bm.title || host)}
            </h3>
            <span class="launch-arrow text-xs font-mono shrink-0 mt-0.5">${state.isEditMode ? '⠿' : '↗'}</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed break-words">
            ${escapeHtml(bm.desc || host)}
          </p>
        </div>
      </div>
      ${footerHtml}
    </div>
  `;
}

export function createToolCardHtml(tool) {
  return `
    <div
      data-kbd-type="tool"
      data-open-tool="${escapeHtml(tool.type)}"
      class="specular-card spotlight-card bookmark-card rounded-2xl p-4 cursor-pointer flex items-start gap-3.5 group h-full"
    >
      <div class="icon-wrapper shrink-0">
        <div class="icon-container w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-xl shadow-sm">
          <span class="icon-img">${escapeHtml(tool.icon)}</span>
        </div>
      </div>
      <div class="min-w-0 flex-1 relative z-10">
        <div class="flex items-center justify-between gap-1">
          <h3 class="font-bold text-[13.5px] text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">${escapeHtml(tool.title)}</h3>
          <span class="launch-arrow text-xs font-bold">⚡</span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed break-words">${escapeHtml(tool.desc)}</p>
      </div>
    </div>
  `;
}

export function renderBuiltinToolsSection(toolsList) {
  return `
    <section class="space-y-3.5">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl theme-badge border flex items-center justify-center text-base shadow-sm">🛠️</span>
          <h2 class="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
            <span>纯本地效率小工具</span>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded-full theme-badge border">${toolsList.length}</span>
          </h2>
        </div>
        <span class="text-[11px] text-slate-400 hidden sm:inline">支持多图批处理与 Ctrl+V 贴图 · 自动暂存防误关</span>
      </div>
      <div class="${getCardGridClass()}">
        ${toolsList.map(tool => createToolCardHtml(tool)).join('')}
      </div>
    </section>
  `;
}

export function renderGroupSectionHtml(spaceId, groupName, items, allowEmptyDrop = false, allowCollapse = true, opts = {}) {
  const m = groupName.match(/^(\S+)\s+(.*)$/);
  const icon = m ? m[1] : '📁';
  const cleanTitle = m ? m[2] : groupName;
  const escG = escapeHtml(groupName);
  const collapseKey = `${spaceId || 'search'}::${groupName}`;
  const isSearching = !!(state.searchQuery.trim() && state.currentEngine === 'local');
  const isCollapsed = allowCollapse && !isSearching && !!state.collapsedGroups[collapseKey];
  const isQuickSection = !!opts.isQuickSection;
  const isNonSortable = !!opts.nonSortable;

  const sectionDropAttrs = [
    (state.isEditMode && spaceId && spaceId !== 'home')
      ? `data-drop-section-space="${escapeHtml(spaceId)}" data-drop-section-group="${escG}"`
      : '',
    isNonSortable ? 'data-non-sortable="1"' : ''
  ].filter(Boolean).join(' ');

  let bodyHtml = '';
  if (!isCollapsed) {
    bodyHtml = items.length > 0
      ? `<div class="${getCardGridClass()}">${items.map(bm => createBookmarkCardHtml(bm, { isQuickSection })).join('')}</div>`
      : (allowEmptyDrop ? `
        <div class="specular-card rounded-2xl p-8 text-center border-dashed border-2 border-slate-300/70 dark:border-slate-700/70 space-y-2">
          <div class="text-2xl">📂</div>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">分组「${escapeHtml(cleanTitle)}」暂无书签，可直接拖入卡片或点击添加</div>
          <button type="button" data-empty-add-bm="1" class="px-3.5 py-1.5 rounded-xl theme-solid-bg text-white text-xs font-semibold">＋ 添加书签至此分组</button>
        </div>
      ` : '');
  }

  if (!isCollapsed && !bodyHtml) return '';

  const rightHeaderHtml = isQuickSection && items.length > 0
    ? `<button type="button" data-clear-all-quick="1" title="一键移出全部快捷收藏（不删除书签本身）" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-300 transition shrink-0">🧹 清空列表</button>`
    : (state.isEditMode && spaceId && spaceId !== 'home' ? `<span class="text-[11px] text-amber-500 font-semibold hidden sm:inline">⠿ 拖拽排序或扔进左侧分组 / 顶部 Dock</span>` : '');

  return `
    <section ${sectionDropAttrs} data-section-collapse-key="${escapeHtml(collapseKey)}" class="space-y-3.5 transition-all rounded-2xl">
      <div class="flex items-center justify-between px-1 gap-2">
        <div ${allowCollapse && !isSearching ? `data-collapse-key="${escapeHtml(collapseKey)}" title="点击折叠或展开此分组"` : ''} class="flex items-center gap-2.5 ${allowCollapse && !isSearching ? 'cursor-pointer select-none group/sec' : ''}">
          <span class="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-700/70 flex items-center justify-center text-base shadow-sm">${escapeHtml(icon)}</span>
          <h2 class="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
            <span class="group-hover/sec:text-indigo-500 transition-colors">${escapeHtml(cleanTitle)}</span>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${items.length}</span>
            ${allowCollapse && !isSearching ? `<span class="text-[11px] text-slate-400 group-hover/sec:text-indigo-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}">▾</span>` : ''}
          </h2>
        </div>
        ${rightHeaderHtml}
      </div>
      ${bodyHtml}
    </section>
  `;
}

export function renderMainContent(scrollToKbd = false, { preserveScroll = true } = {}) {
  const container = document.getElementById('mainContent');
  if (!container) return;
  const rawQ = state.searchQuery.trim().toLowerCase();
  const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];
  let html = '';

  if (tokens.length > 0 && state.currentEngine === 'local') {
    const matchedTools = searchBuiltinTools(tokens);
    const matchedBms = searchBookmarksWeighted(rawQ);
    const headerLabel = tokens.length > 1
      ? `🔎 多词组合匹配 (${tokens.join(' + ')})`
      : '🔎 全局智能匹配（高频优先）';
    if (matchedBms.length > 0) html += renderGroupSectionHtml('', headerLabel, matchedBms, false, false, { nonSortable: true });
    if (matchedTools.length > 0) html += renderBuiltinToolsSection(matchedTools);
  } else if (state.currentSpace === 'tools') {
    html += renderBuiltinToolsSection(BUILTIN_TOOLS);
  } else if (state.currentSpace === 'home') {
    const quickList = state.bookmarks
      .filter(b => b.quickSavedAt)
      .sort((a, b) => (b.quickSavedAt || 0) - (a.quickSavedAt || 0))
      .slice(0, state.currentGroup === 'quick' ? 40 : 8);
    const pinnedList = state.bookmarks.filter(b => b.pinned);
    const recentBms = state.recentVisits.map(r => state.bookmarks.find(b => b.id === r.id)).filter(Boolean).slice(0, 8);

    if ((state.currentGroup === 'all' && quickList.length > 0) || state.currentGroup === 'quick') {
      html += renderGroupSectionHtml('home', '📥 最近快捷收藏（右键 / Alt+S）', quickList, false, true, { isQuickSection: true, nonSortable: true });
    }
    if (state.currentGroup === 'all' || state.currentGroup === 'pinned') {
      html += renderGroupSectionHtml('home', '⭐ 常用置顶工作台', pinnedList, false, true);
    }
    if ((state.currentGroup === 'all' && recentBms.length > 0) || state.currentGroup === 'recent') {
      html += renderGroupSectionHtml('home', '🕒 最近高频访问', recentBms, false, true, { nonSortable: true });
    }
    if (state.currentGroup === 'all') {
      html += `
        <section class="space-y-3.5">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl theme-badge border flex items-center justify-center text-base shadow-sm">🛠️</span>
              <h2 class="text-sm sm:text-base font-extrabold tracking-tight">纯本地效率小工具速启</h2>
            </div>
            <button type="button" data-goto-tools="1" class="text-xs font-bold theme-text hover:underline">查看全部 ${BUILTIN_TOOLS.length} 个 →</button>
          </div>
          <div class="${getCardGridClass()}">
            ${BUILTIN_TOOLS.slice(0, 4).map(tool => createToolCardHtml(tool)).join('')}
          </div>
        </section>
      `;
    }
    if (state.currentGroup === 'everything') {
      SPACES_CONFIG.filter(s => !s.virtual && !s.isTools).forEach(sp => {
        getGroupsForSpace(sp.id).forEach(gName => {
          const items = state.bookmarks.filter(b => b.space === sp.id && b.group === gName);
          if (items.length > 0) html += renderGroupSectionHtml(sp.id, gName, items, false, true);
        });
      });
    }
  } else {
    const groups = getGroupsForSpace(state.currentSpace);
    groups.forEach(gName => {
      if (state.currentGroup !== 'all' && state.currentGroup !== gName) return;
      const items = state.bookmarks.filter(b => b.space === state.currentSpace && b.group === gName);
      html += renderGroupSectionHtml(state.currentSpace, gName, items, state.currentGroup === gName || state.isEditMode, true);
    });
  }

  if (!html) {
    html = `
      <div class="specular-card rounded-3xl p-12 text-center space-y-3">
        <div class="text-4xl">🔭</div>
        <h3 class="text-base font-bold">当前视图暂无匹配内容</h3>
        <p class="text-xs text-slate-400">可尝试更换关键词或空格组合词，或按 Tab 切换外部搜索引擎</p>
        <button type="button" data-reset-home="1" class="mt-2 px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold transition">返回首页聚焦</button>
      </div>
    `;
  }

  const prevScrollY = (preserveScroll && !scrollToKbd && typeof window !== 'undefined') ? (window.scrollY || 0) : 0;
  container.innerHTML = html;
  if (prevScrollY > 0 && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: prevScrollY, behavior: 'instant' });
  }
  syncKeyboardHighlight(scrollToKbd);
}

export function renderWorkspaceViews({
  dock = true,
  sidebar = true,
  main = true,
  scrollToKbd = false,
  preserveScroll = true
} = {}) {
  if (refreshRafId && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(refreshRafId);
    refreshRafId = 0;
    pendingRefreshOpts = null;
  }
  if (dock) renderSpaceDock();
  if (sidebar) renderSidebarGroups();
  if (main) renderMainContent(scrollToKbd, { preserveScroll });
}

export function scheduleWorkspaceRefresh(opts = {}) {
  pendingRefreshOpts = {
    dock: Boolean((pendingRefreshOpts ? pendingRefreshOpts.dock : false) || opts.dock !== false),
    sidebar: Boolean((pendingRefreshOpts ? pendingRefreshOpts.sidebar : false) || opts.sidebar !== false),
    main: Boolean((pendingRefreshOpts ? pendingRefreshOpts.main : false) || opts.main !== false),
    scrollToKbd: Boolean(pendingRefreshOpts?.scrollToKbd || opts.scrollToKbd),
    preserveScroll: (pendingRefreshOpts ? pendingRefreshOpts.preserveScroll : true) && (opts.preserveScroll !== false)
  };
  if (refreshRafId) return;
  if (typeof requestAnimationFrame !== 'function') {
    const runOpts = pendingRefreshOpts;
    pendingRefreshOpts = null;
    renderWorkspaceViews(runOpts);
    return;
  }
  refreshRafId = requestAnimationFrame(() => {
    const runOpts = pendingRefreshOpts || {};
    refreshRafId = 0;
    pendingRefreshOpts = null;
    renderWorkspaceViews(runOpts);
  });
}

export function renderSingleGroupSectionHtml(collapseKey) {
  const sepIdx = collapseKey.indexOf('::');
  if (sepIdx === -1) return '';
  const spId = collapseKey.slice(0, sepIdx);
  const gName = collapseKey.slice(sepIdx + 2);

  if (spId === 'home') {
    if (gName === '📥 最近快捷收藏（右键 / Alt+S）') {
      const quickList = state.bookmarks
        .filter(b => b.quickSavedAt)
        .sort((a, b) => (b.quickSavedAt || 0) - (a.quickSavedAt || 0))
        .slice(0, state.currentGroup === 'quick' ? 40 : 8);
      return renderGroupSectionHtml('home', gName, quickList, false, true, { isQuickSection: true, nonSortable: true });
    }
    if (gName === '⭐ 常用置顶工作台') {
      return renderGroupSectionHtml('home', gName, state.bookmarks.filter(b => b.pinned), false, true);
    }
    if (gName === '🕒 最近高频访问') {
      const recentBms = state.recentVisits.map(r => state.bookmarks.find(b => b.id === r.id)).filter(Boolean).slice(0, 8);
      return renderGroupSectionHtml('home', gName, recentBms, false, true, { nonSortable: true });
    }
  }

  const items = state.bookmarks.filter(b => b.space === spId && b.group === gName);
  const allowEmpty = state.currentSpace !== 'home' && (state.currentGroup === gName || state.isEditMode);
  return renderGroupSectionHtml(spId, gName, items, allowEmpty, true);
}

export function bindSpotlightContainer(container) {
  if (!container) return;
  let rafId = 0;
  let lastEvent = null;
  container.addEventListener('mousemove', e => {
    lastEvent = e;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const ev = lastEvent;
      if (!ev) return;
      const card = ev.target?.closest?.('.spotlight-card');
      if (!card || !container.contains(card)) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${ev.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${ev.clientY - rect.top}px`);
    });
  }, { passive: true });
}

export function switchSpace(spaceId, group = 'all') {
  const viewChanged = state.currentSpace !== spaceId || state.currentGroup !== group;
  state.currentSpace = spaceId;
  state.currentGroup = group;
  state.kbdSelectedIndex = -1;
  renderWorkspaceViews({ preserveScroll: !viewChanged });
}

export function toggleRightPanel() {
  state.isRightPanelCollapsed = !state.isRightPanelCollapsed;
  writeStoreInternal({ [KEYS.rightPanel]: state.isRightPanelCollapsed ? 'collapsed' : 'expanded' });
  applyRightPanelUI();
  renderMainContent(false);
  markLocalChangeAndSync();
  showToast(state.isRightPanelCollapsed ? '◧ 已收起右侧仪表盘，卡片区已自动拓宽' : '◧ 已展开右侧实时仪表盘');
}

export async function promptAddGroup() {
  const spObj = SPACE_META_MAP.get(state.currentSpace);
  if (!spObj || spObj.virtual || spObj.isTools) return;
  const input = await openPromptDialog({
    title: `新建「${spObj.name}」分组`,
    message: '请输入新分组名称（可带 Emoji 前缀）：',
    placeholder: '例如：🌟 常用收藏',
    confirmText: '创建分组'
  });
  if (!input || !input.trim()) return;
  const raw = input.trim();
  const formatted = raw.match(/^\S+\s+/) ? raw : `📁 ${raw}`;

  if (!state.spaceGroups[state.currentSpace]) state.spaceGroups[state.currentSpace] = [];
  if (getGroupsForSpace(state.currentSpace).includes(formatted)) {
    switchSpace(state.currentSpace, formatted);
    showToast('💡 该分组已存在，已自动切换');
    return;
  }
  state.spaceGroups[state.currentSpace].push(formatted);
  saveCoreState();
  switchSpace(state.currentSpace, formatted);
  showToast(`🎉 已新建分组：${formatted}`);
}

export async function renameGroup(spaceId, oldName) {
  const input = await openPromptDialog({
    title: '重命名分组',
    message: `将分组「${oldName}」更名为：`,
    defaultValue: oldName,
    confirmText: '保存名称'
  });
  if (!input || !input.trim() || input.trim() === oldName) return;
  const newName = input.trim().match(/^\S+\s+/) ? input.trim() : `📁 ${input.trim()}`;
  if (!state.spaceGroups[spaceId]) state.spaceGroups[spaceId] = [];
  state.spaceGroups[spaceId] = Array.from(new Set(state.spaceGroups[spaceId].map(g => g === oldName ? newName : g)));
  if (!state.spaceGroups[spaceId].includes(newName)) state.spaceGroups[spaceId].push(newName);
  state.bookmarks.forEach(b => { if (b.space === spaceId && b.group === oldName) b.group = newName; });
  const oldCollapseKey = `${spaceId}::${oldName}`;
  const newCollapseKey = `${spaceId}::${newName}`;
  if (oldCollapseKey in state.collapsedGroups) {
    if (state.collapsedGroups[oldCollapseKey] && !(newCollapseKey in state.collapsedGroups)) {
      state.collapsedGroups[newCollapseKey] = true;
    }
    delete state.collapsedGroups[oldCollapseKey];
    writeStoreInternal({ [KEYS.collapsed]: state.collapsedGroups });
  }
  if (state.currentGroup === oldName) state.currentGroup = newName;
  saveCoreState();
  renderWorkspaceViews({ dock: false, sidebar: true, main: true });
  showToast(`✏️ 分组已更名为「${newName}」`);
}

export async function deleteGroup(spaceId, groupName) {
  const groups = getGroupsForSpace(spaceId);
  if (groups.length <= 1) { showToast('⚠️ 每个空间至少需保留 1 个分组'); return; }
  const affected = state.bookmarks.filter(b => b.space === spaceId && b.group === groupName).length;
  const fallbackGroup = groups.find(g => g !== groupName);
  const msg = affected > 0
    ? `确定删除分组「${groupName}」吗？\n\n该分组内的 ${affected} 个书签将安全转移至「${fallbackGroup}」（不会删除书签）。`
    : `确定删除空分组「${groupName}」吗？`;
  const confirmed = await openConfirmDialog({
    title: '删除分组',
    message: msg,
    confirmText: '确认删除',
    danger: true
  });
  if (!confirmed) return;

  state.bookmarks.forEach(b => { if (b.space === spaceId && b.group === groupName) b.group = fallbackGroup; });
  state.spaceGroups[spaceId] = (state.spaceGroups[spaceId] || []).filter(g => g !== groupName);
  const oldCollapseKey = `${spaceId}::${groupName}`;
  if (oldCollapseKey in state.collapsedGroups) {
    delete state.collapsedGroups[oldCollapseKey];
    writeStoreInternal({ [KEYS.collapsed]: state.collapsedGroups });
  }
  if (state.currentGroup === groupName) state.currentGroup = 'all';
  saveCoreState();
  renderWorkspaceViews({ dock: false, sidebar: true, main: true });
  showToast(`🗑️ 已删除分组「${groupName}」`);
}

export function openCardContextMenu(e, bmId) {
  e.preventDefault();
  e.stopPropagation();
  closeRecentPopover();
  closeAccentPopover();
  const bm = state.bookmarks.find(b => b.id === bmId);
  const menu = document.getElementById('cardContextMenu');
  if (!bm || !menu) return;

  state.contextMenuBmId = bmId;
  document.getElementById('ctxPinIcon').textContent = bm.pinned ? '☆' : '⭐';
  document.getElementById('ctxPinLabel').textContent = bm.pinned ? '取消首页置顶' : '置顶到首页';
  document.getElementById('ctxDismissQuickBtn')?.classList.toggle('hidden', !bm.quickSavedAt);

  menu.classList.remove('hidden');
  const vw = window.innerWidth, vh = window.innerHeight;
  const mw = menu.offsetWidth || 176, mh = menu.offsetHeight || 310;
  menu.style.left = `${Math.max(8, Math.min(e.clientX, vw - mw - 12))}px`;
  menu.style.top = `${Math.max(8, Math.min(e.clientY, vh - mh - 12))}px`;
}
