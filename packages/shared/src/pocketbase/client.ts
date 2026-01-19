// =============================================================================
// PocketBase Client Singleton
// =============================================================================

import PocketBase from 'pocketbase'
import type { ConnectionState } from './types'

// Default to localhost for development, can be overridden via environment
const DEFAULT_POCKETBASE_URL = 'http://127.0.0.1:8090'

// =============================================================================
// Client Configuration
// =============================================================================

export interface PocketBaseConfig {
	url?: string
	autoRefreshToken?: boolean
}

// =============================================================================
// Connection State Management
// =============================================================================

let connectionState: ConnectionState = {
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	isConnected: false,
	lastSyncAt: null,
	pendingChanges: 0,
}

const stateListeners = new Set<(state: ConnectionState) => void>()

function notifyStateListeners() {
	for (const listener of stateListeners) {
		listener(connectionState)
	}
}

export function getConnectionState(): ConnectionState {
	return { ...connectionState }
}

export function subscribeToConnectionState(listener: (state: ConnectionState) => void): () => void {
	stateListeners.add(listener)
	// Immediately call with current state
	listener(connectionState)
	return () => stateListeners.delete(listener)
}

export function updateConnectionState(partial: Partial<ConnectionState>) {
	connectionState = { ...connectionState, ...partial }
	notifyStateListeners()
}

// =============================================================================
// Client Singleton
// =============================================================================

let clientInstance: PocketBase | null = null
let clientConfig: PocketBaseConfig = {}

/**
 * Initialize the PocketBase client with configuration
 * Should be called once at app startup
 */
export function initPocketBase(config: PocketBaseConfig = {}): PocketBase {
	clientConfig = config
	const url = config.url ?? getPocketBaseUrl()

	clientInstance = new PocketBase(url)

	// Enable auto-refresh for auth tokens (default true)
	if (config.autoRefreshToken !== false) {
		clientInstance.autoCancellation(false)
	}

	// Set up online/offline listeners
	if (typeof window !== 'undefined') {
		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)
	}

	// Test connection
	testConnection()

	return clientInstance
}

/**
 * Get the PocketBase URL from environment or default
 */
function getPocketBaseUrl(): string {
	// Check various environment variable patterns
	if (typeof process !== 'undefined' && process.env) {
		return process.env.POCKETBASE_URL ??
			   process.env.PUBLIC_POCKETBASE_URL ??
			   process.env.VITE_POCKETBASE_URL ??
			   DEFAULT_POCKETBASE_URL
	}

	// Check for Vite/SvelteKit style env vars (browser context)
	try {
		// @ts-expect-error - Vite injects import.meta.env at build time
		const env = import.meta.env
		if (env) {
			return env.POCKETBASE_URL ??
				   env.PUBLIC_POCKETBASE_URL ??
				   env.VITE_POCKETBASE_URL ??
				   DEFAULT_POCKETBASE_URL
		}
	} catch {
		// import.meta.env not available
	}

	return DEFAULT_POCKETBASE_URL
}

/**
 * Get the PocketBase client instance
 * Auto-initializes if not already initialized
 */
export function getPocketBase(): PocketBase {
	if (!clientInstance) {
		clientInstance = initPocketBase(clientConfig)
	}
	return clientInstance
}

/**
 * Test connection to PocketBase server
 */
async function testConnection(): Promise<boolean> {
	if (!clientInstance) return false

	try {
		await clientInstance.health.check()
		updateConnectionState({ isConnected: true })
		return true
	} catch {
		updateConnectionState({ isConnected: false })
		return false
	}
}

/**
 * Handle coming back online
 */
function handleOnline() {
	updateConnectionState({ isOnline: true })
	testConnection()
}

/**
 * Handle going offline
 */
function handleOffline() {
	updateConnectionState({ isOnline: false, isConnected: false })
}

// =============================================================================
// Auth Helpers (for future use)
// =============================================================================

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	return clientInstance?.authStore.isValid ?? false
}

/**
 * Get current user
 */
export function getCurrentUser() {
	return clientInstance?.authStore.record ?? null
}

/**
 * Clear authentication
 */
export function logout() {
	clientInstance?.authStore.clear()
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Cleanup client and event listeners
 */
export function destroyPocketBase() {
	if (typeof window !== 'undefined') {
		window.removeEventListener('online', handleOnline)
		window.removeEventListener('offline', handleOffline)
	}

	stateListeners.clear()
	clientInstance = null

	connectionState = {
		isOnline: true,
		isConnected: false,
		lastSyncAt: null,
		pendingChanges: 0,
	}
}

// =============================================================================
// Export types
// =============================================================================

export type { PocketBase }
