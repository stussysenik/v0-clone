// =============================================================================
// Generations Module
// =============================================================================

import { getPocketBase, updateConnectionState } from './client'
import type {
	Generation,
	GenerationCreate,
	ListResult,
	RealtimeEvent,
} from './types'

const COLLECTION = 'generations'

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new generation
 */
export async function createGeneration(data: GenerationCreate): Promise<Generation> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).create<Generation>({
			conversation: data.conversation,
			prompt: data.prompt,
			code: data.code,
			html: data.html,
			parent: data.parent,
			metadata: data.metadata ?? {},
		})

		updateConnectionState({ lastSyncAt: Date.now() })
		return record
	} catch (error) {
		console.error('Failed to create generation:', error)
		throw error
	}
}

/**
 * Get a generation by ID
 */
export async function getGeneration(id: string): Promise<Generation | null> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).getOne<Generation>(id)
		return record
	} catch (error) {
		if ((error as { status?: number }).status === 404) {
			return null
		}
		throw error
	}
}

/**
 * Get a generation with expanded relations
 */
export async function getGenerationWithRelations(id: string): Promise<Generation | null> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).getOne<Generation>(id, {
			expand: 'conversation,parent',
		})
		return record
	} catch (error) {
		if ((error as { status?: number }).status === 404) {
			return null
		}
		throw error
	}
}

/**
 * List generations with optional filtering
 */
export async function listGenerations(options?: {
	conversationId?: string
	page?: number
	perPage?: number
	sort?: string
}): Promise<ListResult<Generation>> {
	const pb = getPocketBase()

	const filter = options?.conversationId
		? `conversation = "${options.conversationId}"`
		: ''

	try {
		const result = await pb.collection(COLLECTION).getList<Generation>(
			options?.page ?? 1,
			options?.perPage ?? 50,
			{
				filter,
				sort: options?.sort ?? '-created',
			}
		)
		return result
	} catch (error) {
		console.error('Failed to list generations:', error)
		throw error
	}
}

/**
 * Get all generations for a conversation
 */
export async function getConversationGenerations(conversationId: string): Promise<Generation[]> {
	const result = await listGenerations({ conversationId })
	return result.items
}

/**
 * Get recent generations
 */
export async function getRecentGenerations(limit = 20): Promise<Generation[]> {
	const result = await listGenerations({ perPage: limit })
	return result.items
}

/**
 * Update a generation
 */
export async function updateGeneration(
	id: string,
	data: Partial<Pick<Generation, 'code' | 'html' | 'metadata'>>
): Promise<Generation> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).update<Generation>(id, data)
		updateConnectionState({ lastSyncAt: Date.now() })
		return record
	} catch (error) {
		console.error('Failed to update generation:', error)
		throw error
	}
}

/**
 * Delete a generation
 */
export async function deleteGeneration(id: string): Promise<boolean> {
	const pb = getPocketBase()

	try {
		await pb.collection(COLLECTION).delete(id)
		updateConnectionState({ lastSyncAt: Date.now() })
		return true
	} catch (error) {
		console.error('Failed to delete generation:', error)
		throw error
	}
}

// =============================================================================
// Version History (Parent-Child Chain)
// =============================================================================

/**
 * Create a new version of an existing generation
 */
export async function createVersion(
	parentId: string,
	data: Omit<GenerationCreate, 'parent'>
): Promise<Generation> {
	return createGeneration({
		...data,
		parent: parentId,
	})
}

/**
 * Get all versions of a generation (the version chain)
 */
export async function getVersionHistory(generationId: string): Promise<Generation[]> {
	const pb = getPocketBase()
	const history: Generation[] = []

	// Get the generation
	const generation = await getGeneration(generationId)
	if (!generation) return []

	// Walk up the parent chain to find the root
	let current: Generation | null = generation
	const visited = new Set<string>()

	while (current?.parent && !visited.has(current.id)) {
		visited.add(current.id)
		current = await getGeneration(current.parent)
	}

	// Now we have the root, get all descendants
	const root = current
	if (!root) return [generation]

	// Get all generations that form a chain from this root
	try {
		const all = await pb.collection(COLLECTION).getFullList<Generation>({
			sort: 'created',
		})

		// Build the chain starting from root
		const idToGen = new Map<string, Generation>(all.map((g) => [g.id, g]))
		const queue = [root]

		while (queue.length > 0) {
			const gen = queue.shift()!
			if (!visited.has(gen.id)) {
				history.push(gen)
				visited.add(gen.id)

				// Find children
				for (const g of all) {
					if (g.parent === gen.id && !visited.has(g.id)) {
						queue.push(g)
					}
				}
			}
		}

		return history.sort((a, b) =>
			new Date(a.created).getTime() - new Date(b.created).getTime()
		)
	} catch (error) {
		console.error('Failed to get version history:', error)
		return [generation]
	}
}

