/* ==========================================================================
   站内加权检索（多词 AND + 拼音首字母 + 高频加权）与键盘启动器
   ========================================================================== */

import { BUILTIN_TOOLS, ENGINE_ORDER, SEARCH_ENGINES } from '../shared/constants.js';
import { getPinyinInitials } from '../shared/pinyin.js';
import { state } from './state.js';
import { showToast } from './ui-utils.js';

const bookmarkSearchCache = new WeakMap();

const BUILTIN_TOOL_INDEX = BUILTIN_TOOLS.map(tool => ({
  tool,
  titleLower: tool.title.toLowerCase(),
  descLower: tool.desc.toLowerCase(),
  titlePy: getPinyinInitials(tool.title),
  descPy: getPinyinInitials(tool.desc)
}));

function getBookmarkSearchEntry(bm) {
  const title = bm.title || '';
  const desc = bm.desc || '';
  const url = bm.url || '';
  const group = bm.group || '';
  const updatedAt = bm.updatedAt || 0;
  const cached = bookmarkSearchCache.get(bm);

  if (
    cached &&
    cached.updatedAt === updatedAt &&
    cached.title === title &&
    cached.desc === desc &&
    cached.url === url &&
    cached.group === group
  ) {
    return cached;
  }

  const entry = {
    updatedAt,
    title,
    desc,
    url,
    group,
    titleLower: title.toLowerCase(),
    descLower: desc.toLowerCase(),
    urlLower: url.toLowerCase(),
    groupLower: group.toLowerCase(),
    titlePy: getPinyinInitials(title),
    descPy: getPinyinInitials(desc),
    groupPy: getPinyinInitials(group)
  };
  bookmarkSearchCache.set(bm, entry);
  return entry;
}

export function searchBuiltinTools(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  return BUILTIN_TOOL_INDEX
    .filter(item => tokens.every(tk =>
      item.titleLower.includes(tk) ||
      item.descLower.includes(tk) ||
      item.titlePy.includes(tk) ||
      item.descPy.includes(tk)
    ))
    .map(item => item.tool);
}

