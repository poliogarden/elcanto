import type { Scene } from '@/lib/creator/types'

export function buildDemoScript(topic: string) {
  return {
    hook: `${topic} — 지난 영상 이후 무엇이 바뀌었을까?`,
    sections: [
      {
        id: 's1',
        title: 'Context',
        body: '세 달 전 우리는 AI capex 과열과 NVIDIA 구조적 수요를 동시에 다뤘습니다. Q2 실적이 나온 지금, 그 논의를 업데이트할 때입니다.',
      },
      {
        id: 's2',
        title: 'Data',
        body: 'Hyperscaler capex는 여전히 높지만, inference revenue 전환 속도가 핵심 변수입니다. 단순 버블 종료가 아니라 형태 변화에 가깝습니다.',
      },
      {
        id: 's3',
        title: 'Chart',
        body: 'GPU 수요, 데이터센터 투자, 그리고 매출 회수 시점을 숫자로 비교해 보겠습니다.',
      },
      {
        id: 's4',
        title: 'Conclusion',
        body: '결론적으로, 구조적 수요는 남아 있지만 밸류에이션 프리미엄은 줄어들고 있습니다. 다음 분기에 다시 확인하겠습니다.',
      },
    ],
    conclusion: '구독과 알림 설정으로 다음 업데이트를 받아보세요.',
  }
}

export function buildDemoScenes(topic: string): Scene[] {
  return [
    {
      sceneId: 'demo-scene-01',
      order: 0,
      durationTargetSec: 12,
      scriptText: `${topic} — 지난 영상 이후 무엇이 바뀌었을까?`,
      voiceText: `${topic}. 지난 영상 이후 무엇이 바뀌었을까?`,
      visualIntent: 'Bold kinetic typography intro',
      visualType: 'kinetic_typography',
      captionText: `${topic} — 업데이트`,
      transition: 'cut',
      visualAssetId: null,
      voiceAssetId: null,
    },
    {
      sceneId: 'demo-scene-02',
      order: 1,
      durationTargetSec: 18,
      scriptText:
        'Hyperscaler capex는 여전히 높지만 inference revenue 전환 속도가 핵심 변수입니다.',
      voiceText:
        'Hyperscaler capex는 여전히 높지만, inference revenue 전환 속도가 핵심 변수입니다.',
      visualIntent: 'AI datacenter investment comparison',
      visualType: 'chart',
      captionText: 'Capex vs Revenue 전환',
      transition: 'cut',
      visualAssetId: null,
      voiceAssetId: null,
    },
    {
      sceneId: 'demo-scene-03',
      order: 2,
      durationTargetSec: 15,
      scriptText: 'GPU 수요와 데이터센터 투자를 숫자로 비교합니다.',
      voiceText: 'GPU 수요와 데이터센터 투자를 숫자로 비교해 보겠습니다.',
      visualIntent: 'Bar chart GPU demand vs capex',
      visualType: 'chart',
      captionText: 'GPU vs Capex',
      transition: 'fade',
      visualAssetId: null,
      voiceAssetId: null,
    },
    {
      sceneId: 'demo-scene-04',
      order: 3,
      durationTargetSec: 10,
      scriptText: '구조적 수요는 남아 있지만 밸류에이션 프리미엄은 줄어들고 있습니다.',
      voiceText: '구조적 수요는 남아 있지만, 밸류에이션 프리미엄은 줄어들고 있습니다.',
      visualIntent: 'Closing summary typography',
      visualType: 'kinetic_typography',
      captionText: '형태 변화, not 단순 종료',
      transition: 'cut',
      visualAssetId: null,
      voiceAssetId: null,
    },
  ]
}
