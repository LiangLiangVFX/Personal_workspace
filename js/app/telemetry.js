/* ==========================================================================
   右侧实时仪表盘（访问足迹、双标签便签待办、差量时钟/春节、三路气象）
   ========================================================================== */

import { CNY_TABLE, DEFAULT_WEATHER_CITY, KEYS } from '../shared/constants.js';
import { escapeHtml, extractDomain, generateId, sanitizeUrl } from '../shared/url-utils.js';
import { fetchWithTimeout } from '../shared/net.js';
import { IS_EXTENSION, state } from './state.js';
import { markLocalChangeAndSync, triggerScheduledSync, writeStoreInternal } from './storage.js';
import { closeAccentPopover, closeCardContextMenu, showToast } from './ui-utils.js';

export function renderRecentVisitsList() {
  const listEl = document.getElementById('recentVisitsList');
  if (!listEl) return;
  if (state.recentVisits.length === 0) {
    listEl.innerHTML = `<div class="py-8 text-center text-xs text-slate-400">暂无最近访问记录</div>`;
    return;
  }
  listEl.innerHTML = state.recentVisits.map(item => `
    <div class="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition group">
      <div data-recent-open-id="${escapeHtml(item.id)}" data-recent-open-url="${escapeHtml(sanitizeUrl(item.url) || '#')}" class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
        <span class="w-6 h-6 rounded-lg theme-badge border flex items-center justify-center text-xs font-bold shrink-0">${escapeHtml((item.title || 'W')[0].toUpperCase())}</span>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-500 transition">${escapeHtml(item.title)}</div>
          <div class="text-[10px] text-slate-400 truncate font-mono">${escapeHtml(extractDomain(item.url))}</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold theme-badge border">${item.count || 1} 次</span>
        <button type="button" data-recent-del-id="${escapeHtml(item.id)}" class="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center text-xs transition">✕</button>
      </div>
    </div>
  `).join('');
}

export function recordBookmarkVisit(bmId, url) {
  const bm = state.bookmarks.find(b => b.id === bmId) || { id: bmId || ('url_' + url), title: extractDomain(url), url };
  const idx = state.recentVisits.findIndex(r => r.id === bm.id || r.url === bm.url);
  if (idx > -1) {
    const rec = state.recentVisits[idx];
    rec.count = (rec.count || 1) + 1;
    rec.lastTime = Date.now();
    rec.title = bm.title || rec.title;
    state.recentVisits.splice(idx, 1);
    state.recentVisits.unshift(rec);
  } else {
    state.recentVisits.unshift({ id: bm.id, title: bm.title || extractDomain(bm.url), url: bm.url, count: 1, lastTime: Date.now() });
  }
  if (state.recentVisits.length > 40) state.recentVisits = state.recentVisits.slice(0, 40);
  writeStoreInternal({ [KEYS.recentVisits]: state.recentVisits });
  renderRecentVisitsList();
}

export function openBookmarkUrl(bmId, url, inBackground = false) {
  const safe = sanitizeUrl(url);
  if (!safe) {
    showToast('⚠️ 仅支持打开 http/https 安全网址');
    return;
  }
  recordBookmarkVisit(bmId, safe);
  if (inBackground && IS_EXTENSION && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: safe, active: false });
    showToast('📑 已在后台新标签页静默打开');
  } else {
    window.open(safe, '_blank', 'noopener,noreferrer');
  }
}

export function toggleRecentPopover(e) {
  if (e) e.stopPropagation();
  closeAccentPopover();
  closeCardContextMenu();
  const pop = document.getElementById('recentVisitsPopover');
  if (!pop) return;
  if (pop.classList.contains('hidden')) {
    renderRecentVisitsList();
    pop.classList.remove('hidden');
  } else {
    pop.classList.add('hidden');
  }
}

export function switchNoteTab(tab, save = true) {
  state.currentNoteTab = tab === 'todo' ? 'todo' : 'memo';
  if (save) writeStoreInternal({ [KEYS.noteTab]: state.currentNoteTab });
  const isMemo = state.currentNoteTab === 'memo';
  document.getElementById('memoPane')?.classList.toggle('hidden', !isMemo);
  document.getElementById('todoPane')?.classList.toggle('hidden', isMemo);
  const btnMemo = document.getElementById('tabBtnMemo');
  const btnTodo = document.getElementById('tabBtnTodo');
  if (btnMemo) {
    btnMemo.className = isMemo
      ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold theme-solid-bg text-white transition'
      : 'px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition';
  }
  if (btnTodo) {
    btnTodo.className = !isMemo
      ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold theme-solid-bg text-white transition flex items-center gap-1'
      : 'px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition flex items-center gap-1';
  }
}

