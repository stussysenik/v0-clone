# Proposal: Unified Visual Editor with Chat Interface

**Change ID**: 003-unified-visual-editor
**Status**: Proposed
**Created**: 2026-01-19
**Type**: Architecture Change + New Feature

---

## Problem Statement

### Current UX Confusion: Dual-Prompt Anti-Pattern

The studio currently has **THREE separate input mechanisms** that confuse users:

1. **Editor.svelte** (left panel, Prompt tab) - Has its own `promptInput` state
2. **Welcome.svelte** (right panel, empty state) - Has its own `prompt` state
3. **FileLoader.svelte** (file drag-drop) - Separate input method

**Critical Issues**:
- ❌ **State inconsistency**: Prompts in Editor and Welcome don't sync
- ❌ **Unclear mental model**: Which input is primary?
- ❌ **Workflow confusion**: After generation, user doesn't know where to iterate
- ❌ **Missing visual editing**: No way to directly manipulate generated UI
- ❌ **Code-only iteration**: Must write prompts to change colors, spacing, etc.

### User Expectations (Based on Industry Research)

After researching modern visual editors in 2026:

**Onlook.dev** ([source](https://blog.logrocket.com/onlook-react-visual-editor/)):
- Visual-first interface with direct manipulation (drag elements, adjust styles)
- AI chat sidebar for creating/editing complex changes
- Two-way sync: visual edits → code updates, code changes → visual updates
- Right-click any element to jump to code

**Cursor Visual Browser** ([source](https://cursor.com/blog/browser-visual-editor)):
- Browser sidebar shows component tree
- Drag elements, inspect props, test layouts in real-time
- Tell AI agent to apply visual changes to code
- Unified workflow: design visually → agent implements

**Figma MCP** ([source](https://www.figma.com/blog/introducing-figma-mcp-server/)):
- Design context flows directly into development tools
- Variables and components accessible via Model Context Protocol
- AI agents understand design intent from Figma files

### What Users Need

1. **Single source of truth** for prompts/chat
2. **Visual editing** for quick tweaks (colors, spacing, layout)
3. **AI chat** for complex changes and new features
4. **Clear workflow**: Generate → Edit Visually → Refine via Chat → Export Code
5. **Fast iteration**: Click to change, not prompt to change

---

## Proposed Solution: Three-Panel Visual Editor Architecture

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Theme Toggle | DevInfo                      │
├──────────────┬─────────────────────────┬────────────────────┤
│              │                         │                    │
│  Chat Panel  │    Canvas (Preview)     │   Code Inspector   │
│   (25%)      │         (50%)           │      (25%)         │
│              │                         │                    │
│  • Prompt    │  • Visual editor        │  • Generated code  │
│  • Examples  │  • Component tree       │  • Editable        │
│  • History   │  • DevTools overlay     │  • Syntax highlight│
│  • AI chat   │  • Direct manipulation  │  • Copy/export     │
│              │                         │                    │
└──────────────┴─────────────────────────┴────────────────────┘
```

### Component Architecture

#### 1. **Chat Panel (Left, 25%)**
**Purpose**: Single, unified input for ALL prompts and AI interaction

**States**:
- **Empty state**: Welcome message with example prompts
- **Chat history**: Conversation thread with AI
- **Active input**: Textarea with Cmd+Enter to send

**Features**:
- Persistent chat history (survives page refresh)
- Example prompt buttons (clickable to populate input)
- "Start Over" button (clears canvas and starts new chat)
- Message types: User prompt, AI response, System notification
- **Eliminates**: Dual-prompt confusion (ONE place to type)

**New Component**: `apps/studio/src/lib/ChatPanel.svelte`

#### 2. **Canvas (Center, 50%)**
**Purpose**: Visual editor with direct manipulation + live preview

**Modes**:
- **Empty state**: "Type a prompt to generate your first component"
- **Preview mode**: Live iframe with generated UI
- **Visual edit mode**: Onlook-style overlay for direct manipulation

**Visual Editing Features** (Inspired by Onlook):
- **Select elements**: Click any element to select
- **Drag to reposition**: Move elements within parent containers
- **Style inspector**: Inline controls for Tailwind classes
  - Colors (bg, text, border)
  - Spacing (padding, margin)
  - Size (width, height)
  - Typography (font, size, weight)
- **Component tree**: Sidebar showing DOM hierarchy
- **Right-click menu**: "Edit in Code", "Ask AI to modify", "Delete"

**DevTools Integration** (Already implemented):
- Grid overlay toggle
- Ruler overlay toggle
- Viewport controls (mobile/tablet/desktop)
- Screenshot tool

**New Components**:
- `apps/studio/src/lib/Canvas.svelte` (replaces Preview.svelte)
- `apps/studio/src/lib/VisualEditor.svelte` (new overlay system)
- `apps/studio/src/lib/ElementSelector.svelte` (click-to-select)
- `apps/studio/src/lib/StyleInspector.svelte` (inline style controls)

#### 3. **Code Inspector (Right, 25%)**
**Purpose**: View and manually edit generated code

**Features**:
- Syntax-highlighted code display
- Editable (user can manually tweak code)
- **Two-way sync**: Code edits → Canvas updates
- Copy button (copy to clipboard)
- Export options (download as .svelte, .tsx, etc.)
- File tree (if multiple components generated)

**New Component**: `apps/studio/src/lib/CodeInspector.svelte`

---

## Workflow: How It Works

### Workflow A: Generate from Scratch

```
1. User types prompt in Chat Panel
   ↓
2. AI generates code → streams to Code Inspector
   ↓
3. Canvas renders live preview
   ↓
4. User can:
   - Chat: "Make the button bigger"
   - Visual: Click button, adjust size in style inspector
   - Code: Directly edit Tailwind classes
```

### Workflow B: Visual Editing (NEW!)

```
1. User clicks element in Canvas
   ↓
2. Style Inspector appears with controls
   ↓
3. User adjusts color/spacing/size
   ↓
4. Changes apply to Canvas + Code Inspector updates
   ↓
5. User can "Apply to Code" → AI agent writes change to code
```

### Workflow C: Chat-Based Iteration

```
1. User types: "Add a dark mode toggle"
   ↓
2. AI modifies existing code (incremental change)
   ↓
3. Canvas updates, Code Inspector shows diff
   ↓
4. User approves or requests changes
```

### Workflow D: Direct Code Editing

```
1. User switches to Code Inspector tab
   ↓
2. Edits Tailwind classes manually
   ↓
3. Canvas auto-refreshes (like hot reload)
```

---

## Data Flow Architecture

### State Management (+page.svelte)

```typescript
// Unified state
let chatHistory = $state<Message[]>([])
let currentPrompt = $state('')
let generatedCode = $state('')
let previewHtml = $state('')
let selectedElement = $state<DOMElement | null>(null)
let styleEdits = $state<StyleEdit[]>([]) // Track visual edits

// Generation pipeline
async function handleChatSubmit(prompt: string) {
  chatHistory = [...chatHistory, { role: 'user', content: prompt }]
  await generateFromPrompt(prompt)
}

// Visual editing pipeline
function handleElementSelect(element: DOMElement) {
  selectedElement = element
  // Show style inspector
}

function handleStyleChange(property: string, value: string) {
  styleEdits = [...styleEdits, { element: selectedElement, property, value }]
  // Update canvas immediately (optimistic UI)
  // Ask AI to apply to code
}

// Code editing pipeline
function handleCodeChange(newCode: string) {
  generatedCode = newCode
  // Re-render canvas
  renderToPreview(newCode)
}
```

### Component Communication

```
ChatPanel
    ↓ (onSubmit)
+page.svelte (state manager)
    ↓ (generateFromPrompt)
Pipeline API
    ↓ (stream response)
Code Inspector (display code)
    ↓ (render)
Canvas (show preview)
    ↓ (onClick)
Visual Editor (select element)
    ↓ (onStyleChange)
+page.svelte (apply changes)
    ↓ (AI agent call)
Code Inspector (update code)
```

---

## Implementation Plan

### Phase 1: Restructure Layout (Foundation)
**Goal**: Remove dual-prompt confusion, establish 3-panel layout

**Tasks**:
1. Create `ChatPanel.svelte` - unified chat interface
   - Move prompt input from Editor.svelte
   - Add chat history UI
   - Add example prompts from Welcome.svelte
2. Rename `Preview.svelte` → `Canvas.svelte`
   - Remove Welcome component (now in ChatPanel)
   - Keep DevTools integration
3. Create `CodeInspector.svelte` - code display panel
   - Move code view from Editor.svelte
   - Add syntax highlighting
   - Add copy/export buttons
4. Update `+page.svelte` layout:
   - Replace 50/50 split with 25/50/25 split
   - Add resizable dividers
   - Remove FileLoader (move to ChatPanel header)

**Success Criteria**:
- ✅ Only ONE input field for prompts (in ChatPanel)
- ✅ Clear visual separation: Chat | Canvas | Code
- ✅ No state duplication

### Phase 2: Visual Editing Layer (Core Feature)
**Goal**: Enable direct manipulation of generated UI

**Tasks**:
1. Create `VisualEditor.svelte` - overlay system
   - Click-to-select any element
   - Show bounding box on hover
   - Right-click context menu
2. Create `ElementSelector.svelte` - selection logic
   - DOM traversal and selection
   - Highlight selected element
   - Show element path (breadcrumb)
3. Create `StyleInspector.svelte` - inline controls
   - Color picker for bg/text/border
   - Spacing controls (padding/margin sliders)
   - Size controls (width/height inputs)
   - Typography controls (font, size, weight)
4. Implement two-way sync:
   - Visual edit → update iframe DOM
   - Visual edit → trigger AI to update code
   - Code edit → re-render canvas

**Success Criteria**:
- ✅ Click element in canvas → shows style inspector
- ✅ Change color in inspector → canvas updates instantly
- ✅ Click "Apply to Code" → AI modifies generatedCode
- ✅ Edit code manually → canvas re-renders

### Phase 3: Chat-Based Iteration (AI Integration)
**Goal**: Seamless chat interface for complex changes

**Tasks**:
1. Update `ChatPanel.svelte`:
   - Add message history rendering
   - Add "Ask AI" quick actions (from selected element)
   - Add prompt suggestions based on context
2. Enhance AI pipeline:
   - Support incremental updates (not full regeneration)
   - Support "modify this element" prompts
   - Support "make it look like this" with visual context
3. Add context awareness:
   - When element selected, AI knows which element to modify
   - When user says "the button", AI identifies which button
   - When user uploads image, AI extracts visual style

**Success Criteria**:
- ✅ Select button, type "make it bigger" → AI modifies that button
- ✅ Chat history persists across sessions
- ✅ AI understands visual context (selected element)

### Phase 4: Code Export & Production (Polish)
**Goal**: Make it easy to use generated code in production

**Tasks**:
1. Add export options in CodeInspector:
   - Download as .svelte file
   - Download as .tsx (React)
   - Download as .vue (Vue)
   - Copy to clipboard (formatted)
2. Add component extraction:
   - "Extract as Component" button
   - Generate props interface
   - Generate usage example
3. Add code quality:
   - Prettier formatting
   - ESLint validation
   - TypeScript types

**Success Criteria**:
- ✅ Click "Export" → downloads formatted .svelte file
- ✅ Code is production-ready (no cleanup needed)
- ✅ Extracted components have proper TypeScript types

---

## Technical Specifications

### ChatPanel.svelte API

```typescript
interface Props {
  onSubmit: (prompt: string) => void
  history: Message[]
  isGenerating: boolean
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}
```

### Canvas.svelte API

```typescript
interface Props {
  html: string
  visualEditMode: boolean
  selectedElement: DOMElement | null
  onElementSelect: (element: DOMElement) => void
  onStyleChange: (property: string, value: string) => void
}
```

### CodeInspector.svelte API

```typescript
interface Props {
  code: string
  language: 'svelte' | 'tsx' | 'vue'
  onCodeChange: (newCode: string) => void
  onExport: (format: ExportFormat) => void
}
```

### VisualEditor.svelte API

```typescript
interface Props {
  iframe: HTMLIFrameElement
  selectedElement: DOMElement | null
  onSelect: (element: DOMElement) => void
}

// Overlay injection into iframe
function injectEditorOverlay(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument
  // Add click listeners
  // Add hover effects
  // Add selection UI
}
```

---

## Breaking Changes

### Removed Components
- ❌ `Editor.svelte` (replaced by ChatPanel + CodeInspector)
- ❌ `Welcome.svelte` (integrated into ChatPanel)
- ❌ `FileLoader.svelte` (moved to ChatPanel header)

### Changed Components
- ⚠️ `Preview.svelte` → `Canvas.svelte` (new API)
- ⚠️ `+page.svelte` (new layout, new state structure)

### Migration Path
1. Keep old components temporarily
2. Add new components alongside
3. Feature flag to toggle between old/new UI
4. Test new UI thoroughly
5. Remove old components after validation

---

## Acceptance Criteria

### Must Have (P0)
- ✅ Single unified chat input (no dual prompts)
- ✅ Three-panel layout (Chat | Canvas | Code)
- ✅ Visual element selection (click to select)
- ✅ Style inspector with color/spacing controls
- ✅ Two-way sync (visual edits ↔ code updates)
- ✅ Chat-based iteration works
- ✅ Code export works

### Should Have (P1)
- ✅ Component extraction
- ✅ Drag-to-reposition elements
- ✅ Right-click context menu
- ✅ Keyboard shortcuts (Cmd+K for chat, Cmd+E for visual edit)
- ✅ Undo/redo for visual edits

### Nice to Have (P2)
- ⭕ Multi-component projects
- ⭕ Component library (save/reuse components)
- ⭕ Collaboration (share via URL)
- ⭕ Design tokens extraction

---

## Verification & Testing

### Manual Testing
1. **Chat Flow**:
   - Type prompt → verify code generates → verify canvas renders
   - Send follow-up prompt → verify incremental update works
2. **Visual Editing**:
   - Click element → verify selection works
   - Change color → verify canvas updates + code updates
   - Drag element → verify reposition works
3. **Code Editing**:
   - Edit code manually → verify canvas re-renders
   - Export code → verify download works

### Automated Testing
1. **Unit Tests**:
   - ChatPanel message rendering
   - StyleInspector value changes
   - CodeInspector export logic
2. **Integration Tests**:
   - Chat submit → generation → canvas render
   - Visual edit → AI update → code change
   - Code edit → canvas refresh
3. **E2E Tests** (Playwright):
   - Full workflow: prompt → generate → edit → export
   - Multi-step iteration: prompt → edit → prompt → edit
   - Error handling: invalid prompt, failed generation

---

## Success Metrics

### UX Metrics
- **Reduced confusion**: User interviews show clear understanding of where to input prompts
- **Faster iteration**: Average time from "I want to change X" to "X is changed" < 10 seconds
- **Increased visual editing**: 60%+ of edits done visually (not via prompts)

### Technical Metrics
- **Performance**: Canvas updates < 100ms after visual edit
- **Code quality**: Exported code passes Prettier + ESLint
- **Reliability**: Two-way sync works 99%+ of the time

---

## Future Enhancements

### Beyond This Change
1. **Real-time collaboration** (multiple users editing same project)
2. **Component library** (save/share reusable components)
3. **Design system integration** (import from Figma via MCP)
4. **Advanced AI features**:
   - "Make it look like [screenshot]"
   - "Apply the style from [component] to [other component]"
   - Auto-responsive design suggestions
5. **Production deployment**:
   - Git integration (commit changes)
   - Deploy to Vercel/Netlify
   - Live preview URL

---

## Sources & Research

- [Onlook: A React visual editor - LogRocket](https://blog.logrocket.com/onlook-react-visual-editor/)
- [Onlook GitHub Repository](https://github.com/onlook-dev/onlook)
- [Cursor Visual Browser Announcement](https://cursor.com/blog/browser-visual-editor)
- [Figma MCP Server Introduction](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Guide to Figma MCP Server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)

---

## Next Steps

1. **Review this proposal** with team/stakeholders
2. **Approve or request changes**
3. **Create implementation tasks** (break down into smaller work items)
4. **Execute Phase 1** (layout restructure)
5. **Iterate on Phases 2-4** with user feedback

**Estimated Timeline**: 3-4 weeks for full implementation
- Phase 1: 1 week
- Phase 2: 1.5 weeks
- Phase 3: 1 week
- Phase 4: 0.5 week

---

**Status**: ⏳ Awaiting Approval
