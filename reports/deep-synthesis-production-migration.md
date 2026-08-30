# DEEP SYNTHESIS PRODUCTION MIGRATION RESULT

## Architecture

**Before:**
- Per-source LLM (`answerSourceForQuestion`) 또는 synthesis-mode profile snippets
- Cross-source LLM가 `sourceAnswers` + evidence snippets + 동시에 `insights`/`sourceConcepts`/`connectionConcepts` 생성
- `finalizeValidatedDirectAnswer` 추가 LLM 호출 가능
- 기본 synthesis model: `gpt-4o-mini` (`OPENAI_MODEL_SYNTHESIS` 미설정 시)

**After:**
```
FULL TRANSCRIPTS (YouTube captions)
+ USER QUESTION
        ↓
DEEP SYNTHESIS (1 LLM, structured candidateInsights)
        ↓
GROUND sourceInteractions → transcript evidence
        ↓
VALIDATED DirectInsights (+ derived SourceConcept / ConnectionConcept for UI)
        ↓
COMPARE fields validated (secondary, same deep output)
        ↓
buildFinalDirectAnswer (deterministic, no extra LLM)
        ↓
Insight Explorer (DISCOVER → CONNECT → TRACE → COMPARE → VERIFY)
```

- `synthesisMode: 'deep-direct'`, engine version `deep-direct-1.0`
- SourceConcept / ConnectionConcept는 synthesis 입력이 아니라 **grounding 이후 presentation**으로 생성
- Persistence: `document.directSynthesis` 호환 유지 + `deepSynthesisDiagnostics` additive

## Production model

- Role: `getModelForRole('synthesis')` → env `OPENAI_MODEL_SYNTHESIS`
- Smoke / golden 실행 시: **o3** (structured output + `max_completion_tokens` 지원)
- Default env 미설정 시 여전히 `gpt-4o-mini` (배포 시 `OPENAI_MODEL_SYNTHESIS=o3` 권장)

## API calls

- **Deep Synthesis:** 1 (`synthesizeDeepCrossSource`)
- **Grounding / existing calls:** 0 LLM (token overlap grounding + `validateAndFilterSynthesis` for compare)
- **Finalize answer LLM:** 제거 (deterministic only)
- **Total:** 1 LLM call per synthesis job (direct path)

## Golden Benchmark

**Question:**
이 영상들을 함께 봤을 때만 발견할 수 있는 insight는 무엇인가?

**Sources:** Peter Thiel (`6ncbLSiOogQ`), Elon Musk (`o15OWA0PFds`), Bill Gates (`sKeEYFP6tXA`)

**Result (single production pipeline run):**

| Metric | Value |
|--------|-------|
| Candidate insights (o3) | 3 |
| Validated insights | **0** |
| Removed | 3 |
| LLM calls | 1 |
| Input tokens | 3085 |
| Output tokens | 2686 |
| Latency (cross-source) | ~24s |

**Removed candidates (diagnostics):**

1. `insight_1` — «모두 테크로 몰려라»… — **NOT_COMPARABLE**
2. `insight_2` — «법조계는 버틴다» vs «법조계부터 자동화» — **INSUFFICIENT_SOURCES**
3. `insight_3` — «삭제 후 자동화»… — **NOT_COMPARABLE**

o3는 한국어 title/thesis와 structured `sourceInteractions`를 생성했지만, 영어 transcript grounding이 충분히 매칭되지 않아 **전부 탈락**. RAW prose 실험(동일 모델·동일 transcript)에서는 3개 강한 insight가 나왔으므로, **structured output + 한국어 UI 질문 + 영어 transcript grounding** 조합이 현재 병목.

**Golden PASS/FAIL:** **FAIL** (validated cross-source insight 0개; generic topic 회피는 candidate 단계에서 충족 가능하지만 grounding 후 노출 insight 없음)

## Removed / weakened candidate insights

| Candidate | Reason |
|-----------|--------|
| insight_1 | NOT_COMPARABLE — grounded sourceId가 sourceAnswers와 정합 실패 또는 2-source 미달 |
| insight_2 | INSUFFICIENT_SOURCES — proposition이 transcript segment와 매칭 실패 |
| insight_3 | NOT_COMPARABLE | 

