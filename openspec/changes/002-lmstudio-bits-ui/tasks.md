# Tasks: LM Studio + Bits UI Integration

## Phase 1: LM Studio Provider

- [x] Create `packages/llm/src/providers/lmstudio.ts`
  - OpenAI-compatible API implementation
  - Default base URL: `http://localhost:1234/v1`
  - Default model: `devstral-small-2`
  - Placeholder API key: `lm-studio`

- [x] Update `packages/shared/src/types.ts`
  - Add `'lmstudio'` to `LLMProvider` union type

- [x] Update `packages/llm/src/index.ts`
  - Import and export `LMStudioProvider`
  - Add to `providerRegistry`
  - Update `detectProvider()` to include 'lmstudio'
  - Add `getBaseUrlFromEnv()` case for `LMSTUDIO_BASE_URL`
  - Add `getDefaultModel()` case for 'lmstudio'

- [x] Update `apps/studio/src/routes/api/provider/+server.ts`
  - Add `'lmstudio'` to `ProviderName` type
  - Update `detectProvider()` includes
  - Add `getDefaultModel()` case
  - Mark as always available (like Ollama)

- [x] Update `.env.example`
  - Add LM Studio configuration section
  - Add `LMSTUDIO_BASE_URL` variable
  - Document recommended models

## Phase 2: Bits UI Integration

- [x] Install bits-ui package
  - `cd apps/studio && bun add bits-ui`

- [x] Create UI primitives directory
  - `apps/studio/src/lib/ui/`

- [x] Create `index.ts` re-exports

- [x] Create `dialog.svelte`
  - Portal for overlay
  - Focus trapping
  - Escape to close
  - Close button

- [x] Create `collapsible.svelte`
  - Trigger snippet
  - Content snippet
  - Animated expand/collapse

- [x] Create `dropdown-menu.svelte`
  - Menu items with onclick
  - Destructive styling option
  - Disabled state

- [x] Update `app.css`
  - Add collapse-down animation
  - Add collapse-up animation
  - Add animation utility classes

## Phase 3: Component Refactoring

- [x] Refactor `DevInfo.svelte`
  - Import Collapsible from $lib/ui
  - Replace manual expand/collapse with Collapsible
  - Use trigger and children snippets

- [x] Refactor `+page.svelte` error overlay
  - Import Dialog from $lib/ui
  - Add showErrorDialog derived state
  - Replace inline overlay with Dialog component
  - Handle Escape key via onOpenChange

## Phase 4: OpenSpec Documentation

- [x] Create `openspec/changes/002-lmstudio-bits-ui/` directory
- [x] Write `proposal.md`
- [x] Write `tasks.md`
- [x] Write `log.md`
- [x] Update `openspec/project.md`

## Verification

### LM Studio
1. Start LM Studio with Devstral Small 2 loaded
2. Set `LLM_PROVIDER=lmstudio` in `.env.local`
3. Run `bun dev:studio`
4. Test streaming generation with a prompt

### Bits UI
1. Tab through dialog elements (focus trapping works)
2. Press Escape (dialog closes)
3. Test DevInfo expand/collapse with keyboard

## Notes
- 2026-01-17: Implementation completed successfully
- Bits UI v2.15.4 installed
- All components use Svelte 5 runes and snippets
