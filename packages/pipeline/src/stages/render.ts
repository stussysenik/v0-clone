import { type RenderPayload, type SEOMetadata, devLog, now } from '@v0-clone/shared'
import type { GeneratedOutput } from './generate'

// =============================================================================
// Types
// =============================================================================

export interface RenderConfig {
	/** Inject SEO meta tags */
	seo?: SEOMetadata
	/** Include CWV tracking script */
	trackCWV?: boolean
	/** Custom page title */
	title?: string
}

/**
 * Extract code from markdown code blocks
 */
function extractCodeFromMarkdown(code: string): string {
	// Match ```svelte, ```html, ```react, or just ```
	const codeBlockMatch = code.match(/```(?:svelte|html|react|jsx|tsx)?\n?([\s\S]*?)```/)
	if (codeBlockMatch) {
		return codeBlockMatch[1].trim()
	}
	return code.trim()
}

// Default render configuration
const DEFAULT_CONFIG: RenderConfig = {
	trackCWV: true,
}

/**
 * Render stage - converts generated code into preview-ready HTML
 */
export async function render(
	input: GeneratedOutput,
	config: RenderConfig = {},
): Promise<RenderPayload> {
	const startTime = now()
	const fullConfig = { ...DEFAULT_CONFIG, ...config }

	devLog('pipeline', 'Render stage started', { language: input.language })

	let html: string
	let css: string | undefined
	let js: string | undefined

	switch (input.language) {
		case 'svelte':
			({ html, css, js } = renderSvelte(input.code, fullConfig))
			break

		case 'react':
			({ html, css, js } = renderReact(input.code, fullConfig))
			break

		case 'html':
		default:
			({ html, css } = renderHTML(input.code, fullConfig))
			break
	}

	const durationMs = now() - startTime

	devLog('pipeline', 'Render stage completed', {
		durationMs,
		htmlLength: html.length,
		hasCss: !!css,
		hasJs: !!js,
	})

	return {
		html,
		css,
		js,
		sourceMap: input.sourceMap,
	}
}

/**
 * Render Svelte component to HTML
 * In Phase 2, this will use actual Svelte compiler
 */
function renderSvelte(
	code: string,
	config: RenderConfig,
): { html: string; css?: string; js?: string } {
	// Strip markdown code fences if present
	const cleanCode = extractCodeFromMarkdown(code)

	// Extract template (everything outside script and style tags)
	const scriptMatch = cleanCode.match(/<script[^>]*>([\s\S]*?)<\/script>/)
	const styleMatch = cleanCode.match(/<style[^>]*>([\s\S]*?)<\/style>/)

	// Get the template part
	const template = cleanCode
		.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
		.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
		.trim()

	// For now, just return the template as HTML
	// Phase 2 will compile this properly
	const html = wrapInDocument(template, styleMatch?.[1], config)

	return {
		html,
		css: styleMatch?.[1],
		js: scriptMatch?.[1],
	}
}

/**
 * Render React component to HTML
 * In Phase 2, this will use actual React/Babel compilation
 */
function renderReact(
	code: string,
	config: RenderConfig,
): { html: string; css?: string; js?: string } {
	// Strip markdown code fences if present
	const cleanCode = extractCodeFromMarkdown(code)

	// Extract JSX from the return statement
	const returnMatch = cleanCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}/)
	const jsx = returnMatch?.[1] ?? cleanCode

	// Convert className to class for HTML rendering
	const html = jsx.replace(/className=/g, 'class=')

	return {
		html: wrapInDocument(html, undefined, config),
		js: cleanCode,
	}
}

/**
 * Render plain HTML
 */
function renderHTML(
	code: string,
	config: RenderConfig,
): { html: string; css?: string } {
	// Strip markdown code fences if present
	const cleanCode = extractCodeFromMarkdown(code)

	// Check if it's a full document or just a fragment
	if (cleanCode.includes('<!DOCTYPE') || cleanCode.includes('<html')) {
		return { html: cleanCode }
	}

	// Extract inline styles if present
	const styleMatch = cleanCode.match(/<style[^>]*>([\s\S]*?)<\/style>/)
	const css = styleMatch?.[1]
	const template = cleanCode.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').trim()

	return {
		html: wrapInDocument(template, css, config),
		css,
	}
}

/**
 * Generate CWV tracking script
 */
