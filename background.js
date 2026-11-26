/* ==========================================================================
   个人效率工作台 OS — Manifest V3 后台服务引擎 (v11.1)
   功能：单实例启动 · 右键/Alt+S 收藏(异步抓真实简介) · 地址栏 ws 拼音/多词直搜 ·
         GitHub Gist 后台防漏传队列与冲突检测
   ========================================================================== */

const KEYS = {
  bookmarks: 'ws_v10_bookmarks',
  spaceGroups: 'ws_v10_space_groups',
  collapsed: 'ws_v10_collapsed_groups',
  customLogo: 'ws_v10_custom_logo',
  recentVisits: 'ws_v10_recent_visits',
  memo: 'ws_v10_quick_memo',
  todos: 'ws_v10_quick_todos',
  theme: 'ws_v10_theme',
  accent: 'ws_v10_accent',
  rightPanel: 'ws_v10_right_panel',
  city: 'ws_v10_weather_city_v2',
  ghSync: 'ws_v10_gh_sync',
  updatedAt: 'ws_v10_updated_at',
  pendingSaves: 'ws_v11_pending_saves',
  syncConflict: 'ws_v11_sync_conflict'
};

const GIST_FILENAME = 'personal_workspace_sync.json';
const QUICK_SAVE_MENU_ID = 'ws-quick-save-page';

let bgSyncing = false;
let bgPendingPush = false;
let bgForceNext = false;

// ==================== 0. 轻量级拼音首字母引擎（供地址栏 ws 直搜使用） ====================
const PY_BOUNDARIES = [
  ['a', '阿'], ['b', '芭'], ['c', '擦'], ['d', '搭'], ['e', '蛾'],
  ['f', '发'], ['g', '噶'], ['h', '哈'], ['j', '击'], ['k', '喀'],
  ['l', '垃'], ['m', '妈'], ['n', '拿'], ['o', '哦'], ['p', '啪'],
  ['q', '期'], ['r', '然'], ['s', '撒'], ['t', '塌'], ['w', '挖'],
  ['x', '昔'], ['y', '压'], ['z', '匝']
];
const zhCollator = typeof Intl !== 'undefined' ? new Intl.Collator('zh-CN') : null;
const pinyinCache = new Map();

function getPinyinInitials(str) {
  if (!str || !zhCollator) return '';
  if (pinyinCache.has(str)) return pinyinCache.get(str);
  let out = '';
  for (const ch of str) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toLowerCase();
    } else if (/[\u4e00-\u9fa5]/.test(ch)) {
      let letter = '';
      for (let i = PY_BOUNDARIES.length - 1; i >= 0; i--) {
        if (zhCollator.compare(ch, PY_BOUNDARIES[i][1]) >= 0) {
          letter = PY_BOUNDARIES[i][0];
          break;
        }
      }
      out += letter;
    }
  }
  if (pinyinCache.size > 800) pinyinCache.clear();
  pinyinCache.set(str, out);
  return out;
}

