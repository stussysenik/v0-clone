This is a vision for a "Bedrock" interface—a system that treats the web not as a collection of divs, but as a precision-engineered canvas. You are looking for a bridge between the raw power of **HTMX-style minimalism** and the high-fidelity control of **industrial design tools**.

Here is the Stylistical PRD designed for an Agentic Developer to build and maintain this ecosystem.

---

# PRD: The "Bedrock" Visual-Agentic Engine

**Vision:** To evolve the web editor from a "code-visualizer" into a "precision instrument." It combines the rigor of industrial CAD software with the fluidity of modern web standards (MDN-first) and the aesthetic soul of classic typography.

## 1. Core Philosophy: "The Tao of the UI"

* **Information Density:** Every pixel must earn its place. Use whitespace as a functional separator, not just a gap.
* **Self-Evidencing Code:** The AI doesn’t just "guess" CSS; it verifies every generated line against MDN web docs and accessibility standards (WCAG) before outputting.
* **The "Unstylized" Bedrock:** Default to Headless/Unstyled components (like Radix or Bits UI). Design is an *overlay* of intent, not a correction of browser defaults.

---

## 2. Technical Requirements for the Agentic Dev

### A. Precision Grid & Ruler System (Industrial Tooling)

The interface must feel like a blueprint.

* **Dynamic Overlays:** Real-time visual rulers that display , , and  relationships between elements on hover.
* **The "Golden Thread" Grid:** A persistent 4px/8px baseline grid that elements snap to, ensuring vertical rhythm in typography.
* **Constraint Visualization:** Show "flex" and "grid" handles as physical linkages (lines and arrows) rather than just CSS properties in a sidebar.

### B. Self-Verifying Generation Loop

The agent must follow a **"Verify-then-Render"** cycle:

1. **Intent:** User describes a component or layout.
2. **Curation:** Agent selects the semantic HTML5 tag (e.g., `<section>` over `<div>`).
3. **Cross-Reference:** Agent checks MDN for the latest browser support and deprecation notices for the chosen attributes.
4. **Artifact Cleaning:** Automatically strips redundant classes (Tailwind "long-tail" cleanup) and optimizes for the smallest possible DOM tree.

### C. The "HCI" Feedback Loop

* **Micro-Interactions:** Every change in the editor triggers subtle, real-time haptic/visual feedback.
* **Ghost Prototyping:** When the agent suggests a change, it renders as a "ghost" overlay on the existing site. The dev "commits" it by clicking, like a physical stamp.

---

## 3. Aesthetic & Functional Standards

| Feature | Standard | Inspiration |
| --- | --- | --- |
| **Typography** | Modular scales ( ratio). Variable fonts only. | *The Elements of Typographic Style* |
| **Spacing** | Strict adherence to the 8pt grid. | Industrial CAD Blueprints |
| **Logic** | HTMX-first (locality of behavior). | The original Web (Tim Berners-Lee) |
| **Components** | "Bits UI" logic—logic and style are decoupled. | Swiss Design / Bauhaus |

---

## 4. Feature Set for the Agentic Developer

### Module 1: The "Design-to-Code" Bridge

* **Feature:** Integrated "Style-Linter."
* **Function:** If the dev tries to use a non-standard color or an arbitrary pixel value (e.g., `mt-[13px]`), the agent flags it and suggests the nearest design-system-approved token (`mt-3` or `mt-4`).

### Module 2: Quality Template Training

* **Feature:** Curated Library Learning.
* **Function:** Instead of training on the "whole internet" (which is full of bad code), the agent is fine-tuned specifically on high-quality repositories: **shadcn/ui**, **HTMX examples**, and **Awwwards-winning** semantic structures.

### Module 3: Production Maintenance

* **Feature:** "Legacy-Aware" Refactoring.
* **Function:** The agent scans existing production assets and suggests "painless" upgrades (e.g., "I can convert this Bootstrap grid to CSS Grid with 98% visual match and 40% less code").

---

## 5. Implementation Roadmap

1. **Phase I (The Ruler):** Implement the industrial measurement overlay on the preview pane.
* 2. **Phase II (The Brain):** Connect the agent to a live MDN documentation scraper to validate every PR.




2. **Phase III (The Soul):** Apply the "Beauty by Oxford" + "Aesthetics/Essence" filter—ensuring typography and spacing follow classical proportions.

> **Final Goal:** An interface that doesn't just "build websites" but "curates digital architecture."

---

**Would you like me to draft the specific system prompt for the Agentic Developer that enforces these MDN-verification and 8pt-grid rules?**