export function updateSaveStatusTimestamp(customText = '') {
  const status = document.getElementById('memoSaveStatus');
  if (!status) return;
  if (customText) { status.textContent = customText; return; }
  const now = new Date();
  status.textContent = `已保存 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function saveTodos(skipSync = false) {
  if (!skipSync) state.localUpdatedAt = Date.now();
  writeStoreInternal({ [KEYS.todos]: state.todos, [KEYS.updatedAt]: state.localUpdatedAt });
  updateSaveStatusTimestamp();
  if (!skipSync) triggerScheduledSync();
}

export function renderTodoList() {
  const listEl = document.getElementById('todoList');
  const badge = document.getElementById('todoPendingBadge');
  const stats = document.getElementById('todoStatsText');
  const pending = state.todos.filter(t => !t.done).length;
  if (badge) { badge.textContent = pending; badge.classList.toggle('hidden', pending === 0); }
  if (stats) stats.textContent = `${state.todos.length - pending} / ${state.todos.length} 完成`;
  if (!listEl) return;

  if (state.todos.length === 0) {
    listEl.innerHTML = `<div class="py-6 text-center text-[11px] text-slate-400">暂无今日待办，输入内容按回车添加</div>`;
    return;
  }
  listEl.innerHTML = state.todos.map(t => `
    <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition group">
      <label class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
        <input type="checkbox" data-todo-toggle="${escapeHtml(t.id)}" ${t.done ? 'checked' : ''} class="rounded accent-indigo-600 w-3.5 h-3.5 shrink-0">
        <span class="text-xs truncate ${t.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}">${escapeHtml(t.text)}</span>
      </label>
      <button type="button" data-todo-del="${escapeHtml(t.id)}" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-[11px] px-1 transition">✕</button>
    </div>
  `).join('');
}

export function updateMemoCount(val) {
  const el = document.getElementById('memoCharCount');
  if (el) el.textContent = `${(val || '').length} 字`;
}

export function flushMemoWriteNow(val, skipSync = false) {
  clearTimeout(state.memoWriteTimer);
  state.memoWriteTimer = null;
  if (!skipSync) state.localUpdatedAt = Date.now();
  writeStoreInternal({ [KEYS.memo]: val, [KEYS.updatedAt]: state.localUpdatedAt });
  updateSaveStatusTimestamp();
  if (!skipSync) triggerScheduledSync();
}

export function handleMemoInput(val, skipSync = false) {
  updateMemoCount(val);
  if (skipSync) {
    flushMemoWriteNow(val, true);
    return;
  }
  updateSaveStatusTimestamp('保存中...');
  clearTimeout(state.memoWriteTimer);
  state.memoWriteTimer = setTimeout(() => flushMemoWriteNow(val, false), 300);
}

const WEATHER_FRESH_TTL_MS = 30 * 60 * 1000;
const WEATHER_STALE_TTL_MS = 3 * 60 * 60 * 1000;
let clockTimerId = null;

export function stopClockAndCNY() {
  if (clockTimerId !== null) {
    clearInterval(clockTimerId);
    clockTimerId = null;
  }
}

export function initClockAndCNY() {
  stopClockAndCNY();
  const prev = {};
  const setIfChanged = (key, elId, val) => {
    if (prev[key] === val) return;
    prev[key] = val;
    const el = document.getElementById(elId);
    if (el) el.textContent = val;
  };
  const tick = () => {
    const now = new Date();
    setIfChanged('hm', 'clockHM', `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setIfChanged('sec', 'clockSec', String(now.getSeconds()).padStart(2, '0'));
    setIfChanged('date', 'clockDate', `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`);
    setIfChanged('weekday', 'clockWeekday', ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]);

    const h = now.getHours();
    let greet = '🌙 夜深注意休息';
    if (h >= 5 && h < 9) greet = '🌅 早安·元气开启';
    else if (h >= 9 && h < 12) greet = '⚡ 黄金专注时段';
    else if (h >= 12 && h < 14) greet = '🍱 午间小憩充能';
    else if (h >= 14 && h < 18) greet = '☀️ 高效创作中';
    else if (h >= 18 && h < 22) greet = '🌆 晚间灵感时刻';
    setIfChanged('greet', 'timeGreeting', greet);

    const nextCNY = CNY_TABLE.find(item => new Date(item.date).getTime() > now.getTime()) || CNY_TABLE[CNY_TABLE.length - 1];
    const targetMs = new Date(nextCNY.date).getTime();
    const prevMs = new Date(nextCNY.prevDate).getTime();
    const totalCycleMs = Math.max(86400 * 1000, targetMs - prevMs);
    const diffSec = Math.max(0, Math.floor((targetMs - now.getTime()) / 1000));
    setIfChanged('cnyTitle', 'cnyTitle', `${nextCNY.year}${nextCNY.zodiac}春节`);
    setIfChanged('cnyTarget', 'cnyTargetDate', nextCNY.label);
    setIfChanged('cnyDays', 'cnyDays', String(Math.floor(diffSec / 86400)).padStart(2, '0'));
    setIfChanged('cnyHours', 'cnyHours', String(Math.floor((diffSec % 86400) / 3600)).padStart(2, '0'));
    setIfChanged('cnyMinutes', 'cnyMinutes', String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0'));
    setIfChanged('cnySeconds', 'cnySeconds', String(diffSec % 60).padStart(2, '0'));

    const passedPct = Math.min(100, Math.max(0, ((now.getTime() - prevMs) / totalCycleMs) * 100)).toFixed(1);
    if (prev.pct !== passedPct) {
      prev.pct = passedPct;
      const txtEl = document.getElementById('cnyProgressText');
      const barEl = document.getElementById('cnyProgressBar');
      if (txtEl) txtEl.textContent = `年度周期已推进 ${passedPct}%`;
      if (barEl) barEl.style.width = `${passedPct}%`;
    }
  };
  tick();
  clockTimerId = setInterval(tick, 1000);
}