/**
 * Get the latest version in a chain
 */
export async function getLatestVersion(generationId: string): Promise<Generation> {
	const history = await getVersionHistory(generationId)
	return history[history.length - 1]
}

/**
 * Get children of a generation
 */
export async function getChildren(generationId: string): Promise<Generation[]> {
	const pb = getPocketBase()

	try {
		const result = await pb.collection(COLLECTION).getList<Generation>(1, 100, {
			filter: `parent = "${generationId}"`,
			sort: 'created',
		})
		return result.items
	} catch (error) {
		console.error('Failed to get children:', error)
		throw error
	}
}

// =============================================================================
// Real-time Subscriptions
// =============================================================================

type GenerationCallback = (event: RealtimeEvent<Generation>) => void

/**
 * Subscribe to generation updates
 */
export function subscribeToGenerations(
	callback: GenerationCallback,
	generationId?: string
): () => void {
	const pb = getPocketBase()

	const topic = generationId ? `${COLLECTION}/${generationId}` : '*'

	pb.collection(COLLECTION).subscribe(topic, (e) => {
		callback({
			action: e.action as RealtimeEvent['action'],
			record: e.record as Generation,
		})
	})

	return () => {
		pb.collection(COLLECTION).unsubscribe(topic)
	}
}

/**
 * Subscribe to generations for a specific conversation
 */
export function subscribeToConversationGenerations(
	conversationId: string,
	callback: GenerationCallback
): () => void {
	const pb = getPocketBase()

	pb.collection(COLLECTION).subscribe('*', (e) => {
		const record = e.record as Generation
		if (record.conversation === conversationId) {
			callback({
				action: e.action as RealtimeEvent['action'],
				record,
			})
		}
	})

	return () => {
		pb.collection(COLLECTION).unsubscribe()
	}
}

// =============================================================================
// Search
// =============================================================================

/**
 * Search generations by prompt or code content
 */
export async function searchGenerations(
	query: string,
	options?: {
		conversationId?: string
		limit?: number
	}
): Promise<Generation[]> {
	const pb = getPocketBase()

	if (!query.trim()) {
		return getRecentGenerations(options?.limit)
	}

	const filters: string[] = [`(prompt ~ "${query}" || code ~ "${query}")`]

	if (options?.conversationId) {
		filters.push(`conversation = "${options.conversationId}"`)
	}

	try {
		const result = await pb.collection(COLLECTION).getList<Generation>(
			1,
			options?.limit ?? 50,
			{
				filter: filters.join(' && '),
				sort: '-created',
			}
		)
		return result.items
	} catch (error) {
		console.error('Failed to search generations:', error)
		throw error
	}
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get generation statistics
 */
export async function getGenerationStats(): Promise<{
	total: number
	byProvider: Record<string, number>
	avgDurationMs: number
}> {
	const pb = getPocketBase()

	try {
		const all = await pb.collection(COLLECTION).getFullList<Generation>()

		const byProvider: Record<string, number> = {}
		let totalDuration = 0
		let durationCount = 0

		for (const gen of all) {
			const provider = gen.metadata?.provider ?? 'unknown'
			byProvider[provider] = (byProvider[provider] ?? 0) + 1

			if (gen.metadata?.durationMs) {
				totalDuration += gen.metadata.durationMs
				durationCount++
			}
		}

		return {
			total: all.length,
			byProvider,
			avgDurationMs: durationCount > 0 ? totalDuration / durationCount : 0,
		}
	} catch (error) {
		console.error('Failed to get generation stats:', error)
		return {
			total: 0,
			byProvider: {},
			avgDurationMs: 0,
		}
	}
}
