This is the **"Master Architect" System Prompt**. You can paste this into the "System Instructions" or "Custom Instructions" of your AI editor (Cursor, v0, MagicPatterns, or any Agentic Dev tool).

It is designed to force the AI to stop "hallucinating" generic divs and start "engineering" high-fidelity, production-grade digital instruments.

---

# The System Prompt: Technical Design Engineer (Bedrock Edition)

**Role:** You are a Senior Technical Design Engineer and Browser Architect. Your mission is to build "Bedrock" interfaces—minimal, functional, indestructible, and high-density. You prioritize the "Customer of Craftsmanship," ensuring every generation is self-verified against MDN specs and achieves a perfect 100 Lighthouse score.

## 1. The Engineering Constraints

* **Semantic Integrity:** Never use a `<div>` when a `<section>`, `<article>`, `<nav>`, or `<header>` is appropriate. Use `<time>`, `<figure>`, and `<address>` for data-specific markup.
* **MDN-Verified:** Every CSS property and HTML attribute must be current. Avoid deprecated features. Use modern CSS (Grid, Flexbox, Container Queries) to minimize DOM depth.
* **Lighthouse Zero-Jank:** * Images must have explicit `width`/`height` and `loading="lazy"`.
* Fonts must use `font-display: swap`.
* Prioritize HTMX or Alpine.js over heavy React/JS frameworks to keep the TTI (Time to Interactive) near zero.



## 2. The Visual & HCI Logic (The "Don Norman" Layer)

* **Precision Grids:** Implement a custom ratio-based spacing system.
* Define a Base Unit  (default ).
* All margins/padding must follow  or a modular scale (e.g., ).


* **Affordances:** Buttons and interactive elements must have clear -axis depth and state changes (hover, focus, active) that provide immediate cognitive feedback.
* **Typography:** Use a modular scale for hierarchy.
* 
* 
* 


* **Information Density:** Follow "Devouring Details" aesthetics. Use micro-labels, tight leading, and 1px borders to maximize "ink-to-data" ratio without losing legibility.

## 3. Motion & Feedback (The animation.dev Layer)

* **Physics-Based:** Use spring physics for transitions (). Avoid linear animations.
* **Intentionality:** Motion must serve a purpose (e.g., staggered entry to indicate list hierarchy, layout morphing to maintain context).
* **Performance:** All animations must be GPU-accelerated (use `transform` and `opacity` only).

## 4. SEO & GEO (Generative Engine Optimization)

* **Semantic SEO:** Use proper heading nesting ().
* **AI-Readability:** Generate JSON-LD Structured Data for every page. Ensure the code is "self-documenting" for other LLMs and crawlers.

## 5. The "Whitehat" Quality Control Loop

Before providing the final output, you must internally verify:

1. **Is it Compilable?** Does the code run without warnings in a modern browser console?
2. **Is it Accessible?** Does it pass WCAG 2.1 AA (contrast ratios, aria-labels, keyboard focus)?
3. **Is it Minimal?** Can I remove 3 classes and still achieve the same visual result? (Locality of Behavior).

**Final Tone:** You are a peer-level collaborator to a high-end design engineer. Be precise, technical, and brief. No fluff. Just the craft.

---

### How to use this:

1. **In Cursor:** Go to `Settings > General > Rules for AI` and paste the above.
2. **In v0 / MagicPatterns:** Paste this as the initial "System Prompt" or "Project Context" before you start your first generation.
3. **In Chat:** If you are using a standard chat interface, start with: *"Act as a Technical Design Engineer following these Bedrock PRD rules..."* followed by the text above.

**Would you like me to demonstrate this "Master Architect" persona by generating a specific component (e.g., a high-density dashboard header or a precision-grid contact form)?**

OUTPUT 2:
It looks like you've shared the roadmap and architectural blueprint for **v0-clone**, a sophisticated frontend generation engine. This project is clearly designed with a high emphasis on performance and developer experience, leveraging **Svelte 5** and **Bun**.

Based on the documentation provided, here is a high-level overview of the project's current state and technical foundation.

---

## Project Overview

The **v0-clone** is a reimagined engine for generating frontends that features fluid animations, real-time previews, and visual editing. It operates as a monorepo designed to handle everything from LLM communication to sandboxed rendering.

### Core Architecture

The system is organized into a modular monorepo structure:

* **`apps/studio`**: The main visual editor built with Svelte 5.
* **`packages/llm`**: A pluggable system supporting Claude, OpenAI, and Ollama.
* **`packages/renderer`**: An iframe-based sandbox for safe previews.
* **`packages/pipeline`**: Manages the generation flow and includes telemetry for monitoring.

---

## Development Roadmap

The project is structured into three distinct phases of evolution:

| Phase | Status | Key Features |
| --- | --- | --- |
| **Phase 1** | **Current** | Svelte 5 studio, LLM provider hot-swapping, telemetry, and responsive layout. |
| **Phase 2** | **Coming** | WASM-based code analysis, Web Worker offloading, and TypeScript AST generation. |
| **Phase 3** | **Future** | Drag-and-drop editing, two-way code-to-visual sync, and project exporting. |

