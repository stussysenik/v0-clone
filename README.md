<div align="center">

# v0-clone

![Demo](demo.gif)


### Production-ready AI UI generation engine

![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Bun](https://img.shields.io/badge/Bun-Runtime-F9F1E1?style=flat-square&logo=bun)
![Status](https://img.shields.io/badge/Status-Active-green?style=flat-square)

</div>

---

A production-ready AI UI generation engine with intent-aware prompting, visual editing, and real-time preview.

## Quick Start

```bash
# Install dependencies
bun install

# Start the studio
bun run dev:studio

# Open in browser
open http://localhost:5200
```

## What Makes This Different

### Intent-Aware Generation

Unlike basic prompt-to-code tools, v0-clone detects what you're trying to build and tailors the output:

| Prompt | Detected Intent | Output |
|--------|-----------------|--------|
| "Create a SaaS landing page" | `page` | Complete page with nav, hero, features, pricing, footer |
| "Build a todo app" | `app` | Functional app with state management and interactions |
| "Make a pricing section" | `section` | Self-contained section ready to embed |
| "Design a button component" | `component` | Reusable component with variants |

### Production-Ready Output

Every generation includes:
- **Real images** from Unsplash (no broken placeholders)
- **Realistic content** (no Lorem ipsum)
- **Mobile responsive** design with Tailwind breakpoints
- **Accessible** markup with proper ARIA attributes
- **Working interactivity** using Svelte 5 runes

## Architecture

```
v0-clone/
├── apps/
│   └── studio/          # Svelte 5 visual editor
├── packages/
│   ├── shared/          # Shared types, validation, Chronicle
│   ├── llm/             # Pluggable LLM providers
│   ├── pipeline/        # Generation pipeline with stages
│   └── renderer/        # iframe preview sandbox
└── openspec/            # Spec-driven development
```

## Features

### Generation Pipeline
- **Parse Stage**: Intent detection from natural language
- **Generate Stage**: LLM generation with intent-specific prompts
- **Validate Stage**: Structure, accessibility, and image URL validation
- **Render Stage**: Preview compilation with Tailwind

### Visual Editor
- Split-pane layout with resizable panels
- Real-time preview with hot reload
- Element selection and style inspection
- Context menu for quick actions
- Code inspector with syntax highlighting

### Chronicle (Persistence)
- IndexedDB-based history tracking
- Project and snapshot management
- Artifact versioning with metadata
- Activity calendar visualization

### LLM Providers
- Claude (Anthropic)
- OpenAI (GPT-4)
- Ollama (local)
- LM Studio (local)
- Zhipu (GLM-4)

## Configuration

### LLM Provider

```bash
# Claude (default if ANTHROPIC_API_KEY is set)
export ANTHROPIC_API_KEY=your-key

# OpenAI
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your-key

# Ollama (local, no API key needed)
export LLM_PROVIDER=ollama
export OLLAMA_BASE_URL=http://localhost:11434

# LM Studio
export LLM_PROVIDER=lmstudio
export LMSTUDIO_BASE_URL=http://localhost:1234/v1
```

### Model Override

```bash
export LLM_MODEL=claude-sonnet-4-20250514
```

## Development

```bash
# Run studio in dev mode
bun run dev:studio

# Build all packages
bun run build

# Type check
bun run typecheck

# Format code
bun run format

# Lint
bun run lint
```

## Tech Stack

- **Frontend**: Svelte 5 + TailwindCSS 4
- **Build**: Bun + Vite
- **LLM**: Pluggable multi-provider system
- **Persistence**: IndexedDB (Chronicle)
- **Validation**: MDN compat, semantic HTML, a11y

## Performance Targets

- Frame budget: <10ms (60fps)
- HMR updates: <20ms
- Preview refresh: <50ms
- First token: <500ms

## License

MIT

## Documentation & Proof
- Project narrative: [docs/PROJECT_NARRATIVE.md](docs/PROJECT_NARRATIVE.md)
- CI guard: [.github/workflows/documentation-proof.yml](.github/workflows/documentation-proof.yml)
- This project documentation emphasizes user journey, design methodology, progress, tech stack, key concepts, and implementation evidence.
