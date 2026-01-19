# OpenSpec Proposal: Code Output Panel Polish

## Change ID: `006-code-output-polish`

**Status**: PROPOSED
**Type**: Feature Enhancement
**Priority**: High

---

## Executive Summary

Transform the CodeInspector panel from a basic `<pre>` tag into a **polished, professional code editor experience** with:

1. **Syntax highlighting** - Using Shiki for GitHub/Atom-quality highlighting
2. **Dev color themes** - One Dark Pro, GitHub Dark, Dracula, and custom themes
3. **Visualization options** - Font size, line numbers, word wrap, minimap
4. **Streaming polish** - Live token highlighting during generation

---

## Problem Statement

The current CodeInspector.svelte displays generated code in a plain `<pre><code>` block:
- No syntax highlighting
- No line numbers
- No visual feedback during streaming
- Basic textarea for editing
- No theme customization

This creates a jarring contrast with professional IDEs and code editors users expect.

---

## Proposed Solution

### 1. Syntax Highlighting with Shiki

**Why Shiki?**
- Same highlighting engine as VS Code
- Supports 150+ languages out of the box
- Multiple theme support (One Dark, GitHub, Dracula)
- Works in browser and server
- Tree-sitter based accuracy
- ~40KB bundle size (acceptable)

```typescript
import { codeToHtml } from 'shiki'

const html = await codeToHtml(code, {
  lang: 'svelte',
  theme: 'one-dark-pro'
})
```

### 2. Theme System

Add editor-specific themes that sync with app theme:

| App Theme | Editor Theme Options |
|-----------|---------------------|
| Light | GitHub Light, One Light, Catppuccin Latte |
| Dark | One Dark Pro, GitHub Dark, Dracula, Tokyo Night |

Store preference in localStorage: `code-editor-theme`

### 3. Visualization Options Panel

New settings accessible via gear icon:

```typescript
interface EditorSettings {
  fontSize: 12 | 14 | 16 | 18        // px
  lineHeight: 1.4 | 1.6 | 1.8        // multiplier
  showLineNumbers: boolean
  wordWrap: boolean
  showMinimap: boolean
  tabSize: 2 | 4
}
```

### 4. Streaming Enhancements

During generation:
- Show line numbers incrementing
- Highlight newly added lines with subtle pulse
- Show cursor position at end
- Token count in footer

---

## UI/UX Design

### Header Bar
```
┌─────────────────────────────────────────────────────────┐
│ Code                    [Theme ▾] [Settings ⚙] [Edit] [Copy] [Export] │
└─────────────────────────────────────────────────────────┘
```

### Code Display
```
┌──┬──────────────────────────────────────────┬───┐
│1 │ <script lang="ts">                       │░░░│
│2 │   import { fade } from 'svelte/transition';│░░░│
│3 │                                          │░░░│
│4 │   let count = $state(0);                 │░░░│ ← minimap
│5 │ </script>                                │░░░│
│6 │                                          │░░░│
│7 │ <div transition:fade>                    │░░░│
│8 │   <button onclick={() => count++}>      │░░░│
│9 │     Count: {count}                       │░░░│
│10│   </button>                              │░░░│
│11│ </div>                                   │░░░│
└──┴──────────────────────────────────────────┴───┘
```

### Settings Popover
```
┌─────────────────────────┐
│ Editor Settings         │
├─────────────────────────┤
│ Font Size:  [14px ▾]    │
│ Line Height: [1.6 ▾]    │
│ Tab Size:   [2 ▾]       │
├─────────────────────────┤
│ ☑ Line Numbers          │
│ ☐ Word Wrap             │
│ ☐ Minimap               │
└─────────────────────────┘
```

---

## Technical Architecture

### Dependencies

```json
{
  "shiki": "^1.0.0"
}
```

### Component Structure

```
apps/studio/src/lib/
├── CodeInspector.svelte      # Main container (modified)
├── editor/
│   ├── CodeDisplay.svelte    # Highlighted code view
│   ├── CodeEditor.svelte     # Editable textarea with highlighting
│   ├── LineNumbers.svelte    # Line number gutter
│   ├── Minimap.svelte        # Code overview minimap
│   ├── EditorSettings.svelte # Settings popover
│   └── ThemePicker.svelte    # Theme selection dropdown
└── utils/
    └── highlighter.ts        # Shiki wrapper with caching
```

### CSS Variables (Editor-Specific)

```css
:root {
  /* Editor tokens - mapped from Shiki theme */
  --editor-bg: var(--shiki-bg);
  --editor-fg: var(--shiki-fg);
  --editor-gutter-bg: var(--color-bg-secondary);
  --editor-gutter-fg: var(--color-text-muted);
  --editor-selection: rgba(59, 130, 246, 0.3);
  --editor-line-highlight: rgba(255, 255, 255, 0.05);

  /* Font */
  --editor-font: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  --editor-font-size: 14px;
  --editor-line-height: 1.6;
}
```

---

## Implementation Phases

### Phase 1: Core Highlighting (P0)
- Install and configure Shiki
- Create highlighter.ts utility with caching
- Update CodeInspector to use highlighted output
- Add One Dark Pro theme as default

### Phase 2: Theme System (P1)
- Add ThemePicker dropdown
- Implement 6 built-in themes
- Persist preference to localStorage
- Sync with app light/dark mode

### Phase 3: Editor Chrome (P1)
- Add LineNumbers component
- Add EditorSettings popover
- Implement font size/line height controls

### Phase 4: Polish (P2)
- Add Minimap component (optional feature)
- Streaming line highlighting
- Token count display
- Keyboard shortcuts (Cmd+Plus/Minus for zoom)

---

## Performance Considerations

1. **Lazy Loading**: Load Shiki only when code is present
2. **Caching**: Cache highlighted HTML for identical code strings
3. **Debouncing**: During streaming, batch highlight updates (100ms)
4. **Worker**: Consider Web Worker for highlighting large files
5. **Bundle**: Use dynamic import for theme files

---

## Accessibility

- Line numbers use `aria-hidden` (decorative)
- Code block uses `role="code"` with proper labeling
- Theme picker announces selection
- Keyboard navigation for all controls
- Respect `prefers-reduced-motion` for streaming animations

---

## Files Summary

### Create (8 files)
- `apps/studio/src/lib/editor/CodeDisplay.svelte`
- `apps/studio/src/lib/editor/CodeEditor.svelte`
- `apps/studio/src/lib/editor/LineNumbers.svelte`
- `apps/studio/src/lib/editor/Minimap.svelte`
- `apps/studio/src/lib/editor/EditorSettings.svelte`
- `apps/studio/src/lib/editor/ThemePicker.svelte`
- `apps/studio/src/lib/utils/highlighter.ts`
- `apps/studio/src/lib/editor/index.ts`

### Modify (2 files)
- `apps/studio/src/lib/CodeInspector.svelte` - Integrate new components
- `apps/studio/src/app.css` - Add editor CSS variables

### Dependencies
- `shiki@^1.0.0` - Syntax highlighting

---

## Success Criteria

1. Code displays with accurate Svelte/TypeScript syntax highlighting
2. Users can switch between 6+ color themes
3. Settings persist across sessions
4. Performance: Highlight 1000 lines < 50ms
5. Streaming code shows visual feedback
6. All controls are keyboard accessible

---

## Open Questions

1. Should we support custom theme import (JSON)?
2. Include code folding in Phase 1 or defer?
3. Add diff view for before/after edits?