---

## Technical Performance Targets

The project sets very high standards for responsiveness and speed:

* **Frame Budget**: Aiming for under **10ms** to maintain **60fps**.
* **HMR (Hot Module Replacement)**: Target updates in under **20ms**.
* **LLM Streaming**: First token delivery in less than **500ms**.
* **Preview Refresh**: End-to-end refresh in under **50ms**.

---

## Getting Started

To get the studio running locally, you can use the following commands with **Bun**:

1. **Install dependencies**: `bun install`.
2. **Start the studio**: `bun run dev:studio`.
3. **Configure LLM**: Set your environment variables for your preferred provider (e.g., `export LLM_PROVIDER=claude`).

> **Tip**: You can enable the **DevInfo** observability panel by appending `?dev` to your local URL or setting the `DEV_INFO=true` environment variable.

---

**Would you like me to help you draft the implementation for one of the Phase 2 features, such as the WASM parser or the TypeScript AST generation?**

OUTPUT 3:
Since you're ready to move into **Phase 2**, let's focus on the core architectural shift: moving heavy computations (like code analysis) off the main thread to maintain that strict **10ms frame budget**.

The most critical upgrade for this phase is implementing the **WASM-powered parser** and **Web Worker offloading**. This ensures that as the LLM streams code, the studio remains responsive.

---

## 1. WASM Parser & Web Worker Offloading

To achieve the `<50ms` preview refresh target, we cannot parse code on the main UI thread. Using a WASM-based parser like **Oxc** (The Oxidation Compiler) inside a Web Worker allows for near-instantaneous AST (Abstract Syntax Tree) generation without dropping frames.

### Implementation Strategy

* **The Worker**: Create a dedicated worker in `packages/pipeline` that loads the WASM parser.
* **The Pipeline**: When the LLM streams a chunk of code, the `pipeline` sends the string to the worker.
* **The Result**: The worker returns a structured AST or a list of components/props found in the code, which the Svelte 5 studio uses to update the UI.

---

## 2. TypeScript AST-based Code Generation

Rather than just treating code as a string, Phase 2 moves toward **structured generation**. This involves using the TypeScript Compiler API (or a faster alternative like `magic-string`) to programmatically insert or modify components.

### Example: The "Onlook" Pattern (`data-oid`)

One of your Phase 2 goals is **data-oid source mapping**. This is how the engine tracks which piece of code generated which visual element:

1. **Injection**: During the pipeline stage, the AST transformer visits every JSX/Svelte element.
2. **Tagging**: It injects a unique ID: `<button data-oid="abc-123">`.
3. **Mapping**: A metadata map is created linking `abc-123` to a specific line/column in the source file.

---

## 3. Full LLM Streaming Integration

Currently, the pipeline is a stub. For Phase 2, we need to connect the `packages/llm` providers to the `renderer`:

| Component | Responsibility |
| --- | --- |
| **LLM Provider** | Streams raw text/markdown tokens via Server-Sent Events (SSE). |
| **Stream Parser** | Extracts code blocks from the LLM response in real-time. |
| **Renderer Sandbox** | Updates the iframe via `postMessage` as the code is being written. |

---

### Suggested Next Step

Would you like me to provide a **TypeScript implementation for a Web Worker** that initializes a WASM parser (like Oxc or SWC) to handle the code analysis for your `packages/pipeline`?

OUTPUT 4:
Incorporating **Three.js TSL**, **WebGPU**, and **WebAssembly** pushes **v0-clone** into the territory of high-performance creative coding. By moving to WebGPU, you bypass the legacy overhead of WebGL and gain direct access to the GPU's compute capabilities.

---

## 1. Three.js Shading Language (TSL) & WebGPU

In Phase 2, the `renderer` package should transition from `WebGLRenderer` to `WebGPURenderer`. TSL is the bridge that makes this powerful: it's a node-based, JavaScript-friendly way to write shaders that Three.js transpiles into **WGSL** (for WebGPU) or **GLSL** (for WebGL fallback) automatically.

### Why TSL is a Game-Changer for v0-clone

* **Unified Codebase**: You write your shader logic once in TypeScript using TSL functions (`Fn`, `uniform`, `vec3`), and it runs on any hardware.
* **Visual Editing**: Since TSL is node-based, you can eventually build a visual shader graph in the **Studio** where users "drag and drop" effects that compile directly into TSL.
* **Compute Shaders**: You can now use `renderer.computeAsync()` to offload complex math—like flocking simulations or physics—directly to the GPU.

---

## 2. WebAssembly (WASM) for the Heavy Lifting

While WebGPU handles the rendering, **WebAssembly** is your engine for the "Generation Pipeline."

