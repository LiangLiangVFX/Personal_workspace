/* ==========================================================================
   个人效率工作台 OS — Manifest V3 后台服务引擎 (v11.2 · ES Module)
   功能：单实例启动 · 右键/Alt+S 收藏(并发串行保护) · 地址栏 ws 拼音直搜 ·
         Gist 双文件分离同步 + Alarms 休眠补推 · 后台真实状态码四级死链体检
   ========================================================================== */

import {
  KEYS,
  GIST_FILENAME,
  DEFAULT_WEATHER_CITY,
  MAX_SYNC_ICON_LENGTH
} from './js/shared/constants.js';
import {
  generateId,
  canonicalUrlKey,
  isPrivateHostOrUrl,
  escapeXml
} from './js/shared/url-utils.js';
import { getPinyinInitials } from './js/shared/pinyin.js';
import {
  fetchWithTimeout,
  buildGhHeaders,
  buildGistFilesPayload,
  pruneTombstones
} from './js/shared/net.js';

const SYNC_RETRY_ALARM = 'ws_sync_retry';
const SYNC_LOCK_KEY = 'ws_bg_sync_lock';
const SYNC_LOCK_TTL_MS = 45000;
const RETRY_DELAYS_MIN = [1, 3, 10, 20, 30];

let bgSyncing = false;
let bgPendingPush = false;
let bgForceNext = false;
let omniboxSearchSeq = 0;
let storageWriteQueue = Promise.resolve();

function enqueueStorageMutation(task) {
  const next = storageWriteQueue.then(task, task);
  storageWriteQueue = next.catch(() => {});
  return next;
}

async function acquireSessionLock() {
  if (bgSyncing) return false;
  if (chrome.storage?.session) {
    try {
      const data = await chrome.storage.session.get([SYNC_LOCK_KEY]);
      const lockAt = data?.[SYNC_LOCK_KEY] || 0;
      if (lockAt && Date.now() - lockAt < SYNC_LOCK_TTL_MS) return false;
      await chrome.storage.session.set({ [SYNC_LOCK_KEY]: Date.now() });
    } catch {}
  }
  bgSyncing = true;
  return true;
}

async function releaseSessionLock() {
  bgSyncing = false;
  if (chrome.storage?.session) {
    try { await chrome.storage.session.remove([SYNC_LOCK_KEY]); } catch {}
  }
}

async function markSyncMeta(patch) {
  const saved = await chrome.storage.local.get([KEYS.syncMeta]);
  const prev = (saved[KEYS.syncMeta] && typeof saved[KEYS.syncMeta] === 'object') ? saved[KEYS.syncMeta] : {};
  const next = { dirty: false, dirtyAt: 0, retryCount: 0, lastError: '', ...prev, ...patch };
  await chrome.storage.local.set({ [KEYS.syncMeta]: next });
  return next;
}

async function scheduleRetryAlarm(retryCount) {
  if (!chrome.alarms) return;
  const idx = Math.min(Math.max(0, retryCount - 1), RETRY_DELAYS_MIN.length - 1);
  await chrome.alarms.create(SYNC_RETRY_ALARM, { delayInMinutes: RETRY_DELAYS_MIN[idx] });
}

async function clearRetryAlarm() {
  if (!chrome.alarms) return;
  try { await chrome.alarms.clear(SYNC_RETRY_ALARM); } catch {}
}

// ==================== 1. 工具栏图标单实例启动 ====================
async function openOrFocusWorkspace(query = '') {
  const baseUrl = chrome.runtime.getURL('index.html');
  const targetUrl = query ? `${baseUrl}?q=${encodeURIComponent(query)}` : baseUrl;
  const existingTabs = await chrome.tabs.query({ url: `${baseUrl}*` });

  if (existingTabs.length > 0) {
    const tab = existingTabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    if (typeof tab.windowId === 'number') {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    if (query) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'APPLY_SEARCH_QUERY', query });
      } catch {
        await chrome.tabs.update(tab.id, { url: targetUrl, active: true });
      }
    }
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
}

chrome.action.onClicked.addListener(() => openOrFocusWorkspace());

