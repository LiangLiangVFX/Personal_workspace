/* ==========================================================================
   个人效率工作台 & 全景书签导航 OS — Manifest V3 纯离线扩展核心引擎 (v10.0)
   100% 遵循 MV3 CSP：零内联脚本、零内联事件、chrome.storage.local 实时自动持久化
   ========================================================================== */

(() => {
  'use strict';

  // ==================== 1. 8 大纯本地效率小工具定义 ====================
  const BUILTIN_TOOLS = [
    { id: 'tool-json', title: 'JSON 格式化 / 压缩校验', desc: '纯浏览器本地校验、美化缩进与单行压缩 JSON 数据，支持一键复制结果', icon: '📋', type: 'json' },
    { id: 'tool-text', title: '字数统计 & 文本按行去重', desc: '实时统计总字符、中文字数、英文单词与行数，支持一键按行去重与清理空行', icon: '📝', type: 'text' },
    { id: 'tool-radius', title: '本地图片圆角合成器', desc: '基于 HTML5 Canvas 纯本地处理图片圆角并导出透明 PNG，零上传保护隐私', icon: '🖼️', type: 'radius' },
    { id: 'tool-time', title: '时间戳 & UE5 材质颜色转换', desc: 'Unix 时间戳互转、HEX 转 RGB 及 UE5 Material 线性浮点 (0.0~1.0) 颜色换算', icon: '⏱️', type: 'time' },
    { id: 'tool-palette', title: '图片吸管取色 & 调色板提取', desc: '拖入本地参考图或原画，点击画面任意像素吸取 HEX / UE5 线性色值并提取主色调色板', icon: '🎨', type: 'palette' },
    { id: 'tool-converter', title: '本地图片格式转换 & 压缩', desc: '纯本地将 WebP / PNG / JPG 批量互转格式、按比例缩放尺寸与调节画质体积', icon: '🔄', type: 'converter' },
    { id: 'tool-cgcalc', title: 'CG 帧率时间码 & 分辨率计算', desc: '动画帧数(Frames)与时间码(24/25/30/60fps)互转，以及 16:9 / 21:9 画幅像素换算', icon: '🎬', type: 'cgcalc' },
    { id: 'tool-codec', title: '编码加解密 & 强密码生成', desc: '支持 Base64 编解码、URL 链接编解码与高强度随机安全密钥一键生成', icon: '🔐', type: 'codec' }
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

  // ==================== 3. 单一真源：6 大工作空间与全量 168 个书签 ====================
  const SPACES_CONFIG = [
    { id: 'home',     icon: '🏠', name: '首页聚焦',   grad: 'from-amber-500 to-rose-500',   virtual: true },
    { id: 'ai',       icon: '🤖', name: 'AI 创作',    grad: 'from-indigo-500 to-purple-600' },
    { id: 'cg',       icon: '🎮', name: 'CG & 3D',    grad: 'from-blue-500 to-cyan-500' },
    { id: 'media',    icon: '🎬', name: '媒体设计',   grad: 'from-fuchsia-500 to-orange-500' },
    { id: 'software', icon: '📦', name: '软件运维',   grad: 'from-emerald-500 to-teal-600' },
    { id: 'tools',    icon: '🛠️', name: '本地工具',   grad: 'from-cyan-500 to-indigo-600',  isTools: true }
  ];

  const INITIAL_SPACE_GROUPS = {
    ai: ['🧠 对话与搜索', '🎨 绘画与 ComfyUI', '🎬 视频与音频'],
    cg: ['🎮 UE5 与实时特效', '🧊 3D 模型与扫描', '🏴‍☠️ 海外 CG 宝库', '🌍 PBR 材质与 HDRI'],
    media: ['🔥 社区与工作台', '✂️ 图像与文档工具', '🎨 字体、素材与音乐'],
    software: ['🧰 装机必备软件', '💻 绿色软件与脚本', '🌐 建站与云服务', '🚀 网络加速专线']
  };

  const INITIAL_BOOKMARKS = [
    // 🤖 AI 创作 (28)
    { id: 'a1', space: 'ai', group: '🧠 对话与搜索', title: 'ChatGPT (OpenAI)', url: 'https://chatgpt.com/', desc: 'OpenAI 旗舰级对话大模型，支持代码编写、逻辑推理与多模态分析', pinned: true },
    { id: 'a2', space: 'ai', group: '🧠 对话与搜索', title: 'Google Gemini', url: 'https://gemini.google.com/app', desc: 'Google 原生超长上下文多模态 AI 助手，擅长复杂项目分析与创作', pinned: true },
    { id: 'a3', space: 'ai', group: '🧠 对话与搜索', title: 'Kimi 智能助手', url: 'https://www.kimi.com/', desc: '月之暗面出品，擅长超长文档解析、联网搜索与深度思考的 AI 助手' },
    { id: 'a4', space: 'ai', group: '🧠 对话与搜索', title: 'Perplexity AI 深度搜索', url: 'https://www.perplexity.ai/', desc: 'AI 驱动的实时学术与全网深度搜索引擎，自动附带真实信源引用' },
    { id: 'a5', space: 'ai', group: '🧠 对话与搜索', title: 'SiliconCloud 硅基流动', url: 'https://cloud.siliconflow.cn/models', desc: '高性价比一站式开源大模型 API 调用（DeepSeek/Qwen/FLUX）与推理云平台' },
    { id: 'a6', space: 'ai', group: '🧠 对话与搜索', title: 'Coze 扣子 AI 智能体探索', url: 'https://www.coze.com/explore', desc: '新一代 AI Bot 智能体搭建、插件工作流编排与创意应用商店' },
    { id: 'a7', space: 'ai', group: '🧠 对话与搜索', title: 'Merlin AI 多模型聚合助手', url: 'https://www.getmerlin.in/chat', desc: '集成多款主流大模型的在线 AI 聊天、网页摘要与写作助手' },
    { id: 'a8', space: 'ai', group: '🧠 对话与搜索', title: 'AI 工具集导航大全', url: 'https://ai-bot.cn/', desc: '收录国内外 500+ 款写作、绘画、视频、编程与办公 AI 工具的权威分类导航' },
    { id: 'p1', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'Civitai (C站全球模型库)', url: 'https://civitai.com/', desc: '全球最大的 Stable Diffusion & FLUX Checkpoint、LoRA 模型与返图社区', pinned: true },
    { id: 'p2', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'LiblibAI 哩布哩布 AI', url: 'https://www.liblib.art/', desc: '国内领先的 AI 绘画模型下载、在线 ComfyUI 工作流与生图平台' },
    { id: 'p3', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'FLUX 模型合集 (Replicate)', url: 'https://replicate.com/collections/flux', desc: 'Black Forest Labs 出品的 FLUX 系列图像生成模型云端在线运行库' },
    { id: 'p4', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'Krea AI 实时生图与画质放大', url: 'https://www.krea.ai/home', desc: '支持画布实时涂鸦生图、AI 超分辨率画质增强与细节重绘工具' },
    { id: 'p5', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'OpenArt ComfyUI 工作流中心', url: 'https://openart.ai/workflows/home?appSort=featured', desc: '全球精选 ComfyUI 节点工作流在线浏览、一键下载与云端运行平台' },
    { id: 'p6', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'Comflowy 中文实战百科', url: 'https://www.comflowy.com/zh-CN', desc: '系统化中文 ComfyUI 与 Stable Diffusion 从入门到精通实战指南' },
    { id: 'p13', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'PromptHero 提示词搜索引擎', url: 'https://prompthero.com/', desc: '全球领先的 Midjourney、Stable Diffusion 与 FLUX 优质提示词检索库' },
    { id: 'p15', space: 'ai', group: '🎨 绘画与 ComfyUI', title: '商汤秒画 SenseMirage', url: 'https://miaohua.sensetime.com/generate', desc: '商汤科技出品的免费中文 AI 作画、模型训练与高细节图像生成平台' },
    { id: 'p17', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'Stability.AI 官方主页', url: 'https://stability.ai/', desc: '开源生成式 AI 领军企业，提供图像、视频、音频、3D 与语言大模型生态' },
    { id: 'p18', space: 'ai', group: '🎨 绘画与 ComfyUI', title: '腾讯 ARC 人像画质修复与抠图', url: 'https://arc.tencent.com/en/ai-demos/imgRestore', desc: '腾讯 AI 实验室在线工具：支持模糊人脸高清还原、动漫增强与智能抠像' },
    { id: 'p20', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'ImgUpscaler AI 图像无损放大', url: 'https://imgupscaler.com/zh-tw', desc: '支持批量免费将数码照片、CG 渲染图与动漫插画放大至 4K 高清分辨率' },
    { id: 'p22', space: 'ai', group: '🎨 绘画与 ComfyUI', title: 'PicMa 一站式 AI 影像增强', url: 'https://picma.magictiger.ai/zh', desc: '集成老照片修复、上色、去划痕与 AI 视频画质增强的在线工具箱' },
    { id: 'v1', space: 'ai', group: '🎬 视频与音频', title: 'PixVerse AI 视频创作', url: 'https://pixverse.ai/', desc: '支持文生视频、图生视频与角色一致性动画的高清 AI 视频生成平台' },
    { id: 'v2', space: 'ai', group: '🎬 视频与音频', title: 'DomoAI 视频转绘与风格化', url: 'https://www.domoai.app/en/create/video?utm_source=youtube', desc: '将实拍视频一键转换为日漫、3D 卡通、像素或写实 CG 风格的 AI 视频工具' },
    { id: 'v3', space: 'ai', group: '🎬 视频与音频', title: 'HeyGen AI 数字人视频', url: 'https://app.heygen.com/home', desc: '专业级 AI 口播数字人视频生成、多语种嘴型同步与视频翻译工作台' },
    { id: 'v4', space: 'ai', group: '🎬 视频与音频', title: 'MOTORICA AI 动作生成 (To UE5)', url: 'https://www.motorica.ai/', desc: '专为游戏开发与 UE5 打造的 AI 骨骼动画生成与运动风格迁移平台' },
    { id: 'v5', space: 'ai', group: '🎬 视频与音频', title: 'Swapface AI 实时视频换脸', url: 'https://swapface.org/#/home', desc: '轻量化高逼真度 AI 视频与直播实时面部替换工具' },
    { id: 'v7', space: 'ai', group: '🎬 视频与音频', title: 'MyHeritage 老照片动起来', url: 'https://www.myheritage.com/site-1630592616/l', desc: 'DeepNostalgia 技术：让静态人物肖像照片自动生成自然的眨眼与微笑动态' },
    { id: 'v8', space: 'ai', group: '🎬 视频与音频', title: 'Fish Audio 声音克隆与 TTS', url: 'https://fish.audio/zh-CN/', desc: '高自然度 AI 语音合成、多角色情感配音与几秒样本极速声音克隆平台' },
    { id: 'v9', space: 'ai', group: '🎬 视频与音频', title: 'Adobe Podcast 录音智能降噪', url: 'https://podcast.adobe.com/', desc: 'Adobe 出品 AI 人声增强工具，一键消除环境噪音并将普通录音提升至录音棚音质' },

    // 🎮 CG & 3D (53)
    { id: 'u1', space: 'cg', group: '🎮 UE5 与实时特效', title: 'Epic 虚幻引擎官方开发者社区', url: 'https://dev.epicgames.com/community/unreal-engine/getting-started/games', desc: 'Unreal Engine 5 官方入门路径、技术文档、Lumen/Nanite 教程与技术论坛' },
    { id: 'u2', space: 'cg', group: '🎮 UE5 与实时特效', title: 'Fab (Epic 虚幻引擎官方新商城)', url: 'https://www.fab.com/', desc: '原 Unreal Engine Marketplace 升级版，汇聚商业级 UE5 场景、Niagara 特效与 Megascans 资产', pinned: true },
    { id: 'u3', space: 'cg', group: '🎮 UE5 与实时特效', title: 'Real Time VFX 实时特效论坛', url: 'https://realtimevfx.com/c/general/9', desc: '全球最权威的游戏实时特效（UE5/Unity）制作思路、Shader 拆解与赛事社区' },
    { id: 'u4', space: 'cg', group: '🎮 UE5 与实时特效', title: '魔法盒 Magesbox 游戏特效网', url: 'https://www.magesbox.com/', desc: '国内专业的游戏特效学习、Niagara 案例分享、作品交易与灵感捕获 CG 平台' },
    { id: 'u5', space: 'cg', group: '🎮 UE5 与实时特效', title: 'blueprintUE 蓝图代码可视化分享', url: 'https://blueprintue.com/', desc: '在线直接粘贴、网页端缩放预览与分享 Unreal Engine 蓝图节点代码的社区' },
    { id: 'u6', space: 'cg', group: '🎮 UE5 与实时特效', title: '80 Level 国际游戏美术专栏', url: 'https://80.lv/', desc: '全球顶尖 3A 游戏场景美术、材质制作、UE5 灯光渲染与 VFX 幕后深度专访' },
    { id: 'u8', space: 'cg', group: '🎮 UE5 与实时特效', title: 'GameFX 韩国游戏特效学院', url: 'https://gamefx.co.kr/', desc: '韩国顶级次世代游戏 VFX 视觉特效、刀光技能与引擎材质课程展示站' },
    { id: 'u9', space: 'cg', group: '🎮 UE5 与实时特效', title: 'VFExtra - UE5 VFX 专用工具集', url: 'https://www.nielsdewitte.be/VFExtra/', desc: '独立技术美术开发的 Unreal Engine 实用特效纹理生成、流体烘焙与辅助工具' },
    { id: 'u10', space: 'cg', group: '🎮 UE5 与实时特效', title: 'Hoj Dee - UE5 材质与特效博客', url: 'https://hojdee.com/', desc: '专注虚幻引擎 Shader 材质算法、Niagara 粒子与程序化生成技术的深度个人博客' },
    { id: 'u11', space: 'cg', group: '🎮 UE5 与实时特效', title: 'HeyYo CG - Niagara 实用案例库', url: 'https://heyyocg.link/', desc: '精选 UE5 Niagara 粒子系统进阶模块应用、交互特效与工程实现笔记' },
    { id: 'u15', space: 'cg', group: '🎮 UE5 与实时特效', title: 'FootageCrate 4K 影视VFX特效素材库', url: 'https://vfx.productioncrate.com/', desc: '海量带透明通道的 4K 爆炸、烟雾、魔法粒子、能量光束视频素材与音效库' },
    { id: 'u16', space: 'cg', group: '🎮 UE5 与实时特效', title: 'LookAE 大众脸影视后期特效', url: 'https://www.lookae.com/', desc: '国内知名 AE/PR/C4D/达芬奇/UE 插件、汉化补丁、模板与后期视觉特效资源站' },
    { id: 'u17', space: 'cg', group: '🎮 UE5 与实时特效', title: '爱学习的老土狗 CG 游戏特效课程', url: 'http://www.cgltg.com/', desc: '专注国内游戏特效师技能进阶、UE5 特效实战课程与行业资源分享平台' },
    { id: 'u18', space: 'cg', group: '🎮 UE5 与实时特效', title: 'Vfxmed 全三维软件 CG 资源与课程库', url: 'https://www.vfxmed.com/', desc: '涵盖 Houdini、UE5、Blender、Maya、C4D 全套海外高端 CG 教程与插件资源站' },
    { id: 'u19', space: 'cg', group: '🎮 UE5 与实时特效', title: 'UnityUnreal 虚幻引擎商业资产站', url: 'https://unityunreal.com/unreal-engine-assets/', desc: '海量 Unreal Engine 完整场景工程、动作包、Niagara 特效与蓝图系统资源下载' },
    { id: 'u20', space: 'cg', group: '🎮 UE5 与实时特效', title: 'GameAssetsFree 免费虚幻引擎资产', url: 'https://gameassetsfree.com/assets-ue/', desc: '免费分享 Unreal Engine 商城环境建筑、武器道具、材质包与游戏特效资产' },
    { id: 'm1', space: 'cg', group: '🧊 3D 模型与扫描', title: 'CGTrader 全球 3D 模型交易平台', url: 'https://www.cgtrader.com/', desc: '超百万级专业 PBR 游戏模型、概念载具、建筑组件与 3D 打印资产下载市场' },
    { id: 'm2', space: 'cg', group: '🧊 3D 模型与扫描', title: 'Sketchfab Store 在线 3D 资产商店', url: 'https://sketchfab.com/store', desc: '支持在浏览器内直接 360° 实时查看拓扑、骨骼动画与 PBR 贴图通道的 3D 模型库' },
    { id: 'm3', space: 'cg', group: '🧊 3D 模型与扫描', title: 'KitBash3D 殿堂级电影/游戏场景资产包', url: 'https://kitbash3d.com/', desc: '好莱坞与 3A 游戏工作室御用的赛博朋克、废土、科幻与奇幻世界大型 3D 建筑资产' },
    { id: 'm4', space: 'cg', group: '🧊 3D 模型与扫描', title: 'Daz 3D 高精度角色与服装官方商城', url: 'https://www.daz3d.com/shop', desc: '全球最大的写实 3D 人物基底模型、精致毛发、服装道具与表情姿态资产官网' },
    { id: 'm5', space: 'cg', group: '🧊 3D 模型与扫描', title: '3D Warehouse (SketchUp 海量模型库)', url: 'https://3dwarehouse.sketchup.com/', desc: '涵盖全球真实建筑、室内家居、城市街道设施与景观构件的免费三维模型库' },
    { id: 'm6', space: 'cg', group: '🧊 3D 模型与扫描', title: 'PBRMAX 国产超高清 3D 扫描资产库', url: 'https://www.pbrmax.cn/discover?lan=zh-CN', desc: '专注中国古建、非遗文物、东方自然植被与现代道具的影视级全流程 PBR 资产平台' },
    { id: 'm8', space: 'cg', group: '🧊 3D 模型与扫描', title: 'HyperHuman (Deemos) 照片生成3D角色', url: 'https://hyperhuman.deemos.com/chatavatar', desc: '根据照片或自然语言描述自动生成带拓扑贴图的写实 3D 角色资产' },
    { id: 'm18', space: 'cg', group: '🧊 3D 模型与扫描', title: 'WireWheelsClub 高精细度免费汽车模型', url: 'https://wirewheelsclub.com/', desc: '由资深汽车建模师维护的高精度免费可商用汽车 3D 模型下载站' },
    { id: 'm29', space: 'cg', group: '🧊 3D 模型与扫描', title: 'Triplegangers 影视级真人 3D 光学扫描', url: 'https://triplegangers.com/', desc: '提供超高精度真人全身、多表情头部光学扫描模型与微孔级皮肤贴图参考' },
    { id: 'm9', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'CG Persia 殿堂级海外 CG 资源站', url: 'https://cgpersia.com/', desc: '全球最具影响力的 CG 软件、渲染器插件、大师级海外教程与 3D 资产每日更新站' },
    { id: 'm10', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'GFXCamp CG 资源营地', url: 'https://www.gfxcamp.com/', desc: '免费分享最新三维软件、AE/C4D/Blender 插件、UE 资产与高清素材的综合平台' },
    { id: 'm12', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: '画忆妙妙屋 (IIICG) 精品场景资源', url: 'https://www.iiicg.com/', desc: '国内聚焦高品质 UE5 三维概念场景、大型环境地貌工程与次世代 CG 美术资产站' },
    { id: 'm13', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'AN 素材库 (影视与游戏 CG 资产)', url: 'https://www.ansucai.com/', desc: '收录丰富三维场景模型、VFX 视频素材与工程模板的综合设计素材网' },
    { id: 'm15', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'Desire FX 3D Models', url: 'https://desirefx.me/', desc: '老牌海外 3D 模型、FBX/OBJ 通用资产与影视特效教程资源免费下载站' },
    { id: 'm16', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: '3D-MODEL.org 通用三维模型网', url: 'https://3d-model.org/', desc: '按分类整理的家具、载具、植物与建筑 3ds Max / Blender 通用模型下载库' },
    { id: 'm17', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: '3Dnchu 日本 CG 行业资讯与免费资产', url: 'https://3dnchu.com/category/', desc: '日本知名 CG 媒体，第一时间汇总全球免费 3D 模型、Blender 插件与 UE5 前沿情报' },
    { id: 'm19', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'GFX-HUB 海外 CG 资产中心', url: 'https://gfx-hub.co/', desc: '高频更新的海外 3D 角色模型、ZBrush 笔刷、Substance 材质与游戏资产聚合网' },
    { id: 'm20', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'Render-State (Daz3D 角色资产库)', url: 'https://render-state.to/', desc: '专门收录 Daz 3D Genesis 系列人物角色、服装、发型、灯光与动作包的下载站' },
    { id: 'm22', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'GFXFather 高速直链 CG 资源库', url: 'https://gfxfather.com/', desc: '支持 IDM 满速直连下载的海外全品类 CG 教程、软件直装包与 3D 工程资产站' },
    { id: 'm23', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'Psdly.to 海外 CG 课程与 3D 资产站', url: 'https://www.psdly.to/', desc: '持续更新 Gumroad / Wingfox / ArtStation 热门三维建模教程与设计资产下载站' },
    { id: 'm24', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'GoDownloads.net 综合 CG 下载站', url: 'https://godownloads.net/', desc: '涵盖 3D 打印模型、游戏低模资产、贴图包与主流设计软件的海外下载平台' },
    { id: 'm25', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'CGgoat 视觉与三维设计素材网', url: 'https://www.cggoat.com/', desc: '国内面向三维设计师与后期师的精品 C4D/Blender 模型、贴图与样机素材社区' },
    { id: 'm26', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'GSan 设计 (cgsan.vip)', url: 'https://cgsan.vip/', desc: '精心整理的国内 CG 建模、渲染插件、材质球与工程资源分享小站' },
    { id: 'm27', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'UnrealAll 虚幻商城全量免费资产', url: 'https://unrealall.com/', desc: '专注 Unreal Engine 虚幻引擎各版本环境、特效、动作与插件资源的免费归档站' },
    { id: 'm28', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'CG3DA 免费 3D CG 资源平台', url: 'https://www.cg3da.com/', desc: '免费分享游戏次世代角色、场景模型、动作捕捉文件与 PBR 贴图的国内平台' },
    { id: 'm30', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: 'CGDownload.ru 俄罗斯超全 CG 武器库', url: 'https://cgdownload.ru/', desc: '俄罗斯顶级免费 CG 宝库，每日海量更新 UE5 资产、3D 模型、插件与大师教程' },
    { id: 'm31', space: 'cg', group: '🏴‍☠️ 海外 CG 宝库', title: '渲染 101 云渲染农场工作台', url: 'https://xuanran101.com/member/account/login.html', desc: '支持 3ds Max / Maya / C4D / Blender 批量云端极速渲染与项目管理后台' },
    { id: 't1', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'Poly Haven (CC0 免费 16K HDRI 与材质)', url: 'https://polyhaven.com/hdris', desc: '100% 免费无版权 CC0 协议的 8K/16K 户外室内 HDRI 环境光、PBR 材质与扫描模型库', pinned: true },
    { id: 't2', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'ambientCG 免费 CC0 PBR 无缝材质库', url: 'https://ambientcg.com/list?sort=popular', desc: '收录数千套免费商用 4K/8K PBR 材质球（含法线、粗糙度、置换贴图）的权威资源网' },
    { id: 't3', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'Texturing.XYZ 影视级人物皮肤微观纹理', url: 'https://texturing.xyz/', desc: '全球角色艺术家必备的多通道超高清人类面部毛孔、皱纹置换贴图与虹膜扫描库' },
    { id: 't4', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'Textures.com 全球老牌 3D 贴图鼻祖', url: 'https://www.textures.com/', desc: '涵盖建筑砖墙、自然岩石、风化金属、织物、污迹贴花与 PBR 扫描材质的百科全书' },
    { id: 't5', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'HDRMaps 20K 超清 HDRI 与地面扫描库', url: 'https://hdrmaps.com/', desc: '面向高端汽车与建筑渲染的 20K 超高动态范围全景天空贴图与摄影测量地面纹理' },
    { id: 't6', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'HDRI-Skies 全景天空贴图站 (含免费专区)', url: 'https://hdri-skies.com/free-hdris/', desc: '提供日出、黄昏、阴天等全天候自然光照 360° 高动态 EXR 天空环境球贴图资源' },
    { id: 't7', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'Blockade Labs Skybox AI 全景图生成', url: 'https://www.blockadelabs.com/', desc: '通过文字提示词一键生成 360° 全景天空盒与游戏环境 HDRI 贴图' },
    { id: 't8', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: '2G Academy 高精度次世代植物资产', url: 'https://www.2gacademy.net/product-page/lagerstroemia-indica', desc: '专业级紫薇树（Lagerstroemia Indica）等写实建筑景观植物模型与叶片材质包' },
    { id: 't9', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'Pexels 免费高清无版权摄影图与视频', url: 'https://www.pexels.com/zh-cn/', desc: '免费可商用的高分辨率实拍风景、建筑、人物摄影参考图与 4K 空镜视频素材库' },
    { id: 't10', space: 'cg', group: '🌍 PBR 材质与 HDRI', title: 'Storyblocks 免版税视听素材全集', url: 'https://www.storyblocks.com/', desc: '提供海量免版税 4K 实拍视频、绿幕抠像素材、背景音乐与音效的创作者素材库' },

    // 🎬 媒体与设计 (34)
    { id: 'b2', space: 'media', group: '🔥 社区与工作台', title: 'YouTube', url: 'https://youtube.com/', desc: '全球最大的视频与海外官方 CG、虚幻引擎教程平台', pinned: true },
    { id: 'b1', space: 'media', group: '🔥 社区与工作台', title: '哔哩哔哩 Bilibili', url: 'https://www.bilibili.com/', desc: '国内核心弹幕视频与 CG / AI / UE5 教程学习社区', pinned: true },
    { id: 'bm_1792978287239', space: 'media', group: '🔥 社区与工作台', title: 'X (Twitter) 全球社交与前沿资讯', url: 'https://x.com/', desc: '全球最具影响力的实时资讯、独立开发者、AI 前沿动态与 CG 艺术家社交平台', pinned: true },
    { id: 'b4', space: 'media', group: '🔥 社区与工作台', title: 'ArtStation 殿堂级艺术社区', url: 'https://www.artstation.com/?sort_by=community', desc: '全球顶尖游戏美术、概念设计、UE5 场景与 VFX 作品展示社区', pinned: true },
    { id: 'b3', space: 'media', group: '🔥 社区与工作台', title: 'Pinterest 视觉灵感库', url: 'https://www.pinterest.com/', desc: '全球设计师必备的视觉灵感、原画设定与美术参考瀑布流', pinned: true },
    { id: 'b5', space: 'media', group: '🔥 社区与工作台', title: 'Figma 协同设计工作台', url: 'https://www.figma.com/files/team/1619233891932982176/recents-and-sharing/recently-viewed?fuid=1619233890512923355', desc: '在线 UI/UX 界面设计、原型制作与团队白板协作画布', pinned: true },
    { id: 'b6', space: 'media', group: '🔥 社区与工作台', title: 'Discord 创作者交流频道', url: 'https://discord.com/channels/662267976984297473/952771221915840552', desc: 'Midjourney 生图、AI 开源项目与海外创作者实时交流社区' },
    { id: 'b7', space: 'media', group: '🔥 社区与工作台', title: 'LINUX DO 技术与资源社区', url: 'https://linux.do/c/softwares/14', desc: '高质量中文 AI 前沿技术、开源工具、API 与软件资源论坛' },
    { id: 'b10', space: 'media', group: '🔥 社区与工作台', title: '新片场 - LiangLiang 作品集', url: 'https://www.xinpianchang.com/u14004225', desc: 'LiangLiang 个人影视后期与 CG 视觉视频作品集展示主页' },
    { id: 'b11', space: 'media', group: '🔥 社区与工作台', title: '我的任务 - ftrack 制片管线', url: 'https://f.hzpipeline.com/#itemId=home', desc: '团队内部 CG 制片管理、镜头审核与个人任务进度追踪平台', pinned: true },
    { id: 's12', space: 'media', group: '✂️ 图像与文档工具', title: '刘明野的工具箱 (开发者与日常在线工具)', url: 'https://tools.liumingye.cn/', desc: '极简无广告的在线工具集合，涵盖无损音乐、二维码生成、编解码与图片处理' },
    { id: 'bm_1792992786789', space: 'media', group: '✂️ 图像与文档工具', title: 'AnyToCopy 网页文字解除限制复制工具', url: 'https://www.anytocopy.com/', desc: '一键解除网页禁止复制、禁止右键与选择限制的在线文本提取与文档解析工具' },
    { id: 'i1', space: 'media', group: '✂️ 图像与文档工具', title: 'Remove.bg 全自动 AI 抠图去背景', url: 'https://www.remove.bg/zh', desc: '5 秒内全自动识别人物、商品与动物边缘并生成干净透明底 PNG 的标杆抠图工具' },
    { id: 'i2', space: 'media', group: '✂️ 图像与文档工具', title: 'Erase.bg 免费高清原图去背景工具', url: 'https://www.erase.bg/zh', desc: '支持高达 5000×5000px 分辨率原图免费 AI 抠图并保留完整边缘细节的在线神器' },
    { id: 'i3', space: 'media', group: '✂️ 图像与文档工具', title: 'Squoosh (Google 纯本地无损图片压缩)', url: 'https://squoosh.app/', desc: 'Google Chrome 团队出品，纯浏览器本地实时对比画质并转换 WebP/AVIF/PNG 的压缩工具' },
    { id: 'i5', space: 'media', group: '✂️ 图像与文档工具', title: 'Docsmall 在线 GIF 动图与 PDF 极速压缩', url: 'https://docsmall.com/gif-compress', desc: '界面极简无广告的国内良心工具，支持批量大幅缩减 GIF 动图、JPG 图片与 PDF 体积' },
    { id: 'i6', space: 'media', group: '✂️ 图像与文档工具', title: 'Ezgif 全功能 GIF 动图尺寸裁剪与编辑', url: 'https://ezgif.com/resize', desc: '老牌全能 GIF 工具箱，支持修改动图尺寸、视频转 GIF、抽帧变速、加字幕与逐帧优化' },
    { id: 'i13', space: 'media', group: '✂️ 图像与文档工具', title: 'LZL 在线批量圆角图片生成器', url: 'https://lzltool.com/batch-img-radius', desc: '支持一次性拖入多张图片，自定义四角圆角像素或百分比并批量打包下载透明圆角图' },
    { id: 'i14', space: 'media', group: '✂️ 图像与文档工具', title: 'UUTool 在线图片尺寸像素修改工具', url: 'https://uutool.cn/img-resize/', desc: '按固定宽高像素或等比例快速缩放图片尺寸，纯前端处理保护图片隐私' },
    { id: 'i15', space: 'media', group: '✂️ 图像与文档工具', title: 'iLoveIMG 免费在线批量压缩 JPG/PNG', url: 'https://www.iloveimg.com/zh-cn/compress-image/compress-jpg', desc: '保持高画质的前提下批量极限压缩数十张 JPG、PNG 或 GIF 图像文件体积' },
    { id: 'i16', space: 'media', group: '✂️ 图像与文档工具', title: 'SafeResize 按指定 KB 大小精准调整图片', url: 'https://saferesize.com/', desc: '专门解决报名、签证上传限制：输入目标 KB 数值即可自动把证件照或 PDF 压缩至合规大小' },
    { id: 'i17', space: 'media', group: '✂️ 图像与文档工具', title: 'Smallpdf 在线 PDF 转换与编辑全能王', url: 'https://smallpdf.com/cn', desc: '一站式解决 PDF 转 Word/PPT/JPG、PDF 合并拆分、压缩瘦身与电子签名' },
    { id: 'i19', space: 'media', group: '✂️ 图像与文档工具', title: 'Tiqu.cc 全网社媒视频与高清原图提取器', url: 'https://tiqu.cc/', desc: '粘贴链接即可免水印提取下载 YouTube、TikTok、Twitter(X)、Instagram 高清视频与图片' },
    { id: 'i8', space: 'media', group: '🎨 字体、素材与音乐', title: 'CleanPNG 百万级免费透明 PNG 免抠素材', url: 'https://www.cleanpng.com/', desc: '无需登录即可无限免费下载数百万张高清透明背景 PNG 装饰元素与贴图素材' },
    { id: 'i12', space: 'media', group: '🎨 字体、素材与音乐', title: 'Gradient Pro 极致流体渐变背景工坊', url: 'https://bg.diyun.site/', desc: '一键生成大师级柔和极光、流体弥散渐变色背景，支持导出 CSS 代码与 4K 壁纸图' },
    { id: 'i20', space: 'media', group: '🎨 字体、素材与音乐', title: 'BeFonts 设计师精选免费西文字体库', url: 'https://befonts.com/', desc: '高质量现代无衬线、优雅衬线、赛博科幻与海报标题英文字体免费下载平台' },
    { id: 'i21', space: 'media', group: '🎨 字体、素材与音乐', title: 'FontRiver 免费英文字体与 Dingbats 符号库', url: 'https://www.fontriver.com/', desc: '按风格细致分类的免费可下载英文字体与图形化 Dingbats 装饰符号字库' },
    { id: 'i23', space: 'media', group: '🎨 字体、素材与音乐', title: 'VAU 艺术字体与海报标题特效素材', url: 'https://vaufonts.com/', desc: '面向视觉设计与游戏宣发的个性艺术字体、金属质感字效与排版素材库' },
    { id: 'i24', space: 'media', group: '🎨 字体、素材与音乐', title: 'Canva 可画 Logo 视觉模板中心', url: 'https://www.canva.com/templates/?query=logo', desc: '数千款现成可在线拖拽编辑的品牌 Logo、个人徽标与社交媒体头像设计模板' },
    { id: 'i25', space: 'media', group: '🎨 字体、素材与音乐', title: 'UUGai 免费中文 Logo 在线一键制作', url: 'https://www.uugai.com/', desc: '免注册免付费，输入品牌名称即可在 1 分钟内自动排版生成多套中英文标志方案' },
    { id: 'i26', space: 'media', group: '🎨 字体、素材与音乐', title: '甲方叭叭 视觉与三维设计师专属导航', url: 'https://jiafangbb.com/', desc: '聚合国内外优质配色、样机、字体、摄影图库与三维渲染资源的精选设计导航' },
    { id: 's1', space: 'media', group: '🎨 字体、素材与音乐', title: 'NewCGer 新CG儿 (免费 AE 模板与素材)', url: 'https://www.newcger.com/', desc: '国内老牌良心站点，免注册免费高速下载海量 AE 工程模板、实拍视频与音频素材' },
    { id: 's16', space: 'media', group: '🎨 字体、素材与音乐', title: 'MyFreeMP3 全网无损音乐在线搜索与下载', url: 'https://tools.liumingye.cn/music/#/', desc: '支持在线免费试听并下载 FLAC / MP3 高音质音乐、影视配乐与歌词封面' },
    { id: 's17', space: 'media', group: '🎨 字体、素材与音乐', title: '熊猫无损音乐官网 (WAV/FLAC/DSD音乐库)', url: 'https://www.xmwsyy.com/', desc: '发烧友与剪辑师常用的高品质 WAV、FLAC 无损音乐专辑与经典曲库免费下载网' },

    // 📦 软件与运维 (53)
    { id: 'win_1', space: 'software', group: '🧰 装机必备软件', title: 'Chrome 浏览器 (离线安装包)', url: 'https://www.iplaysoft.com/tools/chrome/?', desc: 'Google 出品的旗舰级网页浏览器，支持丰富开发者扩展与高速渲染 (网络通信)' },
    { id: 'win_2', space: 'software', group: '🧰 装机必备软件', title: 'Clash for Windows 客户端', url: 'https://dw1.166cc.top/clash_0.20.37/Clash.for.Windows.Setup.0.20.37.exe', desc: '经典的 Windows 端图形化规则代理与网络加速 VPN 客户端工具' },
    { id: 'win_3', space: 'software', group: '🧰 装机必备软件', title: 'ToDesk 远程控制软件', url: 'https://www.todesk.com/download.html', desc: '低延迟高帧率跨平台远程桌面控制软件，支持文件直传与多屏办公 (网络通信)' },
    { id: 'win_4', space: 'software', group: '🧰 装机必备软件', title: 'Internet Download Manager (IDM)', url: 'https://tmioe.com/662.html', desc: 'Windows 平台最强的多线程下载加速神器，支持网页音视频自动嗅探抓取' },
    { id: 'win_5', space: 'software', group: '🧰 装机必备软件', title: 'Everything 本地文件极速搜索', url: 'https://www.voidtools.com/zh-cn/', desc: '基于 NTFS 索引的毫秒级本地文件名快速查找神器，装机必备效率工具' },
    { id: 'win_6', space: 'software', group: '🧰 装机必备软件', title: 'Bandizip 专业解压缩软件', url: 'https://www.bandisoft.com/bandizip/', desc: '清爽快速的多格式专业压缩与解压软件，支持压缩包内图片预览与密码管理' },
    { id: 'win_7', space: 'software', group: '🧰 装机必备软件', title: 'DownKyi 哔哩下载姬', url: 'https://github.com/leiurayer/downkyi', desc: '开源免费的 B站 (Bilibili) 视频高清下载工具，支持批量下载 4K/8K 视频与音视频分离' },
    { id: 'win_8', space: 'software', group: '🧰 装机必备软件', title: 'Honeyview 极速图片查看器', url: 'https://www.bandisoft.com/honeyview/', desc: '轻量无广告的快速图片查看器，支持直接免解压浏览压缩包内图像与 EXIF 信息' },
    { id: 'win_9', space: 'software', group: '🧰 装机必备软件', title: 'GameTextureViewer 贴图序列查看器', url: 'https://jangafx.com/software/gametextureviewer/', desc: 'JangaFX 出品的游戏特效师专用图片序列帧与通道贴图实时查看工具 (图像音频)' },
    { id: 'win_10', space: 'software', group: '🧰 装机必备软件', title: 'PotPlayer 全能视频播放器', url: 'https://potplayer.daum.net/?lang=zh_CN', desc: 'Windows 平台最强大的本地视频播放软件，支持硬件解码、逐帧播放与全格式字幕' },
    { id: 'win_11', space: 'software', group: '🧰 装机必备软件', title: 'PureRef 参考图与情绪板软件', url: 'https://www.pureref.com/', desc: 'CG 艺术家与原画师必备的无限画布灵感收集、参考图置顶贴图与情绪板制作工具' },
    { id: 'win_12', space: 'software', group: '🧰 装机必备软件', title: 'Snipaste 截图与桌面贴图神器', url: 'https://www.snipaste.com/', desc: '强大的精准像素级截图、取色标注与屏幕置顶贴图效率工具' },
    { id: 'win_13', space: 'software', group: '🧰 装机必备软件', title: 'TranslucentTB 任务栏透明美化', url: 'https://github.com/TranslucentTB/TranslucentTB', desc: '开源轻量的 Windows 10/11 任务栏半透明、毛玻璃与全透明视觉美化工具' },
    { id: 'win_14', space: 'software', group: '🧰 装机必备软件', title: 'iTop Easy Desktop 桌面整理工具', url: 'https://www.ghxi.com/itopeasydesktop.html', desc: '清爽好用的 Windows 桌面图标分区收纳、文件夹映射与自动整理工具' },
    { id: 'win_15', space: 'software', group: '🧰 装机必备软件', title: 'Rolan 桌面快速启动工具', url: 'https://getrolan.com/', desc: '极简轻量的 Windows 桌面快捷启动面板，一键归类启动常用软件与工程目录' },
    { id: 'win_16', space: 'software', group: '🧰 装机必备软件', title: 'Tampermonkey 篡改猴浏览器扩展', url: 'https://www.tampermonkey.net/?locale=zh', desc: '全球最流行的浏览器用户脚本管理器，支持安装网盘直链、去广告等自动化脚本' },
    { id: 'win_17', space: 'software', group: '🧰 装机必备软件', title: 'PixPin 全能截图/贴图/OCR工具', url: 'https://pixpinapp.com/', desc: '集区域截图、屏幕贴图、长截图拼接、GIF 动图录制、离线文字识别与标注于一体的神器' },
    { id: 'win_18', space: 'software', group: '🧰 装机必备软件', title: 'Geek Uninstaller 软件强力卸载工具', url: 'https://geekuninstaller.com/', desc: '单文件便携版软件卸载神器，彻底扫描并清除软件残留文件与注册表垃圾' },
    { id: 'win_19', space: 'software', group: '🧰 装机必备软件', title: 'Billfish 素材管理与情绪板工具', url: 'https://www.billfish.cn/', desc: '专为设计师打造的本地多格式设计素材管理、灵感网页采集与颜色检索软件' },
    { id: 'win_20', space: 'software', group: '🧰 装机必备软件', title: 'PDF24 Toolbox 免费全能 PDF 工具箱', url: 'https://tools.pdf24.org/en/', desc: '完全免费无限制的桌面与在线 PDF 工具箱，涵盖合并拆分、压缩、转换与 OCR' },
    { id: 'win_21', space: 'software', group: '🧰 装机必备软件', title: 'VoukoderPro Designer (AE/PR 解码插件)', url: 'https://www.voukoder.org/', desc: '专业的 AE / Premiere / 达芬奇硬件加速直出 MP4 (H.264/H.265/ProRes) 编码渲染插件' },
    { id: 'win_22', space: 'software', group: '🧰 装机必备软件', title: 'OBS Studio 开源高清录屏与推流', url: 'https://obsproject.com/', desc: '全球标杆级开源免费高清屏幕录制、多机位场景切换与直播推流软件' },
    { id: 'win_23', space: 'software', group: '🧰 装机必备软件', title: 'Chaos Player 专业 EXR 序列帧播放器', url: 'https://www.chaos.com/player?srsltid=AfmBOorcSDcYLikjEqd5_EQsXMT-Iu-KNfYOEpS5NCYq-g0cFIEF5vGA', desc: 'Chaos 官方出品的影视三维后期高动态范围 EXR 多通道序列帧高速回放与合成检视工具' },
    { id: 'win_24', space: 'software', group: '🧰 装机必备软件', title: '纷得 Found 2 本地文件快速查找', url: 'https://www.aalab.com.cn/', desc: '高颜值国产快速文件检索与预览效率工具，支持快捷键秒搜全盘工程资产' },
    { id: 'win_25', space: 'software', group: '🧰 装机必备软件', title: 'AnyDesk 跨平台轻量远程桌面', url: 'https://anydesk.com/en', desc: '体积小巧、高安全性且响应极快的国际主流跨平台远程桌面连接软件' },
    { id: 'win_26', space: 'software', group: '🧰 装机必备软件', title: 'Dr. Folder 文件夹彩色图标替换工具', url: 'https://www.ghxi.com/drfolder.html', desc: '一键搜索并批量替换 Windows 文件夹颜色与自定义分类图标的视觉管理工具' },
    { id: 'win_27', space: 'software', group: '🧰 装机必备软件', title: 'Notepad++ 轻量源代码文本编辑器', url: 'https://notepad-plus-plus.org/', desc: '装机必备的开源高速文本与源代码编辑器，支持百种语法高亮、正则替换与大文件秒开' },
    { id: 'win_28', space: 'software', group: '🧰 装机必备软件', title: 'Upscayl 开源本地 AI 图片无损放大', url: 'https://upscayl.org/download', desc: '开源免费的桌面端本地 GPU 加速 AI 图像超分辨率无损放大软件' },
    { id: 's5', space: 'software', group: '💻 绿色软件与脚本', title: '腾龙工作室 (TenlonStudio) 软件资源库', url: 'https://www.tenlonstudio.com/', desc: '长期稳定维护的 Adobe 全家桶、三维设计软件、系统镜像与后期插件分享论坛' },
    { id: 's6', space: 'software', group: '💻 绿色软件与脚本', title: '果核剥壳 精品绿色便携软件分享', url: 'https://www.ghxi.com/', desc: '国内极具口碑的绿色软件站，专注分享免安装便携版、去广告纯净版 Windows/安卓工具' },
    { id: 's7', space: 'software', group: '💻 绿色软件与脚本', title: 'LRepacks 俄罗斯大神直装便携版软件库', url: 'https://lrepacks.net/', desc: '全球知名的俄罗斯 Repack 站点，提供海量免激活一键直装的专业设计、音视频与系统软件' },
    { id: 's8', space: 'software', group: '💻 绿色软件与脚本', title: 'ZAPRO · 杂铺 精选生产力软件库', url: 'https://tmioe.com/', desc: '高颜值纯净软件博客，精选 Windows 与 macOS 平台设计、剪辑、办公及效率破解软件' },
    { id: 's10', space: 'software', group: '💻 绿色软件与脚本', title: 'APP喵 (阿喵软件与互联网黑科技分享)', url: 'https://www.appmiu.com/', desc: '每日挖掘全网有趣好用的开源小工具、独立开发 App、网站资源与电脑软件' },
    { id: 's11', space: 'software', group: '💻 绿色软件与脚本', title: '油小猴 实用油猴脚本与黑科技工具箱', url: 'https://www.youxiaohou.com/', desc: '聚合网盘满速直链解析、浏览器扩展插件、Tampermonkey 脚本与宝藏小网站合集' },
    { id: 's13', space: 'software', group: '💻 绿色软件与脚本', title: '帮你下 国外网盘高速中转代下服务', url: 'https://bangnixia.com/fetch', desc: '解决 CG 资源下载痛点：支持将 Rapidgator、Katfile、Nitroflare 等海外慢速网盘秒转国内高速直链' },
    { id: 's15', space: 'software', group: '💻 绿色软件与脚本', title: 'LANDrop 跨平台局域网无损极速快传', url: 'https://landrop.app/', desc: '支持 Windows / Mac / iOS / Android 局域网内不耗流量、跑满千兆带宽互传大文件与视频素材' },
    { id: 'n1', space: 'software', group: '🌐 建站与云服务', title: 'Vercel 个人前端项目部署控制台', url: 'https://vercel.com/zhaoliangs-projects-41437e85', desc: '管理个人作品集网站、NotionNext 博客与前端应用的自动化 CI/CD 云端部署面板' },
    { id: 'n2', space: 'software', group: '🌐 建站与云服务', title: 'Cloudflare 域名 DNS 解析与 CDN 控制台', url: 'https://dash.cloudflare.com/5f703a6765e76b5b2aca3c93564606a3/zhaoliangartists.top', desc: 'zhaoliangartists.top 专属域名 DNS 记录配置、全球 CDN 缓存加速与 SSL 安全防护后台' },
    { id: 'n3', space: 'software', group: '🌐 建站与云服务', title: 'NotionNext 个人博客源码仓库 (GitHub)', url: 'https://github.com/notionnext-org/NotionNext', desc: '基于 Notion 驱动的个人作品集与技术博客网站源码、主题配置及部署说明仓库' },
    { id: 'n4', space: 'software', group: '🌐 建站与云服务', title: 'Namesilo 国际域名注册与管理后台', url: 'https://www.namesilo.com/account/', desc: '管理个人顶级域名续费、隐私保护与自定义 NameServer 服务器指向配置' },
    { id: 'n5', space: 'software', group: '🌐 建站与云服务', title: '七牛云 对象存储 (Kodo) 控制台', url: 'https://portal.qiniu.com/home', desc: '用于托管个人网站高清大图、三维展示资源与静态文件的国内 CDN 云存储平台' },
    { id: 'n6', space: 'software', group: '🌐 建站与云服务', title: '多吉云 视频云点播与无广告流媒体托管', url: 'https://console.dogecloud.com/vod/upload', desc: '专为个人作品集网站提供的高清 VFX 作品视频上传、转码加密与极速内嵌播放服务' },
    { id: 'n7', space: 'software', group: '🌐 建站与云服务', title: 'Google PageSpeed Insights 网站性能测速', url: 'https://pagespeed.web.dev/', desc: 'Google 官方网页加载速度、Core Web Vitals 核心指标与移动端/桌面端 SEO 优化诊断工具' },
    { id: 'n9', space: 'software', group: '🌐 建站与云服务', title: '路过图床 (ImgSE) 免注册外链图床', url: 'https://imgse.com/', desc: '老牌高可用全球 CDN 图床，适合博客文章插图、论坛发帖与作品截图外链托管' },
    { id: 'n10', space: 'software', group: '🌐 建站与云服务', title: 'FlipHTML5 在线 PDF 3D 翻页电子画册托管', url: 'https://fliphtml5.com/dashboard/publications?lang=zh_cn', desc: '将 PDF 作品集或文档一键转换为可嵌入个人网页的交互式 3D 翻页电子书' },
    { id: 'n11', space: 'software', group: '🌐 建站与云服务', title: 'Flaticon 全球最大扁平化矢量图标库', url: 'https://www.flaticon.com/search?word=cloud', desc: '提供数百万枚网页 UI、建站装饰与演示文稿专用的 PNG / SVG 矢量图标搜索下载' },
    { id: 'n12', space: 'software', group: '🌐 建站与云服务', title: 'Babiato 全球建站主题与数字资源论坛', url: 'https://babia.to/', desc: '海外极客社区，免费分享高级 WordPress 主题、插件、UI 套件与建站源码资源' },
    { id: 'n13', space: 'software', group: '🌐 建站与云服务', title: 'WordPress 资源海 (汉化主题与插件库)', url: 'https://wpzyh.com/', desc: '专注 WordPress 中文汉化版商业主题、独立站插件与建站排错教程的资源平台' },
    { id: 'n15', space: 'software', group: '🌐 建站与云服务', title: 'Fiat24 瑞士合规多币种万事达卡后台', url: 'https://www.fiat24.com/login', desc: '瑞士银行监管的多币种账户与海外消费万事达卡登录管理中心' },
    { id: 'n16', space: 'software', group: '🚀 网络加速专线', title: 'iKuuu VPN 海外加速用户中心', url: 'https://ikuuu.co/user', desc: '常用海外网络加速节点状态查看、流量签到与 Clash 订阅链接管理面板' },
    { id: 'n17', space: 'software', group: '🚀 网络加速专线', title: '狗狗加速 (dg5.org) 高速专线仪表盘', url: 'https://www.dg5.org/#/dashboard', desc: '低延迟海外网络加速专线控制台，适合流媒体观看、AI 生图与外网资料检索' },
    { id: 'bm_1792994093844', space: 'software', group: '🚀 网络加速专线', title: 'MMYUN (MMcloud) 云端加速节点中心', url: 'https://mmxz.meimei1314.xyz/user', desc: '多地区高速海外网络加速节点状态查看、流量订阅管理与 Clash 客户端配置导入面板' },
    { id: 'bm_1792994164903', space: 'software', group: '🚀 网络加速专线', title: '赔钱机场 低延迟高速专线仪表盘', url: 'https://dash.xn--cp3a08l.com/dashboard', desc: '高性价比多线路海外网络加速节点监控、流量套餐管理与一键导入 Clash 订阅后台' }
  ];

  // ==================== 4. Chrome 扩展存储适配层（chrome.storage.local + localStorage 兜底） ====================
  const IS_EXTENSION = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
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
    city: 'ws_v10_weather_city'
  };

  async function storeGetAll(keyList) {
    if (IS_EXTENSION) {
      return new Promise(resolve => {
        chrome.storage.local.get(keyList, res => resolve(res || {}));
      });
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

  // ==================== 5. 搜索引擎与全局运行时状态 ====================
  const ENGINE_ORDER = ['local', 'google', 'bing', 'github', 'bilibili', 'taobao', 'jd'];
  const SEARCH_ENGINES = {
    local:    { name: '站内书签', btnText: '筛选', placeholder: '输入关键词全站检索（按 / 或 Ctrl+K 聚焦 · Tab 切引擎 · ↑↓+Enter 直达）...', url: '' },
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

  let bookmarks = [];
  let spaceGroups = { ai: [], cg: [], media: [], software: [] };
  let collapsedGroups = {};
  let todos = [];
  let recentVisits = [];
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

  const offlineIconMapByUrl = new Map();
  const offlineIconMapByHost = new Map();
  const hdUpgradedCache = new Map();
  const spotlightBoundSet = new WeakSet();

  // 全量 8 大工具防误关会话缓存（已补齐图像圆角、格式转换、吸管取色参数）
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
  let loadedRadiusImg = null;
  let paletteSourceImg = null;
  let convSourceImg = null;
  let convOriginalName = 'converted';

  // ==================== 6. 初始化生命周期 ====================
  async function initApp() {
    const badgeEl = document.getElementById('storageStatusBadge');
    if (badgeEl) {
      badgeEl.textContent = IS_EXTENSION ? 'Chrome 扩展本地存储 (chrome.storage.local)' : '浏览器本地存储 (localStorage)';
    }

    buildOfflineIconMaps();
    const saved = await storeGetAll(Object.values(KEYS));

    // 主题与强调色
    const htmlEl = document.documentElement;
    const themeBtn = document.getElementById('themeBtn');
    if (saved[KEYS.theme] === 'light') {
      htmlEl.classList.remove('dark');
      if (themeBtn) themeBtn.textContent = '🌙';
    } else {
      htmlEl.classList.add('dark');
      if (themeBtn) themeBtn.textContent = '☀️';
    }
    setAccentColor(saved[KEYS.accent] || 'indigo', false);

    // 右侧面板折叠状态
    isRightPanelCollapsed = saved[KEYS.rightPanel] === 'collapsed';
    applyRightPanelUI();

    // 品牌 Logo
    initBrandLogo(saved[KEYS.customLogo] || '');

    // 书签、空间分组与分组折叠状态
    if (Array.isArray(saved[KEYS.bookmarks]) && saved[KEYS.bookmarks].length > 0 && saved[KEYS.bookmarks][0].space) {
      bookmarks = saved[KEYS.bookmarks];
    } else {
      bookmarks = JSON.parse(JSON.stringify(INITIAL_BOOKMARKS));
      storeSet({ [KEYS.bookmarks]: bookmarks });
    }

    if (saved[KEYS.spaceGroups] && typeof saved[KEYS.spaceGroups] === 'object') {
      spaceGroups = { ...JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS)), ...saved[KEYS.spaceGroups] };
    } else {
      spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
      storeSet({ [KEYS.spaceGroups]: spaceGroups });
    }

    collapsedGroups = (saved[KEYS.collapsed] && typeof saved[KEYS.collapsed] === 'object') ? saved[KEYS.collapsed] : {};
    recentVisits = Array.isArray(saved[KEYS.recentVisits]) ? saved[KEYS.recentVisits] : [];
    todos = Array.isArray(saved[KEYS.todos]) ? saved[KEYS.todos] : [];

    hydrateOfflineBase64Icons();

    // 便签与待办初始化
    const memoArea = document.getElementById('quickMemoArea');
    const savedMemo = typeof saved[KEYS.memo] === 'string' ? saved[KEYS.memo] : '';
    if (memoArea) memoArea.value = savedMemo;
    updateMemoCount(savedMemo);
    renderTodoList();
    switchNoteTab(saved[KEYS.noteTab] || 'memo', false);

    // 绑定所有静态与动态委托事件（纯 MV3 合规）
    bindAllEvents();

    // 首次渲染与仪表盘启动
    switchSpace('home', 'all');
    initClockAndCNY();
    initWeather(saved[KEYS.city] || 'auto');
  }

  // ==================== 7. 品牌 Logo、主题、强调色与右栏折叠 ====================
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
      storeSet({ [KEYS.customLogo]: base64 });
      const img = document.getElementById('brandLogoImg');
      const fav = document.getElementById('pageFavicon');
      if (img) img.src = base64;
      if (fav) fav.href = base64;
      showToast('🎉 左上角品牌图标已更换并自动保存');
    };
    reader.readAsDataURL(file);
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    storeSet({ [KEYS.theme]: isDark ? 'dark' : 'light' });
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    showToast(isDark ? '🌙 已切换至深邃极光暗色模式' : '☀️ 已切换至通透浅色模式');
  }

  function setAccentColor(colorName, notify = true) {
    document.body.setAttribute('data-accent', colorName);
    storeSet({ [KEYS.accent]: colorName });
    document.querySelectorAll('.accent-dot').forEach(dot => {
      const active = dot.getAttribute('data-color') === colorName;
      dot.classList.toggle('ring-2', active);
      dot.classList.toggle('scale-110', active);
    });
    closeAccentPopover();
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
    storeSet({ [KEYS.rightPanel]: isRightPanelCollapsed ? 'collapsed' : 'expanded' });
    applyRightPanelUI();
    renderMainContent();
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

  // ==================== 8. 双层渐进式超清图标引擎（离线秒开 + 自动升清） ====================
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

  function hydrateOfflineBase64Icons() {
    let updated = false;
    bookmarks.forEach(bm => {
      const matched = findOfflineBase64(bm.url);
      if (matched && bm.icon !== matched && !bm.customIcon) {
        bm.icon = matched;
        updated = true;
      }
    });
    if (updated) saveCoreState();
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
    if (bm.customIcon) return { primarySrc: bm.customIcon, hd1: '', hd2: '', fb1: '', host };

    for (const [domainKey, svgDataUri] of Object.entries(OFFICIAL_BRAND_SVGS)) {
      if (cleanHost === domainKey || cleanHost.endsWith('.' + domainKey)) {
        return { primarySrc: svgDataUri, hd1: '', hd2: '', fb1: '', host };
      }
    }

    const isPrivateHost = !host || host.includes('hzpipeline.com') || host.includes('192.168.');
    const favImHd = !isPrivateHost ? `https://favicon.im/${host}?larger=true` : '';
    const googleHd = !isPrivateHost ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : '';
    const iowenHd = !isPrivateHost ? `https://api.iowen.cn/favicon/${host}.png` : '';

    if (hdUpgradedCache.has(host)) {
      return { primarySrc: hdUpgradedCache.get(host), hd1: '', hd2: '', fb1: findOfflineBase64(bm.url), host };
    }

    const offlineBase64 = (bm.icon && bm.icon.startsWith('data:image')) ? bm.icon : findOfflineBase64(bm.url);
    if (offlineBase64) return { primarySrc: offlineBase64, hd1: favImHd, hd2: googleHd, fb1: iowenHd, host };
    return { primarySrc: favImHd || googleHd, hd1: '', hd2: '', fb1: googleHd || iowenHd, host };
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

  function saveCoreState() {
    storeSet({ [KEYS.bookmarks]: bookmarks, [KEYS.spaceGroups]: spaceGroups });
  }

  function getGroupsForSpace(spaceId) {
    const set = new Set(spaceGroups[spaceId] || []);
    bookmarks.forEach(b => {
      if (b.space === spaceId && b.group) set.add(b.group);
    });
    return Array.from(set);
  }
// ==================== 9. 空间 Dock 与左侧分组目录渲染 ====================
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

    dock.innerHTML = SPACES_CONFIG.map(sp => {
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

    const spObj = SPACES_CONFIG.find(s => s.id === currentSpace) || SPACES_CONFIG[0];
    if (header) header.textContent = spObj.name;
    if (addBtn) addBtn.classList.toggle('hidden', !!spObj.virtual || !!spObj.isTools);
    if (dragTip) dragTip.classList.toggle('hidden', !isEditMode || !!spObj.isTools);

    let html = '';

    if (currentSpace === 'home') {
      const pinnedCount = bookmarks.filter(b => b.pinned).length;
      const recentCount = recentVisits.filter(r => bookmarks.some(b => b.id === r.id)).length;
      if (badge) badge.textContent = bookmarks.length;

      const homeItems = [
        { key: 'all', icon: '⚡', label: '聚焦总览 (置顶+高频)', count: pinnedCount, droppablePin: false },
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

  // ==================== 10. 主内容区卡片、分组折叠与工具卡片渲染 ====================
  function getCardGridClass() {
    return isRightPanelCollapsed
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5';
  }

  function createBookmarkCardHtml(bm) {
    const host = extractDomain(bm.url);
    const firstChar = ((bm.title || host || 'W').replace(/[^\w\u4e00-\u9fa5]/g, '')[0] || '⚡').toUpperCase();
    const gradClass = SPACE_GRAD_MAP[bm.space] || 'from-indigo-500 to-purple-600';
    const { primarySrc, hd1, hd2, fb1 } = getHighDefIconInfo(bm);
    const safeUrl = escapeHtml(bm.url || '#');
    const safeId = escapeHtml(bm.id);

    const editActionsHtml = isEditMode ? `
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
          <button type="button" data-card-action="edit" data-bm-id="${safeId}" class="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-[11px] font-semibold text-amber-600 dark:text-amber-400 transition">编辑</button>
          <button type="button" data-card-action="delete" data-bm-id="${safeId}" class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-[11px] font-semibold text-rose-600 dark:text-rose-400 transition">删除</button>
        </div>
      </div>
    ` : '';

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
        ${editActionsHtml}
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
          <span class="text-[11px] text-slate-400 hidden sm:inline">纯浏览器本地运算 · 自动暂存防误关</span>
        </div>
        <div class="${getCardGridClass()}">
          ${toolsList.map(tool => createToolCardHtml(tool)).join('')}
        </div>
      </section>
    `;
  }

  function renderGroupSectionHtml(spaceId, groupName, items, allowEmptyDrop = false, allowCollapse = true) {
    const m = groupName.match(/^(\S+)\s+(.*)$/);
    const icon = m ? m[1] : '📁';
    const cleanTitle = m ? m[2] : groupName;
    const escG = escapeHtml(groupName);
    const collapseKey = `${spaceId || 'search'}::${groupName}`;
    const isSearching = !!(searchQuery.trim() && currentEngine === 'local');
    const isCollapsed = allowCollapse && !isSearching && !!collapsedGroups[collapseKey];

    const sectionDropAttrs = (isEditMode && spaceId && spaceId !== 'home')
      ? `data-drop-section-space="${spaceId}" data-drop-section-group="${escG}"`
      : '';

    let bodyHtml = '';
    if (!isCollapsed) {
      bodyHtml = items.length > 0
        ? `<div class="${getCardGridClass()}">${items.map(bm => createBookmarkCardHtml(bm)).join('')}</div>`
        : (allowEmptyDrop ? `
          <div class="specular-card rounded-2xl p-8 text-center border-dashed border-2 border-slate-300/70 dark:border-slate-700/70 space-y-2">
            <div class="text-2xl">📂</div>
            <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">分组「${escapeHtml(cleanTitle)}」暂无书签，可直接拖入卡片或点击添加</div>
            <button type="button" data-empty-add-bm="1" class="px-3.5 py-1.5 rounded-xl theme-solid-bg text-white text-xs font-semibold">＋ 添加书签至此分组</button>
          </div>
        ` : '');
    }

    if (!isCollapsed && !bodyHtml) return '';

    return `
      <section ${sectionDropAttrs} class="space-y-3.5 transition-all rounded-2xl">
        <div class="flex items-center justify-between px-1">
          <div ${allowCollapse && !isSearching ? `data-collapse-key="${escapeHtml(collapseKey)}" title="点击折叠或展开此分组"` : ''} class="flex items-center gap-2.5 ${allowCollapse && !isSearching ? 'cursor-pointer select-none group/sec' : ''}">
            <span class="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-700/70 flex items-center justify-center text-base shadow-sm">${icon}</span>
            <h2 class="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
              <span class="group-hover/sec:text-indigo-500 transition-colors">${escapeHtml(cleanTitle)}</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${items.length}</span>
              ${allowCollapse && !isSearching ? `<span class="text-[11px] text-slate-400 group-hover/sec:text-indigo-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}">▾</span>` : ''}
            </h2>
          </div>
          ${isEditMode && spaceId && spaceId !== 'home' ? `<span class="text-[11px] text-amber-500 font-semibold hidden sm:inline">⠿ 拖拽排序或扔进左侧分组 / 顶部 Dock</span>` : ''}
        </div>
        ${bodyHtml}
      </section>
    `;
  }

  function renderMainContent() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    const q = searchQuery.trim().toLowerCase();
    let html = '';

    if (q && currentEngine === 'local') {
      const matchedTools = BUILTIN_TOOLS.filter(t => t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
      const matchedBms = bookmarks.filter(bm =>
        (bm.title && bm.title.toLowerCase().includes(q)) ||
        (bm.desc && bm.desc.toLowerCase().includes(q)) ||
        (bm.url && bm.url.toLowerCase().includes(q)) ||
        (bm.group && bm.group.toLowerCase().includes(q))
      );
      if (matchedBms.length > 0) html += renderGroupSectionHtml('', '🔎 全局书签匹配结果', matchedBms, false, false);
      if (matchedTools.length > 0) html += renderBuiltinToolsSection(matchedTools);
    } else if (currentSpace === 'tools') {
      html += renderBuiltinToolsSection(BUILTIN_TOOLS);
    } else if (currentSpace === 'home') {
      const pinnedList = bookmarks.filter(b => b.pinned);
      const recentBms = recentVisits.map(r => bookmarks.find(b => b.id === r.id)).filter(Boolean).slice(0, 8);

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
          <p class="text-xs text-slate-400">可尝试更换关键词，或按 Tab 切换 Google / Bing / 淘宝 / 京东 搜索</p>
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

  // ==================== 11. 拖拽排序、分组换组、右键菜单与键盘启动器 ====================
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

    menu.classList.remove('hidden');
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = menu.offsetWidth || 176, mh = menu.offsetHeight || 210;
    menu.style.left = `${Math.max(8, Math.min(e.clientX, vw - mw - 12))}px`;
    menu.style.top = `${Math.max(8, Math.min(e.clientY, vh - mh - 12))}px`;
  }

  function closeCardContextMenu() {
    contextMenuBmId = null;
    document.getElementById('cardContextMenu')?.classList.add('hidden');
  }

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
            const url = card.getAttribute('data-kbd-url');
            if (url) { recordBookmarkVisit(bmId, url); window.open(url, '_blank', 'noopener,noreferrer'); }
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

  // ==================== 12. 管理模式、书签 CRUD、移动分组、重复网址体检 ====================
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
    const target = bookmarks.find(b => b.id === id);
    if (!target) return;
    if (confirm(`确定要删除书签「${target.title}」吗？`)) {
      bookmarks = bookmarks.filter(b => b.id !== id);
      recentVisits = recentVisits.filter(r => r.id !== id);
      storeSet({ [KEYS.recentVisits]: recentVisits });
      saveCoreState();
      renderSpaceDock();
      renderSidebarGroups();
      renderMainContent();
      showToast(`🗑️ 已删除「${target.title}」`);
    }
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
    document.getElementById('dataCenterModal')?.classList.remove('hidden');
  }

  function closeDataCenterModal() { document.getElementById('dataCenterModal')?.classList.add('hidden'); }

  function canonicalUrlKey(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '').toLowerCase() + u.pathname.replace(/\/+$/, '').toLowerCase() + u.search.toLowerCase();
    } catch { return normalizeUrl(url); }
  }

  function scanDuplicateBookmarks() {
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

  function exportData() {
    const memo = document.getElementById('quickMemoArea')?.value || '';
    const payload = { version: 10, spaceGroups, bookmarks, todos, memo };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 已导出完整 JSON 备份');
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
          if (Array.isArray(parsed.todos)) { todos = parsed.todos; saveTodos(); renderTodoList(); }
          if (typeof parsed.memo === 'string') {
            const area = document.getElementById('quickMemoArea');
            if (area) { area.value = parsed.memo; handleMemoInput(parsed.memo); }
          }
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].space) {
          bookmarks = parsed;
        } else {
          showToast('❌ JSON 格式不兼容当前架构');
          return;
        }
        hydrateOfflineBase64Icons();
        saveCoreState();
        closeDataCenterModal();
        switchSpace('home', 'all');
        showToast(`📥 成功恢复 ${bookmarks.length} 个书签`);
      } catch { showToast('❌ 解析 JSON 备份文件失败'); }
    };
    reader.readAsText(file);
  }

  function resetDefaultData() {
    if (!confirm('确定要重置回初始 168 个精选书签与默认空间分组吗？')) return;
    bookmarks = JSON.parse(JSON.stringify(INITIAL_BOOKMARKS));
    spaceGroups = JSON.parse(JSON.stringify(INITIAL_SPACE_GROUPS));
    collapsedGroups = {};
    hdUpgradedCache.clear();
    storeSet({ [KEYS.collapsed]: collapsedGroups });
    hydrateOfflineBase64Icons();
    saveCoreState();
    closeDataCenterModal();
    switchSpace('home', 'all');
    showToast('🔄 已恢复至默认 168 个精选书签');
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
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(rawUrl)}`);
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

  // ==================== 14. 最近访问、双标签便签待办、时钟、天气、春节倒计时 ====================
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
    storeSet({ [KEYS.recentVisits]: recentVisits });
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
    if (save) storeSet({ [KEYS.noteTab]: currentNoteTab });
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

  function updateSaveStatusTimestamp() {
    const status = document.getElementById('memoSaveStatus');
    if (status) {
      const now = new Date();
      status.textContent = `已保存 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }

  function saveTodos() { storeSet({ [KEYS.todos]: todos }); updateSaveStatusTimestamp(); }

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

  function handleMemoInput(val) {
    storeSet({ [KEYS.memo]: val });
    updateMemoCount(val);
    updateSaveStatusTimestamp();
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
    const selector = document.getElementById('citySelector');
    if (selector) selector.value = savedCity;
    changeWeatherCity(savedCity, false);
  }

  function changeWeatherCity(val, notify = true) {
    storeSet({ [KEYS.city]: val });
    if (val === 'auto') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude, '本地定位'),
          () => fetchWeatherData(31.2304, 121.4737, '上海(默认)')
        );
      } else {
        fetchWeatherData(31.2304, 121.4737, '上海(默认)');
      }
    } else {
      const [lat, lon, name] = val.split(',');
      fetchWeatherData(parseFloat(lat), parseFloat(lon), name);
      if (notify) showToast(`⛅ 已切换实时天气城市：${name}`);
    }
  }

  async function fetchWeatherData(lat, lon, cityName) {
    const badge = document.getElementById('weatherCityBadge');
    if (badge) badge.textContent = cityName;
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`);
      const data = await res.json();
      if (!data || !data.current) throw new Error('err');
      const cur = data.current;
      const wmo = parseWMOWeather(cur.weather_code);
      document.getElementById('weatherIcon').textContent = wmo.icon;
      document.getElementById('weatherTemp').textContent = Math.round(cur.temperature_2m);
      document.getElementById('weatherDesc').textContent = wmo.desc;
      document.getElementById('weatherFeels').textContent = `${Math.round(cur.apparent_temperature)}°`;
      document.getElementById('weatherHumid').textContent = `${cur.relative_humidity_2m}%`;
      document.getElementById('weatherWind').textContent = `${Math.round(cur.wind_speed_10m)}km/h`;
    } catch {
      document.getElementById('weatherDesc').textContent = '气象离线缓存模式';
    }
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

  // ==================== 15. 内置 8 大纯本地效率工具（纯事件委托 + 全量状态防误关） ====================
  function openToolModal(type) {
    const modal = document.getElementById('toolModal');
    const title = document.getElementById('toolModalTitle');
    const body = document.getElementById('toolModalBody');
    if (!modal || !body) return;

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
      title.textContent = '🖼️ 本地图片圆角合成器 (Canvas 零上传)';
      body.innerHTML = `
        <div class="space-y-3 text-xs">
          <input type="file" id="radiusFileInput" accept="image/*" class="tool-file-input">
          <div class="flex items-center gap-3">
            <span class="font-semibold shrink-0">圆角半径:</span>
            <input type="range" id="radiusSlider" min="0" max="200" value="${escapeHtml(toolSessionCache.radiusVal)}" class="flex-1 accent-indigo-600">
            <span id="radiusValLabel" class="font-mono font-bold theme-text w-12 text-right">${escapeHtml(toolSessionCache.radiusVal)}px</span>
          </div>
          <div class="flex justify-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-4 border border-dashed border-slate-300 dark:border-slate-700">
            <canvas id="radiusCanvas" class="max-h-56 max-w-full rounded shadow-sm"></canvas>
          </div>
          <div class="flex justify-end">
            <button type="button" data-tool-btn="radius-download" class="px-4 py-2 rounded-xl theme-solid-bg text-white text-xs font-semibold">💾 导出透明 PNG</button>
          </div>
        </div>
      `;
      if (loadedRadiusImg) previewRadiusImage();
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
      title.textContent = '🎨 本地图片吸管取色 & 调色板提取器';
      body.innerHTML = `
        <div class="space-y-3 text-xs">
          <input type="file" id="paletteFileInput" accept="image/*" class="tool-file-input">
          <div class="flex justify-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-3 border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
            <canvas id="paletteCanvas" class="max-h-56 max-w-full rounded cursor-crosshair shadow-sm"></canvas>
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
      title.textContent = '🔄 本地图片格式转换 & 尺寸压缩器';
      body.innerHTML = `
        <div class="space-y-3.5 text-xs">
          <input type="file" id="convFileInput" accept="image/*" class="tool-file-input">
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
          <div id="convInfoBadge" class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 font-mono text-slate-500 text-center">请选择一张本地图片</div>
          <div class="flex justify-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-3 border border-dashed border-slate-300 dark:border-slate-700">
            <canvas id="convCanvas" class="max-h-48 max-w-full rounded shadow-sm"></canvas>
          </div>
          <div class="flex justify-end">
            <button type="button" data-tool-btn="conv-download" class="px-5 py-2 rounded-xl theme-solid-bg text-white font-semibold">💾 导出转换后图片</button>
          </div>
        </div>
      `;
      document.getElementById('convFormat').value = toolSessionCache.convFormat;
      document.getElementById('convScale').value = toolSessionCache.convScale;
      if (convSourceImg) updateConvertedPreview();
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
            <div class="font-bold">1. Base64 / URL 编解码</div>
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

  function closeToolModal() { document.getElementById('toolModal')?.classList.add('hidden'); }

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

  function previewRadiusImage() {
    const fileInput = document.getElementById('radiusFileInput');
    const slider = document.getElementById('radiusSlider');
    const canvas = document.getElementById('radiusCanvas');
    if (!canvas || !slider) return;
    toolSessionCache.radiusVal = slider.value;
    const r = parseInt(slider.value, 10);
    document.getElementById('radiusValLabel').textContent = r + 'px';
    const draw = img => {
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
    };
    if (fileInput?.files?.[0]) {
      const reader = new FileReader();
      reader.onload = e => { const img = new Image(); img.onload = () => { loadedRadiusImg = img; draw(img); }; img.src = e.target.result; };
      reader.readAsDataURL(fileInput.files[0]);
    } else if (loadedRadiusImg) draw(loadedRadiusImg);
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

  function drawPaletteImg(img) {
    const canvas = document.getElementById('paletteCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = Math.min(1, 600 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pts = [[0.2,0.2],[0.5,0.2],[0.8,0.2],[0.25,0.7],[0.5,0.75],[0.8,0.75]];
    const swatches = pts.map(([px, py]) => {
      const [r, g, b] = ctx.getImageData(Math.min(canvas.width - 1, Math.floor(canvas.width * px)), Math.min(canvas.height - 1, Math.floor(canvas.height * py)), 1, 1).data;
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    });
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

  function updateConvertedPreview() {
    const q = document.getElementById('convQuality')?.value || '88';
    const fmt = document.getElementById('convFormat')?.value || 'image/jpeg';
    const scaleStr = document.getElementById('convScale')?.value || '1';
    toolSessionCache.convQuality = q;
    toolSessionCache.convFormat = fmt;
    toolSessionCache.convScale = scaleStr;
    const ql = document.getElementById('convQualityLabel');
    if (ql) ql.textContent = q + '%';
    if (!convSourceImg) return;
    const scale = parseFloat(scaleStr);
    const canvas = document.getElementById('convCanvas');
    const w = Math.max(1, Math.round(convSourceImg.width * scale)), h = Math.max(1, Math.round(convSourceImg.height * scale));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(convSourceImg, 0, 0, w, h);
    const kb = Math.round((canvas.toDataURL(fmt, parseInt(q, 10) / 100).length * 0.75) / 1024);
    const badge = document.getElementById('convInfoBadge');
    if (badge) badge.textContent = `输出尺寸: ${w} × ${h} px ｜ 预计大小: ~${kb} KB`;
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

  function runCodec(mode) {
    const el = document.getElementById('codecInput');
    if (!el || !el.value) return;
    try {
      if (mode === 'b64enc') el.value = btoa(unescape(encodeURIComponent(el.value)));
      else if (mode === 'b64dec') el.value = decodeURIComponent(escape(atob(el.value.trim())));
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

  // ==================== 16. 全局纯事件委托中心（100% MV3 CSP 合规） ====================
  function bindAllEvents() {
    // 1) 左栏静态控件
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
      storeSet({ [KEYS.recentVisits]: recentVisits });
      renderRecentVisitsList();
      showToast('🧹 已清空访问足迹');
    });
    document.getElementById('recentVisitsList')?.addEventListener('click', e => {
      const delBtn = e.target.closest('[data-recent-del-id]');
      if (delBtn) {
        e.stopPropagation();
        const delId = delBtn.getAttribute('data-recent-del-id');
        recentVisits = recentVisits.filter(r => r.id !== delId);
        storeSet({ [KEYS.recentVisits]: recentVisits });
        renderRecentVisitsList();
        return;
      }
      const openItem = e.target.closest('[data-recent-open-url]');
      if (openItem) {
        const id = openItem.getAttribute('data-recent-open-id');
        const url = openItem.getAttribute('data-recent-open-url');
        recordBookmarkVisit(id, url);
        window.open(url, '_blank', 'noopener,noreferrer');
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

    // 4) 底部居中玻璃空间 Dock（点击 + 拖放落点）
    const dock = document.getElementById('spaceDockBar');
    dock?.addEventListener('click', e => {
      const btn = e.target.closest('[data-dock-space]');
      if (btn) { clearSearchQuiet(); switchSpace(btn.getAttribute('data-dock-space'), 'all'); }
    });
    bindNavDropDelegation(dock);

    // 5) 左侧分组目录（点击 + 分组重命名/删除 + 分组拖拽调序 + 卡片拖入换组）
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

    // 6) 中栏主内容区事件委托（卡片点击、右键、折叠、编辑按钮、拖拽排序、图片加载升清）
    const main = document.getElementById('mainContent');
    if (main) {
      main.addEventListener('load', e => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('icon-img')) handleIconLoad(e.target);
      }, true);
      main.addEventListener('error', e => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('icon-img')) handleIconError(e.target);
      }, true);

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
          return;
        }
        const collapseBtn = e.target.closest('[data-collapse-key]');
        if (collapseBtn) {
          const key = collapseBtn.getAttribute('data-collapse-key');
          collapsedGroups[key] = !collapsedGroups[key];
          storeSet({ [KEYS.collapsed]: collapsedGroups });
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
          const url = bm ? bm.url : bmCard.getAttribute('data-kbd-url');
          if (url) { recordBookmarkVisit(id, url); window.open(url, '_blank', 'noopener,noreferrer'); }
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

    // 7) 右栏天气、便签与待办
    document.getElementById('citySelector')?.addEventListener('change', e => changeWeatherCity(e.target.value, true));
    document.getElementById('tabBtnMemo')?.addEventListener('click', () => switchNoteTab('memo'));
    document.getElementById('tabBtnTodo')?.addEventListener('click', () => switchNoteTab('todo'));
    document.getElementById('quickMemoArea')?.addEventListener('input', e => handleMemoInput(e.target.value));
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
      if (area && area.value && confirm('确定清空当前便签内容吗？')) { area.value = ''; handleMemoInput(''); showToast('🧹 便签已清空'); }
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

    // 8) 右键菜单
    document.getElementById('cardContextMenu')?.addEventListener('click', e => {
      e.stopPropagation();
      const btn = e.target.closest('[data-ctx-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-ctx-action');
      const id = contextMenuBmId;
      closeCardContextMenu();
      const bm = bookmarks.find(b => b.id === id);
      if (!bm) return;
      if (action === 'pin') togglePinBookmark(id);
      else if (action === 'copy') navigator.clipboard.writeText(bm.url).then(() => showToast('📋 网址已复制到剪贴板'));
      else if (action === 'move') openMoveGroupModal(id);
      else if (action === 'edit') openBookmarkModal(id);
      else if (action === 'delete') deleteBookmark(id);
    });

    // 9) 书签、移动分组、数据中心与工具箱弹窗
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
    document.getElementById('dcResetBtn')?.addEventListener('click', resetDefaultData);
    document.getElementById('duplicateReportBox')?.addEventListener('click', e => {
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

    // 10) 工具箱弹窗内部委托
    document.getElementById('toolModal')?.addEventListener('click', e => { if (e.target.id === 'toolModal') closeToolModal(); });
    document.getElementById('closeToolModalBtn')?.addEventListener('click', closeToolModal);
    const toolBody = document.getElementById('toolModalBody');
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
      if (id === 'radiusFileInput') previewRadiusImage();
      else if (id === 'paletteFileInput') {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => { const img = new Image(); img.onload = () => { paletteSourceImg = img; drawPaletteImg(img); }; img.src = ev.target.result; };
        r.readAsDataURL(f);
      } else if (id === 'convFileInput') {
        const f = e.target.files?.[0]; if (!f) return;
        convOriginalName = f.name.replace(/\.[^.]+$/, '') || 'image';
        const r = new FileReader();
        r.onload = ev => { const img = new Image(); img.onload = () => { convSourceImg = img; updateConvertedPreview(); }; img.src = ev.target.result; };
        r.readAsDataURL(f);
      } else if (id === 'convFormat' || id === 'convScale') updateConvertedPreview();
      else if (id === 'cgFps') calcCgFramesToTc();
      else if (id === 'cgRatio') calcCgResolution();
    });
    toolBody?.addEventListener('click', e => {
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
      else if (act === 'radius-download') {
        const c = document.getElementById('radiusCanvas');
        if (!c || !loadedRadiusImg) { showToast('💡 请先选择图片'); return; }
        const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'rounded.png'; a.click();
      } else if (act === 'ts-convert') convertTimestamp();
      else if (act === 'palette-copy') { navigator.clipboard.writeText(toolSessionCache.pickedHex); showToast(`🎨 已复制 ${toolSessionCache.pickedHex}`); }
      else if (act === 'conv-download') {
        if (!convSourceImg) { showToast('💡 请先选择图片'); return; }
        const c = document.getElementById('convCanvas');
        const fmt = toolSessionCache.convFormat;
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[fmt] || 'jpg';
        const a = document.createElement('a'); a.href = c.toDataURL(fmt, parseInt(toolSessionCache.convQuality, 10) / 100); a.download = `${convOriginalName}.${ext}`; a.click();
      } else if (['b64enc', 'b64dec', 'urlenc', 'urldec'].includes(act)) runCodec(act);
      else if (act === 'codec-copy') { navigator.clipboard.writeText(document.getElementById('codecInput')?.value || ''); showToast('📋 已复制'); }
      else if (act === 'pwd-gen') generateStrongPassword();
      else if (act === 'pwd-copy') { navigator.clipboard.writeText(document.getElementById('pwdOutput')?.value || ''); showToast('📋 强密码已复制'); }
    });

    // 11) Toast、回到顶部、全局快捷键与滚动
    document.getElementById('toastContainer')?.addEventListener('click', e => {
      if (e.target.closest('[data-toast-close]')) e.target.closest('.toast-animate')?.remove();
    });
    document.getElementById('backToTopBtn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); searchInput?.focus(); searchInput?.select();
      } else if (e.key === '/' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); searchInput?.focus(); searchInput?.select();
      } else if (e.key === 'Escape') {
        closeBookmarkModal(); closeMoveGroupModal(); closeDataCenterModal();
        closeToolModal(); closeRecentPopover(); closeAccentPopover(); closeCardContextMenu();
      }
    });

    document.addEventListener('click', () => { closeRecentPopover(); closeAccentPopover(); closeCardContextMenu(); });

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

  // 左侧分组与顶部 Dock 的共用拖放委托
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

  // ==================== 17. 通用工具函数与 Toast ====================
  function normalizeUrl(url) { return (url || '').trim().replace(/\/$/, '').toLowerCase(); }
  function getOriginAndPath(url) { try { const u = new URL(url); return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase(); } catch { return ''; } }
  function extractDomain(url) { try { return new URL(url).hostname; } catch { return ''; } }
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    while (container.children.length >= 3) container.firstElementChild.remove();
    const item = document.createElement('div');
    item.className = 'toast-animate specular-card px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xl border border-indigo-500/30 flex items-center justify-between gap-3 pointer-events-auto';
    item.innerHTML = `<span>${escapeHtml(msg)}</span><button type="button" data-toast-close="1" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs leading-none px-1">✕</button>`;
    container.appendChild(item);
    setTimeout(() => {
      if (!item.isConnected) return;
      item.style.opacity = '0'; item.style.transform = 'translateY(8px)'; item.style.transition = 'all 0.25s ease';
      setTimeout(() => { if (item.isConnected) item.remove(); }, 250);
    }, 2400);
  }

  window.addEventListener('DOMContentLoaded', initApp);
})();