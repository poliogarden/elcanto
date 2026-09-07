'use client'

import { HomeWorkspace } from '@/components/home/home-workspace'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { useWorkspace } from '@/lib/workspace/workspace-provider'

export default function LegacyHomePage() {
  const ws = useWorkspace()

  return (
    <WorkspaceShell>
      <HomeWorkspace
        voices={ws.voices}
        onToggleItem={ws.handleToggleItem}
        onBatchAdd={ws.handleBatchAdd}
      />
    </WorkspaceShell>
  )
}