// ==================== 2. 任意网页二级右键菜单 & Alt+S 一键收藏 ====================
const QUICK_SAVE_PARENT_ID = 'ws-quick-save-parent';
const QUICK_SAVE_MENUS = [
  { id: 'ws-qs-auto',     title: '⚡ 智能归类（首页可见）', space: 'auto',     pin: false },
  { id: 'ws-qs-pin',      title: '⭐ 收藏并置顶到首页',     space: 'auto',     pin: true  },
  { id: 'ws-qs-ai',       title: '🤖 存入 AI 创作',         space: 'ai',       pin: false },
  { id: 'ws-qs-cg',       title: '🎮 存入 CG & 3D',         space: 'cg',       pin: false },
  { id: 'ws-qs-media',    title: '🎬 存入 媒体设计',        space: 'media',    pin: false },
  { id: 'ws-qs-software', title: '📦 存入 软件运维',        space: 'software', pin: false }
];

const DEFAULT_GROUP_BY_SPACE = {
  ai: '🧠 对话与搜索',
  cg: '🎮 UE5 与实时特效',
  media: '🔥 社区与工作台',
  software: '💻 绿色软件与脚本'
};

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: QUICK_SAVE_PARENT_ID,
      title: '⚡ 收藏到效率工作台',
      contexts: ['page', 'link']
    }, () => void chrome.runtime.lastError);
    QUICK_SAVE_MENUS.forEach(item => {
      chrome.contextMenus.create({
        id: item.id,
        parentId: QUICK_SAVE_PARENT_ID,
        title: item.title,
        contexts: ['page', 'link']
      }, () => void chrome.runtime.lastError);
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
});

chrome.runtime.onStartup.addListener(async () => {
  registerContextMenus();
  const saved = await chrome.storage.local.get([KEYS.syncMeta, KEYS.ghSync]);
  if (saved[KEYS.syncMeta]?.dirty && saved[KEYS.ghSync]?.token && saved[KEYS.ghSync]?.autoSync !== false) {
    triggerBackgroundPush(false);
  }
});

chrome.alarms?.onAlarm.addListener(alarm => {
  if (alarm?.name === SYNC_RETRY_ALARM) {
    triggerBackgroundPush(false);
  }
});

const AUTO_CLASSIFY_RULES = [
  {
    match: /(openai|chatgpt|gemini|claude|deepseek|kimi|perplexity|civitai|liblib|comfyui|huggingface|flux|pixverse|heygen|fish\.audio|siliconflow|coze|ai\b)/i,
    space: 'ai',
    subRules: [
      { match: /(civitai|liblib|comfyui|flux|krea|openart|prompt|stability|upscal)/i, group: '🎨 绘画与 ComfyUI' },
      { match: /(video|pixverse|heygen|domoai|audio|podcast|tts|swapface)/i, group: '🎬 视频与音频' }
    ],
    defaultGroup: '🧠 对话与搜索'
  },
  {
    match: /(unreal|ue5|fab\.com|artstation|cgtrader|sketchfab|kitbash|daz3d|polyhaven|ambientcg|hdri|pbr|cgpersia|vfx|blender|houdini|3d)/i,
    space: 'cg',
    subRules: [
      { match: /(polyhaven|ambientcg|texture|hdri|pbr)/i, group: '🌍 PBR 材质与 HDRI' },
      { match: /(unreal|ue5|fab\.com|vfx|niagara|magesbox)/i, group: '🎮 UE5 与实时特效' }
    ],
    defaultGroup: '🧊 3D 模型与扫描'
  },
  {
    match: /(github\.com|vercel|cloudflare|namesilo|qiniu|dogecloud|wordpress|clash|vpn|ghxi|repack|download)/i,
    space: 'software',
    subRules: [
      { match: /(vercel|cloudflare|namesilo|qiniu|dogecloud|pagespeed|wordpress)/i, group: '🌐 建站与云服务' }
    ],
    defaultGroup: '💻 绿色软件与脚本'
  }
];

export function inferSpaceAndGroup(url, title) {
  const str = `${url} ${title}`.toLowerCase();
  for (const rule of AUTO_CLASSIFY_RULES) {
    if (!rule.match.test(str)) continue;
    const matchedSub = rule.subRules?.find(sub => sub.match.test(str));
    return { space: rule.space, group: matchedSub ? matchedSub.group : rule.defaultGroup };
  }
  return { space: 'media', group: '🔥 社区与工作台' };
}

function flashBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2200);
}

async function enrichSavedBookmarkMetadata(bmId, rawUrl, fallbackDesc, isRawUrlTitle) {
  try {
    if (isPrivateHostOrUrl(rawUrl)) return;

    const res = await fetchWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(rawUrl)}`, { cache: 'no-store' }, 6500);
    if (!res.ok) return;
    const json = await res.json();
    if (!json || json.status !== 'success' || !json.data) return;

    const fetchedTitle = (json.data.title || '').trim();
    const fetchedDesc = (json.data.description || '').trim();
    if (!fetchedDesc && (!isRawUrlTitle || !fetchedTitle)) return;

    await enqueueStorageMutation(async () => {
      const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.pendingSaves]);

      const patchList = list => {
        if (!Array.isArray(list)) return false;
        const item = list.find(b => b.id === bmId);
        if (!item) return false;
        let changed = false;
        if (fetchedDesc && item.desc === fallbackDesc) {
          item.desc = fetchedDesc.length > 92 ? fetchedDesc.slice(0, 92) + '...' : fetchedDesc;
          changed = true;
        }
        if (isRawUrlTitle && fetchedTitle) {
          item.title = fetchedTitle.length > 44 ? fetchedTitle.slice(0, 44) : fetchedTitle;
          changed = true;
        }
        if (changed) item.updatedAt = Date.now();
        return changed;
      };

      if (patchList(saved[KEYS.bookmarks])) {
        await chrome.storage.local.set({
          [KEYS.bookmarks]: saved[KEYS.bookmarks],
          [KEYS.updatedAt]: Date.now()
        });
        triggerBackgroundPush(false);
      } else if (patchList(saved[KEYS.pendingSaves])) {
        await chrome.storage.local.set({ [KEYS.pendingSaves]: saved[KEYS.pendingSaves] });
      }
    });
  } catch {}
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchIconAsDataUrlInBg(url) {
  const res = await fetchWithTimeout(url, { cache: 'no-store' }, 5000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  if (!blob || blob.size < 60) throw new Error('empty');
  const mime = (blob.type || '').toLowerCase();
  if (mime && !mime.startsWith('image/') && !mime.includes('icon') && mime !== 'application/octet-stream') {
    throw new Error('not-image');
  }
  if (mime.includes('svg') && blob.size <= 8192) {
    const svgData = `data:image/svg+xml;base64,${arrayBufferToBase64(await blob.arrayBuffer())}`;
    if (svgData.length <= MAX_SYNC_ICON_LENGTH) return svgData;
  }
  if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function') {
    const bmp = await createImageBitmap(blob);
    try {
      if (bmp.width < 16 || bmp.height < 16) throw new Error('too-small');
      const scale = Math.min(1, 48 / Math.max(bmp.width, bmp.height));
      const w = Math.max(16, Math.round(bmp.width * scale));
      const h = Math.max(16, Math.round(bmp.height * scale));
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      const webpBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.80 });
      const dataUrl = `data:image/webp;base64,${arrayBufferToBase64(await webpBlob.arrayBuffer())}`;
      if (dataUrl.length <= MAX_SYNC_ICON_LENGTH) return dataUrl;
      const smallBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.65 });
      return `data:image/webp;base64,${arrayBufferToBase64(await smallBlob.arrayBuffer())}`;
    } finally {
      bmp.close();
    }
  }
  if (blob.size <= 8192) {
    return `data:${mime || 'image/png'};base64,${arrayBufferToBase64(await blob.arrayBuffer())}`;
  }
  throw new Error('too-large');
}

async function cacheQuickSaveIconBg(bmId, rawUrl, favIconUrl = '') {
  let host = '';
  try { host = new URL(rawUrl).hostname.toLowerCase(); } catch {}
  const isPrivate = isPrivateHostOrUrl(host);

  const orderedTry = [];
  if (favIconUrl && /^https?:\/\//i.test(favIconUrl)) orderedTry.push(favIconUrl);
  orderedTry.push(chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(rawUrl)}&size=64`));
  if (!isPrivate) {
    const ts = Date.now();
    orderedTry.push(
      `https://www.google.com/s2/favicons?domain=${host}&sz=128&_t=${ts}`,
      `https://api.iowen.cn/favicon/${host}.png?_t=${ts}`,
      `https://favicon.im/${host}?larger=true&_t=${ts}`
    );
  }

  let dataUrl = '';
  for (const src of orderedTry) {
    try {
      dataUrl = await fetchIconAsDataUrlInBg(src);
      if (dataUrl) break;
    } catch {}
  }
  if (!dataUrl) return;

  await enqueueStorageMutation(async () => {
    const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.pendingSaves]);
    const patchList = list => {
      if (!Array.isArray(list)) return false;
      const item = list.find(b => b.id === bmId);
      if (!item) return false;
      item.customIcon = dataUrl;
      item.updatedAt = Date.now();
      return true;
    };

    if (patchList(saved[KEYS.bookmarks])) {
      await chrome.storage.local.set({
        [KEYS.bookmarks]: saved[KEYS.bookmarks],
        [KEYS.updatedAt]: Date.now()
      });
      triggerBackgroundPush(false);
    } else if (patchList(saved[KEYS.pendingSaves])) {
      await chrome.storage.local.set({ [KEYS.pendingSaves]: saved[KEYS.pendingSaves] });
    }
  });
}

