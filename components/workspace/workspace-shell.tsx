'use client'

import { BrandFooter } from '@/components/brand/brand-footer'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'
import { SelectionComposer } from '@/components/workspace/selection-composer'
import { useWorkspace } from '@/lib/workspace/workspace-provider'

type Props = {
  children: React.ReactNode
  showFooter?: boolean
}

export function WorkspaceShell({ children, showFooter = true }: Props) {
  const ws = useWorkspace()

  return (
    <main className="flex min-h-screen flex-col bg-background font-ui">
      <Masthead variant="product" />
      <div className="flex-1">
        <HomePageShell className="pt-3 pb-6 sm:pt-4">
          {children}
          {ws.batchError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {ws.batchError}
            </p>
          )}
        </HomePageShell>
      </div>

      <SelectionComposer
        inline
        voices={ws.voices}
        customPrompt={ws.customPrompt}
        activeChip={ws.activeChip}
        onCustomPrompt={ws.handleCustomPrompt}
        onChipSelect={ws.handleChipSelect}
        onRemove={ws.handleRemove}
        onClearAll={ws.handleClearAll}
        onRun={ws.handleRun}
      />

      {showFooter && <BrandFooter />}
    </main>
  )
}
