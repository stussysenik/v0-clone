// =============================================================================
// PocketBase Module - Main Export
// =============================================================================

// Client
export {
	initPocketBase,
	getPocketBase,
	destroyPocketBase,
	getConnectionState,
	subscribeToConnectionState,
	updateConnectionState,
	isAuthenticated,
	getCurrentUser,
	logout,
	type PocketBase,
	type PocketBaseConfig,
} from './client'

// Types
export type {
	BaseRecord,
	Conversation,
	ConversationCreate,
	ConversationUpdate,
	ConversationStatus,
	Message,
	MessageCreate,
	MessageRole,
	Generation,
	GenerationCreate,
	Checkpoint,
	CheckpointCreate,
	SyncQueueItem,
	SyncOperation,
	SyncCollection,
	SyncStatus,
	RealtimeEvent,
	RealtimeAction,
	ConnectionState,
	ListResult,
} from './types'

// Conversations
export {
	createConversation,
	getConversation,
	listConversations,
	getActiveConversations,
	getRecentConversations,
	updateConversation,
	archiveConversation,
	unarchiveConversation,
	deleteConversation,
	generateTitle,
	createConversationWithTitle,
	subscribeToConversations,
	unsubscribeFromConversations,
	searchConversations,
	isAvailable as isConversationsAvailable,
} from './conversations'

// Messages
export {
	createMessage,
	getMessage,
	getConversationMessages,
	getAllConversationMessages,
	getRecentMessages,
	updateMessage,
	deleteMessage,
	deleteConversationMessages,
	createMessages,
	addMessagePair,
	subscribeToConversationMessages,
	subscribeToMessages,
	searchMessages,
	getMessageCount,
	getMessageCountByRole,
} from './messages'

// Generations
export {
	createGeneration,
	getGeneration,
	getGenerationWithRelations,
	listGenerations,
	getConversationGenerations,
	getRecentGenerations,
	updateGeneration,
	deleteGeneration,
	createVersion,
	getVersionHistory,
	getLatestVersion,
	getChildren,
	subscribeToGenerations,
	subscribeToConversationGenerations,
	searchGenerations,
	getGenerationStats,
} from './generations'

// Checkpoints
export {
	createCheckpoint,
	getCheckpoint,
	getGenerationCheckpoints,
	getAllGenerationCheckpoints,
	getLatestCheckpoint,
	getCheckpointByStage,
	updateCheckpoint,
	deleteCheckpoint,
	deleteGenerationCheckpoints,
	createCheckpoints,
	updateStreamingCheckpoint,
	finalizeStreamingCheckpoint,
	resetStreamingCheckpoint,
	subscribeToGenerationCheckpoints,
	unsubscribeFromCheckpoints,
	isAvailable as isCheckpointsAvailable,
} from './checkpoints'

// Sync
export {
	queueOperation,
	getPendingItems,
	processSyncQueue,
	offlineCreate,
	offlineUpdate,
	offlineDelete,
	startAutoSync,
	stopAutoSync,
	forceSyncAll,
	clearFailedItems,
	retryFailedItems,
	setConflictStrategy,
	getConflictStrategy,
	getQueueStats,
	type ConflictStrategy,
} from './sync'

// Schema
export {
	pbSchema,
	exportSchemaJSON,
	setupInstructions,
	COLLECTION_IDS,
} from './schema'

// =============================================================================
// Convenience Singleton
// =============================================================================

import { initPocketBase, getPocketBase, getConnectionState } from './client'
import * as conversations from './conversations'
import * as messages from './messages'
import * as generations from './generations'
import * as checkpoints from './checkpoints'
import * as sync from './sync'

/**
 * PocketBase singleton with all modules attached
 */
export const pb = {
	// Client management
	init: initPocketBase,
	get client() {
		return getPocketBase()
	},
	get state() {
		return getConnectionState()
	},

	// Modules
	conversations,
	messages,
	generations,
	checkpoints,
	sync,

	// Quick access to common operations
	async createConversation(title: string) {
		return conversations.createConversation({ title })
	},

	async sendMessage(conversationId: string, content: string, role: 'user' | 'assistant' = 'user') {
		return messages.createMessage({
			conversation: conversationId,
			role,
			content,
		})
	},

	async saveGeneration(prompt: string, code: string, html: string, conversationId?: string) {
		return generations.createGeneration({
			prompt,
			code,
			html,
			conversation: conversationId,
		})
	},
}

export default pb