async function quickSaveUrl(rawUrl, rawTitle = '', favIconUrl = '', opts = {}) {
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    flashBadge('!', '#f43f5e');
    return;
  }

  let host = '';
  try { host = new URL(rawUrl).hostname.replace(/^www\./, ''); } catch {}
  const isRawUrlTitle = !rawTitle || /^https?:\/\//i.test(rawTitle.trim());
  const cleanTitle = (rawTitle || host || '新建书签').trim().slice(0, 48);

  const actionResult = await enqueueStorageMutation(async () => {
    const saved = await chrome.storage.local.get([
      KEYS.bookmarks, KEYS.spaceGroups, KEYS.pendingSaves, KEYS.initialized, KEYS.tombstones
    ]);
    const list = Array.isArray(saved[KEYS.bookmarks]) ? saved[KEYS.bookmarks] : [];
    const groups = (saved[KEYS.spaceGroups] && typeof saved[KEYS.spaceGroups] === 'object') ? saved[KEYS.spaceGroups] : {};
    const tombstones = (saved[KEYS.tombstones] && typeof saved[KEYS.tombstones] === 'object') ? { ...saved[KEYS.tombstones] } : {};
    const isInitialized = !!saved[KEYS.initialized] || list.length > 0;

    let { space, group } = inferSpaceAndGroup(rawUrl, cleanTitle);
    if (opts.space && opts.space !== 'auto' && DEFAULT_GROUP_BY_SPACE[opts.space]) {
      space = opts.space;
      group = (Array.isArray(groups[space]) && groups[space][0]) || DEFAULT_GROUP_BY_SPACE[space];
    }

    const nowTs = Date.now();
    const newKey = canonicalUrlKey(rawUrl);
    if (newKey in tombstones) delete tombstones[newKey];

    const existing = list.find(b => canonicalUrlKey(b.url) === newKey);
    if (existing) {
      existing.quickSavedAt = nowTs;
      existing.updatedAt = nowTs;
      if (opts.pin) existing.pinned = true;
      await chrome.storage.local.set({
        [KEYS.bookmarks]: list,
        [KEYS.tombstones]: tombstones,
        [KEYS.updatedAt]: nowTs,
        [KEYS.lastQuickSave]: { title: existing.title, space: existing.space, group: existing.group, existed: true, savedAt: nowTs }
      });
      return {
        existed: true,
        bmId: existing.id,
        needIconCache: !existing.customIcon || /^https?:\/\//i.test(existing.customIcon)
      };
    }

    const fallbackDesc = `${cleanTitle} (${host || 'Web'}) 快速收藏站点`;
    const newBm = {
      id: generateId('bm'),
      space,
      group,
      title: cleanTitle,
      url: rawUrl,
      desc: fallbackDesc,
      quickSavedAt: nowTs,
      updatedAt: nowTs,
      ...(opts.pin ? { pinned: true } : {}),
      ...(favIconUrl && /^https?:\/\//i.test(favIconUrl) ? { customIcon: favIconUrl } : {})
    };

    if (!isInitialized && list.length === 0) {
      const pending = Array.isArray(saved[KEYS.pendingSaves]) ? saved[KEYS.pendingSaves] : [];
      pending.unshift(newBm);
      await chrome.storage.local.set({
        [KEYS.pendingSaves]: pending,
        [KEYS.tombstones]: tombstones,
        [KEYS.lastQuickSave]: { title: cleanTitle, space, group, existed: false, savedAt: nowTs }
      });
      return { existed: false, pendingOnly: true, bmId: newBm.id, fallbackDesc };
    }

    list.unshift(newBm);
    if (!Array.isArray(groups[space])) groups[space] = [];
    if (!groups[space].includes(group)) groups[space].push(group);

    await chrome.storage.local.set({
      [KEYS.bookmarks]: list,
      [KEYS.spaceGroups]: groups,
      [KEYS.tombstones]: tombstones,
      [KEYS.updatedAt]: nowTs,
      [KEYS.initialized]: true,
      [KEYS.lastQuickSave]: { title: cleanTitle, space, group, existed: false, savedAt: nowTs }
    });
    return { existed: false, pendingOnly: false, bmId: newBm.id, fallbackDesc };
  });

  if (!actionResult) return;

  if (actionResult.existed) {
    flashBadge('已存', '#f59e0b');
    triggerBackgroundPush(false);
    if (actionResult.needIconCache) {
      cacheQuickSaveIconBg(actionResult.bmId, rawUrl, favIconUrl);
    }
    return;
  }

  flashBadge('✓', '#10b981');
  if (!actionResult.pendingOnly) {
    triggerBackgroundPush(false);
  }
  enrichSavedBookmarkMetadata(actionResult.bmId, rawUrl, actionResult.fallbackDesc, isRawUrlTitle);
  cacheQuickSaveIconBg(actionResult.bmId, rawUrl, favIconUrl);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuCfg = QUICK_SAVE_MENUS.find(m => m.id === info.menuItemId);
  if (!menuCfg) return;
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? (info.selectionText || info.linkUrl) : (tab?.title || '');
  const icon = info.linkUrl ? '' : (tab?.favIconUrl || '');
  quickSaveUrl(url, title, icon, { space: menuCfg.space, pin: menuCfg.pin });
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'quick-save-tab') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) quickSaveUrl(tab.url, tab.title || '', tab.favIconUrl || '', { space: 'auto', pin: false });
});

