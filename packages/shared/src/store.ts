import type { GenerationSession, GenerationCheckpoint, TelemetryEventType } from './types'
import { createId } from './index'

// =============================================================================
// Telemetry Event (Enhanced)
// =============================================================================

export interface StoredTelemetryEvent {
	id: string
	sessionId?: string
	type: TelemetryEventType
	timestamp: number
	durationMs?: number
	data: Record<string, unknown>
}

// =============================================================================
// Memory Store - Client-side persistence with localStorage
// =============================================================================

const STORAGE_KEYS = {
	sessions: 'v0-sessions',
	checkpoints: 'v0-checkpoints',
	telemetry: 'v0-telemetry',
} as const

const MAX_SESSIONS = 50
const MAX_TELEMETRY_EVENTS = 500
const MAX_CHECKPOINTS_PER_SESSION = 20

export class MemoryStore {
	private sessions: Map<string, GenerationSession> = new Map()
	private checkpoints: Map<string, GenerationCheckpoint[]> = new Map()
	private telemetry: StoredTelemetryEvent[] = []
	private isClient: boolean

	constructor() {
		this.isClient = typeof window !== 'undefined'
		if (this.isClient) {
			this.hydrate()
		}
	}

	// =============================================================================
	// Persistence
	// =============================================================================

	private persist(): void {
		if (!this.isClient) return

		try {
			localStorage.setItem(
				STORAGE_KEYS.sessions,
				JSON.stringify([...this.sessions.entries()])
			)
			localStorage.setItem(
				STORAGE_KEYS.checkpoints,
				JSON.stringify([...this.checkpoints.entries()])
			)
			localStorage.setItem(
				STORAGE_KEYS.telemetry,
				JSON.stringify(this.telemetry)
			)
		} catch (err) {
			console.warn('Failed to persist to localStorage:', err)
		}
	}

	hydrate(): void {
		if (!this.isClient) return

		try {
			const sessionsData = localStorage.getItem(STORAGE_KEYS.sessions)
			if (sessionsData) {
				this.sessions = new Map(JSON.parse(sessionsData))
			}

			const checkpointsData = localStorage.getItem(STORAGE_KEYS.checkpoints)
			if (checkpointsData) {
				this.checkpoints = new Map(JSON.parse(checkpointsData))
			}

			const telemetryData = localStorage.getItem(STORAGE_KEYS.telemetry)
			if (telemetryData) {
				this.telemetry = JSON.parse(telemetryData)
			}
		} catch (err) {
			console.warn('Failed to hydrate from localStorage:', err)
		}
	}

	clear(): void {
		this.sessions.clear()
		this.checkpoints.clear()
		this.telemetry = []
		this.persist()
	}

	// =============================================================================
	// Sessions
	// =============================================================================

	createSession(prompt: string): string {
		const id = createId()
		const session: GenerationSession = {
			id,
			createdAt: Date.now(),
			prompt,
			generatedCode: '',
			renderedHtml: '',
			metadata: {
				provider: '',
				model: '',
				duration: {
					parse: 0,
					generate: 0,
					render: 0,
					total: 0,
				},
			},
		}

		this.sessions.set(id, session)
		this.checkpoints.set(id, [])

		// Enforce max sessions limit (remove oldest)
		if (this.sessions.size > MAX_SESSIONS) {
			const oldest = [...this.sessions.entries()]
				.sort((a, b) => a[1].createdAt - b[1].createdAt)[0]
			if (oldest) {
				this.sessions.delete(oldest[0])
				this.checkpoints.delete(oldest[0])
			}
		}

		this.persist()
		return id
	}

	updateSession(id: string, updates: Partial<GenerationSession>): void {
		const session = this.sessions.get(id)
		if (!session) return

		const updated = { ...session, ...updates }
		if (updates.metadata) {
			updated.metadata = { ...session.metadata, ...updates.metadata }
		}

		this.sessions.set(id, updated)
		this.persist()
	}

	getSession(id: string): GenerationSession | undefined {
		return this.sessions.get(id)
	}

