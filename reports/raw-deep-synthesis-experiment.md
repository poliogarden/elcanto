# RAW DEEP SYNTHESIS EXPERIMENT RESULT

## Production modified
NO

## Model
o3

## API calls
1

## Input
Source 1 (Peter Thiel / 6ncbLSiOogQ): 2764 chars / 61 segments · transcript=youtube_captions · analysis_cache=yes
Source 2 (Elon Musk / o15OWA0PFds): 1175 chars / 28 segments · transcript=youtube_captions · analysis_cache=yes
Source 3 (Bill Gates / sKeEYFP6tXA): 1169 chars / 44 segments · transcript=youtube_captions · analysis_cache=yes

## User Question
이 영상들을 함께 봤을 때만 발견할 수 있는 insight는 무엇인가?

## RAW MODEL OUTPUT

Insight 1  
“인재가 테크로 몰릴수록, ‘삭제→자동화’ 문화가 가속되고, 게이츠가 우려한 대규모 실직이 자기실현적 예언이 된다.”  

Source interaction  
- Source A (Peter Thiel): ‘의미 있는 새 일은 거의 모두 테크에 있고, 똑똑한 사람은 테크로 가야 한다.’  
- Source B (Elon Musk): ‘좋은 엔지니어링은 존재 이유가 모호한 부품·과정을 먼저 삭제하고, 마지막 단계에서 자동화한다.’  
- Source C (Bill Gates): ‘AI·로봇이 향후 10년 안에 법률·의료·제조까지 대규모 일자리를 없앨 수 있다.’  

Why this requires multiple sources  
Thiel만 보면 ‘테크가 유일한 성장로’라는 낙관적 커리어 조언이다. Musk만 보면 ‘효율적 설계 절차’ 이야기이고, Gates만 보면 ‘AI 실직 공포’다. 그러나 세 영상을 함께 놓으면 다음 연쇄가 드러난다.  
1) Thiel의 조언은 뛰어난 인력을 테크 기업으로 집중시킨다.  
2) 그 인력은 Musk가 말한 ‘삭제-우선 문화’를 통해 제품뿐 아니라 회사 운영·생산 과정 전반에서 ‘쓸모없는 단계(=사람)’를 제거하고 자동화한다.  
3) 결과적으로 Gates가 경고한 대규모 실직이 더 빨리 현실화된다.  

즉, ‘테크로의 인재 유입(Thiel) → 삭제·자동화의 가속(Musk) → 실직 위험(Gates)’이라는 인과 사슬은 세 소스가 결합될 때만 보인다.

---

Insight 2  
“게이츠가 제안한 ‘인간 전용 구역’ · 로봇세는, 머스크가 경계한 ‘존재해선 안 될 것을 최적화하는 오류’에 해당한다.”  

Source interaction  
- Source B (Elon Musk): ‘스마트 엔지니어가 가장 많이 범하는 실수는 없어져야 할 것을 열심히 최적화하는 것.’  
- Source C (Bill Gates): ‘AI 난민을 막기 위해 로봇세를 부과하고 AI를 일부러 배제한 구역을 만들자.’  

Why this requires multiple sources  
Musk의 영상만 보면 ‘엔지니어링 내부 규칙’이고, Gates의 영상만 보면 ‘정책 제안’이다. 두 발언을 포개면, 인간 전용 구역과 로봇세는 사실상 기술·시장 구조를 유지한 채 새로운 규정과 세금으로 “최적화”하려는 시도다. Musk의 기준으로 보면 이는 ‘처음부터 없어져야 할(지속 불가능한) 프로세스’를 되살려 놓고 고도화하는 격이다. 따라서 게이츠의 해법은 머스크가 경고한 대표적 함정으로 재해석된다.

---

Insight 3  
“Thiel이 ‘정체됐다’고 본 기존 전문직(법률·의료)조차, Gates가 지목한 AI의 1차 타깃이어서 ‘안전한 전통 트랙’이 사라질 가능성이 열린다.”  

Source interaction  
- Source A (Peter Thiel): ‘법률·의료·컨설팅 같은 기존 엘리트 트랙은 좁고 정체돼 있지만 그나마 안정적이다.’  
- Source C (Bill Gates): ‘향후 10년 안에 AI가 법률 상담과 의료 고객 서비스까지 빠르게 대체할 것.’  

Why this requires multiple sources  
Thiel만 보면 ‘전통 트랙은 지루하지만 지속된다’는 암묵적 안정성이 있다. Gates의 전망을 대입하면, 바로 그 ‘안전판’이 AI의 직접적인 공격 대상이 된다. 두 발언이 만나야만 ‘안정적이라 여긴 영역이 가장 먼저 흔들린다’는 역전(insversion) 효과가 드러난다.

## Performance
Latency: 11435ms
Input tokens: 2559
Output tokens: 1778
Total tokens: 4337

## Existing elcanto stages bypassed
- Evidence Retrieval: YES
- Claim Extraction: YES
- SourceConcept: YES
- ConnectionConcept: YES
- Relationship Engine: YES
- Insight Validation: YES
- Graph Generation: YES

## Files Added
- lib/experiments/raw-deep-synthesis/instruction.ts
- lib/experiments/raw-deep-synthesis/sources.ts
- lib/experiments/raw-deep-synthesis/load-transcripts.ts
- lib/experiments/raw-deep-synthesis/run.ts
- lib/experiments/raw-deep-synthesis/raw-deep-synthesis.runner.test.ts
- scripts/experiment-raw-synthesis.mjs

## Existing Files Modified
- package.json (npm script only)

## Errors / Limitations
Single-shot experiment; no structured output schema; full transcripts from YouTube captions (same ingestion source as elcanto analyze pipeline).
