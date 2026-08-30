export type RawExperimentSource = {
  label: string
  videoId: string
  url: string
}

export const RAW_EXPERIMENT_SOURCES: RawExperimentSource[] = [
  {
    label: 'Peter Thiel',
    videoId: '6ncbLSiOogQ',
    url: 'https://www.youtube.com/shorts/6ncbLSiOogQ',
  },
  {
    label: 'Elon Musk',
    videoId: 'o15OWA0PFds',
    url: 'https://www.youtube.com/shorts/o15OWA0PFds',
  },
  {
    label: 'Bill Gates',
    videoId: 'sKeEYFP6tXA',
    url: 'https://youtu.be/sKeEYFP6tXA',
  },
]

export const RAW_EXPERIMENT_QUESTION =
  '이 영상들을 함께 봤을 때만 발견할 수 있는 insight는 무엇인가?'
