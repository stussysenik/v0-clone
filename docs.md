# v0-clone Documentation

## Intent-Aware Generation System

The core differentiator of v0-clone is its intent-aware generation system. Instead of treating all prompts the same, the system classifies user intent and applies tailored generation strategies.

### Intent Types

#### Component (`component`)
Single, reusable UI elements.

**Triggers**: button, card, modal, input, dropdown, avatar, badge, tooltip, etc.

**Output characteristics**:
- Self-contained with internal state
- Props interface with variants (primary/secondary, sm/md/lg)
- Hover, focus, and active states
- No external dependencies

**Example prompts**:
- "Create a button with loading state"
- "Design a user avatar with status indicator"
- "Make a dropdown menu"

#### Section (`section`)
Page sections designed to be embedded in larger pages.

**Triggers**: hero section, pricing table, testimonials, team section, FAQ, footer, etc.

**Output characteristics**:
- Full-width with max-w-7xl container
- Vertical padding (py-16 or py-20)
- Self-contained but composable
- Semantic `<section>` wrapper

**Example prompts**:
- "Design a pricing section with 3 tiers"
- "Create a testimonials carousel"
- "Build a team members grid"

#### Page (`page`)
Complete, production-ready web pages.

**Triggers**: landing page, website, portfolio, dashboard, about page, etc.

**Output characteristics**:
- Navigation header (fixed, with mobile menu)
- Hero section with CTA
- Multiple content sections
- Footer with links
- Mobile responsive throughout

**Example prompts**:
- "Create a SaaS landing page"
- "Build a portfolio website"
- "Design an agency homepage"

#### App (`app`)
Interactive applications with state management.

**Triggers**: todo app, chat interface, admin panel, calculator, kanban board, etc.

**Output characteristics**:
- Functional state using `$state()`
- Working interactions (add, edit, delete)
- App shell with header/sidebar
- Pre-populated with example data

**Example prompts**:
- "Build a todo list app"
- "Create a chat interface"
- "Design a kanban board"

### Intent Detection Algorithm

The system uses a priority-based pattern matching approach:

1. **App patterns** (highest priority) - Matches interactive application keywords
2. **Page patterns** - Matches website/page-related keywords
3. **Section patterns** - Matches page section keywords
4. **Component patterns** - Matches UI element keywords
5. **Fallback heuristics** - Based on prompt word count:
   - >50 words → `page`
   - >20 words → `section`
   - Otherwise → `component`

### System Prompts

Each intent type has a tailored system prompt that includes:

1. **Technology stack** - Svelte 5 with runes, TailwindCSS
2. **Code patterns** - Intent-appropriate templates
3. **Image guidelines** - Real Unsplash URLs
4. **Structure requirements** - What elements must be present
5. **Quality standards** - Accessibility, responsiveness

## Validation System

Generated code goes through multiple validation checks:

### Structure Validation
Verifies intent-appropriate structure:
- **Pages**: Must have `<nav>`, `<main>`, `<footer>`, multiple `<section>` elements
- **Apps**: Must have `<script>` with `$state()` for reactivity
- **Sections**: Should use `<section>` wrapper

### Image URL Validation
Detects broken placeholder services:
- placeholder.com
- via.placeholder.com
- placehold.it
- placekitten.com
- lorempixel.com
- dummyimage.com

Suggests Unsplash URLs as replacements.

### Code Block Validation
Ensures proper syntax:
- Matched `<script>` open/close tags
- Matched `<style>` open/close tags

### MDN Compatibility
Checks CSS and HTML against MDN browser compatibility data.

### Semantic HTML
Validates proper HTML structure:
- Heading hierarchy (h1 > h2 > h3)
- Proper landmark usage
- Form accessibility

### Accessibility (a11y)
Checks common a11y issues:
- Color contrast
- ARIA attributes
- Focus management
- Screen reader support

## Pipeline Architecture

```
Input → Parse → Generate → Validate → Render → Output
         ↓         ↓          ↓
      Intent    System     Structure
    Detection   Prompt     Checking
```

### Parse Stage
- Extracts prompt from various input types (markdown, image, file)
- Detects intent using pattern matching
- Estimates complexity

### Generate Stage
- Selects system prompt based on intent
- Streams LLM response
- Injects data-oid attributes for source mapping

### Validate Stage
- Runs all validation checks
- Calculates quality score
- Generates issue report

### Render Stage
- Compiles Svelte to HTML
- Injects Tailwind CDN
- Prepares preview payload

## Chronicle System

IndexedDB-based persistence for tracking generations.

### Data Model

```typescript
interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface Snapshot {
  id: string
  projectId: string
  prompt: string
  code: string
  intent: Intent
  timestamp: number
}

interface Artifact {
  id: string
  snapshotId: string
  type: 'component' | 'page' | 'style'
  content: string
  metadata: Record<string, unknown>
}
```

### Operations
- Create/update/delete projects
- Save snapshots with versioning
- Track artifacts per snapshot
- Query history by date range

## LLM Provider System

Hot-swappable provider architecture.

### Supported Providers

| Provider | API Key Env | Base URL Env | Default Model |
|----------|-------------|--------------|---------------|
| Claude | `ANTHROPIC_API_KEY` | - | claude-sonnet-4-20250514 |
| OpenAI | `OPENAI_API_KEY` | - | gpt-4o |
| Ollama | - | `OLLAMA_BASE_URL` | codellama:13b |
| LM Studio | - | `LMSTUDIO_BASE_URL` | devstral-small-2 |
| Zhipu | `ZHIPU_API_KEY` | `ZHIPU_BASE_URL` | glm-4 |

### Auto-Detection Priority
1. Explicit `LLM_PROVIDER` env var
2. Available API keys (Claude > OpenAI > Zhipu)
3. Default to Ollama (local)

### Runtime Switching
```typescript
const llm = getLLM()
llm.switchProvider('openai', { model: 'gpt-4o' })
```

## API Endpoints

### POST /api/generate
Stream UI generation.

```typescript
// Request
{
  prompt: string
  figmaTokens?: FigmaDesignTokens
}

// Response: Server-Sent Events
event: chunk
data: { content: "...", done: false }

event: complete
data: { code: "...", html: "...", intent: "page" }
```

### POST /api/render
Render code to preview HTML.

```typescript
// Request
{ code: string }

// Response
{ html: string, css: string }
```

### GET /api/provider
Get current provider info.

```typescript
// Response
{ provider: "claude", model: "claude-sonnet-4-20250514" }
```

### POST /api/provider
Switch provider.

```typescript
// Request
{ provider: "openai", model?: "gpt-4o" }
```

### GET /api/provider/health
Test provider connection.

```typescript
// Response
{ ok: true, latencyMs: 234 }
```

### POST /api/figma/extract
Extract design tokens from Figma.

```typescript
// Request
{ fileKey: string, accessToken: string }

// Response
{
  colors: { primary: {...}, secondary: {...} },
  typography: { fontFamilies: [...], fontSizes: [...] },
  spacing: {...},
  borderRadii: {...}
}
```

## Visual Editor

### Element Selection
Click elements in preview to select them. The overlay shows:
- Element tag and classes
- Bounding box highlight
- Breadcrumb path

### Style Inspector
View and edit computed styles:
- Typography (font, size, weight, color)
- Spacing (margin, padding)
- Layout (display, position)
- Background and borders

### Context Menu
Right-click for quick actions:
- Copy element
- Delete element
- Wrap in container
- Add sibling

### Code Sync
Changes in the visual editor sync to code via data-oid mapping:
- Each element gets a unique `data-oid` attribute
- Source map tracks oid → line number
- Edits update the corresponding source location
