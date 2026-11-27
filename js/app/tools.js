/* ==========================================================================
   8 大纯本地效率工具（圆角/格式转换多图批处理与 ZIP 打包、调色板、CG 计算等）
   ========================================================================== */

import { escapeHtml } from '../shared/url-utils.js';
import { state, toolSessionCache } from './state.js';
import { showToast } from './ui-utils.js';
import {
  canvasToBlob,
  createUncompressedZipBlob,
  makeUniqueZipName,
  triggerBlobDownload
} from './zip-store.js';

function renderBatchChipsHtml(toolKey, items, activeIdx) {
  return `
    <div class="flex items-center justify-between text-[11px]">
      <span class="font-bold text-slate-600 dark:text-slate-300">📂 批处理队列 (${items.length} 张，点击切换预览)</span>
      <span class="text-[10px] text-slate-400">最多同时 20 张</span>
    </div>
    <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
      ${items.map((item, idx) => `
        <div class="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition ${
          idx === activeIdx
            ? 'batch-chip-active font-bold'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }">
          <button type="button" data-batch-select="${toolKey}" data-batch-idx="${idx}" class="truncate" style="max-width:120px">${escapeHtml(item.name)}</button>
          <button type="button" data-batch-remove="${toolKey}" data-batch-idx="${idx}" class="opacity-75 hover:opacity-100 text-[10px] px-0.5">✕</button>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderRadiusBatchBar() {
  const bar = document.getElementById('radiusBatchBar');
  const batchBtn = document.getElementById('radiusBatchExportBtn');
  const clearBtn = document.getElementById('radiusClearBtn');
  if (bar) {
    bar.classList.toggle('hidden', state.radiusBatchItems.length === 0);
    if (state.radiusBatchItems.length > 0) bar.innerHTML = renderBatchChipsHtml('radius', state.radiusBatchItems, state.radiusActiveIdx);
  }
  if (batchBtn) {
    batchBtn.classList.toggle('hidden', state.radiusBatchItems.length <= 1);
    batchBtn.textContent = `📦 打包导出 ZIP (${state.radiusBatchItems.length}张)`;
  }
  if (clearBtn) clearBtn.classList.toggle('hidden', state.radiusBatchItems.length === 0);
}

export function renderConvBatchBar() {
  const bar = document.getElementById('convBatchBar');
  const batchBtn = document.getElementById('convBatchExportBtn');
  const clearBtn = document.getElementById('convClearBtn');
  if (bar) {
    bar.classList.toggle('hidden', state.convBatchItems.length === 0);
    if (state.convBatchItems.length > 0) bar.innerHTML = renderBatchChipsHtml('converter', state.convBatchItems, state.convActiveIdx);
  }
  if (batchBtn) {
    batchBtn.classList.toggle('hidden', state.convBatchItems.length <= 1);
    batchBtn.textContent = `📦 打包导出 ZIP (${state.convBatchItems.length}张)`;
  }
  if (clearBtn) clearBtn.classList.toggle('hidden', state.convBatchItems.length === 0);
}

function drawRoundedToCanvas(canvas, img, r) {
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const rad = Math.min(r, canvas.width / 2, canvas.height / 2);
  ctx.beginPath();
  ctx.moveTo(rad, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, rad);
  ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, rad);
  ctx.arcTo(0, canvas.height, 0, 0, rad);
  ctx.arcTo(0, 0, canvas.width, 0, rad);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0);
}

export function previewRadiusImage() {
  const slider = document.getElementById('radiusSlider');
  const canvas = document.getElementById('radiusCanvas');
  if (!canvas || !slider) return;
  toolSessionCache.radiusVal = slider.value;
  const r = parseInt(slider.value, 10);
  const label = document.getElementById('radiusValLabel');
  if (label) label.textContent = r + 'px';

  const cur = state.radiusBatchItems[state.radiusActiveIdx];
  if (!cur) {
    const ctx = canvas.getContext('2d');
    canvas.width = 0; canvas.height = 0;
    ctx?.clearRect(0, 0, 0, 0);
    return;
  }
  drawRoundedToCanvas(canvas, cur.img, r);
}

export async function batchExportRadiusImages() {
  if (state.radiusBatchItems.length === 0) { showToast('💡 请先选择或粘贴图片'); return; }
  const btn = document.getElementById('radiusBatchExportBtn');
  if (btn) btn.disabled = true;
  try {
    const r = parseInt(toolSessionCache.radiusVal || '36', 10);
    const offscreen = document.createElement('canvas');
    const entries = [];
    const usedNames = new Set();
    for (let i = 0; i < state.radiusBatchItems.length; i++) {
      const item = state.radiusBatchItems[i];
      if (btn) btn.textContent = `⏳ 打包中 (${i + 1}/${state.radiusBatchItems.length})...`;
      drawRoundedToCanvas(offscreen, item.img, r);
      const blob = await canvasToBlob(offscreen, 'image/png');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      entries.push({ name: makeUniqueZipName(item.name, '_rounded', 'png', usedNames), data: bytes });
    }
    const zipBlob = createUncompressedZipBlob(entries);
    triggerBlobDownload(zipBlob, `rounded_images_${new Date().toISOString().slice(0, 10)}.zip`);
    showToast(`📦 已离线打包导出 ${entries.length} 张圆角 PNG (.zip)`);
  } catch {
    showToast('❌ 批量打包失败，请检查图片尺寸');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = `📦 打包导出 ZIP (${state.radiusBatchItems.length}张)`;
    }
  }
}

