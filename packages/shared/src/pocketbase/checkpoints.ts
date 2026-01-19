// =============================================================================
// PocketBase Checkpoints Collection Operations
// =============================================================================

import { getPocketBase, updateConnectionState, getConnectionState } from './client'
import type { Checkpoint, CheckpointCreate, ListResult } from './types'

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new checkpoint
 */
export async function createCheckpoint(data: CheckpointCreate): Promise<Checkpoint> {
	const pb = getPocketBase()

	const record = await pb.collection('checkpoints').create(data)

	// Update sync state
	const state = getConnectionState()
	updateConnectionState({ lastSyncAt: Date.now() })

	return record as unknown as Checkpoint
}

/**
 * Get a checkpoint by ID
 */
export async function getCheckpoint(id: string): Promise<Checkpoint | null> {
	try {
		const pb = getPocketBase()
		const record = await pb.collection('checkpoints').getOne(id)
		return record as unknown as Checkpoint
	} catch {
		return null
	}
}

/**
 * List all checkpoints for a generation
 */
export async function getGenerationCheckpoints(
	generationId: string,
	options: {
		page?: number
		perPage?: number
		sort?: string
	} = {}
): Promise<ListResult<Checkpoint>> {
	const pb = getPocketBase()
	const { page = 1, perPage = 50, sort = '-created' } = options

	const result = await pb.collection('checkpoints').getList(page, perPage, {
		filter: `generation = "${generationId}"`,
		sort,
	})

	return result as unknown as ListResult<Checkpoint>
}

/**
 * Get all checkpoints for a generation (no pagination)
 */
export async function getAllGenerationCheckpoints(generationId: string): Promise<Checkpoint[]> {
	const pb = getPocketBase()

	const records = await pb.collection('checkpoints').getFullList({
		filter: `generation = "${generationId}"`,
		sort: 'created',
	})

	return records as unknown as Checkpoint[]
}

/**
 * Get the latest checkpoint for a generation
 */
export async function getLatestCheckpoint(generationId: string): Promise<Checkpoint | null> {
	const pb = getPocketBase()

	try {
		const result = await pb.collection('checkpoints').getList(1, 1, {
			filter: `generation = "${generationId}"`,
			sort: '-created',
		})

		if (result.items.length === 0) return null
		return result.items[0] as unknown as Checkpoint
	} catch {
		return null
	}
}

/**
 * Get checkpoint by stage
 */
export async function getCheckpointByStage(
	generationId: string,
	stage: string
): Promise<Checkpoint | null> {
	const pb = getPocketBase()

	try {
		const result = await pb.collection('checkpoints').getList(1, 1, {
			filter: `generation = "${generationId}" && stage = "${stage}"`,
			sort: '-created',
		})

		if (result.items.length === 0) return null
		return result.items[0] as unknown as Checkpoint
	} catch {
		return null
	}
}

/**
 * Update a checkpoint
 */
