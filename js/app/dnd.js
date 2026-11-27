/* ==========================================================================
   管理模式与拖拽排序、跨空间/分组移动引擎
   ========================================================================== */

import { state } from './state.js';
import { getGroupsForSpace, saveCoreState } from './storage.js';
import { renderWorkspaceViews } from './render.js';
import { showToast } from './ui-utils.js';

export function clearAllDragClasses() {
  document.querySelectorAll('.dragging-card, .drag-over-card, .nav-drop-target, .section-drop-target, .group-dragging').forEach(el => {
    el.classList.remove('dragging-card', 'drag-over-card', 'nav-drop-target', 'section-drop-target', 'group-dragging');
  });
}

export function finishDragUpdate(toastMsg) {
  state.draggedBookmarkId = null;
  state.draggedGroupInfo = null;
  clearAllDragClasses();
  saveCoreState();
  renderWorkspaceViews({ preserveScroll: true });
  if (toastMsg) showToast(toastMsg);
}

export function moveBookmarkTo(bmId, targetSpace, targetGroup) {
  const bm = state.bookmarks.find(b => b.id === bmId);
  if (!bm) return;
  if (bm.space === targetSpace && bm.group === targetGroup) return;
  bm.space = targetSpace;
  bm.group = targetGroup;
  bm.updatedAt = Date.now();
  if (!state.spaceGroups[targetSpace]) state.spaceGroups[targetSpace] = [];
  if (!state.spaceGroups[targetSpace].includes(targetGroup)) state.spaceGroups[targetSpace].push(targetGroup);
  finishDragUpdate(`📂 已将「${bm.title}」移至「${targetGroup}」`);
}

export function toggleEditMode() {
  state.isEditMode = !state.isEditMode;
  const textEl = document.getElementById('editModeText');
  const btnEl = document.getElementById('editModeBtn');
  const bannerEl = document.getElementById('editModeBanner');
  const logoOverlay = document.getElementById('brandLogoEditOverlay');

  if (textEl) textEl.textContent = state.isEditMode ? '退出管理' : '管理模式';
  if (btnEl) {
    btnEl.className = state.isEditMode
      ? 'px-2.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm shadow-amber-500/30'
      : 'px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all border border-slate-200/70 dark:border-slate-700/70';
  }
  if (bannerEl) bannerEl.classList.toggle('hidden', !state.isEditMode);
  if (logoOverlay) logoOverlay.classList.toggle('hidden', !state.isEditMode);

  renderWorkspaceViews({ preserveScroll: true });
  showToast(state.isEditMode ? '⚙️ 已开启管理模式：支持拖拽排序、左栏分组调序或跨空间移动' : '✅ 已退出管理模式，所有变更已自动保存');
}

export function bindNavDropDelegation(container) {
  if (!container) return;
  container.addEventListener('dragover', e => {
    if (!state.isEditMode || (!state.draggedBookmarkId && !state.draggedGroupInfo)) return;
    if (e.target.closest('[data-drop-type]')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  });
  container.addEventListener('dragenter', e => {
    if (!state.isEditMode || (!state.draggedBookmarkId && !state.draggedGroupInfo)) return;
    const target = e.target.closest('[data-drop-type]');
    if (target) target.classList.add('nav-drop-target');
  });
  container.addEventListener('dragleave', e => {
    const target = e.target.closest('[data-drop-type]');
    if (target && !target.contains(e.relatedTarget)) target.classList.remove('nav-drop-target');
  });
  container.addEventListener('drop', e => {
    if (!state.isEditMode) return;
    const target = e.target.closest('[data-drop-type]');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    target.classList.remove('nav-drop-target');
    const type = target.getAttribute('data-drop-type');

    if (type === 'group') {
      const sp = target.getAttribute('data-drop-space');
      const gr = target.getAttribute('data-drop-group');
      if (state.draggedGroupInfo && state.draggedGroupInfo.spaceId === sp) {
        const srcName = state.draggedGroupInfo.groupName;
        if (srcName === gr) return;
        const list = getGroupsForSpace(sp);
        const fromIdx = list.indexOf(srcName);
        const toIdx = list.indexOf(gr);
        if (fromIdx === -1 || toIdx === -1) return;
        list.splice(fromIdx, 1);
        list.splice(toIdx, 0, srcName);
        state.spaceGroups[sp] = list;
        finishDragUpdate(`↕️ 已调整分组「${srcName}」的显示顺序`);
      } else if (state.draggedBookmarkId) {
        moveBookmarkTo(state.draggedBookmarkId, sp, gr);
      }
    } else if (type === 'space' && state.draggedBookmarkId) {
      const sp = target.getAttribute('data-drop-space');
      const groups = getGroupsForSpace(sp);
      moveBookmarkTo(state.draggedBookmarkId, sp, groups[0] || '📁 默认分组');
    } else if (type === 'pin' && state.draggedBookmarkId) {
      const bm = state.bookmarks.find(b => b.id === state.draggedBookmarkId);
      if (bm) {
        bm.pinned = true;
        bm.updatedAt = Date.now();
        finishDragUpdate(`⭐ 已将「${bm.title}」置顶到首页聚焦`);
      }
    }
  });
}
