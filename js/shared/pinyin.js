/* ==========================================================================
   前后台共享轻量级中文拼音首字母引擎（零外部依赖）
   ========================================================================== */

const PY_BOUNDARIES = [
  ['a', '阿'], ['b', '芭'], ['c', '擦'], ['d', '搭'], ['e', '蛾'],
  ['f', '发'], ['g', '噶'], ['h', '哈'], ['j', '击'], ['k', '喀'],
  ['l', '垃'], ['m', '妈'], ['n', '拿'], ['o', '哦'], ['p', '啪'],
  ['q', '期'], ['r', '然'], ['s', '撒'], ['t', '塌'], ['w', '挖'],
  ['x', '昔'], ['y', '压'], ['z', '匝']
];

const zhCollator = typeof Intl !== 'undefined' ? new Intl.Collator('zh-CN') : null;
const pinyinCache = new Map();

export function getPinyinInitials(str) {
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
