// ==UserScript==
// @name         YouTube Smart Speed
// @name:ko      YouTube 스마트 배속
// @namespace    https://github.com/june58-mine/youtube-smart-speed
// @version      1.0.0
// @description  Automatically switches YouTube playback speed by channel, game, and music, with Ctrl+Wheel fine control.
// @description:ko 채널·게임·음악 조건에 따라 유튜브 재생 배속을 자동으로 전환하고, Ctrl+휠로 미세 조절합니다.
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
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    if (window.top !== window) return;

    // 1. 설정 및 상태 관리
    const STORAGE_KEY = 'yt_smart_speed_v52';
    const DEFAULT_CONFIG = {
        defaultSpeed: 1.25,
        slowSpeed: 1.00,
        speedStep: 0.25,
        musicAuto1x: true,
        games: [],
        channels: [],
        keywords: []
    };

    let config = Object.assign({}, DEFAULT_CONFIG);
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
    } catch (e) {}

    if (Array.isArray(config.channels)) {
        const seen = new Set();
        config.channels = config.channels.reduce((acc, ch) => {
            if (typeof ch !== 'string') return acc;
            let name = ch.trim();
            const m = name.match(/^(.+?)[\r\n]+\s*\1$/s);
            if (m) name = m[1].trim();
            const key = name.toLowerCase();
            if (name && !seen.has(key)) { seen.add(key); acc.push(name); }
            return acc;
        }, []);
    }

    const saveConfig = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) {} };
    const formatSpeedText = (rate) => {
        if (rate === 1) return '1.00x';
        const str = rate.toFixed(2);
        return (str.endsWith('0') && !str.endsWith('.00') ? str.slice(0, -1) : str) + 'x';
    };

    let currentVideoId = '', isManualOverride = false, toastTimeout = null, feedbackTimeout = null;
    let dInput, sInput, musicToggle, feedbackEl;

    // 2. 스타일 및 아이콘 헬퍼
    const ICONS = {
        gauge: ['M12 14l4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
        close: ['M18 6 6 18', 'M6 6l12 12'],
        plus: ['M5 12h14', 'M12 5v14'],
        gamepad: ['M6 11h4M8 9v4M15 12h.01M18 10h.01', 'M17.32 5H6.68a4 4 0 0 0-3.98 3.59L2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3l-.69-7.41A4 4 0 0 0 17.32 5z'],
        tv: ['M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z', 'M17 2l-5 5-5-5'],
        music: ['M9 18V5l12-2v13', 'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']
    };

    function el(tag, cls, ...children) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        children.forEach(c => c != null && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        return node;
    }

    function icon(paths, size = 16, sw = 1.5) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        Object.entries({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })
            .forEach(([k, v]) => svg.setAttribute(k, String(v)));
        svg.style.cssText = 'display:block;flex-shrink:0;';
        paths.forEach(d => { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.appendChild(p); });
        return svg;
    }

    function ensureStyles() {
        if (document.getElementById('yt-smart-speed-styles')) return;
        const style = document.createElement('style');
        style.id = 'yt-smart-speed-styles';
        style.textContent = `
            #yt-smart-speed-fixed-btn{border-radius:50%!important;background:rgba(255,255,255,.1)!important;color:#ededed!important;border:none!important;padding:0!important;font:500 12px/1 Roboto,-apple-system,sans-serif!important;font-variant-numeric:tabular-nums!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:8px!important;user-select:none!important;flex-shrink:0!important;vertical-align:middle!important;box-sizing:border-box!important;transition:background-color 140ms cubic-bezier(.22,1,.36,1),transform 140ms cubic-bezier(.22,1,.36,1)!important}
            #yt-smart-speed-fixed-btn:hover{background:rgba(255,255,255,.18)!important}
            #yt-smart-speed-fixed-btn:active{transform:scale(.97)!important}
            #yt-smart-speed-fixed-btn:focus-visible{outline:2px solid rgba(229,72,77,.75)!important;outline-offset:2px!important}
            #yt-speed-smart-toast{position:absolute;top:16%;left:50%;transform:translate(-50%,6px);opacity:0;display:inline-flex;align-items:center;gap:8px;background:rgba(20,20,21,.92);border:1px solid rgba(237,237,237,.1);color:#ededed;padding:8px 16px;border-radius:8px;font:400 14px/20px Inter,-apple-system,Roboto,sans-serif;z-index:999999;pointer-events:none;transition:opacity 160ms cubic-bezier(.22,1,.36,1),transform 160ms cubic-bezier(.22,1,.36,1)}
            #yt-speed-smart-toast.is-visible{opacity:1;transform:translate(-50%,0)}
            .ytss-toast-rate{font-weight:500;font-variant-numeric:tabular-nums;color:#ededed}
            .ytss-toast-meta{color:#a1a1a6;font-size:13px}
            #yt-speed-settings-modal{position:fixed;inset:0;background:rgba(10,10,11,.72);display:none;align-items:center;justify-content:center;z-index:2147483647;font-family:Inter,-apple-system,Roboto,sans-serif;color:#ededed;padding:16px;box-sizing:border-box}
            #yt-speed-settings-modal.is-open{display:flex}
            #yt-speed-settings-modal *{box-sizing:border-box}
            @keyframes ytss-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
            .ytss-card{width:440px;max-width:100%;max-height:88vh;overflow-y:auto;background:#19191b;border:1px solid rgba(237,237,237,.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:16px;box-shadow:0 16px 40px rgba(0,0,0,.55);animation:ytss-enter 200ms cubic-bezier(.22,1,.36,1)}
            .ytss-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid rgba(237,237,237,.08)}
            .ytss-title-wrap{display:flex;align-items:center;gap:8px}
            .ytss-icon-box{color:#85858b;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px}
            .ytss-title{margin:0;font:500 15px/20px inherit;color:#ededed}
            .ytss-icon-btn{width:28px;height:28px;border-radius:6px;border:none;background:transparent;color:#85858b;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background-color 140ms cubic-bezier(.22,1,.36,1),color 140ms cubic-bezier(.22,1,.36,1)}
            .ytss-icon-btn:hover{background:#232325;color:#ededed}
            .ytss-speed-grid{background:#141415;border:1px solid rgba(237,237,237,.08);border-radius:12px;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
            .ytss-speed-cell{display:flex;flex-direction:column;gap:8px}
            .ytss-field-label{font-size:12px;line-height:16px;color:#a1a1a6}
            .ytss-number-wrap{height:36px;background:#232325;border:1px solid rgba(237,237,237,.08);border-radius:8px;padding:0 12px;display:flex;align-items:center;gap:4px;transition:border-color 140ms cubic-bezier(.22,1,.36,1),box-shadow 140ms cubic-bezier(.22,1,.36,1)}
            .ytss-number-wrap:focus-within,.ytss-text-input:focus{border-color:rgba(229,72,77,.7);box-shadow:0 0 0 2px rgba(229,72,77,.2)}
            .ytss-number-input{width:100%;background:transparent;border:none;outline:none;color:#ededed;font:500 14px/20px inherit;font-variant-numeric:tabular-nums;padding:0}
            .ytss-unit{font-size:13px;color:#85858b;user-select:none}
            .ytss-section{display:flex;flex-direction:column;gap:8px}
            .ytss-section-head{display:flex;align-items:center;justify-content:space-between;min-height:28px}
            .ytss-section-label{display:inline-flex;align-items:center;gap:8px;font:500 13px/20px inherit;color:#ededed}
            .ytss-btn-subtle{height:28px;padding:0 8px;border-radius:6px;background:#232325;border:1px solid rgba(237,237,237,.08);color:#ededed;font:400 12px/16px inherit;display:inline-flex;align-items:center;gap:4px;cursor:pointer;transition:background-color 140ms cubic-bezier(.22,1,.36,1),border-color 140ms cubic-bezier(.22,1,.36,1),transform 120ms cubic-bezier(.22,1,.36,1)}
            .ytss-btn-subtle:hover,.ytss-btn-secondary:hover{background:#2c2c2f;border-color:rgba(237,237,237,.14)}
            .ytss-btn-subtle:active,.ytss-btn-secondary:active,.ytss-btn-primary:active{transform:scale(.98)}
            .ytss-btn-subtle svg{color:#a1a1a6}
            .ytss-input-row{display:flex;gap:8px}
            .ytss-text-input{flex:1;height:36px;background:#232325;border:1px solid rgba(237,237,237,.08);border-radius:8px;padding:0 12px;color:#ededed;font:400 13px/20px inherit;outline:none;transition:border-color 140ms cubic-bezier(.22,1,.36,1),box-shadow 140ms cubic-bezier(.22,1,.36,1)}
            .ytss-text-input::placeholder{color:#85858b}
            .ytss-btn-secondary{height:36px;padding:0 16px;border-radius:8px;background:#232325;border:1px solid rgba(237,237,237,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.06);color:#ededed;font:500 13px/20px inherit;cursor:pointer;transition:background-color 140ms cubic-bezier(.22,1,.36,1),border-color 140ms cubic-bezier(.22,1,.36,1),transform 120ms cubic-bezier(.22,1,.36,1)}
            .ytss-tag-well{background:#0f0f10;border:1px solid rgba(237,237,237,.08);border-radius:10px;padding:8px;min-height:44px;max-height:96px;overflow-y:auto;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
            .ytss-empty{font-size:12px;line-height:16px;color:#85858b;padding:0 4px}
            .ytss-chip{height:28px;padding:0 8px;border-radius:6px;background:#232325;border:1px solid rgba(237,237,237,.08);color:#ededed;font-size:12px;line-height:16px;display:inline-flex;align-items:center;gap:4px}
            .ytss-chip-del{width:16px;height:16px;padding:0;border:none;border-radius:4px;background:transparent;color:#85858b;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:color 140ms cubic-bezier(.22,1,.36,1),background-color 140ms cubic-bezier(.22,1,.36,1)}
            .ytss-chip-del:hover{color:#ededed;background:rgba(237,237,237,.08)}
            .ytss-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid rgba(237,237,237,.08)}
            .ytss-toggle-left{display:flex;align-items:flex-start;gap:8px}
            .ytss-toggle-left .ytss-icon-box{margin-top:2px}
            .ytss-toggle-copy{display:flex;flex-direction:column;gap:2px}
            .ytss-toggle-title{font:500 13px/20px inherit;color:#ededed}
            .ytss-toggle-sub{font-size:12px;line-height:16px;color:#85858b}
            .ytss-switch{position:relative;display:inline-flex;align-items:center;cursor:pointer;flex-shrink:0}
            .ytss-switch input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
            .ytss-switch-track{width:36px;height:20px;border-radius:10px;background:#232325;border:1px solid rgba(237,237,237,.12);position:relative;transition:background-color 160ms cubic-bezier(.22,1,.36,1),border-color 160ms cubic-bezier(.22,1,.36,1)}
            .ytss-switch-thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#a1a1a6;transition:transform 160ms cubic-bezier(.22,1,.36,1),background-color 160ms cubic-bezier(.22,1,.36,1)}
            .ytss-switch input:checked+.ytss-switch-track{background:#e5484d;border-color:#e5484d}
            .ytss-switch input:checked+.ytss-switch-track .ytss-switch-thumb{transform:translateX(16px);background:#ededed}
            .ytss-switch input:focus-visible+.ytss-switch-track,.ytss-icon-btn:focus-visible,.ytss-btn-subtle:focus-visible,.ytss-btn-secondary:focus-visible,.ytss-btn-primary:focus-visible{outline:2px solid rgba(229,72,77,.65);outline-offset:2px}
            .ytss-feedback{min-height:16px;font-size:12px;line-height:16px;color:#a1a1a6}
            .ytss-feedback.is-error{color:#e5484d}
            .ytss-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid rgba(237,237,237,.08)}
            .ytss-shortcuts{display:flex;align-items:center;gap:12px}
            .ytss-shortcut-item{display:inline-flex;align-items:center;gap:4px}
            .ytss-kbd{display:inline-flex;align-items:center;padding:2px 6px;border-radius:4px;background:#232325;border:1px solid rgba(237,237,237,.12);box-shadow:inset 0 -1px 0 rgba(0,0,0,.4);color:#a1a1a6;font:400 11px/14px 'JetBrains Mono',ui-monospace,Consolas,monospace}
            .ytss-btn-primary{height:36px;padding:0 20px;border-radius:8px;border:none;background:#ededed;color:#141415;font:500 13px/20px inherit;cursor:pointer;transition:background-color 140ms cubic-bezier(.22,1,.36,1),transform 120ms cubic-bezier(.22,1,.36,1)}
            .ytss-btn-primary:hover{background:#fff}
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // 3. 영상 메타데이터 파싱
    function getVideoMeta() {
        let title = '', author = '', officialGame = '', keywords = [], isOfficialMusic = false;
        try {
            const vid = new URLSearchParams(window.location.search).get('v');
            const player = document.getElementById('movie_player');
            const pr = (player && typeof player.getPlayerResponse === 'function')
                ? player.getPlayerResponse()
                : (document.querySelector('ytd-watch-flexy')?.playerData || window.ytInitialPlayerResponse);

            if (pr?.videoDetails && (!vid || !pr.videoDetails.videoId || pr.videoDetails.videoId === vid)) {
                title = pr.videoDetails.title || '';
                author = (pr.videoDetails.author || '').trim();
                keywords = pr.videoDetails.keywords || [];
            }
            if (!title) title = document.title || '';
            if (!author) {
                const owner = document.querySelector('ytd-watch-metadata #owner #channel-name #text a, ytd-watch-metadata #owner #channel-name #text, #owner #channel-name #text, #owner #channel-name a');
                if (owner) author = owner.textContent.trim();
            }
            const gameEl = document.querySelector('ytd-rich-metadata-renderer[role="link"] #title');
            if (gameEl) officialGame = gameEl.textContent.trim();

            const cat = pr?.microformat?.playerMicroformatRenderer?.category;
            const mType = pr?.videoDetails?.musicVideoType;
            const genre = document.querySelector('meta[itemprop="genre"]');
            isOfficialMusic = (cat && cat.toLowerCase() === 'music') ||
                              mType === 'MUSIC_VIDEO_TYPE_OMV' || mType === 'MUSIC_VIDEO_TYPE_ATV' ||
                              (genre?.content && genre.content.toLowerCase() === 'music');
        } catch (e) {}
        return { title, author, officialGame, keywords, isOfficialMusic };
    }

    // 4. 배속 조건 판별
    function check1xCondition() {
        if (config.musicAuto1x && (location.hostname.includes('music.youtube.com') || location.search.includes('list=RD'))) {
            return { is1x: true, label: '음악' };
        }
        const meta = getVideoMeta();
        const lAuthor = meta.author.toLowerCase(), lTitle = meta.title.toLowerCase(), lGame = meta.officialGame.toLowerCase();

        for (const ch of config.channels) {
            const t = ch.trim().toLowerCase();
            if (t && lAuthor.includes(t)) return { is1x: true, label: `채널 · ${ch}` };
        }
        for (const g of config.games) {
            const t = g.trim().toLowerCase();
            if (t && (lGame.includes(t) || lTitle.includes(t) || meta.keywords.some(k => k.toLowerCase().includes(t)))) {
                return { is1x: true, label: `게임 · ${g}` };
            }
        }
        if (config.musicAuto1x && meta.isOfficialMusic) return { is1x: true, label: '음악' };
        for (const kw of config.keywords) {
            const t = kw.trim().toLowerCase();
            if (t && lTitle.includes(t)) return { is1x: true, label: kw };
        }
        return { is1x: false, label: '' };
    }

    // 5. 배속 적용 및 토스트 알림
    function showToast(speedText, reason = '') {
        ensureStyles();
        const container = document.getElementById('movie_player') || document.body;
        let toast = document.getElementById('yt-speed-smart-toast');
        if (!toast) {
            toast = el('div', '', el('span', 'ytss-toast-rate'), el('span', 'ytss-toast-meta'));
            toast.id = 'yt-speed-smart-toast';
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
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        if (!video) return;
        rate = Math.round(Math.min(Math.max(rate, 0.25), 4.00) * 4) / 4;
        if (video.playbackRate !== rate) video.playbackRate = rate;

        const player = document.getElementById('movie_player');
        if (player && typeof player.setPlaybackRate === 'function') {
            try { player.setPlaybackRate(rate); } catch (e) {}
        }
        const btn = document.getElementById('yt-smart-speed-fixed-btn');
        if (btn) btn.textContent = formatSpeedText(rate);
        if (manual) { isManualOverride = true; showToast(`${rate.toFixed(2)}x`); }
    }

    function applySpeedForCurrentVideo() {
        if (isManualOverride) return;
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        if (!video) return;
        const cond = check1xCondition();
        const target = cond.is1x ? config.slowSpeed : config.defaultSpeed;
        setSpeed(target, false);
        showToast(`${target.toFixed(2)}x`, cond.is1x ? cond.label : '');
        video.addEventListener('play', () => {
            if (!isManualOverride && Math.abs(video.playbackRate - target) > 0.01) setSpeed(target, false);
        }, { once: true });
    }

    // 6. 단축키 및 Ctrl+휠 제어
    window.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault(); e.stopPropagation();
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        if (video) setSpeed(video.playbackRate + (e.deltaY < 0 ? 1 : -1) * config.speedStep, true);
    }, { passive: false, capture: true });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('yt-speed-settings-modal')?.classList.contains('is-open')) {
            e.preventDefault(); e.stopPropagation(); closeModal(); return;
        }
        const t = e.target, tag = t?.tagName ? t.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || t?.isContentEditable) return;
        if (e.shiftKey && (e.code === 'KeyS' || e.key === 'S' || e.key === 's')) {
            e.preventDefault(); e.stopPropagation(); toggleModal();
        }
    }, true);

    // 7. 플레이어 버튼 장착 및 SPA 라우팅
    function mountFixedButton() {
        ensureStyles();
        const bar = document.querySelector('ytd-watch-metadata #actions #top-level-buttons-computed, #top-row #actions #top-level-buttons-computed');
        if (!bar) return false;

        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        const rate = video ? video.playbackRate : config.defaultSpeed;
        const existing = bar.querySelector('#yt-smart-speed-fixed-btn');
        if (existing) { existing.textContent = formatSpeedText(rate); return true; }

        document.querySelectorAll('#yt-smart-speed-fixed-btn').forEach(n => n.remove());
        const neighbor = bar.querySelector('button, yt-button-shape');
        const size = (neighbor && neighbor.offsetHeight >= 32 && neighbor.offsetHeight <= 46) ? neighbor.offsetHeight : 40;

        const btn = el('button');
        btn.id = 'yt-smart-speed-fixed-btn';
        btn.title = '스마트 배속 설정 (Shift+S)';
        btn.textContent = formatSpeedText(rate);
        ['width', 'height', 'min-width'].forEach(p => btn.style.setProperty(p, `${size}px`, 'important'));
        btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleModal(); };
        bar.appendChild(btn);
        return true;
    }

    function handleNavigation() {
        const vId = new URLSearchParams(window.location.search).get('v');
        if (!vId) { currentVideoId = ''; return; }
        if (vId !== currentVideoId) {
            currentVideoId = vId;
            isManualOverride = false;
            setTimeout(applySpeedForCurrentVideo, 350);
        }
        [50, 150, 400, 800, 1500, 2500].forEach(d => setTimeout(mountFixedButton, d));
    }

    ['yt-navigate-finish', 'yt-page-data-updated', 'popstate', 'load'].forEach(ev => window.addEventListener(ev, handleNavigation));
    setTimeout(handleNavigation, 400);

    // 8. 설정 모달 UI
    function showFeedback(msg, isError = false) {
        if (!feedbackEl) return;
        feedbackEl.textContent = msg;
        feedbackEl.classList.toggle('is-error', isError);
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => {
            if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.classList.remove('is-error'); }
        }, 2400);
    }

    function createModalDOM() {
        ensureStyles();
        let modal = document.getElementById('yt-speed-settings-modal');
        if (modal) return modal;

        const mkSpeed = (label, min, max, val) => {
            const inp = el('input', 'ytss-number-input');
            Object.assign(inp, { type: 'number', step: '0.25', min, max, value: val });
            return { cell: el('div', 'ytss-speed-cell', el('label', 'ytss-field-label', label), el('div', 'ytss-number-wrap', inp, el('span', 'ytss-unit', 'x'))), inp };
        };

        const dF = mkSpeed('기본 배속', '0.5', '3.0', config.defaultSpeed);
        const sF = mkSpeed('지정·음악 배속', '0.5', '2.0', config.slowSpeed);
        dInput = dF.inp; sInput = sF.inp;

        const closeBtn = el('button', 'ytss-icon-btn', icon(ICONS.close));
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', '닫기');
        closeBtn.onclick = closeModal;

        const btnCurGame = el('button', 'ytss-btn-subtle', icon(ICONS.plus, 14), '현재 게임');
        btnCurGame.type = 'button';
        btnCurGame.onclick = () => {
            const gName = getVideoMeta().officialGame.replace(/게임/g, '').trim();
            if (!gName) return showFeedback('현재 영상에서 게임 태그를 찾지 못했습니다', true);
            if (config.games.some(g => g.trim().toLowerCase() === gName.toLowerCase())) return showFeedback(`이미 등록된 게임입니다 · ${gName}`);
            config.games.push(gName); saveConfig(); renderTags();
            showFeedback(`게임 추가됨 · ${gName}`);
        };

        const gameInput = el('input', 'ytss-text-input');
        gameInput.placeholder = '게임 이름';
        const addGame = () => {
            const val = gameInput.value.trim();
            if (!val) return;
            if (config.games.some(g => g.trim().toLowerCase() === val.toLowerCase())) return showFeedback(`이미 등록된 게임입니다 · ${val}`);
            config.games.push(val); saveConfig(); gameInput.value = ''; renderTags();
            showFeedback(`게임 추가됨 · ${val}`);
        };
        const btnAddGame = el('button', 'ytss-btn-secondary', '추가');
        btnAddGame.type = 'button'; btnAddGame.onclick = addGame;
        gameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addGame(); } });

        const tagGames = el('div', 'ytss-tag-well'); tagGames.id = 'tag-container-games';

        const btnCurCh = el('button', 'ytss-btn-subtle', icon(ICONS.plus, 14), '현재 채널');
        btnCurCh.type = 'button';
        btnCurCh.onclick = () => {
            const name = (getVideoMeta().author || '').trim();
            if (!name) return showFeedback('현재 영상에서 채널명을 찾지 못했습니다', true);
            if (config.channels.some(c => c.trim().toLowerCase() === name.toLowerCase())) return showFeedback(`이미 등록된 채널입니다 · ${name}`);
            config.channels.push(name); saveConfig(); renderTags();
            showFeedback(`채널 추가됨 · ${name}`);
        };
        const tagCh = el('div', 'ytss-tag-well'); tagCh.id = 'tag-container-channels';

        musicToggle = el('input'); musicToggle.type = 'checkbox'; musicToggle.checked = config.musicAuto1x;
        const switchEl = el('label', 'ytss-switch', musicToggle, el('span', 'ytss-switch-track', el('span', 'ytss-switch-thumb')));

        feedbackEl = el('div', 'ytss-feedback');
        feedbackEl.setAttribute('aria-live', 'polite');

        const btnSave = el('button', 'ytss-btn-primary', '저장');
        btnSave.type = 'button';
        btnSave.onclick = () => {
            config.defaultSpeed = parseFloat(dInput.value) || 1.25;
            config.slowSpeed = parseFloat(sInput.value) || 1.00;
            config.musicAuto1x = musicToggle.checked;
            saveConfig(); closeModal(); applySpeedForCurrentVideo();
        };

        const card = el('div', 'ytss-card',
            el('div', 'ytss-header',
                el('div', 'ytss-title-wrap', el('span', 'ytss-icon-box', icon(ICONS.gauge)), el('h2', 'ytss-title', '스마트 배속 설정')),
                closeBtn
            ),
            el('div', 'ytss-speed-grid', dF.cell, sF.cell),
            el('div', 'ytss-section',
                el('div', 'ytss-section-head', el('span', 'ytss-section-label', el('span', 'ytss-icon-box', icon(ICONS.gamepad)), '지정 게임'), btnCurGame),
                el('div', 'ytss-input-row', gameInput, btnAddGame),
                tagGames
            ),
            el('div', 'ytss-section',
                el('div', 'ytss-section-head', el('span', 'ytss-section-label', el('span', 'ytss-icon-box', icon(ICONS.tv)), '지정 채널'), btnCurCh),
                tagCh
            ),
            el('div', 'ytss-toggle-row',
                el('div', 'ytss-toggle-left',
                    el('span', 'ytss-icon-box', icon(ICONS.music)),
                    el('div', 'ytss-toggle-copy', el('span', 'ytss-toggle-title', '음악 영상 자동 감속'), el('span', 'ytss-toggle-sub', '공식 음원·MV·YouTube Music 재생 시 적용'))
                ),
                switchEl
            ),
            feedbackEl,
            el('div', 'ytss-footer',
                el('div', 'ytss-shortcuts',
                    el('span', 'ytss-shortcut-item', el('kbd', 'ytss-kbd', 'Shift'), el('kbd', 'ytss-kbd', 'S')),
                    el('span', 'ytss-shortcut-item', el('kbd', 'ytss-kbd', 'Ctrl'), el('kbd', 'ytss-kbd', 'Wheel'))
                ),
                btnSave
            )
        );

        modal = el('div', '', card);
        modal.id = 'yt-speed-settings-modal';
        document.body.appendChild(modal);

        modal.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } e.stopPropagation(); });
            inp.addEventListener('keyup', e => e.stopPropagation());
            inp.addEventListener('keypress', e => e.stopPropagation());
        });
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        card.onclick = (e) => e.stopPropagation();
        return modal;
    }

    function renderTagList(id, items, emptyText, onRemove) {
        const box = document.getElementById(id);
        if (!box) return;
        while (box.firstChild) box.removeChild(box.firstChild);
        if (!items.length) return void box.appendChild(el('span', 'ytss-empty', emptyText));

        items.forEach((item, idx) => {
            const del = el('button', 'ytss-chip-del', icon(ICONS.close, 12, 1.6));
            del.type = 'button';
            del.setAttribute('aria-label', `${item} 삭제`);
            del.onclick = (e) => { e.stopPropagation(); onRemove(idx); };
            box.appendChild(el('span', 'ytss-chip', el('span', '', item), del));
        });
    }

    function renderTags() {
        renderTagList('tag-container-games', config.games, '등록된 게임 없음', (i) => { config.games.splice(i, 1); saveConfig(); renderTags(); });
        renderTagList('tag-container-channels', config.channels, '등록된 채널 없음', (i) => { config.channels.splice(i, 1); saveConfig(); renderTags(); });
    }

    function toggleModal() {
        const modal = createModalDOM();
        if (modal.classList.contains('is-open')) return closeModal();
        dInput.value = config.defaultSpeed;
        sInput.value = config.slowSpeed;
        musicToggle.checked = config.musicAuto1x;
        if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.classList.remove('is-error'); }
        renderTags();
        modal.classList.add('is-open');
    }

    function closeModal() {
        document.getElementById('yt-speed-settings-modal')?.classList.remove('is-open');
    }
})();
