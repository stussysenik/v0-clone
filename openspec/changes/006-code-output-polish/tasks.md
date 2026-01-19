# Tasks: Code Output Panel Polish

## Change ID: `006-code-output-polish`

---

## Phase 1: Core Highlighting (P0)

### Task 1.1: Install and Configure Shiki
- [ ] Add `shiki` to `apps/studio/package.json`
- [ ] Run `bun install`
- [ ] Verify Shiki loads correctly

**Verification**: `import { codeToHtml } from 'shiki'` works without errors

### Task 1.2: Create Highlighter Utility
- [ ] Create `apps/studio/src/lib/utils/highlighter.ts`
- [ ] Implement `highlight(code, lang, theme)` function
- [ ] Add result caching with LRU strategy (max 50 entries)
- [ ] Handle errors gracefully (fallback to plain text)
- [ ] Pre-load Svelte language grammar

**Verification**: Unit test highlighting Svelte code returns HTML with token classes

### Task 1.3: Create CodeDisplay Component
- [ ] Create `apps/studio/src/lib/editor/CodeDisplay.svelte`
- [ ] Accept `code`, `language`, `theme` props
- [ ] Use Shiki to generate highlighted HTML
- [ ] Render with proper container styling
- [ ] Handle empty/loading states

**Verification**: Manually test with sample Svelte code shows colored tokens

### Task 1.4: Integrate into CodeInspector
- [ ] Import CodeDisplay into CodeInspector.svelte
- [ ] Replace `<pre><code>` with `<CodeDisplay>`
- [ ] Pass current code and language
- [ ] Default theme: `one-dark-pro` for dark, `github-light` for light

**Verification**: Generated code in Studio shows syntax highlighting

---

## Phase 2: Theme System (P1)

### Task 2.1: Create ThemePicker Component
- [ ] Create `apps/studio/src/lib/editor/ThemePicker.svelte`
- [ ] Implement dropdown with Bits UI Select
- [ ] Theme options: One Dark Pro, GitHub Dark, Dracula, Tokyo Night, GitHub Light, One Light
- [ ] Show color preview swatches
- [ ] Emit `onThemeChange` event

**Verification**: Dropdown opens and shows all theme options with previews

### Task 2.2: Implement Theme Persistence
- [ ] Store selected theme in localStorage (`code-editor-theme`)
- [ ] Load theme on mount in CodeInspector
- [ ] Sync with app theme (suggest dark themes when app is dark)
- [ ] Add `$effect` to re-highlight when theme changes

**Verification**: Select theme, refresh page, theme persists

### Task 2.3: Add Theme CSS Variables
- [ ] Add editor-specific CSS variables to app.css
- [ ] Map Shiki theme colors to CSS variables
- [ ] Support smooth transition between themes

**Verification**: Theme change animates smoothly

---

## Phase 3: Editor Chrome (P1)

### Task 3.1: Create LineNumbers Component
- [ ] Create `apps/studio/src/lib/editor/LineNumbers.svelte`
- [ ] Accept `lineCount` prop
- [ ] Render numbered gutter with fixed width
- [ ] Style to match editor theme
- [ ] Align with code lines

**Verification**: Line numbers display 1-N matching code lines

### Task 3.2: Create EditorSettings Component
- [ ] Create `apps/studio/src/lib/editor/EditorSettings.svelte`
- [ ] Implement popover with Bits UI Popover
- [ ] Font size select (12, 14, 16, 18px)
- [ ] Line height select (1.4, 1.6, 1.8)
- [ ] Tab size select (2, 4)
- [ ] Checkboxes: Line Numbers, Word Wrap

**Verification**: Settings popover opens, changes apply immediately

### Task 3.3: Implement Settings Persistence
- [ ] Store settings in localStorage (`code-editor-settings`)
- [ ] Load settings on mount
- [ ] Apply settings as CSS variables
- [ ] Reset to defaults option

**Verification**: Change font size, refresh, setting persists

### Task 3.4: Update CodeInspector Layout
- [ ] Add header bar with Theme/Settings/Actions
- [ ] Integrate ThemePicker dropdown
- [ ] Integrate EditorSettings gear button
- [ ] Arrange buttons: Theme, Settings, Edit, Copy, Export

**Verification**: All controls visible and functional in header

---

## Phase 4: Polish (P2)

### Task 4.1: Streaming Line Highlight
- [ ] Detect when new lines are added during streaming
- [ ] Add subtle highlight animation to new lines
- [ ] Fade highlight after 500ms
- [ ] Respect reduced-motion preference

**Verification**: During generation, new lines pulse briefly

### Task 4.2: Token Count Display
- [ ] Add token/character count to footer
- [ ] Show line count
- [ ] Update during streaming
- [ ] Format: "42 lines • 1,234 chars"

**Verification**: Footer shows accurate counts

### Task 4.3: Create Minimap Component (Optional)
- [ ] Create `apps/studio/src/lib/editor/Minimap.svelte`
- [ ] Render scaled-down code preview
- [ ] Highlight visible viewport
- [ ] Click to scroll to position
- [ ] Toggle via settings

**Verification**: Minimap shows code overview, clicking scrolls

### Task 4.4: Keyboard Shortcuts
- [ ] Cmd/Ctrl + Plus: Increase font size
- [ ] Cmd/Ctrl + Minus: Decrease font size
- [ ] Cmd/Ctrl + 0: Reset to default size
- [ ] Show shortcuts in tooltips

**Verification**: Keyboard shortcuts work when editor focused

---

## Phase 5: Final Polish (P2)

### Task 5.1: Export Barrel File
- [ ] Create `apps/studio/src/lib/editor/index.ts`
- [ ] Export all editor components

### Task 5.2: Documentation
- [ ] Add JSDoc comments to all components
- [ ] Document highlighter API

### Task 5.3: Performance Testing
- [ ] Test highlighting 1000+ line files
- [ ] Verify < 50ms highlight time
- [ ] Check memory usage with caching

**Verification**: Profile in DevTools shows acceptable performance

---

## Dependency Graph

```
Task 1.1 ─────┐
              ├─► Task 1.2 ─► Task 1.3 ─► Task 1.4
              │
Task 2.3 ◄────┤
              │
Task 2.1 ─────┼─► Task 2.2
              │
Task 3.1 ─────┤
Task 3.2 ─────┼─► Task 3.3 ─► Task 3.4
              │
Task 4.1 ─────┤
Task 4.2 ─────┼─► (can run in parallel)
Task 4.3 ─────┤
Task 4.4 ─────┘
```

---

## Estimated Effort

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 1 | 4 | ~2 hours |
| Phase 2 | 3 | ~1.5 hours |
| Phase 3 | 4 | ~2 hours |
| Phase 4 | 4 | ~2 hours |
| Phase 5 | 3 | ~30 mins |

**Total**: ~8 hours

---

## Acceptance Criteria

- [ ] All Phase 1 tasks complete (syntax highlighting works)
- [ ] All Phase 2 tasks complete (themes selectable)
- [ ] All Phase 3 tasks complete (settings work)
- [ ] Code display looks professional and polished
- [ ] Performance within budget (< 50ms highlight)
- [ ] Accessibility requirements met
