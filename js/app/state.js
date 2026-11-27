/* ==========================================================================
   前端全局运行时状态容器（单一真源）
   ========================================================================== */

import { FALLBACK_SPACES, FALLBACK_SPACE_GROUPS } from '../shared/constants.js';

const DEFAULT_DATA = window.WS_DEFAULT_DATA || {};

export const SPACES_CONFIG = (Array.isArray(DEFAULT_DATA.SPACES_CONFIG) && DEFAULT_DATA.SPACES_CONFIG.length > 0)
  ? DEFAULT_DATA.SPACES_CONFIG
  : FALLBACK_SPACES;

export const INITIAL_SPACE_GROUPS = (DEFAULT_DATA.INITIAL_SPACE_GROUPS && typeof DEFAULT_DATA.INITIAL_SPACE_GROUPS === 'object')
  ? DEFAULT_DATA.INITIAL_SPACE_GROUPS
  : FALLBACK_SPACE_GROUPS;

export const INITIAL_BOOKMARKS = Array.isArray(DEFAULT_DATA.INITIAL_BOOKMARKS)
  ? DEFAULT_DATA.INITIAL_BOOKMARKS
  : [];

export const IS_EXTENSION = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);

export const state = {
  bookmarks: [],
  spaceGroups: { ai: [], cg: [], media: [], software: [] },
  collapsedGroups: {},
  todos: [],
  recentVisits: [],
  weatherCacheMap: {},
  tombstones: {},
  lastWeatherArgs: { lat: 39.9042, lon: 116.4074, cityName: '北京' },
  currentNoteTab: 'memo',
  currentSpace: 'home',
  currentGroup: 'all',
  currentEngine: 'local',
  searchQuery: '',
  isEditMode: false,
  isRightPanelCollapsed: false,
  draggedBookmarkId: null,
  draggedGroupInfo: null,
  contextMenuBmId: null,
  kbdSelectedIndex: -1,
  currentToolType: '',
  lastDeletedUndo: null,
  linkCheckAbortController: null,
  activeLinkCheckPort: null,

  ghSyncConfig: { token: '', gistId: '', autoSync: true, lastSyncAt: 0, lastRemoteUpdatedAt: 0 },
  localUpdatedAt: 0,
  autoSyncTimer: null,
  configSaveTimer: null,
  memoWriteTimer: null,
  isSyncing: false,
  pendingPushAfterSync: false,
  lastWakePullAt: 0,
  internalWritePendingCount: 0,
  weatherRequestSeq: 0,
  isSearchComposing: false,
  searchDebounceTimer: null,
  convEstimateTimer: null,
  convEstimateSeq: 0,

  radiusBatchItems: [],
  radiusActiveIdx: 0,
  convBatchItems: [],
  convActiveIdx: 0,
  paletteSourceImg: null
};

export const offlineIconMapByUrl = new Map();
export const offlineIconMapByHost = new Map();
export const hdUpgradedCache = new Map();
export const iconBustMap = new Map();

export const toolSessionCache = {
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
