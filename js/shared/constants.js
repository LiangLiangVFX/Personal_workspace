/* ==========================================================================
   前后台共享常量定义（严格保持 ws_v10_* / ws_v11_* 存储键向后兼容）
   ========================================================================== */

export const KEYS = {
  bookmarks: 'ws_v10_bookmarks',
  spaceGroups: 'ws_v10_space_groups',
  collapsed: 'ws_v10_collapsed_groups',
  customLogo: 'ws_v10_custom_logo',
  recentVisits: 'ws_v10_recent_visits',
  memo: 'ws_v10_quick_memo',
  todos: 'ws_v10_quick_todos',
  noteTab: 'ws_v10_note_tab',
  theme: 'ws_v10_theme',
  accent: 'ws_v10_accent',
  rightPanel: 'ws_v10_right_panel',
  city: 'ws_v10_weather_city_v2',
  weatherCache: 'ws_v10_weather_cache',
  ghSync: 'ws_v10_gh_sync',
  updatedAt: 'ws_v10_updated_at',
  pendingSaves: 'ws_v11_pending_saves',
  syncConflict: 'ws_v11_sync_conflict',
  initialized: 'ws_v11_initialized',
  lastQuickSave: 'ws_v11_last_quick_save',
  tombstones: 'ws_v11_tombstones',
  syncMeta: 'ws_v11_sync_meta'
};

export const PRE_RESET_SNAPSHOT_KEY = 'ws_v11_pre_reset_snapshot';
export const DEFAULT_WEATHER_CITY = '39.9042,116.4074,北京';

export const GIST_FILENAME = 'personal_workspace_sync.json';
export const GIST_ICONS_FILENAME = 'personal_workspace_icons.json';

export const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
export const TOMBSTONE_MAX_COUNT = 500;
export const MAX_SYNC_ICON_LENGTH = 12288;
export const MAX_SYNC_LOGO_LENGTH = 200000;

export const FALLBACK_SPACES = [
  { id: 'home',     icon: '🏠', name: '首页聚焦',   grad: 'from-amber-500 to-rose-500',   virtual: true },
  { id: 'ai',       icon: '🤖', name: 'AI 创作',    grad: 'from-indigo-500 to-purple-600' },
  { id: 'cg',       icon: '🎮', name: 'CG & 3D',    grad: 'from-blue-500 to-cyan-500' },
  { id: 'media',    icon: '🎬', name: '媒体设计',   grad: 'from-fuchsia-500 to-orange-500' },
  { id: 'software', icon: '📦', name: '软件运维',   grad: 'from-emerald-500 to-teal-600' },
  { id: 'tools',    icon: '🛠️', name: '本地工具',   grad: 'from-cyan-500 to-indigo-600',  isTools: true }
];

export const FALLBACK_SPACE_GROUPS = {
  ai: ['🧠 对话与搜索', '🎨 绘画与 ComfyUI', '🎬 视频与音频'],
  cg: ['🎮 UE5 与实时特效', '🧊 3D 模型与扫描', '🏴‍☠️ 海外 CG 宝库', '🌍 PBR 材质与 HDRI'],
  media: ['🔥 社区与工作台', '✂️ 图像与文档工具', '🎨 字体、素材与音乐'],
  software: ['🧰 装机必备软件', '💻 绿色软件与脚本', '🌐 建站与云服务', '🚀 网络加速专线']
};

export const SPACE_GRAD_MAP = {
  ai: 'from-indigo-500 to-purple-600',
  cg: 'from-blue-500 to-cyan-500',
  media: 'from-fuchsia-500 to-orange-500',
  software: 'from-emerald-500 to-teal-600'
};

export const ENGINE_ORDER = ['local', 'google', 'bing', 'github', 'bilibili', 'taobao', 'jd'];

