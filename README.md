<div align="center">

**🇺🇸 English** · [🇰🇷 한국어](./README.ko.md) · [🇯🇵 日本語](./README.ja.md) · [🇨🇳 简体中文](./README.zh-CN.md)

# YouTube Smart Speed

A userscript that automatically switches YouTube playback speed by channel, game, and music, with `Ctrl + Wheel` fine control and optional browser zoom blocking.

<p>
  <img src="https://img.shields.io/badge/version-1.2.0-19191b?style=flat-square&labelColor=0f0f10" alt="Version 1.2.0" />
  <img src="https://img.shields.io/badge/license-MIT-19191b?style=flat-square&labelColor=0f0f10" alt="MIT License" />
  <img src="https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey-19191b?style=flat-square&labelColor=0f0f10" alt="Tampermonkey and Violentmonkey" />
</p>

</div>

## Preview

<div align="center">
  <p><strong>Player Action Bar Button</strong></p>
  <img src="./assets/button-preview.png" alt="YouTube Smart Speed button integrated into the player action bar" width="420" />
  <br /><br />
  <p><strong>Settings Modal (Dark Theme)</strong></p>
  <img src="./assets/settings-modal-en.png" alt="YouTube Smart Speed settings modal (dark theme)" width="440" />
</div>

## Features

### Smart Speed Rules

- **Instant conditional speed switching**: Uses your default speed (`1.25x` by default) for regular videos and switches immediately at playback start to your designated speed (`1.00x` by default) for registered games, channels, or music across watch, live, Shorts, and YouTube Music pages.
- **One-click channel & game registration**: Click `+ Current game` or `+ Current channel` while watching a video to add it immediately, with built-in cross-language game alias matching (EN/KO/JA/ZH) and word-boundary guards to avoid false positives.
- **Auto-slow for music** (`Default: ON`): Automatically applies the slow speed on YouTube Music, Mix playlists (`list=RD`), Topic tracks, Official Artist Channels, music attribution cards, and official MVs/audio—even when uploaded under `Entertainment`.

### Ctrl+Wheel Control

- **Fine manual adjustment**: Scroll with `Ctrl + Wheel` on watch, live, Shorts, and YouTube Music pages to step playback speed by `0.25x`. Manual changes stay active until the video changes.
- **Block browser zoom on Ctrl+Wheel** (`Default: OFF`): When off, both browser zoom and video speed adjust together. Turn it on to block browser zoom so `Ctrl + Wheel` changes only video playback speed.

### Settings & Language

- Open settings from the **player action bar button** (`1.25x`), the **Settings** command in your userscript manager menu, or <kbd>Shift</kbd> + <kbd>S</kbd>. All changes save and apply automatically.
- Matches YouTube's light and dark themes automatically and stays visible inside fullscreen.
- Picks English, Korean, Japanese, or Chinese from your browser language (defaulting to English for other languages), with live switching between `System`, `English`, `한국어`, `日本語`, and `中文`.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) in your browser.
2. Click **Install UserScript** below and confirm the prompt:

   <p>
     <a href="https://raw.githubusercontent.com/june58-mine/youtube-smart-speed/main/youtube-smart-speed.user.js">
       <img src="https://img.shields.io/badge/Install_UserScript-v1.2.0-e5484d?style=for-the-badge&logo=youtube&logoColor=white" alt="Install UserScript v1.2.0" />
     </a>
   </p>

3. Reload YouTube, then open **Settings** from the action bar button, your extension menu, or <kbd>Shift</kbd> + <kbd>S</kbd>.

<details>
<summary>Manual installation and updates</summary>

- If the one-click install prompt does not open, copy [`youtube-smart-speed.user.js`](./youtube-smart-speed.user.js) and paste it into a new script in your userscript manager.
- Updates are handled automatically through `@updateURL` and `@downloadURL`.

</details>

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Open / close settings | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Increase / decrease speed (`0.25x` step) | <kbd>Ctrl</kbd> + <kbd>Wheel</kbd> |
| Close settings | <kbd>Esc</kbd> |

## Technical & Compatibility Notes

- Stores preferences via `GM_getValue` and `GM_setValue` (with `localStorage` fallback) and migrates `v1.0.0` `localStorage` data automatically, sharing settings between `www.youtube.com` and `music.youtube.com`.
- Runs from `@run-at document-start` and reacts immediately to `yt-player-updated`, `yt-navigate-finish`, and early media events with video-ID-validated `playerResponse` / `watchNext` inspection (supporting Firefox XrayWrappers and DOM fallbacks).
- Precompiles channel/game matchers at config save and reads YouTube's modern `videoAttributesSectionViewModel` and `horizontalCardListRenderer` metadata directly without polling or heavy DOM observers.
- Builds styles and UI elements exclusively with DOM APIs and `textContent` without `innerHTML`, complying with YouTube's Trusted Types CSP.

## License

Released under the [MIT License](./LICENSE).
