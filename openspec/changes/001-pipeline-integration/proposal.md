# Change Proposal: Pipeline Integration

**ID:** 001-pipeline-integration
**Status:** IN_PROGRESS
**Created:** 2026-01-15

## Goal

Enable end-to-end UI generation: prompt → ZHIPU → Svelte component → preview

## Context

The pipeline infrastructure is complete but not wired to the UI:
- `packages/llm/` - Provider abstraction with ZHIPU support ✅
- `packages/pipeline/` - Parse → Generate → Render stages ✅
- `apps/studio/` - UI with stubbed `markdownToPreview()` ⚠️

## Requirements

- The system SHALL generate UI components from natural language prompts
- The system SHALL stream code progressively (real-time feedback)
- The system SHALL render in sandboxed iframe preview
- The system SHALL track metrics (parse/generate/render times)

## Scenarios

### Scenario: Successful Generation
- **GIVEN** .env.local has ZHIPU_API_KEY
- **WHEN** user enters "A modern pricing card with hover effects"
- **THEN** code streams into editor
- **AND** preview renders the component
- **AND** DevInfo shows pipeline metrics

### Scenario: Error Handling
- **WHEN** generation fails (API error, timeout)
- **THEN** error overlay appears with message
- **AND** telemetry logs the error
- **AND** user can dismiss and retry

## Implementation

See `tasks.md` for detailed implementation steps.

## Affected Files

- `apps/studio/src/routes/+page.svelte` - Wire pipeline
- `apps/studio/src/routes/api/generate/+server.ts` - Server endpoint
- `packages/pipeline/src/index.ts` - Fix streaming bug

## Decision Log

See `log.md` for architectural decisions made during implementation.