export const SEARCH_ENGINES = {
  local:    { name: '站内书签', btnText: '筛选', placeholder: '输入多词(空格分隔)或拼音首字母检索（/ 聚焦 · Tab 切引擎 · 1-6 切空间 · Ctrl+点击后台打开）...', url: '' },
  google:   { name: 'Google',   btnText: 'Google 搜索', placeholder: '在 Google 中搜索全球技术文档、UE5 资料与 CG 教程，按回车直达...', url: 'https://www.google.com/search?q=' },
  bing:     { name: 'Bing',     btnText: '必应搜索', placeholder: '在微软 Bing 中搜索全球网页与技术资料，按回车直达...', url: 'https://cn.bing.com/search?q=' },
  github:   { name: 'GitHub',   btnText: '搜开源项目', placeholder: '在 GitHub 检索开源项目、ComfyUI 自定义节点与实用脚本...', url: 'https://github.com/search?q=' },
  bilibili: { name: 'B站',      btnText: '搜 B站视频', placeholder: '在 Bilibili 搜索 UE5 / ComfyUI / Houdini 视频教程与 UP 主...', url: 'https://search.bilibili.com/all?keyword=' },
  taobao:   { name: '淘宝',     btnText: '搜淘宝', placeholder: '在淘宝网搜索数码硬件、外设装备与设计素材商品，按回车直达...', url: 'https://s.taobao.com/search?q=' },
  jd:       { name: '京东',     btnText: '搜京东', placeholder: '在京东商城搜索显卡硬件、显示器、数码自营商品，按回车直达...', url: 'https://search.jd.com/Search?keyword=' }
};

export const BUILTIN_TOOLS = [
  { id: 'tool-json', title: 'JSON 格式化 / 压缩校验', desc: '纯浏览器本地校验、美化缩进与单行压缩 JSON 数据，支持一键复制结果', icon: '📋', type: 'json' },
  { id: 'tool-text', title: '字数统计 & 文本按行去重', desc: '实时统计总字符、中文字数、英文单词与行数，支持一键按行去重与清理空行', icon: '📝', type: 'text' },
  { id: 'tool-radius', title: '本地图片圆角合成器（支持批处理）', desc: '支持多图拖拽、多选与 Ctrl+V 贴图，基于 Canvas 纯本地一键打包透明圆角 PNG', icon: '🖼️', type: 'radius' },
  { id: 'tool-time', title: '时间戳 & UE5 材质颜色转换', desc: 'Unix 时间戳互转、HEX 转 RGB 及 UE5 Material 线性浮点 (0.0~1.0) 颜色换算', icon: '⏱️', type: 'time' },
  { id: 'tool-palette', title: '图片吸管取色 & 主色聚类调色板', desc: '支持 Ctrl+V 粘贴/拖拽原画，吸取 UE5 线性色值并智能聚类提取 6 大主色调', icon: '🎨', type: 'palette' },
  { id: 'tool-converter', title: '本地图片格式转换 & 批量压缩', desc: '支持多图拖入与 Ctrl+V 贴图，纯本地批量互转 WebP/PNG/JPG 并打包导出', icon: '🔄', type: 'converter' },
  { id: 'tool-cgcalc', title: 'CG 帧率时间码 & 分辨率计算', desc: '动画帧数(Frames)与时间码(24/25/30/60fps)互转，以及 16:9 / 21:9 画幅像素换算', icon: '🎬', type: 'cgcalc' },
  { id: 'tool-codec', title: '编码加解密 & 强密码生成', desc: '基于标准 UTF-8 的 Base64 / URL 编解码与高强度随机安全密钥一键生成', icon: '🔐', type: 'codec' }
];

