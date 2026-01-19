// =============================================================================
// Sync Layer - Offline-First Support
// =============================================================================

import Dexie, { type Table } from 'dexie'
import {
	getPocketBase,
	getConnectionState,
	subscribeToConnectionState,
	updateConnectionState,
} from './client'
import type {
	SyncQueueItem,
	SyncCollection,
	SyncOperation,
	SyncStatus,
	Conversation,
	Message,
	Generation,
} from './types'
import { createId } from '../index'

// =============================================================================
// Sync Queue Database (IndexedDB)
// =============================================================================

class SyncQueueDB extends Dexie {
	queue!: Table<SyncQueueItem>

	constructor() {
		super('v0-sync-queue')
		this.version(1).stores({
			queue: '++id, collection, operation, status, createdAt',
		})
	}
}

const syncDB = new SyncQueueDB()

// =============================================================================
// Queue Operations
// =============================================================================

/**
 * Add an item to the sync queue
 */
export async function queueOperation(
	collection: SyncCollection,
	operation: SyncOperation,
	data: unknown,
	localId?: string
): Promise<string> {
	const id = createId()

	const item: SyncQueueItem = {
		id,
		collection,
		operation,
		data,
		localId,
		status: 'pending',
		retries: 0,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	}

	await syncDB.queue.add(item)
	updatePendingCount()

	// Try to sync immediately if online
	const state = getConnectionState()
	if (state.isConnected) {
		processSyncQueue()
	}

	return id
}

/**
 * Get pending items count
 */
async function updatePendingCount() {
	const count = await syncDB.queue.where('status').anyOf(['pending', 'failed']).count()
	updateConnectionState({ pendingChanges: count })
}

/**
 * Get all pending queue items
 */
export async function getPendingItems(): Promise<SyncQueueItem[]> {
	return syncDB.queue.where('status').anyOf(['pending', 'failed']).toArray()
}

/**
 * Update queue item status
 */
async function updateQueueItem(id: string, updates: Partial<SyncQueueItem>) {
	await syncDB.queue.update(id, {
		...updates,
		updatedAt: Date.now(),
	})
}

/**
 * Remove completed items from queue
 */
async function removeCompletedItems() {
	await syncDB.queue.where('status').equals('synced').delete()
	updatePendingCount()
}

// =============================================================================
// Sync Processing
// =============================================================================

let isSyncing = false
const MAX_RETRIES = 3

/**
 * Process the sync queue
 */
export async function processSyncQueue(): Promise<void> {
	if (isSyncing) return

	const state = getConnectionState()
	if (!state.isConnected) return

	isSyncing = true

	try {
		const pending = await getPendingItems()

		for (const item of pending) {
			if (item.retries >= MAX_RETRIES) {
				await updateQueueItem(item.id, { status: 'failed' })
				continue
			}

			await updateQueueItem(item.id, { status: 'syncing' })

			try {
				await processQueueItem(item)
				await updateQueueItem(item.id, { status: 'synced' })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				await updateQueueItem(item.id, {
					status: 'failed',
					retries: item.retries + 1,
					error: errorMessage,
				})
			}
		}

		// Clean up completed items
		await removeCompletedItems()
		updateConnectionState({ lastSyncAt: Date.now() })
	} finally {
		isSyncing = false
	}
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
	const pb = getPocketBase()
	const { collection, operation, data } = item

	switch (operation) {
		case 'create':
			await pb.collection(collection).create(data as Record<string, unknown>)
			break

		case 'update': {
			const updateData = data as { id: string; updates: Record<string, unknown> }
			await pb.collection(collection).update(updateData.id, updateData.updates)
			break
		}

		case 'delete': {
			const deleteData = data as { id: string }
			await pb.collection(collection).delete(deleteData.id)
			break
		}
	}
}

// =============================================================================
// Offline-First Wrappers
// =============================================================================

/**
 * Create with offline support
 * Returns immediately with local data, syncs in background
 */
