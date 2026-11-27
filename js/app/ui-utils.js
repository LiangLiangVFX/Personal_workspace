/* ==========================================================================
   Toast 通知、品牌 Logo、主题色与右侧面板折叠控制
   ========================================================================== */

import { FALLBACK_FAVICON_SVG, KEYS } from '../shared/constants.js';
import { escapeHtml, sanitizeImageSrc } from '../shared/url-utils.js';
import { state } from './state.js';
import { markLocalChangeAndSync, writeStoreInternal } from './storage.js';

const LOGO_CANDIDATES = ['logo.png', 'logo.svg', 'logo.webp', 'logo.jpg'];
let logoCandidateIdx = 0;

export function showToast(msg, opts = {}) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  while (container.children.length >= 3) container.firstElementChild.remove();
  const item = document.createElement('div');
  item.className = 'toast-animate specular-card px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xl border border-indigo-500/30 flex items-center justify-between gap-3 pointer-events-auto';
  const actionBtn = opts.label
    ? `<button type="button" data-toast-undo="1" class="px-2 py-0.5 rounded-lg theme-solid-bg text-white text-[11px] font-bold hover:opacity-90 transition shrink-0">${escapeHtml(opts.label)}</button>`
    : '';
  item.innerHTML = `<span>${escapeHtml(msg)}</span><div class="flex items-center gap-1.5 shrink-0">${actionBtn}<button type="button" data-toast-close="1" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs leading-none px-1">✕</button></div>`;
  container.appendChild(item);
  const delay = opts.duration || 2400;
  setTimeout(() => {
    if (!item.isConnected) return;
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px)';
    item.style.transition = 'all 0.25s ease';
    setTimeout(() => { if (item.isConnected) item.remove(); }, 250);
  }, delay);
}

export function initBrandLogo(savedBase64) {
  const img = document.getElementById('brandLogoImg');
  const fb = document.getElementById('brandLogoFallback');
  const fav = document.getElementById('pageFavicon');
  if (!img) return;

  img.addEventListener('load', () => {
    img.classList.remove('hidden');
    if (fb) fb.classList.add('hidden');
  });
  img.addEventListener('error', () => {
    logoCandidateIdx++;
    if (logoCandidateIdx < LOGO_CANDIDATES.length) {
      img.src = LOGO_CANDIDATES[logoCandidateIdx];
    } else {
      img.classList.add('hidden');
      if (fb) fb.classList.remove('hidden');
      if (fav) fav.href = FALLBACK_FAVICON_SVG;
    }
  });

  const safe = sanitizeImageSrc(savedBase64);
  if (safe) {
    img.src = safe;
    if (fav) fav.href = safe;
  } else if (img.complete && img.naturalWidth > 0) {
    img.classList.remove('hidden');
    if (fb) fb.classList.add('hidden');
  }
}

export function handleBrandLogoUpload(file) {
  if (!file) return;
  if (file.size > 1024 * 1024 * 2) {
    showToast('⚠️ 图标文件请控制在 2MB 以内');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const base64 = sanitizeImageSrc(ev.target.result);
    if (!base64) {
      showToast('❌ 仅支持有效图片文件');
      return;
    }
    writeStoreInternal({ [KEYS.customLogo]: base64 });
    const img = document.getElementById('brandLogoImg');
    const fav = document.getElementById('pageFavicon');
    if (img) img.src = base64;
    if (fav) fav.href = base64;
    markLocalChangeAndSync();
    showToast('🎉 左上角品牌图标已更换并同步保存');
  };
  reader.readAsDataURL(file);
}