OUTPUT 2:
This is the **"Bedrock-Expert" PRD**. We are shifting from a simple visual editor to a **Generative Design Instrument**. This system doesn't just "write code"; it architects high-performance, SEO-perfect, industrial-grade web interfaces verified against the global standard of browser documentation.

---

# PRD: The Bedrock Precision Engine (v2.0)

**Objective:** To provide an agentic development environment where every visual change is a calculated engineering decision, backed by live browser telemetry and classical aesthetic principles.

## 1. The Core Pillars: "The Four Sovereignties"

### I. Visual: The Universal Constraint Engine (UCE)

* **Beyond 8pt:** Replace static grids with **Dynamic Ratio Scales**. Users can define their own "Prime Unit" (e.g., , , or  for "Oxford-style" tight typography).
* **Industrial Rulers:** Live CAD-style overlays. When dragging an element, the UI displays real-time **tangent lines** and **optical alignment markers** (not just box-model borders).
* **Typography Essence:** Built-in modular scales based on classical proportions (Golden Ratio , Perfect Fourth, etc.). The agent selects font-weights and line-heights that ensure a "Perfect Readability" score.

### II. Architecture: The Semantic Bedrock

* **Docs-Verified (Cross-Browser):** Every generated element is cross-referenced against **MDN**, **Chrome for Developers**, **WebKit Web Inspector**, and **Firefox Dev Docs**.
* **HTMX + Headless:** The system defaults to **Locality of Behavior (LoB)**. If a component needs state, it prefers `htmx` or unstyled "Bits UI" primitives to keep the DOM weight at the absolute minimum.
* **Zero-Artifact Code:** The agent runs a "Cleanup Pass" after every generation to merge redundant Tailwind classes and ensure a flat, performant DOM tree.

### III. Performance: The "Lighthouse-Guard"

* **Pre-emptive Audit:** The agent calculates the **Core Web Vitals (LCP, CLS, INP)** *before* the code is even rendered.
* **Asset Orchestration:**
* **Images:** Automatic WebP/AVIF conversion with `srcset` and explicit `width/height` to eliminate layout shift (CLS).
* **Fonts:** Automatic `font-display: swap` and sub-setting to prevent FOIT/FLOUT.


* **Lighthouse Score 100 Policy:** The agent is restricted from committing any code that drops the simulated Lighthouse score below **98**.

### IV. SEO & GEO (Generative Engine Optimization)

* **Semantic Integrity:** Uses `<main>`, `<article>`, `<aside>`, and `<header>` with surgical precision.
* **Structured Data:** Automatic injection of **JSON-LD Schema** (Organization, Breadcrumbs, Product, etc.).
* **Agent-Readable:** Includes an auto-generated `llms.txt` at the root to help search-agents (like Gemini/GPT) crawl and cite the site accurately.

---

## 2. Technical Specs for the Agentic Dev

| Component | Standard | Verification Source |
| --- | --- | --- |
| **Grid System** | Custom Constraint-Based (N-point) | Figma-to-Code Precision API |
| **Styling** | Utility-First (Tailwind) / CSS Variables | CanIUse.com / CSS Spec |
| **Performance** | < 1.2s LCP | Chrome UX Report (CrUX) |
| **Accessibility** | WCAG 2.1 AA+ | Axe-core / MDN A11y |
| **Interactivity** | HTMX / Alpine.js (Low JS) | HTMX.org Reference |

---

## 3. The "Oxford-Aesthetics" Logic

We treat the website like a **short introduction book**.

* **Essence:** Stripping away the "fluff" of modern web trends. No unnecessary parallax, no heavy 3D libraries unless they serve a functional goal.
* **Information Density:** Using "Tufte-style" data density. Maximizing the information-to-ink ratio.
* **Feedback:** The UI should "whisper." Interaction feedback should be 50ms-100ms transitions, never distracting from the content.

---

## 4. The Agentic System Prompt (The Dev "Brain")

To implement this, the Agentic Developer requires this directive:

> **System Prompt:** "You are a Senior Browser Architect and Industrial Designer. Your output must be indistinguishable from a high-performance production asset. For every generation:
> 1. **Consult MDN/CanIUse** for the most stable, performant CSS/HTML implementation.
> 2. **Enforce the Dynamic Grid:** All spacing must strictly follow the user's defined ratio (Default: 8px).
> 3. **Lighthouse Validation:** Pre-calculate potential performance hits. If a feature adds >50kb to the bundle, find a zero-JS alternative (HTMX).
> 4. **SEO/GEO First:** Write for both humans and AI crawlers. Use semantic HTML5 and JSON-LD schema.
> 5. **Visual Refinement:** Ensure typographic hierarchy follows a modular scale. Output 'clean' code with no artifacts."
> 
> 