// ==================== 3. 地址栏 ws 直搜书签 ====================
chrome.omnibox.setDefaultSuggestion({
  description: '⚡ 在个人效率工作台中搜索书签（支持拼音首字母与多词空格组合）: <match>%s</match>'
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const reqSeq = ++omniboxSearchSeq;
  const rawQ = (text || '').trim().toLowerCase();
  const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];
  const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.recentVisits]);
  if (reqSeq !== omniboxSearchSeq) return;
  const bms = Array.isArray(saved[KEYS.bookmarks]) ? saved[KEYS.bookmarks] : [];
  const visits = Array.isArray(saved[KEYS.recentVisits]) ? saved[KEYS.recentVisits] : [];
  const visitCountMap = new Map(visits.map(v => [v.id, v.count || 1]));

  const scored = bms
    .map(b => {
      const title = (b.title || '').toLowerCase();
      const desc = (b.desc || '').toLowerCase();
      const url = (b.url || '').toLowerCase();
      const group = (b.group || '').toLowerCase();
      const titlePy = getPinyinInitials(b.title || '');
      const descPy = getPinyinInitials(b.desc || '');
      const groupPy = getPinyinInitials(b.group || '');

      let score = 0;
      if (tokens.length === 0) {
        score = (b.pinned ? 50 : 0) + (visitCountMap.get(b.id) || 0) * 5;
      } else {
        for (const tk of tokens) {
          let tkScore = 0;
          if (title === tk) tkScore += 200;
          else if (title.startsWith(tk)) tkScore += 140;
          else if (title.includes(tk)) tkScore += 100;
          else if (titlePy.includes(tk)) tkScore += 85;

          if (url.includes(tk)) tkScore += 65;
          if (desc.includes(tk) || group.includes(tk)) tkScore += 35;
          else if (descPy.includes(tk) || groupPy.includes(tk)) tkScore += 25;

          if (tkScore === 0) return null;
          score += tkScore;
        }
        score += Math.min(50, (visitCountMap.get(b.id) || 0) * 5) + (b.pinned ? 15 : 0);
      }
      return score > 0 ? { b, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const seenUrls = new Set();
  const suggestions = [];
  for (const { b } of scored) {
    if (!b.url || seenUrls.has(b.url)) continue;
    seenUrls.add(b.url);
    suggestions.push({
      content: b.url,
      description: `${escapeXml(b.title)} <dim>- ${escapeXml((b.desc || b.url).slice(0, 60))}</dim>`
    });
    if (suggestions.length >= 8) break;
  }
  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const val = (text || '').trim();
  if (/^https?:\/\//i.test(val)) {
    if (disposition === 'currentTab') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.update(tab.id, { url: val });
      else await chrome.tabs.create({ url: val });
    } else if (disposition === 'newBackgroundTab') {
      await chrome.tabs.create({ url: val, active: false });
    } else {
      await chrome.tabs.create({ url: val, active: true });
    }
  } else {
    await openOrFocusWorkspace(val);
  }
});

