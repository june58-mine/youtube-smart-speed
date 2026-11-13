# YouTube Smart Speed

유튜브 시청 시 **채널·게임·음악** 조건에 따라 재생 배속을 자동으로 전환하고, `Ctrl + 휠`로 배속을 미세 조절할 수 있는 유저스크립트입니다.

## 설치 방법

1. 브라우저에 [Tampermonkey](https://www.tampermonkey.net/) 또는 [Violentmonkey](https://violentmonkey.github.io/)를 설치합니다.
2. 아래 링크를 클릭하면 설치 화면이 바로 열립니다.

👉 **[YouTube Smart Speed 설치하기](https://raw.githubusercontent.com/june58-mine/youtube-smart-speed/main/youtube-smart-speed.user.js)**

## 주요 기능

- **자동 배속 전환**: 일반 영상은 기본 배속(기본값 `1.25x`)으로, 지정한 게임·채널·음악 영상은 지정 배속(기본값 `1.00x`)으로 자동 전환합니다.
- **음악 영상 자동 감지**: YouTube Music, 공식 음원·MV, 믹스 재생목록(`list=RD`) 재생 시 자동으로 지정 배속을 적용합니다.
- **원클릭 채널/게임 등록**: 영상 재생 중에 플레이어 하단 액션 바의 배속 버튼(또는 `Shift + S`)을 눌러 현재 채널·게임을 바로 추가할 수 있습니다.
- **SPA 내비게이션 대응**: 유튜브 내에서 영상을 이동하거나 뒤로가기를 해도 배속 버튼과 상태가 안정적으로 유지됩니다.

## 단축키

| 동작 | 단축키 |
| --- | --- |
| 설정 창 열기 / 닫기 | `Shift` + `S` |
| 배속 올리기 / 내리기 (`0.25x` 단위) | `Ctrl` + `마우스 휠` |
| 설정 창 닫기 | `Esc` |

## 라이선스

[MIT](LICENSE)