export async function updateCheckpoint(
	id: string,
	data: Partial<Omit<CheckpointCreate, 'generation'>>
): Promise<Checkpoint> {
	const pb = getPocketBase()

	const record = await pb.collection('checkpoints').update(id, data)

	updateConnectionState({ lastSyncAt: Date.now() })

	return record as unknown as Checkpoint
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(id: string): Promise<boolean> {
	try {
		const pb = getPocketBase()
		await pb.collection('checkpoints').delete(id)
		return true
	} catch {
		return false
	}
}

/**
 * Delete all checkpoints for a generation
 */
export async function deleteGenerationCheckpoints(generationId: string): Promise<number> {
	const pb = getPocketBase()
	let deleted = 0

	const checkpoints = await getAllGenerationCheckpoints(generationId)

	for (const checkpoint of checkpoints) {
		try {
			await pb.collection('checkpoints').delete(checkpoint.id)
			deleted++
		} catch {
			// Continue deleting others if one fails
		}
	}

	return deleted
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Create multiple checkpoints at once
 */
export async function createCheckpoints(
	checkpoints: CheckpointCreate[]
): Promise<{ success: Checkpoint[]; failed: CheckpointCreate[] }> {
	const pb = getPocketBase()
	const success: Checkpoint[] = []
	const failed: CheckpointCreate[] = []

	for (const checkpoint of checkpoints) {
		try {
			const record = await pb.collection('checkpoints').create(checkpoint)
			success.push(record as unknown as Checkpoint)
		} catch {
			failed.push(checkpoint)
		}
	}

	if (success.length > 0) {
		updateConnectionState({ lastSyncAt: Date.now() })
	}

	return { success, failed }
}

// =============================================================================
// Streaming Checkpoint Support
// =============================================================================

/**
 * Create or update a streaming checkpoint
 * This is optimized for high-frequency updates during generation
 */
let streamingCheckpointId: string | null = null
let lastStreamingUpdate = 0
const STREAMING_DEBOUNCE_MS = 500

export async function updateStreamingCheckpoint(
	generationId: string,
	code: string,
	stage: string,
	data?: Record<string, unknown>
): Promise<void> {
	const now = Date.now()

	// Debounce updates
	if (now - lastStreamingUpdate < STREAMING_DEBOUNCE_MS) {
		return
	}

	lastStreamingUpdate = now

	const pb = getPocketBase()

	try {
		if (streamingCheckpointId) {
			// Update existing streaming checkpoint
			await pb.collection('checkpoints').update(streamingCheckpointId, {
				code,
				stage,
				data,
			})
		} else {
			// Create new streaming checkpoint
			const record = await pb.collection('checkpoints').create({
				generation: generationId,
				code,
				stage: `streaming_${stage}`,
				data,
			})
			streamingCheckpointId = record.id
		}
	} catch (err) {
		console.warn('Failed to update streaming checkpoint:', err)
	}
}

/**
 * Finalize the streaming checkpoint
 */
export async function finalizeStreamingCheckpoint(
	generationId: string,
	finalCode: string,
	stage: string
): Promise<Checkpoint | null> {
	const pb = getPocketBase()

	try {
		// Create final checkpoint
		const record = await pb.collection('checkpoints').create({
			generation: generationId,
			code: finalCode,
			stage: `final_${stage}`,
			data: { completedAt: Date.now() },
		})

		// Clean up streaming checkpoint
		if (streamingCheckpointId) {
			try {
				await pb.collection('checkpoints').delete(streamingCheckpointId)
			} catch {
				// Ignore delete failure
			}
		}

		streamingCheckpointId = null
		lastStreamingUpdate = 0

		return record as unknown as Checkpoint
	} catch (err) {
		console.warn('Failed to finalize streaming checkpoint:', err)
		return null
	}
}

/**
 * Reset streaming checkpoint state
 */
export function resetStreamingCheckpoint(): void {
	streamingCheckpointId = null
	lastStreamingUpdate = 0
}

// =============================================================================
// Realtime Subscriptions
// =============================================================================

let checkpointSubscription: (() => void) | null = null

/**
 * Subscribe to checkpoint changes for a generation
 */
export function subscribeToGenerationCheckpoints(
	generationId: string,
	callback: (action: 'create' | 'update' | 'delete', checkpoint: Checkpoint) => void
): () => void {
	const pb = getPocketBase()

	pb.collection('checkpoints').subscribe('*', (e) => {
		const checkpoint = e.record as unknown as Checkpoint
		if (checkpoint.generation === generationId) {
			callback(e.action as 'create' | 'update' | 'delete', checkpoint)
		}
	})

	return () => {
		pb.collection('checkpoints').unsubscribe('*')
	}
}

/**
 * Unsubscribe from all checkpoint events
 */
export function unsubscribeFromCheckpoints(): void {
	if (checkpointSubscription) {
		checkpointSubscription()
		checkpointSubscription = null
	}
}

// =============================================================================
// Check if collection is available
// =============================================================================

export async function isAvailable(): Promise<boolean> {
	try {
		const pb = getPocketBase()
		await pb.collection('checkpoints').getList(1, 1)
		return true
	} catch {
		return false
	}
}
