import {
	type PreviewMessage,
	type PreviewMetrics,
	type RenderPayload,
	type CoreWebVitals,
	devLog,
	now,
	createId,
} from '@v0-clone/shared'

// =============================================================================
// Sandbox Manager
// =============================================================================

export interface SandboxConfig {
	containerId: string
	onMessage?: (message: PreviewMessage) => void
	onReady?: () => void
	onError?: (error: Error) => void
	onCWVUpdate?: (cwv: CoreWebVitals) => void
	sandbox?: string // iframe sandbox attribute
}

export class Sandbox {
	private iframe: HTMLIFrameElement | null = null
	private config: SandboxConfig
	private messageHandler: ((event: MessageEvent) => void) | null = null
	private ready = false
	private pendingRenders: RenderPayload[] = []

	constructor(config: SandboxConfig) {
		this.config = {
			sandbox: 'allow-scripts allow-same-origin',
			...config,
		}
	}

	/**
	 * Initialize the sandbox iframe
	 */
	init(): void {
		const container = document.getElementById(this.config.containerId)
		if (!container) {
			throw new Error(`Container not found: ${this.config.containerId}`)
		}

		// Create iframe
		this.iframe = document.createElement('iframe')
		this.iframe.id = `sandbox-${createId()}`
		this.iframe.style.cssText = `
			width: 100%;
			height: 100%;
			border: none;
			background: white;
		`

		if (this.config.sandbox) {
			this.iframe.setAttribute('sandbox', this.config.sandbox)
		}

		// Setup message listener
		this.messageHandler = this.handleMessage.bind(this)
		window.addEventListener('message', this.messageHandler)

		// Append to container
		container.appendChild(this.iframe)

		devLog('renderer', 'Sandbox initialized', { id: this.iframe.id })
	}

	/**
	 * Render HTML content in the sandbox
	 */
	render(payload: RenderPayload): void {
		if (!this.iframe) {
			devLog('renderer', 'Sandbox not initialized, queuing render')
			this.pendingRenders.push(payload)
			return
		}

		const startTime = now()

		devLog('renderer', 'Rendering to sandbox', {
			htmlLength: payload.html.length,
			hasCss: !!payload.css,
			hasJs: !!payload.js,
		})

		// Use srcdoc for isolated rendering
		this.iframe.srcdoc = payload.html
		this.ready = false

		// Measure time to load
		this.iframe.onload = () => {
			const loadTime = now() - startTime
			devLog('renderer', 'Sandbox load complete', { loadTimeMs: loadTime })

			this.config.onMessage?.({
				type: 'metrics',
				payload: { loadTimeMs: loadTime },
				timestamp: now(),
			})
		}
	}

	/**
	 * Update specific elements in the sandbox (for incremental updates)
	 */
	update(selector: string, html: string): void {
		if (!this.iframe?.contentWindow) return

		this.iframe.contentWindow.postMessage(
			{
				type: 'update',
				payload: { selector, html },
				timestamp: now(),
			},
			'*',
		)
	}

	/**
	 * Handle messages from the sandbox iframe
	 */
	private handleMessage(event: MessageEvent): void {
		// Only accept messages from our iframe
		if (event.source !== this.iframe?.contentWindow) return

		const message = event.data as PreviewMessage

		devLog('renderer', 'Message from sandbox', message)

		switch (message.type) {
			case 'ready':
				this.ready = true
				this.config.onReady?.()
				// Process any pending renders
				while (this.pendingRenders.length > 0) {
					const pending = this.pendingRenders.shift()
					if (pending) this.render(pending)
				}
				break

			case 'metrics':
				this.config.onMessage?.(message)
				break

			case 'cwv':
				// Core Web Vitals update
				this.config.onCWVUpdate?.(message.payload as CoreWebVitals)
				break

			case 'error':
				this.config.onError?.(new Error(String(message.payload)))
				break

			default:
				this.config.onMessage?.(message)
		}
	}

	/**
	 * Get metrics from the sandbox
	 */
	async getMetrics(): Promise<PreviewMetrics> {
		return new Promise((resolve) => {
			if (!this.iframe?.contentWindow) {
				resolve({
					renderTimeMs: 0,
					domNodes: 0,
					layoutShifts: 0,
				})
				return
			}

			const handler = (event: MessageEvent) => {
				if (event.source !== this.iframe?.contentWindow) return
				if (event.data.type === 'metrics') {
					window.removeEventListener('message', handler)
					resolve(event.data.payload as PreviewMetrics)
				}
			}

			window.addEventListener('message', handler)

			this.iframe.contentWindow.postMessage(
				{ type: 'getMetrics', timestamp: now() },
				'*',
			)

			// Timeout after 1 second
			setTimeout(() => {
				window.removeEventListener('message', handler)
				resolve({
					renderTimeMs: 0,
					domNodes: 0,
					layoutShifts: 0,
				})
			}, 1000)
		})
	}

	/**
	 * Get Core Web Vitals from the sandbox
	 */
	async getCoreWebVitals(): Promise<CoreWebVitals> {
		return new Promise((resolve) => {
			if (!this.iframe?.contentWindow) {
				resolve({
					lcp: null,
					fid: null,
					inp: null,
					cls: null,
					fcp: null,
					ttfb: null,
				})
				return
			}

			const handler = (event: MessageEvent) => {
				if (event.source !== this.iframe?.contentWindow) return
				if (event.data.type === 'cwv') {
					window.removeEventListener('message', handler)
					resolve(event.data.payload as CoreWebVitals)
				}
			}

			window.addEventListener('message', handler)

			this.iframe.contentWindow.postMessage(
				{ type: 'getCWV', timestamp: now() },
				'*',
			)

			// Timeout after 2 seconds
			setTimeout(() => {
				window.removeEventListener('message', handler)
				resolve({
					lcp: null,
					fid: null,
					inp: null,
					cls: null,
					fcp: null,
					ttfb: null,
				})
			}, 2000)
		})
	}

	/**
	 * Check if sandbox is ready
	 */
	isReady(): boolean {
		return this.ready
	}

	/**
	 * Destroy the sandbox
	 */
	destroy(): void {
		if (this.messageHandler) {
			window.removeEventListener('message', this.messageHandler)
		}

		if (this.iframe) {
			this.iframe.remove()
			this.iframe = null
		}

		this.ready = false
		devLog('renderer', 'Sandbox destroyed')
	}
}

// =============================================================================
// Factory Function
// =============================================================================

export function createSandbox(config: SandboxConfig): Sandbox {
	const sandbox = new Sandbox(config)
	sandbox.init()
	return sandbox
}
