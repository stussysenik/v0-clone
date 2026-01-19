export * from './types'
export * from './store'
export * from './chronicle'
export * from './validation'
export * as schema from './schema'
export * from './pocketbase'
export { pb, default as pocketbase } from './pocketbase'

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * High-precision timestamp in milliseconds
 */
export function now(): number {
	return performance.now()
}

/**
 * Create a unique ID for messages/events
 */
export function createId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Measure execution time of a function
 */
export async function measure<T>(
	fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
	const start = now()
	const result = await fn()
	const durationMs = now() - start
	return { result, durationMs }
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
	if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`
	if (ms < 1000) return `${ms.toFixed(2)}ms`
	return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Dev info logger - only logs when DEV_INFO flag is set
 */
export function devLog(category: string, message: string, data?: unknown): void {
	const isDev = typeof process !== 'undefined'
		? process.env.DEV_INFO === 'true'
		: (globalThis as Record<string, unknown>).DEV_INFO === true

	if (!isDev) return

	const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
	const prefix = `[${timestamp}] [${category.toUpperCase()}]`

	if (data) {
		console.log(`${prefix} ${message}`, data)
	} else {
		console.log(`${prefix} ${message}`)
	}
}

/**
 * Debounce function with immediate option
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	ms: number,
	immediate = false,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null

	return function (this: unknown, ...args: Parameters<T>) {
		const callNow = immediate && !timeout

		if (timeout) clearTimeout(timeout)

		timeout = setTimeout(() => {
			timeout = null
			if (!immediate) fn.apply(this, args)
		}, ms)

		if (callNow) fn.apply(this, args)
	}
}