// ==================== 4. 后台真实 HTTP 状态码四级死链体检引擎 ====================
export async function probeLinkStatus(url, parentSignal) {
  if (!url || isPrivateHostOrUrl(url)) {
    return { level: 'skipped', status: 0, reason: '内网跳过', ms: 0 };
  }

  const doProbe = async (method, timeoutMs) => {
    const tCtrl = new AbortController();
    const timer = setTimeout(() => tCtrl.abort(), timeoutMs);
    const onAbort = () => tCtrl.abort();
    parentSignal?.addEventListener('abort', onAbort, { once: true });
    const startMs = Date.now();
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        cache: 'no-store',
        signal: tCtrl.signal
      });
      const elapsed = Date.now() - startMs;
      if (method === 'GET') {
        try { await res.body?.cancel(); } catch {}
      }
      return { ok: true, status: res.status, ms: elapsed };
    } catch (err) {
      return { ok: false, error: err?.name === 'AbortError' ? '请求超时' : '连接失败', ms: Date.now() - startMs };
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onAbort);
    }
  };

  let res = await doProbe('HEAD', 6000);
  if (parentSignal?.aborted) return { level: 'aborted', status: 0, reason: '已停止', ms: res.ms };

  if (res.ok && [400, 403, 405, 501].includes(res.status)) {
    const getRes = await doProbe('GET', 6500);
    if (parentSignal?.aborted) return { level: 'aborted', status: 0, reason: '已停止', ms: getRes.ms };
    res = getRes;
  } else if (!res.ok && res.error !== '请求超时') {
    const getRes = await doProbe('GET', 6000);
    if (parentSignal?.aborted) return { level: 'aborted', status: 0, reason: '已停止', ms: getRes.ms };
    if (getRes.ok) res = getRes;
  }

  if (!res.ok) {
    return { level: 'dead', status: 0, reason: res.error || '无法连通', ms: res.ms };
  }

  const st = res.status;
  if (st >= 200 && st < 400) {
    if (res.ms >= 3000) return { level: 'slow', status: st, reason: `HTTP ${st}`, ms: res.ms };
    return { level: 'ok', status: st, reason: `HTTP ${st}`, ms: res.ms };
  }
  if ([401, 403, 429, 503].includes(st)) {
    return { level: 'verify', status: st, reason: `HTTP ${st} 拦截`, ms: res.ms };
  }
  return { level: 'dead', status: st, reason: `HTTP ${st}`, ms: res.ms };
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'ws-link-check') return;
  let controller = null;
  let disconnected = false;

  const safePost = msg => {
    if (disconnected) return;
    try { port.postMessage(msg); } catch { disconnected = true; }
  };

  port.onDisconnect.addListener(() => {
    disconnected = true;
    controller?.abort();
  });

  port.onMessage.addListener(async msg => {
    if (msg?.type === 'ABORT') {
      controller?.abort();
      return;
    }
    if (msg?.type !== 'START' || !Array.isArray(msg.bookmarks)) return;

    controller?.abort();
    controller = new AbortController();
    const myCtrl = controller;
    const queue = [...msg.bookmarks];
    const total = queue.length;
    let checked = 0;

    const runWorker = async () => {
      while (queue.length > 0 && !myCtrl.signal.aborted && !disconnected) {
        const bm = queue.shift();
        if (!bm) continue;
        const result = await probeLinkStatus(bm.url, myCtrl.signal);
        if (myCtrl.signal.aborted || disconnected) break;
        checked++;
        safePost({ type: 'ITEM', bm, result, checked, total });
      }
    };

    await Promise.all(Array.from({ length: 6 }, runWorker));
    if (!myCtrl.signal.aborted && !disconnected) {
      safePost({ type: 'DONE', checked, total });
    }
  });
});