function parseWMOWeather(code) {
  if (code === 0) return { icon: '☀️', desc: '晴朗无云 · 适宜创作' };
  if (code === 1 || code === 2) return { icon: '⛅', desc: '晴间多云 · 体感舒适' };
  if (code === 3) return { icon: '☁️', desc: '阴天多云 · 光线柔和' };
  if (code >= 45 && code <= 48) return { icon: '🌫️', desc: '轻雾弥漫 · 注意出行' };
  if (code >= 51 && code <= 67) return { icon: '🌧️', desc: '微雨阵雨 · 记得带伞' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '❄️', desc: '降雪天气 · 注意保暖' };
  if (code >= 80 && code <= 82) return { icon: '🌦️', desc: '局部阵雨 · 空气清新' };
  if (code >= 95) return { icon: '⛈️', desc: '雷阵雨 · 留意天气变化' };
  return { icon: '🌤️', desc: '天气良好' };
}

function parseWttrCode(code) {
  if (code === 113) return { icon: '☀️', desc: '晴朗无云 · 适宜创作' };
  if (code === 116) return { icon: '⛅', desc: '晴间多云 · 体感舒适' };
  if (code === 119 || code === 122) return { icon: '☁️', desc: '阴天多云 · 光线柔和' };
  if ([143, 248, 260].includes(code)) return { icon: '🌫️', desc: '轻雾弥漫 · 注意出行' };
  if ([200, 386, 389, 392, 395].includes(code)) return { icon: '⛈️', desc: '雷阵雨 · 留意天气变化' };
  if ([179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338, 368, 371].includes(code)) return { icon: '❄️', desc: '降雪天气 · 注意保暖' };
  if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code)) return { icon: '🌧️', desc: '微雨阵雨 · 记得带伞' };
  return { icon: '🌤️', desc: '天气良好' };
}

function renderWeatherUI(w, cacheMode = false) {
  const iconEl = document.getElementById('weatherIcon');
  const tempEl = document.getElementById('weatherTemp');
  const descEl = document.getElementById('weatherDesc');
  const feelsEl = document.getElementById('weatherFeels');
  const humidEl = document.getElementById('weatherHumid');
  const windEl = document.getElementById('weatherWind');
  if (iconEl) iconEl.textContent = w.icon;
  if (tempEl) tempEl.textContent = w.temp;
  if (descEl) {
    if (cacheMode === 'stale' && w.savedAt) {
      const t = new Date(w.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      descEl.textContent = `${w.desc} (${t} 缓存)`;
    } else if (cacheMode) {
      descEl.textContent = `${w.desc} (缓存)`;
    } else {
      descEl.textContent = w.desc;
    }
  }
  if (feelsEl) feelsEl.textContent = `${w.feels}°`;
  if (humidEl) humidEl.textContent = `${w.humid}%`;
  if (windEl) windEl.textContent = `${w.wind}km/h`;
}

async function fetchFromOpenMeteo(lat, lon) {
  const res = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
    { cache: 'no-store' },
    5000
  );
  if (!res.ok) throw new Error('open-meteo fail');
  const data = await res.json();
  if (!data || !data.current) throw new Error('open-meteo empty');
  const cur = data.current;
  const wmo = parseWMOWeather(cur.weather_code);
  return { icon: wmo.icon, desc: wmo.desc, temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature), humid: Math.round(cur.relative_humidity_2m), wind: Math.round(cur.wind_speed_10m) };
}