export function searchBookmarksWeighted(query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const visitMap = new Map(state.recentVisits.map(r => [r.id, r.count || 1]));

  return state.bookmarks
    .map(bm => {
      const idx = getBookmarkSearchEntry(bm);
      let score = 0;
      for (const tk of tokens) {
        let tkScore = 0;
        if (idx.titleLower === tk) tkScore += 200;
        else if (idx.titleLower.startsWith(tk)) tkScore += 140;
        else if (idx.titleLower.includes(tk)) tkScore += 100;
        else if (idx.titlePy.includes(tk)) tkScore += 85;

        if (idx.urlLower.includes(tk)) tkScore += 65;
        if (idx.descLower.includes(tk) || idx.groupLower.includes(tk)) tkScore += 35;
        else if (idx.descPy.includes(tk) || idx.groupPy.includes(tk)) tkScore += 25;

        if (tkScore === 0) return null;
        score += tkScore;
      }

      score += Math.min(60, (visitMap.get(bm.id) || 0) * 6) + (bm.pinned ? 18 : 0);
      return { bm, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(item => item.bm);
}

export function getNavigableCards() {
  return Array.from(document.querySelectorAll('#mainContent .bookmark-card[data-kbd-type]'));
}

export function syncKeyboardHighlight(shouldScroll = false) {
  const cards = getNavigableCards();
  const activeSearch = state.currentEngine === 'local' && !!state.searchQuery.trim();
  cards.forEach((el, idx) => el.classList.toggle('kbd-active-card', idx === state.kbdSelectedIndex && activeSearch));
  if (shouldScroll && state.kbdSelectedIndex >= 0 && state.kbdSelectedIndex < cards.length && activeSearch) {
    cards[state.kbdSelectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

export function clearSearchQuiet() {
  clearTimeout(state.searchDebounceTimer);
  state.searchDebounceTimer = null;
  state.isSearchComposing = false;
  state.searchQuery = '';
  state.kbdSelectedIndex = -1;
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.getElementById('clearSearchBtn')?.classList.add('hidden');
}

export function createSearchHandlers({ renderSpaceDock, renderMainContent, openToolModal, openBookmarkUrl }) {
  function setSearchEngine(engine) {
    state.currentEngine = engine;
    state.kbdSelectedIndex = -1;
    document.querySelectorAll('#searchEngineTabs .engine-tab').forEach(tab => {
      tab.classList.toggle('engine-tab-active', tab.getAttribute('data-engine') === engine);
    });
    const cfg = SEARCH_ENGINES[engine] || SEARCH_ENGINES.local;
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchSubmitBtn');
    if (input) input.placeholder = cfg.placeholder;
    if (btn) btn.textContent = cfg.btnText;
    if (engine === 'local') {
      clearTimeout(state.searchDebounceTimer);
      state.searchQuery = input ? input.value : '';
      state.kbdSelectedIndex = state.searchQuery.trim() ? 0 : -1;
      renderSpaceDock();
      renderMainContent(false, { preserveScroll: false });
    }
  }

  function applySearchQueryNow(val) {
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = null;
    state.searchQuery = val;
    document.getElementById('clearSearchBtn')?.classList.toggle('hidden', !val);
    if (state.currentEngine === 'local') {
      state.kbdSelectedIndex = val.trim() ? 0 : -1;
      renderSpaceDock();
      renderMainContent(false, { preserveScroll: false });
    }
  }

  function handleSearchInput(val) {
    document.getElementById('clearSearchBtn')?.classList.toggle('hidden', !val);
    if (state.currentEngine !== 'local') {
      state.searchQuery = val;
      return;
    }
    if (state.isSearchComposing) return;
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(() => applySearchQueryNow(val), 100);
  }

  function handleSearchKeydown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const curIdx = ENGINE_ORDER.indexOf(state.currentEngine);
      const nextIdx = (curIdx + (e.shiftKey ? -1 : 1) + ENGINE_ORDER.length) % ENGINE_ORDER.length;
      setSearchEngine(ENGINE_ORDER[nextIdx]);
      showToast(`🔎 已切换搜索引擎：${SEARCH_ENGINES[ENGINE_ORDER[nextIdx]].name}`);
      return;
    }
    if (state.currentEngine === 'local' && state.searchQuery.trim()) {
      const cards = getNavigableCards();
      if (!cards.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.kbdSelectedIndex = (state.kbdSelectedIndex + 1) % cards.length;
        syncKeyboardHighlight(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.kbdSelectedIndex = (state.kbdSelectedIndex - 1 + cards.length) % cards.length;
        syncKeyboardHighlight(true);
      }
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const inputEl = document.getElementById('searchInput');
    const rawVal = inputEl?.value || '';
    const val = rawVal.trim();
    if (state.currentEngine === 'local') {
      if (state.searchDebounceTimer || state.searchQuery !== rawVal) {
        applySearchQueryNow(rawVal);
      }
      if (val) {
        const cards = getNavigableCards();
        const card = cards[state.kbdSelectedIndex >= 0 && state.kbdSelectedIndex < cards.length ? state.kbdSelectedIndex : 0];
        if (card) {
          if (card.getAttribute('data-kbd-type') === 'tool') {
            openToolModal(card.getAttribute('data-open-tool'));
          } else {
            const bmId = card.getAttribute('data-bm-id');
            const bm = state.bookmarks.find(b => b.id === bmId);
            const url = bm ? bm.url : card.getAttribute('data-kbd-url');
            if (url) openBookmarkUrl(bmId, url, e.ctrlKey || e.metaKey);
          }
          return;
        }
      }
      state.searchQuery = val;
      renderMainContent(false);
    } else {
      if (!val) { showToast('💡 请先输入搜索关键词'); return; }
      const cfg = SEARCH_ENGINES[state.currentEngine];
      if (cfg && cfg.url) window.open(cfg.url + encodeURIComponent(val), '_blank', 'noopener,noreferrer');
    }
  }

  function clearSearch() {
    clearSearchQuiet();
    renderSpaceDock();
    renderMainContent(false, { preserveScroll: false });
  }

  return {
    setSearchEngine,
    applySearchQueryNow,
    handleSearchInput,
    handleSearchKeydown,
    handleSearchSubmit,
    clearSearch
  };
}
