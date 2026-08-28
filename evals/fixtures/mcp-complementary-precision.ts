export const MCP_VALID_AGREEMENT_FIXTURE = {
  fromClaimText: 'MCP represents a significant breakthrough in the AI industry.',
  toClaimText: 'MCP has gained significant attention in the tech community.',
}

export const MCP_FALSE_COMPLEMENTARY_FIXTURE = {
  fromClaimText: 'MCP facilitates interaction between AI systems as a standard protocol.',
  toClaimText: 'There is a persistence of discourse around MCP in the marketplace.',
  explanation:
    'Both claims speak to different facets of MCP, which can be seen as interlinked concepts.',
  expectedAudit: 'FALSE_COMPLEMENTARY' as const,
}