| Use Case | Benefit |
| --- | --- |
| **AST Parsing** | Use a WASM-ported parser (like `oxc` or `swc`) to analyze LLM-generated code in microseconds rather than milliseconds. |
| **Geometry Generation** | If your LLM generates complex 3D procedural geometry, use a Rust-compiled WASM module to calculate vertex buffers without locking the main thread. |
| **Real-time Transpilation** | Quickly convert LLM-generated React or Svelte code into a format your renderer understands. |

---

## 3. High-Performance Preview Pipeline

To hit your **<50ms preview refresh** target, the interaction between these technologies is key:

1. **Input**: LLM streams code tokens.
2. **Analyze (WASM/Worker)**: A Web Worker running WASM-based TypeScript tools validates the code and extracts metadata.
3. **Update (Svelte 5)**: Svelte's runes (`$state`, `$effect`) reactively trigger a re-render of the studio UI.
4. **Render (WebGPU/TSL)**: The `WebGPURenderer` updates the scene, potentially using **Compute Shaders** to update any dynamic buffers (like the "Onlook" `data-oid` mapping) without a full page reload.

---

## Technical Performance Benchmarks (2026)

| Metric | WebGL (Legacy) | WebGPU + TSL |
| --- | --- | --- |
| **Max Draw Calls** | ~1,000 - 2,000 | **10,000+** (via Bind Groups) |
| **Shading Language** | GLSL (String-based) | **TSL (Type-safe TS/JS)** |
| **Compute Power** | Simulated (Hack) | **Native Compute Shaders** |
| **Browser Support** | 99% | **Full (Chrome, Firefox, Safari 26+)** |

> **Next Step**: Would you like to see a code example of a **TSL-based material** that uses a **Compute Shader** for real-time vertex displacement in your preview window?

---

[TSL and WebGPU Overview](https://www.youtube.com/watch?v=73quCt_NQMA)
This video provides a deep dive into the syntax and capabilities of the Three Shading Language, which is essential for building the modern rendering pipeline you described.

OUTPUT 5:
With the addition of **tRPC**, **WebRTC**, and **Webhooks**, you're moving from a local-first generation tool to a full-scale collaborative ecosystem. Integrating these with modern **CSS** standards and the "digital ocean of knowledge" (likely referencing massive, high-quality documentation and community wisdom like CSS-Tricks) turns this project into a powerhouse for modern web engineering.

---

## 1. The Real-time & Data Architecture

Integrating these APIs allows for a highly responsive and collaborative "Studio" environment:

* **tRPC (Type-safe Communication)**: This ensures that your `apps/studio` and `packages/llm` or `packages/pipeline` share the same TypeScript types. If you update a prop in your generator, the UI knows exactly what it expects without manual sync.
* **WebRTC (Peer-to-Peer Collaboration)**: Perfect for "Multiplayer" visual editing. You can sync the state of the Svelte 5 canvas between two developers in real-time with zero-latency synchronization.
* **Webhooks (Event-Driven Integration)**: When a generation is finished or an "Export to Vercel" is triggered, webhooks allow external services to react instantly to the engine's lifecycle events.

---

## 2. Advanced CSS & The "CSS-Tricks" Spirit

By treating **Tailwind 4** and modern **CSS Variables** as a first-class citizen, you can implement the deep styling knowledge found in resources like CSS-Tricks directly into the engine's DNA.

* **Container Queries & Subgrid**: Your LLM-generated layouts won't just be "responsive" by screen size; they’ll be context-aware based on where they are placed in the visual editor.
* **CSS Anchor Positioning**: Essential for the Phase 3 "Inspector/Devtools" panel. Use anchor positioning to attach tooltips and overlays to generated elements without complex JavaScript calculation.
* **Fluid Typography and Spacing**: Implementing math-based fluid scales (using `clamp()`) ensures the generated UI looks professional on any device, right out of the box.

---

## 3. High-Performance Tech Stack Overview (Phase 2 & 3)

| Tech | Role in v0-clone | Benefit |
| --- | --- | --- |
| **Three.js TSL** | Visual Shaders & FX | Unified, type-safe shader logic for WebGPU/WebGL. |
| **WebGPU** | Rendering Engine | Native performance for 3D and compute-heavy UI effects. |
| **WASM** | Heavy Computation | Lightning-fast AST parsing and code analysis off main-thread. |
| **tRPC** | Data Layer | 100% type-safety between the generator and the studio UI. |
| **WebRTC** | Collaboration | Real-time, peer-to-peer state syncing for collaborative coding. |

---

## 4. The "Onlook" Pattern with CSS

To achieve the **two-way sync** (Visual  Code), you can use CSS Custom Properties as the "bridge."

1. **Code**: LLM generates a component with `--primary-color: #3b82f6;`.
2. **Visual**: The Studio reads that variable and presents a color picker.
3. **Sync**: As you move the picker, the Studio updates the CSS variable in the preview instantly via the DOM, and tRPC pushes the change back to the source code.

> **Next Step**: Would you like to see how we can set up a **tRPC router** specifically for the **LLM Generation Pipeline** to ensure that streaming tokens are type-safe from the server to your Svelte 5 runes?

OUTPUT 6:
