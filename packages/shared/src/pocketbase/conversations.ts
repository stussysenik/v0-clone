// =============================================================================
// Conversations Module
// =============================================================================

import { getPocketBase, updateConnectionState, getConnectionState } from './client'
import type {
	Conversation,
	ConversationCreate,
	ConversationUpdate,
	ConversationStatus,
	ListResult,
	RealtimeEvent,
} from './types'

const COLLECTION = 'conversations'

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(data: ConversationCreate): Promise<Conversation> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).create<Conversation>({
			title: data.title,
			status: data.status ?? 'active',
			metadata: data.metadata ?? {},
		})

		updateConnectionState({ lastSyncAt: Date.now() })
		return record
	} catch (error) {
		console.error('Failed to create conversation:', error)
		throw error
	}
}

/**
 * Get a conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).getOne<Conversation>(id)
		return record
	} catch (error) {
		// Return null for 404, throw for other errors
		if ((error as { status?: number }).status === 404) {
			return null
		}
		throw error
	}
}

/**
 * List conversations with optional filtering
 */
export async function listConversations(options?: {
	status?: ConversationStatus
	page?: number
	perPage?: number
	sort?: string
}): Promise<ListResult<Conversation>> {
	const pb = getPocketBase()

	const filter = options?.status ? `status = "${options.status}"` : ''

	try {
		const result = await pb.collection(COLLECTION).getList<Conversation>(
			options?.page ?? 1,
			options?.perPage ?? 50,
			{
				filter,
				sort: options?.sort ?? '-created',
			}
		)
		return result
	} catch (error) {
		console.error('Failed to list conversations:', error)
		throw error
	}
}

/**
 * Get all active conversations
 */
export async function getActiveConversations(): Promise<Conversation[]> {
	const result = await listConversations({ status: 'active' })
	return result.items
}

/**
 * Get recent conversations (last 20)
 */
export async function getRecentConversations(limit = 20): Promise<Conversation[]> {
	const result = await listConversations({ perPage: limit })
	return result.items
}

/**
 * Update a conversation
 */
export async function updateConversation(
	id: string,
	data: ConversationUpdate
): Promise<Conversation> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).update<Conversation>(id, data)
		updateConnectionState({ lastSyncAt: Date.now() })
		return record
	} catch (error) {
		console.error('Failed to update conversation:', error)
		throw error
	}
}

/**
 * Archive a conversation (soft delete)
 */
export async function archiveConversation(id: string): Promise<Conversation> {
	return updateConversation(id, { status: 'archived' })
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(id: string): Promise<Conversation> {
	return updateConversation(id, { status: 'active' })
}

/**
 * Delete a conversation permanently
 */
export async function deleteConversation(id: string): Promise<boolean> {
	const pb = getPocketBase()

	try {
		await pb.collection(COLLECTION).delete(id)
		updateConnectionState({ lastSyncAt: Date.now() })
		return true
	} catch (error) {
		console.error('Failed to delete conversation:', error)
		throw error
	}
}

// =============================================================================
// Title Generation
// =============================================================================

/**
 * Generate a title from the first message content
 */
export function generateTitle(content: string, maxLength = 50): string {
	// Take first line or sentence
	const firstLine = content.split('\n')[0]
	const firstSentence = firstLine.split(/[.!?]/)[0]

	let title = firstSentence.trim()

	// Truncate if too long
	if (title.length > maxLength) {
		title = title.substring(0, maxLength - 3) + '...'
	}

	return title || 'New Conversation'
}

/**
 * Create a conversation with auto-generated title from first message
 */
export async function createConversationWithTitle(firstMessage: string): Promise<Conversation> {
	const title = generateTitle(firstMessage)
	return createConversation({ title })
}

// =============================================================================
// Real-time Subscriptions
// =============================================================================

type ConversationCallback = (event: RealtimeEvent<Conversation>) => void

/**
 * Subscribe to real-time conversation updates
 */
export function subscribeToConversations(
	callback: ConversationCallback,
	conversationId?: string
): () => void {
	const pb = getPocketBase()

	const topic = conversationId ? `${COLLECTION}/${conversationId}` : COLLECTION

	pb.collection(COLLECTION).subscribe(topic, (e) => {
		callback({
			action: e.action as RealtimeEvent['action'],
			record: e.record as Conversation,
		})
	})

	// Return unsubscribe function
	return () => {
		pb.collection(COLLECTION).unsubscribe(topic)
	}
}

/**
 * Unsubscribe from all conversation updates
 */
export function unsubscribeFromConversations() {
	const pb = getPocketBase()
	pb.collection(COLLECTION).unsubscribe()
}

// =============================================================================
// Search
// =============================================================================

/**
 * Search conversations by title
 */
export async function searchConversations(query: string): Promise<Conversation[]> {
	const pb = getPocketBase()

	if (!query.trim()) {
		return getRecentConversations()
	}

	try {
		const result = await pb.collection(COLLECTION).getList<Conversation>(1, 50, {
			filter: `title ~ "${query}" && status = "active"`,
			sort: '-created',
		})
		return result.items
	} catch (error) {
		console.error('Failed to search conversations:', error)
		throw error
	}
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Check if PocketBase is available
 */
export function isAvailable(): boolean {
	return getConnectionState().isConnected
}
