// ==UserScript==
// @name         YouTube Smart Speed
// @name:ko      YouTube 스마트 배속
// @name:ja      YouTube スマート倍速
// @name:zh-CN   YouTube 智能倍速
// @namespace    https://github.com/june58-mine/youtube-smart-speed
// @version      1.1.1
// @description  Automatically switches YouTube playback speed by channel, game, and music, with Ctrl+Wheel fine control and optional browser zoom blocking.
// @description:ko 채널·게임·음악 조건에 따라 유튜브 재생 배속을 자동으로 전환하고, Ctrl+휠 미세 조절 및 브라우저 배율 차단을 지원합니다.
// @description:ja チャンネル・ゲーム・音楽の条件に応じて YouTube の再生速度を自動切り替えし、Ctrl+ホイールでの微調整やブラウザズームのブロックに対応します。
// @description:zh-CN 根据频道、游戏和音乐条件自动切换 YouTube 播放倍速，支持 Ctrl+滚轮微调及可选拦截浏览器缩放。
// @author       june58-mine
// @license      MIT
// @homepageURL  https://github.com/june58-mine/youtube-smart-speed
// @supportURL   https://github.com/june58-mine/youtube-smart-speed/issues
// @updateURL    https://raw.githubusercontent.com/june58-mine/youtube-smart-speed/main/youtube-smart-speed.user.js
// @downloadURL  https://raw.githubusercontent.com/june58-mine/youtube-smart-speed/main/youtube-smart-speed.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        *://*.youtube.com/*
// @match        *://youtube.com/*
// @exclude      *://*.youtube.com/live_chat*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const pageDoc = pageWin.document || document;
  if (window.top !== window.self) return;

  // ---------------------------------------------------------------------------
  // Constants, Default Config & Localization
  // ---------------------------------------------------------------------------

  const STORAGE_KEY = 'yt_smart_speed_v52';
  const STYLE_ID = 'yt-smart-speed-styles';
  const MODAL_ID = 'yt-speed-settings-modal';
  const FIXED_BTN_ID = 'yt-smart-speed-fixed-btn';
  const TOAST_ID = 'yt-speed-smart-toast';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const SPEED_MIN = 0.25;
  const SPEED_MAX = 4.00;
  const VALID_LANGUAGES = new Set(['auto', 'en', 'ko', 'ja', 'zh']);
  const LANGUAGE_ENDONYMS = {
    en: 'English',
    ko: '한국어',
    ja: '日本語',
    zh: '中文',
  };
  const LANGUAGE_OPTIONS = [
    { value: 'auto', fixedLabel: null },
    { value: 'en', fixedLabel: 'English' },
    { value: 'ko', fixedLabel: '한국어' },
    { value: 'ja', fixedLabel: '日本語' },
    { value: 'zh', fixedLabel: '中文' },
  ];

  const DEFAULT_CONFIG = {
    defaultSpeed: 1.25,
    slowSpeed: 1.00,
    speedStep: 0.25,
    musicAuto1x: true,
    blockCtrlWheelZoom: false,
    games: [],
    channels: [],
    keywords: [],
    language: 'auto',
  };

  const I18N = {
    en: {
      menuSettings: 'Settings',
      modalTitle: 'YouTube Smart Speed',
      buttonTooltip: 'Smart Speed settings (Shift+S)',
      closeLabel: 'Close',
      footerHint: 'Saved automatically',
      speed: {
        defaultLabel: 'Default speed',
        slowLabel: 'Designated & music speed',
      },
      sections: {
        games: 'Designated games',
        channels: 'Designated channels',
        options: 'Behavior',
        language: 'Language',
      },
      actions: {
        currentGame: 'Current game',
        currentChannel: 'Current channel',
        add: 'Add',
        removeItem: (item) => `Remove ${item}`,
      },
      placeholders: {
        gameName: 'Game name',
      },
      empty: {
        games: 'No games added',
        channels: 'No channels added',
      },
      toggles: {
        musicAuto1x: {
          label: 'Auto-slow for music',
          description: 'Applies to official audio, MVs, and YouTube Music',
        },
        blockCtrlWheelZoom: {
          label: 'Block browser zoom on Ctrl+Wheel',
          description:
            'Changes only video speed when on; adjusts both zoom and speed when off',
        },
      },
      languageRow: {
        label: 'Display language',
        description: (detected) =>
          `Matches browser language when supported · Detected: ${LANGUAGE_ENDONYMS[detected]}`,
        autoOption: 'System',
      },
      feedback: {
        gameNotFound: 'No game tag found on this video',
        gameExists: (name) => `Game already added · ${name}`,
        gameAdded: (name) => `Game added · ${name}`,
        channelNotFound: 'Channel name not found on this video',
        channelExists: (name) => `Channel already added · ${name}`,
        channelAdded: (name) => `Channel added · ${name}`,
      },
      toast: {
        music: 'Music',
        channel: (name) => `Channel · ${name}`,
        game: (name) => `Game · ${name}`,
      },
    },
    ko: {
      menuSettings: '설정',
      modalTitle: 'YouTube 스마트 배속',
      buttonTooltip: '스마트 배속 설정 (Shift+S)',
      closeLabel: '닫기',
      footerHint: '변경 시 자동 저장',
      speed: {
        defaultLabel: '기본 배속',
        slowLabel: '지정·음악 배속',
      },
      sections: {
        games: '지정 게임',
        channels: '지정 채널',
        options: '동작 옵션',
        language: '언어',
      },
      actions: {
        currentGame: '현재 게임',
        currentChannel: '현재 채널',
        add: '추가',
        removeItem: (item) => `${item} 삭제`,
      },
      placeholders: {
        gameName: '게임 이름',
      },
      empty: {
        games: '등록된 게임 없음',
        channels: '등록된 채널 없음',
      },
      toggles: {
        musicAuto1x: {
          label: '음악 영상 자동 감속',
          description: '공식 음원·MV·YouTube Music 재생 시 적용',
        },
        blockCtrlWheelZoom: {
          label: 'Ctrl+휠 브라우저 배율 차단',
          description:
            '켜면 브라우저 배율 변경을 막고 영상 배속만 조절하며, 끄면 둘 다 조절됩니다',
        },
      },
      languageRow: {
        label: '표시 언어',
        description: (detected) =>
          `지원되는 브라우저 언어 자동 적용 · 감지됨: ${LANGUAGE_ENDONYMS[detected]}`,
        autoOption: '시스템',
      },
      feedback: {
        gameNotFound: '현재 영상에서 게임 태그를 찾지 못했습니다',
        gameExists: (name) => `이미 등록된 게임입니다 · ${name}`,
        gameAdded: (name) => `게임 추가됨 · ${name}`,
        channelNotFound: '현재 영상에서 채널명을 찾지 못했습니다',
        channelExists: (name) => `이미 등록된 채널입니다 · ${name}`,
        channelAdded: (name) => `채널 추가됨 · ${name}`,
      },
      toast: {
        music: '음악',
        channel: (name) => `채널 · ${name}`,
        game: (name) => `게임 · ${name}`,
      },
    },
    ja: {
      menuSettings: '設定',
      modalTitle: 'YouTube スマート倍速',
      buttonTooltip: 'スマート倍速設定 (Shift+S)',
      closeLabel: '閉じる',
      footerHint: '変更時に自動保存',
      speed: {
        defaultLabel: '基本の再生速度',
        slowLabel: '指定・音楽の再生速度',
      },
      sections: {
        games: '指定ゲーム',
        channels: '指定チャンネル',
        options: '動作オプション',
        language: '言語',
      },
      actions: {
        currentGame: '現在のゲーム',
        currentChannel: '現在のチャンネル',
        add: '追加',
        removeItem: (item) => `${item} を削除`,
      },
      placeholders: {
        gameName: 'ゲーム名',
      },
      empty: {
        games: '登録されたゲームはありません',
        channels: '登録されたチャンネルはありません',
      },
      toggles: {
        musicAuto1x: {
          label: '音楽動画の自動減速',
          description: '公式音源・MV・YouTube Music 再生時に適用',
        },
        blockCtrlWheelZoom: {
          label: 'Ctrl+ホイール時のブラウザ拡大縮小を無効化',
          description:
            'オン時は動画の再生速度のみ調整し、オフ時はブラウザ倍率と速度の両方を調整します',
        },
      },
      languageRow: {
        label: '表示言語',
        description: (detected) =>
          `対応するブラウザ言語を自動適用 · 検出: ${LANGUAGE_ENDONYMS[detected]}`,
        autoOption: 'システム',
      },
      feedback: {
        gameNotFound: '現在の動画からゲームタグが見つかりません',
        gameExists: (name) => `すでに登録済みのゲームです · ${name}`,
        gameAdded: (name) => `ゲームを追加しました · ${name}`,
        channelNotFound: '現在の動画からチャンネル名が見つかりません',
        channelExists: (name) => `すでに登録済みのチャンネルです · ${name}`,
        channelAdded: (name) => `チャンネルを追加しました · ${name}`,
      },
      toast: {
        music: '音楽',
        channel: (name) => `チャンネル · ${name}`,
        game: (name) => `ゲーム · ${name}`,
      },
    },
    zh: {
      menuSettings: '设置',
      modalTitle: 'YouTube 智能倍速',
      buttonTooltip: '智能倍速设置 (Shift+S)',
      closeLabel: '关闭',
      footerHint: '更改后自动保存',
      speed: {
        defaultLabel: '默认倍速',
        slowLabel: '指定与音乐倍速',
      },
      sections: {
        games: '指定游戏',
        channels: '指定频道',
        options: '功能选项',
        language: '语言',
      },
      actions: {
        currentGame: '当前游戏',
        currentChannel: '当前频道',
        add: '添加',
        removeItem: (item) => `移除 ${item}`,
      },
      placeholders: {
        gameName: '游戏名称',
      },
      empty: {
        games: '暂无已添加的游戏',
        channels: '暂无已添加的频道',
      },
      toggles: {
        musicAuto1x: {
          label: '音乐视频自动降速',
          description: '播放官方音源、MV 或 YouTube Music 时生效',
        },
        blockCtrlWheelZoom: {
          label: '拦截 Ctrl+滚轮 浏览器缩放',
          description:
            '开启后仅调节视频倍速；关闭时浏览器缩放与视频倍速会同时调整',
        },
      },
      languageRow: {
        label: '显示语言',
        description: (detected) =>
          `自动匹配浏览器语言 · 已检测: ${LANGUAGE_ENDONYMS[detected]}`,
        autoOption: '系统',
      },
      feedback: {
        gameNotFound: '当前视频未找到游戏标签',
        gameExists: (name) => `该游戏已添加 · ${name}`,
        gameAdded: (name) => `已添加游戏 · ${name}`,
        channelNotFound: '当前视频未找到频道名称',
        channelExists: (name) => `该频道已添加 · ${name}`,
        channelAdded: (name) => `已添加频道 · ${name}`,
      },
      toast: {
        music: '音乐',
        channel: (name) => `频道 · ${name}`,
        game: (name) => `游戏 · ${name}`,
      },
    },
  };

  const ICONS = {
    gauge: ['M12 14l4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
    close: ['M18 6 6 18', 'M6 6l12 12'],
    plus: ['M5 12h14', 'M12 5v14'],
    gamepad: [
      'M6 11h4M8 9v4M15 12h.01M18 10h.01',
      'M17.32 5H6.68a4 4 0 0 0-3.98 3.59L2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3l-.69-7.41A4 4 0 0 0 17.32 5z',
    ],
    tv: ['M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z', 'M17 2l-5 5-5-5'],
    music: [
      'M9 18V5l12-2v13',
      'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
      'M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    ],
    zoom: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3', 'M11 8v6', 'M8 11h6'],
  };

  // ---------------------------------------------------------------------------
  // Locale Detection & Config Storage
  // ---------------------------------------------------------------------------

  function normalizeLanguageTag(tag) {
    if (typeof tag !== 'string') return null;
    const lower = tag.trim().toLowerCase();
    if (!lower) return null;
    if (lower === 'ko' || lower.startsWith('ko-') || lower.startsWith('ko_')) return 'ko';
    if (lower === 'ja' || lower.startsWith('ja-') || lower.startsWith('ja_')) return 'ja';
    if (lower === 'zh' || lower.startsWith('zh-') || lower.startsWith('zh_')) return 'zh';
    if (lower === 'en' || lower.startsWith('en-') || lower.startsWith('en_')) return 'en';
    return null;
  }

  function detectSystemLocale() {
    const nav = pageWin.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    let primaryTag = '';
    if (nav) {
      if (typeof nav.language === 'string' && nav.language) {
        primaryTag = nav.language;
      } else if (Array.isArray(nav.languages) && nav.languages.length > 0 && nav.languages[0]) {
        primaryTag = nav.languages[0];
      }
    }
    if (!primaryTag && typeof Intl !== 'undefined') {
      try {
        primaryTag = Intl.DateTimeFormat().resolvedOptions().locale || '';
      } catch {
        // Fallback to English when Intl locale inspection is unavailable.
      }
    }
    return normalizeLanguageTag(primaryTag) || 'en';
  }

  function clampSpeed(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    const clamped = Math.min(Math.max(num, SPEED_MIN), SPEED_MAX);
    return Math.round(clamped * 100) / 100;
  }

  function sanitizeStringList(items, deduplicateChannels = false) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items.reduce((acc, item) => {
      if (typeof item !== 'string') return acc;
      let val = item.trim();
      if (deduplicateChannels) {
        const dupMatch = val.match(/^(.+?)[\r\n]+\s*\1$/s);
        if (dupMatch) val = dupMatch[1].trim();
      }
      const key = val.toLowerCase();
      if (val && !seen.has(key)) {
        seen.add(key);
        acc.push(val);
      }
      return acc;
    }, []);
  }

  function sanitizeConfig(rawObj) {
    const src = rawObj && typeof rawObj === 'object' ? rawObj : {};
    return {
      defaultSpeed: clampSpeed(src.defaultSpeed, DEFAULT_CONFIG.defaultSpeed),
      slowSpeed: clampSpeed(src.slowSpeed, DEFAULT_CONFIG.slowSpeed),
      speedStep: clampSpeed(src.speedStep, DEFAULT_CONFIG.speedStep),
      musicAuto1x:
        typeof src.musicAuto1x === 'boolean' ? src.musicAuto1x : DEFAULT_CONFIG.musicAuto1x,
      blockCtrlWheelZoom:
        typeof src.blockCtrlWheelZoom === 'boolean'
          ? src.blockCtrlWheelZoom
          : DEFAULT_CONFIG.blockCtrlWheelZoom,
      games: sanitizeStringList(src.games, false),
      channels: sanitizeStringList(src.channels, true),
      keywords: sanitizeStringList(src.keywords, false),
      language: VALID_LANGUAGES.has(src.language) ? src.language : DEFAULT_CONFIG.language,
    };
  }

  function parseStoredJson(raw) {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function readLocalStorageRaw() {
    try {
      return parseStoredJson(pageWin.localStorage?.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function writeConfigRaw(cfgObj) {
    try {
      const serialized = JSON.stringify(cfgObj);
      if (typeof GM_setValue === 'function') {
        GM_setValue(STORAGE_KEY, serialized);
      } else {
        pageWin.localStorage?.setItem(STORAGE_KEY, serialized);
      }
    } catch {
      // Keep the updated configuration active in memory even if storage write is blocked.
    }
  }

  function loadConfig() {
    try {
      if (typeof GM_getValue === 'function') {
        const gmRaw = parseStoredJson(GM_getValue(STORAGE_KEY, null));
        if (gmRaw) return sanitizeConfig(gmRaw);

        // Migrate v1.0.0 localStorage settings seamlessly into GM storage.
        const legacyRaw = readLocalStorageRaw();
        if (legacyRaw) {
          const migrated = sanitizeConfig(legacyRaw);
          writeConfigRaw(migrated);
          return migrated;
        }
        return { ...DEFAULT_CONFIG };
      }
    } catch {
      // Fall back to localStorage below if GM storage throws.
    }
    const localRaw = readLocalStorageRaw();
    return localRaw ? sanitizeConfig(localRaw) : { ...DEFAULT_CONFIG };
  }

  let config = loadConfig();
  let registeredWheelPassive = null;

  function saveConfig(nextPartial = null) {
    config = sanitizeConfig(nextPartial ? { ...config, ...nextPartial } : config);
    writeConfigRaw(config);
    syncWheelListener();
  }

  function resolveLocale() {
    if (config.language !== 'auto' && VALID_LANGUAGES.has(config.language)) {
      return config.language;
    }
    return detectSystemLocale();
  }

  function getLocaleBundle() {
    return I18N[resolveLocale()] || I18N.en;
  }

  function formatSpeedText(rate) {
    if (rate === 1) return '1.00x';
    const str = rate.toFixed(2);
    return (str.endsWith('0') && !str.endsWith('.00') ? str.slice(0, -1) : str) + 'x';
  }

  // ---------------------------------------------------------------------------
  // State & DOM Helpers
  // ---------------------------------------------------------------------------

  let currentVideoId = '';
  let isManualOverride = false;
  let toastTimeout = null;
  let feedbackTimeout = null;
  let navApplyTimer = null;
  let mountRetryTimers = [];
  let pendingPlayTarget = null;
  let pendingPlayHandler = null;
  let modalState = null;

  function el(tag, cls, ...children) {
    const node = pageDoc.createElement(tag);
    if (cls) node.className = cls;
    for (const child of children) {
      if (child == null) continue;
      node.appendChild(
        typeof child === 'string' ? pageDoc.createTextNode(child) : child
      );
    }
    return node;
  }

  function icon(paths, size = 16, sw = 1.5) {
    const svg = pageDoc.createElementNS(SVG_NS, 'svg');
    Object.entries({
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': sw,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    }).forEach(([k, v]) => svg.setAttribute(k, String(v)));
    svg.style.cssText = 'display:block;flex-shrink:0;';
    for (const d of paths) {
      const p = pageDoc.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    }
    return svg;
  }

  function getFullscreenElement() {
    return pageDoc.fullscreenElement || pageDoc.webkitFullscreenElement || null;
  }

  function ensureStyles() {
    if (pageDoc.getElementById(STYLE_ID)) return;
    const mountTarget = pageDoc.head || pageDoc.documentElement;
    if (!mountTarget) return;

    const style = pageDoc.createElement('style');
    style.id = STYLE_ID;
    // Use textContent rather than innerHTML to satisfy YouTube Trusted Types CSP.
    style.textContent = `
      #${FIXED_BTN_ID} {
        --ytss-action-bg: rgba(0, 0, 0, 0.05);
        --ytss-action-bg-hover: rgba(0, 0, 0, 0.1);
        --ytss-action-fg: #0f0f0f;
        --ytss-action-ring: rgba(220, 38, 38, 0.72);
        border-radius: 50% !important;
        background: var(--ytss-action-bg) !important;
        color: var(--ytss-action-fg) !important;
        border: none !important;
        padding: 0 !important;
        font: 500 12px/1 "YouTube Sans", "Roboto", system-ui, -apple-system, sans-serif !important;
        font-variant-numeric: tabular-nums !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-left: 8px !important;
        user-select: none !important;
        flex-shrink: 0 !important;
        vertical-align: middle !important;
        box-sizing: border-box !important;
        transition:
          background-color 140ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 140ms cubic-bezier(0.22, 1, 0.36, 1) !important;
      }
      html[dark] #${FIXED_BTN_ID} {
        --ytss-action-bg: rgba(255, 255, 255, 0.1);
        --ytss-action-bg-hover: rgba(255, 255, 255, 0.18);
        --ytss-action-fg: #ededed;
        --ytss-action-ring: rgba(229, 72, 77, 0.75);
      }
      #${FIXED_BTN_ID}:hover {
        background: var(--ytss-action-bg-hover) !important;
      }
      #${FIXED_BTN_ID}:active {
        transform: scale(0.97) !important;
      }
      #${FIXED_BTN_ID}:focus-visible {
        outline: 2px solid var(--ytss-action-ring) !important;
        outline-offset: 2px !important;
      }

      #${TOAST_ID} {
        position: absolute;
        top: 16%;
        left: 50%;
        transform: translate(-50%, 6px);
        opacity: 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(20, 20, 21, 0.92);
        border: 1px solid rgba(237, 237, 237, 0.1);
        color: #ededed;
        padding: 8px 16px;
        border-radius: 8px;
        font: 400 14px/20px "YouTube Sans", "Roboto", system-ui, -apple-system, sans-serif;
        z-index: 999999;
        pointer-events: none;
        transition:
          opacity 160ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      #${TOAST_ID}.is-visible {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      .ytss-toast-rate {
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: #ededed;
      }
      .ytss-toast-meta {
        color: #a1a1a6;
        font-size: 13px;
      }

      #${MODAL_ID} {
        --ytss-bg: #ffffff;
        --ytss-surface-muted: #fafafa;
        --ytss-surface-raised: #f4f4f5;
        --ytss-surface-raised-hover: #eaeaec;
        --ytss-surface-well: #f4f4f5;
        --ytss-surface-active: #ffffff;
        --ytss-text: #171717;
        --ytss-sub: #525252;
        --ytss-muted: #737373;
        --ytss-border: rgba(23, 23, 23, 0.08);
        --ytss-border-strong: rgba(23, 23, 23, 0.14);
        --ytss-hover: rgba(23, 23, 23, 0.05);
        --ytss-switch-off: rgba(23, 23, 23, 0.22);
        --ytss-thumb: #ffffff;
        --ytss-thumb-checked: #ffffff;
        --ytss-accent: #dc2626;
        --ytss-accent-border: rgba(220, 38, 38, 0.7);
        --ytss-accent-ring: rgba(220, 38, 38, 0.2);
        --ytss-card-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        --ytss-segment-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        --ytss-kbd-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.12);
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: rgba(0, 0, 0, 0.44);
        font-family: "YouTube Sans", "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;
        color: var(--ytss-text);
        box-sizing: border-box;
      }
      html[dark] #${MODAL_ID} {
        --ytss-bg: #19191b;
        --ytss-surface-muted: #141415;
        --ytss-surface-raised: #232325;
        --ytss-surface-raised-hover: #2c2c2f;
        --ytss-surface-well: #0f0f10;
        --ytss-surface-active: #2e2e32;
        --ytss-text: #ededed;
        --ytss-sub: #a1a1a6;
        --ytss-muted: #85858b;
        --ytss-border: rgba(237, 237, 237, 0.08);
        --ytss-border-strong: rgba(237, 237, 237, 0.14);
        --ytss-hover: rgba(237, 237, 237, 0.06);
        --ytss-switch-off: rgba(237, 237, 237, 0.22);
        --ytss-thumb: #ededed;
        --ytss-thumb-checked: #ffffff;
        --ytss-accent: #e5484d;
        --ytss-accent-border: rgba(229, 72, 77, 0.72);
        --ytss-accent-ring: rgba(229, 72, 77, 0.22);
        --ytss-card-shadow: 0 4px 16px rgba(0, 0, 0, 0.36);
        --ytss-segment-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        --ytss-kbd-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.4);
        background: rgba(0, 0, 0, 0.64);
      }
      #${MODAL_ID}[hidden] {
        display: none;
      }
      #${MODAL_ID} * {
        box-sizing: border-box;
      }
      @keyframes ytss-enter {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ytss-card {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 464px;
        max-height: calc(100vh - 32px);
        background: var(--ytss-bg);
        color: var(--ytss-text);
        border: 1px solid var(--ytss-border);
        border-radius: 16px;
        box-shadow: var(--ytss-card-shadow);
        overflow: hidden;
        animation: ytss-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-header {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--ytss-border);
      }
      .ytss-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .ytss-icon-box {
        color: var(--ytss-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .ytss-title {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        color: var(--ytss-text);
      }
      .ytss-icon-btn {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--ytss-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-icon-btn:hover {
        background: var(--ytss-hover);
        color: var(--ytss-text);
      }
      .ytss-icon-btn:active {
        transform: scale(0.96);
      }
      .ytss-body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .ytss-speed-grid {
        background: var(--ytss-surface-muted);
        border: 1px solid var(--ytss-border);
        border-radius: 16px;
        padding: 12px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .ytss-speed-cell {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }
      .ytss-field-label {
        font-size: 12px;
        font-weight: 500;
        line-height: 16px;
        color: var(--ytss-sub);
      }
      .ytss-number-wrap {
        height: 36px;
        background: var(--ytss-surface-raised);
        border: 1px solid var(--ytss-border);
        border-radius: 8px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition:
          border-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-number-wrap:focus-within,
      .ytss-text-input:focus {
        border-color: var(--ytss-accent-border);
        box-shadow: 0 0 0 2px var(--ytss-accent-ring);
      }
      .ytss-number-input {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        color: var(--ytss-text);
        font: 500 14px/20px inherit;
        font-variant-numeric: tabular-nums;
        padding: 0;
      }
      .ytss-unit {
        font-size: 13px;
        line-height: 16px;
        color: var(--ytss-muted);
        user-select: none;
      }
      .ytss-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ytss-section-options {
        gap: 4px;
      }
      .ytss-section-divider {
        padding-top: 16px;
        border-top: 1px solid var(--ytss-border);
      }
      .ytss-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 28px;
      }
      .ytss-section-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        line-height: 20px;
        color: var(--ytss-text);
      }
      .ytss-section-kicker {
        margin: 0;
        font-size: 12px;
        font-weight: 500;
        line-height: 16px;
        letter-spacing: 0.01em;
        color: var(--ytss-muted);
      }
      .ytss-btn-subtle {
        height: 28px;
        padding: 0 8px;
        border-radius: 6px;
        background: var(--ytss-surface-raised);
        border: 1px solid var(--ytss-border);
        color: var(--ytss-text);
        font: 400 12px/16px inherit;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        transition:
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          border-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-btn-subtle:hover,
      .ytss-btn-secondary:hover,
      .ytss-btn-close:hover {
        background: var(--ytss-surface-raised-hover);
        border-color: var(--ytss-border-strong);
      }
      .ytss-btn-subtle:active,
      .ytss-btn-secondary:active,
      .ytss-btn-close:active,
      .ytss-lang-btn:active {
        transform: scale(0.98);
      }
      .ytss-btn-subtle svg {
        color: var(--ytss-muted);
      }
      .ytss-input-row {
        display: flex;
        gap: 8px;
      }
      .ytss-text-input {
        flex: 1 1 auto;
        min-width: 0;
        height: 36px;
        background: var(--ytss-surface-raised);
        border: 1px solid var(--ytss-border);
        border-radius: 8px;
        padding: 0 12px;
        color: var(--ytss-text);
        font: 400 13px/20px inherit;
        outline: none;
        transition:
          border-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-text-input::placeholder {
        color: var(--ytss-muted);
      }
      .ytss-btn-secondary {
        flex: 0 0 auto;
        height: 36px;
        padding: 0 16px;
        border-radius: 8px;
        background: var(--ytss-surface-raised);
        border: 1px solid var(--ytss-border);
        color: var(--ytss-text);
        font: 500 13px/20px inherit;
        cursor: pointer;
        transition:
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          border-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-tag-well {
        background: var(--ytss-surface-well);
        border: 1px solid var(--ytss-border);
        border-radius: 14px;
        padding: 8px;
        min-height: 44px;
        max-height: 96px;
        overflow-y: auto;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .ytss-empty {
        font-size: 12px;
        line-height: 16px;
        color: var(--ytss-muted);
        padding: 0 4px;
      }
      .ytss-chip {
        height: 28px;
        padding: 0 8px;
        border-radius: 6px;
        background: var(--ytss-surface-active);
        border: 1px solid var(--ytss-border);
        color: var(--ytss-text);
        font-size: 12px;
        line-height: 16px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .ytss-chip-del {
        width: 16px;
        height: 16px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--ytss-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-chip-del:hover {
        color: var(--ytss-text);
        background: var(--ytss-hover);
      }
      .ytss-feedback {
        font-size: 12px;
        line-height: 16px;
        color: var(--ytss-sub);
        background: var(--ytss-surface-raised);
        border: 1px solid var(--ytss-border);
        border-radius: 8px;
        padding: 8px 12px;
      }
      .ytss-feedback[hidden] {
        display: none;
      }
      .ytss-feedback.is-error {
        color: var(--ytss-accent);
        border-color: var(--ytss-accent-ring);
      }
      .ytss-toggle-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ytss-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin: 0 -8px;
        padding: 8px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-toggle-row:hover {
        background: var(--ytss-hover);
      }
      .ytss-toggle-left {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .ytss-toggle-left .ytss-icon-box {
        margin-top: 2px;
      }
      .ytss-toggle-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .ytss-toggle-title {
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
        color: var(--ytss-text);
      }
      .ytss-toggle-sub {
        font-size: 13px;
        font-weight: 400;
        line-height: 18px;
        color: var(--ytss-sub);
      }
      .ytss-switch {
        position: relative;
        flex: 0 0 auto;
        width: 36px;
        height: 20px;
      }
      .ytss-switch input {
        position: absolute;
        inset: 0;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .ytss-switch-slider {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: var(--ytss-switch-off);
        transition: background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
        pointer-events: none;
      }
      .ytss-switch-slider::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--ytss-thumb);
        transition:
          transform 150ms cubic-bezier(0.22, 1, 0.36, 1),
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-switch input:checked + .ytss-switch-slider {
        background: var(--ytss-accent);
      }
      .ytss-switch input:checked + .ytss-switch-slider::after {
        background: var(--ytss-thumb-checked);
        transform: translateX(16px);
      }
      .ytss-lang-row {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ytss-lang-group {
        display: flex;
        flex-wrap: wrap;
        padding: 4px;
        gap: 4px;
        border-radius: 12px;
        background: var(--ytss-surface-raised);
        box-shadow: inset 0 0 0 1px var(--ytss-border);
      }
      .ytss-lang-btn {
        flex: 1 1 0;
        min-height: 32px;
        border: none;
        border-radius: 8px;
        padding: 8px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        line-height: 16px;
        cursor: pointer;
        background: transparent;
        color: var(--ytss-sub);
        transition:
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-lang-btn:hover {
        color: var(--ytss-text);
      }
      .ytss-lang-btn[aria-checked="true"] {
        background: var(--ytss-surface-active);
        color: var(--ytss-accent);
        box-shadow: var(--ytss-segment-shadow);
      }
      .ytss-footer {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 20px;
        border-top: 1px solid var(--ytss-border);
      }
      .ytss-footer-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        min-width: 0;
        font-size: 12px;
        line-height: 16px;
        color: var(--ytss-muted);
      }
      .ytss-shortcuts {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .ytss-shortcut-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .ytss-kbd {
        display: inline-flex;
        align-items: center;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--ytss-surface-raised);
        border: 1px solid var(--ytss-border-strong);
        box-shadow: var(--ytss-kbd-shadow);
        color: var(--ytss-sub);
        font: 400 11px/14px ui-monospace, Consolas, monospace;
      }
      .ytss-btn-close {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        padding: 0 16px;
        border-radius: 8px;
        border: 1px solid var(--ytss-border);
        background: var(--ytss-surface-raised);
        color: var(--ytss-text);
        font: 500 13px/16px inherit;
        cursor: pointer;
        transition:
          background-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          border-color 150ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .ytss-switch input:focus-visible + .ytss-switch-slider,
      .ytss-icon-btn:focus-visible,
      .ytss-btn-subtle:focus-visible,
      .ytss-btn-secondary:focus-visible,
      .ytss-btn-close:focus-visible,
      .ytss-lang-btn:focus-visible,
      .ytss-chip-del:focus-visible {
        outline: 2px solid var(--ytss-accent);
        outline-offset: 2px;
      }
    `;
    mountTarget.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Video Metadata & Speed Rules
  // ---------------------------------------------------------------------------

  function getActiveWatchVideo() {
    const host = pageWin.location?.hostname || '';
    const path = pageWin.location?.pathname || '';
    const onVideoPage =
      path === '/watch' ||
      path.startsWith('/live/') ||
      path.startsWith('/shorts/') ||
      host.includes('music.youtube.com');
    if (!onVideoPage) return null;

    const player = pageDoc.getElementById('movie_player');
    return (
      player?.querySelector('video.html5-main-video') ||
      pageDoc.querySelector('video.html5-main-video') ||
      pageDoc.querySelector('video')
    );
  }

  function getVideoMeta() {
    let title = '';
    let author = '';
    let officialGame = '';
    let keywords = [];
    let isOfficialMusic = false;

    try {
      const vid = new URLSearchParams(pageWin.location?.search || '').get('v');
      const player = pageDoc.getElementById('movie_player');
      const pr =
        player && typeof player.getPlayerResponse === 'function'
          ? player.getPlayerResponse()
          : pageDoc.querySelector('ytd-watch-flexy')?.playerData ||
            pageWin.ytInitialPlayerResponse;

      if (pr?.videoDetails && (!vid || !pr.videoDetails.videoId || pr.videoDetails.videoId === vid)) {
        title = pr.videoDetails.title || '';
        author = (pr.videoDetails.author || '').trim();
        keywords = pr.videoDetails.keywords || [];
      }
      if (!title) title = pageDoc.title || '';
      if (!author) {
        const owner = pageDoc.querySelector(
          'ytd-watch-metadata #owner #channel-name #text a, ytd-watch-metadata #owner #channel-name #text, #owner #channel-name #text, #owner #channel-name a'
        );
        if (owner) author = owner.textContent.trim();
      }
      const gameEl = pageDoc.querySelector('ytd-rich-metadata-renderer[role="link"] #title');
      if (gameEl) officialGame = gameEl.textContent.trim();

      const cat = pr?.microformat?.playerMicroformatRenderer?.category;
      const mType = pr?.videoDetails?.musicVideoType;
      const genre = pageDoc.querySelector('meta[itemprop="genre"]');
      isOfficialMusic =
        (cat && cat.toLowerCase() === 'music') ||
        mType === 'MUSIC_VIDEO_TYPE_OMV' ||
        mType === 'MUSIC_VIDEO_TYPE_ATV' ||
        Boolean(genre?.content && genre.content.toLowerCase() === 'music');
    } catch {
      // Ignore transient DOM/player metadata errors during SPA transitions.
    }

    return { title, author, officialGame, keywords, isOfficialMusic };
  }

  function checkSlowCondition() {
    const bundle = getLocaleBundle();
    const host = pageWin.location?.hostname || '';
    const search = pageWin.location?.search || '';

    if (config.musicAuto1x && (host.includes('music.youtube.com') || search.includes('list=RD'))) {
      return { isSlow: true, label: bundle.toast.music };
    }

    const meta = getVideoMeta();
    const lAuthor = meta.author.toLowerCase();
    const lTitle = meta.title.toLowerCase();
    const lGame = meta.officialGame.toLowerCase();

    for (const ch of config.channels) {
      const t = ch.trim().toLowerCase();
      if (t && lAuthor.includes(t)) {
        return { isSlow: true, label: bundle.toast.channel(ch) };
      }
    }
    for (const g of config.games) {
      const t = g.trim().toLowerCase();
      if (
        t &&
        (lGame.includes(t) ||
          lTitle.includes(t) ||
          meta.keywords.some((k) => String(k).toLowerCase().includes(t)))
      ) {
        return { isSlow: true, label: bundle.toast.game(g) };
      }
    }
    if (config.musicAuto1x && meta.isOfficialMusic) {
      return { isSlow: true, label: bundle.toast.music };
    }
    for (const kw of config.keywords) {
      const t = kw.trim().toLowerCase();
      if (t && lTitle.includes(t)) {
        return { isSlow: true, label: kw };
      }
    }
    return { isSlow: false, label: '' };
  }

  // ---------------------------------------------------------------------------
  // Speed Application & Toast Notification
  // ---------------------------------------------------------------------------

  function showToast(speedText, reason = '') {
    ensureStyles();
    const container = pageDoc.getElementById('movie_player') || pageDoc.body;
    if (!container) return;

    let toast = pageDoc.getElementById(TOAST_ID);
    if (!toast) {
      toast = el('div', '', el('span', 'ytss-toast-rate'), el('span', 'ytss-toast-meta'));
      toast.id = TOAST_ID;
    }
    if (toast.parentElement !== container) {
      container.appendChild(toast);
    }

    toast.querySelector('.ytss-toast-rate').textContent = speedText;
    const metaEl = toast.querySelector('.ytss-toast-meta');
    metaEl.textContent = reason;
    metaEl.style.display = reason ? 'inline' : 'none';
    toast.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 900);
  }

  function setSpeed(rate, manual = false) {
    const video =
      pageDoc.querySelector('#movie_player video.html5-main-video') ||
      pageDoc.querySelector('video.html5-main-video') ||
      pageDoc.querySelector('video');
    if (!video) return;

    const normalized = clampSpeed(rate, config.defaultSpeed);
    if (video.playbackRate !== normalized) {
      video.playbackRate = normalized;
    }

    const player = pageDoc.getElementById('movie_player');
    if (player && typeof player.setPlaybackRate === 'function') {
      try {
        player.setPlaybackRate(normalized);
      } catch {
        // Ignore player API mismatches when custom wrappers restrict calls.
      }
    }

    const btn = pageDoc.getElementById(FIXED_BTN_ID);
    if (btn) btn.textContent = formatSpeedText(normalized);

    if (manual) {
      isManualOverride = true;
      showToast(`${normalized.toFixed(2)}x`);
    }
  }

  function clearPendingPlayListener() {
    if (pendingPlayTarget && pendingPlayHandler) {
      pendingPlayTarget.removeEventListener('play', pendingPlayHandler);
    }
    pendingPlayTarget = null;
    pendingPlayHandler = null;
  }

  function applySpeedForCurrentVideo() {
    if (isManualOverride) return;
    const video = getActiveWatchVideo();
    if (!video) return;

    const cond = checkSlowCondition();
    const target = cond.isSlow ? config.slowSpeed : config.defaultSpeed;
    setSpeed(target, false);
    showToast(`${target.toFixed(2)}x`, cond.isSlow ? cond.label : '');

    clearPendingPlayListener();
    pendingPlayTarget = video;
    pendingPlayHandler = () => {
      pendingPlayTarget = null;
      pendingPlayHandler = null;
      if (!isManualOverride && Math.abs(video.playbackRate - target) > 0.01) {
        setSpeed(target, false);
      }
    };
    video.addEventListener('play', pendingPlayHandler, { once: true });
  }

  // ---------------------------------------------------------------------------
  // Hotkeys & Ctrl+Wheel Control
  // ---------------------------------------------------------------------------

  function isSettingsModalOpen() {
    const modal = pageDoc.getElementById(MODAL_ID);
    return Boolean(modal && !modal.hidden);
  }

  function handleCtrlWheel(e) {
    if (!e.ctrlKey || !e.deltaY || isSettingsModalOpen()) return;
    const video = getActiveWatchVideo();
    if (!video) return;

    if (config.blockCtrlWheelZoom) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
    const stepDelta = (e.deltaY < 0 ? 1 : -1) * config.speedStep;
    const nextRate = Math.round((video.playbackRate + stepDelta) * 100) / 100;
    setSpeed(nextRate, true);
  }

  function syncWheelListener() {
    const nextPassive = !config.blockCtrlWheelZoom;
    if (registeredWheelPassive === nextPassive) return;
    if (registeredWheelPassive !== null) {
      window.removeEventListener('wheel', handleCtrlWheel, { capture: true });
    }
    // Keep the wheel listener passive while zoom blocking is off so Chromium's
    // compositor takes the non-blocking path for Ctrl+Wheel / pinch browser zoom.
    window.addEventListener('wheel', handleCtrlWheel, {
      passive: nextPassive,
      capture: true,
    });
    registeredWheelPassive = nextPassive;
  }

  syncWheelListener();

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && isSettingsModalOpen()) {
        e.preventDefault();
        e.stopPropagation();
        closeSettingsModal();
        return;
      }
      const t = e.target;
      const tag = t?.tagName ? t.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || t?.isContentEditable) return;
      if (e.shiftKey && (e.code === 'KeyS' || e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        toggleSettingsModal();
      }
    },
    true
  );

  // ---------------------------------------------------------------------------
  // Action Bar Button & SPA Navigation
  // ---------------------------------------------------------------------------

  function updateFixedButtonMetadata(btn) {
    if (!btn) return;
    const tooltip = getLocaleBundle().buttonTooltip;
    btn.title = tooltip;
    btn.setAttribute('aria-label', tooltip);
  }

  function mountFixedButton() {
    ensureStyles();
    const bar = pageDoc.querySelector(
      'ytd-watch-metadata #actions #top-level-buttons-computed, #top-row #actions #top-level-buttons-computed'
    );
    if (!bar) return false;

    const video = getActiveWatchVideo();
    const rate = video ? video.playbackRate : config.defaultSpeed;
    const existing = bar.querySelector(`#${FIXED_BTN_ID}`);
    if (existing) {
      existing.textContent = formatSpeedText(rate);
      updateFixedButtonMetadata(existing);
      return true;
    }

    pageDoc.querySelectorAll(`#${FIXED_BTN_ID}`).forEach((n) => n.remove());
    const neighbor = bar.querySelector('button, yt-button-shape');
    const size =
      neighbor && neighbor.offsetHeight >= 32 && neighbor.offsetHeight <= 46
        ? neighbor.offsetHeight
        : 40;

    const btn = el('button');
    btn.id = FIXED_BTN_ID;
    btn.type = 'button';
    btn.textContent = formatSpeedText(rate);
    updateFixedButtonMetadata(btn);
    ['width', 'height', 'min-width'].forEach((p) =>
      btn.style.setProperty(p, `${size}px`, 'important')
    );
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSettingsModal();
    };
    bar.appendChild(btn);
    return true;
  }

  function handleNavigation() {
    const vId = new URLSearchParams(pageWin.location?.search || '').get('v');
    if (!vId) {
      currentVideoId = '';
      clearTimeout(navApplyTimer);
      clearPendingPlayListener();
      return;
    }
    if (vId !== currentVideoId) {
      currentVideoId = vId;
      isManualOverride = false;
      clearTimeout(navApplyTimer);
      navApplyTimer = setTimeout(applySpeedForCurrentVideo, 350);
    }
    mountRetryTimers.forEach((id) => clearTimeout(id));
    mountRetryTimers = [50, 150, 400, 800, 1500, 2500].map((delay) =>
      setTimeout(mountFixedButton, delay)
    );
  }

  ['yt-navigate-finish', 'yt-page-data-updated', 'popstate', 'load'].forEach((ev) =>
    pageWin.addEventListener(ev, handleNavigation)
  );
  pageWin.addEventListener('fullscreenchange', () => {
    if (!modalState || modalState.backdrop.hidden) return;
    const host = getFullscreenElement() || pageDoc.body || pageDoc.documentElement;
    if (host && modalState.backdrop.parentElement !== host) {
      host.appendChild(modalState.backdrop);
    }
  });

  // ---------------------------------------------------------------------------
  // Settings Modal UI (Trusted Types Safe: DOM APIs Only, Zero innerHTML)
  // ---------------------------------------------------------------------------

  function showFeedback(msg, isError = false) {
    if (!modalState?.feedbackEl) return;
    const fb = modalState.feedbackEl;
    clearTimeout(feedbackTimeout);
    if (!msg) {
      fb.textContent = '';
      fb.classList.remove('is-error');
      fb.hidden = true;
      return;
    }
    fb.textContent = msg;
    fb.classList.toggle('is-error', isError);
    fb.hidden = false;
    feedbackTimeout = setTimeout(() => {
      if (modalState?.feedbackEl) {
        modalState.feedbackEl.textContent = '';
        modalState.feedbackEl.classList.remove('is-error');
        modalState.feedbackEl.hidden = true;
      }
    }, 2600);
  }

  function renderTagList(box, items, emptyText, onRemove) {
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);
    if (!items.length) {
      box.appendChild(el('span', 'ytss-empty', emptyText));
      return;
    }

    const bundle = getLocaleBundle();
    items.forEach((item, idx) => {
      const del = el('button', 'ytss-chip-del', icon(ICONS.close, 12, 1.6));
      del.type = 'button';
      del.setAttribute('aria-label', bundle.actions.removeItem(item));
      del.onclick = (e) => {
        e.stopPropagation();
        onRemove(idx);
      };
      box.appendChild(el('span', 'ytss-chip', el('span', '', item), del));
    });
  }

  function renderTags() {
    if (!modalState) return;
    const bundle = getLocaleBundle();
    renderTagList(modalState.tagGames, config.games, bundle.empty.games, (idx) => {
      config.games.splice(idx, 1);
      saveConfig();
      renderTags();
      isManualOverride = false;
      applySpeedForCurrentVideo();
    });
    renderTagList(modalState.tagChannels, config.channels, bundle.empty.channels, (idx) => {
      config.channels.splice(idx, 1);
      saveConfig();
      renderTags();
      isManualOverride = false;
      applySpeedForCurrentVideo();
    });
  }

  function commitSpeedInput(key, inputEl) {
    const parsed = parseFloat(inputEl.value);
    const nextVal = Number.isFinite(parsed) && parsed > 0
      ? clampSpeed(parsed, config[key])
      : config[key];
    inputEl.value = nextVal.toFixed(2);
    if (nextVal === config[key]) return;

    saveConfig({ [key]: nextVal });
    isManualOverride = false;
    applySpeedForCurrentVideo();
  }

  function commitAllSpeedInputs() {
    if (!modalState) return;
    commitSpeedInput('defaultSpeed', modalState.defaultSpeedInput);
    commitSpeedInput('slowSpeed', modalState.slowSpeedInput);
  }

  function createToggleRow(key, iconPaths, onChange) {
    const input = el('input');
    input.type = 'checkbox';
    input.checked = Boolean(config[key]);
    input.addEventListener('change', () => onChange(input.checked));

    const slider = el('span', 'ytss-switch-slider');
    const switchEl = el('span', 'ytss-switch', input, slider);
    const titleEl = el('span', 'ytss-toggle-title');
    const subEl = el('span', 'ytss-toggle-sub');

    const row = el(
      'label',
      'ytss-toggle-row',
      el(
        'span',
        'ytss-toggle-left',
        el('span', 'ytss-icon-box', icon(iconPaths)),
        el('span', 'ytss-toggle-copy', titleEl, subEl)
      ),
      switchEl
    );

    return { row, input, titleEl, subEl };
  }

  function createLanguageSection() {
    const kicker = el('h3', 'ytss-section-kicker');
    const labelEl = el('span', 'ytss-toggle-title');
    const descEl = el('span', 'ytss-toggle-sub');
    const groupEl = el('div', 'ytss-lang-group');
    groupEl.setAttribute('role', 'radiogroup');

    const langButtons = [];
    for (const opt of LANGUAGE_OPTIONS) {
      const btn = el('button', 'ytss-lang-btn');
      btn.type = 'button';
      btn.setAttribute('role', 'radio');
      if (opt.fixedLabel) btn.textContent = opt.fixedLabel;
      btn.addEventListener('click', () => {
        if (config.language === opt.value) return;
        saveConfig({ language: opt.value });
        refreshSettingsModalUI();
        updateFixedButtonMetadata(pageDoc.getElementById(FIXED_BTN_ID));
      });
      groupEl.appendChild(btn);
      langButtons.push({ value: opt.value, fixedLabel: opt.fixedLabel, btn });
    }

    const section = el(
      'section',
      'ytss-section ytss-section-divider',
      kicker,
      el('div', 'ytss-lang-row', el('div', 'ytss-toggle-copy', labelEl, descEl), groupEl)
    );

    return { section, kicker, labelEl, descEl, groupEl, langButtons };
  }

  function refreshSettingsModalUI() {
    if (!modalState) return;
    const bundle = getLocaleBundle();
    const detected = detectSystemLocale();

    modalState.card.setAttribute('aria-label', bundle.modalTitle);
    modalState.titleEl.textContent = bundle.modalTitle;
    modalState.closeIconBtn.setAttribute('aria-label', bundle.closeLabel);

    modalState.defaultSpeedLabel.textContent = bundle.speed.defaultLabel;
    modalState.slowSpeedLabel.textContent = bundle.speed.slowLabel;
    modalState.defaultSpeedInput.value = config.defaultSpeed.toFixed(2);
    modalState.slowSpeedInput.value = config.slowSpeed.toFixed(2);

    modalState.gamesTitleEl.textContent = bundle.sections.games;
    modalState.btnCurGameText.textContent = bundle.actions.currentGame;
    modalState.gameInput.placeholder = bundle.placeholders.gameName;
    modalState.btnAddGame.textContent = bundle.actions.add;

    modalState.channelsTitleEl.textContent = bundle.sections.channels;
    modalState.btnCurChText.textContent = bundle.actions.currentChannel;

    modalState.optionsKicker.textContent = bundle.sections.options;
    for (const [key, entry] of modalState.toggles.entries()) {
      const copy = bundle.toggles[key];
      entry.titleEl.textContent = copy.label;
      entry.subEl.textContent = copy.description;
      entry.input.checked = Boolean(config[key]);
    }

    modalState.lang.kicker.textContent = bundle.sections.language;
    modalState.lang.labelEl.textContent = bundle.languageRow.label;
    modalState.lang.descEl.textContent = bundle.languageRow.description(detected);
    modalState.lang.groupEl.setAttribute('aria-label', bundle.languageRow.label);
    for (const entry of modalState.lang.langButtons) {
      if (!entry.fixedLabel) entry.btn.textContent = bundle.languageRow.autoOption;
      entry.btn.setAttribute(
        'aria-checked',
        config.language === entry.value ? 'true' : 'false'
      );
    }

    modalState.footerHint.textContent = bundle.footerHint;
    modalState.closeBtn.textContent = bundle.closeLabel;
    renderTags();
  }

  function ensureSettingsModal() {
    if (modalState && modalState.backdrop.isConnected) {
      return modalState;
    }

    ensureStyles();
    const stale = pageDoc.getElementById(MODAL_ID);
    if (stale) stale.remove();

    const makeSpeedCell = (key) => {
      const label = el('label', 'ytss-field-label');
      const input = el('input', 'ytss-number-input');
      Object.assign(input, {
        type: 'number',
        step: '0.25',
        min: String(SPEED_MIN),
        max: String(SPEED_MAX),
        value: config[key].toFixed(2),
      });
      input.addEventListener('change', () => commitSpeedInput(key, input));
      input.addEventListener('blur', () => commitSpeedInput(key, input));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitSpeedInput(key, input);
          input.blur();
        }
      });
      const cell = el(
        'div',
        'ytss-speed-cell',
        label,
        el('div', 'ytss-number-wrap', input, el('span', 'ytss-unit', 'x'))
      );
      return { cell, label, input };
    };

    const defaultCell = makeSpeedCell('defaultSpeed');
    const slowCell = makeSpeedCell('slowSpeed');

    const titleEl = el('h2', 'ytss-title');
    const closeIconBtn = el('button', 'ytss-icon-btn', icon(ICONS.close));
    closeIconBtn.type = 'button';
    closeIconBtn.addEventListener('click', closeSettingsModal);

    const gamesTitleEl = el('span');
    const btnCurGameText = el('span');
    const btnCurGame = el('button', 'ytss-btn-subtle', icon(ICONS.plus, 14), btnCurGameText);
    btnCurGame.type = 'button';

    const gameInput = el('input', 'ytss-text-input');
    const btnAddGame = el('button', 'ytss-btn-secondary');
    btnAddGame.type = 'button';
    const tagGames = el('div', 'ytss-tag-well');

    const addGameName = (rawName, fromCurrentButton = false) => {
      const bundle = getLocaleBundle();
      const name = rawName.trim();
      if (!name) {
        if (fromCurrentButton) showFeedback(bundle.feedback.gameNotFound, true);
        return;
      }
      if (config.games.some((g) => g.trim().toLowerCase() === name.toLowerCase())) {
        showFeedback(bundle.feedback.gameExists(name), true);
        return;
      }
      config.games.push(name);
      saveConfig();
      renderTags();
      if (!fromCurrentButton) gameInput.value = '';
      showFeedback(bundle.feedback.gameAdded(name));
      isManualOverride = false;
      applySpeedForCurrentVideo();
    };

    btnCurGame.addEventListener('click', () => {
      const rawGame = getVideoMeta().officialGame.replace(/[\r\n]+.*$/s, '').trim();
      addGameName(rawGame, true);
    });
    btnAddGame.addEventListener('click', () => addGameName(gameInput.value, false));
    gameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addGameName(gameInput.value, false);
      }
    });

    const channelsTitleEl = el('span');
    const btnCurChText = el('span');
    const btnCurCh = el('button', 'ytss-btn-subtle', icon(ICONS.plus, 14), btnCurChText);
    btnCurCh.type = 'button';
    const tagChannels = el('div', 'ytss-tag-well');

    btnCurCh.addEventListener('click', () => {
      const bundle = getLocaleBundle();
      const name = (getVideoMeta().author || '').trim();
      if (!name) {
        showFeedback(bundle.feedback.channelNotFound, true);
        return;
      }
      if (config.channels.some((c) => c.trim().toLowerCase() === name.toLowerCase())) {
        showFeedback(bundle.feedback.channelExists(name), true);
        return;
      }
      config.channels.push(name);
      saveConfig();
      renderTags();
      showFeedback(bundle.feedback.channelAdded(name));
      isManualOverride = false;
      applySpeedForCurrentVideo();
    });

    const optionsKicker = el('h3', 'ytss-section-kicker');
    const toggles = new Map();
    toggles.set(
      'musicAuto1x',
      createToggleRow('musicAuto1x', ICONS.music, (checked) => {
        saveConfig({ musicAuto1x: checked });
        isManualOverride = false;
        applySpeedForCurrentVideo();
      })
    );
    toggles.set(
      'blockCtrlWheelZoom',
      createToggleRow('blockCtrlWheelZoom', ICONS.zoom, (checked) => {
        saveConfig({ blockCtrlWheelZoom: checked });
      })
    );

    const lang = createLanguageSection();

    const feedbackEl = el('div', 'ytss-feedback');
    feedbackEl.setAttribute('aria-live', 'polite');
    feedbackEl.hidden = true;

    const footerHint = el('span');
    const closeBtn = el('button', 'ytss-btn-close');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', closeSettingsModal);

    const card = el(
      'div',
      'ytss-card',
      el(
        'div',
        'ytss-header',
        el('div', 'ytss-title-wrap', el('span', 'ytss-icon-box', icon(ICONS.gauge)), titleEl),
        closeIconBtn
      ),
      el(
        'div',
        'ytss-body',
        el('div', 'ytss-speed-grid', defaultCell.cell, slowCell.cell),
        el(
          'section',
          'ytss-section',
          el(
            'div',
            'ytss-section-head',
            el(
              'span',
              'ytss-section-label',
              el('span', 'ytss-icon-box', icon(ICONS.gamepad)),
              gamesTitleEl
            ),
            btnCurGame
          ),
          el('div', 'ytss-input-row', gameInput, btnAddGame),
          tagGames
        ),
        el(
          'section',
          'ytss-section',
          el(
            'div',
            'ytss-section-head',
            el(
              'span',
              'ytss-section-label',
              el('span', 'ytss-icon-box', icon(ICONS.tv)),
              channelsTitleEl
            ),
            btnCurCh
          ),
          tagChannels
        ),
        feedbackEl,
        el(
          'section',
          'ytss-section ytss-section-options ytss-section-divider',
          optionsKicker,
          el(
            'div',
            'ytss-toggle-list',
            toggles.get('musicAuto1x').row,
            toggles.get('blockCtrlWheelZoom').row
          )
        ),
        lang.section
      ),
      el(
        'div',
        'ytss-footer',
        el(
          'div',
          'ytss-footer-meta',
          footerHint,
          el(
            'span',
            'ytss-shortcuts',
            el('span', 'ytss-shortcut-item', el('kbd', 'ytss-kbd', 'Shift'), el('kbd', 'ytss-kbd', 'S')),
            el('span', 'ytss-shortcut-item', el('kbd', 'ytss-kbd', 'Ctrl'), el('kbd', 'ytss-kbd', 'Wheel'))
          )
        ),
        closeBtn
      )
    );

    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');

    const backdrop = el('div', '', card);
    backdrop.id = MODAL_ID;
    backdrop.hidden = true;

    const host = getFullscreenElement() || pageDoc.body || pageDoc.documentElement;
    host.appendChild(backdrop);

    backdrop.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSettingsModal();
        }
        e.stopPropagation();
      });
      inp.addEventListener('keyup', (e) => e.stopPropagation());
      inp.addEventListener('keypress', (e) => e.stopPropagation());
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeSettingsModal();
    });
    card.addEventListener('click', (e) => e.stopPropagation());

    modalState = {
      backdrop,
      card,
      titleEl,
      closeIconBtn,
      defaultSpeedLabel: defaultCell.label,
      defaultSpeedInput: defaultCell.input,
      slowSpeedLabel: slowCell.label,
      slowSpeedInput: slowCell.input,
      gamesTitleEl,
      btnCurGameText,
      gameInput,
      btnAddGame,
      tagGames,
      channelsTitleEl,
      btnCurChText,
      tagChannels,
      optionsKicker,
      toggles,
      lang,
      feedbackEl,
      footerHint,
      closeBtn,
    };

    refreshSettingsModalUI();
    return modalState;
  }

  function openSettingsModal() {
    const show = () => {
      const state = ensureSettingsModal();
      const host = getFullscreenElement() || pageDoc.body || pageDoc.documentElement;
      if (host && state.backdrop.parentElement !== host) {
        host.appendChild(state.backdrop);
      }
      refreshSettingsModalUI();
      showFeedback('');
      state.backdrop.hidden = false;
      state.closeIconBtn.focus();
    };

    if (!pageDoc.body && pageDoc.readyState === 'loading') {
      pageDoc.addEventListener('DOMContentLoaded', show, { once: true });
      return;
    }
    show();
  }

  function closeSettingsModal() {
    if (!modalState || modalState.backdrop.hidden) return;
    commitAllSpeedInputs();
    modalState.backdrop.hidden = true;
  }

  function toggleSettingsModal() {
    if (isSettingsModalOpen()) {
      closeSettingsModal();
    } else {
      openSettingsModal();
    }
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  function registerTampermonkeyMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand(getLocaleBundle().menuSettings, openSettingsModal);
  }

  registerTampermonkeyMenu();
  setTimeout(handleNavigation, 400);
})();
