// =============================================================================
// Messages Module
// =============================================================================

import { getPocketBase, updateConnectionState } from './client'
import type {
	Message,
	MessageCreate,
	MessageRole,
	ListResult,
	RealtimeEvent,
} from './types'

const COLLECTION = 'messages'

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new message in a conversation
 */
export async function createMessage(data: MessageCreate): Promise<Message> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).create<Message>({
			conversation: data.conversation,
			role: data.role,
			content: data.content,
			metadata: data.metadata ?? {},
		})

		updateConnectionState({ lastSyncAt: Date.now() })
		return record
	} catch (error) {
		console.error('Failed to create message:', error)
		throw error
	}
}

/**
 * Get a message by ID
 */
export async function getMessage(id: string): Promise<Message | null> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).getOne<Message>(id)
		return record
	} catch (error) {
		if ((error as { status?: number }).status === 404) {
			return null
		}
		throw error
	}
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(
	conversationId: string,
	options?: {
		page?: number
		perPage?: number
	}
): Promise<ListResult<Message>> {
	const pb = getPocketBase()

	try {
		const result = await pb.collection(COLLECTION).getList<Message>(
			options?.page ?? 1,
			options?.perPage ?? 100,
			{
				filter: `conversation = "${conversationId}"`,
				sort: 'created',
			}
		)
		return result
	} catch (error) {
		console.error('Failed to get conversation messages:', error)
		throw error
	}
}

/**
 * Get all messages for a conversation as a flat array
 */
export async function getAllConversationMessages(conversationId: string): Promise<Message[]> {
	const pb = getPocketBase()

	try {
		const records = await pb.collection(COLLECTION).getFullList<Message>({
			filter: `conversation = "${conversationId}"`,
			sort: 'created',
		})
		return records
	} catch (error) {
		console.error('Failed to get all conversation messages:', error)
		throw error
	}
}

/**
 * Get recent messages across all conversations
 */
export async function getRecentMessages(limit = 50): Promise<Message[]> {
	const pb = getPocketBase()

	try {
		const result = await pb.collection(COLLECTION).getList<Message>(1, limit, {
			sort: '-created',
		})
		return result.items
	} catch (error) {
		console.error('Failed to get recent messages:', error)
		throw error
	}
}

/**
 * Update a message
 */
export async function updateMessage(
	id: string,
	data: Partial<Pick<Message, 'content' | 'metadata'>>
): Promise<Message> {
	const pb = getPocketBase()

	try {
		const record = await pb.collection(COLLECTION).update<Message>(id, data)
		updateConnectionState({ lastSyncAt: Date.now() })
		return record
	} catch (error) {
		console.error('Failed to update message:', error)
		throw error
	}
}

/**
 * Delete a message
 */
export async function deleteMessage(id: string): Promise<boolean> {
	const pb = getPocketBase()

	try {
		await pb.collection(COLLECTION).delete(id)
		updateConnectionState({ lastSyncAt: Date.now() })
		return true
	} catch (error) {
		console.error('Failed to delete message:', error)
		throw error
	}
}

/**
 * Delete all messages for a conversation
 */
export async function deleteConversationMessages(conversationId: string): Promise<number> {
	const pb = getPocketBase()

	try {
		const messages = await getAllConversationMessages(conversationId)

		for (const message of messages) {
			await pb.collection(COLLECTION).delete(message.id)
		}

		updateConnectionState({ lastSyncAt: Date.now() })
		return messages.length
	} catch (error) {
		console.error('Failed to delete conversation messages:', error)
		throw error
	}
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Create multiple messages at once
 */
export async function createMessages(messages: MessageCreate[]): Promise<Message[]> {
	const results: Message[] = []

	for (const data of messages) {
		const record = await createMessage(data)
		results.push(record)
	}

	return results
}

/**
 * Add a user message and assistant response pair
 */
export async function addMessagePair(
	conversationId: string,
	userContent: string,
	assistantContent: string
): Promise<{ userMessage: Message; assistantMessage: Message }> {
	const userMessage = await createMessage({
		conversation: conversationId,
		role: 'user',
		content: userContent,
	})

	const assistantMessage = await createMessage({
		conversation: conversationId,
		role: 'assistant',
		content: assistantContent,
	})

	return { userMessage, assistantMessage }
}

// =============================================================================
// Real-time Subscriptions
// =============================================================================

type MessageCallback = (event: RealtimeEvent<Message>) => void

/**
 * Subscribe to messages in a specific conversation
 */
export function subscribeToConversationMessages(
	conversationId: string,
	callback: MessageCallback
): () => void {
	const pb = getPocketBase()

	// Subscribe with filter for specific conversation
	pb.collection(COLLECTION).subscribe('*', (e) => {
		const record = e.record as Message
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

/**
 * Subscribe to all message updates
 */
export function subscribeToMessages(callback: MessageCallback): () => void {
	const pb = getPocketBase()

	pb.collection(COLLECTION).subscribe('*', (e) => {
		callback({
			action: e.action as RealtimeEvent['action'],
			record: e.record as Message,
		})
	})

	return () => {
		pb.collection(COLLECTION).unsubscribe()
	}
}

// =============================================================================
// Search
// =============================================================================

/**
 * Search messages by content
 */
export async function searchMessages(
	query: string,
	options?: {
		conversationId?: string
		role?: MessageRole
		limit?: number
	}
): Promise<Message[]> {
	const pb = getPocketBase()

	if (!query.trim()) {
		return []
	}

	const filters: string[] = [`content ~ "${query}"`]

	if (options?.conversationId) {
		filters.push(`conversation = "${options.conversationId}"`)
	}

	if (options?.role) {
		filters.push(`role = "${options.role}"`)
	}

	try {
		const result = await pb.collection(COLLECTION).getList<Message>(
			1,
			options?.limit ?? 50,
			{
				filter: filters.join(' && '),
				sort: '-created',
			}
		)
		return result.items
	} catch (error) {
		console.error('Failed to search messages:', error)
		throw error
	}
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get message count for a conversation
 */
export async function getMessageCount(conversationId: string): Promise<number> {
	const pb = getPocketBase()

	try {
		const result = await pb.collection(COLLECTION).getList<Message>(1, 1, {
			filter: `conversation = "${conversationId}"`,
		})
		return result.totalItems
	} catch (error) {
		console.error('Failed to get message count:', error)
		return 0
	}
}

/**
 * Get message count by role for a conversation
 */
export async function getMessageCountByRole(
	conversationId: string
): Promise<Record<MessageRole, number>> {
	const messages = await getAllConversationMessages(conversationId)

	const counts: Record<MessageRole, number> = {
		user: 0,
		assistant: 0,
		system: 0,
	}

	for (const message of messages) {
		counts[message.role]++
	}

	return counts
}
