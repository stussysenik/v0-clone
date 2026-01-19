export { Sandbox, createSandbox, type SandboxConfig } from './sandbox'

import { type RenderPayload, devLog, now } from '@v0-clone/shared'

// =============================================================================
// Renderer Utilities
// =============================================================================

/**
 * Create a blob URL for HTML content (alternative to srcdoc)
 */
export function createBlobUrl(html: string): string {
	const blob = new Blob([html], { type: 'text/html' })
	return URL.createObjectURL(blob)
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(url: string): void {
	URL.revokeObjectURL(url)
}

/**
 * Inject a script into HTML content
 */
export function injectScript(html: string, script: string): string {
	const scriptTag = `<script>${script}</script>`

	if (html.includes('</body>')) {
		return html.replace('</body>', `${scriptTag}</body>`)
	}

	return html + scriptTag
}

/**
 * Inject styles into HTML content
 */
export function injectStyles(html: string, css: string): string {
	const styleTag = `<style>${css}</style>`

	if (html.includes('</head>')) {
		return html.replace('</head>', `${styleTag}</head>`)
	}

	if (html.includes('<body')) {
		return html.replace('<body', `${styleTag}<body`)
	}

	return styleTag + html
}

/**
 * Create a minimal HTML document wrapper
 */
export function wrapInDocument(content: string, options?: {
	title?: string
	css?: string
	js?: string
}): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options?.title ?? 'Preview'}</title>
  ${options?.css ? `<style>${options.css}</style>` : ''}
</head>
<body>
  ${content}
  ${options?.js ? `<script>${options.js}</script>` : ''}
</body>
</html>`
}

// =============================================================================
// Performance Monitoring
// =============================================================================

/**
 * Measure render performance
 */
export async function measureRender(
	renderFn: () => Promise<void>,
): Promise<{ durationMs: number; fps: number }> {
	const start = now()

	// Use requestAnimationFrame for accurate frame timing
	await new Promise<void>((resolve) => {
		requestAnimationFrame(async () => {
			await renderFn()
			requestAnimationFrame(() => resolve())
		})
	})

	const durationMs = now() - start
	const fps = durationMs > 0 ? 1000 / durationMs : 60

	devLog('renderer', 'Render measured', { durationMs, fps: Math.min(fps, 60) })

	return { durationMs, fps: Math.min(fps, 60) }
}

/**
 * Debounced render queue for high-frequency updates
 */
export class RenderQueue {
	private pending: RenderPayload | null = null
	private timeout: ReturnType<typeof setTimeout> | null = null
	private renderFn: (payload: RenderPayload) => void

	constructor(
		renderFn: (payload: RenderPayload) => void,
		private debounceMs = 16, // ~60fps
	) {
		this.renderFn = renderFn
	}

	/**
	 * Queue a render (debounced)
	 */
	queue(payload: RenderPayload): void {
		this.pending = payload

		if (this.timeout) return

		this.timeout = setTimeout(() => {
			if (this.pending) {
				this.renderFn(this.pending)
				this.pending = null
			}
			this.timeout = null
		}, this.debounceMs)
	}

	/**
	 * Force immediate render
	 */
	flush(): void {
		if (this.timeout) {
			clearTimeout(this.timeout)
			this.timeout = null
		}

		if (this.pending) {
			this.renderFn(this.pending)
			this.pending = null
		}
	}

	/**
	 * Cancel pending render
	 */
	cancel(): void {
		if (this.timeout) {
			clearTimeout(this.timeout)
			this.timeout = null
		}
		this.pending = null
	}
}