// ==================== 5. GitHub 私有 Gist 后台可靠推送（双文件分离 + Alarms 补推） ====================
export async function executeBackgroundPush(force = false) {
  const allKeys = [
    KEYS.bookmarks, KEYS.spaceGroups, KEYS.todos, KEYS.memo, KEYS.updatedAt, KEYS.ghSync,
    KEYS.theme, KEYS.accent, KEYS.rightPanel, KEYS.city, KEYS.collapsed, KEYS.customLogo,
    KEYS.tombstones
  ];
  const saved = await chrome.storage.local.get(allKeys);
  const cfg = saved[KEYS.ghSync];
  if (!cfg || !cfg.token) return { ok: false, error: '未配置 GitHub Token' };
  if (!force && cfg.autoSync === false) return { ok: false, skipped: true };

  const rawBms = Array.isArray(saved[KEYS.bookmarks]) ? saved[KEYS.bookmarks] : [];
  if (rawBms.length === 0) return { ok: false, error: '本地书签为空，跳过推送' };

  const headers = buildGhHeaders(cfg.token);

  if (!force && cfg.gistId) {
    try {
      const checkRes = await fetchWithTimeout(
        `https://api.github.com/gists/${encodeURIComponent(cfg.gistId)}`,
        { headers, cache: 'no-store' },
        9000
      );
      if (checkRes.ok) {
        const remoteJson = await checkRes.json();
        const fileObj = remoteJson.files?.[GIST_FILENAME] || Object.values(remoteJson.files || {}).find(f => f.filename?.endsWith('.json'));
        if (fileObj) {
          let content = fileObj.content || '';
          if (fileObj.truncated && fileObj.raw_url) {
            const rawRes = await fetchWithTimeout(fileObj.raw_url, { cache: 'no-store' }, 9000);
            content = await rawRes.text();
          }
          const remoteData = JSON.parse(content);
          const remoteUpdatedAt = typeof remoteData.updatedAt === 'number' ? remoteData.updatedAt : 0;
          const lastKnownRemote = typeof cfg.lastRemoteUpdatedAt === 'number' ? cfg.lastRemoteUpdatedAt : 0;
          const remoteHasBookmarks = Array.isArray(remoteData.bookmarks) && remoteData.bookmarks.length > 0;
          const localUpdatedAt = typeof saved[KEYS.updatedAt] === 'number' ? saved[KEYS.updatedAt] : 0;

          const hasRemoteUpdate = lastKnownRemote > 0 && remoteUpdatedAt > lastKnownRemote;
          const isUnlinkedGistWithData = lastKnownRemote === 0 && remoteHasBookmarks && (!cfg.lastSyncAt || remoteUpdatedAt > localUpdatedAt);

          if (hasRemoteUpdate || isUnlinkedGistWithData) {
            await chrome.storage.local.set({
              [KEYS.syncConflict]: {
                detectedAt: Date.now(),
                remoteUpdatedAt,
                localUpdatedAt: localUpdatedAt || Date.now()
              }
            });
            await markSyncMeta({ dirty: false, retryCount: 0, lastError: '' });
            await clearRetryAlarm();
            return { ok: false, conflict: true, remoteUpdatedAt };
          }
        }
      }
    } catch {}
  }

  const nowTs = Math.max(Date.now(), typeof saved[KEYS.updatedAt] === 'number' ? saved[KEYS.updatedAt] : 0);
  const tombstones = pruneTombstones(saved[KEYS.tombstones], nowTs);
  const files = buildGistFilesPayload({
    rawBms,
    spaceGroups: saved[KEYS.spaceGroups] || {},
    todos: saved[KEYS.todos],
    memo: saved[KEYS.memo],
    tombstones,
    nowTs,
    settings: {
      theme: saved[KEYS.theme] || 'dark',
      accent: saved[KEYS.accent] || 'indigo',
      rightPanel: saved[KEYS.rightPanel] || 'expanded',
      city: saved[KEYS.city] || DEFAULT_WEATHER_CITY,
      collapsed: saved[KEYS.collapsed] || {},
      customLogo: saved[KEYS.customLogo] || ''
    }
  });

  const isCreate = !cfg.gistId;
  const endpoint = isCreate
    ? 'https://api.github.com/gists'
    : `https://api.github.com/gists/${encodeURIComponent(cfg.gistId)}`;

  const body = {
    description: 'Personal Workspace OS - Private Sync Data (v11.2)',
    files
  };
  if (isCreate) body.public = false;

  const res = await fetchWithTimeout(endpoint, {
    method: isCreate ? 'POST' : 'PATCH',
    headers,
    body: JSON.stringify(body)
  }, 12000);

  if (!res.ok) {
    if (res.status === 401) throw Object.assign(new Error('Token 无效或已过期'), { fatal: true });
    if (res.status === 404) throw Object.assign(new Error('Gist ID 不存在或无权限'), { fatal: true });
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  const latestSaved = await chrome.storage.local.get([KEYS.ghSync]);
  const latestCfg = (latestSaved[KEYS.ghSync] && typeof latestSaved[KEYS.ghSync] === 'object') ? latestSaved[KEYS.ghSync] : cfg;
  const nextCfg = {
    ...latestCfg,
    gistId: isCreate && json.id ? json.id : (latestCfg.gistId || cfg.gistId),
    lastSyncAt: Date.now(),
    lastRemoteUpdatedAt: nowTs
  };

  await chrome.storage.local.set({
    [KEYS.ghSync]: nextCfg,
    [KEYS.updatedAt]: nowTs,
    [KEYS.tombstones]: tombstones,
    [KEYS.syncConflict]: null
  });
  await markSyncMeta({ dirty: false, dirtyAt: 0, retryCount: 0, lastError: '' });
  await clearRetryAlarm();

  return { ok: true, isCreate, gistId: nextCfg.gistId, updatedAt: nowTs };
}

export async function triggerBackgroundPush(force = false) {
  await markSyncMeta({ dirty: true, dirtyAt: Date.now() });

  if (!(await acquireSessionLock())) {
    bgPendingPush = true;
    if (force) bgForceNext = true;
    return { ok: true, queued: true };
  }

  let lastResult = { ok: false };
  let currentForce = force;

  try {
    do {
      bgPendingPush = false;
      bgForceNext = false;
      lastResult = await executeBackgroundPush(currentForce);
      currentForce = bgForceNext;
    } while (bgPendingPush && !lastResult.conflict);
  } catch (err) {
    const errMsg = err?.message || '请检查网络';
    lastResult = { ok: false, error: errMsg };
    if (!err?.fatal) {
      const saved = await chrome.storage.local.get([KEYS.syncMeta]);
      const retryCount = (saved[KEYS.syncMeta]?.retryCount || 0) + 1;
      await markSyncMeta({ dirty: retryCount <= 5, retryCount, lastError: errMsg });
      if (retryCount <= 5) await scheduleRetryAlarm(retryCount);
    } else {
      await markSyncMeta({ dirty: false, lastError: errMsg });
      await clearRetryAlarm();
    }
  } finally {
    await releaseSessionLock();
  }

  return lastResult;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SYNC_PUSH') {
    triggerBackgroundPush(!!msg.force).then(sendResponse);
    return true;
  }
});