원문에 없는 AI inference(예: «불필요한 단계 = 사람»)를 source claim으로 저장하지 않음 — grounding이 UNSUPPORTED interaction을 제거.

## UI

| Section | Status |
|---------|--------|
| DISCOVER | PASS (구조 유지; 이번 run은 empty state) |
| CONNECT | PASS |
| TRACE | PASS |
| COMPARE | PASS |
| VERIFY | PASS (+ 기본: 선택 insight 근거만, «전체 Transcript 보기» 토글) |

## Regression

| Check | Status |
|-------|--------|
| User question propagation | PASS — `centralQuestion` / `deepSynthesisDiagnostics.userQuestion` 유지 |
| No pre-synthesis concept dependency | PASS — Deep synthesis는 transcript만 입력 |
| Zero insight allowed | PASS — `insights=[]` 허용 |
| Evidence integrity | PASS — evidence는 catalog 원문 text만 저장 |
| Legacy compatibility | PASS — `isDirectSynthesisDocument`, legacy `insight` 필드 유지 |
| Job/polling | PASS — `runDirectSynthesisPipeline` 경로 동일 |
| Persistence | PASS — additive `synthesisMode`, `deepSynthesisDiagnostics` |

## Performance

- **Latency:** ~25s end-to-end (golden, 3 shorts)
- **Input tokens:** 3085
- **Output tokens:** 2686
- **Total LLM calls:** 1

## Files Changed

**New:**
- `lib/direct-synthesis/build-transcript-catalog.ts`
- `lib/direct-synthesis/deep-synthesis-instruction.ts`
- `lib/direct-synthesis/synthesize-deep.ts`
- `lib/direct-synthesis/ground-candidate-insights.ts`
- `lib/direct-synthesis/build-profile-source-answers.ts`
- `lib/direct-synthesis/build-persisted-evidence.ts`
- `lib/direct-synthesis/ground-candidate-insights.test.ts`
- `lib/direct-synthesis/deep-synthesis-regression.test.ts`
- `reports/deep-synthesis-production-migration.md`

**Modified:**
- `lib/direct-synthesis/pipeline.ts` — deep-direct flow
- `lib/direct-synthesis/types.ts` — CandidateInsight / DeepSynthesis schemas
- `lib/direct-synthesis/persisted.ts`
- `lib/direct-synthesis/engine-config.ts`
- `lib/production/build-direct-diagnostics.ts`
- `lib/production/types.ts`
- `lib/ai/structured-call.ts` — o3 `max_completion_tokens`
- `components/insight-explorer/insight-explorer-result.tsx` — VERIFY scoped evidence
- `lib/direct-synthesis/synthesis-question-routing.test.ts`

**Unchanged (legacy path):**
- `lib/direct-synthesis/synthesize-direct.ts` (이전 cross-source; pipeline에서 미사용)
- V2 / SurvivalBoard / reasoning engine

## New Architecture Added

**NONE** — 기존 job/polling/persistence/UI 위에 deep-direct 단계 추가. 새 scorer, embedding, V3, multi-agent 없음.

## Known Limitations

1. **Grounding vs RAW quality gap:** o3 prose 실험은 강한 insight를 생성했지만, production structured path + 한국어 질문 + 영어 transcript에서 grounding이 과도하게 탈락시킬 수 있음 (`sourceId` 정규화, proposition 언어 정합 추가 개선 여지).
2. **COMPARE 데이터:** deep synthesis 동일 호출의 optional compare fields; grounding 실패 시 빈 배열 가능.
3. **Context limit:** `DEEP_SYNTHESIS_MAX_INPUT_CHARS` (default 400k) 초과 시 LLM 미호출 + 명시적 uncertainty.
4. **CONTENT_QUESTION per-source DIRECT:** per-source LLM 제거; `buildProfileSourceAnswers` + question-focused evidence로 UI/compare 메타만 제공.
