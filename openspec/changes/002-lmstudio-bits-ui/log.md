# Decision Log: LM Studio + Bits UI Integration

## 2026-01-17: Architecture Decisions

### Decision: LM Studio uses OpenAI-compatible API
**Context:** LM Studio exposes an OpenAI-compatible REST API
**Decision:** Base LMStudioProvider on OpenAIProvider pattern
**Rationale:**
- Same API format (`/v1/chat/completions`)
- Same streaming format (SSE with `data:` prefix)
- Minimal code duplication
- Easier maintenance

### Decision: Placeholder API key
**Context:** LM Studio doesn't require authentication for local requests
**Decision:** Use `"lm-studio"` as placeholder API key
**Rationale:**
- OpenAI SDK requires Authorization header
- Placeholder satisfies header requirement
- LM Studio ignores the value
- Consistent with other providers

### Decision: Default model `devstral-small-2`
**Context:** Need a sensible default for UI generation
**Decision:** Default to Devstral Small 2
**Rationale:**
- Mistral's specialized code generation model
- Excellent at following UI generation prompts
- Good balance of speed and quality
- Popular choice in LM Studio community

### Decision: Bits UI over Melt UI or custom
**Context:** Need accessible, unstyled UI primitives for Svelte 5
**Decision:** Use Bits UI for Dialog, Collapsible, DropdownMenu
**Rationale:**
- Native Svelte 5 support with runes
- WAI-ARIA compliant out of the box
- Unstyled - matches project theming approach
- Active maintenance and community
- Simpler API than Melt UI

### Decision: Wrapper components in $lib/ui
**Context:** Need consistent styling across Bits UI usage
**Decision:** Create styled wrapper components that re-export with project styles
**Rationale:**
- Single source of truth for component styles
- Import from `$lib/ui` throughout app
- Easy to update styles globally
- Matches existing project structure

### Decision: CSS animations over JavaScript
**Context:** Collapsible needs expand/collapse animation
**Decision:** Use CSS keyframes with `--bits-collapsible-content-height` variable
**Rationale:**
- Bits UI provides height variable automatically
- CSS animations are GPU-accelerated
- No JavaScript animation library needed
- Consistent with existing animation utilities

## Implementation Notes

### LM Studio Provider
- Identical structure to OpenAI provider
- Changed base URL, model, and provider name
- Logging uses "LM Studio" prefix for clarity

### Bits UI Components
- Dialog uses Portal for proper z-index layering
- Collapsible uses data-state attributes for animations
- DropdownMenu supports destructive styling option

### Refactoring Approach
- DevInfo.svelte: Replaced manual state with Collapsible
- +page.svelte: Moved error overlay to Dialog component
- Both use Svelte 5 snippet syntax for composition
