# v0-clone

A reimagined frontend generation engine with fluid animations, real-time preview, and visual editing capabilities.

## Quick Start

```bash
# Install dependencies
bun install

# Start the studio
bun run dev:studio

# Open in browser
open http://localhost:5173
```

## Architecture

```
v0-clone/
├── apps/
│   └── studio/          # Svelte 5 visual editor
├── packages/
│   ├── shared/          # Shared types and utilities
│   ├── llm/             # Pluggable LLM provider (Claude, OpenAI, Ollama)
│   ├── pipeline/        # Generation pipeline with telemetry
│   └── renderer/        # iframe preview sandbox
└── openspec/            # Spec-driven development (Phase 2)
```

## Features

### Phase 1 (Current)
- [x] Svelte 5 studio with fluid animations
- [x] Pluggable LLM provider system (hot-swap between Claude/OpenAI/Ollama)
- [x] Full pipeline stub with timing telemetry
- [x] iframe preview sandbox with postMessage communication
- [x] File loading (markdown, images)
- [x] DevInfo panel for observability (`--dev-info` flag)
- [x] Responsive split-pane layout

### Phase 2 (Coming)
- [ ] WASM parser for code analysis
- [ ] Web Worker offloading
- [ ] Full LLM integration with streaming
- [ ] TypeScript AST-based code generation
- [ ] data-oid source mapping (Onlook pattern)

### Phase 3 (Future)
- [ ] Visual drag-and-drop editing
- [ ] Two-way sync: visual ↔ code
- [ ] Inspector/devtools panel
- [ ] Export to standalone project

## Configuration

### LLM Provider

Set environment variables or configure at runtime:

```bash
# Use Claude (default)
export LLM_PROVIDER=claude
export ANTHROPIC_API_KEY=your-key

# Use OpenAI
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your-key

# Use Ollama (local)
export LLM_PROVIDER=ollama
export OLLAMA_BASE_URL=http://localhost:11434
```

### Dev Mode

Enable telemetry with the `DEV_INFO` flag:

```bash
# Via environment variable
export DEV_INFO=true

# Via URL parameter
http://localhost:5173?dev
```

## Tech Stack

- **Frontend**: Svelte 5 + TailwindCSS 4
- **Build**: Bun + Vite
- **LLM**: Pluggable (Claude, OpenAI, Ollama)
- **Styling**: CSS Variables + Tailwind utilities

## Development

```bash
# Run studio in dev mode
bun run dev:studio

# Type check all packages
bun run typecheck

# Format code
bun run format

# Lint
bun run lint
```

## Performance Targets

- Frame budget: <10ms (60fps)
- HMR updates: <20ms
- Preview refresh: <50ms end-to-end
- Generation streaming: first token <500ms
