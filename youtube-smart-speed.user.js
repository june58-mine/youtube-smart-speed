// ==UserScript==
// @name         YouTube Smart Speed
// @name:ko      YouTube 스마트 배속
// @name:ja      YouTube スマート倍速
// @name:zh-CN   YouTube 智能倍速
// @namespace    https://github.com/june58-mine/youtube-smart-speed
// @version      1.2.0
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
// @run-at       document-start
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

  function unwrap(obj) {
    try {
      return obj && typeof obj === 'object' && obj.wrappedJSObject ? obj.wrappedJSObject : obj;
    } catch {
      return obj;
    }
  }

  function normalizeBase(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u2018\u2019`’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeCompact(str) {
    return normalizeBase(str).replace(/[^a-z0-9가-힣ぁ-ゔァ-ヴー一-龯]+/g, '');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripTopicSuffix(author) {
    return String(author || '')
      .replace(/\s*[-–—]\s*(?:topic|주제|트픽|トピック|主题|主題|thema|tema|temat)$/i, '')
      .trim();
  }

  const GAME_ALIAS_GROUPS = [
    ['League of Legends', '리그 오브 레전드', '롤', 'LoL', 'リーグ・オブ・レジェンド', '英雄联盟', '英雄聯盟'],
    ['Valorant', '발로란트', '발로', 'ヴァロラント', '无畏契约', '特戰英豪'],
    ['Minecraft', '마인크래프트', '마크', 'マインクラフト', 'マイクラ', '我的世界'],
    ['Genshin Impact', '원신', '原神'],
    ['Honkai: Star Rail', '붕괴: 스타레일', '붕괴 스타레일', '스타레일', '붕스', '崩壊：スターレイル', '崩壊スターレイル', '崩坏：星穹铁道', '崩坏星穹铁道'],
    ['Zenless Zone Zero', '젠레스 존 제로', '젠존제', 'ZZZ', 'ゼンレスゾーンゼロ', 'ゼンゼロ', '绝区零'],
    ['Wuthering Waves', '명조: 워더링 웨이브', '명조 워더링 웨이브', '명조', '鳴潮'],
    ['Blue Archive', '블루 아카이브', '블루아카이브', '블아', 'ブルーアーカイブ', 'ブルアカ', '碧蓝档案'],
    ['Elden Ring', '엘든 링', '엘든링', 'エルデンリング', '艾尔登法环'],
    ['Overwatch', 'Overwatch 2', '오버워치', '오버워치 2', '옵치', 'オーバーウォッチ', 'オーバーウォッチ2', '守望先锋'],
    ['PUBG: BATTLEGROUNDS', 'PUBG', "PLAYERUNKNOWN'S BATTLEGROUNDS", '배틀그라운드', '배그', '絶地求生', '绝地求生'],
    ['Lost Ark', '로스트아크', '로스트 아크', '로아', 'ロストアーク', '命运方舟'],
    ['MapleStory', '메이플스토리', '메이플 스토리', '메이플', 'メイプルストーリー', '冒险岛'],
    ['Dungeon & Fighter', 'Dungeon Fighter Online', 'DFO', '던전앤파이터', '던전 앤 파이터', '던파', 'アラド戦記', '地下城与勇士'],
    ['Eternal Return', '이터널 리턴', '이터널리턴', '이리', 'エターナルリターン', '永恒轮回'],
    ['Counter-Strike 2', 'Counter-Strike', 'CS2', 'CS:GO', 'CSGO', 'CS', '카운터 스트라이크', '카운터스트라이크', '카스', 'カウンターストライク', '反恐精英'],
    ['Dota 2', '도타 2', '도타2', '도타', '刀塔2'],
    ['Apex Legends', '에이펙스 레전드', '에이펙스레전드', '에이펙스', 'エーペックスレジェンズ', 'Apex英雄'],
    ['Fortnite', '포트나이트', 'フォートナイト', '堡垒之夜'],
    ['Roblox', '로블록스', 'ロブロックス', '罗布乐思'],
    ['Grand Theft Auto V', 'Grand Theft Auto 5', 'GTA 5', 'GTA V', 'GTA5', 'GTAV', 'GTA', '그타', '그랜드 테프트 오토 5', '侠盗猎车手5'],
    ['StarCraft', 'StarCraft II', 'StarCraft 2', '스타크래프트', '스타크래프트 2', '스타', 'スタークラフト', '星际争霸'],
    ['Diablo', 'Diablo IV', 'Diablo 4', 'Diablo II', 'Diablo 2', '디아블로', '디아블로 4', '디아블로 2', 'ディアブロ', '暗黑破坏神'],
    ['World of Warcraft', 'WoW', '월드 오브 워크래프트', '와우', 'ワールド・オブ・ウォークラフト', '魔兽世界'],
    ['Hearthstone', '하스스톤', 'ハースストーン', '炉石传说'],
    ['Teamfight Tactics', 'TFT', '전략적 팀 전투', '전략적 팀전투', '롤토체스', '롤체', 'チームファイト タクティクス', '金铲铲之战', '云顶之弈'],
    ['Escape from Tarkov', 'Tarkov', '이스케이프 프롬 타르코프', '타르코프', 'タルコフ', '逃离塔科夫'],
    ['Cyberpunk 2077', '사이버펑크 2077', '사이버펑크', 'サイバーパンク2077', '赛博朋克2077'],
    ["Baldur's Gate 3", "Baldur's Gate", 'Baldurs Gate 3', 'Baldurs Gate', 'BG3', '발더스 게이트 3', '발더스 게이트', '발더스게이트', 'バルダーズ・ゲート3', '博德之门3'],
    ['Monster Hunter', 'Monster Hunter Wilds', 'Monster Hunter: World', 'Monster Hunter Rise', '몬스터 헌터', '몬스터헌터', '몬헌', '몬헌 와일즈', 'モンスターハンター', 'モンハン', '怪物猎人'],
    ['Palworld', '팰월드', '팔월드', 'パルワールド', '幻兽帕鲁'],
    ['Tekken', 'Tekken 8', '철권', '철권 8', '철권8', '鉄拳', '鉄拳8', '铁拳'],
    ['Street Fighter', 'Street Fighter 6', 'SF6', '스트리트 파이터', '스트리트 파이터 6', '스파', '스파6', 'ストリートファイター', 'スト6', '街头霸王'],
    ['Pokemon', '포켓몬스터', '포켓몬', 'ポケモン', 'ポケットモンスター', '宝可梦'],
    ['The Legend of Zelda', 'Zelda', '젤다의 전설', '젤다', 'ゼルダの伝説', 'ゼルダ', '塞尔达传说'],
    ['Super Mario', 'Mario', '슈퍼 마리오', '마리오', 'スーパーマリオ', 'マリオ', '超级马力欧'],
    ['Animal Crossing', '동물의 숲', '동숲', '모여봐요 동물의 숲', '모동숲', 'どうぶつの森', 'あつ森', '动物森友会'],
    ['Splatoon', 'Splatoon 3', '스플래툰', '스플래툰 3', 'スプラトゥーン', 'スプラ3', '斯普拉遁'],
    ['Dark Souls', 'Dark Souls III', 'Dark Souls 3', '다크 소울', '다크 소울 3', '다크소울', 'ダークソウル', '黑暗之魂'],
    ['Sekiro: Shadows Die Twice', 'Sekiro', '세키로', '只狼'],
    ['Hollow Knight', 'Hollow Knight: Silksong', '할로우 나이트', '할로우나이트', '실크송', 'ホロウナイト', '空洞骑士'],
    ['Terraria', '테라리아', 'テラリア', '泰拉瑞亚'],
    ['Stardew Valley', '스타듀 밸리', '스타듀밸리', '스듀', 'スターデューバレー', '星露谷物语'],
    ['Dead by Daylight', 'DBD', '데드 바이 데이라이트', '데바데', 'デッドバイデイライト', '黎明杀机'],
    ['Among Us', '어몽 어스', '어몽어스', 'アモングアス', '在我们之中'],
    ['Lethal Company', '리썰 컴퍼니', '리썰컴퍼니', 'リーサルカンパニー', '致命公司'],
    ['Balatro', '발라트로', 'バラトロ', '小丑牌'],
    ['Slay the Spire', '슬레이 더 스파이어', '슬더스', 'スレイザスパイア', '杀戮尖塔'],
    ['Call of Duty', 'CoD', '콜 오브 듀티', '콜옵', 'コール オブ デューティ', '使命召唤'],
    ['Battlefield', '배틀필드', 'バトルフィールド', '战地'],
    ['EA Sports FC', 'EA SPORTS FC 25', 'EA SPORTS FC 24', 'FIFA', '피파', 'FC 온라인', 'FC Online', '피파 온라인'],
    ['Sudden Attack', '서든어택', '서든 어택', '서든'],
    ['KartRider', 'KartRider: Drift', '카트라이더', '카트라이더: 드리프트', '카트', '跑跑卡丁车'],
    ['Final Fantasy', 'Final Fantasy XIV', 'FF14', 'FF7', '파이널 판타지', '파이널판타지', '파판', '파판14', 'ファイナルファンタジー', '最终幻想'],
    ['Persona', 'Persona 5', 'Persona 3 Reload', '페르소나', '페르소나 5', '페르소나 3', 'ペルソナ', '女神异闻录'],
    ['Yu-Gi-Oh!', 'Yu-Gi-Oh! Master Duel', 'Yu-Gi-Oh', '유희왕', '유희왕 마스터 듀얼', '마듀', '遊戯王', '游戏王'],
    ['Rust', '러스트'],
    ['ARK: Survival Evolved', 'ARK: Survival Ascended', 'ARK', '아크 서바이벌', '아크'],
    ['Path of Exile', 'Path of Exile 2', 'PoE', 'PoE 2', '패스 오브 엑자일', '패스오브엑자일', '패오엑', '포이', 'パス オブ エグザイル', '流放之路'],
    ['Destiny 2', '데스티니 가디언즈', '데스티니 2', 'デスティニー2', '命运2'],
    ['Helldivers 2', 'Helldivers', '헬다이버즈 2', '헬다이버즈', 'ヘルダイバー2', '绝地潜兵2'],
    ['Stellar Blade', '스텔라 블레이드', '스텔라블레이드', 'ステラーブレイド', '剑星'],
    ['Black Myth: Wukong', '검은 신화: 오공', '검은 신화 오공', '黒神話：悟空', '黑神话：悟空'],
    ['GODDESS OF VICTORY: NIKKE', 'NIKKE', '승리의 여신: 니케', '니케', '勝利の女神：NIKKE', '胜利女神：妮姬'],
    ['Umamusume: Pretty Derby', 'Umamusume', '우마무스메 프리티 더비', '우마무스메', '말딸', 'ウマ娘 プリティーダービー', 'ウマ娘', '赛马娘'],
    ['Limbus Company', '림버스 컴퍼니', '림버스컴퍼니', '림버스', 'リンバスカンパニー', '边狱巴士公司'],
    ['Brawl Stars', '브롤스타즈', '브롤 스타즈', 'ブロスタ', '荒野乱斗'],
    ['Clash Royale', '클래시 로얄', '클래시로얄', 'クラロワ', '皇室战争'],
    ['Mabinogi', 'Mabinogi Mobile', '마비노기', '마비노기 모바일', '마비', 'マビノギ', '洛奇'],
    ["Tom Clancy's Rainbow Six Siege", 'Rainbow Six Siege', 'R6', '레인보우 식스 시즈', '레식', 'レインボーシックス シージ'],
    ['Left 4 Dead 2', 'L4D2', '레프트 4 데드 2', '레포데'],
  ];

  const SHORT_AMBIGUOUS_ALIASES = new Set([
    'lol', 'ark', 'rust', 'wow', 'cs', 'tft', 'poe', 'cod', 'fc', 'r6', 'zzz',
    'bg3', 'dbd', 'sf6', 'dfo', '롤', '마크', '스타', '로아', '발로', '이리',
    '스파', '아크', '와우', '서든', '카트', '카스', '마비', '포이', '레식',
    '스듀', '마듀', '말딸', '옵치', '배그', '그타',
  ]);

  const GAME_ALIAS_MAP = new Map();
  for (const group of GAME_ALIAS_GROUPS) {
    const normalizedGroup = Array.from(new Set(group.map((a) => normalizeBase(a)).filter(Boolean)));
    for (const alias of normalizedGroup) {
      GAME_ALIAS_MAP.set(alias, normalizedGroup);
      const compact = normalizeCompact(alias);
      if (compact && compact.length >= 2 && !GAME_ALIAS_MAP.has(compact)) {
        GAME_ALIAS_MAP.set(compact, normalizedGroup);
      }
    }
  }

  function compileBoundaryRegex(norm) {
    if (!norm) return null;
    const parts = norm.split(/[\s\-:]+/).filter(Boolean);
    const body = parts.length > 1 ? parts.map(escapeRegex).join('[\\s\\-:]+') : escapeRegex(norm);
    const first = norm.charAt(0);
    const last = norm.charAt(norm.length - 1);
    const left = /[a-z0-9]/.test(first)
      ? '(?:^|[^a-z0-9])'
      : /[가-힣]/.test(first)
        ? '(?:^|[^가-힣])'
        : '';
    const right = /[a-z0-9]/.test(last)
      ? '(?:$|[^a-z0-9])'
      : /[가-힣]/.test(last)
        ? '(?:$|[^가-힣]|(?:은|는|이|가|을|를|의|에|에서|도|로|으로|과|와|랑|이랑|만|부터|까지)(?:$|[^가-힣]))'
        : '';
    return new RegExp(left + body + right, 'i');
  }

  function compileTermMatcher(term, opts = {}) {
    const norm = normalizeBase(term);
    if (!norm) return null;
    const compact = normalizeCompact(norm);
    const isAmbiguous = Boolean(
      opts.isAmbiguous ||
      SHORT_AMBIGUOUS_ALIASES.has(norm) ||
      norm.length <= 1 ||
      (/^[a-z0-9]+$/.test(norm) && norm.length <= 2)
    );
    const hasNonAscii = /[^a-z0-9\s\-:'!]/.test(norm);
    const allowCompact =
      !isAmbiguous &&
      ((hasNonAscii && compact.length >= 3) || (!hasNonAscii && norm.includes(' ') && compact.length >= 6));
    return {
      norm,
      compact,
      allowCompact,
      exactOnly: norm.length < 2,
      requiresGamingContext: isAmbiguous,
      re: compileBoundaryRegex(norm),
    };
  }

  let compiledRules = { revision: 0, channels: [], games: [], keywords: [] };

  function rebuildCompiledRules() {
    const channels = [];
    for (const raw of config.channels) {
      const norm = normalizeBase(raw);
      if (!norm) continue;
      const coreNorm = normalizeBase(stripTopicSuffix(raw));
      channels.push({
        raw,
        norm,
        coreNorm: coreNorm || norm,
        compact: normalizeCompact(norm),
        re: compileBoundaryRegex(norm),
        coreRe: coreNorm && coreNorm !== norm ? compileBoundaryRegex(coreNorm) : null,
      });
    }

    const games = [];
    for (const raw of config.games) {
      const norm = normalizeBase(raw);
      if (!norm) continue;
      const compact = normalizeCompact(norm);
      const group = GAME_ALIAS_MAP.get(norm) || (compact.length >= 3 ? GAME_ALIAS_MAP.get(compact) : null);
      const aliasStrings = group ? Array.from(new Set([norm, ...group])) : [norm];
      const aliases = [];
      const seenAliases = new Set();
      for (const a of aliasStrings) {
        const m = compileTermMatcher(a);
        if (m && !seenAliases.has(m.norm)) {
          seenAliases.add(m.norm);
          aliases.push(m);
        }
      }
      if (aliases.length) games.push({ raw, norm, aliases });
    }

    const keywords = [];
    for (const raw of config.keywords) {
      const m = compileTermMatcher(raw, { isAmbiguous: false });
      if (m) keywords.push({ raw, ...m });
    }

    compiledRules = {
      revision: compiledRules.revision + 1,
      channels,
      games,
      keywords,
    };
  }

  let config = loadConfig();
  rebuildCompiledRules();
  let registeredWheelPassive = null;

  function saveConfig(nextPartial = null) {
    config = sanitizeConfig(nextPartial ? { ...config, ...nextPartial } : config);
    writeConfigRaw(config);
    rebuildCompiledRules();
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

  const MOUNT_RETRY_DELAYS = [80, 200, 500, 1200];

  let currentVideoId = '';
  let initialPageVideoId = '';
  let isManualOverride = false;
  let toastTimeout = null;
  let feedbackTimeout = null;
  let navApplyTimer = null;
  let mountRetryTimer = null;
  let modalState = null;

  let toastEl = null;
  let toastRateEl = null;
  let toastMetaEl = null;

  let cachedNavData = { videoId: '', playerResponse: null, watchNext: null };
  let lastAppliedState = null;
  let lastEvalKey = '';
  let lastAutoApplyAt = 0;
  let internalRateWriteUntil = 0;
  let startupResetRetries = 0;
  let boundVideo = null;

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
      #${TOAST_ID}.ytss-toast-fixed {
        position: fixed;
        top: 72px;
        left: 50%;
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

  const MUSIC_CATEGORIES = new Set([
    'music', 'musica', 'música', 'musique', 'musik', 'muzyka',
    '음악', '音楽', '音乐', '音樂', 'музыка',
  ]);
  const NON_MUSIC_CATEGORIES = new Set([
    'gaming', '게임', 'ゲーム', '游戏', '遊戲',
    'news & politics', 'science & technology', 'autos & vehicles',
    'sports', 'education', 'howto & style', 'pets & animals',
  ]);
  const GAMING_CATEGORIES = new Set(['gaming', '게임', 'ゲーム', '游戏', '遊戲']);
  const ARTIST_BADGE_LABELS = new Set([
    'official artist channel',
    '공식 아티스트 채널',
    '公式アーティスト チャンネル',
    '公式アーティストチャンネル',
    '官方音乐人频道',
    '官方藝人頻道',
  ]);
  const MUSIC_SECTION_HEADERS = new Set([
    'music', 'musica', 'musique', 'musik', '음악', '音楽', '音乐', '音樂',
  ]);
  const GAME_SECTION_HEADERS = new Set([
    'gaming', 'game', 'games', '게임', 'ゲーム', '游戏', '遊戲',
  ]);

  const TOPIC_AUTHOR_RE = /\s[-–—]\s(?:topic|주제|트픽|トピック|主题|主題|thema|tema|temat)$/i;
  const PROVIDED_TO_YT_RE = /^\s*provided to youtube by\b/i;
  const AUTO_GENERATED_RE = /auto-generated by youtube\.?\s*$/i;
  const GAMING_CONTEXT_RE =
    /(?:^|[^a-z0-9])(?:gameplay|playthrough|walkthrough|speedrun|let'?s\s+play|esports|lck|lpl|lec|lcs|ranked|montage|patch\s+notes|tier\s+list|gaming|gamer|stream\s+vod|boss\s+fight|no\s+hit|no\s+damage)(?:$|[^a-z0-9])|게임|플레이|공략|매드무비|솔랭|칼바람|협곡|챌린저|실황|実況|プレイ動画|ゲーム|攻略|实况|游戏/i;
  const SPEECH_NON_MUSIC_RE =
    /(?:^|[^a-z0-9])(?:react(?:s|ing)?(?:\s+to)?|reaction|review|breakdown|explained|tutorial|lesson|how\s+to\s+play|interview|podcast|vlog|behind\s+the\s+scenes|making\s+(?:of|film)|unboxing|tier\s+list|gameplay|walkthrough|playthrough|let'?s\s+play|speedrun|commentary|highlights|montage|news|debate|talk\s+show|q\s*&\s*a|qna)(?:$|[^a-z0-9])|(?:^|[^가-힣])(?:리액션|반응|리뷰|해석|분석|강좌|강의|레슨|튜토리얼|치는\s*법|부르는\s*법|인터뷰|팟캐스트|브이로그|비하인드|메이킹(?:\s*필름)?|언박싱|티어표|게임\s*플레이|공략|하이라이트|토크|수다|뉴스|소식|근황|예능|코멘터리)(?:$|[^가-힣]|(?:은|는|이|가|을|를|의|에|에서|도|로|으로|과|와|랑|이랑|만|부터|까지)(?:$|[^가-힣]))|リアクション|レビュー|解説|講座|レッスン|インタビュー|ポッドキャスト|メイキング|舞台裏|ゲーム実況|プレイ動画|测评|解析|教程|教学|采访|访谈|播客|幕后|花絮|实况|攻略/i;
  const STRONG_MUSIC_TITLE_RE =
    /(?:^|[^a-z0-9])(?:m\/?v|p\/?v|ost|bgm|lo-?fi|music\s+video|official\s+(?:mv|m\/v|music\s+video|audio|lyric\s+video|visualizer|track\s+video|live\s+clip|performance\s+video|special\s+clip)|lyric\s+video|color\s+coded\s+lyrics|audio\s+only|full\s+album|live\s+clip|live\s+session|tiny\s+desk\s+concert|the\s+first\s+take|killing\s+voice|it'?s\s+live|soundtrack)(?:$|[^a-z0-9])|뮤직\s*비디오|뮤비|공식\s*음원|오피셜\s*비디오|라이브\s*클립|가사\s*영상|가사\s*번역|노래\s*모음|전곡\s*듣기|플레이리스트|노동요|수면\s*음악|자장가|공부할\s*때\s*듣는|카페\s*음악|로파이|킬링보이스|사운드트랙|주제가|브금|官方\s*mv|官方音乐|纯音乐|歌单|歌ってみた|弾いてみた|作業用\s*bgm|歌詞付き/i;
  const OST_BGM_OVERRIDE_RE =
    /(?:^|[^a-z0-9])(?:ost|soundtrack|bgm|theme\s+song)(?:$|[^a-z0-9])|사운드트랙|주제가|브금|作業用\s*bgm|原声带/i;
  const MODERATE_MUSIC_TITLE_RE =
    /(?:^|[^a-z0-9])(?:official\s+video|cover|acoustic|instrumental|inst\.?|remix|nightcore|sped\s+up|slowed(?:\s*\+\s*reverb)?|mashup|medley|piano\s+ver\.?|vocal\s+cover|guitar\s+cover|fancam|encore|playlist|lyrics|feat\.?|ft\.?|prod\.?|mv\s+teaser)(?:$|[^a-z0-9])|커버|어쿠스틱|리믹스|메들리|피아노|직캠|앙코르|플리|가사/i;
  const MUSIC_LABEL_AUTHOR_RE =
    /vevo$|^(?:1thek|stone music entertainment|genie music|super sound bugs|hybe labels|jyp entertainment|smtown|yg entertainment|starship|the first take|dingo music|dingo freestyle|studio choom|it'?s live|colors|npr music|monstercat|nocopyrightsounds|ncs|trap nation|chillhop music|lofi girl|warner music|sony music|universal music|atlantic records|republic records|avex|king records|lantis)\b/i;
  const MUSIC_CREDITS_RE =
    /(?:(?:작사|lyrics?\s*(?:by)?)\s*[:：]?[\s\S]{0,200}(?:작곡|composed?\s*(?:by)?)|(?:작곡|composed?\s*(?:by)?)\s*[:：]?[\s\S]{0,200}(?:편곡|arranged?\s*(?:by)?)|℗\s*\d{4}\b)/i;
  const MUSIC_KEYWORD_SET = new Set([
    'k-pop', 'kpop', 'j-pop', 'jpop', 'music video', 'official audio', 'lyrics',
    'soundtrack', 'ost', 'bgm', 'lofi', 'lo-fi', 'music', 'song', 'mv',
    '음악', '노래', '멜론', '지니', '발라드', '힙합', '인디', '뮤비',
    '앨범', '싱글', '플레이리스트', '가사',
  ]);

  function extractVideoIdFromUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const origin = pageWin.location?.origin || 'https://www.youtube.com';
      const u = new URL(rawUrl, origin);
      const path = u.pathname || '';
      if (path === '/watch') return u.searchParams.get('v') || '';
      const shortsMatch = path.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
      const liveMatch = path.match(/^\/live\/([A-Za-z0-9_-]{11})/);
      if (liveMatch) return liveMatch[1];
      if ((u.hostname || '').includes('music.youtube.com')) {
        return u.searchParams.get('v') || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  function getCurrentVideoId() {
    const loc = pageWin.location;
    const host = loc?.hostname || '';
    const path = loc?.pathname || '';
    const fromUrl = extractVideoIdFromUrl(loc?.href || '');
    if (fromUrl) return fromUrl;

    if (host.includes('music.youtube.com')) {
      const player = unwrap(pageDoc.getElementById('movie_player'));
      const vdId = typeof player?.getVideoData === 'function' ? player.getVideoData()?.video_id : '';
      if (vdId) return vdId;
      const prId = typeof player?.getPlayerResponse === 'function' ? player.getPlayerResponse()?.videoDetails?.videoId : '';
      if (prId) return prId;
    }
    if (path === '/watch' || path.startsWith('/live/') || path.startsWith('/shorts/')) {
      return extractVideoIdFromUrl(path + (loc?.search || ''));
    }
    return '';
  }

  function getActiveWatchVideo() {
    const host = pageWin.location?.hostname || '';
    const path = pageWin.location?.pathname || '';
    const onShorts = path.startsWith('/shorts/');
    const onVideoPage =
      path === '/watch' ||
      path.startsWith('/live/') ||
      onShorts ||
      host.includes('music.youtube.com');
    if (!onVideoPage) return null;

    if (onShorts) {
      return (
        pageDoc.querySelector(
          '#shorts-player video.html5-main-video, ytd-reel-video-renderer[is-active] video, #shorts-player video'
        ) ||
        pageDoc.querySelector('#movie_player video.html5-main-video') ||
        pageDoc.querySelector('video.html5-main-video') ||
        pageDoc.querySelector('video')
      );
    }

    const player = pageDoc.getElementById('movie_player');
    return (
      player?.querySelector('video.html5-main-video') ||
      pageDoc.querySelector('video.html5-main-video') ||
      pageDoc.querySelector('video')
    );
  }

  function isAdShowing() {
    const playerEl = pageDoc.getElementById('movie_player');
    return Boolean(
      playerEl?.classList?.contains('ad-showing') ||
      playerEl?.classList?.contains('ad-interrupting')
    );
  }

  function matchesVid(pr, vid) {
    return Boolean(pr && typeof pr === 'object' && pr.videoDetails && (!vid || pr.videoDetails.videoId === vid));
  }

  function watchNextMatchesVid(data, vid, attrVid = '') {
    if (!data || typeof data !== 'object') return false;
    if (!vid) return true;
    const epVid = data.currentVideoEndpoint?.watchEndpoint?.videoId;
    if (epVid) return epVid === vid;
    if (attrVid) return attrVid === vid;
    return false;
  }

  function readRunsOrSimpleText(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj.simpleText === 'string') return obj.simpleText;
    if (Array.isArray(obj.runs)) return obj.runs.map((r) => r?.text || '').join('');
    if (typeof obj.content === 'string') return obj.content;
    return '';
  }

  function extractAttributeCardDom(cardEl) {
    if (!cardEl) return { title: '', subtitle: '' };
    const linkTitle = cardEl.querySelector('a[aria-label]')?.getAttribute('aria-label')?.trim() || '';
    const titleEl = cardEl.querySelector(
      '.ytVideoAttributeViewModelTitle, .yt-video-attribute-view-model__title, h3, h4'
    );
    const subEl = cardEl.querySelector(
      '.ytVideoAttributeViewModelSubtitle, .yt-video-attribute-view-model__subtitle'
    );
    const title = (titleEl?.textContent || linkTitle || '').trim();
    const subtitle = (subEl?.textContent || '').trim();
    return { title, subtitle };
  }

  function getVideoMeta(expectedVid = '') {
    const vid = expectedVid || getCurrentVideoId();
    let title = '';
    let author = '';
    let channelId = '';
    let category = '';
    let musicVideoType = '';
    let lengthSeconds = 0;
    let isLiveContent = false;
    let keywords = [];
    let shortDescHead = '';
    let shortDescTail = '';
    const officialGames = [];
    const officialGameIds = [];
    const seenGames = new Set();
    const musicCards = [];
    let isVerifiedArtist = false;
    let hasPlayerResponse = false;
    let hasWatchNext = false;

    const pushGame = (rawName, browseId = '') => {
      const cleaned = String(rawName || '').replace(/[\r\n]+.*$/s, '').trim();
      if (!cleaned) return;
      const key = normalizeBase(cleaned);
      if (key && !seenGames.has(key)) {
        seenGames.add(key);
        officialGames.push(cleaned);
      }
      if (browseId && !officialGameIds.includes(browseId)) {
        officialGameIds.push(browseId);
      }
    };

    try {
      const playerEl = pageDoc.getElementById('movie_player');
      const player = unwrap(playerEl);
      const flexyEl = pageDoc.querySelector('ytd-watch-flexy');
      const flexy = unwrap(flexyEl);
      const flexyVidAttr = flexyEl?.getAttribute?.('video-id') || '';
      const winUnwrapped = unwrap(pageWin);

      let pr = null;
      const prCandidates = [
        cachedNavData.videoId === vid ? cachedNavData.playerResponse : null,
        typeof player?.getPlayerResponse === 'function' ? unwrap(player.getPlayerResponse()) : null,
        unwrap(flexy?.playerData),
        unwrap(winUnwrapped?.ytInitialPlayerResponse),
      ];
      for (const cand of prCandidates) {
        if (matchesVid(cand, vid)) {
          pr = cand;
          break;
        }
      }

      if (pr?.videoDetails) {
        hasPlayerResponse = true;
        const vd = pr.videoDetails;
        title = vd.title || '';
        author = (vd.author || '').trim();
        channelId = vd.channelId || '';
        musicVideoType = vd.musicVideoType || '';
        lengthSeconds = Number(vd.lengthSeconds) || 0;
        isLiveContent = Boolean(vd.isLiveContent);
        keywords = Array.isArray(vd.keywords) ? vd.keywords : [];
        const rawDesc = typeof vd.shortDescription === 'string' ? vd.shortDescription : '';
        shortDescHead = rawDesc.slice(0, 1200);
        shortDescTail = rawDesc.length > 300 ? rawDesc.slice(-300) : rawDesc;
        category = pr.microformat?.playerMicroformatRenderer?.category || '';
      }

      let watchNext = null;
      if (cachedNavData.videoId === vid && watchNextMatchesVid(cachedNavData.watchNext, vid, flexyVidAttr)) {
        watchNext = cachedNavData.watchNext;
      } else {
        const flexyData = unwrap(flexy?.data);
        if (watchNextMatchesVid(flexyData, vid, flexyVidAttr)) {
          watchNext = flexyData;
        } else {
          const initialData = unwrap(winUnwrapped?.ytInitialData);
          if (watchNextMatchesVid(initialData, vid, vid && vid === initialPageVideoId ? vid : '')) {
            watchNext = initialData;
          }
        }
      }

      if (watchNext) {
        hasWatchNext = true;
        const primaryResults =
          watchNext.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
        for (const item of primaryResults) {
          if (!item || typeof item !== 'object') continue;
          if (!title && item.videoPrimaryInfoRenderer?.title) {
            title = readRunsOrSimpleText(item.videoPrimaryInfoRenderer.title).trim();
          }
          const sec = item.videoSecondaryInfoRenderer;
          if (sec) {
            const owner = sec.owner?.videoOwnerRenderer;
            if (!author && owner?.title) {
              author = readRunsOrSimpleText(owner.title).trim();
            }
            const badges = Array.isArray(owner?.badges) ? owner.badges : [];
            for (const b of badges) {
              const mbr = b?.metadataBadgeRenderer;
              if (
                mbr?.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' ||
                mbr?.icon?.iconType === 'AUDIO_BADGE'
              ) {
                isVerifiedArtist = true;
                break;
              }
            }
            const rows = sec.metadataRowContainer?.metadataRowContainerRenderer?.rows || [];
            for (const row of rows) {
              const contents = row?.richMetadataRowRenderer?.contents || [];
              for (const cell of contents) {
                const rmr = cell?.richMetadataRenderer;
                if (rmr?.style === 'RICH_METADATA_RENDERER_STYLE_BOX_ART') {
                  pushGame(
                    readRunsOrSimpleText(rmr.title),
                    rmr.endpoint?.browseEndpoint?.browseId || ''
                  );
                }
              }
            }
          }
        }

        const panels = Array.isArray(watchNext.engagementPanels) ? watchNext.engagementPanels : [];
        for (const panel of panels) {
          const sdItems =
            panel?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items;
          if (!Array.isArray(sdItems)) continue;
          for (const entry of sdItems) {
            if (!entry || typeof entry !== 'object') continue;
            const vas = entry.videoAttributesSectionViewModel;
            if (vas) {
              const footerBtn = vas.footerButton?.buttonViewModel;
              const footerIcon = footerBtn?.iconName || '';
              const footerUrl =
                footerBtn?.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url || '';
              const headerNorm = normalizeBase(vas.headerTitle || '');
              const attrItems = Array.isArray(vas.videoAttributeViewModels)
                ? vas.videoAttributeViewModels
                : [];
              const isGameSec =
                footerIcon === 'GAMING_LOGO' ||
                footerUrl === '/gaming' ||
                footerUrl.startsWith('/gaming?') ||
                (GAME_SECTION_HEADERS.has(headerNorm) &&
                  attrItems.some((m) => m?.imageStyle === 'VIDEO_ATTRIBUTE_IMAGE_STYLE_PORTRAIT'));
              const isMusicSec =
                !isGameSec &&
                (footerIcon === 'MUSIC_LOGO' ||
                  footerIcon === 'MUSIC' ||
                  footerUrl.includes('/music') ||
                  MUSIC_SECTION_HEADERS.has(headerNorm) ||
                  attrItems.some((m) => m?.imageStyle === 'VIDEO_ATTRIBUTE_IMAGE_STYLE_SQUARE'));
              if (isGameSec) {
                for (const m of attrItems) {
                  pushGame(m?.title, m?.onTap?.innertubeCommand?.browseEndpoint?.browseId || '');
                }
              } else if (isMusicSec) {
                for (const m of attrItems.slice(0, 10 - musicCards.length)) {
                  musicCards.push({
                    title: String(m?.title || '').trim(),
                    subtitle: String(m?.subtitle || '').trim(),
                    secondarySubtitle: String(m?.secondarySubtitle?.content || '').trim(),
                  });
                }
              }
            }
            const hcl = entry.horizontalCardListRenderer;
            if (hcl) {
              const hdrTitle = normalizeBase(readRunsOrSimpleText(hcl.header?.richListHeaderRenderer?.title));
              const cards = Array.isArray(hcl.cards) ? hcl.cards : [];
              const isMusicList =
                MUSIC_SECTION_HEADERS.has(hdrTitle) ||
                cards.some((c) => c?.videoAttributeViewModel?.imageStyle === 'VIDEO_ATTRIBUTE_IMAGE_STYLE_SQUARE');
              if (isMusicList) {
                for (const c of cards.slice(0, 10 - musicCards.length)) {
                  const m = c?.videoAttributeViewModel;
                  if (m) {
                    musicCards.push({
                      title: String(m.title || '').trim(),
                      subtitle: String(m.subtitle || '').trim(),
                      secondarySubtitle: String(m.secondarySubtitle?.content || '').trim(),
                    });
                  }
                }
              }
            }
          }
        }
      }

      const domIsCurrent = !vid || flexyVidAttr === vid || (!flexyVidAttr && vid === initialPageVideoId);
      if (domIsCurrent) {
        if (!title) {
          const domTitle = pageDoc.querySelector('ytd-watch-metadata h1 yt-formatted-string, ytd-watch-metadata h1');
          title = (domTitle?.textContent || pageDoc.title || '').replace(/\s*-\s*YouTube\s*$/i, '').trim();
        }
        if (!author) {
          const owner = pageDoc.querySelector(
            'ytd-watch-metadata #owner #channel-name #text a, ytd-watch-metadata #owner #channel-name #text, #owner #channel-name #text, #owner #channel-name a'
          );
          if (owner) author = owner.textContent.trim();
        }
        if (!category && !pr && vid === initialPageVideoId) {
          const genre = pageDoc.querySelector('meta[itemprop="genre"]');
          if (genre?.content) category = genre.content.trim();
        }
        if (!isVerifiedArtist) {
          if (
            pageDoc.querySelector(
              'ytd-watch-metadata #owner ytd-badge-supported-renderer .badge-style-type-verified-artist'
            )
          ) {
            isVerifiedArtist = true;
          } else {
            const ownerBadges = pageDoc.querySelectorAll(
              'ytd-watch-metadata #owner ytd-badge-supported-renderer [aria-label]'
            );
            for (const b of ownerBadges) {
              if (ARTIST_BADGE_LABELS.has(normalizeBase(b.getAttribute('aria-label') || ''))) {
                isVerifiedArtist = true;
                break;
              }
            }
          }
        }
        if (!officialGames.length) {
          const sections = pageDoc.querySelectorAll('yt-video-attributes-section-view-model');
          for (const sec of sections) {
            const hasGamingLink = Boolean(sec.querySelector('a[href="/gaming"], a[href*="/gaming"]'));
            const hdr = normalizeBase(
              sec.querySelector('h2, h3, .ytVideoAttributesSectionViewModelHeaderTitle')?.textContent || ''
            );
            if (hasGamingLink || GAME_SECTION_HEADERS.has(hdr)) {
              for (const card of sec.querySelectorAll('yt-video-attribute-view-model')) {
                const extracted = extractAttributeCardDom(card);
                pushGame(extracted.title);
              }
            }
          }
          if (!officialGames.length) {
            const legacyGames = pageDoc.querySelectorAll(
              'ytd-rich-metadata-renderer[role="link"] #title, ytd-rich-metadata-renderer #title'
            );
            for (const elNode of legacyGames) {
              pushGame(elNode.textContent);
            }
          }
        }
        if (!musicCards.length) {
          const hclNodes = pageDoc.querySelectorAll('ytd-horizontal-card-list-renderer');
          for (const hclNode of hclNodes) {
            const hdr = normalizeBase(hclNode.querySelector('#title, h2, h3')?.textContent || '');
            if (!MUSIC_SECTION_HEADERS.has(hdr)) continue;
            for (const card of Array.from(hclNode.querySelectorAll('yt-video-attribute-view-model')).slice(0, 10)) {
              const extracted = extractAttributeCardDom(card);
              if (extracted.title || extracted.subtitle) musicCards.push(extracted);
            }
          }
        }
      }
      if (!title && pageDoc.title && !vid) {
        title = pageDoc.title.replace(/\s*-\s*YouTube\s*$/i, '').trim();
      }
    } catch {
      // Ignore transient DOM/player metadata errors during SPA transitions.
    }

    return {
      videoId: vid,
      hasPlayerResponse,
      hasWatchNext,
      title,
      author,
      channelId,
      category,
      musicVideoType,
      lengthSeconds,
      isLiveContent,
      keywords,
      shortDescHead,
      shortDescTail,
      officialGame: officialGames[0] || '',
      officialGames,
      officialGameIds,
      musicCards,
      isVerifiedArtist,
    };
  }

  function matchTermInText(matcher, normText, compactText) {
    if (!matcher || !normText) return false;
    if (matcher.re && matcher.re.test(normText)) return true;
    if (matcher.allowCompact && compactText && matcher.compact && compactText.includes(matcher.compact)) {
      return true;
    }
    return false;
  }

  function matchChannel(meta) {
    if (!compiledRules.channels.length || !meta.author) return null;
    const authorNorm = normalizeBase(meta.author);
    const authorCore = normalizeBase(stripTopicSuffix(meta.author));
    for (const ch of compiledRules.channels) {
      if (
        authorNorm === ch.norm ||
        authorCore === ch.norm ||
        (ch.coreNorm && authorCore === ch.coreNorm) ||
        (ch.re && ch.re.test(authorNorm)) ||
        (ch.coreRe && ch.coreRe.test(authorCore))
      ) {
        return ch;
      }
    }
    return null;
  }

  function matchGame(meta) {
    if (!compiledRules.games.length) return null;

    const officialNorms = meta.officialGames.map((g) => ({
      norm: normalizeBase(g),
      compact: normalizeCompact(g),
    }));

    // Pass 1: Official YouTube game card match (exact or boundary across expanded aliases)
    if (officialNorms.length) {
      for (const g of compiledRules.games) {
        for (const og of officialNorms) {
          for (const alias of g.aliases) {
            if (
              og.norm === alias.norm ||
              (alias.compact.length >= 2 && og.compact === alias.compact) ||
              (!alias.exactOnly && alias.re && alias.re.test(og.norm))
            ) {
              return g;
            }
          }
        }
      }
    }

    // Pass 2: Title, keywords, and description hashtags with boundary & gaming-context guards
    const titleNorm = normalizeBase(meta.title);
    const titleCompact = normalizeCompact(titleNorm);
    const keywordsNorm = meta.keywords.length ? normalizeBase(meta.keywords.join(' | ')) : '';
    const keywordsCompact = keywordsNorm ? normalizeCompact(keywordsNorm) : '';
    const hashtagMatches = meta.shortDescHead ? meta.shortDescHead.match(/#[^\s#]+/g) : null;
    const hashtagsNorm = hashtagMatches
      ? normalizeBase(hashtagMatches.map((h) => h.slice(1)).join(' '))
      : '';
    const hashtagsCompact = hashtagsNorm ? normalizeCompact(hashtagsNorm) : '';

    const catNorm = normalizeBase(meta.category);
    const hasGamingContext =
      meta.officialGames.length > 0 ||
      GAMING_CATEGORIES.has(catNorm) ||
      GAMING_CONTEXT_RE.test(titleNorm) ||
      (keywordsNorm && GAMING_CONTEXT_RE.test(keywordsNorm));

    for (const g of compiledRules.games) {
      for (const alias of g.aliases) {
        if (alias.exactOnly) continue;
        if (alias.requiresGamingContext && !hasGamingContext) continue;
        if (
          matchTermInText(alias, titleNorm, titleCompact) ||
          matchTermInText(alias, keywordsNorm, keywordsCompact) ||
          matchTermInText(alias, hashtagsNorm, hashtagsCompact)
        ) {
          return g;
        }
      }
    }

    return null;
  }

  function detectMusic(meta) {
    const mType = meta.musicVideoType || '';
    if (mType.startsWith('MUSIC_VIDEO_TYPE_')) return true;

    const titleNorm = normalizeBase(meta.title);
    const authorNorm = normalizeBase(meta.author);
    const catNorm = normalizeBase(meta.category);
    const isSpeechNonMusic = SPEECH_NON_MUSIC_RE.test(titleNorm);
    const hasStrongMusicTitle = STRONG_MUSIC_TITLE_RE.test(titleNorm);

    if (TOPIC_AUTHOR_RE.test(meta.author)) return true;
    if (
      meta.shortDescHead &&
      PROVIDED_TO_YT_RE.test(meta.shortDescHead) &&
      (AUTO_GENERATED_RE.test(meta.shortDescTail) ||
        /released on:\s*\d{4}-\d{2}-\d{2}/i.test(meta.shortDescHead))
    ) {
      return true;
    }

    if (MUSIC_CATEGORIES.has(catNorm)) {
      return !(isSpeechNonMusic && !hasStrongMusicTitle);
    }

    if (isSpeechNonMusic) return false;
    const hasNonMusicContext =
      (meta.officialGames.length > 0 || NON_MUSIC_CATEGORIES.has(catNorm)) &&
      !OST_BGM_OVERRIDE_RE.test(titleNorm);
    if (hasNonMusicContext) return false;

    let score = 0;
    const hasModerateTitle = !hasStrongMusicTitle && MODERATE_MUSIC_TITLE_RE.test(titleNorm);
    if (hasStrongMusicTitle) score += 3;
    else if (hasModerateTitle) score += 2;

    if (meta.isVerifiedArtist) score += 2;
    if (MUSIC_LABEL_AUTHOR_RE.test(authorNorm)) score += 2;

    if (meta.musicCards.length > 0) {
      const titleCompact = normalizeCompact(titleNorm);
      const authorCore = normalizeBase(stripTopicSuffix(meta.author));
      let matchedCard = false;
      let matchedArtist = false;

      for (const card of meta.musicCards) {
        const cTitleNorm = normalizeBase(card.title);
        const cTitleCompact = normalizeCompact(cTitleNorm);
        const cSubNorm = normalizeBase(card.subtitle);
        if (cTitleNorm.length >= 2) {
          const isShortAscii = /^[a-z0-9\s]+$/.test(cTitleNorm) && cTitleNorm.length <= 4;
          const titleHit = isShortAscii
            ? Boolean(compileBoundaryRegex(cTitleNorm)?.test(titleNorm))
            : titleNorm.includes(cTitleNorm) ||
              (cTitleCompact.length >= 3 && titleCompact.includes(cTitleCompact));
          if (titleHit) {
            matchedCard = true;
            break;
          }
        }
        if (cSubNorm.length >= 2) {
          const isShortArtist = /^[a-z0-9\s]+$/.test(cSubNorm) && cSubNorm.length <= 4;
          const artistHit = isShortArtist
            ? Boolean(
                compileBoundaryRegex(cSubNorm)?.test(titleNorm) ||
                compileBoundaryRegex(cSubNorm)?.test(authorCore)
              )
            : titleNorm.includes(cSubNorm) ||
              authorCore === cSubNorm ||
              authorCore.includes(cSubNorm);
          if (artistHit) matchedArtist = true;
        }
      }

      if (matchedCard) {
        score += 3;
      } else if (
        matchedArtist &&
        (meta.musicCards.length === 1 || (meta.lengthSeconds > 0 && meta.lengthSeconds <= 600))
      ) {
        score += 2;
      } else if (
        meta.musicCards.length >= 3 &&
        (hasStrongMusicTitle || hasModerateTitle || meta.lengthSeconds >= 900)
      ) {
        score += 3;
      }
    }

    if (meta.shortDescHead && MUSIC_CREDITS_RE.test(meta.shortDescHead)) score += 2;

    if (meta.keywords.length) {
      let kwHits = 0;
      for (const kw of meta.keywords) {
        const kNorm = normalizeBase(kw);
        if (MUSIC_KEYWORD_SET.has(kNorm)) {
          kwHits += 1;
          if (kwHits >= 2) break;
        }
      }
      if (kwHits >= 2) score += 1;
    }

    return score >= 3;
  }

  function isMusicUrlContext() {
    const host = pageWin.location?.hostname || '';
    const search = pageWin.location?.search || '';
    if (host.includes('music.youtube.com')) return true;
    try {
      const list = new URLSearchParams(search).get('list');
      return Boolean(list && list.startsWith('RD'));
    } catch {
      return search.includes('list=RD');
    }
  }

  function checkSlowCondition(metaInput = null) {
    const bundle = getLocaleBundle();

    if (config.musicAuto1x && isMusicUrlContext()) {
      return { isSlow: true, label: bundle.toast.music, kind: 'music', definitive: true };
    }

    const meta = metaInput || getVideoMeta(getCurrentVideoId());

    const matchedChannel = matchChannel(meta);
    if (matchedChannel) {
      return {
        isSlow: true,
        label: bundle.toast.channel(matchedChannel.raw),
        kind: 'channel',
        definitive: true,
      };
    }

    const matchedGame = matchGame(meta);
    if (matchedGame) {
      return {
        isSlow: true,
        label: bundle.toast.game(matchedGame.raw),
        kind: 'game',
        definitive: true,
      };
    }

    if (config.musicAuto1x && detectMusic(meta)) {
      return { isSlow: true, label: bundle.toast.music, kind: 'music', definitive: true };
    }

    if (compiledRules.keywords.length && meta.title) {
      const titleNorm = normalizeBase(meta.title);
      const titleCompact = normalizeCompact(titleNorm);
      for (const kw of compiledRules.keywords) {
        if (matchTermInText(kw, titleNorm, titleCompact)) {
          return { isSlow: true, label: kw.raw, kind: 'keyword', definitive: true };
        }
      }
    }

    return { isSlow: false, label: '', kind: 'default', definitive: false };
  }

  // ---------------------------------------------------------------------------
  // Speed Application & Toast Notification
  // ---------------------------------------------------------------------------

  function resolveToastHost() {
    const fsEl = getFullscreenElement();
    const path = pageWin.location?.pathname || '';
    const onShorts = path.startsWith('/shorts/');
    if (fsEl) {
      const fsPlayer = fsEl.id === 'movie_player' ? fsEl : fsEl.querySelector?.('#movie_player');
      if (fsPlayer && fsPlayer.offsetWidth !== 0) return { container: fsPlayer, fixed: false };
      return { container: fsEl, fixed: true };
    }
    if (onShorts) {
      const shortsHost =
        pageDoc.getElementById('shorts-player') ||
        pageDoc.querySelector('ytd-reel-video-renderer[is-active]');
      if (shortsHost && shortsHost.offsetWidth !== 0) {
        return { container: shortsHost, fixed: false };
      }
    } else {
      const player = pageDoc.getElementById('movie_player');
      if (player && player.offsetWidth !== 0 && (player.offsetWidth === undefined || player.offsetWidth >= 120)) {
        return { container: player, fixed: false };
      }
    }
    const body = pageDoc.body || pageDoc.documentElement;
    return body ? { container: body, fixed: true } : null;
  }

  function showToast(speedText, reason = '') {
    ensureStyles();
    const target = resolveToastHost();
    if (!target) return;

    if (!toastEl || !toastEl.isConnected && !pageDoc.contains(toastEl)) {
      toastEl = pageDoc.getElementById(TOAST_ID);
      if (toastEl) {
        toastRateEl = toastEl.querySelector('.ytss-toast-rate');
        toastMetaEl = toastEl.querySelector('.ytss-toast-meta');
      }
    }
    if (!toastEl) {
      toastRateEl = el('span', 'ytss-toast-rate');
      toastMetaEl = el('span', 'ytss-toast-meta');
      toastEl = el('div', '', toastRateEl, toastMetaEl);
      toastEl.id = TOAST_ID;
    }
    if (toastEl.parentElement !== target.container) {
      target.container.appendChild(toastEl);
    }

    toastEl.classList.toggle('ytss-toast-fixed', target.fixed);
    toastRateEl.textContent = speedText;
    toastMetaEl.textContent = reason;
    toastMetaEl.style.display = reason ? 'inline' : 'none';
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl?.classList.remove('is-visible'), 1100);
  }

  function setSpeed(rate, manual = false) {
    const video = getActiveWatchVideo() || pageDoc.querySelector('video.html5-main-video, video');
    if (!video) return;

    const normalized = clampSpeed(rate, config.defaultSpeed);
    internalRateWriteUntil = performance.now() + 250;

    const player = unwrap(pageDoc.getElementById('movie_player'));
    if (player && typeof player.setPlaybackRate === 'function') {
      try {
        const curPlayerRate =
          typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : -1;
        if (Math.abs(curPlayerRate - normalized) > 0.005) {
          player.setPlaybackRate(normalized);
        }
      } catch {
        // Ignore player API mismatches when custom wrappers restrict calls.
      }
    }

    if (Math.abs(video.playbackRate - normalized) > 0.005) {
      video.playbackRate = normalized;
    }

    const btn = pageDoc.getElementById(FIXED_BTN_ID);
    const speedLabel = formatSpeedText(normalized);
    if (btn && btn.textContent !== speedLabel) {
      btn.textContent = speedLabel;
    }

    if (manual) {
      isManualOverride = true;
      showToast(`${normalized.toFixed(2)}x`);
    }
  }

  function handleVideoMediaEvent() {
    const vid = getCurrentVideoId();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if ((!vid && !isYtMusic) || isManualOverride) return;
    if (lastAppliedState && lastAppliedState.videoId === vid) {
      const video = getActiveWatchVideo();
      if (video && Math.abs(video.playbackRate - lastAppliedState.rate) > 0.005 && !isAdShowing()) {
        setSpeed(lastAppliedState.rate, false);
      }
      return;
    }
    evaluateAndApply({ trigger: 'media' });
  }

  function handleVideoRateChange(e) {
    const video = e.currentTarget;
    if (!video || performance.now() < internalRateWriteUntil) return;
    const vid = getCurrentVideoId();
    if (!vid) return;

    if (!isManualOverride && lastAppliedState && lastAppliedState.videoId === vid) {
      if (Math.abs(video.playbackRate - lastAppliedState.rate) <= 0.005) return;
      const elapsed = performance.now() - lastAutoApplyAt;
      const isDefaultReset = Math.abs(video.playbackRate - 1) < 0.005;
      const withinStartupGrace =
        (elapsed < 1000 && video.currentTime < 0.5) ||
        (isDefaultReset && (elapsed < 1800 || video.currentTime < 1.2));
      if (withinStartupGrace && startupResetRetries < 4 && !isAdShowing()) {
        startupResetRetries += 1;
        setSpeed(lastAppliedState.rate, false);
        return;
      }
      isManualOverride = true;
    }

    const btn = pageDoc.getElementById(FIXED_BTN_ID);
    const label = formatSpeedText(video.playbackRate);
    if (btn && btn.textContent !== label) {
      btn.textContent = label;
    }
  }

  function bindVideoGuards(video) {
    if (!video || boundVideo === video) return;
    if (boundVideo) {
      boundVideo.removeEventListener('loadedmetadata', handleVideoMediaEvent);
      boundVideo.removeEventListener('play', handleVideoMediaEvent);
      boundVideo.removeEventListener('playing', handleVideoMediaEvent);
      boundVideo.removeEventListener('ratechange', handleVideoRateChange);
    }
    boundVideo = video;
    video.addEventListener('loadedmetadata', handleVideoMediaEvent);
    video.addEventListener('play', handleVideoMediaEvent);
    video.addEventListener('playing', handleVideoMediaEvent);
    video.addEventListener('ratechange', handleVideoRateChange);
  }

  function evaluateAndApply({ trigger = '', force = false, showToastOnSame = false } = {}) {
    const vid = getCurrentVideoId();
    const video = getActiveWatchVideo();
    if (!video) return false;
    bindVideoGuards(video);

    if (isManualOverride && !force) return false;

    if (!force && vid && trigger === 'nav-start' && config.musicAuto1x && isMusicUrlContext()) {
      const bundle = getLocaleBundle();
      const target = config.slowSpeed;
      const isFirst = !lastAppliedState || lastAppliedState.videoId !== vid;
      const changed = isFirst || Math.abs(lastAppliedState.rate - target) > 0.005 || lastAppliedState.label !== bundle.toast.music;
      setSpeed(target, false);
      lastAppliedState = { videoId: vid, rate: target, isSlow: true, label: bundle.toast.music, kind: 'music', definitive: true };
      lastEvalKey = `${vid}|url-music|${compiledRules.revision}`;
      lastAutoApplyAt = performance.now();
      startupResetRetries = 0;
      if (changed || showToastOnSame) showToast(`${target.toFixed(2)}x`, bundle.toast.music);
      return true;
    }

    const meta = getVideoMeta(vid);
    if (!force && vid && !meta.hasPlayerResponse && !meta.hasWatchNext && trigger === 'nav-start') {
      return false;
    }

    const evalKey = `${vid}|${meta.hasPlayerResponse ? 1 : 0}|${meta.hasWatchNext ? 1 : 0}|${meta.officialGames.length}|${meta.musicCards.length}|${meta.isVerifiedArtist ? 1 : 0}|${meta.author.length}|${meta.title.length}|${compiledRules.revision}`;
    if (!force && evalKey === lastEvalKey && lastAppliedState?.videoId === vid) {
      if (Math.abs(video.playbackRate - lastAppliedState.rate) > 0.005 && !isAdShowing()) {
        setSpeed(lastAppliedState.rate, false);
      }
      return true;
    }

    let cond = checkSlowCondition(meta);
    if (
      !force &&
      lastAppliedState?.videoId === vid &&
      lastAppliedState.definitive &&
      !cond.isSlow
    ) {
      lastEvalKey = evalKey;
      if (Math.abs(video.playbackRate - lastAppliedState.rate) > 0.005 && !isAdShowing()) {
        setSpeed(lastAppliedState.rate, false);
      }
      return true;
    }

    const target = cond.isSlow ? config.slowSpeed : config.defaultSpeed;
    const isFirstApply = !lastAppliedState || lastAppliedState.videoId !== vid;
    const changedDecision =
      isFirstApply ||
      Math.abs(lastAppliedState.rate - target) > 0.005 ||
      lastAppliedState.label !== cond.label;

    setSpeed(target, false);
    lastAppliedState = {
      videoId: vid,
      rate: target,
      isSlow: cond.isSlow,
      label: cond.label,
      kind: cond.kind,
      definitive: cond.definitive,
    };
    lastEvalKey = evalKey;
    lastAutoApplyAt = performance.now();
    startupResetRetries = 0;

    if (changedDecision || showToastOnSame) {
      showToast(`${target.toFixed(2)}x`, cond.isSlow ? cond.label : '');
    }
    return true;
  }

  function applySpeedForCurrentVideo() {
    evaluateAndApply({ trigger: 'manual-reapply', force: true, showToastOnSame: true });
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
    if (btn.title !== tooltip) btn.title = tooltip;
    if (btn.getAttribute('aria-label') !== tooltip) btn.setAttribute('aria-label', tooltip);
  }

  function mountFixedButton() {
    ensureStyles();
    const bar = pageDoc.querySelector(
      'ytd-watch-metadata #actions #top-level-buttons-computed, #top-row #actions #top-level-buttons-computed'
    );
    if (!bar) return false;

    const vid = getCurrentVideoId();
    const video = getActiveWatchVideo();
    const rate =
      lastAppliedState?.videoId === vid
        ? lastAppliedState.rate
        : video
          ? video.playbackRate
          : config.defaultSpeed;
    const speedLabel = formatSpeedText(rate);

    const existing = bar.querySelector(`#${FIXED_BTN_ID}`);
    if (existing) {
      if (existing.textContent !== speedLabel) existing.textContent = speedLabel;
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
    btn.textContent = speedLabel;
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

  function cancelMountRetry() {
    clearTimeout(mountRetryTimer);
    mountRetryTimer = null;
  }

  function scheduleMountFixedButton(confirmAfterRender = false) {
    cancelMountRetry();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if (!getCurrentVideoId() || isYtMusic) return;
    const mountedNow = mountFixedButton();
    if (mountedNow && !confirmAfterRender) return;
    const delays = mountedNow ? [350, 1000] : MOUNT_RETRY_DELAYS;
    let step = 0;
    const tick = () => {
      mountRetryTimer = null;
      if (!getCurrentVideoId()) return;
      const ok = mountFixedButton();
      if (ok && (!mountedNow || step >= delays.length)) return;
      if (step < delays.length) {
        mountRetryTimer = setTimeout(tick, delays[step++]);
      }
    };
    mountRetryTimer = setTimeout(tick, delays[step++]);
  }

  function resetVideoSession(nextVid) {
    if (initialPageVideoId && nextVid !== initialPageVideoId) {
      initialPageVideoId = '';
    }
    currentVideoId = nextVid;
    isManualOverride = false;
    lastAppliedState = null;
    lastEvalKey = '';
    cachedNavData = { videoId: '', playerResponse: null, watchNext: null };
    clearTimeout(navApplyTimer);
    navApplyTimer = null;
  }

  function handleNavigateStart(e) {
    const detail = unwrap(unwrap(e)?.detail);
    const targetUrl =
      detail?.url ||
      detail?.endpoint?.commandMetadata?.webCommandMetadata?.url ||
      pageWin.location?.href ||
      '';
    const nextVid = extractVideoIdFromUrl(targetUrl) || getCurrentVideoId();
    if (nextVid !== currentVideoId) {
      resetVideoSession(nextVid);
      if (nextVid) {
        const applied = evaluateAndApply({ trigger: 'nav-start' });
        if (!applied) {
          navApplyTimer = setTimeout(() => {
            navApplyTimer = null;
            evaluateAndApply({ trigger: 'nav-fallback' });
          }, 250);
        }
      }
    }
  }

  function handlePlayerUpdated() {
    clearTimeout(navApplyTimer);
    navApplyTimer = null;
    const vid = getCurrentVideoId();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if (!vid && !isYtMusic) return;
    if (vid !== currentVideoId) {
      resetVideoSession(vid);
    }
    evaluateAndApply({ trigger: 'player-updated' });
  }

  function handleNavigateFinish(e) {
    clearTimeout(navApplyTimer);
    navApplyTimer = null;
    const vid = getCurrentVideoId();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if (!vid && !(isYtMusic && getActiveWatchVideo())) {
      resetVideoSession('');
      cancelMountRetry();
      return;
    }
    if (vid !== currentVideoId) {
      resetVideoSession(vid);
    }

    const detail = unwrap(unwrap(e)?.detail);
    const resp = unwrap(detail?.response);
    const pr = unwrap(resp?.playerResponse);
    const wn = unwrap(resp?.response);
    if (pr || wn) {
      cachedNavData = {
        videoId: vid,
        playerResponse: matchesVid(pr, vid)
          ? pr
          : cachedNavData.videoId === vid
            ? cachedNavData.playerResponse
            : null,
        watchNext:
          wn && watchNextMatchesVid(wn, vid)
            ? wn
            : cachedNavData.videoId === vid
              ? cachedNavData.watchNext
              : null,
      };
    }

    evaluateAndApply({ trigger: 'navigate-finish' });
    scheduleMountFixedButton(true);
  }

  function handleNavigation() {
    const vid = getCurrentVideoId();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if (!vid && !(isYtMusic && getActiveWatchVideo())) {
      resetVideoSession('');
      cancelMountRetry();
      return;
    }
    if (vid !== currentVideoId) {
      resetVideoSession(vid);
    }
    evaluateAndApply({ trigger: 'page-data' });
    scheduleMountFixedButton(true);
  }

  function handleEarlyMedia(e) {
    const t = e.target;
    if (!t || (t.tagName || '').toUpperCase() !== 'VIDEO') return;
    const vid = getCurrentVideoId();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if (!vid && !isYtMusic) return;
    if (t === getActiveWatchVideo()) {
      if (vid !== currentVideoId) {
        resetVideoSession(vid);
      }
      bindVideoGuards(t);
      evaluateAndApply({ trigger: 'early-media' });
    }
  }

  pageWin.addEventListener('yt-navigate-start', handleNavigateStart);
  pageWin.addEventListener('yt-player-updated', handlePlayerUpdated);
  pageWin.addEventListener('yt-navigate-finish', handleNavigateFinish);
  ['yt-page-data-updated', 'popstate', 'load'].forEach((ev) =>
    pageWin.addEventListener(ev, handleNavigation)
  );
  pageDoc.addEventListener('loadedmetadata', handleEarlyMedia, true);
  pageDoc.addEventListener('play', handleEarlyMedia, true);
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
      const rawGame = getVideoMeta(getCurrentVideoId()).officialGame.replace(/[\r\n]+.*$/s, '').trim();
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
      const name = (getVideoMeta(getCurrentVideoId()).author || '').trim();
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

  function bootstrapOnDomReady() {
    const vid = getCurrentVideoId();
    const isYtMusic = (pageWin.location?.hostname || '').includes('music.youtube.com');
    if (!initialPageVideoId && vid) initialPageVideoId = vid;
    if (vid || (isYtMusic && getActiveWatchVideo())) {
      if (vid !== currentVideoId) currentVideoId = vid;
      evaluateAndApply({ trigger: 'init' });
      scheduleMountFixedButton();
    }
  }

  registerTampermonkeyMenu();
  initialPageVideoId = extractVideoIdFromUrl(pageWin.location?.href || '');
  if (pageDoc.readyState === 'loading') {
    pageDoc.addEventListener('DOMContentLoaded', bootstrapOnDomReady, { once: true });
  } else {
    bootstrapOnDomReady();
  }
})();
