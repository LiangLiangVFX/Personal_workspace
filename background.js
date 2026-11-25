/* ==========================================================================
   个人效率工作台 OS — Manifest V3 后台服务引擎 (v11.0)
   功能：单实例启动 · 右键/Alt+S 收藏 · 地址栏 ws 直搜 · GitHub Gist 后台防漏传队列
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

// ==================== 2. 任意网页右键 & Alt+S 一键收藏 ====================
function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: QUICK_SAVE_MENU_ID,
      title: '⚡ 收藏到效率工作台',
      contexts: ['page', 'link']
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

async function quickSaveUrl(rawUrl, rawTitle = '', favIconUrl = '') {
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    flashBadge('!', '#f43f5e');
    return;
  }

  let host = '';
  try { host = new URL(rawUrl).hostname.replace(/^www\./, ''); } catch {}
  const cleanTitle = (rawTitle || host || '新建书签').trim().slice(0, 48);
  const { space, group } = inferSpaceAndGroup(rawUrl, cleanTitle);

  const saved = await chrome.storage.local.get([KEYS.bookmarks, KEYS.spaceGroups, KEYS.pendingSaves]);
  const list = Array.isArray(saved[KEYS.bookmarks]) ? saved[KEYS.bookmarks] : [];

  const newKey = canonicalUrlKey(rawUrl);
  if (list.some(b => canonicalUrlKey(b.url) === newKey)) {
    flashBadge('已存', '#f59e0b');
    return;
  }

  const newBm = {
    id: 'bm_' + Date.now(),
    space,
    group,
    title: cleanTitle,
    url: rawUrl,
    desc: `${cleanTitle} (${host || 'Web'}) 快速收藏站点`,
    customIcon: favIconUrl && /^https?:\/\//i.test(favIconUrl) ? favIconUrl : undefined
  };

  if (list.length === 0) {
    const pending = Array.isArray(saved[KEYS.pendingSaves]) ? saved[KEYS.pendingSaves] : [];
    pending.unshift(newBm);
    await chrome.storage.local.set({ [KEYS.pendingSaves]: pending });
    flashBadge('✓', '#10b981');
    return;
  }

  list.unshift(newBm);
  const groups = (saved[KEYS.spaceGroups] && typeof saved[KEYS.spaceGroups] === 'object') ? saved[KEYS.spaceGroups] : {};
  if (!Array.isArray(groups[space])) groups[space] = [];
  if (!groups[space].includes(group)) groups[space].push(group);

  await chrome.storage.local.set({
    [KEYS.bookmarks]: list,
    [KEYS.spaceGroups]: groups,
    [KEYS.updatedAt]: Date.now()
  });

  flashBadge('✓', '#10b981');
  triggerBackgroundPush(false);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== QUICK_SAVE_MENU_ID) return;
  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? (info.selectionText || info.linkUrl) : (tab?.title || '');
  const icon = info.linkUrl ? '' : (tab?.favIconUrl || '');
  quickSaveUrl(url, title, icon);
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'quick-save-tab') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) quickSaveUrl(tab.url, tab.title || '', tab.favIconUrl || '');
});

// ==================== 3. 地址栏 ws 直搜书签 (Omnibox) ====================
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

chrome.omnibox.setDefaultSuggestion({
  description: '⚡ 在个人效率工作台中搜索书签: <match>%s</match>'
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const q = (text || '').trim().toLowerCase();
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
      let score = 0;
      if (!q) {
        score = (b.pinned ? 50 : 0) + (visitCountMap.get(b.id) || 0) * 5;
      } else {
        if (title.includes(q)) score += 100;
        if (url.includes(q)) score += 60;
        if (desc.includes(q) || group.includes(q)) score += 30;
        if (score > 0) score += Math.min(40, (visitCountMap.get(b.id) || 0) * 4);
      }
      return { b, score };
    })
    .filter(item => item.score > 0)
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

  // 1) 冲突保护：非强制覆盖且已绑定 Gist 时，先读取云端时间戳防止覆盖另一台电脑的新改动
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
      // 检查接口网络异常时交由后续 PATCH 统一处理报错
    }
  }

  // 2) 打包精简同步体（含全部界面偏好设置，自动剥离书签离线 Base64 图标）
  const cleanBookmarks = rawBms.map(b => {
    const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
    if (b.pinned) item.pinned = true;
    if (b.customIcon) item.customIcon = b.customIcon;
    return item;
  });

  const customLogo = typeof saved[KEYS.customLogo] === 'string' && saved[KEYS.customLogo].length <= 200000
    ? saved[KEYS.customLogo]
    : '';

  const nowTs = Math.max(Date.now(), typeof saved[KEYS.updatedAt] === 'number' ? saved[KEYS.updatedAt] : 0);
  const payload = {
    version: 11,
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
    description: 'Personal Workspace OS - Private Sync Data (v11)',
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