export function applyThemeUI(mode) {
  const htmlEl = document.documentElement;
  const btn = document.getElementById('themeBtn');
  if (mode === 'light') {
    htmlEl.classList.remove('dark');
    if (btn) btn.textContent = '🌙';
  } else {
    htmlEl.classList.add('dark');
    if (btn) btn.textContent = '☀️';
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  const mode = isDark ? 'dark' : 'light';
  writeStoreInternal({ [KEYS.theme]: mode });
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  markLocalChangeAndSync();
  showToast(isDark ? '🌙 已切换至深邃极光暗色模式' : '☀️ 已切换至通透浅色模式');
}

export function closeAccentPopover() {
  document.getElementById('accentColorPopover')?.classList.add('hidden');
}

export function closeRecentPopover() {
  document.getElementById('recentVisitsPopover')?.classList.add('hidden');
}

export function closeCardContextMenu() {
  state.contextMenuBmId = null;
  document.getElementById('cardContextMenu')?.classList.add('hidden');
}

export function setAccentColor(colorName, notify = true, skipSync = false) {
  document.body.setAttribute('data-accent', colorName);
  writeStoreInternal({ [KEYS.accent]: colorName });
  document.querySelectorAll('.accent-dot').forEach(dot => {
    const active = dot.getAttribute('data-color') === colorName;
    dot.classList.toggle('ring-2', active);
    dot.classList.toggle('scale-110', active);
  });
  closeAccentPopover();
  if (!skipSync) markLocalChangeAndSync();
  const names = { indigo: '极光靛蓝', violet: '赛博紫罗兰', cyan: '深海青碧', emerald: '翡翠森绿', rose: '落日绯红' };
  if (notify) showToast(`🎨 主题强调色已切换为：${names[colorName] || colorName}`);
}

export function toggleAccentPopover(e) {
  if (e) e.stopPropagation();
  closeRecentPopover();
  closeCardContextMenu();
  document.getElementById('accentColorPopover')?.classList.toggle('hidden');
}

export function applyRightPanelUI() {
  const panel = document.getElementById('rightTelemetryPanel');
  const btn = document.getElementById('toggleRightPanelBtn');
  if (panel) panel.classList.toggle('hidden', state.isRightPanelCollapsed);
  if (btn) {
    btn.classList.toggle('theme-badge', !state.isRightPanelCollapsed);
    btn.title = state.isRightPanelCollapsed ? '展开右侧状态仪表盘' : '收起右侧状态仪表盘';
  }
}

let activeDialogSession = null;
let dialogEventsBound = false;

function finishActiveDialog(value) {
  if (!activeDialogSession) return;
  const { resolve, cancelledValue } = activeDialogSession;
  activeDialogSession = null;
  document.getElementById('dialogModal')?.classList.add('hidden');
  resolve(value === undefined ? cancelledValue : value);
}

function ensureDialogModalBound() {
  if (dialogEventsBound) return;
  const modal = document.getElementById('dialogModal');
  if (!modal) return;
  dialogEventsBound = true;

  modal.addEventListener('click', e => {
    if (e.target.id === 'dialogModal') finishActiveDialog();
  });
  document.getElementById('closeDialogModalBtn')?.addEventListener('click', () => finishActiveDialog());
  document.getElementById('cancelDialogModalBtn')?.addEventListener('click', () => finishActiveDialog());
  document.getElementById('dialogModalForm')?.addEventListener('submit', e => {
    e.preventDefault();
    if (!activeDialogSession) return;
    if (activeDialogSession.mode === 'prompt') {
      const val = document.getElementById('dialogModalInput')?.value ?? '';
      finishActiveDialog(val);
    } else {
      finishActiveDialog(true);
    }
  });
}

export function closeActiveDialogModal() {
  finishActiveDialog();
}

function showInteractiveDialog({ mode, title, message, placeholder = '', defaultValue = '', confirmText = '确定', cancelText = '取消', danger = false }) {
  ensureDialogModalBound();
  const modal = document.getElementById('dialogModal');
  if (!modal) {
    return Promise.resolve(mode === 'prompt' ? null : false);
  }
  if (activeDialogSession) finishActiveDialog();

  const titleEl = document.getElementById('dialogModalTitle');
  const msgEl = document.getElementById('dialogModalMessage');
  const inputEl = document.getElementById('dialogModalInput');
  const cancelBtn = document.getElementById('cancelDialogModalBtn');
  const confirmBtn = document.getElementById('confirmDialogModalBtn');

  if (titleEl) titleEl.textContent = title || (mode === 'prompt' ? '请输入' : '确认操作');
  if (msgEl) {
    msgEl.textContent = message || '';
    msgEl.classList.toggle('hidden', !message);
  }
  if (cancelBtn) cancelBtn.textContent = cancelText;
  if (confirmBtn) {
    confirmBtn.textContent = confirmText;
    confirmBtn.className = danger
      ? 'px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold shadow-sm transition'
      : 'px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold shadow-sm hover:opacity-90 transition';
  }
  if (inputEl) {
    if (mode === 'prompt') {
      inputEl.classList.remove('hidden');
      inputEl.placeholder = placeholder;
      inputEl.value = defaultValue;
    } else {
      inputEl.classList.add('hidden');
      inputEl.value = '';
    }
  }

  return new Promise(resolve => {
    activeDialogSession = {
      mode,
      resolve,
      cancelledValue: mode === 'prompt' ? null : false
    };
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (!activeDialogSession) return;
      if (mode === 'prompt' && inputEl) {
        inputEl.focus();
        inputEl.select();
      } else {
        confirmBtn?.focus();
      }
    }, 30);
  });
}

export function openConfirmDialog({ title = '确认操作', message = '', confirmText = '确定', cancelText = '取消', danger = false } = {}) {
  return showInteractiveDialog({ mode: 'confirm', title, message, confirmText, cancelText, danger });
}

export function openPromptDialog({ title = '输入信息', message = '', placeholder = '', defaultValue = '', confirmText = '确定', cancelText = '取消' } = {}) {
  return showInteractiveDialog({ mode: 'prompt', title, message, placeholder, defaultValue, confirmText, cancelText });
}
