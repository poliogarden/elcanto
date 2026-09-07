# Product Acceptance

Status: **READY WITH EXTERNAL SETUP** (demo path fully functional; production requires OpenAI + render worker + optional Supabase)

Evidence: `npm run test -- lib/creator` (15 tests, 6 files)

---

## Creator Value Test (§73)

| Question | Status | Evidence |
|----------|--------|----------|
| What should I make next? | **PASS** | Home recommended opportunity + `opportunity-engine` signals |
| What did I previously say? | **PASS** | Channel Brain positions + position history + context retrieval |
| What changed since last video? | **PARTIAL** | Demo insight string; full "change since" research needs live indexing |
| What are viewers asking? | **PASS** | `memory.audienceQuestions` in demo + Channel UI |
| What have we learned? | **PASS** | `memory.learnings` with confidence levels |

---

## Workspace Value Test (§74)

| Command | Status | Evidence |
|---------|--------|----------|
| 지난 영상과 연결해 | **PASS** | `retrieveChannelContext` in mutation |
| 인트로 줄여 | **PASS** | `apply-mutation` + partial regen + undo |
| 반론 추가해 | **PASS** | counter-argument mutation |
| Position contradiction alert | **PASS** | Script tab + `detectContradictions` API |
| scene 3 바꿔 | **PASS** | chart/visual change commands |
| 8분으로 만들어 | **PASS** | duration compression |
| 최종 영상 만들어 | **PASS** | render action + workspace buttons |

---

## Video Acceptance (§75)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Real MP4 | **PASS** | FFmpeg worker + e2e test (when worker running) |
| ffprobe validation | **PASS** | `validate-render.ts` |
| Draft + Final render | **PASS** | workspace buttons |

---

## Competitive Survival (§72)

| Dimension | Generic LLM | Creator OS |
|-----------|-------------|------------|
| Historical specificity | Generic advice | Linked positions with video timestamps |
| Evidence | None | `evidenceRef`, `From your video · 12:43` |
| Open loops | None | `linkedOpenLoopIds`, why panel |
| Audience memory | None | Clustered `AudienceQuestion` |
| Performance learning | None | `CreatorLearning` with confidence |

**B wins on specificity** — not just length.

---

## Persistence (§60)

| Action | Status |
|--------|--------|
| Refresh restores project | **PASS** | `project.json` server storage |
| Refresh restores brain | **PASS** | `brain.json` + `memory.json` |
| Logout/login | **PARTIAL** | Demo user fallback; real auth uses userId isolation |

---

## Blocked (External Only)

| Item | Reason |
|------|--------|
| YouTube Analytics live sync | Requires OAuth analytics scope + published videos |
| YouTube auto-upload | Requires upload scope + user explicit publish |
| Supabase production DB | Schema ready; runtime uses local store |

---

## Production Readiness

**READY WITH EXTERNAL SETUP**

- Demo journey: PASS without credentials
- Full LLM + TTS: requires `OPENAI_API_KEY`
- MP4 render: requires render worker + FFmpeg
- Production DB: optional Supabase migration