// ==================== 1. 工具栏图标单实例启动 ====================
async function openOrFocusWorkspace(query = '') {
  const baseUrl = chrome.runtime.getURL('index.html');
  const targetUrl = query ? `${baseUrl}?q=${encodeURIComponent(query)}` : baseUrl;
  const existingTabs = await chrome.tabs.query({ url: `${baseUrl}*` });

  if (existingTabs.length > 0) {
    const tab = existingTabs[0];
    if (query) {
      await chrome.tabs.update(tab.id, { url: targetUrl, active: true });
    } else {
      await chrome.tabs.update(tab.id, { active: true });
    }
    if (typeof tab.windowId === 'number') {
      await chrome.windows.update(tab.windowId, { focused: true });
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
    chrome.contextMenus.create({
      id: QUICK_SAVE_PARENT_ID,
      title: '⚡ 收藏到效率工作台',
      contexts: ['page', 'link']
    });
    QUICK_SAVE_MENUS.forEach(item => {
      chrome.contextMenus.create({
        id: item.id,
        parentId: QUICK_SAVE_PARENT_ID,
        title: item.title,
        contexts: ['page', 'link']
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);

function inferSpaceAndGroup(url, title) {
  const str = `${url} ${title}`.toLowerCase();
  if (/(openai|chatgpt|gemini|claude|deepseek|kimi|perplexity|civitai|liblib|comfyui|huggingface|flux|pixverse|heygen|fish\.audio|siliconflow|coze|ai\b)/i.test(str)) {
    if (/(civitai|liblib|comfyui|flux|krea|openart|prompt|stability|upscal)/i.test(str)) {
      return { space: 'ai', group: '🎨 绘画与 ComfyUI' };
    }
    if (/(video|pixverse|heygen|domoai|audio|podcast|tts|swapface)/i.test(str)) {
      return { space: 'ai', group: '🎬 视频与音频' };
    }
    return { space: 'ai', group: '🧠 对话与搜索' };
  }
  if (/(unreal|ue5|fab\.com|artstation|cgtrader|sketchfab|kitbash|daz3d|polyhaven|ambientcg|hdri|pbr|cgpersia|vfx|blender|houdini|3d)/i.test(str)) {
    if (/(polyhaven|ambientcg|texture|hdri|pbr)/i.test(str)) {
      return { space: 'cg', group: '🌍 PBR 材质与 HDRI' };
    }
    if (/(unreal|ue5|fab\.com|vfx|niagara|magesbox)/i.test(str)) {
      return { space: 'cg', group: '🎮 UE5 与实时特效' };
    }
    return { space: 'cg', group: '🧊 3D 模型与扫描' };
  }
  if (/(github\.com|vercel|cloudflare|namesilo|qiniu|dogecloud|wordpress|clash|vpn|ghxi|repack|download)/i.test(str)) {
    if (/(vercel|cloudflare|namesilo|qiniu|dogecloud|pagespeed|wordpress)/i.test(str)) {
      return { space: 'software', group: '🌐 建站与云服务' };
    }
    return { space: 'software', group: '💻 绿色软件与脚本' };
  }
  return { space: 'media', group: '🔥 社区与工作台' };
}

function canonicalUrlKey(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase() + u.pathname.replace(/\/+$/, '').toLowerCase() + u.search.toLowerCase();
  } catch {
    return String(url || '').trim().replace(/\/$/, '').toLowerCase();
  }
}

function flashBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2200);
}

async function enrichSavedBookmarkMetadata(bmId, rawUrl, fallbackDesc, isRawUrlTitle) {
  try {
    const isPrivate = !rawUrl || /localhost|127\.0\.0\.1|192\.168\.|hzpipeline\.com/i.test(rawUrl);
    if (isPrivate) return;

    const res = await fetchWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(rawUrl)}`, { cache: 'no-store' }, 6500);
    if (!res.ok) return;
    const json = await res.json();
    if (!json || json.status !== 'success' || !json.data) return;

    const fetchedTitle = (json.data.title || '').trim();
    const fetchedDesc = (json.data.description || '').trim();
    if (!fetchedDesc && (!isRawUrlTitle || !fetchedTitle)) return;

    const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.pendingSaves]);
    let updated = false;

    const patchList = list => {
      if (!Array.isArray(list)) return false;
      const item = list.find(b => b.id === bmId);
      if (!item) return false;
      if (fetchedDesc && item.desc === fallbackDesc) {
        item.desc = fetchedDesc.length > 92 ? fetchedDesc.slice(0, 92) + '...' : fetchedDesc;
        updated = true;
      }
      if (isRawUrlTitle && fetchedTitle) {
        item.title = fetchedTitle.length > 44 ? fetchedTitle.slice(0, 44) : fetchedTitle;
        updated = true;
      }
      return updated;
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
  if (mime.includes('svg') && blob.size <= 16384) {
    return `data:image/svg+xml;base64,${arrayBufferToBase64(await blob.arrayBuffer())}`;
  }
  if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function') {
    const bmp = await createImageBitmap(blob);
    try {
      if (bmp.width < 16 || bmp.height < 16) throw new Error('too-small');
      const scale = Math.min(1, 64 / Math.max(bmp.width, bmp.height));
      const w = Math.max(16, Math.round(bmp.width * scale));
      const h = Math.max(16, Math.round(bmp.height * scale));
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      const webpBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.88 });
      return `data:image/webp;base64,${arrayBufferToBase64(await webpBlob.arrayBuffer())}`;
    } finally {
      bmp.close();
    }
  }
  if (blob.size <= 32768) {
    return `data:${mime || 'image/png'};base64,${arrayBufferToBase64(await blob.arrayBuffer())}`;
  }
  throw new Error('too-large');
}

async function cacheQuickSaveIconBg(bmId, rawUrl, favIconUrl = '') {
  let host = '';
  try { host = new URL(rawUrl).hostname.toLowerCase(); } catch {}
  const isPrivate = !host || /hzpipeline\.com|192\.168\.|127\.0\.0\.1|localhost/i.test(host);

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

  const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.pendingSaves]);
  const patchList = list => {
    if (!Array.isArray(list)) return false;
    const item = list.find(b => b.id === bmId);
    if (!item) return false;
    item.customIcon = dataUrl;
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

  const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.spaceGroups, KEYS.pendingSaves]);
  const list = Array.isArray(saved[KEYS.bookmarks]) ? saved[KEYS.bookmarks] : [];
  const groups = (saved[KEYS.spaceGroups] && typeof saved[KEYS.spaceGroups] === 'object') ? saved[KEYS.spaceGroups] : {};

  let { space, group } = inferSpaceAndGroup(rawUrl, cleanTitle);
  if (opts.space && opts.space !== 'auto' && DEFAULT_GROUP_BY_SPACE[opts.space]) {
    space = opts.space;
    group = (Array.isArray(groups[space]) && groups[space][0]) || DEFAULT_GROUP_BY_SPACE[space];
  }

  const newKey = canonicalUrlKey(rawUrl);
  const existing = list.find(b => canonicalUrlKey(b.url) === newKey);
  if (existing) {
    existing.quickSavedAt = Date.now();
    if (opts.pin) existing.pinned = true;
    await chrome.storage.local.set({
      [KEYS.bookmarks]: list,
      ws_v11_last_quick_save: { title: existing.title, space: existing.space, group: existing.group, existed: true, savedAt: Date.now() }
    });
    flashBadge('已存', '#f59e0b');
    if (!existing.customIcon || /^https?:\/\//i.test(existing.customIcon)) {
      cacheQuickSaveIconBg(existing.id, rawUrl, favIconUrl);
    }
    return;
  }

  const nowTs = Date.now();
  const fallbackDesc = `${cleanTitle} (${host || 'Web'}) 快速收藏站点`;
  const newBm = {
    id: 'bm_' + nowTs,
    space,
    group,
    title: cleanTitle,
    url: rawUrl,
    desc: fallbackDesc,
    pinned: !!opts.pin || undefined,
    quickSavedAt: nowTs,
    customIcon: favIconUrl && /^https?:\/\//i.test(favIconUrl) ? favIconUrl : undefined
  };

  if (list.length === 0) {
    const pending = Array.isArray(saved[KEYS.pendingSaves]) ? saved[KEYS.pendingSaves] : [];
    pending.unshift(newBm);
    await chrome.storage.local.set({ [KEYS.pendingSaves]: pending });
    flashBadge('✓', '#10b981');
    enrichSavedBookmarkMetadata(newBm.id, rawUrl, fallbackDesc, isRawUrlTitle);
    cacheQuickSaveIconBg(newBm.id, rawUrl, favIconUrl);
    return;
  }

  list.unshift(newBm);
  if (!Array.isArray(groups[space])) groups[space] = [];
  if (!groups[space].includes(group)) groups[space].push(group);

  await chrome.storage.local.set({
    [KEYS.bookmarks]: list,
    [KEYS.spaceGroups]: groups,
    [KEYS.updatedAt]: nowTs,
    ws_v11_last_quick_save: { title: cleanTitle, space, group, existed: false, savedAt: nowTs }
  });

  flashBadge('✓', '#10b981');
  triggerBackgroundPush(false);
  enrichSavedBookmarkMetadata(newBm.id, rawUrl, fallbackDesc, isRawUrlTitle);
  cacheQuickSaveIconBg(newBm.id, rawUrl, favIconUrl);
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

// ==================== 3. 地址栏 ws 直搜书签（支持拼音首字母 + 多词空格 AND 匹配） ====================
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

chrome.omnibox.setDefaultSuggestion({
  description: '⚡ 在个人效率工作台中搜索书签（支持拼音首字母与多词空格组合）: <match>%s</match>'
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const rawQ = (text || '').trim().toLowerCase();
  const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];
  const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.recentVisits]);
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

          if (tkScore === 0) return null; // 多词严格 AND 匹配
          score += tkScore;
        }
        score += Math.min(50, (visitCountMap.get(b.id) || 0) * 5) + (b.pinned ? 15 : 0);
      }
      return score > 0 ? { b, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const suggestions = scored.map(({ b }) => ({
    content: b.url,
    description: `${escapeXml(b.title)} <dim>- ${escapeXml((b.desc || b.url).slice(0, 60))}</dim>`
  }));
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

// ==================== 4. GitHub 私有 Gist 后台可靠推送与冲突保护 ====================
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildGhHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function executeBackgroundPush(force = false) {
  const allKeys = [
    KEYS.bookmarks, KEYS.spaceGroups, KEYS.todos, KEYS.memo, KEYS.updatedAt, KEYS.ghSync,
    KEYS.theme, KEYS.accent, KEYS.rightPanel, KEYS.city, KEYS.collapsed, KEYS.customLogo
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

          if (lastKnownRemote > 0 && remoteUpdatedAt > lastKnownRemote) {
            await chrome.storage.local.set({
              [KEYS.syncConflict]: {
                detectedAt: Date.now(),
                remoteUpdatedAt,
                localUpdatedAt: saved[KEYS.updatedAt] || Date.now()
              }
            });
            return { ok: false, conflict: true, remoteUpdatedAt };
          }
        }
      }
    } catch {
      // 网络波动交由后续 PATCH 统一上报
    }
  }

  const cleanBookmarks = rawBms.map(b => {
    const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
    if (b.pinned) item.pinned = true;
    if (b.quickSavedAt) item.quickSavedAt = b.quickSavedAt;
    if (b.customIcon && b.customIcon.length <= 40000) item.customIcon = b.customIcon;
    return item;
  });

  const customLogo = typeof saved[KEYS.customLogo] === 'string' && saved[KEYS.customLogo].length <= 200000
    ? saved[KEYS.customLogo]
    : '';

  const nowTs = Math.max(Date.now(), typeof saved[KEYS.updatedAt] === 'number' ? saved[KEYS.updatedAt] : 0);
  const payload = {
    version: 11.1,
    updatedAt: nowTs,
    spaceGroups: saved[KEYS.spaceGroups] || {},
    bookmarks: cleanBookmarks,
    todos: Array.isArray(saved[KEYS.todos]) ? saved[KEYS.todos] : [],
    memo: typeof saved[KEYS.memo] === 'string' ? saved[KEYS.memo] : '',
    settings: {
      theme: saved[KEYS.theme] || 'dark',
      accent: saved[KEYS.accent] || 'indigo',
      rightPanel: saved[KEYS.rightPanel] || 'expanded',
      city: saved[KEYS.city] || '39.9042,116.4074,北京',
      collapsed: saved[KEYS.collapsed] || {},
      customLogo
    }
  };

  const isCreate = !cfg.gistId;
  const endpoint = isCreate
    ? 'https://api.github.com/gists'
    : `https://api.github.com/gists/${encodeURIComponent(cfg.gistId)}`;

  const body = {
    description: 'Personal Workspace OS - Private Sync Data (v11.1)',
    files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } }
  };
  if (isCreate) body.public = false;

  const res = await fetchWithTimeout(endpoint, {
    method: isCreate ? 'POST' : 'PATCH',
    headers,
    body: JSON.stringify(body)
  }, 12000);

  if (!res.ok) {
    if (res.status === 401) throw new Error('Token 无效或已过期');
    if (res.status === 404) throw new Error('Gist ID 不存在或无权限');
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  const nextCfg = {
    ...cfg,
    gistId: isCreate && json.id ? json.id : cfg.gistId,
    lastSyncAt: Date.now(),
    lastRemoteUpdatedAt: nowTs
  };

  await chrome.storage.local.set({
    [KEYS.ghSync]: nextCfg,
    [KEYS.updatedAt]: nowTs,
    [KEYS.syncConflict]: null
  });

  return { ok: true, isCreate, gistId: nextCfg.gistId, updatedAt: nowTs };
}

async function triggerBackgroundPush(force = false) {
  if (bgSyncing) {
    bgPendingPush = true;
    if (force) bgForceNext = true;
    return { ok: true, queued: true };
  }

  bgSyncing = true;
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
    lastResult = { ok: false, error: err?.message || '请检查网络' };
  } finally {
    bgSyncing = false;
  }

  return lastResult;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SYNC_PUSH') {
    triggerBackgroundPush(!!msg.force).then(sendResponse);
    return true;
  }
});