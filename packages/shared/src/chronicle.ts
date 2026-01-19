import Dexie, { type Table } from 'dexie'
import type { GenerationSession } from './types'
import { createId } from './index'

// =============================================================================
// Chronicle Artifact Types
// =============================================================================

export type ChronicleArtifactType = 'generation' | 'chat' | 'checkpoint'

export interface ChronicleArtifact {
	id: string
	createdAt: number // For date queries
	year: number // Computed for fast filtering
	month: number // 1-12
	day: number // 1-31
	type: ChronicleArtifactType
	prompt: string // Searchable
	generatedCode?: string // Searchable
	renderedHtml?: string
	chatMessage?: string // For chat type
	chatRole?: 'user' | 'assistant' | 'system' // For chat type
	sessionId?: string // Links to parent session
	metadata: Record<string, unknown>
	tags?: string[]
	archived: boolean // Soft delete
}

export interface ChronicleStats {
	totalArtifacts: number
	byType: Record<ChronicleArtifactType, number>
	byYear: Record<number, number>
	oldestDate: Date | null
	newestDate: Date | null
}

// =============================================================================
// ChronicleDB - IndexedDB with Dexie
// =============================================================================

class ChronicleDB extends Dexie {
	artifacts!: Table<ChronicleArtifact>

	constructor() {
		super('v0-chronicle')
		this.version(1).stores({
			// Indexes: id (auto), createdAt, compound [year+month+day], type, sessionId, archived, tags (multi-entry)
			artifacts: '++id, createdAt, [year+month+day], type, sessionId, archived, *tags',
		})
	}

	// =============================================================================
	// Helper: Extract date components
	// =============================================================================

