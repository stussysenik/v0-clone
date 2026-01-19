# Project Conventions

## Vision

A reimagined frontend generation engine with real-time preview and visual editing.

## Tech Stack

### Phase 1 (Current)
- **Frontend**: Svelte 5 + TailwindCSS 4 + Bits UI
- **Build**: Bun + Vite
- **LLM**: ZHIPU, Claude, OpenAI, Ollama, LM Studio
- **Monorepo**: Bun workspaces

### Phase 2 (Next)
- **Backend**: Elixir/Phoenix (real-time, fault-tolerant)
- **Prompt DSL**: Common Lisp (structured, composable prompts)
- **Channels**: Phoenix LiveView for streaming

### Phase 3 (Future)
- **Visual Editor**: Drag-and-drop with two-way sync
- **Export**: Standalone project generation

## Packages

- `@v0-clone/shared` - Types and utilities
- `@v0-clone/llm` - LLM provider abstraction
- `@v0-clone/pipeline` - Parse → Generate → Render
- `@v0-clone/renderer` - HTML rendering utilities

## Code Style

- TypeScript strict mode (Phase 1)
- Biome for linting/formatting
- Svelte 5 runes ($state, $props, $derived)
- Elixir: mix format, credo (Phase 2)

## Performance Budget

- First paint: <100ms
- Generation feedback: <500ms (streaming start)
- Full generation: <10s
- Frame budget: <10ms (60fps)

## Security

- No secrets in code (.env.local)
- Pre-commit hooks with secret detection
- Dependency auditing

## Development Flow (OpenSpec)

1. `openspec propose` → Create change proposal
2. Write failing tests
3. Implement
4. Verify (`bun run verify`)
5. Commit with conventional message
6. `openspec archive` → Move to completed

## Decision Log

All architectural decisions tracked in `openspec/changes/*/log.md`

## Current Changes

| ID | Status | Description |
|----|--------|-------------|
| 001-pipeline-integration | IN_PROGRESS | Wire pipeline to UI for generation |
| 002-lmstudio-bits-ui | COMPLETED | LM Studio provider + Bits UI integration |
| 003-elixir-backend | PROPOSED | Add Phoenix backend |