export async function offlineCreate<T extends Record<string, unknown>>(
	collection: SyncCollection,
	data: Record<string, unknown>,
	immediate = false
): Promise<T & { _localId: string; _synced: boolean }> {
	const localId = createId()
	const state = getConnectionState()

	if (state.isConnected && immediate) {
		// Try to create immediately if online
		try {
			const pb = getPocketBase()
			const serverRecord = await pb.collection(collection).create<T>(data)
			return {
				...serverRecord,
				_localId: localId,
				_synced: true,
			} as T & { _localId: string; _synced: boolean }
		} catch {
			// Fall through to queue
		}
	}

	// Create local record with temporary ID
	const localRecord = {
		...data,
		id: localId,
		_localId: localId,
		_synced: false,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
	} as unknown as T & { _localId: string; _synced: boolean }

	// Queue for later sync
	await queueOperation(collection, 'create', data, localId)
	return localRecord
}

/**
 * Update with offline support
 */
export async function offlineUpdate<T extends Record<string, unknown>>(
	collection: SyncCollection,
	id: string,
	updates: Record<string, unknown>
): Promise<T & { _synced: boolean }> {
	const state = getConnectionState()

	if (state.isConnected) {
		try {
			const pb = getPocketBase()
			const record = await pb.collection(collection).update<T>(id, updates)
			return { ...record, _synced: true } as T & { _synced: boolean }
		} catch {
			// Fall through to queue
		}
	}

	// Queue for later sync
	await queueOperation(collection, 'update', { id, updates })

	// Return optimistic update
	return {
		id,
		...updates,
		_synced: false,
	} as unknown as T & { _synced: boolean }
}

/**
 * Delete with offline support
 */
export async function offlineDelete(
	collection: SyncCollection,
	id: string
): Promise<boolean> {
	const state = getConnectionState()

	if (state.isConnected) {
		try {
			const pb = getPocketBase()
			await pb.collection(collection).delete(id)
			return true
		} catch {
			// Fall through to queue
		}
	}

	// Queue for later sync
	await queueOperation(collection, 'delete', { id })
	return true
}

// =============================================================================
// Auto-sync on Reconnection
// =============================================================================

let unsubscribe: (() => void) | null = null

/**
 * Start auto-sync listener
 */
export function startAutoSync() {
	if (unsubscribe) return

	unsubscribe = subscribeToConnectionState((state) => {
		if (state.isConnected && state.pendingChanges > 0) {
			processSyncQueue()
		}
	})
}

/**
 * Stop auto-sync listener
 */
export function stopAutoSync() {
	if (unsubscribe) {
		unsubscribe()
		unsubscribe = null
	}
}

// =============================================================================
// Manual Sync Trigger
// =============================================================================

/**
 * Force sync all pending changes
 */
export async function forceSyncAll(): Promise<{ synced: number; failed: number }> {
	const before = await getPendingItems()
	await processSyncQueue()
	const after = await getPendingItems()

	const synced = before.length - after.length
	const failed = after.filter((i) => i.status === 'failed').length

	return { synced, failed }
}

/**
 * Clear all failed items from queue
 */
export async function clearFailedItems(): Promise<number> {
	const count = await syncDB.queue.where('status').equals('failed').delete()
	updatePendingCount()
	return count
}

/**
 * Retry all failed items
 */
export async function retryFailedItems(): Promise<void> {
	await syncDB.queue
		.where('status')
		.equals('failed')
		.modify({ status: 'pending', retries: 0, error: undefined })

	updatePendingCount()
	processSyncQueue()
}

// =============================================================================
// Conflict Resolution
// =============================================================================

export type ConflictStrategy = 'server-wins' | 'client-wins' | 'manual'

let conflictStrategy: ConflictStrategy = 'server-wins'

/**
 * Set conflict resolution strategy
 */
export function setConflictStrategy(strategy: ConflictStrategy) {
	conflictStrategy = strategy
}

/**
 * Get current conflict strategy
 */
export function getConflictStrategy(): ConflictStrategy {
	return conflictStrategy
}

// =============================================================================
// Export Queue Stats
// =============================================================================

export async function getQueueStats(): Promise<{
	pending: number
	syncing: number
	synced: number
	failed: number
}> {
	const all = await syncDB.queue.toArray()

	return {
		pending: all.filter((i) => i.status === 'pending').length,
		syncing: all.filter((i) => i.status === 'syncing').length,
		synced: all.filter((i) => i.status === 'synced').length,
		failed: all.filter((i) => i.status === 'failed').length,
	}
}