	getSessionHistory(): GenerationSession[] {
		return [...this.sessions.values()]
			.sort((a, b) => b.createdAt - a.createdAt)
	}

	deleteSession(id: string): void {
		this.sessions.delete(id)
		this.checkpoints.delete(id)
		this.persist()
	}

	// =============================================================================
	// Checkpoints
	// =============================================================================

	addCheckpoint(
		sessionId: string,
		checkpoint: Omit<GenerationCheckpoint, 'id'>
	): string {
		const id = createId()
		const full: GenerationCheckpoint = { ...checkpoint, id }

		const existing = this.checkpoints.get(sessionId) ?? []
		existing.push(full)

		// Enforce max checkpoints per session
		if (existing.length > MAX_CHECKPOINTS_PER_SESSION) {
			existing.shift()
		}

		this.checkpoints.set(sessionId, existing)
		this.persist()
		return id
	}

	getCheckpoints(sessionId: string): GenerationCheckpoint[] {
		return this.checkpoints.get(sessionId) ?? []
	}

	getCheckpoint(checkpointId: string): GenerationCheckpoint | undefined {
		for (const checkpoints of this.checkpoints.values()) {
			const found = checkpoints.find(c => c.id === checkpointId)
			if (found) return found
		}
		return undefined
	}

	// =============================================================================
	// Time Travel
	// =============================================================================

	revertToCheckpoint(checkpointId: string): GenerationSession | undefined {
		const checkpoint = this.getCheckpoint(checkpointId)
		if (!checkpoint) return undefined

		const session = this.sessions.get(checkpoint.sessionId)
		if (!session) return undefined

		// Restore state from checkpoint
		const restoredSession: GenerationSession = {
			...session,
			generatedCode: checkpoint.data.partialCode ?? session.generatedCode,
		}

		// Log revert event
		this.addTelemetry({
			sessionId: checkpoint.sessionId,
			type: 'user',
			timestamp: Date.now(),
			data: {
				action: 'revert',
				checkpointId,
				stage: checkpoint.stage,
			},
		})

		return restoredSession
	}

	// =============================================================================
	// Telemetry
	// =============================================================================

	addTelemetry(event: Omit<StoredTelemetryEvent, 'id'>): string {
		const id = createId()
		const full: StoredTelemetryEvent = { ...event, id }

		this.telemetry.push(full)

		// Enforce max telemetry events
		if (this.telemetry.length > MAX_TELEMETRY_EVENTS) {
			this.telemetry = this.telemetry.slice(-MAX_TELEMETRY_EVENTS)
		}

		this.persist()
		return id
	}

	getTelemetry(limit?: number): StoredTelemetryEvent[] {
		const events = this.telemetry.slice().reverse()
		return limit ? events.slice(0, limit) : events
	}

	getSessionTelemetry(sessionId: string): StoredTelemetryEvent[] {
		return this.telemetry
			.filter(e => e.sessionId === sessionId)
			.sort((a, b) => b.timestamp - a.timestamp)
	}

	// =============================================================================
	// Stats
	// =============================================================================

	getStats(): {
		sessionCount: number
		checkpointCount: number
		telemetryCount: number
		averageGenerationMs: number
	} {
		const sessions = this.getSessionHistory()
		const totalGenerationMs = sessions.reduce(
			(sum, s) => sum + (s.metadata.duration.total || 0),
			0
		)

		let totalCheckpoints = 0
		for (const checkpoints of this.checkpoints.values()) {
			totalCheckpoints += checkpoints.length
		}

		return {
			sessionCount: sessions.length,
			checkpointCount: totalCheckpoints,
			telemetryCount: this.telemetry.length,
			averageGenerationMs: sessions.length > 0
				? totalGenerationMs / sessions.length
				: 0,
		}
	}
}

// =============================================================================
// Singleton Instance
// =============================================================================

let storeInstance: MemoryStore | null = null

export function getStore(): MemoryStore {
	if (!storeInstance) {
		storeInstance = new MemoryStore()
	}
	return storeInstance
}

export default getStore
