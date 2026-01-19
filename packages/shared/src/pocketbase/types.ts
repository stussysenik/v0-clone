// =============================================================================
// PocketBase Collection Types
// =============================================================================

/**
 * Base PocketBase record fields that all collections have
 */
export interface BaseRecord {
	id: string
	created: string // ISO date string
	updated: string // ISO date string
	collectionId: string
	collectionName: string
}

// =============================================================================
// Conversation Collection
// =============================================================================

export type ConversationStatus = 'active' | 'archived'

export interface Conversation extends BaseRecord {
	title: string
	status: ConversationStatus
	metadata?: Record<string, unknown>
}

export interface ConversationCreate {
	title: string
	status?: ConversationStatus
	metadata?: Record<string, unknown>
}

export interface ConversationUpdate {
	title?: string
	status?: ConversationStatus
	metadata?: Record<string, unknown>
}

// =============================================================================
// Message Collection
// =============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message extends BaseRecord {
	conversation: string // relation to conversations
	role: MessageRole
	content: string
	metadata?: Record<string, unknown>
}

export interface MessageCreate {
	conversation: string
	role: MessageRole
	content: string
	metadata?: Record<string, unknown>
}

// =============================================================================
// Generation Collection
// =============================================================================

export interface Generation extends BaseRecord {
	conversation?: string // optional relation to conversations
	prompt: string
	code: string
	html: string
	parent?: string // relation to generations (for versioning)
	metadata?: {
		provider?: string
		model?: string
		durationMs?: number
		tokenUsage?: {
			prompt: number
			completion: number
		}
	}
}

export interface GenerationCreate {
	conversation?: string
	prompt: string
	code: string
	html: string
	parent?: string
	metadata?: Generation['metadata']
}

// =============================================================================
// Checkpoint Collection
// =============================================================================

export interface Checkpoint extends BaseRecord {
	generation: string // relation to generations
	code: string
	stage: string
	data?: Record<string, unknown>
}

export interface CheckpointCreate {
	generation: string
	code: string
	stage: string
	data?: Record<string, unknown>
}

// =============================================================================
// Sync Queue Types (for offline support)
// =============================================================================

export type SyncOperation = 'create' | 'update' | 'delete'
export type SyncCollection = 'conversations' | 'messages' | 'generations' | 'checkpoints'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface SyncQueueItem {
	id: string
	collection: SyncCollection
	operation: SyncOperation
	data: unknown
	localId?: string // for create operations before server assigns ID
	status: SyncStatus
	retries: number
	error?: string
	createdAt: number
	updatedAt: number
}

// =============================================================================
// Real-time Event Types
// =============================================================================

export type RealtimeAction = 'create' | 'update' | 'delete'

export interface RealtimeEvent<T = unknown> {
	action: RealtimeAction
	record: T
}

// =============================================================================
// Connection State
// =============================================================================

export interface ConnectionState {
	isOnline: boolean
	isConnected: boolean
	lastSyncAt: number | null
	pendingChanges: number
}

// =============================================================================
// List Response Type
// =============================================================================

export interface ListResult<T> {
	page: number
	perPage: number
	totalItems: number
	totalPages: number
	items: T[]
}