export function drawConvertedImageToCanvas(canvas, img, w, h, fmt) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (fmt === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
}

export function updateConvertedPreview(deferEstimate = false) {
  const q = document.getElementById('convQuality')?.value || '88';
  const fmt = document.getElementById('convFormat')?.value || 'image/jpeg';
  const scaleStr = document.getElementById('convScale')?.value || '1';
  toolSessionCache.convQuality = q;
  toolSessionCache.convFormat = fmt;
  toolSessionCache.convScale = scaleStr;
  const ql = document.getElementById('convQualityLabel');
  if (ql) ql.textContent = q + '%';

  const cur = state.convBatchItems[state.convActiveIdx];
  const canvas = document.getElementById('convCanvas');
  const badge = document.getElementById('convInfoBadge');
  clearTimeout(state.convEstimateTimer);
  if (!cur || !canvas) {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    if (badge) badge.textContent = '支持一次拖入多张图片批量转 WebP / 压缩，或按 Ctrl+V 粘贴截图';
    return;
  }

  const scale = parseFloat(scaleStr);
  const w = Math.max(1, Math.round(cur.img.width * scale));
  const h = Math.max(1, Math.round(cur.img.height * scale));
  if (!deferEstimate || canvas.width !== w || canvas.height !== h) {
    drawConvertedImageToCanvas(canvas, cur.img, w, h, fmt);
  }
  if (badge) badge.textContent = `当前: ${cur.name} ｜ ${w} × ${h} px ｜ 体积计算中...`;

  const seq = ++state.convEstimateSeq;
  const runEstimate = async () => {
    try {
      const blob = await canvasToBlob(canvas, fmt, parseInt(q, 10) / 100);
      if (seq !== state.convEstimateSeq) return;
      const kb = Math.max(1, Math.round(blob.size / 1024));
      const liveBadge = document.getElementById('convInfoBadge');
      if (liveBadge) liveBadge.textContent = `当前: ${cur.name} ｜ ${w} × ${h} px ｜ 预计体积: ~${kb} KB`;
    } catch {}
  };
  if (deferEstimate) state.convEstimateTimer = setTimeout(runEstimate, 120);
  else runEstimate();
}

export async function batchExportConvertedImages() {
  if (state.convBatchItems.length === 0) { showToast('💡 请先选择或粘贴图片'); return; }
  const btn = document.getElementById('convBatchExportBtn');
  if (btn) btn.disabled = true;
  try {
    const fmt = toolSessionCache.convFormat;
    const scale = parseFloat(toolSessionCache.convScale || '1');
    const quality = parseInt(toolSessionCache.convQuality || '88', 10) / 100;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[fmt] || 'jpg';
    const offscreen = document.createElement('canvas');
    const entries = [];
    const usedNames = new Set();

    for (let i = 0; i < state.convBatchItems.length; i++) {
      const item = state.convBatchItems[i];
      if (btn) btn.textContent = `⏳ 打包中 (${i + 1}/${state.convBatchItems.length})...`;
      const w = Math.max(1, Math.round(item.img.width * scale));
      const h = Math.max(1, Math.round(item.img.height * scale));
      drawConvertedImageToCanvas(offscreen, item.img, w, h, fmt);
      const blob = await canvasToBlob(offscreen, fmt, quality);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      entries.push({ name: makeUniqueZipName(item.name, '', ext, usedNames), data: bytes });
    }
    const zipBlob = createUncompressedZipBlob(entries);
    triggerBlobDownload(zipBlob, `converted_${ext}_${new Date().toISOString().slice(0, 10)}.zip`);
    showToast(`📦 已离线打包导出 ${entries.length} 张 ${ext.toUpperCase()} 图片 (.zip)`);
  } catch {
    showToast('❌ 批量打包失败，请检查图片参数');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = `📦 打包导出 ZIP (${state.convBatchItems.length}张)`;
    }
  }
}

export function runJsonTool(mode) {
  const el = document.getElementById('jsonInput');
  const status = document.getElementById('jsonStatus');
  if (!el) return;
  if (mode === 'copy') { navigator.clipboard.writeText(el.value); showToast('📋 JSON 已复制'); return; }
  try {
    const obj = JSON.parse(el.value);
    el.value = mode === 'pretty' ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    toolSessionCache.json = el.value;
    status.textContent = '✅ JSON 校验通过';
    status.className = 'text-xs font-mono text-emerald-500';
  } catch (err) {
    status.textContent = '❌ 语法错误: ' + err.message;
    status.className = 'text-xs font-mono text-rose-500';
  }
}

