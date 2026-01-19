# Change Proposal: LM Studio Provider + Bits UI Integration

**ID:** 002-lmstudio-bits-ui
**Status:** COMPLETED
**Created:** 2026-01-17

## Goal

Add LM Studio as an LLM provider for local inference with Devstral Small 2, and integrate Bits UI for accessible, unstyled UI primitives.

## Context

### LM Studio
LM Studio is a local LLM inference server that provides an OpenAI-compatible API. This enables:
- Running models locally without API keys
- Testing with Devstral Small 2 (Mistral's code generation model)
- Alternative to Ollama for local development

### Bits UI
Bits UI provides headless, accessible UI components for Svelte 5. Benefits:
- Proper focus management and keyboard navigation
- WAI-ARIA compliant components
- Unstyled primitives that match project theming

## Requirements

### LM Studio Provider
- The system SHALL support LM Studio as an LLM provider
- The system SHALL use OpenAI-compatible API format
- The system SHALL default to `http://localhost:1234/v1` base URL
- The system SHALL default to `devstral-small-2` model
- The system SHALL NOT require an API key (placeholder only)

### Bits UI Components
- The system SHALL provide Dialog component with focus trapping
- The system SHALL provide Collapsible component for expand/collapse
- The system SHALL close Dialog on Escape key press
- The system SHALL support keyboard navigation

## Scenarios

### Scenario: LM Studio Generation
- **GIVEN** LM Studio is running with Devstral Small 2 loaded
- **AND** `LLM_PROVIDER=lmstudio` is set in `.env.local`
- **WHEN** user enters a prompt
- **THEN** code streams into editor
- **AND** preview renders the component

### Scenario: Error Dialog Accessibility
- **WHEN** an error occurs during generation
- **THEN** error dialog appears with focus trapped
- **AND** user can press Escape to dismiss
- **AND** focus returns to previous element

### Scenario: DevInfo Keyboard Navigation
- **WHEN** user tabs to DevInfo panel
- **AND** presses Enter or Space
- **THEN** panel expands/collapses
- **AND** animation plays smoothly

## Implementation

See `tasks.md` for detailed implementation steps.

## Affected Files

### Created
- `packages/llm/src/providers/lmstudio.ts` - LM Studio provider
- `apps/studio/src/lib/ui/` - UI primitives directory
  - `index.ts` - Re-exports
  - `dialog.svelte` - Styled Dialog wrapper
  - `collapsible.svelte` - Styled Collapsible wrapper
  - `dropdown-menu.svelte` - Styled DropdownMenu wrapper

### Modified
- `packages/shared/src/types.ts` - Added 'lmstudio' to LLMProvider
- `packages/llm/src/index.ts` - Registered LMStudioProvider
- `apps/studio/src/routes/api/provider/+server.ts` - Added lmstudio detection
- `apps/studio/src/lib/DevInfo.svelte` - Refactored with Collapsible
- `apps/studio/src/routes/+page.svelte` - Refactored error overlay with Dialog
- `apps/studio/src/app.css` - Added collapse animations
- `apps/studio/package.json` - Added bits-ui dependency
- `.env.example` - Added LM Studio configuration

## Decision Log

See `log.md` for architectural decisions made during implementation.