function getCWVTrackingScript(): string {
	return `
    // Core Web Vitals tracking
    (function() {
      const cwv = {
        lcp: null,
        fid: null,
        inp: null,
        cls: null,
        fcp: null,
        ttfb: null
      };

      // Track CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            cwv.cls = clsValue;
          }
        }
      });
      try { clsObserver.observe({ type: 'layout-shift', buffered: true }); } catch(e) {}

      // Track LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        cwv.lcp = lastEntry.startTime;
      });
      try { lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true }); } catch(e) {}

      // Track FCP
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            cwv.fcp = entry.startTime;
          }
        }
      });
      try { fcpObserver.observe({ type: 'paint', buffered: true }); } catch(e) {}

      // Track TTFB from navigation timing
      if (performance.getEntriesByType) {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
          cwv.ttfb = navEntries[0].responseStart;
        }
      }

      // Track INP (simplified - using first-input as proxy)
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (cwv.inp === null || entry.processingStart - entry.startTime > cwv.inp) {
            cwv.inp = entry.processingStart - entry.startTime;
          }
        }
      });
      try { inpObserver.observe({ type: 'first-input', buffered: true }); } catch(e) {}

      // Handle CWV request from parent
      window.addEventListener('message', (event) => {
        if (event.data.type === 'getCWV') {
          window.parent.postMessage({ type: 'cwv', payload: cwv, timestamp: Date.now() }, '*');
        }
        if (event.data.type === 'getElementAtPoint') {
          const { x, y } = event.data.payload;
          const element = document.elementFromPoint(x, y);
          if (element) {
            const rect = element.getBoundingClientRect();
            const styles = getComputedStyle(element);
            window.parent.postMessage({
              type: 'elementAtPoint',
              payload: {
                element: element.tagName.toLowerCase(),
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                computedStyles: {
                  display: styles.display,
                  flexDirection: styles.flexDirection,
                  gridTemplateColumns: styles.gridTemplateColumns,
                  gap: styles.gap,
                  margin: styles.margin,
                  padding: styles.padding
                }
              },
              timestamp: Date.now()
            }, '*');
          }
        }
      });

      // Send initial CWV after load
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.parent.postMessage({ type: 'cwv', payload: cwv, timestamp: Date.now() }, '*');
        }, 500);
      });
    })();
  `
}

/**
 * Generate SEO meta tags from configuration
 */
function generateSEOTags(config: RenderConfig): string {
	const tags: string[] = []

	if (!config.seo) return ''

	const seo = config.seo

	// Title
	if (config.title || seo.title) {
		tags.push(`  <title>${escapeHtml(config.title ?? seo.title ?? '')}</title>`)
	}

	// Description
	if (seo.description) {
		tags.push(`  <meta name="description" content="${escapeHtml(seo.description)}">`)
	}

	// Keywords
	if (seo.keywords && seo.keywords.length > 0) {
		tags.push(`  <meta name="keywords" content="${escapeHtml(seo.keywords.join(', '))}">`)
	}

	// Author
	if (seo.author) {
		tags.push(`  <meta name="author" content="${escapeHtml(seo.author)}">`)
	}

	// Canonical
	if (seo.canonical) {
		tags.push(`  <link rel="canonical" href="${escapeHtml(seo.canonical)}">`)
	}

	// Robots
	if (seo.robots) {
		tags.push(`  <meta name="robots" content="${escapeHtml(seo.robots)}">`)
	}

	// Open Graph tags
	if (seo.openGraph) {
		const og = seo.openGraph
		if (og.title) tags.push(`  <meta property="og:title" content="${escapeHtml(og.title)}">`)
		if (og.description) tags.push(`  <meta property="og:description" content="${escapeHtml(og.description)}">`)
		if (og.image) tags.push(`  <meta property="og:image" content="${escapeHtml(og.image)}">`)
		if (og.url) tags.push(`  <meta property="og:url" content="${escapeHtml(og.url)}">`)
		if (og.type) tags.push(`  <meta property="og:type" content="${escapeHtml(og.type)}">`)
		if (og.siteName) tags.push(`  <meta property="og:site_name" content="${escapeHtml(og.siteName)}">`)
		if (og.locale) tags.push(`  <meta property="og:locale" content="${escapeHtml(og.locale)}">`)
	}

	// Twitter Card tags
	if (seo.twitter) {
		const tw = seo.twitter
		tags.push(`  <meta name="twitter:card" content="${escapeHtml(tw.card ?? 'summary')}">`)
		if (tw.site) tags.push(`  <meta name="twitter:site" content="${escapeHtml(tw.site)}">`)
		if (tw.creator) tags.push(`  <meta name="twitter:creator" content="${escapeHtml(tw.creator)}">`)
		if (tw.title) tags.push(`  <meta name="twitter:title" content="${escapeHtml(tw.title)}">`)
		if (tw.description) tags.push(`  <meta name="twitter:description" content="${escapeHtml(tw.description)}">`)
		if (tw.image) tags.push(`  <meta name="twitter:image" content="${escapeHtml(tw.image)}">`)
	}

	return tags.length > 0 ? `\n${tags.join('\n')}` : ''
}

/**
 * Escape HTML entities for safe attribute insertion
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

/**
 * Wrap content in a full HTML document with TailwindCSS
 */
function wrapInDocument(
	content: string,
	customCss?: string,
	config: RenderConfig = {},
): string {
	const seoTags = generateSEOTags(config)
	const title = config.title ?? config.seo?.title ?? 'Preview'
	const trackCWV = config.trackCWV !== false

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>${seoTags}
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    /* Smooth animations */
    * {
      transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    }
    /* Custom styles */
    ${customCss ?? ''}
  </style>
</head>
<body>
  <div id="app">
    ${content}
  </div>
  <script>
    // Notify parent frame that we're ready
    window.parent.postMessage({ type: 'ready', timestamp: Date.now() }, '*');

    // Report render metrics
    window.addEventListener('load', () => {
      const timing = performance.timing;
      window.parent.postMessage({
        type: 'metrics',
        payload: {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          load: timing.loadEventEnd - timing.navigationStart,
          domNodes: document.querySelectorAll('*').length
        },
        timestamp: Date.now()
      }, '*');
    });

    ${trackCWV ? getCWVTrackingScript() : ''}
  </script>
</body>
</html>`
}
