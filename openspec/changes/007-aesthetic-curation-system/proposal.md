# OpenSpec Proposal: Aesthetic Curation System

## Change ID: `007-aesthetic-curation-system`

**Status**: PROPOSED
**Type**: Feature Enhancement
**Priority**: High

---

## Executive Summary

Create an **interactive aesthetic curation system** that allows users to deliberately shape the visual quality and style of generated components. Inspired by Roger Scruton's [Beauty: A Very Short Introduction](https://global.oup.com/academic/product/beauty-9780199229758), this system provides:

1. **Deliberate categorization** - Organized aesthetic dimensions users can adjust
2. **Interactive style controls** - Bits UI unstyled components for deep customization
3. **Quality curation** - Direct influence over output aesthetics
4. **Philosophical grounding** - Based on principles of harmony, fittingness, and form

---

## Philosophical Foundation

Drawing from Scruton's framework on aesthetic judgment:

### Four Categories of Beauty (Adapted for UI)

| Scruton's Category | UI Application | Controls |
|-------------------|----------------|----------|
| **Human Beauty** | User-facing elements | Approachability, warmth, personality |
| **Natural Beauty** | Organic/flowing design | Curves, whitespace, breathing room |
| **Everyday Beauty** | Functional elegance | Clarity, utility, "just right" feeling |
| **Artistic Beauty** | Expressive elements | Bold choices, meaning, statement |

### Core Principle: Fittingness

> "Experiencing beauty is recognizing a form of fittingness or harmony... looking just right, sounding just right"

The system helps users achieve **fittingness** by providing controls that guide the LLM toward harmonious output.

---

## Problem Statement

Currently, users have no control over the aesthetic quality of generated components:
- One-size-fits-all generation
- No way to express style preferences
- No iterative refinement of aesthetics
- Generated components lack deliberate curation

---

## Proposed Solution

### Aesthetic Dimensions Panel

A collapsible panel with categorical controls:

```
┌─────────────────────────────────────────────────────┐
│ Aesthetics                              [Presets ▾] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ FORM & STRUCTURE                                    │
│ ├─ Density      [Sparse ●────────○ Dense]          │
│ ├─ Rhythm       [Regular ●───○─── Varied]          │
│ └─ Proportion   [Compact ○────●─── Spacious]       │
│                                                     │
│ EXPRESSION                                          │
│ ├─ Personality  [Neutral ○───●─── Expressive]      │
│ ├─ Warmth       [Cool ○────────●─ Warm]            │
│ └─ Energy       [Calm ●────────○ Dynamic]          │
│                                                     │
│ REFINEMENT                                          │
│ ├─ Detail       [Minimal ○───●─── Ornate]          │
│ ├─ Contrast     [Subtle ●────────○ Bold]           │
│ └─ Polish       [Raw ○─────────● Refined]          │
│                                                     │
│ COLOR HARMONY                                       │
│ ├─ Palette      [Mono ○──●──── Vibrant]            │
│ ├─ Saturation   [Muted ○───●─── Vivid]             │
│ └─ Temperature  [Cool ○────●─── Warm]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Style Presets

Curated presets based on aesthetic philosophies:

| Preset | Description | Influences |
|--------|-------------|------------|
| **Minimalist** | Clean, purposeful, breathing room | Dieter Rams, Apple |
| **Brutalist** | Raw, honest, bold structure | Web Brutalism, Concrete |
| **Organic** | Flowing, natural, soft | Nature, Biophilic design |
| **Technical** | Precise, systematic, informative | Bloomberg, Dashboards |
| **Playful** | Warm, approachable, delightful | Stripe, Linear |
| **Editorial** | Typographic, refined, content-first | Medium, NYT |

### Interactive Curation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  1. USER ADJUSTS SLIDERS                                     │
│     ↓                                                        │
│  2. SYSTEM GENERATES STYLE PROMPT                            │
│     "Create a minimalist form with warm personality,         │
│      spacious proportions, and subtle contrast..."           │
│     ↓                                                        │
│  3. LLM GENERATES WITH AESTHETIC GUIDANCE                    │
│     ↓                                                        │
│  4. USER SEES RESULT → REFINES SLIDERS → REGENERATE          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Data Model

```typescript
// packages/shared/src/types.ts

interface AestheticDimension {
  id: string
  category: 'form' | 'expression' | 'refinement' | 'color'
  name: string
  description: string
  min: string      // Label for minimum
  max: string      // Label for maximum
  value: number    // 0-100
  weight: number   // Influence on prompt
}

interface AestheticPreset {
  id: string
  name: string
  description: string
  values: Record<string, number>  // dimension id → value
  tags: string[]
}

interface AestheticProfile {
  dimensions: AestheticDimension[]
  activePreset?: string
  customizations: Record<string, number>
}
```

### Prompt Engineering

Convert aesthetic values to LLM-friendly guidance:

```typescript
// packages/pipeline/src/stages/aesthetic.ts

function generateAestheticPrompt(profile: AestheticProfile): string {
  const traits: string[] = []

  for (const dim of profile.dimensions) {
    if (dim.value < 30) {
      traits.push(`${dim.min.toLowerCase()} ${dim.name}`)
    } else if (dim.value > 70) {
      traits.push(`${dim.max.toLowerCase()} ${dim.name}`)
    }
  }

  return `
Design with the following aesthetic qualities:
- ${traits.join('\n- ')}

Ensure visual harmony and fittingness in the result.
`
}
```

### Component Structure

```
apps/studio/src/lib/
├── aesthetics/
│   ├── AestheticsPanel.svelte      # Main container
│   ├── DimensionSlider.svelte      # Individual slider control
│   ├── DimensionCategory.svelte    # Category grouping
│   ├── PresetPicker.svelte         # Preset dropdown
│   ├── PresetCard.svelte           # Preset preview card
│   └── index.ts                    # Barrel export
└── utils/
    └── aestheticPrompt.ts          # Prompt generation
```

---

## UI/UX Design

### Panel Integration

Add to the Chat Panel as a collapsible section:

```
┌────────────────────────────────────────┐
│ ● Ready                                │
├────────────────────────────────────────┤
│                                        │
│ [Aesthetics ▾]  ← Collapsed by default │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ What would you like to create?     │ │
│ │                                    │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Generate →]                           │
│                                        │
└────────────────────────────────────────┘
```

### Slider Design (Bits UI)

Using unstyled Bits UI Slider for customization:

```svelte
<Slider.Root
  bind:value={dimension.value}
  max={100}
  step={1}
  class="relative flex items-center w-full h-5"
>
  <Slider.Track class="relative h-1 flex-grow rounded-full bg-[var(--color-bg-tertiary)]">
    <Slider.Range class="absolute h-full rounded-full bg-[var(--color-accent)]" />
  </Slider.Track>
  <Slider.Thumb
    class="block w-4 h-4 rounded-full bg-white shadow-md
           hover:scale-110 focus:ring-2 focus:ring-[var(--color-accent)]
           transition-transform"
  />
</Slider.Root>
```

### Preset Cards

Visual previews of aesthetic presets:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ ░░░░░░░░░░░ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ∿∿∿∿∿∿∿∿∿∿∿ │
│ ░░░░░░░░░░░ │  │ ▓▓▓▓▓▓▓▓▓▓▓ │  │ ∿∿∿∿∿∿∿∿∿∿∿ │
│ Minimalist  │  │ Brutalist   │  │ Organic     │
│ Clean, airy │  │ Bold, raw   │  │ Flowing     │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (P0)
- Define AestheticDimension and AestheticPreset types
- Create DimensionSlider component with Bits UI
- Implement basic prompt generation

### Phase 2: Panel UI (P0)
- Create AestheticsPanel container
- Implement collapsible categories
- Add 6 built-in presets

### Phase 3: Integration (P1)
- Integrate with ChatPanel
- Pass aesthetic prompt to pipeline
- Store preferences in localStorage

### Phase 4: Polish (P2)
- Add preset preview cards
- Implement smooth slider animations
- Add keyboard navigation
- Create "Copy Style" feature

---

## Aesthetic Dimensions Reference

### Form & Structure
| Dimension | Min | Max | Description |
|-----------|-----|-----|-------------|
| Density | Sparse | Dense | Amount of content per area |
| Rhythm | Regular | Varied | Consistency of spacing/sizing |
| Proportion | Compact | Spacious | Whitespace and breathing room |

### Expression
| Dimension | Min | Max | Description |
|-----------|-----|-----|-------------|
| Personality | Neutral | Expressive | Character and uniqueness |
| Warmth | Cool | Warm | Approachability and friendliness |
| Energy | Calm | Dynamic | Movement and vitality |

### Refinement
| Dimension | Min | Max | Description |
|-----------|-----|-----|-------------|
| Detail | Minimal | Ornate | Level of decorative elements |
| Contrast | Subtle | Bold | Visual distinction between elements |
| Polish | Raw | Refined | Level of finish and sophistication |

### Color Harmony
| Dimension | Min | Max | Description |
|-----------|-----|-----|-------------|
| Palette | Mono | Vibrant | Color variety |
| Saturation | Muted | Vivid | Color intensity |
| Temperature | Cool | Warm | Blue-green vs red-orange bias |

---

## Files Summary

### Create (7 files)
- `apps/studio/src/lib/aesthetics/AestheticsPanel.svelte`
- `apps/studio/src/lib/aesthetics/DimensionSlider.svelte`
- `apps/studio/src/lib/aesthetics/DimensionCategory.svelte`
- `apps/studio/src/lib/aesthetics/PresetPicker.svelte`
- `apps/studio/src/lib/aesthetics/PresetCard.svelte`
- `apps/studio/src/lib/aesthetics/index.ts`
- `packages/pipeline/src/stages/aesthetic.ts`

### Modify (3 files)
- `packages/shared/src/types.ts` - Add aesthetic types
- `apps/studio/src/lib/ChatPanel.svelte` - Integrate aesthetics
- `packages/pipeline/src/stages/generate.ts` - Include aesthetic prompt

---

## Success Criteria

1. Users can adjust 12 aesthetic dimensions via sliders
2. 6 curated presets available as starting points
3. Aesthetic guidance reflected in generated output
4. Preferences persist across sessions
5. All controls are keyboard accessible
6. Panel is collapsible and non-intrusive

---

## References

- [Beauty: A Very Short Introduction](https://global.oup.com/academic/product/beauty-9780199229758) - Roger Scruton
- [Bits UI Slider](https://bits-ui.com/docs/components/slider) - Unstyled component
- [Dieter Rams: 10 Principles](https://www.vitsoe.com/us/about/good-design) - Minimalist design