	private extractDateComponents(timestamp: number): { year: number; month: number; day: number } {
		const date = new Date(timestamp)
		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1, // 1-12
			day: date.getDate(),
		}
	}

	// =============================================================================
	// Create Operations
	// =============================================================================

	async addArtifact(artifact: Omit<ChronicleArtifact, 'id' | 'year' | 'month' | 'day'>): Promise<string> {
		const id = artifact.sessionId ?? createId()
		const dateComponents = this.extractDateComponents(artifact.createdAt)

		const full: ChronicleArtifact = {
			...artifact,
			id,
			...dateComponents,
		}

		await this.artifacts.add(full)
		return id
	}

	async addGeneration(
		prompt: string,
		generatedCode: string,
		renderedHtml: string,
		metadata: Record<string, unknown> = {}
	): Promise<string> {
		return this.addArtifact({
			createdAt: Date.now(),
			type: 'generation',
			prompt,
			generatedCode,
			renderedHtml,
			metadata,
			archived: false,
		})
	}

	async addChatMessage(
		message: string,
		role: 'user' | 'assistant' | 'system',
		sessionId?: string
	): Promise<string> {
		return this.addArtifact({
			createdAt: Date.now(),
			type: 'chat',
			prompt: '', // Empty for chat messages
			chatMessage: message,
			chatRole: role,
			sessionId,
			metadata: {},
			archived: false,
		})
	}

	async addCheckpoint(
		sessionId: string,
		partialCode: string,
		metadata: Record<string, unknown> = {}
	): Promise<string> {
		return this.addArtifact({
			createdAt: Date.now(),
			type: 'checkpoint',
			prompt: '',
			generatedCode: partialCode,
			sessionId,
			metadata,
			archived: false,
		})
	}

	// =============================================================================
	// Read Operations - Date-based
	// =============================================================================

	async getArtifactsByDate(
		year: number,
		month?: number,
		day?: number
	): Promise<ChronicleArtifact[]> {
		let collection = this.artifacts.where({ year })

		if (month !== undefined) {
			collection = collection.and((a) => a.month === month)
		}
		if (day !== undefined) {
			collection = collection.and((a) => a.day === day)
		}

		// Exclude archived
		collection = collection.and((a) => !a.archived)

		return collection.reverse().sortBy('createdAt')
	}

	async getArtifactsInRange(startDate: Date, endDate: Date): Promise<ChronicleArtifact[]> {
		const start = startDate.getTime()
		const end = endDate.getTime()

		return this.artifacts
			.where('createdAt')
			.between(start, end)
			.and((a) => !a.archived)
			.reverse()
			.toArray()
	}

	async getRecentArtifacts(limit = 20): Promise<ChronicleArtifact[]> {
		return this.artifacts
			.orderBy('createdAt')
			.reverse()
			.filter((a) => !a.archived)
			.limit(limit)
			.toArray()
	}

	// =============================================================================
	// Read Operations - Search
	// =============================================================================

	async searchArtifacts(query: string, limit = 50): Promise<ChronicleArtifact[]> {
		const lowerQuery = query.toLowerCase()

		return this.artifacts
			.filter(
				(a): boolean =>
					!a.archived &&
					Boolean(
						a.prompt?.toLowerCase().includes(lowerQuery) ||
						a.generatedCode?.toLowerCase().includes(lowerQuery) ||
						a.chatMessage?.toLowerCase().includes(lowerQuery) ||
						a.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
					)
			)
			.limit(limit)
			.toArray()
	}

	async getArtifactsByTag(tag: string): Promise<ChronicleArtifact[]> {
		return this.artifacts
			.where('tags')
			.equals(tag)
			.and((a) => !a.archived)
			.toArray()
	}

	async getArtifactsByType(type: ChronicleArtifactType): Promise<ChronicleArtifact[]> {
		return this.artifacts
			.where({ type })
			.and((a) => !a.archived)
			.reverse()
			.sortBy('createdAt')
	}

	// =============================================================================
	// Read Operations - Calendar
	// =============================================================================

	async getActivityCalendar(year: number): Promise<Map<string, number>> {
		const artifacts = await this.artifacts
			.where({ year })
			.and((a) => !a.archived)
			.toArray()

		const calendar = new Map<string, number>()
		for (const a of artifacts) {
			const key = `${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`
			calendar.set(key, (calendar.get(key) ?? 0) + 1)
		}
		return calendar
	}

	async getMonthlyActivity(year: number, month: number): Promise<Map<number, number>> {
		const artifacts = await this.artifacts
			.where({ year })
			.and((a) => a.month === month && !a.archived)
			.toArray()

		const activity = new Map<number, number>()
		for (const a of artifacts) {
			activity.set(a.day, (activity.get(a.day) ?? 0) + 1)
		}
		return activity
	}

	async getYearlyActivity(year: number): Promise<Map<number, number>> {
		const artifacts = await this.artifacts
			.where({ year })
			.and((a) => !a.archived)
			.toArray()

		const activity = new Map<number, number>()
		for (const a of artifacts) {
			activity.set(a.month, (activity.get(a.month) ?? 0) + 1)
		}
		return activity
	}

	// =============================================================================
	// Read Operations - Session
	// =============================================================================

	async getSessionArtifacts(sessionId: string): Promise<ChronicleArtifact[]> {
		return this.artifacts
			.where({ sessionId })
			.and((a) => !a.archived)
			.sortBy('createdAt')
	}

	async getArtifactById(id: string): Promise<ChronicleArtifact | undefined> {
		return this.artifacts.get(id)
	}

	// =============================================================================
	// Update Operations
	// =============================================================================

	async updateArtifact(
		id: string,
		updates: Partial<Omit<ChronicleArtifact, 'id' | 'year' | 'month' | 'day'>>
	): Promise<void> {
		await this.artifacts.update(id, updates)
	}

	async addTag(id: string, tag: string): Promise<void> {
		const artifact = await this.artifacts.get(id)
		if (!artifact) return

		const tags = artifact.tags ?? []
		if (!tags.includes(tag)) {
			await this.artifacts.update(id, { tags: [...tags, tag] })
		}
	}

	async removeTag(id: string, tag: string): Promise<void> {
		const artifact = await this.artifacts.get(id)
		if (!artifact) return

		const tags = (artifact.tags ?? []).filter((t) => t !== tag)
		await this.artifacts.update(id, { tags })
	}

	// =============================================================================
	// Archive Operations
	// =============================================================================

	async archiveArtifact(id: string): Promise<void> {
		await this.artifacts.update(id, { archived: true })
	}

	async unarchiveArtifact(id: string): Promise<void> {
		await this.artifacts.update(id, { archived: false })
	}

	async archiveOlderThan(date: Date): Promise<number> {
		const count = await this.artifacts
			.where('createdAt')
			.below(date.getTime())
			.modify({ archived: true })
		return count
	}

	async getArchivedArtifacts(): Promise<ChronicleArtifact[]> {
		return this.artifacts.where({ archived: true }).toArray()
	}

	// =============================================================================
	// Delete Operations
	// =============================================================================

	async deleteArtifact(id: string): Promise<void> {
		await this.artifacts.delete(id)
	}

	async permanentlyDeleteArchived(): Promise<number> {
		return this.artifacts.where({ archived: true }).delete()
	}

	async clearAll(): Promise<void> {
		await this.artifacts.clear()
	}

	// =============================================================================
	// Export Operations
	// =============================================================================

	async exportAll(): Promise<ChronicleArtifact[]> {
		return this.artifacts.toArray()
	}

	async exportDateRange(start: Date, end: Date): Promise<ChronicleArtifact[]> {
		return this.getArtifactsInRange(start, end)
	}

	async exportAsJSON(artifacts?: ChronicleArtifact[]): Promise<Blob> {
		const data = artifacts ?? (await this.exportAll())
		return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
	}

	// =============================================================================
	// Import Operations
	// =============================================================================

	async importArtifacts(artifacts: ChronicleArtifact[]): Promise<number> {
		let imported = 0
		for (const artifact of artifacts) {
			try {
				// Recalculate date components to ensure consistency
				const dateComponents = this.extractDateComponents(artifact.createdAt)
				await this.artifacts.put({
					...artifact,
					...dateComponents,
				})
				imported++
			} catch (e) {
				console.warn('Failed to import artifact:', artifact.id, e)
			}
		}
		return imported
	}

	// =============================================================================
	// Migration from localStorage
	// =============================================================================

	async migrateFromLocalStorage(): Promise<{ sessions: number; chat: number }> {
		let sessionsMigrated = 0
		let chatMigrated = 0

		// Check if migration already completed
		const migrationDone = localStorage.getItem('v0-chronicle-migrated')
		if (migrationDone === 'true') {
			return { sessions: 0, chat: 0 }
		}

		// Migrate sessions from MemoryStore
		const oldSessions = localStorage.getItem('v0-sessions')
		if (oldSessions) {
			try {
				const sessions = JSON.parse(oldSessions) as [string, GenerationSession][]
				for (const [id, session] of sessions) {
					await this.addArtifact({
						createdAt: session.createdAt,
						type: 'generation',
						prompt: session.prompt,
						generatedCode: session.generatedCode,
						renderedHtml: session.renderedHtml,
						sessionId: id,
						metadata: session.metadata,
						archived: false,
					})
					sessionsMigrated++
				}
			} catch (e) {
				console.warn('Failed to migrate sessions:', e)
			}
		}

		// Migrate chat history
		const oldChat = localStorage.getItem('chatHistory')
		if (oldChat) {
			try {
				const messages = JSON.parse(oldChat) as Array<{
					role: 'user' | 'assistant' | 'system'
					content: string
					timestamp: number
				}>
				for (const msg of messages) {
					await this.addArtifact({
						createdAt: msg.timestamp,
						type: 'chat',
						prompt: '',
						chatMessage: msg.content,
						chatRole: msg.role,
						metadata: {},
						archived: false,
					})
					chatMigrated++
				}
			} catch (e) {
				console.warn('Failed to migrate chat history:', e)
			}
		}

		// Mark migration as complete (but don't delete old data yet for safety)
		localStorage.setItem('v0-chronicle-migrated', 'true')

		return { sessions: sessionsMigrated, chat: chatMigrated }
	}

	// =============================================================================
	// Stats
	// =============================================================================

	async getStats(): Promise<ChronicleStats> {
		const all = await this.artifacts.toArray()
		const active = all.filter((a) => !a.archived)

		const byType: Record<ChronicleArtifactType, number> = {
			generation: 0,
			chat: 0,
			checkpoint: 0,
		}

		const byYear: Record<number, number> = {}
		let oldest: number | null = null
		let newest: number | null = null

		for (const a of active) {
			byType[a.type]++
			byYear[a.year] = (byYear[a.year] ?? 0) + 1

			if (oldest === null || a.createdAt < oldest) oldest = a.createdAt
			if (newest === null || a.createdAt > newest) newest = a.createdAt
		}

		return {
			totalArtifacts: active.length,
			byType,
			byYear,
			oldestDate: oldest ? new Date(oldest) : null,
			newestDate: newest ? new Date(newest) : null,
		}
	}

	async getAvailableYears(): Promise<number[]> {
		const all = await this.artifacts.toArray()
		const years = new Set(all.map((a) => a.year))
		return [...years].sort((a, b) => b - a) // Descending
	}

	async getAllTags(): Promise<string[]> {
		const all = await this.artifacts.toArray()
		const tags = new Set<string>()
		for (const a of all) {
			for (const t of a.tags ?? []) {
				tags.add(t)
			}
		}
		return [...tags].sort()
	}
}

