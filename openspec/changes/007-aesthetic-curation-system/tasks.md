# Tasks: Aesthetic Curation System

## Change ID: `007-aesthetic-curation-system`

---

## Phase 1: Core Infrastructure (P0)

### Task 1.1: Define Aesthetic Types
- [ ] Add `AestheticDimension` interface to `packages/shared/src/types.ts`
- [ ] Add `AestheticPreset` interface
- [ ] Add `AestheticProfile` interface
- [ ] Export types from shared package

**Verification**: Types compile without errors, can import in studio

### Task 1.2: Create DimensionSlider Component
- [ ] Create `apps/studio/src/lib/aesthetics/DimensionSlider.svelte`
- [ ] Use Bits UI Slider as base
- [ ] Display min/max labels
- [ ] Show current value indicator
- [ ] Emit value changes
- [ ] Style with CSS variables

**Verification**: Slider renders, dragging updates value, labels show

### Task 1.3: Create Aesthetic Prompt Generator
- [ ] Create `packages/pipeline/src/stages/aesthetic.ts`
- [ ] Implement `generateAestheticPrompt(profile)` function
- [ ] Map dimension values to descriptive terms
- [ ] Combine into coherent prompt section
- [ ] Unit test with various profiles

**Verification**: Unit tests pass, output includes relevant aesthetic terms

### Task 1.4: Define Default Dimensions
- [ ] Create `apps/studio/src/lib/aesthetics/dimensions.ts`
- [ ] Define 12 dimensions across 4 categories
- [ ] Set sensible defaults (50 for all)
- [ ] Include descriptions for tooltips

**Verification**: Dimensions load, have correct structure

---

## Phase 2: Panel UI (P0)

### Task 2.1: Create DimensionCategory Component
- [ ] Create `apps/studio/src/lib/aesthetics/DimensionCategory.svelte`
- [ ] Accept category name and dimensions array
- [ ] Render category header
- [ ] Render DimensionSlider for each dimension
- [ ] Support collapsed/expanded state

**Verification**: Category renders with multiple sliders

### Task 2.2: Create AestheticsPanel Component
- [ ] Create `apps/studio/src/lib/aesthetics/AestheticsPanel.svelte`
- [ ] Accept `profile` prop (bindable)
- [ ] Render all 4 categories
- [ ] Add preset picker at top
- [ ] Style with collapsible animation
- [ ] Use Bits UI Collapsible

**Verification**: Panel renders all categories, can collapse/expand

### Task 2.3: Define Built-in Presets
- [ ] Create `apps/studio/src/lib/aesthetics/presets.ts`
- [ ] Define 6 presets: Minimalist, Brutalist, Organic, Technical, Playful, Editorial
- [ ] Each preset sets all 12 dimension values
- [ ] Include descriptions and tags

**Verification**: Presets load, applying preset updates all sliders

### Task 2.4: Create PresetPicker Component
- [ ] Create `apps/studio/src/lib/aesthetics/PresetPicker.svelte`
- [ ] Use Bits UI Select as base
- [ ] Show preset name and description
- [ ] Emit `onPresetSelect` event
- [ ] Show "Custom" when values don't match any preset

**Verification**: Dropdown shows presets, selecting one emits event

---

## Phase 3: Integration (P1)

### Task 3.1: Integrate with ChatPanel
- [ ] Import AestheticsPanel into ChatPanel.svelte
- [ ] Add collapsible "Aesthetics" section above input
- [ ] Store aesthetic profile in component state
- [ ] Pass profile to parent on generation

**Verification**: Aesthetics section visible in chat panel

### Task 3.2: Update Generate API
- [ ] Modify `/api/generate` to accept aesthetic profile
- [ ] Generate aesthetic prompt section
- [ ] Prepend to system prompt

**Verification**: Generation request includes aesthetic guidance

### Task 3.3: Update Pipeline Integration
- [ ] Import aesthetic prompt generator in generate stage
- [ ] Include aesthetic context in LLM messages
- [ ] Log aesthetic profile in telemetry

**Verification**: Pipeline logs show aesthetic prompt included

### Task 3.4: Persist Preferences
- [ ] Store aesthetic profile in localStorage (`aesthetic-profile`)
- [ ] Load on mount
- [ ] Update on any dimension change
- [ ] Include active preset name

**Verification**: Change sliders, refresh, values persist

---

## Phase 4: Polish (P2)

### Task 4.1: Create PresetCard Component
- [ ] Create `apps/studio/src/lib/aesthetics/PresetCard.svelte`
- [ ] Visual preview of aesthetic (abstract shapes)
- [ ] Show preset name and description
- [ ] Hover state with "Apply" action

**Verification**: Cards render with visual previews

### Task 4.2: Add Preset Gallery View
- [ ] Add toggle between dropdown and gallery view
- [ ] Gallery shows 6 PresetCards in grid
- [ ] Clicking card applies preset

**Verification**: Can switch to gallery, clicking applies preset

### Task 4.3: Slider Animations
- [ ] Add smooth transition on value change
- [ ] Animate track fill
- [ ] Animate thumb scale on hover/drag
- [ ] Respect reduced-motion

**Verification**: Sliders animate smoothly

### Task 4.4: Keyboard Navigation
- [ ] Arrow keys adjust slider value
- [ ] Tab navigation between sliders
- [ ] Enter to apply preset
- [ ] Escape to close panel

**Verification**: Full keyboard control works

### Task 4.5: Copy Style Feature
- [ ] Add "Copy Style" button
- [ ] Export profile as JSON
- [ ] Add "Paste Style" button
- [ ] Import profile from clipboard

**Verification**: Can copy and paste aesthetic profiles

---

## Phase 5: Documentation (P2)

### Task 5.1: Create Barrel Export
- [ ] Create `apps/studio/src/lib/aesthetics/index.ts`
- [ ] Export all public components and utilities

### Task 5.2: Add JSDoc Comments
- [ ] Document all components with JSDoc
- [ ] Document all types
- [ ] Include usage examples

### Task 5.3: Update Project Docs
- [ ] Document aesthetic system in project.md
- [ ] Add to feature list

**Verification**: Docs complete and accurate

---

## Dependency Graph

```
Task 1.1 ─────┬─► Task 1.2 ─┬─► Task 2.1 ─► Task 2.2 ─┬─► Task 3.1
              │             │                         │
              └─► Task 1.3 ─┘                         ├─► Task 3.2 ─► Task 3.3
                                                      │
Task 1.4 ─────────────────────► Task 2.3 ─► Task 2.4 ─┤
                                                      │
                                                      └─► Task 3.4

Task 4.1 ─► Task 4.2
Task 4.3 ─┐
Task 4.4 ─┼─► (can run in parallel)
Task 4.5 ─┘
```

---

## Estimated Effort

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 1 | 4 | ~2 hours |
| Phase 2 | 4 | ~2.5 hours |
| Phase 3 | 4 | ~2 hours |
| Phase 4 | 5 | ~2.5 hours |
| Phase 5 | 3 | ~30 mins |

**Total**: ~9.5 hours

---

## Acceptance Criteria

- [ ] 12 aesthetic dimensions controllable via sliders
- [ ] 6 curated presets selectable
- [ ] Aesthetic guidance included in LLM prompts
- [ ] Generated components reflect aesthetic choices
- [ ] Preferences persist across sessions
- [ ] All controls keyboard accessible
- [ ] Panel is collapsible and non-intrusive
- [ ] Smooth animations (respects reduced-motion)
