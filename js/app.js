/* ==========================================================================
   个人效率工作台 & 全景书签导航 OS — Manifest V3 纯离线扩展核心引擎 (v11.1)
   升级：冲突无损智能合并 · 便签写盘防抖 · 多词空格+拼音加权检索 ·
         单站图标右键强制刷新 · 圆角/格式转换多图批处理 · 死链分级体检
   ========================================================================== */

(() => {
  'use strict';

  // ==================== 0. 种子数据读取与防崩兜底 ====================
  const DEFAULT_DATA = window.WS_DEFAULT_DATA || {};
  const FALLBACK_SPACES = [
    { id: 'home',     icon: '🏠', name: '首页聚焦',   grad: 'from-amber-500 to-rose-500',   virtual: true },
    { id: 'ai',       icon: '🤖', name: 'AI 创作',    grad: 'from-indigo-500 to-purple-600' },
    { id: 'cg',       icon: '🎮', name: 'CG & 3D',    grad: 'from-blue-500 to-cyan-500' },
    { id: 'media',    icon: '🎬', name: '媒体设计',   grad: 'from-fuchsia-500 to-orange-500' },
    { id: 'software', icon: '📦', name: '软件运维',   grad: 'from-emerald-500 to-teal-600' },
    { id: 'tools',    icon: '🛠️', name: '本地工具',   grad: 'from-cyan-500 to-indigo-600',  isTools: true }
  ];
  const FALLBACK_SPACE_GROUPS = {
    ai: ['🧠 对话与搜索', '🎨 绘画与 ComfyUI', '🎬 视频与音频'],
    cg: ['🎮 UE5 与实时特效', '🧊 3D 模型与扫描', '🏴‍☠️ 海外 CG 宝库', '🌍 PBR 材质与 HDRI'],
    media: ['🔥 社区与工作台', '✂️ 图像与文档工具', '🎨 字体、素材与音乐'],
    software: ['🧰 装机必备软件', '💻 绿色软件与脚本', '🌐 建站与云服务', '🚀 网络加速专线']
  };

  const SPACES_CONFIG = (Array.isArray(DEFAULT_DATA.SPACES_CONFIG) && DEFAULT_DATA.SPACES_CONFIG.length > 0)
    ? DEFAULT_DATA.SPACES_CONFIG
    : FALLBACK_SPACES;
  const INITIAL_SPACE_GROUPS = (DEFAULT_DATA.INITIAL_SPACE_GROUPS && typeof DEFAULT_DATA.INITIAL_SPACE_GROUPS === 'object')
    ? DEFAULT_DATA.INITIAL_SPACE_GROUPS
    : FALLBACK_SPACE_GROUPS;
  const INITIAL_BOOKMARKS = Array.isArray(DEFAULT_DATA.INITIAL_BOOKMARKS) ? DEFAULT_DATA.INITIAL_BOOKMARKS : [];

  // ==================== 1. 8 大纯本地效率小工具定义 ====================
  const BUILTIN_TOOLS = [
    { id: 'tool-json', title: 'JSON 格式化 / 压缩校验', desc: '纯浏览器本地校验、美化缩进与单行压缩 JSON 数据，支持一键复制结果', icon: '📋', type: 'json' },
    { id: 'tool-text', title: '字数统计 & 文本按行去重', desc: '实时统计总字符、中文字数、英文单词与行数，支持一键按行去重与清理空行', icon: '📝', type: 'text' },
    { id: 'tool-radius', title: '本地图片圆角合成器（支持批处理）', desc: '支持多图拖拽、多选与 Ctrl+V 贴图，基于 Canvas 纯本地批量导出透明圆角 PNG', icon: '🖼️', type: 'radius' },
    { id: 'tool-time', title: '时间戳 & UE5 材质颜色转换', desc: 'Unix 时间戳互转、HEX 转 RGB 及 UE5 Material 线性浮点 (0.0~1.0) 颜色换算', icon: '⏱️', type: 'time' },
    { id: 'tool-palette', title: '图片吸管取色 & 主色聚类调色板', desc: '支持 Ctrl+V 粘贴/拖拽原画，吸取 UE5 线性色值并智能聚类提取 6 大主色调', icon: '🎨', type: 'palette' },
    { id: 'tool-converter', title: '本地图片格式转换 & 批量压缩', desc: '支持多图拖入与 Ctrl+V 贴图，纯本地批量互转 WebP/PNG/JPG 并调节画质尺寸', icon: '🔄', type: 'converter' },
    { id: 'tool-cgcalc', title: 'CG 帧率时间码 & 分辨率计算', desc: '动画帧数(Frames)与时间码(24/25/30/60fps)互转，以及 16:9 / 21:9 画幅像素换算', icon: '🎬', type: 'cgcalc' },
    { id: 'tool-codec', title: '编码加解密 & 强密码生成', desc: '基于标准 UTF-8 的 Base64 / URL 编解码与高强度随机安全密钥一键生成', icon: '🔐', type: 'codec' }
  ];

  // ==================== 2. 官方原版矢量 SVG 图标字典 ====================
  const OFFICIAL_BRAND_SVGS = {
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

  const FALLBACK_FAVICON_SVG = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>';

  // ==================== 3. Chrome 扩展存储适配层 ====================
  const IS_EXTENSION = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
  const DEFAULT_WEATHER_CITY = '39.9042,116.4074,北京';
  const PRE_RESET_SNAPSHOT_KEY = 'ws_v11_pre_reset_snapshot';
  const KEYS = {
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
    syncConflict: 'ws_v11_sync_conflict'
  };

  async function storeGetAll(keyList) {
    if (IS_EXTENSION) {
      return new Promise(resolve => chrome.storage.local.get(keyList, res => resolve(res || {})));
    }
    const out = {};
    keyList.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw !== null) out[k] = JSON.parse(raw);
      } catch {
        const raw = localStorage.getItem(k);
        if (raw !== null) out[k] = raw;
      }
    });
    return out;
  }

  function storeSet(obj) {
    if (IS_EXTENSION) {
      chrome.storage.local.set(obj);
    } else {
      Object.entries(obj).forEach(([k, v]) => {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
      });
    }
  }

  // ==================== 4. 搜索引擎、拼音首字母引擎与运行时状态 ====================
  const ENGINE_ORDER = ['local', 'google', 'bing', 'github', 'bilibili', 'taobao', 'jd'];
  const SEARCH_ENGINES = {
    local:    { name: '站内书签', btnText: '筛选', placeholder: '输入多词(空格分隔)或拼音首字母检索（/ 聚焦 · Tab 切引擎 · 1-6 切空间 · Ctrl+点击后台打开）...', url: '' },
    google:   { name: 'Google',   btnText: 'Google 搜索', placeholder: '在 Google 中搜索全球技术文档、UE5 资料与 CG 教程，按回车直达...', url: 'https://www.google.com/search?q=' },
    bing:     { name: 'Bing',     btnText: '必应搜索', placeholder: '在微软 Bing 中搜索全球网页与技术资料，按回车直达...', url: 'https://cn.bing.com/search?q=' },
    github:   { name: 'GitHub',   btnText: '搜开源项目', placeholder: '在 GitHub 检索开源项目、ComfyUI 自定义节点与实用脚本...', url: 'https://github.com/search?q=' },
    bilibili: { name: 'B站',      btnText: '搜 B站视频', placeholder: '在 Bilibili 搜索 UE5 / ComfyUI / Houdini 视频教程与 UP 主...', url: 'https://search.bilibili.com/all?keyword=' },
    taobao:   { name: '淘宝',     btnText: '搜淘宝', placeholder: '在淘宝网搜索数码硬件、外设装备与设计素材商品，按回车直达...', url: 'https://s.taobao.com/search?q=' },
    jd:       { name: '京东',     btnText: '搜京东', placeholder: '在京东商城搜索显卡硬件、显示器、数码自营商品，按回车直达...', url: 'https://search.jd.com/Search?keyword=' }
  };

  const SPACE_GRAD_MAP = {
    ai: 'from-indigo-500 to-purple-600',
    cg: 'from-blue-500 to-cyan-500',
    media: 'from-fuchsia-500 to-orange-500',
    software: 'from-emerald-500 to-teal-600'
  };

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

  let bookmarks = [];
  let spaceGroups = { ai: [], cg: [], media: [], software: [] };
  let collapsedGroups = {};
  let todos = [];
  let recentVisits = [];
  let weatherCacheMap = {};
  let lastWeatherArgs = { lat: 39.9042, lon: 116.4074, cityName: '北京' };
  let currentNoteTab = 'memo';
  let currentSpace = 'home';
  let currentGroup = 'all';
  let currentEngine = 'local';
  let searchQuery = '';
  let isEditMode = false;
  let isRightPanelCollapsed = false;
  let draggedBookmarkId = null;
  let draggedGroupInfo = null;
  let contextMenuBmId = null;
  let kbdSelectedIndex = -1;
  let currentToolType = '';
  let lastDeletedUndo = null;
  let linkCheckAbortController = null;

  let ghSyncConfig = { token: '', gistId: '', autoSync: true, lastSyncAt: 0, lastRemoteUpdatedAt: 0 };
  let localUpdatedAt = 0;
  let autoSyncTimer = null;
  let configSaveTimer = null;
  let memoWriteTimer = null;
  let isSyncing = false;
  let pendingPushAfterSync = false;
  let lastWakePullAt = 0;
  let isInternalStorageWrite = false;

  const offlineIconMapByUrl = new Map();
  const offlineIconMapByHost = new Map();
  const hdUpgradedCache = new Map();
  const iconBustMap = new Map();
  const spotlightBoundSet = new WeakSet();

  const toolSessionCache = {
    json: '',
    text: '',
    radiusVal: '36',
    ts: '',
    hex: '#6366f1',
    pickedHex: '#6366F1',
    pickedRgb: 'rgb(99, 102, 241)',
    pickedUe: 'UE5 Linear: (R=0.388, G=0.400, B=0.945)',
    convFormat: 'image/jpeg',
    convScale: '1',
    convQuality: '88',
    cgFps: '30',
    cgFrames: '150',
    cgRatio: '16:9',
    cgWidth: '1920',
    codec: '',
    pwd: ''
  };

  // 多图批处理队列状态（圆角合成器 & 格式转换器）
  let radiusBatchItems = [];
  let radiusActiveIdx = 0;
  let convBatchItems = [];
  let convActiveIdx = 0;
  let paletteSourceImg = null;

  // ==================== 5. 初始化生命周期 ====================
  async function initApp() {
    const badgeEl = document.getElementById('storageStatusBadge');
    if (badgeEl) {
      badgeEl.textContent = IS_EXTENSION ? 'Chrome 扩展本地存储 (chrome.storage.local)' : '浏览器本地存储 (localStorage)';
    }

    buildOfflineIconMaps();
    const saved = await storeGetAll(Object.values(KEYS));

    applyThemeUI(saved[KEYS.theme] === 'light' ? 'light' : 'dark');
    setAccentColor(saved[KEYS.accent] || 'indigo', false, true);
    isRightPanelCollapsed = saved[KEYS.rightPanel] === 'collapsed';
    applyRightPanelUI();
    initBrandLogo(saved[KEYS.customLogo] || '');

    if (Array.isArray(saved[KEYS.bookmarks]) && saved[KEYS.bookmarks].length > 0 && saved[KEYS.bookmarks][0].space) {
      bookmarks = saved[KEYS.bookmarks];
    } else {
      bookmarks = JSON.parse(JSON.stringify(INITIAL_BOOKMARKS));
      if (bookmarks.length > 0) storeSet({ [KEYS.bookmarks]: bookmarks });
    }

    if (saved[KEYS.spaceGroups] && typeof saved[KEYS.spaceGroups] === 'object') {
      spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...saved[KEYS.spaceGroups] };
    } else {
      spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
      storeSet({ [KEYS.spaceGroups]: spaceGroups });
    }

    if (Array.isArray(saved[KEYS.pendingSaves]) && saved[KEYS.pendingSaves].length > 0) {
      let merged = 0;
      saved[KEYS.pendingSaves].forEach(item => {
        if (!bookmarks.some(b => canonicalUrlKey(b.url) === canonicalUrlKey(item.url))) {
          bookmarks.unshift(item);
          if (!spaceGroups[item.space]) spaceGroups[item.space] = [];
          if (!spaceGroups[item.space].includes(item.group)) spaceGroups[item.space].push(item.group);
          merged++;
        }
      });
      storeSet({ [KEYS.pendingSaves]: [] });
      if (merged > 0) saveCoreState(false);
    }

    collapsedGroups = (saved[KEYS.collapsed] && typeof saved[KEYS.collapsed] === 'object') ? saved[KEYS.collapsed] : {};
    recentVisits = Array.isArray(saved[KEYS.recentVisits]) ? saved[KEYS.recentVisits] : [];
    todos = Array.isArray(saved[KEYS.todos]) ? saved[KEYS.todos] : [];
    weatherCacheMap = (saved[KEYS.weatherCache] && typeof saved[KEYS.weatherCache] === 'object') ? saved[KEYS.weatherCache] : {};

    if (saved[KEYS.ghSync] && typeof saved[KEYS.ghSync] === 'object') {
      ghSyncConfig = { token: '', gistId: '', autoSync: true, lastSyncAt: 0, lastRemoteUpdatedAt: 0, ...saved[KEYS.ghSync] };
    }
    localUpdatedAt = typeof saved[KEYS.updatedAt] === 'number' ? saved[KEYS.updatedAt] : 0;

    if (saved[KEYS.syncConflict]) showSyncConflictBanner(saved[KEYS.syncConflict]);

    hydrateOfflineBase64Icons(true);

    const memoArea = document.getElementById('quickMemoArea');
    const savedMemo = typeof saved[KEYS.memo] === 'string' ? saved[KEYS.memo] : '';
    if (memoArea) memoArea.value = savedMemo;
    updateMemoCount(savedMemo);
    renderTodoList();
    switchNoteTab(saved[KEYS.noteTab] || 'memo', false);

    bindAllEvents();
    bindExtensionStorageWatcher();

    const urlQ = new URLSearchParams(window.location.search).get('q');
    if (urlQ && urlQ.trim()) {
      const sInput = document.getElementById('searchInput');
      if (sInput) sInput.value = urlQ.trim();
      searchQuery = urlQ.trim();
      kbdSelectedIndex = 0;
      document.getElementById('clearSearchBtn')?.classList.remove('hidden');
    }

    switchSpace('home', 'all');
    initClockAndCNY();
    initWeather(saved[KEYS.city] || DEFAULT_WEATHER_CITY);
    updateSyncBadgeUI();
    autoSyncOnStartup();

    if (bookmarks.length === 0 && INITIAL_BOOKMARKS.length === 0) {
      showToast('⚠️ 未检测到 js/default-bookmarks.js，请确认文件位于 js/ 目录并在 index.html 中引入', { duration: 6000 });
    }
  }

  function bindExtensionStorageWatcher() {
    if (!IS_EXTENSION || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || isInternalStorageWrite) return;
      let needRender = false;
      if (changes[KEYS.bookmarks]?.newValue) {
        bookmarks = changes[KEYS.bookmarks].newValue;
        hydrateOfflineBase64Icons(true);
        needRender = true;
      }
      if (changes[KEYS.spaceGroups]?.newValue) {
        spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...changes[KEYS.spaceGroups].newValue };
        needRender = true;
      }
      if (changes[KEYS.ghSync]?.newValue) {
        ghSyncConfig = { token: '', gistId: '', autoSync: true, lastSyncAt: 0, lastRemoteUpdatedAt: 0, ...changes[KEYS.ghSync].newValue };
        updateSyncBadgeUI();
      }
      if (changes[KEYS.updatedAt]?.newValue) {
        localUpdatedAt = changes[KEYS.updatedAt].newValue;
      }
      if (changes[KEYS.syncConflict]) {
        const cf = changes[KEYS.syncConflict].newValue;
        if (cf) showSyncConflictBanner(cf);
        else hideSyncConflictBanner();
      }
      if (changes.ws_v11_last_quick_save?.newValue) {
        const qs = changes.ws_v11_last_quick_save.newValue;
        const spName = SPACES_CONFIG.find(s => s.id === qs.space)?.name || qs.space;
        showToast(qs.existed ? `💡 「${qs.title}」已在「${spName} · ${qs.group}」` : `⚡ 已收藏「${qs.title}」至「${spName} · ${qs.group}」`, { duration: 4000 });
      }
      if (needRender) {
        renderSpaceDock();
        renderSidebarGroups();
        renderMainContent();
      }
    });
  }

  function writeStoreInternal(obj) {
    isInternalStorageWrite = true;
    storeSet(obj);
    setTimeout(() => { isInternalStorageWrite = false; }, 120);
  }

  // ==================== 6. 品牌 Logo、主题、强调色与右栏折叠 ====================
  const LOGO_CANDIDATES = ['logo.png', 'logo.svg', 'logo.webp', 'logo.jpg'];
  let logoCandidateIdx = 0;

  function initBrandLogo(savedBase64) {
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

    if (savedBase64) {
      img.src = savedBase64;
      if (fav) fav.href = savedBase64;
    } else if (img.complete && img.naturalWidth > 0) {
      img.classList.remove('hidden');
      if (fb) fb.classList.add('hidden');
    }
  }

  function handleBrandLogoUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result;
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

  function applyThemeUI(mode) {
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

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const mode = isDark ? 'dark' : 'light';
    writeStoreInternal({ [KEYS.theme]: mode });
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    markLocalChangeAndSync();
    showToast(isDark ? '🌙 已切换至深邃极光暗色模式' : '☀️ 已切换至通透浅色模式');
  }

  function setAccentColor(colorName, notify = true, skipSync = false) {
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

  function toggleAccentPopover(e) {
    if (e) e.stopPropagation();
    closeRecentPopover();
    closeCardContextMenu();
    document.getElementById('accentColorPopover')?.classList.toggle('hidden');
  }
  function closeAccentPopover() { document.getElementById('accentColorPopover')?.classList.add('hidden'); }

  function toggleRightPanel() {
    isRightPanelCollapsed = !isRightPanelCollapsed;
    writeStoreInternal({ [KEYS.rightPanel]: isRightPanelCollapsed ? 'collapsed' : 'expanded' });
    applyRightPanelUI();
    renderMainContent();
    markLocalChangeAndSync();
    showToast(isRightPanelCollapsed ? '◧ 已收起右侧仪表盘，卡片区已自动拓宽' : '◧ 已展开右侧实时仪表盘');
  }

  function applyRightPanelUI() {
    const panel = document.getElementById('rightTelemetryPanel');
    const btn = document.getElementById('toggleRightPanelBtn');
    if (panel) panel.classList.toggle('hidden', isRightPanelCollapsed);
    if (btn) {
      btn.classList.toggle('theme-badge', !isRightPanelCollapsed);
      btn.title = isRightPanelCollapsed ? '展开右侧状态仪表盘' : '收起右侧状态仪表盘';
    }
  }

  // ==================== 7. 双层渐进式超清图标引擎（支持单站右键强制刷新） ====================
  const BROKEN_BASE64_HOSTS = new Set(['photomosh.com', 'www.world-creator.com', 'www.pbrmax.cn']);

  function buildOfflineIconMaps() {
    if (!Array.isArray(window.DEFAULT_BOOKMARKS)) return;
    window.DEFAULT_BOOKMARKS.forEach(item => {
      if (item.icon && item.icon.startsWith('data:image')) {
        const h = (item.host || extractDomain(item.url)).toLowerCase();
        if (BROKEN_BASE64_HOSTS.has(h)) return;
        if (item.url) {
          offlineIconMapByUrl.set(normalizeUrl(item.url), item.icon);
          const cleanPath = getOriginAndPath(item.url);
          if (cleanPath) offlineIconMapByUrl.set(cleanPath, item.icon);
        }
        if (h && !(h === 'github.com' && item.id === 'bm_4')) {
          if (!offlineIconMapByHost.has(h)) offlineIconMapByHost.set(h, item.icon);
          const rootH = h.replace(/^www\./, '');
          if (!offlineIconMapByHost.has(rootH)) offlineIconMapByHost.set(rootH, item.icon);
        }
      }
    });
    if (offlineIconMapByHost.has('www.unrealengine.com')) {
      offlineIconMapByHost.set('www.fab.com', offlineIconMapByHost.get('www.unrealengine.com'));
      offlineIconMapByHost.set('fab.com', offlineIconMapByHost.get('www.unrealengine.com'));
    }
  }

  function hydrateOfflineBase64Icons(skipSync = true) {
    let updated = false;
    bookmarks.forEach(bm => {
      if (iconBustMap.has(bm.id)) return;
      const matched = findOfflineBase64(bm.url);
      if (matched && bm.icon !== matched && !bm.customIcon) {
        bm.icon = matched;
        updated = true;
      }
    });
    if (updated) saveCoreState(skipSync);
  }

  function findOfflineBase64(url) {
    if (!url) return '';
    const norm = normalizeUrl(url);
    const pathKey = getOriginAndPath(url);
    const h = extractDomain(url).toLowerCase();
    const rootH = h.replace(/^www\./, '');
    return offlineIconMapByUrl.get(norm) || offlineIconMapByUrl.get(pathKey) || offlineIconMapByHost.get(h) || offlineIconMapByHost.get(rootH) || '';
  }

  function getHighDefIconInfo(bm) {
    const host = extractDomain(bm.url).toLowerCase();
    const cleanHost = host.replace(/^www\./, '');
    const bustTs = iconBustMap.get(bm.id);

    if (bm.customIcon && !bustTs) return { primarySrc: bm.customIcon, hd1: '', hd2: '', fb1: '', host };

    if (!bustTs) {
      for (const [domainKey, svgDataUri] of Object.entries(OFFICIAL_BRAND_SVGS)) {
        if (cleanHost === domainKey || cleanHost.endsWith('.' + domainKey)) {
          return { primarySrc: svgDataUri, hd1: '', hd2: '', fb1: '', host };
        }
      }
    }

    const isPrivateHost = !host || host.includes('hzpipeline.com') || host.includes('192.168.');
    const suffix = bustTs ? `&_t=${bustTs}` : '';
    const iowenSuffix = bustTs ? `?_t=${bustTs}` : '';
    const favImHd = !isPrivateHost ? `https://favicon.im/${host}?larger=true${suffix}` : '';
    const googleHd = !isPrivateHost ? `https://www.google.com/s2/favicons?domain=${host}&sz=128${suffix}` : '';
    const iowenHd = !isPrivateHost ? `https://api.iowen.cn/favicon/${host}.png${iowenSuffix}` : '';

    if (bustTs) {
      return { primarySrc: favImHd || googleHd, hd1: '', hd2: iowenHd, fb1: googleHd || findOfflineBase64(bm.url), host };
    }

    if (hdUpgradedCache.has(host)) {
      return { primarySrc: hdUpgradedCache.get(host), hd1: '', hd2: '', fb1: findOfflineBase64(bm.url), host };
    }

    const offlineBase64 = (bm.icon && bm.icon.startsWith('data:image')) ? bm.icon : findOfflineBase64(bm.url);
    if (offlineBase64) return { primarySrc: offlineBase64, hd1: favImHd, hd2: googleHd, fb1: iowenHd, host };
    return { primarySrc: favImHd || googleHd, hd1: '', hd2: iowenHd, fb1: googleHd || iowenHd, host };
  }

  function handleIconLoad(imgEl) {
    if (imgEl.naturalWidth > 0 && imgEl.naturalWidth <= 1 && imgEl.naturalHeight <= 1) {
      handleIconError(imgEl);
      return;
    }
    if (imgEl.getAttribute('data-hd-upgraded') !== '1' && imgEl.naturalWidth > 0 && imgEl.naturalWidth < 48) {
      const hd1 = imgEl.getAttribute('data-hd1');
      const hd2 = imgEl.getAttribute('data-hd2');
      const host = imgEl.getAttribute('data-host') || '';
      if (!hd1 && !hd2) return;
      imgEl.setAttribute('data-hd-upgraded', '1');
      const tryUpgrade = (srcUrl, nextUrl) => {
        if (!srcUrl) return;
        const probe = new Image();
        probe.onload = () => {
          if (probe.naturalWidth >= 32 && probe.naturalWidth > imgEl.naturalWidth) {
            imgEl.src = srcUrl;
            if (host) hdUpgradedCache.set(host, srcUrl);
          } else if (nextUrl) {
            tryUpgrade(nextUrl, '');
          }
        };
        probe.onerror = () => { if (nextUrl) tryUpgrade(nextUrl, ''); };
        probe.src = srcUrl;
      };
      tryUpgrade(hd1, hd2);
    }
  }

  function handleIconError(imgEl) {
    const step = parseInt(imgEl.getAttribute('data-step') || '0', 10);
    const fb1 = imgEl.getAttribute('data-fb1') || '';
    const hd2 = imgEl.getAttribute('data-hd2') || '';
    if (step === 0 && fb1 && imgEl.src !== fb1) { imgEl.setAttribute('data-step', '1'); imgEl.src = fb1; return; }
    if (step <= 1 && hd2 && imgEl.src !== hd2) { imgEl.setAttribute('data-step', '2'); imgEl.src = hd2; return; }
    imgEl.style.display = 'none';
    if (imgEl.nextElementSibling) imgEl.nextElementSibling.style.display = 'flex';
  }

  function markLocalChangeAndSync() {
    localUpdatedAt = Date.now();
    writeStoreInternal({ [KEYS.updatedAt]: localUpdatedAt });
    scheduleAutoSync();
  }

  function saveCoreState(skipSync = false) {
    if (!skipSync) {
      localUpdatedAt = Date.now();
      writeStoreInternal({ [KEYS.bookmarks]: bookmarks, [KEYS.spaceGroups]: spaceGroups, [KEYS.updatedAt]: localUpdatedAt });
      scheduleAutoSync();
    } else {
      writeStoreInternal({ [KEYS.bookmarks]: bookmarks, [KEYS.spaceGroups]: spaceGroups, [KEYS.updatedAt]: localUpdatedAt });
    }
  }

  function getGroupsForSpace(spaceId) {
    const set = new Set(spaceGroups[spaceId] || []);
    bookmarks.forEach(b => {
      if (b.space === spaceId && b.group) set.add(b.group);
    });
    return Array.from(set);
  }

  // ==================== 8. 空间 Dock 与左侧分组目录渲染 ====================
  function switchSpace(spaceId, group = 'all') {
    currentSpace = spaceId;
    currentGroup = group;
    kbdSelectedIndex = -1;
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
  }

  function renderSpaceDock() {
    const dock = document.getElementById('spaceDockBar');
    if (!dock) return;

    dock.innerHTML = SPACES_CONFIG.map((sp, idx) => {
      const active = currentSpace === sp.id && !searchQuery.trim();
      let count = 0;
      if (sp.id === 'home') count = bookmarks.filter(b => b.pinned).length;
      else if (sp.isTools) count = BUILTIN_TOOLS.length;
      else count = bookmarks.filter(b => b.space === sp.id).length;

      const dropType = (isEditMode && !sp.isTools)
        ? (sp.id === 'home' ? 'data-drop-type="pin"' : `data-drop-type="space" data-drop-space="${sp.id}"`)
        : '';

      return `
        <button
          type="button"
          data-dock-space="${sp.id}"
          title="快捷键 ${idx + 1} 快速切换至${sp.name}"
          ${dropType}
          class="shrink-0 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
            active
              ? 'dock-item-active border-transparent'
              : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-800/80'
          }"
        >
          <span>${sp.icon}</span>
          <span>${sp.name}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
            active
              ? 'bg-white/20 text-white'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }">${count}</span>
        </button>
      `;
    }).join('');
  }

  function renderSidebarGroups() {
    const nav = document.getElementById('categoryNav');
    const header = document.getElementById('sidebarGroupHeader');
    const badge = document.getElementById('sidebarCountBadge');
    const addBtn = document.getElementById('addGroupBtn');
    const dragTip = document.getElementById('sidebarDragTip');
    if (!nav) return;

    const spObj = SPACES_CONFIG.find(s => s.id === currentSpace) || SPACES_CONFIG[0] || { id: 'home', name: '首页聚焦', virtual: true };
    if (header) header.textContent = spObj.name;
    if (addBtn) addBtn.classList.toggle('hidden', !!spObj.virtual || !!spObj.isTools);
    if (dragTip) dragTip.classList.toggle('hidden', !isEditMode || !!spObj.isTools);

    let html = '';

    if (currentSpace === 'home') {
      const pinnedCount = bookmarks.filter(b => b.pinned).length;
      const recentCount = recentVisits.filter(r => bookmarks.some(b => b.id === r.id)).length;
      if (badge) badge.textContent = bookmarks.length;

      const quickSavedCount = bookmarks.filter(b => b.quickSavedAt).length;
      const homeItems = [
        { key: 'all', icon: '⚡', label: '聚焦总览 (置顶+高频)', count: pinnedCount, droppablePin: false },
        { key: 'quick', icon: '📥', label: '最近快捷收藏', count: quickSavedCount, droppablePin: false },
        { key: 'pinned', icon: '⭐', label: '常用置顶站点', count: pinnedCount, droppablePin: true },
        { key: 'recent', icon: '🕒', label: '最近高频访问', count: recentCount, droppablePin: false },
        { key: 'everything', icon: '📚', label: `全站 ${bookmarks.length} 书签汇总`, count: bookmarks.length, droppablePin: false }
      ];

      html = homeItems.map(item => {
        const active = currentGroup === item.key;
        const dropAttr = (isEditMode && item.droppablePin) ? 'data-drop-type="pin"' : '';
        return `
          <button type="button" data-nav-space="home" data-nav-group="${item.key}" ${dropAttr} class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
            active ? 'theme-badge font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border-transparent'
          }">
            <span class="flex items-center gap-2 truncate"><span class="nav-icon">${item.icon}</span><span class="truncate">${item.label}</span></span>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${item.count}</span>
          </button>
        `;
      }).join('');

      html += `<div class="hidden lg:block pt-3 mt-2 border-t border-slate-200/60 dark:border-slate-800/80 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">空间分组直达</div>`;
      SPACES_CONFIG.filter(s => !s.virtual && !s.isTools).forEach(sp => {
        const spCount = bookmarks.filter(b => b.space === sp.id).length;
        const dropAttr = isEditMode ? `data-drop-type="space" data-drop-space="${sp.id}"` : '';
        html += `
          <button type="button" data-nav-space="${sp.id}" data-nav-group="all" ${dropAttr} class="nav-btn hidden lg:flex w-full items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border border-transparent transition-all">
            <span class="flex items-center gap-2 truncate"><span class="nav-icon">${sp.icon}</span><span class="truncate">${sp.name}</span></span>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${spCount}</span>
          </button>
        `;
      });
    } else if (currentSpace === 'tools') {
      if (badge) badge.textContent = BUILTIN_TOOLS.length;
      html = `
        <button type="button" data-nav-space="tools" data-nav-group="all" class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold theme-badge border transition-all">
          <span class="flex items-center gap-2 truncate"><span class="nav-icon">🛠️</span><span>全部本地工具</span></span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800">${BUILTIN_TOOLS.length}</span>
        </button>
      `;
      BUILTIN_TOOLS.forEach(t => {
        html += `
          <button type="button" data-open-tool="${t.type}" class="nav-btn shrink-0 w-auto lg:w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border border-transparent transition-all">
            <span class="nav-icon">${t.icon}</span>
            <span class="truncate">${escapeHtml(t.title)}</span>
          </button>
        `;
      });
    } else {
      const groups = getGroupsForSpace(currentSpace);
      const spaceItems = bookmarks.filter(b => b.space === currentSpace);
      if (badge) badge.textContent = spaceItems.length;

      html = `
        <button type="button" data-nav-space="${currentSpace}" data-nav-group="all" class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
          currentGroup === 'all' ? 'theme-badge font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border-transparent'
        }">
          <span class="flex items-center gap-2 truncate"><span class="nav-icon">⚡</span><span>全部${spObj.name}</span></span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${spaceItems.length}</span>
        </button>
      `;

      groups.forEach(gName => {
        const active = currentGroup === gName;
        const count = spaceItems.filter(b => b.group === gName).length;
        const m = gName.match(/^(\S+)\s+(.*)$/);
        const icon = m ? m[1] : '📁';
        const label = m ? m[2] : gName;
        const escG = escapeHtml(gName);

        const dragAttrs = isEditMode
          ? `draggable="true" data-drag-group-space="${currentSpace}" data-drag-group-name="${escG}" data-drop-type="group" data-drop-space="${currentSpace}" data-drop-group="${escG}"`
          : '';

        const groupOps = isEditMode ? `
          <span class="flex items-center gap-0.5 shrink-0 ml-1">
            <span data-group-op="rename" data-op-space="${currentSpace}" data-op-group="${escG}" title="重命名分组" class="w-5 h-5 rounded hover:bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] cursor-pointer">✏️</span>
            <span data-group-op="delete" data-op-space="${currentSpace}" data-op-group="${escG}" title="删除分组" class="w-5 h-5 rounded hover:bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] cursor-pointer">✕</span>
          </span>
        ` : '';

        html += `
          <button type="button" data-nav-space="${currentSpace}" data-nav-group="${escG}" ${dragAttrs} class="nav-btn shrink-0 w-auto lg:w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
            active ? 'theme-badge font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 border-transparent'
          }">
            <span class="flex items-center gap-1.5 truncate min-w-0">
              ${isEditMode ? `<span class="text-[10px] text-amber-500/80 select-none cursor-grab">⠿</span>` : ''}
              <span class="nav-icon text-sm">${icon}</span>
              <span class="truncate">${escapeHtml(label)}</span>
            </span>
            <span class="flex items-center shrink-0">
              <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${count}</span>
              ${groupOps}
            </span>
          </button>
        `;
      });
    }

    nav.innerHTML = html;
  }

  function promptAddGroup() {
    const spObj = SPACES_CONFIG.find(s => s.id === currentSpace);
    if (!spObj || spObj.virtual || spObj.isTools) return;
    const input = prompt(`请在「${spObj.name}」空间下输入新分组名称（可带 Emoji，例如：🌟 常用收藏）：`);
    if (!input || !input.trim()) return;
    const raw = input.trim();
    const formatted = raw.match(/^\S+\s+/) ? raw : `📁 ${raw}`;

    if (!spaceGroups[currentSpace]) spaceGroups[currentSpace] = [];
    if (getGroupsForSpace(currentSpace).includes(formatted)) {
      switchSpace(currentSpace, formatted);
      showToast('💡 该分组已存在，已自动切换');
      return;
    }
    spaceGroups[currentSpace].push(formatted);
    saveCoreState();
    switchSpace(currentSpace, formatted);
    showToast(`🎉 已新建分组：${formatted}`);
  }

  function renameGroup(spaceId, oldName) {
    const input = prompt(`将分组「${oldName}」重命名为：`, oldName);
    if (!input || !input.trim() || input.trim() === oldName) return;
    const newName = input.trim().match(/^\S+\s+/) ? input.trim() : `📁 ${input.trim()}`;
    if (!spaceGroups[spaceId]) spaceGroups[spaceId] = [];
    spaceGroups[spaceId] = spaceGroups[spaceId].map(g => g === oldName ? newName : g);
    if (!spaceGroups[spaceId].includes(newName)) spaceGroups[spaceId].push(newName);
    bookmarks.forEach(b => { if (b.space === spaceId && b.group === oldName) b.group = newName; });
    if (currentGroup === oldName) currentGroup = newName;
    saveCoreState();
    renderSidebarGroups();
    renderMainContent();
    showToast(`✏️ 分组已更名为「${newName}」`);
  }

  function deleteGroup(spaceId, groupName) {
    const groups = getGroupsForSpace(spaceId);
    if (groups.length <= 1) { showToast('⚠️ 每个空间至少需保留 1 个分组'); return; }
    const affected = bookmarks.filter(b => b.space === spaceId && b.group === groupName).length;
    const fallbackGroup = groups.find(g => g !== groupName);
    const msg = affected > 0
      ? `确定删除分组「${groupName}」吗？该分组内的 ${affected} 个书签将安全转移至「${fallbackGroup}」（不会删除书签）。`
      : `确定删除空分组「${groupName}」吗？`;
    if (!confirm(msg)) return;

    bookmarks.forEach(b => { if (b.space === spaceId && b.group === groupName) b.group = fallbackGroup; });
    spaceGroups[spaceId] = (spaceGroups[spaceId] || []).filter(g => g !== groupName);
    if (currentGroup === groupName) currentGroup = 'all';
    saveCoreState();
    renderSidebarGroups();
    renderMainContent();
    showToast(`🗑️ 已删除分组「${groupName}」`);
  }

  // ==================== 9. 主内容区渲染（多词空格 AND + 拼音首字母 + 高频加权检索） ====================
  function getCardGridClass() {
    return isRightPanelCollapsed
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5';
  }

  function searchBookmarksWeighted(query) {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const visitMap = new Map(recentVisits.map(r => [r.id, r.count || 1]));

    return bookmarks
      .map(bm => {
        const title = (bm.title || '').toLowerCase();
        const desc = (bm.desc || '').toLowerCase();
        const url = (bm.url || '').toLowerCase();
        const group = (bm.group || '').toLowerCase();
        const titlePy = getPinyinInitials(bm.title || '');
        const descPy = getPinyinInitials(bm.desc || '');
        const groupPy = getPinyinInitials(bm.group || '');

        let score = 0;
        for (const tk of tokens) {
          let tkScore = 0;
          if (title === tk) tkScore += 200;
          else if (title.startsWith(tk)) tkScore += 140;
          else if (title.includes(tk)) tkScore += 100;
          else if (titlePy.includes(tk)) tkScore += 85;

          if (url.includes(tk)) tkScore += 65;
          if (desc.includes(tk) || group.includes(tk)) tkScore += 35;
          else if (descPy.includes(tk) || groupPy.includes(tk)) tkScore += 25;

          if (tkScore === 0) return null; // 多关键词严格 AND 匹配
          score += tkScore;
        }

        score += Math.min(60, (visitMap.get(bm.id) || 0) * 6) + (bm.pinned ? 18 : 0);
        return { bm, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map(item => item.bm);
  }

  function createBookmarkCardHtml(bm, opts = {}) {
    const host = extractDomain(bm.url);
    const firstChar = ((bm.title || host || 'W').replace(/[^\w\u4e00-\u9fa5]/g, '')[0] || '⚡').toUpperCase();
    const gradClass = SPACE_GRAD_MAP[bm.space] || 'from-indigo-500 to-purple-600';
    const { primarySrc, hd1, hd2, fb1 } = getHighDefIconInfo(bm);
    const safeUrl = escapeHtml(bm.url || '#');
    const safeId = escapeHtml(bm.id);
    const isQuickSection = !!opts.isQuickSection;

    let footerHtml = '';
    if (isEditMode) {
      footerHtml = `
        <div class="card-action-bar mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-1 relative z-20">
          <div class="flex items-center gap-1">
            <button type="button" data-card-action="pin" data-bm-id="${safeId}" title="${bm.pinned ? '取消首页置顶' : '置顶到首页聚焦'}" class="px-1.5 py-1 rounded-lg ${bm.pinned ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'} text-[11px] font-bold transition">
              ${bm.pinned ? '⭐' : '☆'}
            </button>
            <button type="button" data-card-action="move" data-bm-id="${safeId}" title="移动到其他空间或分组" class="px-2 py-1 rounded-lg bg-indigo-500/12 hover:bg-indigo-500 hover:text-white text-[11px] font-semibold text-indigo-500 dark:text-indigo-300 transition flex items-center gap-0.5">
              <span>📂</span><span>移动</span>
            </button>
          </div>
          <div class="flex items-center gap-1">
            ${isQuickSection ? `<button type="button" data-card-action="dismiss-quick" data-bm-id="${safeId}" title="仅移出快捷收藏列表，不删除书签" class="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-[11px] font-semibold text-emerald-500 transition">✓ 移出</button>` : ''}
            <button type="button" data-card-action="edit" data-bm-id="${safeId}" class="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-[11px] font-semibold text-amber-600 dark:text-amber-400 transition">编辑</button>
            <button type="button" data-card-action="delete" data-bm-id="${safeId}" class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-[11px] font-semibold text-rose-600 dark:text-rose-400 transition">删除</button>
          </div>
        </div>
      `;
    } else if (isQuickSection) {
      const spObj = SPACES_CONFIG.find(s => s.id === bm.space);
      const locLabel = `${spObj ? spObj.icon : '📁'} ${bm.group || ''}`.trim();
      footerHtml = `
        <div class="card-action-bar mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 relative z-20">
          <span class="text-[10px] text-slate-400 truncate" title="存放位置：${escapeHtml(locLabel)}">${escapeHtml(locLabel)}</span>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" data-card-action="move" data-bm-id="${safeId}" title="移动到其他空间或分组" class="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-300 transition">📂 换组</button>
            <button type="button" data-card-action="dismiss-quick" data-bm-id="${safeId}" title="移出快捷收藏（书签仍保留在原分组）" class="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 border border-emerald-500/20 text-[10px] font-bold transition">✓ 移出</button>
          </div>
        </div>
      `;
    }

    return `
      <div
        data-bm-id="${safeId}"
        data-kbd-type="bookmark"
        data-kbd-url="${safeUrl}"
        ${isEditMode ? 'draggable="true"' : ''}
        class="specular-card spotlight-card bookmark-card rounded-2xl p-4 cursor-pointer flex flex-col justify-between group h-full"
      >
        <div class="flex items-start gap-3.5 relative z-10 pointer-events-none">
          <div class="icon-wrapper shrink-0 mt-0.5">
            <div class="icon-container w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-center shadow-sm">
              ${primarySrc ? `
                <img
                  src="${escapeHtml(primarySrc)}"
                  data-hd1="${escapeHtml(hd1)}"
                  data-hd2="${escapeHtml(hd2)}"
                  data-fb1="${escapeHtml(fb1)}"
                  data-host="${escapeHtml(host)}"
                  data-step="0"
                  alt=""
                  loading="lazy"
                  class="icon-img w-7 h-7 object-contain rounded-md"
                >
                <span class="hidden icon-img w-full h-full items-center justify-center font-extrabold text-sm bg-gradient-to-br ${gradClass} text-white rounded-xl">${escapeHtml(firstChar)}</span>
              ` : `
                <span class="icon-img w-full h-full flex items-center justify-center font-extrabold text-sm bg-gradient-to-br ${gradClass} text-white rounded-xl">${escapeHtml(firstChar)}</span>
              `}
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-1.5">
              <h3 class="font-bold text-[13.5px] text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors leading-snug break-words">
                ${escapeHtml(bm.title || host)}
              </h3>
              <span class="launch-arrow text-xs font-mono shrink-0 mt-0.5">${isEditMode ? '⠿' : '↗'}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed break-words">
              ${escapeHtml(bm.desc || host)}
            </p>
          </div>
        </div>
        ${footerHtml}
      </div>
    `;
  }

  function createToolCardHtml(tool) {
    return `
      <div
        data-kbd-type="tool"
        data-open-tool="${tool.type}"
        class="specular-card spotlight-card bookmark-card rounded-2xl p-4 cursor-pointer flex items-start gap-3.5 group h-full"
      >
        <div class="icon-wrapper shrink-0">
          <div class="icon-container w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-xl shadow-sm">
            <span class="icon-img">${tool.icon}</span>
          </div>
        </div>
        <div class="min-w-0 flex-1 relative z-10">
          <div class="flex items-center justify-between gap-1">
            <h3 class="font-bold text-[13.5px] text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">${escapeHtml(tool.title)}</h3>
            <span class="launch-arrow text-xs font-bold">⚡</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed break-words">${escapeHtml(tool.desc)}</p>
        </div>
      </div>
    `;
  }

  function renderBuiltinToolsSection(toolsList) {
    return `
      <section class="space-y-3.5">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl theme-badge border flex items-center justify-center text-base shadow-sm">🛠️</span>
            <h2 class="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
              <span>纯本地效率小工具</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded-full theme-badge border">${toolsList.length}</span>
            </h2>
          </div>
          <span class="text-[11px] text-slate-400 hidden sm:inline">支持多图批处理与 Ctrl+V 贴图 · 自动暂存防误关</span>
        </div>
        <div class="${getCardGridClass()}">
          ${toolsList.map(tool => createToolCardHtml(tool)).join('')}
        </div>
      </section>
    `;
  }

  function renderGroupSectionHtml(spaceId, groupName, items, allowEmptyDrop = false, allowCollapse = true, opts = {}) {
    const m = groupName.match(/^(\S+)\s+(.*)$/);
    const icon = m ? m[1] : '📁';
    const cleanTitle = m ? m[2] : groupName;
    const escG = escapeHtml(groupName);
    const collapseKey = `${spaceId || 'search'}::${groupName}`;
    const isSearching = !!(searchQuery.trim() && currentEngine === 'local');
    const isCollapsed = allowCollapse && !isSearching && !!collapsedGroups[collapseKey];
    const isQuickSection = !!opts.isQuickSection;

    const sectionDropAttrs = (isEditMode && spaceId && spaceId !== 'home')
      ? `data-drop-section-space="${spaceId}" data-drop-section-group="${escG}"`
      : '';

    let bodyHtml = '';
    if (!isCollapsed) {
      bodyHtml = items.length > 0
        ? `<div class="${getCardGridClass()}">${items.map(bm => createBookmarkCardHtml(bm, { isQuickSection })).join('')}</div>`
        : (allowEmptyDrop ? `
          <div class="specular-card rounded-2xl p-8 text-center border-dashed border-2 border-slate-300/70 dark:border-slate-700/70 space-y-2">
            <div class="text-2xl">📂</div>
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">分组「${escapeHtml(cleanTitle)}」暂无书签，可直接拖入卡片或点击添加</div>
            <button type="button" data-empty-add-bm="1" class="px-3.5 py-1.5 rounded-xl theme-solid-bg text-white text-xs font-semibold">＋ 添加书签至此分组</button>
          </div>
        ` : '');
    }

    if (!isCollapsed && !bodyHtml) return '';

    const rightHeaderHtml = isQuickSection && items.length > 0
      ? `<button type="button" data-clear-all-quick="1" title="一键移出全部快捷收藏（不删除书签本身）" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-300 transition shrink-0">🧹 清空列表</button>`
      : (isEditMode && spaceId && spaceId !== 'home' ? `<span class="text-[11px] text-amber-500 font-semibold hidden sm:inline">⠿ 拖拽排序或扔进左侧分组 / 顶部 Dock</span>` : '');

    return `
      <section ${sectionDropAttrs} class="space-y-3.5 transition-all rounded-2xl">
        <div class="flex items-center justify-between px-1 gap-2">
          <div ${allowCollapse && !isSearching ? `data-collapse-key="${escapeHtml(collapseKey)}" title="点击折叠或展开此分组"` : ''} class="flex items-center gap-2.5 ${allowCollapse && !isSearching ? 'cursor-pointer select-none group/sec' : ''}">
            <span class="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-700/70 flex items-center justify-center text-base shadow-sm">${icon}</span>
            <h2 class="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
              <span class="group-hover/sec:text-indigo-500 transition-colors">${escapeHtml(cleanTitle)}</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${items.length}</span>
              ${allowCollapse && !isSearching ? `<span class="text-[11px] text-slate-400 group-hover/sec:text-indigo-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}">▾</span>` : ''}
            </h2>
          </div>
          ${rightHeaderHtml}
        </div>
        ${bodyHtml}
      </section>
    `;
  }

  function renderMainContent() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    const rawQ = searchQuery.trim().toLowerCase();
    const tokens = rawQ ? rawQ.split(/\s+/).filter(Boolean) : [];
    let html = '';

    if (tokens.length > 0 && currentEngine === 'local') {
      const matchedTools = BUILTIN_TOOLS.filter(t => {
        const title = t.title.toLowerCase();
        const desc = t.desc.toLowerCase();
        const titlePy = getPinyinInitials(t.title);
        const descPy = getPinyinInitials(t.desc);
        return tokens.every(tk => title.includes(tk) || desc.includes(tk) || titlePy.includes(tk) || descPy.includes(tk));
      });
      const matchedBms = searchBookmarksWeighted(rawQ);
      const headerLabel = tokens.length > 1
        ? `🔎 多词组合匹配 (${tokens.join(' + ')})`
        : '🔎 全局智能匹配（高频优先）';
      if (matchedBms.length > 0) html += renderGroupSectionHtml('', headerLabel, matchedBms, false, false);
      if (matchedTools.length > 0) html += renderBuiltinToolsSection(matchedTools);
    } else if (currentSpace === 'tools') {
      html += renderBuiltinToolsSection(BUILTIN_TOOLS);
    } else if (currentSpace === 'home') {
      const quickList = bookmarks
        .filter(b => b.quickSavedAt)
        .sort((a, b) => (b.quickSavedAt || 0) - (a.quickSavedAt || 0))
        .slice(0, currentGroup === 'quick' ? 40 : 8);
      const pinnedList = bookmarks.filter(b => b.pinned);
      const recentBms = recentVisits.map(r => bookmarks.find(b => b.id === r.id)).filter(Boolean).slice(0, 8);

      if ((currentGroup === 'all' && quickList.length > 0) || currentGroup === 'quick') {
        html += renderGroupSectionHtml('home', '📥 最近快捷收藏（右键 / Alt+S）', quickList, false, true, { isQuickSection: true });
      }
      if (currentGroup === 'all' || currentGroup === 'pinned') {
        html += renderGroupSectionHtml('home', '⭐ 常用置顶工作台', pinnedList, false, true);
      }
      if ((currentGroup === 'all' && recentBms.length > 0) || currentGroup === 'recent') {
        html += renderGroupSectionHtml('home', '🕒 最近高频访问', recentBms, false, true);
      }
      if (currentGroup === 'all') {
        html += `
          <section class="space-y-3.5">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl theme-badge border flex items-center justify-center text-base shadow-sm">🛠️</span>
                <h2 class="text-sm sm:text-base font-extrabold tracking-tight">纯本地效率小工具速启</h2>
              </div>
              <button type="button" data-goto-tools="1" class="text-xs font-bold theme-text hover:underline">查看全部 ${BUILTIN_TOOLS.length} 个 →</button>
            </div>
            <div class="${getCardGridClass()}">
              ${BUILTIN_TOOLS.slice(0, 4).map(tool => createToolCardHtml(tool)).join('')}
            </div>
          </section>
        `;
      }
      if (currentGroup === 'everything') {
        SPACES_CONFIG.filter(s => !s.virtual && !s.isTools).forEach(sp => {
          getGroupsForSpace(sp.id).forEach(gName => {
            const items = bookmarks.filter(b => b.space === sp.id && b.group === gName);
            if (items.length > 0) html += renderGroupSectionHtml(sp.id, gName, items, false, true);
          });
        });
      }
    } else {
      const groups = getGroupsForSpace(currentSpace);
      groups.forEach(gName => {
        if (currentGroup !== 'all' && currentGroup !== gName) return;
        const items = bookmarks.filter(b => b.space === currentSpace && b.group === gName);
        html += renderGroupSectionHtml(currentSpace, gName, items, currentGroup === gName || isEditMode, true);
      });
    }

    if (!html) {
      html = `
        <div class="specular-card rounded-3xl p-12 text-center space-y-3">
          <div class="text-4xl">🔭</div>
          <h3 class="text-base font-bold">当前视图暂无匹配内容</h3>
          <p class="text-xs text-slate-400">可尝试更换关键词或空格组合词，或按 Tab 切换外部搜索引擎</p>
          <button type="button" data-reset-home="1" class="mt-2 px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold transition">返回首页聚焦</button>
        </div>
      `;
    }

    container.innerHTML = html;
    bindSpotlightEvents();
    syncKeyboardHighlight();
  }

  function bindSpotlightEvents() {
    document.querySelectorAll('.spotlight-card').forEach(card => {
      if (spotlightBoundSet.has(card)) return;
      spotlightBoundSet.add(card);
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });
    });
  }
  // ===== [PART 1 END] =====
// ===== [PART 2 START] =====
  // ==================== 10. 拖拽排序、分组换组、后台静默打开、单站刷图标与右键菜单 ====================
  function openBookmarkUrl(bmId, url, inBackground = false) {
    if (!url) return;
    recordBookmarkVisit(bmId, url);
    if (inBackground && IS_EXTENSION && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url, active: false });
      showToast('📑 已在后台新标签页静默打开');
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function fetchIconAsLocalBase64(url) {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, 4500);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    if (!blob || blob.size < 60) throw new Error('empty');
    if (blob.type && !blob.type.startsWith('image/') && !blob.type.includes('icon') && blob.type !== 'application/octet-stream') {
      throw new Error('not-image');
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    if (blob.type && blob.type.includes('svg') && typeof dataUrl === 'string' && dataUrl.length <= 16000) {
      return dataUrl;
    }

    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => (el.naturalWidth >= 16 && el.naturalHeight >= 16 ? resolve(el) : reject(new Error('too-small')));
      el.onerror = reject;
      el.src = dataUrl;
    });

    const maxSide = 64;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(16, Math.round(img.naturalWidth * scale));
    const h = Math.max(16, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/webp', 0.88);
  }

  async function fetchFastestHostIconBase64(host, pageUrl = '') {
    const isPrivate = !host || /hzpipeline\.com|192\.168\.|127\.0\.0\.1|localhost/i.test(host);
    const chromeLocal = (IS_EXTENSION && pageUrl)
      ? chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=64`)
      : '';

    // 内网地址直接走 Chrome 本地缓存图标或站点根路径，避免无意义外网请求
    if (isPrivate) {
      const localSources = [chromeLocal, host ? `https://${host}/favicon.ico` : ''].filter(Boolean);
      for (const src of localSources) {
        try { return await fetchIconAsLocalBase64(src); } catch {}
      }
      throw new Error('private-icon-fail');
    }

    const ts = Date.now();
    const candidates = [
      `https://www.google.com/s2/favicons?domain=${host}&sz=128&_t=${ts}`,
      `https://api.iowen.cn/favicon/${host}.png?_t=${ts}`,
      `https://favicon.im/${host}?larger=true&_t=${ts}`
    ];
    try {
      return await Promise.any(candidates.map(url => fetchIconAsLocalBase64(url)));
    } catch {
      if (chromeLocal) return fetchIconAsLocalBase64(chromeLocal);
      throw new Error('all-icon-sources-failed');
    }
  }

  async function refreshBookmarkIcon(bmId) {
    const bm = bookmarks.find(b => b.id === bmId);
    if (!bm) return;
    const host = extractDomain(bm.url).toLowerCase();
    if (!host) { showToast('⚠️ 无法解析该书签域名'); return; }

    hdUpgradedCache.delete(host);
    iconBustMap.delete(bm.id);
    showToast(`🔄 正在抓取并离线缓存「${bm.title}」的新图标...`);

    try {
      const base64Icon = await fetchFastestHostIconBase64(host, bm.url);
      bm.customIcon = base64Icon;
      hdUpgradedCache.set(host, base64Icon);
      saveCoreState();
      renderMainContent();
      showToast(`✅ 「${bm.title}」的新图标已转为本地离线缓存，秒开不卡顿`);
    } catch {
      showToast(`⚠️ 未能拉取到「${bm.title}」的新图标，已保留原图标`);
    }
  }

  // 把任意远程 http(s) customIcon（含右键快捷收藏抓到的网站图标与历史外链）静默转为本地离线 Base64
  async function localizeRemoteCustomIcons() {
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) return;
    const targets = bookmarks.filter(b =>
      typeof b.customIcon === 'string' && /^https?:\/\//i.test(b.customIcon)
    );
    if (targets.length === 0) return;

    let converted = 0;
    for (const bm of targets) {
      const host = extractDomain(bm.url).toLowerCase();
      let base64Icon = '';
      try {
        base64Icon = await fetchIconAsLocalBase64(bm.customIcon);
      } catch {
        if (host) {
          try { base64Icon = await fetchFastestHostIconBase64(host, bm.url); } catch {}
        }
      }
      if (base64Icon) {
        bm.customIcon = base64Icon;
        if (host) hdUpgradedCache.set(host, base64Icon);
        converted++;
      }
    }

    if (converted > 0) {
      saveCoreState();
      renderMainContent();
      showToast(`⚡ 已自动将 ${converted} 个在线图标转为本地离线缓存`);
    }
  }
  window.addEventListener('load', () => { setTimeout(localizeRemoteCustomIcons, 1200); });

  function dismissQuickSave(bmId) {
    const bm = bookmarks.find(b => b.id === bmId);
    if (!bm || !bm.quickSavedAt) return;
    delete bm.quickSavedAt;
    saveCoreState();
    renderSidebarGroups();
    renderMainContent();
    showToast(`📤 已将「${bm.title}」移出快捷收藏（书签仍保留在「${bm.group}」）`);
  }

  function clearAllQuickSaves() {
    const count = bookmarks.filter(b => b.quickSavedAt).length;
    if (count === 0) return;
    bookmarks.forEach(b => { if (b.quickSavedAt) delete b.quickSavedAt; });
    saveCoreState();
    renderSidebarGroups();
    renderMainContent();
    showToast(`🧹 已清空 ${count} 条快捷收藏收件箱（所有书签均完好保留在原分组）`);
  }

  function moveBookmarkTo(bmId, targetSpace, targetGroup) {
    const bm = bookmarks.find(b => b.id === bmId);
    if (!bm) return;
    if (bm.space === targetSpace && bm.group === targetGroup) return;
    bm.space = targetSpace;
    bm.group = targetGroup;
    if (!spaceGroups[targetSpace]) spaceGroups[targetSpace] = [];
    if (!spaceGroups[targetSpace].includes(targetGroup)) spaceGroups[targetSpace].push(targetGroup);
    finishDragUpdate(`📂 已将「${bm.title}」移至「${targetGroup}」`);
  }

  function finishDragUpdate(toastMsg) {
    draggedBookmarkId = null;
    draggedGroupInfo = null;
    clearAllDragClasses();
    saveCoreState();
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
    if (toastMsg) showToast(toastMsg);
  }

  function clearAllDragClasses() {
    document.querySelectorAll('.dragging-card, .drag-over-card, .nav-drop-target, .section-drop-target, .group-dragging').forEach(el => {
      el.classList.remove('dragging-card', 'drag-over-card', 'nav-drop-target', 'section-drop-target', 'group-dragging');
    });
  }

  function openCardContextMenu(e, bmId) {
    e.preventDefault();
    e.stopPropagation();
    closeRecentPopover();
    closeAccentPopover();
    const bm = bookmarks.find(b => b.id === bmId);
    const menu = document.getElementById('cardContextMenu');
    if (!bm || !menu) return;

    contextMenuBmId = bmId;
    document.getElementById('ctxPinIcon').textContent = bm.pinned ? '☆' : '⭐';
    document.getElementById('ctxPinLabel').textContent = bm.pinned ? '取消首页置顶' : '置顶到首页';
    document.getElementById('ctxDismissQuickBtn')?.classList.toggle('hidden', !bm.quickSavedAt);

    menu.classList.remove('hidden');
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = menu.offsetWidth || 176, mh = menu.offsetHeight || 310;
    menu.style.left = `${Math.max(8, Math.min(e.clientX, vw - mw - 12))}px`;
    menu.style.top = `${Math.max(8, Math.min(e.clientY, vh - mh - 12))}px`;
  }

  function closeCardContextMenu() {
    contextMenuBmId = null;
    document.getElementById('cardContextMenu')?.classList.add('hidden');
  }

  // ==================== 11. 搜索与键盘启动器 ====================
  function setSearchEngine(engine) {
    currentEngine = engine;
    kbdSelectedIndex = -1;
    document.querySelectorAll('#searchEngineTabs .engine-tab').forEach(tab => {
      tab.classList.toggle('engine-tab-active', tab.getAttribute('data-engine') === engine);
    });
    const cfg = SEARCH_ENGINES[engine] || SEARCH_ENGINES.local;
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchSubmitBtn');
    if (input) input.placeholder = cfg.placeholder;
    if (btn) btn.textContent = cfg.btnText;
    if (engine === 'local') {
      searchQuery = input ? input.value : '';
      renderSpaceDock();
      renderMainContent();
    }
  }

  function handleSearchInput(val) {
    searchQuery = val;
    document.getElementById('clearSearchBtn')?.classList.toggle('hidden', !val);
    if (currentEngine === 'local') {
      kbdSelectedIndex = val.trim() ? 0 : -1;
      renderSpaceDock();
      renderMainContent();
    }
  }

  function getNavigableCards() {
    return Array.from(document.querySelectorAll('#mainContent .bookmark-card[data-kbd-type]'));
  }

  function syncKeyboardHighlight() {
    const cards = getNavigableCards();
    const activeSearch = currentEngine === 'local' && !!searchQuery.trim();
    cards.forEach((el, idx) => el.classList.toggle('kbd-active-card', idx === kbdSelectedIndex && activeSearch));
    if (kbdSelectedIndex >= 0 && kbdSelectedIndex < cards.length && activeSearch) {
      cards[kbdSelectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function handleSearchKeydown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const curIdx = ENGINE_ORDER.indexOf(currentEngine);
      const nextIdx = (curIdx + (e.shiftKey ? -1 : 1) + ENGINE_ORDER.length) % ENGINE_ORDER.length;
      setSearchEngine(ENGINE_ORDER[nextIdx]);
      showToast(`🔎 已切换搜索引擎：${SEARCH_ENGINES[ENGINE_ORDER[nextIdx]].name}`);
      return;
    }
    if (currentEngine === 'local' && searchQuery.trim()) {
      const cards = getNavigableCards();
      if (!cards.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); kbdSelectedIndex = (kbdSelectedIndex + 1) % cards.length; syncKeyboardHighlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); kbdSelectedIndex = (kbdSelectedIndex - 1 + cards.length) % cards.length; syncKeyboardHighlight(); }
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const val = (document.getElementById('searchInput')?.value || '').trim();
    if (currentEngine === 'local') {
      if (val) {
        const cards = getNavigableCards();
        const card = cards[kbdSelectedIndex >= 0 && kbdSelectedIndex < cards.length ? kbdSelectedIndex : 0];
        if (card) {
          if (card.getAttribute('data-kbd-type') === 'tool') {
            openToolModal(card.getAttribute('data-open-tool'));
          } else {
            const bmId = card.getAttribute('data-bm-id');
            const bm = bookmarks.find(b => b.id === bmId);
            const url = bm ? bm.url : card.getAttribute('data-kbd-url');
            if (url) openBookmarkUrl(bmId, url, e.ctrlKey || e.metaKey);
          }
          return;
        }
      }
      searchQuery = val;
      renderMainContent();
    } else {
      if (!val) { showToast('💡 请先输入搜索关键词'); return; }
      const cfg = SEARCH_ENGINES[currentEngine];
      if (cfg && cfg.url) window.open(cfg.url + encodeURIComponent(val), '_blank', 'noopener,noreferrer');
    }
  }

  function clearSearchQuiet() {
    searchQuery = '';
    kbdSelectedIndex = -1;
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    document.getElementById('clearSearchBtn')?.classList.add('hidden');
  }

  function clearSearch() {
    clearSearchQuiet();
    renderSpaceDock();
    renderMainContent();
  }

  // ==================== 12. 管理模式、书签 CRUD（含撤销删除）、重复与死链分级体检、分层维护 ====================
  function toggleEditMode() {
    isEditMode = !isEditMode;
    const textEl = document.getElementById('editModeText');
    const btnEl = document.getElementById('editModeBtn');
    const bannerEl = document.getElementById('editModeBanner');
    const logoOverlay = document.getElementById('brandLogoEditOverlay');

    if (textEl) textEl.textContent = isEditMode ? '退出管理' : '管理模式';
    if (btnEl) {
      btnEl.className = isEditMode
        ? 'px-2.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm shadow-amber-500/30'
        : 'px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all border border-slate-200/70 dark:border-slate-700/70';
    }
    if (bannerEl) bannerEl.classList.toggle('hidden', !isEditMode);
    if (logoOverlay) logoOverlay.classList.toggle('hidden', !isEditMode);

    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
    showToast(isEditMode ? '⚙️ 已开启管理模式：支持拖拽排序、左栏分组调序或跨空间移动' : '✅ 已退出管理模式，所有变更已自动保存');
  }

  function populateSelectGroups(selectEl, spaceId, selectedGroup = '') {
    if (!selectEl) return;
    const groups = getGroupsForSpace(spaceId);
    selectEl.innerHTML = groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
    if (selectedGroup && groups.includes(selectedGroup)) selectEl.value = selectedGroup;
  }

  function openBookmarkModal(id = null) {
    const modal = document.getElementById('bookmarkModal');
    const spaceSel = document.getElementById('bmSpaceSelect');
    const groupSel = document.getElementById('bmGroupSelect');
    document.getElementById('bmNewGroup').value = '';

    if (id) {
      const target = bookmarks.find(b => b.id === id);
      if (!target) return;
      document.getElementById('modalTitle').textContent = '编辑书签信息';
      document.getElementById('bmId').value = target.id;
      spaceSel.value = target.space || 'media';
      populateSelectGroups(groupSel, target.space || 'media', target.group);
      document.getElementById('bmUrl').value = target.url || '';
      document.getElementById('bmTitle').value = target.title || '';
      document.getElementById('bmDesc').value = target.desc || '';
      document.getElementById('bmPinned').checked = !!target.pinned;
      document.getElementById('bmCustomIcon').value = target.customIcon || '';
    } else {
      document.getElementById('modalTitle').textContent = '新增书签';
      document.getElementById('bmId').value = '';
      const defSpace = ['ai', 'cg', 'media', 'software'].includes(currentSpace) ? currentSpace : 'media';
      spaceSel.value = defSpace;
      const defGroup = (currentSpace === defSpace && currentGroup !== 'all') ? currentGroup : '';
      populateSelectGroups(groupSel, defSpace, defGroup);
      document.getElementById('bmUrl').value = '';
      document.getElementById('bmTitle').value = '';
      document.getElementById('bmDesc').value = '';
      document.getElementById('bmPinned').checked = (currentSpace === 'home');
      document.getElementById('bmCustomIcon').value = '';
    }

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('bmUrl').focus(), 50);
  }

  function closeBookmarkModal() { document.getElementById('bookmarkModal')?.classList.add('hidden'); }

  function saveBookmark(e) {
    e.preventDefault();
    const id = document.getElementById('bmId').value.trim();
    const space = document.getElementById('bmSpaceSelect').value;
    const newGroupRaw = document.getElementById('bmNewGroup').value.trim();
    const group = newGroupRaw ? (newGroupRaw.match(/^\S+\s+/) ? newGroupRaw : `📁 ${newGroupRaw}`) : document.getElementById('bmGroupSelect').value;
    let url = document.getElementById('bmUrl').value.trim();
    const title = document.getElementById('bmTitle').value.trim();
    let desc = document.getElementById('bmDesc').value.trim();
    const pinned = document.getElementById('bmPinned').checked;
    const customIcon = document.getElementById('bmCustomIcon').value.trim();

    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const host = extractDomain(url);
    if (!desc || desc.toLowerCase() === host.toLowerCase()) {
      desc = `${title || host} (${host.replace(/^www\./, '')}) 在线工作台与数字资源平台`;
    }

    if (!spaceGroups[space]) spaceGroups[space] = [];
    if (!spaceGroups[space].includes(group)) spaceGroups[space].push(group);

    if (id) {
      const idx = bookmarks.findIndex(b => b.id === id);
      if (idx > -1) {
        bookmarks[idx] = { ...bookmarks[idx], space, group, url, title, desc, pinned, customIcon: customIcon || undefined };
        iconBustMap.delete(id);
        showToast('✅ 书签已更新并自动保存');
      }
    } else {
      bookmarks.unshift({
        id: 'bm_' + Date.now(), space, group, url, title, desc, pinned,
        icon: findOfflineBase64(url) || undefined,
        customIcon: customIcon || undefined
      });
      showToast('🎉 新书签已添加并自动保存');
    }

    saveCoreState();
    closeBookmarkModal();
    switchSpace(space, group);
  }

  function deleteBookmark(id) {
    const idx = bookmarks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const target = bookmarks[idx];
    const removedVisit = recentVisits.find(r => r.id === id) || null;
    lastDeletedUndo = { bm: { ...target }, index: idx, visit: removedVisit };

    bookmarks.splice(idx, 1);
    recentVisits = recentVisits.filter(r => r.id !== id);
    writeStoreInternal({ [KEYS.recentVisits]: recentVisits });
    saveCoreState();
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();

    showToast(`🗑️ 已删除「${target.title}」`, { label: '↩️ 撤销', duration: 5500 });
  }

  function undoLastDelete() {
    if (!lastDeletedUndo) return;
    const { bm, index, visit } = lastDeletedUndo;
    lastDeletedUndo = null;
    if (!bookmarks.some(b => b.id === bm.id)) {
      const safeIdx = Math.min(Math.max(0, index), bookmarks.length);
      bookmarks.splice(safeIdx, 0, bm);
      if (!spaceGroups[bm.space]) spaceGroups[bm.space] = [];
      if (!spaceGroups[bm.space].includes(bm.group)) spaceGroups[bm.space].push(bm.group);
    }
    if (visit && !recentVisits.some(r => r.id === visit.id)) {
      recentVisits.unshift(visit);
      writeStoreInternal({ [KEYS.recentVisits]: recentVisits });
    }
    saveCoreState();
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
    showToast(`↩️ 已恢复书签「${bm.title}」`);
  }

  function togglePinBookmark(id) {
    const bm = bookmarks.find(b => b.id === id);
    if (!bm) return;
    bm.pinned = !bm.pinned;
    saveCoreState();
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
    showToast(bm.pinned ? `⭐ 已将「${bm.title}」置顶到首页` : `☆ 已取消「${bm.title}」的首页置顶`);
  }

  function openMoveGroupModal(bmId) {
    const bm = bookmarks.find(b => b.id === bmId);
    if (!bm) return;
    document.getElementById('moveBmId').value = bm.id;
    document.getElementById('moveTargetTitle').textContent = `当前书签：${bm.title}`;
    const spSel = document.getElementById('moveSpaceSelect');
    spSel.value = bm.space || 'media';
    document.getElementById('moveNewGroupInput').value = '';
    populateSelectGroups(document.getElementById('moveGroupSelect'), bm.space || 'media', bm.group);
    document.getElementById('moveGroupModal').classList.remove('hidden');
  }

  function closeMoveGroupModal() { document.getElementById('moveGroupModal')?.classList.add('hidden'); }

  function confirmMoveBookmarkGroup() {
    const bmId = document.getElementById('moveBmId').value;
    const targetSpace = document.getElementById('moveSpaceSelect').value;
    const newG = document.getElementById('moveNewGroupInput').value.trim();
    const targetGroup = newG ? (newG.match(/^\S+\s+/) ? newG : `📁 ${newG}`) : document.getElementById('moveGroupSelect').value;
    moveBookmarkTo(bmId, targetSpace, targetGroup);
    closeMoveGroupModal();
  }

  function openDataCenterModal() {
    const el = document.getElementById('dcTotalCount');
    if (el) el.textContent = `${bookmarks.length} 个书签`;
    const report = document.getElementById('duplicateReportBox');
    if (report) { report.innerHTML = ''; report.classList.add('hidden'); }
    populateSyncModalFields();
    refreshMaintenanceUI();
    document.getElementById('dataCenterModal')?.classList.remove('hidden');
  }

  function closeDataCenterModal() {
    if (linkCheckAbortController) {
      linkCheckAbortController.abort();
      linkCheckAbortController = null;
    }
    document.getElementById('dataCenterModal')?.classList.add('hidden');
  }

  function canonicalUrlKey(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '').toLowerCase() + u.pathname.replace(/\/+$/, '').toLowerCase() + u.search.toLowerCase();
    } catch { return normalizeUrl(url); }
  }

  function scanDuplicateBookmarks() {
    if (linkCheckAbortController) { linkCheckAbortController.abort(); linkCheckAbortController = null; }
    const box = document.getElementById('duplicateReportBox');
    if (!box) return;
    const map = new Map();
    bookmarks.forEach(bm => {
      const key = canonicalUrlKey(bm.url);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(bm);
    });

    const dupGroups = Array.from(map.values()).filter(arr => arr.length > 1);
    box.classList.remove('hidden');

    if (dupGroups.length === 0) {
      box.innerHTML = `<div class="text-center py-2 text-emerald-500 font-semibold">✅ 体检通过！当前 ${bookmarks.length} 个书签中没有任何重复网址</div>`;
      return;
    }

    const dupTotal = dupGroups.reduce((acc, g) => acc + (g.length - 1), 0);
    box.innerHTML = `
      <div class="flex items-center justify-between pb-1.5 border-b border-slate-200/70 dark:border-slate-700/70">
        <span class="font-bold text-amber-500">发现 ${dupGroups.length} 组重复（共 ${dupTotal} 条冗余）</span>
        <button type="button" data-dup-clean-all="1" class="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-bold transition">🧹 一键去重</button>
      </div>
      ${dupGroups.map(g => `
        <div class="space-y-1 py-1 border-b border-slate-200/40 dark:border-slate-800 last:border-0">
          <div class="font-mono text-[10px] text-slate-400 truncate">${escapeHtml(g[0].url)}</div>
          ${g.map((item, idx) => `
            <div class="flex items-center justify-between gap-2 pl-2">
              <span class="truncate">${idx === 0 ? '✅ 保留：' : '⚠️ 重复：'}${escapeHtml(item.title)} <span class="text-slate-400">(${escapeHtml(item.group)})</span></span>
              ${idx > 0 ? `<button type="button" data-dup-del-id="${escapeHtml(item.id)}" class="text-rose-500 hover:underline shrink-0">删除</button>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
  }

  // 分级书签死链体检（区分：无法连通/超时 · 响应较慢 · 内网跳过）
  async function checkDeadLinks() {
    const box = document.getElementById('duplicateReportBox');
    if (!box) return;
    if (linkCheckAbortController) {
      linkCheckAbortController.abort();
      linkCheckAbortController = null;
      showToast('⏹️ 已停止书签连通性体检');
      return;
    }

    const controller = new AbortController();
    linkCheckAbortController = controller;
    const total = bookmarks.length;
    const failed = [];
    const slowList = [];
    let skippedCount = 0;
    let checked = 0;

    box.classList.remove('hidden');
    const renderItemRow = (item, level) => {
      const badge = level === 'dead'
        ? `<span class="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-mono shrink-0">超时/失效</span>`
        : `<span class="px-1.5 py-0.2 rounded bg-amber-500/12 text-amber-500 border border-amber-500/25 text-[9px] font-mono shrink-0">${(item.ms / 1000).toFixed(1)}s 较慢</span>`;
      return `
        <div class="flex items-center justify-between gap-2 py-1 border-b border-slate-200/40 dark:border-slate-800 last:border-0">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              ${badge}
              <span class="font-semibold truncate text-slate-700 dark:text-slate-200">${escapeHtml(item.bm.title)}</span>
            </div>
            <div class="font-mono text-[10px] text-slate-400 truncate">${escapeHtml(item.bm.url)}</div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" data-dead-open-url="${escapeHtml(item.bm.url)}" class="theme-text hover:underline">验证</button>
            <button type="button" data-dead-del-id="${escapeHtml(item.bm.id)}" class="text-rose-500 hover:underline">删除</button>
          </div>
        </div>
      `;
    };

    const renderProgress = (done = false) => {
      const pct = total ? Math.round((checked / total) * 100) : 100;
      const rows = [
        ...failed.map(item => renderItemRow(item, 'dead')),
        ...slowList.map(item => renderItemRow(item, 'slow'))
      ].join('');

      const summaryHtml = `
        <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
          <span class="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">无法连通 ${failed.length}</span>
          <span class="px-2 py-0.5 rounded-lg bg-amber-500/12 text-amber-500 border border-amber-500/25">响应较慢 ${slowList.length}</span>
          <span class="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">内网跳过 ${skippedCount}</span>
        </div>
      `;

      box.innerHTML = `
        <div class="space-y-1.5 pb-1.5 border-b border-slate-200/70 dark:border-slate-700/70">
          <div class="flex items-center justify-between">
            <span class="font-bold ${done ? 'text-emerald-500' : 'theme-text'}">
              ${done ? '🩺 分级体检完成' : `🩺 正在并发探测连通性 (${checked}/${total} · ${pct}%)...`}
            </span>
            ${!done ? `<button type="button" data-dead-stop="1" class="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">停止</button>` : ''}
          </div>
          <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full theme-solid-bg rounded-full transition-all" style="width:${pct}%"></div>
          </div>
          ${summaryHtml}
          <div class="text-[10px] text-slate-400">说明：浏览器安全策略下可精准排查域名失效与超时（部分站点 404 页或需代理访问，删前建议点「验证」复核）</div>
        </div>
        ${rows || (done ? `<div class="text-center py-2 text-emerald-500 font-semibold">✅ 所有可检测书签均响应迅速且正常连通！</div>` : '')}
      `;
    };

    renderProgress(false);

    const queue = [...bookmarks];
    const probeOne = async bm => {
      if (controller.signal.aborted) return;
      const isPrivate = !bm.url || /hzpipeline\.com|192\.168\.|127\.0\.0\.1|localhost/i.test(bm.url);
      if (isPrivate) {
        skippedCount++;
      } else {
        const tCtrl = new AbortController();
        const timer = setTimeout(() => tCtrl.abort(), 5500);
        const onParentAbort = () => tCtrl.abort();
        controller.signal.addEventListener('abort', onParentAbort, { once: true });
        const startMs = Date.now();
        try {
          await fetch(bm.url, { mode: 'no-cors', cache: 'no-store', signal: tCtrl.signal });
          const elapsed = Date.now() - startMs;
          if (!controller.signal.aborted && elapsed >= 2800) {
            slowList.push({ bm, ms: elapsed });
          }
        } catch {
          if (!controller.signal.aborted) failed.push({ bm, ms: Date.now() - startMs });
        } finally {
          clearTimeout(timer);
          controller.signal.removeEventListener('abort', onParentAbort);
        }
      }
      checked++;
      if (!controller.signal.aborted && (checked % 4 === 0 || checked === total)) renderProgress(false);
    };

    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length > 0 && !controller.signal.aborted) {
        await probeOne(queue.shift());
      }
    });
    await Promise.all(workers);

    if (linkCheckAbortController === controller) {
      linkCheckAbortController = null;
      renderProgress(true);
    }
  }

  async function collectCurrentSettings() {
    const saved = await storeGetAll([KEYS.theme, KEYS.accent, KEYS.rightPanel, KEYS.city, KEYS.collapsed, KEYS.customLogo]);
    const customLogo = typeof saved[KEYS.customLogo] === 'string' && saved[KEYS.customLogo].length <= 200000
      ? saved[KEYS.customLogo]
      : '';
    return {
      theme: saved[KEYS.theme] || (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
      accent: saved[KEYS.accent] || document.body.getAttribute('data-accent') || 'indigo',
      rightPanel: isRightPanelCollapsed ? 'collapsed' : 'expanded',
      city: saved[KEYS.city] || DEFAULT_WEATHER_CITY,
      collapsed: collapsedGroups || {},
      customLogo
    };
  }

  function applySettingsPayload(settings) {
    if (!settings || typeof settings !== 'object') return;
    const toSave = {};
    if (settings.theme === 'light' || settings.theme === 'dark') {
      applyThemeUI(settings.theme);
      toSave[KEYS.theme] = settings.theme;
    }
    if (typeof settings.accent === 'string') {
      setAccentColor(settings.accent, false, true);
      toSave[KEYS.accent] = settings.accent;
    }
    if (settings.rightPanel === 'collapsed' || settings.rightPanel === 'expanded') {
      isRightPanelCollapsed = settings.rightPanel === 'collapsed';
      applyRightPanelUI();
      toSave[KEYS.rightPanel] = settings.rightPanel;
    }
    if (typeof settings.city === 'string' && settings.city) {
      toSave[KEYS.city] = settings.city;
      const sel = document.getElementById('citySelector');
      if (sel && sel.value !== settings.city) {
        sel.value = settings.city;
        changeWeatherCity(settings.city, false, true);
      }
    }
    if (settings.collapsed && typeof settings.collapsed === 'object') {
      collapsedGroups = settings.collapsed;
      toSave[KEYS.collapsed] = collapsedGroups;
    }
    if (typeof settings.customLogo === 'string' && settings.customLogo) {
      toSave[KEYS.customLogo] = settings.customLogo;
      const img = document.getElementById('brandLogoImg');
      const fav = document.getElementById('pageFavicon');
      if (img) img.src = settings.customLogo;
      if (fav) fav.href = settings.customLogo;
    }
    if (Object.keys(toSave).length > 0) writeStoreInternal(toSave);
  }

  async function exportData() {
    const memo = document.getElementById('quickMemoArea')?.value || '';
    const settings = await collectCurrentSettings();
    const payload = { version: 11.1, spaceGroups, bookmarks, todos, memo, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 已导出完整 JSON 备份（含界面偏好，不含私密 Token）');
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.bookmarks)) {
          bookmarks = parsed.bookmarks;
          if (parsed.spaceGroups) spaceGroups = parsed.spaceGroups;
          if (Array.isArray(parsed.todos)) { todos = parsed.todos; saveTodos(true); renderTodoList(); }
          if (typeof parsed.memo === 'string') {
            const area = document.getElementById('quickMemoArea');
            if (area) { area.value = parsed.memo; handleMemoInput(parsed.memo, true); }
          }
          if (parsed.settings) applySettingsPayload(parsed.settings);
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].space) {
          bookmarks = parsed;
        } else {
          showToast('❌ JSON 格式不兼容当前架构');
          return;
        }
        hydrateOfflineBase64Icons(true);
        saveCoreState();
        closeDataCenterModal();
        switchSpace('home', 'all');
        showToast(`📥 成功恢复 ${bookmarks.length} 个书签与偏好设置`);
      } catch { showToast('❌ 解析 JSON 备份文件失败'); }
    };
    reader.readAsText(file);
  }

  async function refreshMaintenanceUI() {
    document.getElementById('dcDangerBox')?.classList.add('hidden');
    const arrow = document.getElementById('dcDangerArrow');
    if (arrow) arrow.textContent = '▾';

    const resetBtn = document.getElementById('dcResetBtn');
    if (resetBtn) {
      resetBtn.textContent = INITIAL_BOOKMARKS.length > 0
        ? `🔄 恢复默认 (${INITIAL_BOOKMARKS.length}条)`
        : '🔄 恢复出厂默认';
    }

    const snapBtn = document.getElementById('dcRestoreSnapshotBtn');
    const snapText = document.getElementById('dcRestoreSnapshotText');
    if (!snapBtn) return;
    const saved = await storeGetAll([PRE_RESET_SNAPSHOT_KEY]);
    const snap = saved[PRE_RESET_SNAPSHOT_KEY];
    if (snap && Array.isArray(snap.bookmarks) && snap.bookmarks.length > 0) {
      const tStr = snap.savedAt
        ? new Date(snap.savedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';
      if (snapText) snapText.textContent = `恢复重置前快照 (${snap.bookmarks.length} 条${tStr ? ' · ' + tStr : ''})`;
      snapBtn.classList.remove('hidden');
    } else {
      snapBtn.classList.add('hidden');
    }
  }

  function mergeMissingDefaultBookmarks() {
    if (INITIAL_BOOKMARKS.length === 0) {
      showToast('⚠️ 未检测到 js/default-bookmarks.js，无法补全');
      return;
    }
    const existingKeys = new Set(bookmarks.map(b => canonicalUrlKey(b.url)));
    let added = 0;

    INITIAL_BOOKMARKS.forEach(seed => {
      const key = canonicalUrlKey(seed.url);
      if (!existingKeys.has(key)) {
        const cloned = JSON.parse(JSON.stringify(seed));
        bookmarks.push(cloned);
        existingKeys.add(key);
        if (!spaceGroups[cloned.space]) spaceGroups[cloned.space] = [];
        if (!spaceGroups[cloned.space].includes(cloned.group)) {
          spaceGroups[cloned.space].push(cloned.group);
        }
        added++;
      }
    });

    if (added === 0) {
      showToast(`✅ 当前书签库已包含全部 ${INITIAL_BOOKMARKS.length} 条默认站点，无需补全`);
      return;
    }

    hydrateOfflineBase64Icons(true);
    saveCoreState(false);
    const el = document.getElementById('dcTotalCount');
    if (el) el.textContent = `${bookmarks.length} 个书签`;
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
    showToast(`✨ 已安全补全 ${added} 条缺失的默认书签（自建内容不受影响）`);
  }

  function resetUiAndCaches() {
    if (!confirm('将恢复默认深色主题、极光靛蓝强调色、展开全部折叠分组，并清理天气与图标缓存。\n\n你的书签、便签和待办完全不会受影响，是否继续？')) return;
    applyThemeUI('dark');
    setAccentColor('indigo', false, true);
    isRightPanelCollapsed = false;
    applyRightPanelUI();
    collapsedGroups = {};
    weatherCacheMap = {};
    hdUpgradedCache.clear();
    iconBustMap.clear();

    writeStoreInternal({
      [KEYS.theme]: 'dark',
      [KEYS.accent]: 'indigo',
      [KEYS.rightPanel]: 'expanded',
      [KEYS.collapsed]: {},
      [KEYS.weatherCache]: {},
      [KEYS.city]: DEFAULT_WEATHER_CITY
    });

    const citySel = document.getElementById('citySelector');
    if (citySel) citySel.value = DEFAULT_WEATHER_CITY;
    changeWeatherCity(DEFAULT_WEATHER_CITY, false, true);
    renderMainContent();
    showToast('🎨 已重置界面外观与本地缓存（书签与便签完好保留）');
  }

  function savePreResetSnapshot() {
    if (bookmarks.length === 0) return;
    const cleanBms = bookmarks.map(b => {
      const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
      if (b.pinned) item.pinned = true;
      if (b.customIcon) item.customIcon = b.customIcon;
      return item;
    });
    const memo = document.getElementById('quickMemoArea')?.value || '';
    const snapshot = {
      savedAt: Date.now(),
      bookmarks: cleanBms,
      spaceGroups: JSON.parse(JSON.stringify(spaceGroups)),
      todos: JSON.parse(JSON.stringify(todos)),
      memo
    };
    writeStoreInternal({ [PRE_RESET_SNAPSHOT_KEY]: snapshot });

    try {
      const blob = new Blob([JSON.stringify({ version: 11.1, ...snapshot }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pre_reset_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function restorePreResetSnapshot() {
    const saved = await storeGetAll([PRE_RESET_SNAPSHOT_KEY]);
    const snap = saved[PRE_RESET_SNAPSHOT_KEY];
    if (!snap || !Array.isArray(snap.bookmarks)) {
      showToast('💡 暂无可恢复的重置前快照');
      return;
    }
    bookmarks = snap.bookmarks;
    if (snap.spaceGroups) spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...snap.spaceGroups };
    if (Array.isArray(snap.todos)) { todos = snap.todos; saveTodos(true); renderTodoList(); }
    if (typeof snap.memo === 'string') {
      const area = document.getElementById('quickMemoArea');
      if (area) area.value = snap.memo;
      handleMemoInput(snap.memo, true);
    }
    hydrateOfflineBase64Icons(true);
    saveCoreState(true);
    closeDataCenterModal();
    switchSpace('home', 'all');
    showToast(`↩️ 已成功恢复重置前的 ${bookmarks.length} 条书签与便签数据`);
  }

  function resetDefaultData() {
    if (INITIAL_BOOKMARKS.length === 0) {
      showToast('⚠️ 未检测到 js/default-bookmarks.js，无法恢复默认');
      return;
    }
    const msg = `当前本机共有 ${bookmarks.length} 条书签，确定要替换为出厂默认的 ${INITIAL_BOOKMARKS.length} 条吗？\n\n🛡️ 安全保障：\n1. 重置前会自动保存本机快照并下载 JSON 备份（随时可还原）\n2. 仅重置本机，不会自动覆盖 GitHub 云端 Gist`;
    if (!confirm(msg)) return;

    savePreResetSnapshot();
    clearTimeout(autoSyncTimer);

    bookmarks = JSON.parse(JSON.stringify(INITIAL_BOOKMARKS));
    spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
    collapsedGroups = {};
    hdUpgradedCache.clear();
    iconBustMap.clear();
    localUpdatedAt = Date.now();
    writeStoreInternal({ [KEYS.collapsed]: collapsedGroups });
    hydrateOfflineBase64Icons(true);
    saveCoreState(true);

    closeDataCenterModal();
    switchSpace('home', 'all');
    showToast(`🔄 本机已恢复默认 ${bookmarks.length} 条（已自动留底快照，云端数据未受影响）`, { duration: 4500 });
  }

  function clearAllLocalBookmarks() {
    if (bookmarks.length === 0) {
      showToast('💡 本机书签列表已经是空的');
      return;
    }
    const msg = `⚠️ 高危操作：确定要清空本机全部 ${bookmarks.length} 条书签吗？\n\n🛡️ 执行前会自动保存快照并下载 JSON 备份，且不会覆盖 GitHub 云端数据。`;
    if (!confirm(msg)) return;

    savePreResetSnapshot();
    clearTimeout(autoSyncTimer);

    bookmarks = [];
    spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
    collapsedGroups = {};
    localUpdatedAt = Date.now();
    writeStoreInternal({ [KEYS.collapsed]: collapsedGroups });
    saveCoreState(true);

    closeDataCenterModal();
    switchSpace('home', 'all');
    showToast('🧹 已清空本机书签（随时可在数据中心一键恢复快照或拉取云端）', { duration: 4500 });
  }

  // ==================== 13. 自动识别网站名称与完整描述 ====================
  const SITE_METADATA_DICT = {
    'x.com': { title: 'X (Twitter) 全球社交与前沿资讯', desc: '全球最具影响力的实时资讯、独立开发者、AI 前沿动态与 CG 艺术家社交平台' },
    'github.com': { title: 'GitHub 开源代码托管与开发者社区', desc: '全球最大的开源代码托管平台、AI 开源项目与开发者协作社区' },
    'bilibili.com': { title: '哔哩哔哩 Bilibili', desc: '国内核心弹幕视频与 CG / AI / UE5 教程学习社区' },
    'youtube.com': { title: 'YouTube 全球视频平台', desc: '全球最大的视频分享与海外官方 CG、虚幻引擎教程平台' },
    'huggingface.co': { title: 'Hugging Face 开源 AI 社区', desc: '全球最大的开源大模型、扩散模型权重与 Spaces 在线演示平台' },
    'deepseek.com': { title: 'DeepSeek 深度求索 AI 助手', desc: '国产顶尖推理与代码生成大模型官方对话工作台' },
    'claude.ai': { title: 'Claude AI (Anthropic)', desc: '擅长长文本写作、复杂代码架构分析与高逻辑推理的旗舰 AI 助手' },
    'blender.org': { title: 'Blender 开源三维创作套件官网', desc: '免费开源的三维建模、雕刻、绑定、动画、模拟与渲染软件官网' }
  };

  async function autoDetectSiteMetadata(forceOverwrite = false) {
    const urlInput = document.getElementById('bmUrl');
    const titleInput = document.getElementById('bmTitle');
    const descInput = document.getElementById('bmDesc');
    const btnText = document.getElementById('autoDetectBtnText');
    if (!urlInput) return;

    let rawUrl = urlInput.value.trim();
    if (!rawUrl) { if (forceOverwrite) showToast('💡 请先粘贴网址链接'); return; }
    if (!/^https?:\/\//i.test(rawUrl)) { rawUrl = 'https://' + rawUrl; urlInput.value = rawUrl; }

    const currentHost = extractDomain(rawUrl).toLowerCase();
    const hasTitle = titleInput.value.trim() && titleInput.value.trim().toLowerCase() !== currentHost;
    const hasDesc = descInput.value.trim() && descInput.value.trim().toLowerCase() !== currentHost;
    if (!forceOverwrite && hasTitle && hasDesc) return;

    const cleanHost = currentHost.replace(/^www\./, '');
    for (const [domainKey, meta] of Object.entries(SITE_METADATA_DICT)) {
      if (cleanHost === domainKey || cleanHost.endsWith('.' + domainKey)) {
        if (forceOverwrite || !hasTitle) titleInput.value = meta.title;
        if (forceOverwrite || !hasDesc) descInput.value = meta.desc;
        if (forceOverwrite) showToast('⚡ 已自动识别网站名称与描述');
        return;
      }
    }

    if (btnText) btnText.textContent = '抓取中...';
    try {
      const res = await fetchWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(rawUrl)}`, {}, 5000);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        const ft = (json.data.title || '').trim();
        const fd = (json.data.description || '').trim();
        if (ft && (forceOverwrite || !hasTitle)) titleInput.value = ft.length > 42 ? ft.slice(0, 42) : ft;
        if (fd && (forceOverwrite || !hasDesc)) descInput.value = fd.length > 90 ? fd.slice(0, 90) + '...' : fd;
        if (btnText) btnText.textContent = '自动识别名称与描述';
        showToast('🎉 已成功抓取网站名称与功能说明');
        return;
      }
    } catch {}

    if (btnText) btnText.textContent = '自动识别名称与描述';
    const brand = cleanHost.split('.')[0];
    const fmtBrand = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : '站点';
    if (forceOverwrite || !hasTitle) titleInput.value = `${fmtBrand} 官方平台`;
    if (forceOverwrite || !hasDesc) descInput.value = `${fmtBrand} (${cleanHost}) 在线创作工具与数字资源平台`;
  }

  // ==================== 14. 最近访问、双标签便签待办（含300ms防抖）、时钟、三路天气与春节倒计时 ====================
  function recordBookmarkVisit(bmId, url) {
    const bm = bookmarks.find(b => b.id === bmId) || { id: bmId || ('url_' + url), title: extractDomain(url), url };
    const idx = recentVisits.findIndex(r => r.id === bm.id || r.url === bm.url);
    if (idx > -1) {
      const rec = recentVisits[idx];
      rec.count = (rec.count || 1) + 1;
      rec.lastTime = Date.now();
      rec.title = bm.title || rec.title;
      recentVisits.splice(idx, 1);
      recentVisits.unshift(rec);
    } else {
      recentVisits.unshift({ id: bm.id, title: bm.title || extractDomain(bm.url), url: bm.url, count: 1, lastTime: Date.now() });
    }
    if (recentVisits.length > 40) recentVisits = recentVisits.slice(0, 40);
    writeStoreInternal({ [KEYS.recentVisits]: recentVisits });
    renderRecentVisitsList();
  }

  function toggleRecentPopover(e) {
    if (e) e.stopPropagation();
    closeAccentPopover();
    closeCardContextMenu();
    const pop = document.getElementById('recentVisitsPopover');
    if (!pop) return;
    if (pop.classList.contains('hidden')) { renderRecentVisitsList(); pop.classList.remove('hidden'); }
    else pop.classList.add('hidden');
  }

  function closeRecentPopover() { document.getElementById('recentVisitsPopover')?.classList.add('hidden'); }

  function renderRecentVisitsList() {
    const listEl = document.getElementById('recentVisitsList');
    if (!listEl) return;
    if (recentVisits.length === 0) {
      listEl.innerHTML = `<div class="py-8 text-center text-xs text-slate-400">暂无最近访问记录</div>`;
      return;
    }
    listEl.innerHTML = recentVisits.map(item => `
      <div class="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition group">
        <div data-recent-open-id="${escapeHtml(item.id)}" data-recent-open-url="${escapeHtml(item.url)}" class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
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

  function switchNoteTab(tab, save = true) {
    currentNoteTab = tab === 'todo' ? 'todo' : 'memo';
    if (save) writeStoreInternal({ [KEYS.noteTab]: currentNoteTab });
    const isMemo = currentNoteTab === 'memo';
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

  function updateSaveStatusTimestamp(customText = '') {
    const status = document.getElementById('memoSaveStatus');
    if (!status) return;
    if (customText) { status.textContent = customText; return; }
    const now = new Date();
    status.textContent = `已保存 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function saveTodos(skipSync = false) {
    if (!skipSync) localUpdatedAt = Date.now();
    writeStoreInternal({ [KEYS.todos]: todos, [KEYS.updatedAt]: localUpdatedAt });
    updateSaveStatusTimestamp();
    if (!skipSync) scheduleAutoSync();
  }

  function renderTodoList() {
    const listEl = document.getElementById('todoList');
    const badge = document.getElementById('todoPendingBadge');
    const stats = document.getElementById('todoStatsText');
    const pending = todos.filter(t => !t.done).length;
    if (badge) { badge.textContent = pending; badge.classList.toggle('hidden', pending === 0); }
    if (stats) stats.textContent = `${todos.length - pending} / ${todos.length} 完成`;
    if (!listEl) return;

    if (todos.length === 0) {
      listEl.innerHTML = `<div class="py-6 text-center text-[11px] text-slate-400">暂无今日待办，输入内容按回车添加</div>`;
      return;
    }
    listEl.innerHTML = todos.map(t => `
      <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition group">
        <label class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
          <input type="checkbox" data-todo-toggle="${escapeHtml(t.id)}" ${t.done ? 'checked' : ''} class="rounded accent-indigo-600 w-3.5 h-3.5 shrink-0">
          <span class="text-xs truncate ${t.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}">${escapeHtml(t.text)}</span>
        </label>
        <button type="button" data-todo-del="${escapeHtml(t.id)}" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-[11px] px-1 transition">✕</button>
      </div>
    `).join('');
  }

  // 便签 300ms 轻防抖写盘（减少长文本编辑 I/O，页面关闭前自动立即落盘）
  function flushMemoWriteNow(val, skipSync = false) {
    clearTimeout(memoWriteTimer);
    memoWriteTimer = null;
    if (!skipSync) localUpdatedAt = Date.now();
    writeStoreInternal({ [KEYS.memo]: val, [KEYS.updatedAt]: localUpdatedAt });
    updateSaveStatusTimestamp();
    if (!skipSync) scheduleAutoSync();
  }

  function handleMemoInput(val, skipSync = false) {
    updateMemoCount(val);
    if (skipSync) {
      flushMemoWriteNow(val, true);
      return;
    }
    updateSaveStatusTimestamp('保存中...');
    clearTimeout(memoWriteTimer);
    memoWriteTimer = setTimeout(() => flushMemoWriteNow(val, false), 300);
  }

  function updateMemoCount(val) {
    const el = document.getElementById('memoCharCount');
    if (el) el.textContent = `${(val || '').length} 字`;
  }

  const CNY_TABLE = [
    { year: 2027, zodiac: '丁未羊年', date: '2027-02-06T00:00:00', label: '2027.02.06 正月初一' },
    { year: 2028, zodiac: '戊申猴年', date: '2028-01-26T00:00:00', label: '2028.01.26 正月初一' },
    { year: 2029, zodiac: '己酉鸡年', date: '2029-02-13T00:00:00', label: '2029.02.13 正月初一' },
    { year: 2030, zodiac: '庚戌狗年', date: '2030-02-03T00:00:00', label: '2030.02.03 正月初一' }
  ];

  function initClockAndCNY() {
    const tick = () => {
      const now = new Date();
      document.getElementById('clockHM').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      document.getElementById('clockSec').textContent = String(now.getSeconds()).padStart(2, '0');
      document.getElementById('clockDate').textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
      document.getElementById('clockWeekday').textContent = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];

      const h = now.getHours();
      let greet = '🌙 夜深注意休息';
      if (h >= 5 && h < 9) greet = '🌅 早安·元气开启';
      else if (h >= 9 && h < 12) greet = '⚡ 黄金专注时段';
      else if (h >= 12 && h < 14) greet = '🍱 午间小憩充能';
      else if (h >= 14 && h < 18) greet = '☀️ 高效创作中';
      else if (h >= 18 && h < 22) greet = '🌆 晚间灵感时刻';
      document.getElementById('timeGreeting').textContent = greet;

      const nextCNY = CNY_TABLE.find(item => new Date(item.date).getTime() > now.getTime()) || CNY_TABLE[CNY_TABLE.length - 1];
      const targetMs = new Date(nextCNY.date).getTime();
      const diffSec = Math.max(0, Math.floor((targetMs - now.getTime()) / 1000));
      document.getElementById('cnyTitle').textContent = `${nextCNY.year}${nextCNY.zodiac}春节`;
      document.getElementById('cnyTargetDate').textContent = nextCNY.label;
      document.getElementById('cnyDays').textContent = String(Math.floor(diffSec / 86400)).padStart(2, '0');
      document.getElementById('cnyHours').textContent = String(Math.floor((diffSec % 86400) / 3600)).padStart(2, '0');
      document.getElementById('cnyMinutes').textContent = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      document.getElementById('cnySeconds').textContent = String(diffSec % 60).padStart(2, '0');

      const totalYearMs = 365 * 86400 * 1000;
      const passedPct = Math.min(100, Math.max(5, ((totalYearMs - (targetMs - now.getTime())) / totalYearMs) * 100)).toFixed(1);
      document.getElementById('cnyProgressText').textContent = `年度周期已推进 ${passedPct}%`;
      document.getElementById('cnyProgressBar').style.width = `${passedPct}%`;
    };
    tick();
    setInterval(tick, 1000);
  }

  function initWeather(savedCity) {
    const cityVal = savedCity || DEFAULT_WEATHER_CITY;
    const selector = document.getElementById('citySelector');
    if (selector) selector.value = cityVal;
    changeWeatherCity(cityVal, false, true);
  }

  function changeWeatherCity(val, notify = true, skipSync = false) {
    writeStoreInternal({ [KEYS.city]: val });
    if (!skipSync) markLocalChangeAndSync();
    if (val === 'auto') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude, '本地定位'),
          () => fetchWeatherData(39.9042, 116.4074, '北京')
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

  function renderWeatherUI(w, isCached = false) {
    document.getElementById('weatherIcon').textContent = w.icon;
    document.getElementById('weatherTemp').textContent = w.temp;
    document.getElementById('weatherDesc').textContent = isCached ? `${w.desc} (上次缓存)` : w.desc;
    document.getElementById('weatherFeels').textContent = `${w.feels}°`;
    document.getElementById('weatherHumid').textContent = `${w.humid}%`;
    document.getElementById('weatherWind').textContent = `${w.wind}km/h`;
  }

  async function fetchFromOpenMeteo(lat, lon) {
    const res = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
      { cache: 'no-store' }, 5000
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

  async function fetchWeatherData(lat, lon, cityName, isManualRetry = false) {
    lastWeatherArgs = { lat, lon, cityName };
    const badge = document.getElementById('weatherCityBadge');
    const descEl = document.getElementById('weatherDesc');
    if (badge) badge.textContent = cityName;

    const cached = weatherCacheMap[cityName];
    if (cached && !isManualRetry) renderWeatherUI(cached, true);
    else if (descEl) descEl.textContent = '正在同步气象数据...';

    const providers = [
      () => fetchFromOpenMeteo(lat, lon),
      () => fetchFromWttr('https://wttr.in', lat, lon),
      () => fetchFromWttr('https://wttr.is', lat, lon)
    ];

    for (const run of providers) {
      try {
        const result = await run();
        weatherCacheMap[cityName] = { ...result, savedAt: Date.now() };
        writeStoreInternal({ [KEYS.weatherCache]: weatherCacheMap });
        renderWeatherUI(result, false);
        if (isManualRetry) showToast(`⛅ ${cityName}实时天气已刷新`);
        return;
      } catch {}
    }

    if (cached) renderWeatherUI(cached, true);
    else if (descEl) descEl.textContent = '网络暂不可达 · 点图标重试';
    if (isManualRetry) showToast('⚠️ 三路气象源均连接超时，请检查网络或代理设置');
  }

  function parseWMOWeather(code) {
    if (code === 0) return { icon: '☀️', desc: '晴朗无云 · 适宜创作' };
    if (code === 1 || code === 2) return { icon: '⛅', desc: '晴间多云 · 体感舒适' };
    if (code === 3) return { icon: '☁️', desc: '阴天多云 · 光线柔和' };
    if (code >= 45 && code <= 48) return { icon: '🌫️', desc: '轻雾弥漫 · 注意出行' };
    if (code >= 51 && code <= 67) return { icon: '🌧️', desc: '微雨阵雨 · 记得带伞' };
    if (code >= 71 && code <= 77) return { icon: '❄️', desc: '降雪天气 · 注意保暖' };
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

  // ==================== 15. 内置 8 大纯本地效率工具（圆角/格式转换支持多图批处理） ====================
  function openToolModal(type) {
    const modal = document.getElementById('toolModal');
    const title = document.getElementById('toolModalTitle');
    const body = document.getElementById('toolModalBody');
    if (!modal || !body) return;
    currentToolType = type;

    if (type === 'json') {
      title.textContent = '📋 JSON 格式化 / 压缩 / 校验器';
      body.innerHTML = `
        <textarea id="jsonInput" rows="8" placeholder="在此粘贴 JSON 字符串（关闭弹窗自动暂存）..." class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-indigo-500">${escapeHtml(toolSessionCache.json)}</textarea>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-tool-btn="json-pretty" class="px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold">✨ 格式化美化</button>
          <button type="button" data-tool-btn="json-minify" class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold">📦 压缩为单行</button>
          <button type="button" data-tool-btn="json-copy" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">📋 复制结果</button>
        </div>
        <div id="jsonStatus" class="text-xs font-mono text-slate-400">等待输入...</div>
      `;
    } else if (type === 'text') {
      title.textContent = '📝 字数统计 & 文本按行去重工具';
      body.innerHTML = `
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
      `;
      updateTextStats();
    } else if (type === 'radius') {
      title.textContent = '🖼️ 本地图片圆角合成器 (支持多图批处理 / Ctrl+V / 拖拽)';
      body.innerHTML = `
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
            <button type="button" id="radiusBatchExportBtn" data-tool-btn="radius-download-all" class="hidden px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">📦 批量导出全部</button>
          </div>
        </div>
      `;
      renderRadiusBatchBar();
      previewRadiusImage();
    } else if (type === 'time') {
      const nowUnix = Math.floor(Date.now() / 1000);
      const initTs = toolSessionCache.ts || String(nowUnix);
      const initHex = toolSessionCache.hex || '#6366f1';
      title.textContent = '⏱️ 时间戳 & UE5 Shader 颜色转换器';
      body.innerHTML = `
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
      `;
      convertTimestamp();
      syncColorHex(initHex);
    } else if (type === 'palette') {
      title.textContent = '🎨 图片吸管取色 & 主色聚类调色板 (支持 Ctrl+V 贴图 / 拖拽)';
      body.innerHTML = `
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
      `;
      if (paletteSourceImg) drawPaletteImg(paletteSourceImg);
    } else if (type === 'converter') {
      title.textContent = '🔄 本地图片格式转换 & 批量压缩 (支持多图批处理 / Ctrl+V / 拖拽)';
      body.innerHTML = `
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
            <button type="button" id="convBatchExportBtn" data-tool-btn="conv-download-all" class="hidden px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">📦 批量导出全部</button>
          </div>
        </div>
      `;
      document.getElementById('convFormat').value = toolSessionCache.convFormat;
      document.getElementById('convScale').value = toolSessionCache.convScale;
      renderConvBatchBar();
      updateConvertedPreview();
    } else if (type === 'cgcalc') {
      title.textContent = '🎬 CG 帧率时间码 & 画幅分辨率计算器';
      body.innerHTML = `
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
      `;
      document.getElementById('cgFps').value = toolSessionCache.cgFps;
      document.getElementById('cgRatio').value = toolSessionCache.cgRatio;
      calcCgFramesToTc();
      calcCgResolution();
    } else if (type === 'codec') {
      title.textContent = '🔐 编码加解密 & 强密码生成器';
      body.innerHTML = `
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
      `;
      if (!toolSessionCache.pwd) generateStrongPassword();
    }

    modal.classList.remove('hidden');
  }

  function closeToolModal() {
    currentToolType = '';
    document.getElementById('toolModal')?.classList.add('hidden');
  }

  // 多图批处理载入引擎（支持多选、多图拖拽、Ctrl+V 追加）
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

  async function loadImageFilesToActiveTool(fileList, targetTool = currentToolType) {
    const imgFiles = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
    if (imgFiles.length === 0) return;

    if (targetTool === 'palette') {
      try {
        const loaded = await readImageFile(imgFiles[0]);
        paletteSourceImg = loaded.img;
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
      radiusBatchItems = [...radiusBatchItems, ...loadedItems].slice(-20);
      radiusActiveIdx = radiusBatchItems.length - 1;
      renderRadiusBatchBar();
      previewRadiusImage();
      showToast(loadedItems.length > 1 ? `🖼️ 已批量载入 ${loadedItems.length} 张图片（队列共 ${radiusBatchItems.length} 张）` : '🖼️ 图片已载入圆角合成器');
    } else if (targetTool === 'converter') {
      convBatchItems = [...convBatchItems, ...loadedItems].slice(-20);
      convActiveIdx = convBatchItems.length - 1;
      renderConvBatchBar();
      updateConvertedPreview();
      showToast(loadedItems.length > 1 ? `🔄 已批量载入 ${loadedItems.length} 张图片（队列共 ${convBatchItems.length} 张）` : '🔄 图片已载入格式转换器');
    }
  }

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

  function renderRadiusBatchBar() {
    const bar = document.getElementById('radiusBatchBar');
    const batchBtn = document.getElementById('radiusBatchExportBtn');
    const clearBtn = document.getElementById('radiusClearBtn');
    if (bar) {
      bar.classList.toggle('hidden', radiusBatchItems.length === 0);
      if (radiusBatchItems.length > 0) bar.innerHTML = renderBatchChipsHtml('radius', radiusBatchItems, radiusActiveIdx);
    }
    if (batchBtn) {
      batchBtn.classList.toggle('hidden', radiusBatchItems.length <= 1);
      batchBtn.textContent = `📦 批量导出全部 (${radiusBatchItems.length}张)`;
    }
    if (clearBtn) clearBtn.classList.toggle('hidden', radiusBatchItems.length === 0);
  }

  function renderConvBatchBar() {
    const bar = document.getElementById('convBatchBar');
    const batchBtn = document.getElementById('convBatchExportBtn');
    const clearBtn = document.getElementById('convClearBtn');
    if (bar) {
      bar.classList.toggle('hidden', convBatchItems.length === 0);
      if (convBatchItems.length > 0) bar.innerHTML = renderBatchChipsHtml('converter', convBatchItems, convActiveIdx);
    }
    if (batchBtn) {
      batchBtn.classList.toggle('hidden', convBatchItems.length <= 1);
      batchBtn.textContent = `📦 批量导出全部 (${convBatchItems.length}张)`;
    }
    if (clearBtn) clearBtn.classList.toggle('hidden', convBatchItems.length === 0);
  }

  function drawRoundedToCanvas(canvas, img, r) {
    const ctx = canvas.getContext('2d');
    canvas.width = img.width; canvas.height = img.height;
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

  function previewRadiusImage() {
    const slider = document.getElementById('radiusSlider');
    const canvas = document.getElementById('radiusCanvas');
    if (!canvas || !slider) return;
    toolSessionCache.radiusVal = slider.value;
    const r = parseInt(slider.value, 10);
    const label = document.getElementById('radiusValLabel');
    if (label) label.textContent = r + 'px';

    const cur = radiusBatchItems[radiusActiveIdx];
    if (!cur) {
      const ctx = canvas.getContext('2d');
      canvas.width = 0; canvas.height = 0;
      ctx?.clearRect(0, 0, 0, 0);
      return;
    }
    drawRoundedToCanvas(canvas, cur.img, r);
  }

  async function batchExportRadiusImages() {
    if (radiusBatchItems.length === 0) { showToast('💡 请先选择或粘贴图片'); return; }
    const r = parseInt(toolSessionCache.radiusVal || '36', 10);
    const offscreen = document.createElement('canvas');
    for (let i = 0; i < radiusBatchItems.length; i++) {
      const item = radiusBatchItems[i];
      drawRoundedToCanvas(offscreen, item.img, r);
      const a = document.createElement('a');
      a.href = offscreen.toDataURL('image/png');
      a.download = `${item.name}_rounded.png`;
      a.click();
      if (i < radiusBatchItems.length - 1) await new Promise(res => setTimeout(res, 180));
    }
    showToast(`📦 已批量导出 ${radiusBatchItems.length} 张圆角透明 PNG`);
  }

  function updateConvertedPreview() {
    const q = document.getElementById('convQuality')?.value || '88';
    const fmt = document.getElementById('convFormat')?.value || 'image/jpeg';
    const scaleStr = document.getElementById('convScale')?.value || '1';
    toolSessionCache.convQuality = q;
    toolSessionCache.convFormat = fmt;
    toolSessionCache.convScale = scaleStr;
    const ql = document.getElementById('convQualityLabel');
    if (ql) ql.textContent = q + '%';

    const cur = convBatchItems[convActiveIdx];
    const canvas = document.getElementById('convCanvas');
    const badge = document.getElementById('convInfoBadge');
    if (!cur || !canvas) {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      if (badge) badge.textContent = '支持一次拖入多张图片批量转 WebP / 压缩，或按 Ctrl+V 粘贴截图';
      return;
    }

    const scale = parseFloat(scaleStr);
    const w = Math.max(1, Math.round(cur.img.width * scale));
    const h = Math.max(1, Math.round(cur.img.height * scale));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(cur.img, 0, 0, w, h);
    const kb = Math.round((canvas.toDataURL(fmt, parseInt(q, 10) / 100).length * 0.75) / 1024);
    if (badge) badge.textContent = `当前: ${cur.name} ｜ ${w} × ${h} px ｜ 预计体积: ~${kb} KB`;
  }

  async function batchExportConvertedImages() {
    if (convBatchItems.length === 0) { showToast('💡 请先选择或粘贴图片'); return; }
    const fmt = toolSessionCache.convFormat;
    const scale = parseFloat(toolSessionCache.convScale || '1');
    const quality = parseInt(toolSessionCache.convQuality || '88', 10) / 100;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[fmt] || 'jpg';
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');

    for (let i = 0; i < convBatchItems.length; i++) {
      const item = convBatchItems[i];
      const w = Math.max(1, Math.round(item.img.width * scale));
      const h = Math.max(1, Math.round(item.img.height * scale));
      offscreen.width = w; offscreen.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(item.img, 0, 0, w, h);
      const a = document.createElement('a');
      a.href = offscreen.toDataURL(fmt, quality);
      a.download = `${item.name}.${ext}`;
      a.click();
      if (i < convBatchItems.length - 1) await new Promise(res => setTimeout(res, 180));
    }
    showToast(`📦 已批量导出 ${convBatchItems.length} 张 ${ext.toUpperCase()} 图片`);
  }

  function runJsonTool(mode) {
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

  function updateTextStats() {
    const val = document.getElementById('textToolInput')?.value || '';
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('stTotal', val.length);
    set('stCN', (val.match(/[\u4e00-\u9fa5]/g) || []).length);
    set('stEN', (val.trim().match(/[a-zA-Z0-9_]+/g) || []).length);
    set('stLines', val ? val.split(/\r?\n/).length : 0);
  }

  function convertTimestamp() {
    const raw = document.getElementById('tsInput')?.value.trim() || '';
    toolSessionCache.ts = raw;
    const num = Number(raw);
    const out = document.getElementById('tsOutput');
    if (out && !isNaN(num) && raw) out.textContent = new Date(raw.length <= 10 ? num * 1000 : num).toLocaleString();
  }

  function syncColorHex(val) {
    const hex = val.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    toolSessionCache.hex = hex;
    const cp = document.getElementById('colorPicker'), hi = document.getElementById('hexInput');
    if (cp) cp.value = hex;
    if (hi) hi.value = hex;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const ro = document.getElementById('rgbOutput'), uo = document.getElementById('ueFloatOutput');
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

  function drawPaletteImg(img) {
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

  function calcCgFramesToTc() {
    const fpsVal = document.getElementById('cgFps')?.value || '30';
    const fVal = document.getElementById('cgFramesInput')?.value || '0';
    toolSessionCache.cgFps = fpsVal;
    toolSessionCache.cgFrames = fVal;
    const fps = Math.max(1, parseInt(fpsVal, 10));
    const f = Math.max(0, parseInt(fVal, 10));
    const pad = n => String(n).padStart(2, '0');
    const ts = Math.floor(f / fps);
    const out = document.getElementById('cgTcOutput');
    if (out) out.textContent = `${pad(Math.floor(ts / 3600))}:${pad(Math.floor(ts / 60) % 60)}:${pad(ts % 60)}:${pad(f % fps)} (${(f / fps).toFixed(2)}s)`;
  }

  function calcCgResolution() {
    const ratioVal = document.getElementById('cgRatio')?.value || '16:9';
    const wVal = document.getElementById('cgWidthInput')?.value || '1920';
    toolSessionCache.cgRatio = ratioVal;
    toolSessionCache.cgWidth = wVal;
    const [rw, rh] = ratioVal.split(':').map(Number);
    const w = Math.max(1, parseInt(wVal, 10));
    const out = document.getElementById('cgResOutput');
    if (out) out.textContent = `${w} × ${Math.round((w * rh) / rw)} px`;
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

  function runCodec(mode) {
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

  function generateStrongPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_+-=';
    const arr = new Uint32Array(20);
    window.crypto.getRandomValues(arr);
    let pwd = '';
    for (let i = 0; i < 20; i++) pwd += chars[arr[i] % chars.length];
    toolSessionCache.pwd = pwd;
    const out = document.getElementById('pwdOutput');
    if (out) out.value = pwd;
  }

  // ==================== 16. 全局纯事件委托中心 ====================
  function bindAllEvents() {
    // 1) 左栏控件 & 云同步配置（输入即自动保存 + 冲突无损合并）
    document.getElementById('brandLogoBtn')?.addEventListener('click', e => {
      if (isEditMode) { e.stopPropagation(); document.getElementById('brandLogoInput')?.click(); }
      else { clearSearchQuiet(); switchSpace('home', 'all'); }
    });
    document.getElementById('brandLogoInput')?.addEventListener('change', e => {
      handleBrandLogoUpload(e.target.files?.[0]);
      e.target.value = '';
    });
    document.getElementById('addGroupBtn')?.addEventListener('click', promptAddGroup);
    document.getElementById('openAddBookmarkBtn')?.addEventListener('click', () => openBookmarkModal());
    document.getElementById('editModeBtn')?.addEventListener('click', toggleEditMode);
    document.getElementById('exitEditModeBtn')?.addEventListener('click', toggleEditMode);
    document.getElementById('openDataCenterBtn')?.addEventListener('click', openDataCenterModal);
    document.getElementById('storageBadgePill')?.addEventListener('click', openDataCenterModal);

    document.getElementById('conflictMergeBtn')?.addEventListener('click', mergeConflictWithRemote);
    document.getElementById('conflictPullBtn')?.addEventListener('click', () => pullFromGist(false));
    document.getElementById('conflictForcePushBtn')?.addEventListener('click', () => pushToGist(false, true));

    const autoSaveGhInputs = () => {
      clearTimeout(configSaveTimer);
      configSaveTimer = setTimeout(() => {
        saveGhSyncConfigFromModal(false);
        const st = document.getElementById('ghSyncStatusText');
        if (st && ghSyncConfig.token) st.textContent = '配置已自动保存';
      }, 350);
    };
    document.getElementById('ghTokenInput')?.addEventListener('input', autoSaveGhInputs);
    document.getElementById('ghGistIdInput')?.addEventListener('input', autoSaveGhInputs);
    document.getElementById('ghAutoSyncToggle')?.addEventListener('change', () => {
      saveGhSyncConfigFromModal(false);
      showToast(ghSyncConfig.autoSync ? '☁️ 已开启自动云同步' : '⏸️ 已暂停自动云同步（仍可手动推拉）');
    });

    document.getElementById('ghSaveConfigBtn')?.addEventListener('click', () => saveGhSyncConfigFromModal(true));
    document.getElementById('ghPushBtn')?.addEventListener('click', () => { saveGhSyncConfigFromModal(false); pushToGist(false, true); });
    document.getElementById('ghPullBtn')?.addEventListener('click', () => { saveGhSyncConfigFromModal(false); pullFromGist(false); });
    document.getElementById('ghCopyGistIdBtn')?.addEventListener('click', () => {
      const gid = (document.getElementById('ghGistIdInput')?.value || ghSyncConfig.gistId || '').trim();
      if (!gid) { showToast('💡 请先点击「立即上传」自动生成 Gist ID'); return; }
      navigator.clipboard.writeText(gid).then(() => showToast('📋 Gist ID 已复制，可粘贴到另一台电脑'));
    });

    // 2) 搜索舱右上角图标与弹窗
    document.getElementById('accentPopoverBtn')?.addEventListener('click', toggleAccentPopover);
    document.getElementById('accentColorPopover')?.addEventListener('click', e => {
      e.stopPropagation();
      const dot = e.target.closest('[data-color]');
      if (dot) setAccentColor(dot.getAttribute('data-color'));
    });
    document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('recentPopoverBtn')?.addEventListener('click', toggleRecentPopover);
    document.getElementById('recentVisitsPopover')?.addEventListener('click', e => e.stopPropagation());
    document.getElementById('closeRecentPopoverBtn')?.addEventListener('click', closeRecentPopover);
    document.getElementById('clearAllHistoryBtn')?.addEventListener('click', () => {
      if (!recentVisits.length) return;
      recentVisits = [];
      writeStoreInternal({ [KEYS.recentVisits]: recentVisits });
      renderRecentVisitsList();
      showToast('🧹 已清空访问足迹');
    });
    document.getElementById('recentVisitsList')?.addEventListener('click', e => {
      const delBtn = e.target.closest('[data-recent-del-id]');
      if (delBtn) {
        e.stopPropagation();
        const delId = delBtn.getAttribute('data-recent-del-id');
        recentVisits = recentVisits.filter(r => r.id !== delId);
        writeStoreInternal({ [KEYS.recentVisits]: recentVisits });
        renderRecentVisitsList();
        return;
      }
      const openItem = e.target.closest('[data-recent-open-url]');
      if (openItem) {
        openBookmarkUrl(openItem.getAttribute('data-recent-open-id'), openItem.getAttribute('data-recent-open-url'), e.ctrlKey || e.metaKey);
      }
    });
    document.getElementById('toggleRightPanelBtn')?.addEventListener('click', toggleRightPanel);

    // 3) 搜索引擎、搜索框与热门快筛
    document.getElementById('searchEngineTabs')?.addEventListener('click', e => {
      const tab = e.target.closest('[data-engine]');
      if (tab) setSearchEngine(tab.getAttribute('data-engine'));
    });
    document.getElementById('searchForm')?.addEventListener('submit', handleSearchSubmit);
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', e => handleSearchInput(e.target.value));
    searchInput?.addEventListener('keydown', handleSearchKeydown);
    document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
    document.getElementById('hotFilterBar')?.addEventListener('click', e => {
      const tagBtn = e.target.closest('[data-quick-tag]');
      if (tagBtn) {
        const tag = tagBtn.getAttribute('data-quick-tag');
        setSearchEngine('local');
        if (searchInput) searchInput.value = tag;
        handleSearchInput(tag);
        showToast(`🔥 已快速筛选「${tag}」相关站点`);
        return;
      }
      const spBtn = e.target.closest('[data-quick-space]');
      if (spBtn) {
        clearSearchQuiet();
        switchSpace(spBtn.getAttribute('data-quick-space'), spBtn.getAttribute('data-quick-group') || 'all');
      }
    });

    // 4) 底部居中玻璃空间 Dock
    const dock = document.getElementById('spaceDockBar');
    dock?.addEventListener('click', e => {
      const btn = e.target.closest('[data-dock-space]');
      if (btn) { clearSearchQuiet(); switchSpace(btn.getAttribute('data-dock-space'), 'all'); }
    });
    bindNavDropDelegation(dock);

    // 5) 左侧分组目录
    const catNav = document.getElementById('categoryNav');
    catNav?.addEventListener('click', e => {
      const opBtn = e.target.closest('[data-group-op]');
      if (opBtn) {
        e.stopPropagation();
        const op = opBtn.getAttribute('data-group-op');
        const sp = opBtn.getAttribute('data-op-space');
        const gr = opBtn.getAttribute('data-op-group');
        if (op === 'rename') renameGroup(sp, gr);
        else if (op === 'delete') deleteGroup(sp, gr);
        return;
      }
      const toolBtn = e.target.closest('[data-open-tool]');
      if (toolBtn) { openToolModal(toolBtn.getAttribute('data-open-tool')); return; }
      const navBtn = e.target.closest('[data-nav-space]');
      if (navBtn) switchSpace(navBtn.getAttribute('data-nav-space'), navBtn.getAttribute('data-nav-group') || 'all');
    });
    catNav?.addEventListener('dragstart', e => {
      if (!isEditMode) return;
      const btn = e.target.closest('[data-drag-group-name]');
      if (!btn) return;
      draggedBookmarkId = null;
      draggedGroupInfo = { spaceId: btn.getAttribute('data-drag-group-space'), groupName: btn.getAttribute('data-drag-group-name') };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'GROUP::' + draggedGroupInfo.groupName);
      setTimeout(() => btn.classList.add('group-dragging'), 0);
    });
    catNav?.addEventListener('dragend', () => { draggedBookmarkId = null; draggedGroupInfo = null; clearAllDragClasses(); });
    bindNavDropDelegation(catNav);

    // 6) 中栏主内容区事件委托
    const main = document.getElementById('mainContent');
    if (main) {
      main.addEventListener('load', e => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('icon-img')) handleIconLoad(e.target);
      }, true);
      main.addEventListener('error', e => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('icon-img')) handleIconError(e.target);
      }, true);

      main.addEventListener('auxclick', e => {
        if (e.button !== 1) return;
        const bmCard = e.target.closest('.bookmark-card[data-bm-id]');
        if (!bmCard || e.target.closest('.card-action-bar')) return;
        e.preventDefault();
        const id = bmCard.getAttribute('data-bm-id');
        const bm = bookmarks.find(b => b.id === id);
        openBookmarkUrl(id, bm ? bm.url : bmCard.getAttribute('data-kbd-url'), true);
      });

      main.addEventListener('click', e => {
        const cardAct = e.target.closest('[data-card-action]');
        if (cardAct) {
          e.stopPropagation();
          const act = cardAct.getAttribute('data-card-action');
          const id = cardAct.getAttribute('data-bm-id');
          if (act === 'pin') togglePinBookmark(id);
          else if (act === 'move') openMoveGroupModal(id);
          else if (act === 'edit') openBookmarkModal(id);
          else if (act === 'delete') deleteBookmark(id);
          else if (act === 'dismiss-quick') dismissQuickSave(id);
          return;
        }
        if (e.target.closest('[data-clear-all-quick]')) { clearAllQuickSaves(); return; }
        const collapseBtn = e.target.closest('[data-collapse-key]');
        if (collapseBtn) {
          const key = collapseBtn.getAttribute('data-collapse-key');
          collapsedGroups[key] = !collapsedGroups[key];
          writeStoreInternal({ [KEYS.collapsed]: collapsedGroups });
          markLocalChangeAndSync();
          renderMainContent();
          return;
        }
        if (e.target.closest('[data-goto-tools]')) { switchSpace('tools', 'all'); return; }
        if (e.target.closest('[data-empty-add-bm]')) { openBookmarkModal(); return; }
        if (e.target.closest('[data-reset-home]')) { clearSearch(); switchSpace('home', 'all'); return; }

        const toolCard = e.target.closest('[data-open-tool]');
        if (toolCard) { openToolModal(toolCard.getAttribute('data-open-tool')); return; }

        const bmCard = e.target.closest('.bookmark-card[data-bm-id]');
        if (bmCard && !e.target.closest('.card-action-bar')) {
          const id = bmCard.getAttribute('data-bm-id');
          const bm = bookmarks.find(b => b.id === id);
          openBookmarkUrl(id, bm ? bm.url : bmCard.getAttribute('data-kbd-url'), e.ctrlKey || e.metaKey);
        }
      });

      main.addEventListener('contextmenu', e => {
        const bmCard = e.target.closest('.bookmark-card[data-bm-id]');
        if (bmCard) openCardContextMenu(e, bmCard.getAttribute('data-bm-id'));
      });

      main.addEventListener('dragstart', e => {
        if (!isEditMode) return;
        const card = e.target.closest('.bookmark-card[data-bm-id]');
        if (!card) return;
        draggedGroupInfo = null;
        draggedBookmarkId = card.getAttribute('data-bm-id');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedBookmarkId);
        setTimeout(() => card.classList.add('dragging-card'), 0);
      });

      main.addEventListener('dragover', e => {
        if (!isEditMode || !draggedBookmarkId) return;
        if (e.target.closest('.bookmark-card[data-bm-id]') || e.target.closest('[data-drop-section-group]')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      });

      main.addEventListener('dragenter', e => {
        if (!isEditMode || !draggedBookmarkId) return;
        const card = e.target.closest('.bookmark-card[data-bm-id]');
        if (card && card.getAttribute('data-bm-id') !== draggedBookmarkId) { card.classList.add('drag-over-card'); return; }
        const sec = e.target.closest('[data-drop-section-group]');
        if (sec) sec.classList.add('section-drop-target');
      });

      main.addEventListener('dragleave', e => {
        const card = e.target.closest('.bookmark-card[data-bm-id]');
        if (card && !card.contains(e.relatedTarget)) card.classList.remove('drag-over-card');
        const sec = e.target.closest('[data-drop-section-group]');
        if (sec && !sec.contains(e.relatedTarget)) sec.classList.remove('section-drop-target');
      });

      main.addEventListener('drop', e => {
        if (!isEditMode || !draggedBookmarkId) return;
        const card = e.target.closest('.bookmark-card[data-bm-id]');
        if (card) {
          e.preventDefault(); e.stopPropagation();
          card.classList.remove('drag-over-card');
          const targetBmId = card.getAttribute('data-bm-id');
          if (!targetBmId || targetBmId === draggedBookmarkId) return;
          const fromIdx = bookmarks.findIndex(b => b.id === draggedBookmarkId);
          const toIdx = bookmarks.findIndex(b => b.id === targetBmId);
          if (fromIdx === -1 || toIdx === -1) return;
          const [movedItem] = bookmarks.splice(fromIdx, 1);
          const targetItem = bookmarks.find(b => b.id === targetBmId);
          const isVirtualView = currentSpace === 'home' || !!searchQuery.trim();
          if (!isVirtualView && targetItem) { movedItem.space = targetItem.space; movedItem.group = targetItem.group; }
          const newToIdx = bookmarks.findIndex(b => b.id === targetBmId);
          bookmarks.splice(fromIdx < toIdx ? newToIdx + 1 : newToIdx, 0, movedItem);
          finishDragUpdate(`✨ 已调整「${movedItem.title}」的排列顺序`);
          return;
        }
        const sec = e.target.closest('[data-drop-section-group]');
        if (sec) {
          e.preventDefault(); e.stopPropagation();
          sec.classList.remove('section-drop-target');
          moveBookmarkTo(draggedBookmarkId, sec.getAttribute('data-drop-section-space'), sec.getAttribute('data-drop-section-group'));
        }
      });

      main.addEventListener('dragend', () => { draggedBookmarkId = null; draggedGroupInfo = null; clearAllDragClasses(); });
    }

    // 7) 右栏天气、便签（含关页即时落盘）与待办
    document.getElementById('citySelector')?.addEventListener('change', e => changeWeatherCity(e.target.value, true, false));
    const retryWeather = () => fetchWeatherData(lastWeatherArgs.lat, lastWeatherArgs.lon, lastWeatherArgs.cityName, true);
    document.getElementById('weatherIcon')?.addEventListener('click', retryWeather);
    document.getElementById('weatherCityBadge')?.addEventListener('click', retryWeather);

    document.getElementById('tabBtnMemo')?.addEventListener('click', () => switchNoteTab('memo'));
    document.getElementById('tabBtnTodo')?.addEventListener('click', () => switchNoteTab('todo'));
    document.getElementById('quickMemoArea')?.addEventListener('input', e => handleMemoInput(e.target.value));
    window.addEventListener('pagehide', () => {
      if (memoWriteTimer) {
        const area = document.getElementById('quickMemoArea');
        flushMemoWriteNow(area ? area.value : '', false);
      }
    });
    document.getElementById('insertMemoTimeBtn')?.addEventListener('click', () => {
      const area = document.getElementById('quickMemoArea');
      if (!area) return;
      const now = new Date();
      const stamp = `[${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}] `;
      area.value += (area.value && !area.value.endsWith('\n') ? '\n' : '') + stamp;
      area.focus();
      handleMemoInput(area.value);
    });
    document.getElementById('copyMemoBtn')?.addEventListener('click', () => {
      const area = document.getElementById('quickMemoArea');
      if (!area || !area.value.trim()) { showToast('💡 便签内容为空'); return; }
      navigator.clipboard.writeText(area.value).then(() => showToast('📋 便签内容已复制'));
    });
    document.getElementById('clearMemoBtn')?.addEventListener('click', () => {
      const area = document.getElementById('quickMemoArea');
      if (area && area.value && confirm('确定清空当前便签内容吗？')) { area.value = ''; flushMemoWriteNow('', false); updateMemoCount(''); showToast('🧹 便签已清空'); }
    });
    document.getElementById('todoForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('todoInput');
      const text = (input?.value || '').trim();
      if (!text) return;
      todos.unshift({ id: 'td_' + Date.now(), text, done: false });
      input.value = '';
      saveTodos();
      renderTodoList();
    });
    document.getElementById('todoList')?.addEventListener('change', e => {
      const cb = e.target.closest('[data-todo-toggle]');
      if (!cb) return;
      const item = todos.find(t => t.id === cb.getAttribute('data-todo-toggle'));
      if (item) { item.done = cb.checked; saveTodos(); renderTodoList(); }
    });
    document.getElementById('todoList')?.addEventListener('click', e => {
      const del = e.target.closest('[data-todo-del]');
      if (!del) return;
      todos = todos.filter(t => t.id !== del.getAttribute('data-todo-del'));
      saveTodos();
      renderTodoList();
    });
    document.getElementById('clearDoneTodosBtn')?.addEventListener('click', () => {
      const before = todos.length;
      todos = todos.filter(t => !t.done);
      if (todos.length === before) { showToast('💡 没有已完成的待办项'); return; }
      saveTodos();
      renderTodoList();
      showToast(`🧹 已清理 ${before - todos.length} 条已完成待办`);
    });

    // 8) 右键菜单（含单站图标强制刷新）
    document.getElementById('cardContextMenu')?.addEventListener('click', e => {
      e.stopPropagation();
      const btn = e.target.closest('[data-ctx-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-ctx-action');
      const id = contextMenuBmId;
      closeCardContextMenu();
      const bm = bookmarks.find(b => b.id === id);
      if (!bm) return;
      if (action === 'open-bg') openBookmarkUrl(id, bm.url, true);
      else if (action === 'pin') togglePinBookmark(id);
      else if (action === 'copy') navigator.clipboard.writeText(bm.url).then(() => showToast('📋 网址已复制到剪贴板'));
      else if (action === 'refresh-icon') refreshBookmarkIcon(id);
      else if (action === 'refresh-icon') refreshBookmarkIcon(id);
      else if (action === 'dismiss-quick') dismissQuickSave(id);
      else if (action === 'move') openMoveGroupModal(id);
      else if (action === 'edit') openBookmarkModal(id);
      else if (action === 'delete') deleteBookmark(id);
    });

    // 9) 书签、移动分组、数据中心与分级维护弹窗
    document.getElementById('bookmarkModal')?.addEventListener('click', e => { if (e.target.id === 'bookmarkModal') closeBookmarkModal(); });
    document.getElementById('closeBookmarkModalBtn')?.addEventListener('click', closeBookmarkModal);
    document.getElementById('cancelBookmarkModalBtn')?.addEventListener('click', closeBookmarkModal);
    document.getElementById('bookmarkForm')?.addEventListener('submit', saveBookmark);
    document.getElementById('bmSpaceSelect')?.addEventListener('change', e => populateSelectGroups(document.getElementById('bmGroupSelect'), e.target.value));
    document.getElementById('autoDetectBtn')?.addEventListener('click', () => autoDetectSiteMetadata(true));
    document.getElementById('bmUrl')?.addEventListener('blur', () => autoDetectSiteMetadata(false));

    document.getElementById('moveGroupModal')?.addEventListener('click', e => { if (e.target.id === 'moveGroupModal') closeMoveGroupModal(); });
    document.getElementById('closeMoveGroupModalBtn')?.addEventListener('click', closeMoveGroupModal);
    document.getElementById('cancelMoveGroupModalBtn')?.addEventListener('click', closeMoveGroupModal);
    document.getElementById('moveSpaceSelect')?.addEventListener('change', e => populateSelectGroups(document.getElementById('moveGroupSelect'), e.target.value));
    document.getElementById('confirmMoveGroupBtn')?.addEventListener('click', confirmMoveBookmarkGroup);

    document.getElementById('dataCenterModal')?.addEventListener('click', e => { if (e.target.id === 'dataCenterModal') closeDataCenterModal(); });
    document.getElementById('closeDataCenterModalBtn')?.addEventListener('click', closeDataCenterModal);
    document.getElementById('closeDataCenterFooterBtn')?.addEventListener('click', closeDataCenterModal);
    document.getElementById('dcExportBtn')?.addEventListener('click', exportData);
    document.getElementById('importFile')?.addEventListener('change', e => { importData(e.target.files?.[0]); e.target.value = ''; });
    document.getElementById('dcScanDupBtn')?.addEventListener('click', scanDuplicateBookmarks);
    document.getElementById('dcCheckLinksBtn')?.addEventListener('click', checkDeadLinks);
    document.getElementById('dcMergeDefaultBtn')?.addEventListener('click', mergeMissingDefaultBookmarks);
    document.getElementById('dcResetUiBtn')?.addEventListener('click', resetUiAndCaches);
    document.getElementById('dcRestoreSnapshotBtn')?.addEventListener('click', restorePreResetSnapshot);
    document.getElementById('dcDangerToggleBtn')?.addEventListener('click', () => {
      const box = document.getElementById('dcDangerBox');
      const arrow = document.getElementById('dcDangerArrow');
      if (!box) return;
      const hidden = box.classList.toggle('hidden');
      if (arrow) arrow.textContent = hidden ? '▾' : '▴';
    });
    document.getElementById('dcResetBtn')?.addEventListener('click', resetDefaultData);
    document.getElementById('dcClearAllBtn')?.addEventListener('click', clearAllLocalBookmarks);

    document.getElementById('duplicateReportBox')?.addEventListener('click', e => {
      if (e.target.closest('[data-dead-stop]')) {
        if (linkCheckAbortController) { linkCheckAbortController.abort(); linkCheckAbortController = null; }
        showToast('⏹️ 已停止体检');
        return;
      }
      const openDead = e.target.closest('[data-dead-open-url]');
      if (openDead) {
        window.open(openDead.getAttribute('data-dead-open-url'), '_blank', 'noopener,noreferrer');
        return;
      }
      const delDead = e.target.closest('[data-dead-del-id]');
      if (delDead) {
        const id = delDead.getAttribute('data-dead-del-id');
        deleteBookmark(id);
        document.getElementById('dcTotalCount').textContent = `${bookmarks.length} 个书签`;
        delDead.closest('.flex.items-center.justify-between')?.remove();
        return;
      }
      if (e.target.closest('[data-dup-clean-all]')) {
        const seen = new Set(); let removed = 0;
        bookmarks = bookmarks.filter(bm => { const k = canonicalUrlKey(bm.url); if (seen.has(k)) { removed++; return false; } seen.add(k); return true; });
        if (removed > 0) {
          saveCoreState();
          document.getElementById('dcTotalCount').textContent = `${bookmarks.length} 个书签`;
          renderSpaceDock(); renderSidebarGroups(); renderMainContent(); scanDuplicateBookmarks();
          showToast(`🧹 已一键清理 ${removed} 条重复书签`);
        }
        return;
      }
      const delOne = e.target.closest('[data-dup-del-id]');
      if (delOne) {
        const id = delOne.getAttribute('data-dup-del-id');
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveCoreState();
        document.getElementById('dcTotalCount').textContent = `${bookmarks.length} 个书签`;
        renderSpaceDock(); renderSidebarGroups(); renderMainContent(); scanDuplicateBookmarks();
        showToast('🗑️ 已移除重复书签');
      }
    });

    // 10) 工具箱弹窗内部委托 + 多图拖拽导入 + 全局 Ctrl+V 贴图 + 批处理队列控制
    document.getElementById('toolModal')?.addEventListener('click', e => { if (e.target.id === 'toolModal') closeToolModal(); });
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
      if (!['radius', 'palette', 'converter'].includes(currentToolType)) return;
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
        loadImageFilesToActiveTool(files, currentToolType);
      }
    });

    toolBody?.addEventListener('input', e => {
      const id = e.target.id;
      if (id === 'jsonInput') toolSessionCache.json = e.target.value;
      else if (id === 'textToolInput') { toolSessionCache.text = e.target.value; updateTextStats(); }
      else if (id === 'radiusSlider') previewRadiusImage();
      else if (id === 'tsInput') toolSessionCache.ts = e.target.value;
      else if (id === 'colorPicker' || id === 'hexInput') syncColorHex(e.target.value);
      else if (id === 'convQuality') updateConvertedPreview();
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
        if (tool === 'radius') { radiusActiveIdx = idx; renderRadiusBatchBar(); previewRadiusImage(); }
        else if (tool === 'converter') { convActiveIdx = idx; renderConvBatchBar(); updateConvertedPreview(); }
        return;
      }
      const batchRem = e.target.closest('[data-batch-remove]');
      if (batchRem) {
        const tool = batchRem.getAttribute('data-batch-remove');
        const idx = parseInt(batchRem.getAttribute('data-batch-idx'), 10);
        if (tool === 'radius') {
          radiusBatchItems.splice(idx, 1);
          radiusActiveIdx = Math.max(0, Math.min(radiusActiveIdx, radiusBatchItems.length - 1));
          renderRadiusBatchBar(); previewRadiusImage();
        } else if (tool === 'converter') {
          convBatchItems.splice(idx, 1);
          convActiveIdx = Math.max(0, Math.min(convActiveIdx, convBatchItems.length - 1));
          renderConvBatchBar(); updateConvertedPreview();
        }
        return;
      }
      if (e.target.id === 'paletteCanvas') {
        const canvas = e.target; if (!canvas.width) return;
        const rect = canvas.getBoundingClientRect();
        const [r, g, b] = canvas.getContext('2d').getImageData(Math.floor((e.clientX - rect.left) * (canvas.width / rect.width)), Math.floor((e.clientY - rect.top) * (canvas.height / rect.height)), 1, 1).data;
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
      if (copyHex) { const h = copyHex.getAttribute('data-copy-hex'); navigator.clipboard.writeText(h); showToast(`🎨 已复制 ${h}`); return; }
      const preset = e.target.closest('[data-cg-preset]');
      if (preset) { document.getElementById('cgWidthInput').value = preset.getAttribute('data-cg-preset'); calcCgResolution(); return; }
      const btn = e.target.closest('[data-tool-btn]');
      if (!btn) return;
      const act = btn.getAttribute('data-tool-btn');
      if (act === 'json-pretty') runJsonTool('pretty');
      else if (act === 'json-minify') runJsonTool('minify');
      else if (act === 'json-copy') runJsonTool('copy');
      else if (act === 'text-dedup') {
        const el = document.getElementById('textToolInput');
        if (el) { el.value = Array.from(new Set(el.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))).join('\n'); toolSessionCache.text = el.value; updateTextStats(); showToast('🧹 已按行去重'); }
      } else if (act === 'text-copy') { navigator.clipboard.writeText(document.getElementById('textToolInput')?.value || ''); showToast('📋 已复制文本'); }
      else if (act === 'radius-clear') { radiusBatchItems = []; radiusActiveIdx = 0; renderRadiusBatchBar(); previewRadiusImage(); }
      else if (act === 'radius-download') {
        const c = document.getElementById('radiusCanvas');
        const cur = radiusBatchItems[radiusActiveIdx];
        if (!c || !cur) { showToast('💡 请先选择或粘贴图片'); return; }
        const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `${cur.name}_rounded.png`; a.click();
      } else if (act === 'radius-download-all') batchExportRadiusImages();
      else if (act === 'ts-convert') convertTimestamp();
      else if (act === 'palette-copy') { navigator.clipboard.writeText(toolSessionCache.pickedHex); showToast(`🎨 已复制 ${toolSessionCache.pickedHex}`); }
      else if (act === 'conv-clear') { convBatchItems = []; convActiveIdx = 0; renderConvBatchBar(); updateConvertedPreview(); }
      else if (act === 'conv-download') {
        const cur = convBatchItems[convActiveIdx];
        if (!cur) { showToast('💡 请先选择或粘贴图片'); return; }
        const c = document.getElementById('convCanvas');
        const fmt = toolSessionCache.convFormat;
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[fmt] || 'jpg';
        const a = document.createElement('a'); a.href = c.toDataURL(fmt, parseInt(toolSessionCache.convQuality, 10) / 100); a.download = `${cur.name}.${ext}`; a.click();
      } else if (act === 'conv-download-all') batchExportConvertedImages();
      else if (['b64enc', 'b64dec', 'urlenc', 'urldec'].includes(act)) runCodec(act);
      else if (act === 'codec-copy') { navigator.clipboard.writeText(document.getElementById('codecInput')?.value || ''); showToast('📋 已复制'); }
      else if (act === 'pwd-gen') generateStrongPassword();
      else if (act === 'pwd-copy') { navigator.clipboard.writeText(document.getElementById('pwdOutput')?.value || ''); showToast('📋 强密码已复制'); }
    });

    // 11) Toast（含撤销操作）、回到顶部、数字键 1-6 切空间、唤醒自动同步
    document.getElementById('toastContainer')?.addEventListener('click', e => {
      const undoBtn = e.target.closest('[data-toast-undo]');
      if (undoBtn) {
        undoLastDelete();
        undoBtn.closest('.toast-animate')?.remove();
        return;
      }
      if (e.target.closest('[data-toast-close]')) e.target.closest('.toast-animate')?.remove();
    });
    document.getElementById('backToTopBtn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      const hasOpenModal = ['bookmarkModal', 'moveGroupModal', 'dataCenterModal', 'toolModal'].some(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
      });

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); searchInput?.focus(); searchInput?.select();
      } else if (e.key === '/' && !isTyping && !hasOpenModal && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); searchInput?.focus(); searchInput?.select();
      } else if (!isTyping && !hasOpenModal && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-6]$/.test(e.key)) {
        const sp = SPACES_CONFIG[parseInt(e.key, 10) - 1];
        if (sp) { clearSearchQuiet(); switchSpace(sp.id, 'all'); }
      } else if (e.key === 'Escape') {
        closeBookmarkModal(); closeMoveGroupModal(); closeDataCenterModal();
        closeToolModal(); closeRecentPopover(); closeAccentPopover(); closeCardContextMenu();
      }
    });

    document.addEventListener('click', () => { closeRecentPopover(); closeAccentPopover(); closeCardContextMenu(); });

    const checkRemoteOnWake = () => {
      if (document.visibilityState === 'hidden') return;
      if (!ghSyncConfig.token || !ghSyncConfig.gistId || !ghSyncConfig.autoSync) return;
      const now = Date.now();
      if (now - lastWakePullAt < 60000) return;
      lastWakePullAt = now;
      pullFromGist(true);
    };
    document.addEventListener('visibilitychange', checkRemoteOnWake);
    window.addEventListener('focus', checkRemoteOnWake);

    const backBtn = document.getElementById('backToTopBtn');
    window.addEventListener('scroll', () => {
      closeCardContextMenu();
      if (!backBtn) return;
      const show = window.scrollY > 260;
      backBtn.classList.toggle('opacity-0', !show);
      backBtn.classList.toggle('pointer-events-none', !show);
      backBtn.classList.toggle('translate-y-4', !show);
      backBtn.classList.toggle('opacity-100', show);
      backBtn.classList.toggle('translate-y-0', show);
    }, { passive: true });
  }

  function bindNavDropDelegation(container) {
    if (!container) return;
    container.addEventListener('dragover', e => {
      if (!isEditMode || (!draggedBookmarkId && !draggedGroupInfo)) return;
      if (e.target.closest('[data-drop-type]')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    container.addEventListener('dragenter', e => {
      if (!isEditMode || (!draggedBookmarkId && !draggedGroupInfo)) return;
      const target = e.target.closest('[data-drop-type]');
      if (target) target.classList.add('nav-drop-target');
    });
    container.addEventListener('dragleave', e => {
      const target = e.target.closest('[data-drop-type]');
      if (target && !target.contains(e.relatedTarget)) target.classList.remove('nav-drop-target');
    });
    container.addEventListener('drop', e => {
      if (!isEditMode) return;
      const target = e.target.closest('[data-drop-type]');
      if (!target) return;
      e.preventDefault(); e.stopPropagation();
      target.classList.remove('nav-drop-target');
      const type = target.getAttribute('data-drop-type');

      if (type === 'group') {
        const sp = target.getAttribute('data-drop-space');
        const gr = target.getAttribute('data-drop-group');
        if (draggedGroupInfo && draggedGroupInfo.spaceId === sp) {
          const srcName = draggedGroupInfo.groupName;
          if (srcName === gr) return;
          const list = getGroupsForSpace(sp);
          const fromIdx = list.indexOf(srcName), toIdx = list.indexOf(gr);
          if (fromIdx === -1 || toIdx === -1) return;
          list.splice(fromIdx, 1); list.splice(toIdx, 0, srcName);
          spaceGroups[sp] = list;
          finishDragUpdate(`↕️ 已调整分组「${srcName}」的显示顺序`);
        } else if (draggedBookmarkId) {
          moveBookmarkTo(draggedBookmarkId, sp, gr);
        }
      } else if (type === 'space' && draggedBookmarkId) {
        const sp = target.getAttribute('data-drop-space');
        const groups = getGroupsForSpace(sp);
        moveBookmarkTo(draggedBookmarkId, sp, groups[0] || '📁 默认分组');
      } else if (type === 'pin' && draggedBookmarkId) {
        const bm = bookmarks.find(b => b.id === draggedBookmarkId);
        if (bm) { bm.pinned = true; finishDragUpdate(`⭐ 已将「${bm.title}」置顶到首页聚焦`); }
      }
    });
  }

  // ==================== 17. 通用工具函数与增强版 Toast ====================
  async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeUrl(url) { return (url || '').trim().replace(/\/$/, '').toLowerCase(); }
  function getOriginAndPath(url) { try { const u = new URL(url); return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase(); } catch { return ''; } }
  function extractDomain(url) { try { return new URL(url).hostname; } catch { return ''; } }
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showToast(msg, opts = {}) {
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
      item.style.opacity = '0'; item.style.transform = 'translateY(8px)'; item.style.transition = 'all 0.25s ease';
      setTimeout(() => { if (item.isConnected) item.remove(); }, 250);
    }, delay);
  }

  // ==================== 18. GitHub 私有 Gist 云同步与双机无损智能合并引擎 ====================
  const GIST_FILENAME = 'personal_workspace_sync.json';

  function showSyncConflictBanner(info) {
    const banner = document.getElementById('syncConflictBanner');
    const text = document.getElementById('syncConflictText');
    if (!banner) return;
    const rTime = info?.remoteUpdatedAt ? new Date(info.remoteUpdatedAt).toLocaleString() : '较新时间';
    if (text) text.textContent = `检测到云端存在另一台设备更新的数据（${rTime}），已暂停覆盖保护数据安全，推荐点击「智能合并两边」无损保留双方修改：`;
    banner.classList.remove('hidden');
    updateSyncBadgeUI('conflict');
  }

  function hideSyncConflictBanner() {
    document.getElementById('syncConflictBanner')?.classList.add('hidden');
  }

  function updateSyncBadgeUI(state = 'idle') {
    const pill = document.getElementById('storageBadgePill');
    const modalStatus = document.getElementById('ghSyncStatusText');
    const timeStr = ghSyncConfig.lastSyncAt
      ? new Date(ghSyncConfig.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    if (pill) {
      if (state === 'syncing') {
        pill.textContent = '☁️ 同步中...';
        pill.className = 'py-2 px-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/25 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
      } else if (state === 'conflict') {
        pill.textContent = '⚠️ 发现冲突';
        pill.className = 'py-2 px-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
      } else if (state === 'error') {
        pill.textContent = '⚠️ 同步异常';
        pill.className = 'py-2 px-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
      } else if (ghSyncConfig.token && ghSyncConfig.gistId) {
        pill.textContent = timeStr ? `☁️ ${timeStr}` : '☁️ 云同步';
        pill.className = 'py-2 px-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
      } else {
        pill.textContent = '● 本地存';
        pill.className = 'py-2 px-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold shrink-0 cursor-pointer';
      }
    }

    if (modalStatus) {
      if (state === 'syncing') modalStatus.textContent = '正在连接 GitHub...';
      else if (state === 'conflict') modalStatus.textContent = '存在双机冲突，请在主页面顶部选择';
      else if (state === 'error') modalStatus.textContent = '同步失败，请检查网络或 Token';
      else if (ghSyncConfig.token && ghSyncConfig.gistId) modalStatus.textContent = timeStr ? `上次同步 ${timeStr}` : '已连接私有 Gist';
      else if (ghSyncConfig.token) modalStatus.textContent = '配置已自动保存 · 待首次上传';
      else modalStatus.textContent = '未配置';
    }
  }

  function populateSyncModalFields() {
    const tEl = document.getElementById('ghTokenInput');
    const gEl = document.getElementById('ghGistIdInput');
    const aEl = document.getElementById('ghAutoSyncToggle');
    if (tEl) tEl.value = ghSyncConfig.token || '';
    if (gEl) gEl.value = ghSyncConfig.gistId || '';
    if (aEl) aEl.checked = ghSyncConfig.autoSync !== false;
    updateSyncBadgeUI();
  }

  function saveGhSyncConfigFromModal(notify = true) {
    ghSyncConfig.token = (document.getElementById('ghTokenInput')?.value || '').trim();
    ghSyncConfig.gistId = (document.getElementById('ghGistIdInput')?.value || '').trim();
    ghSyncConfig.autoSync = !!document.getElementById('ghAutoSyncToggle')?.checked;
    writeStoreInternal({ [KEYS.ghSync]: ghSyncConfig });
    updateSyncBadgeUI();
    if (notify) showToast('✅ GitHub 同步配置已保存');
  }

  function applySyncPayload(data) {
    if (!data || !Array.isArray(data.bookmarks)) return false;
    bookmarks = data.bookmarks;
    if (data.spaceGroups && typeof data.spaceGroups === 'object') {
      spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...data.spaceGroups };
    }
    if (Array.isArray(data.todos)) {
      todos = data.todos;
      saveTodos(true);
      renderTodoList();
    }
    if (typeof data.memo === 'string') {
      const area = document.getElementById('quickMemoArea');
      if (area) area.value = data.memo;
      handleMemoInput(data.memo, true);
    }
    if (data.settings) {
      applySettingsPayload(data.settings);
    }
    if (currentSpace !== 'home' && currentSpace !== 'tools' && currentGroup !== 'all') {
      if (!getGroupsForSpace(currentSpace).includes(currentGroup)) currentGroup = 'all';
    }
    localUpdatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : Date.now();
    hydrateOfflineBase64Icons(true);
    saveCoreState(true);
    renderSpaceDock();
    renderSidebarGroups();
    renderMainContent();
    return true;
  }

  function ghHeaders() {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${ghSyncConfig.token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  async function fetchRemoteGistData() {
    const res = await fetchWithTimeout(`https://api.github.com/gists/${encodeURIComponent(ghSyncConfig.gistId)}`, {
      headers: ghHeaders(),
      cache: 'no-store'
    }, 10000);

    if (!res.ok) {
      if (res.status === 401) throw new Error('Token 无效或已过期');
      if (res.status === 404) throw new Error('找不到对应的 Gist ID');
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const fileObj = json.files?.[GIST_FILENAME] || Object.values(json.files || {}).find(f => f.filename?.endsWith('.json'));
    if (!fileObj) throw new Error('Gist 中未找到同步数据文件');

    let rawContent = fileObj.content || '';
    if (fileObj.truncated && fileObj.raw_url) {
      const rawRes = await fetchWithTimeout(fileObj.raw_url, { cache: 'no-store' }, 10000);
      rawContent = await rawRes.text();
    }
    return JSON.parse(rawContent);
  }

  // 🔀 双机冲突无损智能合并：按规范 URL 并集合并书签 + 合并分组 + 并集合并待办 + 安全拼接便签，再推送云端
  async function mergeConflictWithRemote() {
    if (!ghSyncConfig.token || !ghSyncConfig.gistId) {
      showToast('💡 请先配置 GitHub Token 和 Gist ID');
      return;
    }
    if (isSyncing) return;
    isSyncing = true;
    updateSyncBadgeUI('syncing');

    try {
      const remoteData = await fetchRemoteGistData();
      const remoteBms = Array.isArray(remoteData.bookmarks) ? remoteData.bookmarks : [];
      const localMap = new Map(bookmarks.map(b => [canonicalUrlKey(b.url), b]));
      let addedBms = 0;

      remoteBms.forEach(rb => {
        const key = canonicalUrlKey(rb.url);
        if (!localMap.has(key)) {
          bookmarks.push(rb);
          localMap.set(key, rb);
          addedBms++;
        } else {
          const lb = localMap.get(key);
          if (rb.pinned && !lb.pinned) lb.pinned = true;
        }
      });

      // 并集合并各空间分组
      if (remoteData.spaceGroups && typeof remoteData.spaceGroups === 'object') {
        Object.entries(remoteData.spaceGroups).forEach(([sp, list]) => {
          if (!Array.isArray(list)) return;
          if (!spaceGroups[sp]) spaceGroups[sp] = [];
          list.forEach(g => { if (!spaceGroups[sp].includes(g)) spaceGroups[sp].push(g); });
        });
      }
      bookmarks.forEach(b => {
        if (!spaceGroups[b.space]) spaceGroups[b.space] = [];
        if (b.group && !spaceGroups[b.space].includes(b.group)) spaceGroups[b.space].push(b.group);
      });

      // 并集合并待办清单
      const remoteTodos = Array.isArray(remoteData.todos) ? remoteData.todos : [];
      const localTodoIds = new Set(todos.map(t => t.id));
      const localTodoTexts = new Set(todos.map(t => (t.text || '').trim().toLowerCase()));
      let addedTodos = 0;
      remoteTodos.forEach(rt => {
        const normText = (rt.text || '').trim().toLowerCase();
        if (!localTodoIds.has(rt.id) && !localTodoTexts.has(normText)) {
          todos.push(rt);
          localTodoIds.add(rt.id);
          localTodoTexts.add(normText);
          addedTodos++;
        }
      });

      // 便签智能防丢合并
      const area = document.getElementById('quickMemoArea');
      const localMemo = (area ? area.value : '').trim();
      const remoteMemo = (typeof remoteData.memo === 'string' ? remoteData.memo : '').trim();
      let mergedMemo = localMemo;
      if (remoteMemo && remoteMemo !== localMemo) {
        if (!localMemo) mergedMemo = remoteMemo;
        else if (remoteMemo.includes(localMemo)) mergedMemo = remoteMemo;
        else if (!localMemo.includes(remoteMemo)) mergedMemo = `${localMemo}\n\n--- [另一台设备合并] ---\n${remoteMemo}`;
      }
      if (area) area.value = mergedMemo;

      // 合并分组折叠映射
      if (remoteData.settings?.collapsed && typeof remoteData.settings.collapsed === 'object') {
        collapsedGroups = { ...remoteData.settings.collapsed, ...collapsedGroups };
        writeStoreInternal({ [KEYS.collapsed]: collapsedGroups });
      }

      localUpdatedAt = Date.now();
      hydrateOfflineBase64Icons(true);
      saveTodos(true);
      renderTodoList();
      flushMemoWriteNow(mergedMemo, true);
      updateMemoCount(mergedMemo);
      saveCoreState(true);
      renderSpaceDock();
      renderSidebarGroups();
      renderMainContent();

      isSyncing = false;
      await pushToGist(true, true);
      hideSyncConflictBanner();
      showToast(`🔀 无损合并完成：补入云端 ${addedBms} 条书签、${addedTodos} 条待办并已同步上云`, { duration: 4200 });
    } catch (err) {
      console.error('智能合并失败:', err);
      updateSyncBadgeUI('error');
      showToast(`❌ 智能合并失败：${err.message || '请检查网络'}`);
      isSyncing = false;
    }
  }

  function scheduleAutoSync() {
    if (!ghSyncConfig.token || !ghSyncConfig.autoSync) return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => pushToGist(true, false), 1800);
  }

  async function autoSyncOnStartup() {
    if (!ghSyncConfig.token || !ghSyncConfig.gistId || !ghSyncConfig.autoSync) return;
    lastWakePullAt = Date.now();
    await pullFromGist(true);
  }

  async function pushToGist(silent = false, force = false) {
    if (!ghSyncConfig.token) {
      if (!silent) showToast('💡 请先填写 GitHub Token');
      return;
    }

    if (IS_EXTENSION && chrome.runtime && chrome.runtime.sendMessage) {
      updateSyncBadgeUI('syncing');
      try {
        const res = await chrome.runtime.sendMessage({ type: 'SYNC_PUSH', force });
        if (res?.conflict) {
          showSyncConflictBanner({ remoteUpdatedAt: res.remoteUpdatedAt });
          showToast('⚠️ 检测到云端有另一台设备的新改动，推荐点击顶部「智能合并两边」');
          return;
        }
        if (res?.ok) {
          hideSyncConflictBanner();
          if (res.gistId) {
            ghSyncConfig.gistId = res.gistId;
            const gEl = document.getElementById('ghGistIdInput');
            if (gEl) gEl.value = res.gistId;
          }
          if (res.updatedAt) {
            localUpdatedAt = res.updatedAt;
            ghSyncConfig.lastRemoteUpdatedAt = res.updatedAt;
          }
          ghSyncConfig.lastSyncAt = Date.now();
          updateSyncBadgeUI('idle');
          if (!silent) {
            showToast(res.isCreate ? '🎉 已自动创建私有 Gist 并上传！请复制 Gist ID 给另一台电脑' : '☁️ 已成功上传书签与界面配置到私有 Gist');
          }
          return;
        }
        if (res?.skipped) { updateSyncBadgeUI('idle'); return; }
        throw new Error(res?.error || '请检查网络');
      } catch (err) {
        console.error('后台 Gist 上传失败:', err);
        updateSyncBadgeUI('error');
        if (!silent) showToast(`❌ 上传失败：${err.message || '请检查网络'}`);
      }
      return;
    }

    if (isSyncing) { pendingPushAfterSync = true; return; }
    isSyncing = true;
    updateSyncBadgeUI('syncing');
    try {
      const settings = await collectCurrentSettings();
      const cleanBookmarks = bookmarks.map(b => {
        const item = { id: b.id, space: b.space, group: b.group, title: b.title, url: b.url, desc: b.desc };
        if (b.pinned) item.pinned = true;
        if (b.customIcon) item.customIcon = b.customIcon;
        return item;
      });
      const nowTs = Math.max(Date.now(), localUpdatedAt);
      const payload = { version: 11.1, updatedAt: nowTs, spaceGroups, bookmarks: cleanBookmarks, todos, memo: document.getElementById('quickMemoArea')?.value || '', settings };
      const isCreate = !ghSyncConfig.gistId;
      const endpoint = isCreate ? 'https://api.github.com/gists' : `https://api.github.com/gists/${encodeURIComponent(ghSyncConfig.gistId)}`;
      const body = { description: 'Personal Workspace OS - Private Sync Data (v11.1)', files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } } };
      if (isCreate) body.public = false;

      const res = await fetchWithTimeout(endpoint, { method: isCreate ? 'POST' : 'PATCH', headers: ghHeaders(), body: JSON.stringify(body) }, 12000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (isCreate && json.id) { ghSyncConfig.gistId = json.id; const gEl = document.getElementById('ghGistIdInput'); if (gEl) gEl.value = json.id; }
      localUpdatedAt = nowTs;
      ghSyncConfig.lastSyncAt = Date.now();
      ghSyncConfig.lastRemoteUpdatedAt = nowTs;
      writeStoreInternal({ [KEYS.ghSync]: ghSyncConfig, [KEYS.updatedAt]: localUpdatedAt });
      updateSyncBadgeUI('idle');
      if (!silent) showToast('☁️ 已成功上传最新数据到 GitHub 私有 Gist');
    } catch (err) {
      updateSyncBadgeUI('error');
      if (!silent) showToast(`❌ 上传失败：${err.message || '请检查网络'}`);
    } finally {
      isSyncing = false;
      if (pendingPushAfterSync) { pendingPushAfterSync = false; pushToGist(true, false); }
    }
  }

  async function pullFromGist(onlyIfNewer = false) {
    if (!ghSyncConfig.token || !ghSyncConfig.gistId) {
      if (!onlyIfNewer) showToast('💡 请先填写 GitHub Token 和 Gist ID');
      return;
    }
    if (isSyncing) return;
    isSyncing = true;
    updateSyncBadgeUI('syncing');

    try {
      const remoteData = await fetchRemoteGistData();
      const remoteTime = typeof remoteData.updatedAt === 'number' ? remoteData.updatedAt : 0;

      if (onlyIfNewer && remoteTime <= localUpdatedAt && localUpdatedAt > 0) {
        ghSyncConfig.lastSyncAt = Date.now();
        ghSyncConfig.lastRemoteUpdatedAt = Math.max(ghSyncConfig.lastRemoteUpdatedAt || 0, remoteTime);
        writeStoreInternal({ [KEYS.ghSync]: ghSyncConfig, [KEYS.syncConflict]: null });
        hideSyncConflictBanner();
        updateSyncBadgeUI('idle');
        return;
      }

      if (applySyncPayload(remoteData)) {
        ghSyncConfig.lastSyncAt = Date.now();
        ghSyncConfig.lastRemoteUpdatedAt = remoteTime || localUpdatedAt;
        writeStoreInternal({ [KEYS.ghSync]: ghSyncConfig, [KEYS.syncConflict]: null });
        hideSyncConflictBanner();
        updateSyncBadgeUI('idle');
        const dcEl = document.getElementById('dcTotalCount');
        if (dcEl) dcEl.textContent = `${bookmarks.length} 个书签`;
        showToast(onlyIfNewer ? '☁️ 已自动同步另一台设备的最新更改与偏好' : `☁️ 已从云端拉取 ${bookmarks.length} 个书签与偏好设置`);
      }
    } catch (err) {
      console.error('Gist 拉取失败:', err);
      updateSyncBadgeUI('error');
      if (!onlyIfNewer) showToast(`❌ 拉取失败：${err.message || '请检查网络'}`);
    } finally {
      isSyncing = false;
    }
  }

  window.addEventListener('DOMContentLoaded', initApp);
})();
// ===== [PART 2 END] =====