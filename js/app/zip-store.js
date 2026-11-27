/* ==========================================================================
   纯离线无压缩 ZIP Store 打包器（CRC32 + UTF-8）与 Blob 下载辅助
   ========================================================================== */

let crc32TableCache = null;

export function getCrc32Table() {
  if (crc32TableCache) return crc32TableCache;
  const tbl = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    tbl[i] = c >>> 0;
  }
  crc32TableCache = tbl;
  return tbl;
}

export function calcCrc32(bytes) {
  const tbl = getCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = tbl[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const MAX_ZIP_ENTRIES = 0xffff;
const MAX_ZIP_UINT32 = 0xffffffff;

export function createUncompressedZipBlob(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError('ZIP 打包条目列表必须为数组');
  }
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new RangeError(`标准 ZIP 单包条目数不可超过 ${MAX_ZIP_ENTRIES}`);
  }

  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
  const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  let cdSize = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    if (nameBytes.length > MAX_ZIP_ENTRIES) {
      throw new RangeError(`文件名 UTF-8 长度超出 ZIP 限制: ${entry.name}`);
    }
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    if (data.length > MAX_ZIP_UINT32) {
      throw new RangeError(`单文件体积超出标准 ZIP 4GB 上限: ${entry.name}`);
    }
    const nextOffset = offset + 30 + nameBytes.length + data.length;
    if (nextOffset > MAX_ZIP_UINT32) {
      throw new RangeError('ZIP 总数据区体积超出标准 4GB 上限');
    }

    const crc = calcCrc32(data);

    const lfh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lfh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);

    localChunks.push(lfh, data);

    const cdh = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cdh.set(nameBytes, 46);

    centralChunks.push(cdh);
    offset = nextOffset;
    cdSize += cdh.length;
    if (cdSize > MAX_ZIP_UINT32) {
      throw new RangeError('ZIP 中央目录区体积超出标准上限');
    }
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localChunks, ...centralChunks, eocd], { type: 'application/zip' });
}

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), type, quality);
  });
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function makeUniqueZipName(baseName, suffix, ext, usedSet) {
  const cleanBase = String(baseName || 'image').replace(/[\\/:*?"<>|]/g, '_').trim() || 'image';
  let candidate = `${cleanBase}${suffix}.${ext}`;
  let seq = 2;
  while (usedSet.has(candidate.toLowerCase())) {
    candidate = `${cleanBase}${suffix}_${seq++}.${ext}`;
  }
  usedSet.add(candidate.toLowerCase());
  return candidate;
}