// =============================================================================
// Singleton Instance
// =============================================================================

let chronicleInstance: ChronicleDB | null = null

export function getChronicleDB(): ChronicleDB {
	if (!chronicleInstance) {
		chronicleInstance = new ChronicleDB()
	}
	return chronicleInstance
}

// Named export for convenience
export const chronicleDB = {
	get instance(): ChronicleDB {
		return getChronicleDB()
	},

	// Proxy common methods for convenience
	addGeneration: (...args: Parameters<ChronicleDB['addGeneration']>) =>
		getChronicleDB().addGeneration(...args),

	addChatMessage: (...args: Parameters<ChronicleDB['addChatMessage']>) =>
		getChronicleDB().addChatMessage(...args),

	addCheckpoint: (...args: Parameters<ChronicleDB['addCheckpoint']>) =>
		getChronicleDB().addCheckpoint(...args),

	getArtifactsByDate: (...args: Parameters<ChronicleDB['getArtifactsByDate']>) =>
		getChronicleDB().getArtifactsByDate(...args),

	getRecentArtifacts: (...args: Parameters<ChronicleDB['getRecentArtifacts']>) =>
		getChronicleDB().getRecentArtifacts(...args),

	searchArtifacts: (...args: Parameters<ChronicleDB['searchArtifacts']>) =>
		getChronicleDB().searchArtifacts(...args),

	getActivityCalendar: (...args: Parameters<ChronicleDB['getActivityCalendar']>) =>
		getChronicleDB().getActivityCalendar(...args),

	getStats: () => getChronicleDB().getStats(),

	migrateFromLocalStorage: () => getChronicleDB().migrateFromLocalStorage(),

	exportAsJSON: (...args: Parameters<ChronicleDB['exportAsJSON']>) =>
		getChronicleDB().exportAsJSON(...args),
}

export type { ChronicleDB }
export default chronicleDB
