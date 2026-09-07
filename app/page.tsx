import { redirect } from 'next/navigation'
import { isCreatorModeEnabled, isLegacySynthesisMode } from '@/lib/creator/config'

export default function RootPage() {
  if (isCreatorModeEnabled() && !isLegacySynthesisMode()) {
    redirect('/creator')
  }
  redirect('/legacy')
}