export function updateTextStats() {
  const val = document.getElementById('textToolInput')?.value || '';
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('stTotal', val.length);
  set('stCN', (val.match(/[\u4e00-\u9fa5]/g) || []).length);
  set('stEN', (val.trim().match(/[a-zA-Z0-9_]+/g) || []).length);
  set('stLines', val ? val.split(/\r?\n/).length : 0);
}

export function convertTimestamp() {
  const raw = document.getElementById('tsInput')?.value.trim() || '';
  toolSessionCache.ts = raw;
  const out = document.getElementById('tsOutput');
  if (!out) return;
  if (!raw) { out.textContent = ''; return; }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    out.textContent = '⚠️ 请输入有效数字时间戳';
    return;
  }
  const ms = Math.abs(num) < 1e11 ? num * 1000 : num;
  const d = new Date(ms);
  out.textContent = Number.isNaN(d.getTime()) ? '⚠️ 超出有效日期范围' : d.toLocaleString();
}

export function syncColorHex(val) {
  const hex = val.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  toolSessionCache.hex = hex;
  const cp = document.getElementById('colorPicker');
  const hi = document.getElementById('hexInput');
  if (cp) cp.value = hex;
  if (hi) hi.value = hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const ro = document.getElementById('rgbOutput');
  const uo = document.getElementById('ueFloatOutput');
  if (ro) ro.textContent = `rgb(${r}, ${g}, ${b})`;
  if (uo) uo.textContent = `UE Linear Vector3: (R=${(r / 255).toFixed(3)}, G=${(g / 255).toFixed(3)}, B=${(b / 255).toFixed(3)})`;
}

