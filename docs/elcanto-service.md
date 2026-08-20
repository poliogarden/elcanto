# elcanto — 서비스 & UI/UX 개요

> **Many voices. One understanding.**  
> 같은 주제의 YouTube 영상 여러 개를 한꺼번에 읽고, 비교하고, 하나의 이해로 합성하는 지식 합성 스튜디오.

---

## 목차

1. [서비스 한 줄 정의](#1-서비스-한-줄-정의)
2. [핵심 가치](#2-핵심-가치)
3. [사용자 여정](#3-사용자-여정)
4. [페이지별 기능](#4-페이지별-기능)
5. [UI/UX 디자인 시스템](#5-uiux-디자인-시스템)
6. [페이지별 UI/UX 상세](#6-페이지별-uiux-상세)
7. [인터랙션 패턴](#7-인터랙션-패턴)
8. [모바일 UX](#8-모바일-ux)
9. [로딩·상태 UI](#9-로딩상태-ui)
10. [용어 통일](#10-용어-통일)
11. [인증·데이터](#11-인증데이터)
12. [현재 한계](#12-현재-한계)

---

## 1. 서비스 한 줄 정의

**elcanto**는 여러 YouTube 영상을 개별 요약하는 도구가 아니라, 영상들 *사이*에서만 보이는 패턴·합의·충돌·새로운 통찰을 뽑아 **하나의 합성 문서**로 정리해 주는 서비스입니다.

```
영상 선택 → 자막 읽기·분석 → 목소리 간 비교 → 합성 문서 → 질문·편집·스토리
```

---

## 2. 핵심 가치

| 기존 방식 | elcanto |
|-----------|---------|
| 영상 10개 → 요약 10개 | 영상 N개 → 이해 1개 |
| 각 영상을 따로 이해 | 영상 *사이*의 관계를 이해 |
| 시청 시간 = 이해 시간 | 읽기·비교·합성으로 압축 |
| 개별 영상에 질문 | 전체 합성에 질문 |

**Fourth Idea (Emergent Insight)**  
여러 영상을 같이 봐야만 드러나는 네 번째 이해. 서비스의 핵심 결과물.

---

## 3. 사용자 여정

```
/ (홈)
  └─ 01 CHOOSE THE VOICES — YouTube 영상 선택
  └─ 02 BRING THEM TOGETHER — 관계 캔버스 + 합성 방향 설정
       └─ SYNTHESIZE N VOICES →

/synthesize/[id] (합성 진행)
  └─ Phase 1: Analyzing — 영상별 자막·주장 추출
  └─ Phase 2: Synthesizing — 전체 합성 + Insight Map
       └─ 자동 이동 →

/synthesis/[id] (결과)
  └─ SEE WHAT EMERGES — 핵심 통찰
  └─ REASONING MAP — 관계 그래프
  └─ ASK THESE VOICES — 질문
  └─ (선택) Compose / Story / Archive 저장

/compose/[id] — 영상 타임라인 편집·보내기
/story/[id] — 숏폼 내러티브 생성
/archive — 저장된 합성 목록
/personal — 개인 YouTube 취향 분석
/about — 서비스 소개
```

---

## 4. 페이지별 기능

### 4.1 홈 (`/`)

#### 01 CHOOSE THE VOICES
YouTube 영상을 **Voice(목소리)** 로 추가.

**영상 추가 방법**
- **Search** — 키워드 검색
- **Recent / Likes / Playlists / Channels** — Google + YouTube 로그인 후
- **URL·플레이리스트 붙여넣기** — 링크 여러 개 한 번에
- **샘플 영상** — 데모용 (선택 불가, 예시 표시)

**제한**
- 합성 최소 **2개** 영상
- 플레이리스트 일괄 추가 **최대 20개**

#### 02 BRING THEM TOGETHER
2개 이상 선택 시 활성화.

- **Voice Relationship Canvas** — 선택한 목소리들이 중앙 허브(✦)로 연결되는 시각화
- **WHAT SHOULD WE LOOK FOR?** — 합성 방향 프리셋 + 커스텀 프롬프트
- **SYNTHESIZE N VOICES →** — 합성 시작

**합성 방향 프리셋**

| 프리셋 | 설명 |
|--------|------|
| Just synthesize | 합의·차이·통찰 전체적으로 읽기 |
| Find differences | 반대·모순·대립 가정 중심 |
| Find hidden connections | 교차 관계·숨은 연결 중심 |
| Find common ground | 공통 주장·반복 아이디어 중심 |

---

### 4.2 합성 진행 (`/synthesize/[id]`)

**Phase 1 — Analyzing**
- 각 영상 자막 추출
- 핵심 주장(claims) 추출
- 영상별 분석 결과 생성
- 진행 목록: `01 / 영상제목…` + 상태 (reading / done ✓ / transcript unavailable)

**Phase 2 — Synthesizing**
- 전체 목소리를 한꺼번에 읽는 LLM 합성 (보통 30–90초+)
- Voice Relationship Canvas: `processing` → `complete` (? → ✦)
- SSE heartbeat으로 실시간 상태 메시지
- 완료 후 `/synthesis/[id]`로 자동 이동

---

### 4.3 합성 결과 (`/synthesis/[id]`)

| 섹션 | 내용 |
|------|------|
| **03 / SEE WHAT EMERGES** | Fourth Idea 한 줄 인용 + 통계(VOICES, CLAIMS, CONNECTIONS, DISAGREEMENTS) |
| **REASONING MAP** | 주장·관계 그래프 (클릭 시 상세, 모바일 별도 UI) |
| **Explore Voices** | 각 영상이 합성에서 맡은 역할 |
| **ASK THESE VOICES** | 전체 합성에 자유 질문 + 추천 질문 칩 |
| **The Answer** | 핵심 질문에 대한 종합 답변 |
| **Big Picture** | 주제별 테마 |
| **Agreement / Disagreement** | 편집적 합의·대립 정리 |
| **Questions Worth Asking** | 이어서 물어볼 질문 제안 |
| **Deep Dive** | 세부 관계·근거 탐색 |
| **Inspect** | 추출 주장 수, 관계, 거부된 인사이트 등 메타 |

**상단 액션**
- **Save →** — Google 로그인 후 아카이브 저장
- **Compose video →** — 영상 편집
- **Create a Short** — 스토리 빌더

---

### 4.4 Compose (`/compose/[id]`)

합성 결과를 **편집 가능한 영상 타임라인**으로 변환.

- **Narrative** — 섹션별 내레이션·클립 구성
- **Preview** — 합성 영상 미리보기
- **Timeline Editor** — 클립 순서 변경, 시작/끝 구간 스크럽
- **Export** — 렌더 작업, ffmpeg 스크립트, YouTube 업로드(로그인)
- **REFINE COMPOSITION** — 자연어 지시로 재생성  
  예: *"Focus more on disagreements. Keep it under 2 minutes."*

---

### 4.5 Story (`/story/[id]`)

합성을 **짧은 스토리/숏폼** 형태로 재구성.

- 모드 선택 (insight 중심 등)
- AI 블록 단위 내러티브 생성
- 블록 순서·내용 수동 조정
- 미리보기

---

### 4.6 Archive (`/archive`)

로그인 사용자의 저장된 합성 목록. 과거 합성을 백이슈처럼 다시 열람.

---

### 4.7 Personal (`/personal`)

합성과 별도 — **YouTube 소비 패턴·취향** 분석.

- **My Current Mind** — 관심사, 떠오르는 주제, 변화 추이
- **기간 탭** — 7일 / 30일 / 90일 / 전체
- **YouTube 연동(선택)** — 시청 기록 동기화
- **Ask** — 내 취향에 대해 질문
- **Playlist Import** — 플레이리스트에서 합성용 영상 가져오기

---

### 4.8 About (`/about`)

서비스 철학과 5단계 흐름 소개.

> Save → Understand → Compare → Synthesize → Ask

---

## 5. UI/UX 디자인 시스템

### 5.1 디자인 컨셉

**에디토리얼·인쇄 매거진 감성**

- 따뜻한 아이보리 종이 위에 세리프 본문 + 모노스페이스 라벨
- 둥근 모서리 없음 (`border-radius: 0`) — 신문·잡지 레이아웃
- 선(border)으로 섹션을 구분하는 그리드형 구조
- 장식보다 **타이포그래피와 여백**으로 위계 표현

### 5.2 타이포그래피

| 역할 | 폰트 | 용도 |
|------|------|------|
| 본문 | **Newsreader** (serif) | 제목, 설명, 인용, 블록쿼트 |
| 라벨 | **Space Mono** (mono) | 섹션 라벨, 버튼, 네비, 메타데이터 |
| 보조 | Space Grotesk | 일부 UI (변수만 로드) |

**유틸리티 클래스**
- `.mono` — 모노스페이스 본문
- `.mono-label` — 대문자 + letter-spacing 0.08em (섹션 라벨·CTA)

**크기 패턴**
- 섹션 라벨: `text-[10px]` mono-label
- 본문 제목: `text-xl` ~ `text-5xl` font-serif
- 설명: `text-sm` ~ `text-lg` text-ink-soft

### 5.3 컬러 팔레트

**Warm ivory printed-paper**

| 토큰 | 용도 |
|------|------|
| `background` / `paper` | 메인 배경 (따뜻한 아이보리) |
| `paper-2` | 강조 섹션 배경 (SEE WHAT EMERGES 등) |
| `ink` | 본문·선·주요 CTA 배경 |
| `ink-soft` | 보조 텍스트·비활성 |
| `line` | border, 구분선 |
| `mint` / `mint-ink` | 선택 상태, 관계선, 브랜드 액센트 |
| `clay` | 보조 액센트 |
| `destructive` | 에러·실패 상태 |

**CTA 패턴**
- Primary: `bg-ink text-background` (검정 버튼, 흰 글자)
- Secondary: `border border-line` + hover 시 invert
- 선택됨: `border-ink bg-ink text-background`

### 5.4 레이아웃

**HomePageShell** — 모든 주요 페이지 공통 컨테이너

```
max-width: 1280px
padding: px-5 (모바일) / px-6 (데스크톱)
```

**섹션 구분**
- `border-b border-line` — 페이지 내 수평 구분
- `border border-line p-5 md:p-8` — 카드형 박스 (Timeline Editor, Refine Composition 등)
- `py-8 md:py-10` / `py-10 md:py-12` — 섹션 수직 여백

**Masthead (전역 네비)**
- Brand lockup (좌)
- New Synthesis / My YouTube / Archive / About (우)
- Sign in / Sign out
- 모바일: Menu 버튼 → 전체 네비 펼침

**BrandFooter**
- 로고 + 태그라인: *"Many voices enter. Relationships form. A new understanding emerges."*

### 5.5 브랜드 심볼

**Asterism (✦)** — 여러 목소리가 만나 새로운 이해가 생기는 순간을 상징.

- 합성 진행 중: `?` → `✦` 변환 애니메이션
- SEE WHAT EMERGES 히어로 중앙 배치
- `compose-asterism-pulse` — 부드러운 scale 펄스

### 5.6 섹션 라벨 패턴

모든 주요 섹션은 동일한 3단 구조:

```
[mono-label] 01 / SECTION NAME     ← 10px, uppercase, ink-soft
[font-serif]  Section headline      ← 제목
[font-serif]  Supporting copy       ← 설명, ink-soft
[content]     Interactive area
```

예시:
- `01 / CHOOSE THE VOICES`
- `02 / BRING THEM TOGETHER`
- `03 / SEE WHAT EMERGES`
- `REFINE COMPOSITION`
- `TIMELINE EDITOR`
- `ASK THESE VOICES`

---

## 6. 페이지별 UI/UX 상세

### 6.1 홈 — Source Picker

**탭 구조**: Search | Recent | Likes | Playlists | Channels

- 검색: 400ms 디바운스
- URL 붙여넣기: 영상·플레이리스트 자동 파싱 + 일괄 추가 힌트
- YouTube 미연결 시: Connect YouTube CTA (Google OAuth)
- **VideoSourceCard**
  - 16:10 썸네일
  - 선택 시: mint 테두리 + ring + 순번 배지 (01, 02…)
  - 샘플: `EXAMPLE` 라벨, 선택 비활성

### 6.2 홈 — Voice Relationship Canvas

- SVG 기반, 반응형 높이 (`clamp`)
- 좌: Voice 노드 (번호 + 채널 — 제목)
- 우: Asterism 허브
- **idle**: 회색 점선 연결
- **processing**: mint 색 점선 + dash 애니메이션
- **complete**: 관계 라벨 (SHARED, DIFFERENT, UNIQUE…)
- Voice 제거: 노드 hover 시 × 버튼

### 6.3 홈 — Synthesis Focus Input

- 상단: 자유 입력 (`Ask something across these voices…`)
- 하단: 4개 프리셋 칩 (토글, 선택 시 invert)
- 선택된 프리셋 blurb 표시

### 6.4 합성 진행 화면

**중앙 정렬 레이아웃** (`max-w-2xl`, text-center)

- 대형 세리프 헤드라인: *"Listening to N voices."* / *"Bringing N voices together…"*
- `aria-live` 상태 메시지
- 합성 중: 경과 시간 + *"usually 30–90 seconds"* 안내
- 분석 중: Voice별 진행 리스트 (좌 제목 / 우 상태)
- 하단: 단계별 ProgressRow (Reading → Synthesizing → Complete)

### 6.5 결과 — SEE WHAT EMERGES

- `bg-paper-2` 강조 배경
- 중앙 Asterism + `EMERGENT INSIGHT` 라벨
- 대형 인용 블록쿼트 (`text-3xl` ~ `text-5xl`)
- 통계 행: VOICES · CLAIMS · CONNECTIONS · DISAGREEMENTS
- **VIEW RELATIONSHIP MAP →** — 그래프 섹션으로 스크롤
- 통찰 없음: *"These voices do not strongly converge."* (유효한 결과로 표시)

### 6.6 결과 — REASONING MAP (Insight Graph)

**Progressive disclosure**
- 데스크톱: 캔버스 + 사이드 상세 패널
- 모바일: `InsightGraphMobile` — 별도 풀스크린/아코디언
- 노드 클릭 → claim·evidence·관계 확장
- 통찰 노드에서 "Ask about this" → ASK 섹션으로 스크롤 + 질문 prefill

### 6.7 결과 — ASK THESE VOICES

**입력 UI** (textarea + 버튼 통합 border 박스)
- 추천 질문 칩 5개
- Scope 배지 (특정 insight에서 진입 시)
- 답변 카드: 근거 타임스탬프 + Voice 태그 + YouTube 링크

### 6.8 Compose

**일관된 bordered box 패턴**
- Timeline Editor: `border border-line p-5 md:p-8`
- Refine Composition: 동일 박스 (좌우 정렬 통일)
- 입력+버튼: `flex border` 통합 (모바일 세로 / 데스크톱 가로, `items-stretch`)

**Timeline Editor**
- 드래그로 클립 순서 변경
- 엣지 핸들로 시작/끝 스크럽
- S01 / INT / S02 등 세그먼트 라벨

### 6.9 Archive

- 대형 세리프 타이틀 (`text-6xl` ~ `text-8xl`)
- 합성 카드 리스트 (날짜, 주제, Voice 수)

### 6.10 Personal

- `max-w-5xl` (홈보다 좁은 읽기 폭)
- Taste window 탭 + 그래프
- YouTube 연동 상태·동기화 시간 표시

---

## 7. 인터랙션 패턴

### 7.1 CTA 상태

| 상태 | UI |
|------|-----|
| Voice 0개 | BRING 섹션 숨김 |
| Voice 1개 | *"ADD ONE MORE VOICE"* (비활성 스타일) |
| Voice 2개+ | *"SYNTHESIZE N VOICES →"* (bg-ink 활성) |

### 7.2 스크롤 연동

- Insight Map → Ask: `scrollIntoView` + prefill
- Questions Worth Asking → Ask: 질문 자동 입력
- Explore Map 버튼 → `#insight-graph`

### 7.3 에러·빈 상태

- `role="alert"` + `text-destructive` — 배치 에러
- transcript unavailable — 개별 Voice 실패, 전체 중단 아님
- 합성 실패 — failed phase + 에러 메시지

### 7.4 인증 게이트

- YouTube 탭·동기화: Connect YouTube
- Archive 저장: Sign in
- YouTube 업로드: 추가 scope

로그인 없이도 **검색·URL·합성·결과·질문**은 가능.

### 7.5 Continue 섹션 (홈 하단)

로그인 + 프로필 있을 때만 표시:
- **CONTINUE** — 현재 관심 스레드
- **YOUR YOUTUBE** — 떠오르는 주제 3개

---

## 8. 모바일 UX

### 8.1 고정 하단 바 (홈)

Voice 1개 이상 선택 시:
- `fixed bottom-0` — Voice 번호 칩 + SYNTHESIZE CTA
- `backdrop-blur` + border-top
- 본문 하단 `h-16` spacer

### 8.2 Masthead

- `md:hidden` Menu 버튼
- 펼침 네비: 세로 스택 + Sign in/out

### 8.3 Insight Graph

- 데스크톱 캔버스 대신 `InsightGraphMobile`
- 터치 친화적 노드·아코디언

### 8.4 입력·버튼

- Compose Refine, Ask 등: `flex-col` (모바일) → `sm:flex-row` (데스크톱)
- 버튼 border: `border-t` (모바일) → `border-l` (데스크톱)

### 8.5 타이포 스케일

- 헤드라인: `text-3xl md:text-5xl` 등 단계적 확대
- 패딩: `py-8 md:py-12`, `p-5 md:p-8`

---

## 9. 로딩·상태 UI

| 화면 | 패턴 |
|------|------|
| 합성 진행 | 중앙 헤드라인 + canvas phase + progress steps |
| Compose 생성 | `ComposeProgress` — 단계별 메시지 (1.6s 간격) |
| Story 생성 | 5단계 로딩 메시지 (2.2s 간격) |
| Ask | 버튼 disabled + loading |
| Export | job polling (1.5s) + ffmpeg script |

**합성 heartbeat**  
SSE로 `elapsedMs`, `message` 수신 → 경과 시간·상태 문구 실시간 갱신.

---

## 10. 용어 통일

UI 전반에서 **VOICE / VOICES** 로 통일 (Source, Video 등 혼용 최소화).

| 용어 | 의미 |
|------|------|
| Voice | 선택된 YouTube 영상 하나 |
| Synthesis | N개 Voice를 읽고 합친 결과 문서 |
| Fourth Idea / Emergent Insight | 여러 Voice에서만 나오는 통찰 |
| Reasoning Map / Insight Graph | 주장·관계 시각화 |
| Compose | 합성을 영상 타임라인으로 편집 |
| Story / Short | 합성을 숏폼 내러티브로 변환 |

---

## 11. 인증·데이터

| 기능 | 로그인 |
|------|--------|
| 검색·URL·합성·결과·질문 | 불필요 |
| YouTube Recent/Likes/Playlist | Google + YouTube |
| Archive 저장 | Google |
| YouTube 업로드 | Google + YouTube |
| Personal 동기화 | Google + YouTube (선택) |

**저장 위치**
- 합성 draft/결과: 브라우저 localStorage
- Archive·Personal: 서버 / `.data/personal/`

---

## 12. 현재 한계

- **YouTube만** 지원
- 합성 **최소 2개** Voice
- LLM 합성 **30초~수 분** 소요 (영상 수·길이에 비례)
- Compose 렌더·YouTube 업로드는 인프라·권한 설정 필요
- 다크 모드 미지원 (light only, `color-scheme: light`)

---

## 부록: 기술 스택

- **Framework**: Next.js 16, React 19
- **Styling**: Tailwind CSS v4
- **Fonts**: Newsreader, Space Mono (Google Fonts)
- **Auth**: NextAuth (Google)
- **AI**: LLM 기반 분석·합성·질문 파이프라인
- **YouTube**: Data API + 자막 추출

---

*문서 기준: 2026-08-18 · elcanto 현재 구현 상태*
