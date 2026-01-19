# Decision Log: Pipeline Integration

## 2026-01-15: Architecture Decisions

### Decision: Server-side API for LLM calls
**Context:** SvelteKit runs in browser, cannot access .env.local directly
**Decision:** Create `/api/generate` server endpoint that calls pipeline
**Rationale:**
- Keeps API keys secure (never exposed to client)
- Enables streaming via ReadableStream
- Follows SvelteKit patterns

### Decision: Skip LangChain/DSPy
**Context:** User asked about prompt abstraction frameworks
**Decision:** Use direct prompts in Phase 1, Common Lisp DSL in Phase 2+
**Rationale:**
- LangChain adds complexity without clear benefit
- Current provider abstraction is sufficient
- Common Lisp DSL aligns with full stack vision (Elixir interop)

### Decision: OpenSpec as source of truth
**Context:** Need consistent task/context management
**Decision:** All decisions, history, WIP tracked in openspec/
**Rationale:**
- Single source of truth across sessions
- AI assistants can reference history
- Clear audit trail for architectural decisions

## Stack Vision

### Phase 1 (Current)
- Svelte 5 + TailwindCSS frontend
- TypeScript pipeline with ZHIPU provider

### Phase 2 (Next)
- Elixir/Phoenix backend
- Common Lisp prompt DSL

### Phase 3 (Future)
- Visual drag-and-drop editor
- Two-way sync (visual ↔ code)