export const OFFICIAL_BRAND_SVGS = {
  'bilibili.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300AEEC"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"/></svg>`,
  'youtube.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  'github.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  'x.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  'pinterest.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>`,
  'discord.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
  'figma.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23F24E1E" d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z"/><path fill="%23A259FF" d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z"/><path fill="%23F24E1E" d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z"/><path fill="%23FF7262" d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z"/><path fill="%231ABCFE" d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z"/></svg>`,
  'chatgpt.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310A37F"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>`,
  'gemini.google.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%234facfe"/><stop offset="50%" stop-color="%23a18cd1"/><stop offset="100%" stop-color="%23fbc2eb"/></linearGradient></defs><path fill="url(%23g)" d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z"/></svg>`,
  'vercel.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>`,
  'cloudflare.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23F38020"><path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1338-.0713c-.0283-.042-.0351-.0986-.0146-.1553.0273-.084.1123-.1484.2031-.1553l8.7354-.1123c1.0351-.0498 2.1601-.8867 2.5537-1.9131l.499-1.3018c.0215-.0566.0293-.1123.0147-.168-.5625-2.5468-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6289 1.6172-5.3876 3.8614-.4922-.3653-1.1182-.5625-1.794-.499-1.2021.1191-2.166 1.083-2.2861 2.2851-.0283.3096.0068.6123.0918.8946C1.5684 13.0469 0 14.6572 0 16.6523c0 .1748.0146.3516.0352.5274.0146.084.084.1475.1689.1475h15.9815c.0908 0 .1758-.0635.2031-.1553l.1201-.3272z"/></svg>`,
  'artstation.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2313AFF0"><path d="M0 17.723l2.027 3.505h.001a2.424 2.424 0 0 0 2.164 1.333h13.457l-2.792-4.838H0zm24 .025c0-.484-.143-.935-.388-1.314L15.728 2.728a2.424 2.424 0 0 0-2.142-1.289H9.419L21.598 22.54l1.92-3.325c.378-.637.482-.919.482-1.467zm-11.129-3.462L7.428 4.858l-5.444 9.428h10.887z"/></svg>`,
  'unrealengine.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm3.5-14.5c-.828 0-1.5.672-1.5 1.5v5.25c0 .414-.336.75-.75.75s-.75-.336-.75-.75V8.5c0-1.105-.895-2-2-2s-2 .895-2 2v6.25c0 1.519 1.231 2.75 2.75 2.75.95 0 1.787-.482 2.283-1.215.424.725 1.21 1.215 2.117 1.215 1.381 0 2.5-1.119 2.5-2.5V9c0-.828-.672-1.5-1.5-1.5z"/></svg>`,
  'epicgames.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>`,
  'fab.com': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="%236366f1"/><path d="M7 7h10v3H10v2h6v3h-6v4H7V7z" fill="white"/></svg>`,
  'huggingface.co': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="%23FFD21E"/><circle cx="8.5" cy="9.5" r="1.5" fill="%231E293B"/><circle cx="15.5" cy="9.5" r="1.5" fill="%231E293B"/><path d="M8 14.5c1.2 2 6.8 2 8 0" stroke="%231E293B" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`
};
OFFICIAL_BRAND_SVGS['openai.com'] = OFFICIAL_BRAND_SVGS['chatgpt.com'];

export const FALLBACK_FAVICON_SVG = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>';

export const BROKEN_BASE64_HOSTS = new Set(['photomosh.com', 'www.world-creator.com', 'www.pbrmax.cn']);

export const SITE_METADATA_DICT = {
  'x.com': { title: 'X (Twitter) 全球社交与前沿资讯', desc: '全球最具影响力的实时资讯、独立开发者、AI 前沿动态与 CG 艺术家社交平台' },
  'github.com': { title: 'GitHub 开源代码托管与开发者社区', desc: '全球最大的开源代码托管平台、AI 开源项目与开发者协作社区' },
  'bilibili.com': { title: '哔哩哔哩 Bilibili', desc: '国内核心弹幕视频与 CG / AI / UE5 教程学习社区' },
  'youtube.com': { title: 'YouTube 全球视频平台', desc: '全球最大的视频分享与海外官方 CG、虚幻引擎教程平台' },
  'huggingface.co': { title: 'Hugging Face 开源 AI 社区', desc: '全球最大的开源大模型、扩散模型权重与 Spaces 在线演示平台' },
  'deepseek.com': { title: 'DeepSeek 深度求索 AI 助手', desc: '国产顶尖推理与代码生成大模型官方对话工作台' },
  'claude.ai': { title: 'Claude AI (Anthropic)', desc: '擅长长文本写作、复杂代码架构分析与高逻辑推理的旗舰 AI 助手' },
  'blender.org': { title: 'Blender 开源三维创作套件官网', desc: '免费开源的三维建模、雕刻、绑定、动画、模拟与渲染软件官网' }
};

export const CNY_TABLE = [
  { year: 2027, zodiac: '丁未羊年', prevDate: '2026-02-17T00:00:00', date: '2027-02-06T00:00:00', label: '2027.02.06 正月初一' },
  { year: 2028, zodiac: '戊申猴年', prevDate: '2027-02-06T00:00:00', date: '2028-01-26T00:00:00', label: '2028.01.26 正月初一' },
  { year: 2029, zodiac: '己酉鸡年', prevDate: '2028-01-26T00:00:00', date: '2029-02-13T00:00:00', label: '2029.02.13 正月初一' },
  { year: 2030, zodiac: '庚戌狗年', prevDate: '2029-02-13T00:00:00', date: '2030-02-03T00:00:00', label: '2030.02.03 正月初一' },
  { year: 2031, zodiac: '辛亥猪年', prevDate: '2030-02-03T00:00:00', date: '2031-01-23T00:00:00', label: '2031.01.23 正月初一' },
  { year: 2032, zodiac: '壬子鼠年', prevDate: '2031-01-23T00:00:00', date: '2032-02-11T00:00:00', label: '2032.02.11 正月初一' }
];