function extractDominantPalette(ctx, width, height, count = 6) {
  const { data } = ctx.getImageData(0, 0, width, height);
  const totalPixels = width * height;
  const stride = Math.max(1, Math.floor(totalPixels / 8000));
  const buckets = new Map();

  for (let p = 0; p < totalPixels; p += stride) {
    const i = p * 4;
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    let bkt = buckets.get(key);
    if (!bkt) { bkt = { r: 0, g: 0, b: 0, n: 0 }; buckets.set(key, bkt); }
    bkt.r += r; bkt.g += g; bkt.b += b; bkt.n++;
  }

  const sorted = Array.from(buckets.values())
    .map(b => ({ r: Math.round(b.r / b.n), g: Math.round(b.g / b.n), b: Math.round(b.b / b.n), n: b.n }))
    .sort((a, b) => b.n - a.n);

  const picked = [];
  const tryPick = minDistSq => {
    for (const c of sorted) {
      if (picked.length >= count) break;
      const farEnough = picked.every(p => {
        const dr = p.r - c.r, dg = p.g - c.g, db = p.b - c.b;
        return (dr * dr + dg * dg + db * db) >= minDistSq;
      });
      if (farEnough) picked.push(c);
    }
  };

  tryPick(52 * 52);
  if (picked.length < count) tryPick(28 * 28);
  if (picked.length < count) tryPick(0);

  return picked.map(c => '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase());
}

export function drawPaletteImg(img) {
  const canvas = document.getElementById('paletteCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const scale = Math.min(1, 600 / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const swatches = extractDominantPalette(ctx, canvas.width, canvas.height, 6);
  const el = document.getElementById('extractedSwatches');
  if (el) {
    el.innerHTML = swatches.map(hex => `
      <button type="button" data-copy-hex="${hex}" class="p-2 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col items-center gap-1 hover:scale-105 transition">
        <span class="w-full h-7 rounded-lg shadow-inner" style="background:${hex}"></span>
        <span class="font-mono text-[10px]">${hex}</span>
      </button>
    `).join('');
  }
}

export function calcCgFramesToTc() {
  const fpsVal = document.getElementById('cgFps')?.value || '30';
  const fVal = document.getElementById('cgFramesInput')?.value ?? '0';
  toolSessionCache.cgFps = fpsVal;
  toolSessionCache.cgFrames = fVal;
  const parsedFps = parseInt(fpsVal, 10);
  const fps = Math.max(1, Number.isFinite(parsedFps) ? parsedFps : 30);
  const parsedF = parseInt(fVal, 10);
  const f = Math.max(0, Number.isFinite(parsedF) ? parsedF : 0);
  const pad = n => String(n).padStart(2, '0');
  const ts = Math.floor(f / fps);
  const out = document.getElementById('cgTcOutput');
  if (out) out.textContent = `${pad(Math.floor(ts / 3600))}:${pad(Math.floor(ts / 60) % 60)}:${pad(ts % 60)}:${pad(f % fps)} (${(f / fps).toFixed(2)}s)`;
}

export function calcCgResolution() {
  const ratioVal = document.getElementById('cgRatio')?.value || '16:9';
  const wVal = document.getElementById('cgWidthInput')?.value ?? '';
  toolSessionCache.cgRatio = ratioVal;
  toolSessionCache.cgWidth = wVal;
  const [rw, rh] = ratioVal.split(':').map(Number);
  const parsedW = parseInt(wVal, 10);
  const out = document.getElementById('cgResOutput');
  if (!out) return;
  if (!Number.isFinite(parsedW) || parsedW <= 0) {
    out.textContent = '-- × -- px';
    return;
  }
  out.textContent = `${parsedW} × ${Math.round((parsedW * rh) / rw)} px`;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.trim());
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function runCodec(mode) {
  const el = document.getElementById('codecInput');
  if (!el || !el.value) return;
  try {
    if (mode === 'b64enc') el.value = utf8ToBase64(el.value);
    else if (mode === 'b64dec') el.value = base64ToUtf8(el.value);
    else if (mode === 'urlenc') el.value = encodeURIComponent(el.value);
    else if (mode === 'urldec') el.value = decodeURIComponent(el.value);
    toolSessionCache.codec = el.value;
    showToast('✨ 转换完成');
  } catch { showToast('❌ 无法解码该内容'); }
}

export function generateStrongPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_+-=';
  const arr = new Uint32Array(20);
  window.crypto.getRandomValues(arr);
  let pwd = '';
  for (let i = 0; i < 20; i++) pwd += chars[arr[i] % chars.length];
  toolSessionCache.pwd = pwd;
  const out = document.getElementById('pwdOutput');
  if (out) out.value = pwd;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const baseName = (file.name || `img_${Date.now().toString().slice(-4)}`).replace(/\.[^.]+$/, '') || 'image';
        resolve({ name: baseName, img });
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function loadImageFilesToActiveTool(fileList, targetTool = state.currentToolType) {
  const imgFiles = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
  if (imgFiles.length === 0) return;

  if (targetTool === 'palette') {
    try {
      const loaded = await readImageFile(imgFiles[0]);
      state.paletteSourceImg = loaded.img;
      drawPaletteImg(loaded.img);
      showToast('🎨 已完成主色聚类调色板提取');
    } catch { showToast('❌ 读取图片失败'); }
    return;
  }

  const loadedItems = [];
  for (const f of imgFiles.slice(0, 20)) {
    try { loadedItems.push(await readImageFile(f)); } catch {}
  }
  if (loadedItems.length === 0) return;

  if (targetTool === 'radius') {
    state.radiusBatchItems = [...state.radiusBatchItems, ...loadedItems].slice(-20);
    state.radiusActiveIdx = state.radiusBatchItems.length - 1;
    renderRadiusBatchBar();
    previewRadiusImage();
    showToast(loadedItems.length > 1 ? `🖼️ 已批量载入 ${loadedItems.length} 张图片（队列共 ${state.radiusBatchItems.length} 张）` : '🖼️ 图片已载入圆角合成器');
  } else if (targetTool === 'converter') {
    state.convBatchItems = [...state.convBatchItems, ...loadedItems].slice(-20);
    state.convActiveIdx = state.convBatchItems.length - 1;
    renderConvBatchBar();
    updateConvertedPreview();
    showToast(loadedItems.length > 1 ? `🔄 已批量载入 ${loadedItems.length} 张图片（队列共 ${state.convBatchItems.length} 张）` : '🔄 图片已载入格式转换器');
  }
}

function buildJsonToolModal() {
  return {
    title: '📋 JSON 格式化 / 压缩 / 校验器',
    html: `
      <textarea id="jsonInput" rows="8" placeholder="在此粘贴 JSON 字符串（关闭弹窗自动暂存）..." class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-indigo-500">${escapeHtml(toolSessionCache.json)}</textarea>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-tool-btn="json-pretty" class="px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold">✨ 格式化美化</button>
        <button type="button" data-tool-btn="json-minify" class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold">📦 压缩为单行</button>
        <button type="button" data-tool-btn="json-copy" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">📋 复制结果</button>
      </div>
      <div id="jsonStatus" class="text-xs font-mono text-slate-400">等待输入...</div>
    `
  };
}

function buildTextToolModal() {
  return {
    title: '📝 字数统计 & 文本按行去重工具',
    html: `
      <textarea id="textToolInput" rows="7" placeholder="在此输入或粘贴文本、Prompt 提示词..." class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500">${escapeHtml(toolSessionCache.text)}</textarea>
      <div class="grid grid-cols-4 gap-2 text-center text-xs">
        <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800"><div class="text-slate-400">总字符</div><div id="stTotal" class="text-base font-extrabold font-mono theme-text">0</div></div>
        <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800"><div class="text-slate-400">中文字数</div><div id="stCN" class="text-base font-extrabold font-mono text-purple-500">0</div></div>
        <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800"><div class="text-slate-400">英文单词</div><div id="stEN" class="text-base font-extrabold font-mono text-cyan-500">0</div></div>
        <div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800"><div class="text-slate-400">总行数</div><div id="stLines" class="text-base font-extrabold font-mono text-emerald-500">0</div></div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-tool-btn="text-dedup" class="px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold">🧹 按行去重并清理空行</button>
        <button type="button" data-tool-btn="text-copy" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">📋 复制文本</button>
      </div>
    `,
    onMount: () => updateTextStats()
  };
}

function buildRadiusToolModal() {
  return {
    title: '🖼️ 本地图片圆角合成器 (支持多图批处理 / Ctrl+V / 拖拽)',
    html: `
      <div class="space-y-3 text-xs">
        <input type="file" id="radiusFileInput" accept="image/*" multiple class="tool-file-input">
        <div id="radiusBatchBar" class="hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 space-y-2"></div>
        <div class="flex items-center gap-3">
          <span class="font-semibold shrink-0">圆角半径:</span>
          <input type="range" id="radiusSlider" min="0" max="200" value="${escapeHtml(toolSessionCache.radiusVal)}" class="flex-1 accent-indigo-600">
          <span id="radiusValLabel" class="font-mono font-bold theme-text w-12 text-right">${escapeHtml(toolSessionCache.radiusVal)}px</span>
        </div>
        <div data-img-dropzone="radius" class="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 transition">
          <canvas id="radiusCanvas" class="max-h-56 max-w-full rounded shadow-sm"></canvas>
          <div class="text-[11px] text-slate-400 mt-2">💡 支持一次性拖入多张图片，或按 Ctrl+V 追加剪贴板截图</div>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" id="radiusClearBtn" data-tool-btn="radius-clear" class="hidden px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold">清空队列</button>
          <button type="button" data-tool-btn="radius-download" class="px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold">💾 导出当前 PNG</button>
          <button type="button" id="radiusBatchExportBtn" data-tool-btn="radius-download-all" class="hidden px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">📦 打包导出 ZIP</button>
        </div>
      </div>
    `,
    onMount: () => {
      renderRadiusBatchBar();
      previewRadiusImage();
    }
  };
}

function buildTimeToolModal() {
  const nowUnix = Math.floor(Date.now() / 1000);
  const initTs = toolSessionCache.ts || String(nowUnix);
  const initHex = toolSessionCache.hex || '#6366f1';
  return {
    title: '⏱️ 时间戳 & UE5 Shader 颜色转换器',
    html: `
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 space-y-2">
          <div class="font-bold">1. Unix 时间戳转换 (当前: <span class="font-mono theme-text">${nowUnix}</span>)</div>
          <div class="flex gap-2">
            <input type="text" id="tsInput" value="${escapeHtml(initTs)}" class="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
            <button type="button" data-tool-btn="ts-convert" class="px-3.5 py-2 rounded-lg theme-solid-bg text-white font-semibold">转换</button>
          </div>
          <div id="tsOutput" class="font-mono text-emerald-500 font-semibold"></div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 space-y-2">
          <div class="font-bold">2. HEX 颜色转 RGB &amp; UE5 Material 线性浮点 (0.0 ~ 1.0)</div>
          <div class="flex items-center gap-2">
            <input type="color" id="colorPicker" value="${escapeHtml(initHex)}" class="w-10 h-9 rounded cursor-pointer bg-transparent">
            <input type="text" id="hexInput" value="${escapeHtml(initHex)}" class="w-28 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
            <span id="rgbOutput" class="font-mono text-slate-600 dark:text-slate-300"></span>
          </div>
          <div id="ueFloatOutput" class="p-2 rounded-lg bg-slate-200/70 dark:bg-slate-900 font-mono theme-text"></div>
        </div>
      </div>
    `,
    onMount: () => {
      convertTimestamp();
      syncColorHex(initHex);
    }
  };
}

function buildPaletteToolModal() {
  return {
    title: '🎨 图片吸管取色 & 主色聚类调色板 (支持 Ctrl+V 贴图 / 拖拽)',
    html: `
      <div class="space-y-3 text-xs">
        <input type="file" id="paletteFileInput" accept="image/*" class="tool-file-input">
        <div data-img-dropzone="palette" class="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden transition">
          <canvas id="paletteCanvas" class="max-h-56 max-w-full rounded cursor-crosshair shadow-sm"></canvas>
          <div class="text-[11px] text-slate-400 mt-2">💡 截完参考图后直接 Ctrl+V 粘贴或拖入图片，点击画布任意像素取色</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span id="pickedColorPreview" class="w-7 h-7 rounded-lg border border-white/30 shadow" style="background:${escapeHtml(toolSessionCache.pickedHex)}"></span>
            <div>
              <div id="pickedHexText" class="font-mono font-bold">${escapeHtml(toolSessionCache.pickedHex)} · ${escapeHtml(toolSessionCache.pickedRgb)}</div>
              <div id="pickedUeText" class="font-mono text-[11px] theme-text">${escapeHtml(toolSessionCache.pickedUe)}</div>
            </div>
          </div>
          <button type="button" data-tool-btn="palette-copy" class="px-3 py-1.5 rounded-lg theme-solid-bg text-white font-semibold">复制色值</button>
        </div>
        <div id="extractedSwatches" class="grid grid-cols-6 gap-2"></div>
      </div>
    `,
    onMount: () => {
      if (state.paletteSourceImg) drawPaletteImg(state.paletteSourceImg);
    }
  };
}

function buildConverterToolModal() {
  return {
    title: '🔄 本地图片格式转换 & 批量压缩 (支持多图批处理 / Ctrl+V / 拖拽)',
    html: `
      <div class="space-y-3.5 text-xs">
        <input type="file" id="convFileInput" accept="image/*" multiple class="tool-file-input">
        <div id="convBatchBar" class="hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 space-y-2"></div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label class="block text-slate-400 mb-1">输出格式</label>
            <select id="convFormat" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <option value="image/png">PNG (无损透明)</option>
              <option value="image/jpeg">JPG (通用小体积)</option>
              <option value="image/webp">WebP (高压缩比)</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">等比缩放</label>
            <select id="convScale" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <option value="1">100% 原图</option><option value="0.75">75%</option><option value="0.5">50%</option><option value="0.25">25%</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">画质: <span id="convQualityLabel" class="font-mono theme-text">${escapeHtml(toolSessionCache.convQuality)}%</span></label>
            <input type="range" id="convQuality" min="10" max="100" value="${escapeHtml(toolSessionCache.convQuality)}" class="w-full accent-indigo-600 mt-2">
          </div>
        </div>
        <div id="convInfoBadge" class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 font-mono text-slate-500 text-center">支持一次拖入多张图片批量转 WebP / 压缩，或按 Ctrl+V 粘贴截图</div>
        <div data-img-dropzone="converter" class="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 transition">
          <canvas id="convCanvas" class="max-h-48 max-w-full rounded shadow-sm"></canvas>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" id="convClearBtn" data-tool-btn="conv-clear" class="hidden px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 font-semibold">清空队列</button>
          <button type="button" data-tool-btn="conv-download" class="px-4 py-2 rounded-xl theme-solid-bg text-white font-semibold">💾 导出当前图片</button>
          <button type="button" id="convBatchExportBtn" data-tool-btn="conv-download-all" class="hidden px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">📦 打包导出 ZIP</button>
        </div>
      </div>
    `,
    onMount: () => {
      document.getElementById('convFormat').value = toolSessionCache.convFormat;
      document.getElementById('convScale').value = toolSessionCache.convScale;
      renderConvBatchBar();
      updateConvertedPreview();
    }
  };
}

function buildCgCalcToolModal() {
  return {
    title: '🎬 CG 帧率时间码 & 画幅分辨率计算器',
    html: `
      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 space-y-2.5">
          <div class="font-bold">1. 动画总帧数 (Frames) ⇄ 时间码 (HH:MM:SS:FF)</div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-slate-400 mb-1">帧率 (FPS)</label>
              <select id="cgFps" class="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
                <option value="24">24 FPS</option><option value="25">25 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option><option value="120">120 FPS</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">总帧数</label>
              <input type="number" id="cgFramesInput" value="${escapeHtml(toolSessionCache.cgFrames)}" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">时间码 &amp; 秒数</label>
              <div id="cgTcOutput" class="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 font-mono font-bold theme-text"></div>
            </div>
          </div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 space-y-2.5">
          <div class="font-bold">2. 渲染画幅比例与分辨率等比计算</div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-slate-400 mb-1">画幅比例</label>
              <select id="cgRatio" class="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
                <option value="16:9">16 : 9</option><option value="21:9">21 : 9</option><option value="9:16">9 : 16</option><option value="4:3">4 : 3</option><option value="1:1">1 : 1</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">宽度 (px)</label>
              <input type="number" id="cgWidthInput" value="${escapeHtml(toolSessionCache.cgWidth)}" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">分辨率结果</label>
              <div id="cgResOutput" class="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-mono font-bold text-emerald-500"></div>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 pt-1">
            <button type="button" data-cg-preset="1280" class="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">720P</button>
            <button type="button" data-cg-preset="1920" class="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">1080P</button>
            <button type="button" data-cg-preset="2560" class="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">2K</button>
            <button type="button" data-cg-preset="3840" class="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">4K</button>
          </div>
        </div>
      </div>
    `,
    onMount: () => {
      document.getElementById('cgFps').value = toolSessionCache.cgFps;
      document.getElementById('cgRatio').value = toolSessionCache.cgRatio;
      calcCgFramesToTc();
      calcCgResolution();
    }
  };
}

function buildCodecToolModal() {
  return {
    title: '🔐 编码加解密 & 强密码生成器',
    html: `
      <div class="space-y-4 text-xs">
        <div class="space-y-2">
          <div class="font-bold">1. 标准 UTF-8 Base64 / URL 编解码</div>
          <textarea id="codecInput" rows="4" placeholder="在此输入文本或链接..." class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-indigo-500">${escapeHtml(toolSessionCache.codec)}</textarea>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" data-tool-btn="b64enc" class="px-3 py-1.5 rounded-lg theme-solid-bg text-white font-semibold">Base64 编码</button>
            <button type="button" data-tool-btn="b64dec" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-semibold">Base64 解码</button>
            <button type="button" data-tool-btn="urlenc" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-semibold">URL 编码</button>
            <button type="button" data-tool-btn="urldec" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-semibold">URL 解码</button>
            <button type="button" data-tool-btn="codec-copy" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">复制</button>
          </div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold">2. 随机安全强密码生成器</span>
            <button type="button" data-tool-btn="pwd-gen" class="px-3 py-1 rounded-lg theme-solid-bg text-white font-semibold">⚡ 重新生成</button>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" id="pwdOutput" readonly value="${escapeHtml(toolSessionCache.pwd)}" class="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold theme-text">
            <button type="button" data-tool-btn="pwd-copy" class="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-semibold">复制</button>
          </div>
        </div>
      </div>
    `,
    onMount: () => {
      if (!toolSessionCache.pwd) generateStrongPassword();
    }
  };
}

export const TOOL_MODAL_BUILDERS = {
  json: buildJsonToolModal,
  text: buildTextToolModal,
  radius: buildRadiusToolModal,
  time: buildTimeToolModal,
  palette: buildPaletteToolModal,
  converter: buildConverterToolModal,
  cgcalc: buildCgCalcToolModal,
  codec: buildCodecToolModal
};

export function openToolModal(type) {
  const modal = document.getElementById('toolModal');
  const title = document.getElementById('toolModalTitle');
  const body = document.getElementById('toolModalBody');
  const builder = TOOL_MODAL_BUILDERS[type];
  if (!modal || !body || !builder) return;

  state.currentToolType = type;
  const view = builder();
  if (title) title.textContent = view.title;
  body.innerHTML = view.html;
  view.onMount?.();
  modal.classList.remove('hidden');
}

export function closeToolModal() {
  state.currentToolType = '';
  document.getElementById('toolModal')?.classList.add('hidden');
}

export function bindToolsEvents() {
  document.getElementById('toolModal')?.addEventListener('click', e => {
    if (e.target.id === 'toolModal') closeToolModal();
  });
  document.getElementById('closeToolModalBtn')?.addEventListener('click', closeToolModal);

  const toolBody = document.getElementById('toolModalBody');
  toolBody?.addEventListener('dragover', e => {
    const dz = e.target.closest('[data-img-dropzone]');
    if (dz) { e.preventDefault(); dz.classList.add('nav-drop-target'); }
  });
  toolBody?.addEventListener('dragleave', e => {
    const dz = e.target.closest('[data-img-dropzone]');
    if (dz && !dz.contains(e.relatedTarget)) dz.classList.remove('nav-drop-target');
  });
  toolBody?.addEventListener('drop', e => {
    const dz = e.target.closest('[data-img-dropzone]');
    if (!dz) return;
    e.preventDefault();
    dz.classList.remove('nav-drop-target');
    if (e.dataTransfer?.files?.length) {
      loadImageFilesToActiveTool(e.dataTransfer.files, dz.getAttribute('data-img-dropzone'));
    }
  });

  document.addEventListener('paste', e => {
    if (!['radius', 'palette', 'converter'].includes(state.currentToolType)) return;
    const modal = document.getElementById('toolModal');
    if (!modal || modal.classList.contains('hidden')) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      loadImageFilesToActiveTool(files, state.currentToolType);
    }
  });

  toolBody?.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'jsonInput') toolSessionCache.json = e.target.value;
    else if (id === 'textToolInput') { toolSessionCache.text = e.target.value; updateTextStats(); }
    else if (id === 'radiusSlider') previewRadiusImage();
    else if (id === 'tsInput') toolSessionCache.ts = e.target.value;
    else if (id === 'colorPicker' || id === 'hexInput') syncColorHex(e.target.value);
    else if (id === 'convQuality') updateConvertedPreview(true);
    else if (id === 'cgFramesInput') calcCgFramesToTc();
    else if (id === 'cgWidthInput') calcCgResolution();
    else if (id === 'codecInput') toolSessionCache.codec = e.target.value;
  });

  toolBody?.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'radiusFileInput' && e.target.files?.length) {
      loadImageFilesToActiveTool(e.target.files, 'radius');
      e.target.value = '';
    } else if (id === 'paletteFileInput' && e.target.files?.length) {
      loadImageFilesToActiveTool(e.target.files, 'palette');
      e.target.value = '';
    } else if (id === 'convFileInput' && e.target.files?.length) {
      loadImageFilesToActiveTool(e.target.files, 'converter');
      e.target.value = '';
    } else if (id === 'convFormat' || id === 'convScale') updateConvertedPreview();
    else if (id === 'cgFps') calcCgFramesToTc();
    else if (id === 'cgRatio') calcCgResolution();
  });

  toolBody?.addEventListener('click', e => {
    const batchSel = e.target.closest('[data-batch-select]');
    if (batchSel) {
      const tool = batchSel.getAttribute('data-batch-select');
      const idx = parseInt(batchSel.getAttribute('data-batch-idx'), 10);
      if (tool === 'radius') { state.radiusActiveIdx = idx; renderRadiusBatchBar(); previewRadiusImage(); }
      else if (tool === 'converter') { state.convActiveIdx = idx; renderConvBatchBar(); updateConvertedPreview(); }
      return;
    }
    const batchRem = e.target.closest('[data-batch-remove]');
    if (batchRem) {
      const tool = batchRem.getAttribute('data-batch-remove');
      const idx = parseInt(batchRem.getAttribute('data-batch-idx'), 10);
      if (tool === 'radius') {
        state.radiusBatchItems.splice(idx, 1);
        state.radiusActiveIdx = Math.max(0, Math.min(state.radiusActiveIdx, state.radiusBatchItems.length - 1));
        renderRadiusBatchBar();
        previewRadiusImage();
      } else if (tool === 'converter') {
        state.convBatchItems.splice(idx, 1);
        state.convActiveIdx = Math.max(0, Math.min(state.convActiveIdx, state.convBatchItems.length - 1));
        renderConvBatchBar();
        updateConvertedPreview();
      }
      return;
    }
    if (e.target.id === 'paletteCanvas') {
      const canvas = e.target;
      if (!canvas.width) return;
      const rect = canvas.getBoundingClientRect();
      const px = Math.min(canvas.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))));
      const py = Math.min(canvas.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))));
      const [r, g, b] = canvas.getContext('2d').getImageData(px, py, 1, 1).data;
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      toolSessionCache.pickedHex = hex;
      toolSessionCache.pickedRgb = `rgb(${r}, ${g}, ${b})`;
      toolSessionCache.pickedUe = `UE5 Linear: (R=${(r / 255).toFixed(3)}, G=${(g / 255).toFixed(3)}, B=${(b / 255).toFixed(3)})`;
      document.getElementById('pickedColorPreview').style.background = hex;
      document.getElementById('pickedHexText').textContent = `${hex} · ${toolSessionCache.pickedRgb}`;
      document.getElementById('pickedUeText').textContent = toolSessionCache.pickedUe;
      return;
    }
    const copyHex = e.target.closest('[data-copy-hex]');
    if (copyHex) {
      const h = copyHex.getAttribute('data-copy-hex');
      navigator.clipboard.writeText(h);
      showToast(`🎨 已复制 ${h}`);
      return;
    }
    const preset = e.target.closest('[data-cg-preset]');
    if (preset) {
      document.getElementById('cgWidthInput').value = preset.getAttribute('data-cg-preset');
      calcCgResolution();
      return;
    }
    const btn = e.target.closest('[data-tool-btn]');
    if (!btn) return;
    const act = btn.getAttribute('data-tool-btn');
    if (act === 'json-pretty') runJsonTool('pretty');
    else if (act === 'json-minify') runJsonTool('minify');
    else if (act === 'json-copy') runJsonTool('copy');
    else if (act === 'text-dedup') {
      const el = document.getElementById('textToolInput');
      if (el) {
        el.value = Array.from(new Set(el.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))).join('\n');
        toolSessionCache.text = el.value;
        updateTextStats();
        showToast('🧹 已按行去重');
      }
    } else if (act === 'text-copy') {
      navigator.clipboard.writeText(document.getElementById('textToolInput')?.value || '');
      showToast('📋 已复制文本');
    } else if (act === 'radius-clear') {
      state.radiusBatchItems = [];
      state.radiusActiveIdx = 0;
      renderRadiusBatchBar();
      previewRadiusImage();
    } else if (act === 'radius-download') {
      const c = document.getElementById('radiusCanvas');
      const cur = state.radiusBatchItems[state.radiusActiveIdx];
      if (!c || !cur) { showToast('💡 请先选择或粘贴图片'); return; }
      canvasToBlob(c, 'image/png').then(blob => triggerBlobDownload(blob, `${cur.name}_rounded.png`)).catch(() => {});
    } else if (act === 'radius-download-all') {
      batchExportRadiusImages();
    } else if (act === 'ts-convert') {
      convertTimestamp();
    } else if (act === 'palette-copy') {
      navigator.clipboard.writeText(toolSessionCache.pickedHex);
      showToast(`🎨 已复制 ${toolSessionCache.pickedHex}`);
    } else if (act === 'conv-clear') {
      state.convBatchItems = [];
      state.convActiveIdx = 0;
      renderConvBatchBar();
      updateConvertedPreview();
    } else if (act === 'conv-download') {
      const cur = state.convBatchItems[state.convActiveIdx];
      if (!cur) { showToast('💡 请先选择或粘贴图片'); return; }
      const c = document.getElementById('convCanvas');
      const fmt = toolSessionCache.convFormat;
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[fmt] || 'jpg';
      const scale = parseFloat(toolSessionCache.convScale || '1');
      const w = Math.max(1, Math.round(cur.img.width * scale));
      const h = Math.max(1, Math.round(cur.img.height * scale));
      drawConvertedImageToCanvas(c, cur.img, w, h, fmt);
      canvasToBlob(c, fmt, parseInt(toolSessionCache.convQuality, 10) / 100)
        .then(blob => triggerBlobDownload(blob, `${cur.name}.${ext}`))
        .catch(() => {});
    } else if (act === 'conv-download-all') {
      batchExportConvertedImages();
    } else if (['b64enc', 'b64dec', 'urlenc', 'urldec'].includes(act)) {
      runCodec(act);
    } else if (act === 'codec-copy') {
      navigator.clipboard.writeText(document.getElementById('codecInput')?.value || '');
      showToast('📋 已复制');
    } else if (act === 'pwd-gen') {
      generateStrongPassword();
    } else if (act === 'pwd-copy') {
      navigator.clipboard.writeText(document.getElementById('pwdOutput')?.value || '');
      showToast('📋 强密码已复制');
    }
  });
}