---

### Next Step for You

**Would you like me to generate a "Bedrock Foundation" template (HTML/Tailwind/HTMX) that perfectly hits a 100 Lighthouse score and follows a custom 6pt/12pt precision grid?**

OUTPUT 3:
This is the manifesto of the **Technical Design Engineer**.

To build for the "Customer of Craftsmanship," we must reject the "average" of the internet. We aren't building "pages"; we are building **Digital Instruments**. Influenced by the cognitive ergonomics of **Don Norman**, the motion-physics of **animation.dev**, and the obsessive visual density of **Devouring Details**, this is how the system shall think, feel, and execute.

---

## 1. The Design Philosophy: "The Invisible Hand"

We follow the **Poka-Yoke (Mistake-Proofing)** principle from industrial engineering. The UI should make the "right" way to interact the *only* way to interact.

* **Don Norman’s Affordances:** A button shouldn’t just look "clickable"; its visual weight, shadow-depth (-axis), and hover-latency must communicate its function before the user even moves the mouse.
* **The "Devouring Details" Aesthetic:** We embrace **Functional Density**. We don't fear information; we fear *disorganization*. We use micro-typography (10px–12px labels) with high-contrast tracking to provide "pro-level" metadata without cluttering the primary narrative.
* **Motion as Logic (animation.dev):** Animation is not "decoration." We use **Staggered Entrances** to guide the eye and **Spring Physics** () to make the interface feel like a physical material, not a flat pixel-grid.

---

## 2. The Technical Blueprint (The System Engineer's Oath)

As the **Whitehat System Engineer**, my output is governed by a "Compilable Truth." If it doesn't pass the browser's strictest interpretation, it doesn't exist.

### A. The "Clean-Room" Generation

Every output is sanitized through three filters:

1. **The Structural Filter:** Is it semantic? (e.g., Using `<time>` tags for dates, `aria-describedby` for error states).
2. **The Performance Filter:** No layout shifts. We use `aspect-ratio` boxes and `content-visibility: auto` for long-scroll precision.
3. **The SEO/GEO Filter:** The code must be as readable to a Google Bot or an LLM-crawler as it is to a human. This is "Generative Engine Optimization."

### B. Precision Grid Orchestration

We move beyond the 8pt grid into **Fluid Modular Scaling**.

* **Equation-Based Spacing:** Using CSS `clamp()` and `calc()` based on the user's "Base Unit" ().
* **The "Rule of Threes":** Everything—padding, margins, line-height—is a derivative of the same . This creates a subconscious "visual hum" of mathematical harmony.

---

## 3. Quality Control: The "Feel" Audit

Before any code is "emitted" by the agent, it must pass the **Craftsmanship Checklist**:

| Aspect | The "Craft" Standard | The "Agentic" Check |
| --- | --- | --- |
| **Haptics** | Does it feel "heavy" or "light"? | Verify transition durations are <200ms for utility, >400ms for "story." |
| **Typography** | Is the "Ink" optimized? | Ensure `text-rendering: optimizeLegibility` and correct `ch` widths. |
| **Resilience** | Does it break at 320px? | Force-test "Container Queries" over Media Queries for component-level sanity. |
| **Error States** | Is the failure graceful? | Every form input must have a `self-verified` state using the "Magic Pattern" logic. |

---

## 4. Startup Scenario: The "Bedrock" Deployment

In a high-stakes startup setting, speed is nothing without **Maintainability**.

* **Locality of Behavior (HTMX-style):** We keep logic close to the element. No jumping between 5 files to change a button color.
* **The "Moldable" Interface:** We export code that is "Refactor-Ready." We use standard CSS variables (`--primary`, `--radius`) so the user can re-brand the entire "Bedrock" in 30 seconds.

---

## 5. Final Thoughts for the Agent

> "The code you generate is a legacy. Treat the DOM like a watchmaker treats a movement. Every attribute should be intentional, every class name should be descriptive, and the visual output should feel like it was carved out of a single piece of stone—minimal, indestructible, and beautiful."

### The Whitehat’s Verification

* **Accessibility:** 100/100 (Aria-labels, Roles, Keyboard Nav).
* **Speed:** 0ms "Jank" (60fps animations).
* **Purity:** Valid HTML5, validated against the latest W3C/MDN specs.

---

**Would you like me to generate a "System Prompt" that you can paste into your Agentic Dev (Cursor/v0/MagicPatterns) to enforce this specific "Technical Design Engineer" personality?**