async function fetchFromWttr(baseUrl, lat, lon) {
  const res = await fetchWithTimeout(`${baseUrl}/${lat},${lon}?format=j1`, { cache: 'no-store' }, 5500);
  if (!res.ok) throw new Error('wttr fail');
  const data = await res.json();
  const cur = data?.current_condition?.[0];
  if (!cur) throw new Error('wttr empty');
  const wmo = parseWttrCode(parseInt(cur.weatherCode, 10));
  return { icon: wmo.icon, desc: wmo.desc, temp: Math.round(parseFloat(cur.temp_C)), feels: Math.round(parseFloat(cur.FeelsLikeC)), humid: Math.round(parseFloat(cur.humidity)), wind: Math.round(parseFloat(cur.windspeedKmph)) };
}

export async function fetchWeatherData(lat, lon, cityName, isManualRetry = false) {
  const reqSeq = ++state.weatherRequestSeq;
  state.lastWeatherArgs = { lat, lon, cityName };
  const badge = document.getElementById('weatherCityBadge');
  const descEl = document.getElementById('weatherDesc');
  if (badge) badge.textContent = cityName;

  const cached = state.weatherCacheMap[cityName];
  const cacheAgeMs = (cached && typeof cached.savedAt === 'number') ? (Date.now() - cached.savedAt) : Infinity;

  if (!isManualRetry && cached && cacheAgeMs < WEATHER_FRESH_TTL_MS) {
    renderWeatherUI(cached, 'fresh');
    return;
  }

  if (!isManualRetry && cached && cacheAgeMs < WEATHER_STALE_TTL_MS) {
    renderWeatherUI(cached, 'fresh');
  } else if (descEl) {
    descEl.textContent = '正在同步气象数据...';
  }

  const providers = [
    () => fetchFromOpenMeteo(lat, lon),
    () => fetchFromWttr('https://wttr.in', lat, lon),
    () => fetchFromWttr('https://wttr.is', lat, lon)
  ];

  for (const run of providers) {
    try {
      const result = await run();
      if (reqSeq !== state.weatherRequestSeq) return;
      state.weatherCacheMap[cityName] = { ...result, savedAt: Date.now() };
      writeStoreInternal({ [KEYS.weatherCache]: state.weatherCacheMap });
      renderWeatherUI(result, false);
      if (isManualRetry) showToast(`⛅ ${cityName}实时天气已刷新`);
      return;
    } catch {}
  }

  if (reqSeq !== state.weatherRequestSeq) return;
  if (cached) renderWeatherUI(cached, 'stale');
  else if (descEl) descEl.textContent = '网络暂不可达 · 点图标重试';
  if (isManualRetry) showToast('⚠️ 三路气象源均连接超时，请检查网络或代理设置');
}

export function changeWeatherCity(val, notify = true, skipSync = false) {
  writeStoreInternal({ [KEYS.city]: val });
  if (!skipSync) markLocalChangeAndSync();
  if (val === 'auto') {
    if (navigator.geolocation) {
      const geoSeq = ++state.weatherRequestSeq;
      const descEl = document.getElementById('weatherDesc');
      if (descEl) descEl.textContent = '正在获取地理位置...';
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (geoSeq === state.weatherRequestSeq) {
            fetchWeatherData(pos.coords.latitude, pos.coords.longitude, '本地定位');
          }
        },
        () => {
          if (geoSeq === state.weatherRequestSeq) {
            fetchWeatherData(39.9042, 116.4074, '北京');
          }
        },
        { timeout: 6000 }
      );
    } else {
      fetchWeatherData(39.9042, 116.4074, '北京');
    }
  } else {
    const [lat, lon, name] = val.split(',');
    fetchWeatherData(parseFloat(lat), parseFloat(lon), name || '北京');
    if (notify) showToast(`⛅ 已切换实时天气城市：${name || '北京'}`);
  }
}

export function initWeather(savedCity) {
  const cityVal = savedCity || DEFAULT_WEATHER_CITY;
  const selector = document.getElementById('citySelector');
  if (selector) {
    const hasOption = Array.from(selector.options).some(o => o.value === cityVal);
    if (hasOption) selector.value = cityVal;
  }
  changeWeatherCity(cityVal, false, true);
}

export function addTodoItem(text) {
  state.todos.unshift({ id: generateId('td'), text, done: false });
  saveTodos();
  renderTodoList();
}
