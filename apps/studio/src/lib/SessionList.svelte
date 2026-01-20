<script lang="ts">
	import { onMount } from 'svelte'
	import { chronicleDB, type ConversationSession } from '@v0-clone/shared'

	interface Props {
		onSessionSelect: (session: ConversationSession) => void
		onNewSession: () => void
		currentSessionId?: string | null
	}

	let { onSessionSelect, onNewSession, currentSessionId = null }: Props = $props()

	let sessions = $state<ConversationSession[]>([])
	let isLoading = $state(true)
	let showArchived = $state(false)

	async function loadSessions() {
		isLoading = true
		try {
			sessions = await chronicleDB.listSessions(20)
		} catch (e) {
			console.warn('Failed to load sessions:', e)
			sessions = []
		}
		isLoading = false
	}

	async function handleDelete(sessionId: string, e: MouseEvent) {
		e.stopPropagation()
		if (!confirm('Are you sure you want to delete this conversation?')) return

		try {
			await chronicleDB.deleteSession(sessionId)
			sessions = sessions.filter((s) => s.id !== sessionId)
		} catch (e) {
			console.warn('Failed to delete session:', e)
		}
	}

	async function handleArchive(sessionId: string, e: MouseEvent) {
		e.stopPropagation()
		try {
			await chronicleDB.archiveSession(sessionId)
			sessions = sessions.filter((s) => s.id !== sessionId)
		} catch (e) {
			console.warn('Failed to archive session:', e)
		}
	}

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffDays === 0) {
			return 'Today'
		} else if (diffDays === 1) {
			return 'Yesterday'
		} else if (diffDays < 7) {
			return `${diffDays} days ago`
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		}
	}

	function getPreviewText(session: ConversationSession): string {
		const lastMessage = session.messages[session.messages.length - 1]
		if (lastMessage) {
			return lastMessage.content.length > 60
				? lastMessage.content.slice(0, 60) + '...'
				: lastMessage.content
		}
		return 'No messages'
	}

	onMount(loadSessions)

	// Refresh when sessions might have changed
	$effect(() => {
		if (currentSessionId !== undefined) {
			loadSessions()
		}
	})
</script>

<div class="h-full flex flex-col bg-[var(--color-bg)]">
	<!-- Header -->
	<div class="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
		<h3 class="text-sm font-semibold text-[var(--color-text)]">Conversations</h3>
		<button
			onclick={onNewSession}
			class="p-1.5 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]
				text-white transition-all-smooth"
			title="New conversation"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>
	</div>

	<!-- Session List -->
	<div class="flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="flex items-center justify-center h-32">
				<div class="w-6 h-6 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
			</div>
		{:else if sessions.length === 0}
			<div class="flex flex-col items-center justify-center h-32 text-center px-4">
				<svg class="w-8 h-8 text-[var(--color-text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
				<p class="text-sm text-[var(--color-text-muted)]">No conversations yet</p>
				<button
					onclick={onNewSession}
					class="mt-2 text-xs text-[var(--color-accent)] hover:underline"
				>
					Start a new one
				</button>
			</div>
		{:else}
			<div class="p-2 space-y-1">
				{#each sessions as session (session.id)}
					<button
						onclick={() => onSessionSelect(session)}
						class="w-full p-3 rounded-lg text-left transition-all-smooth group
							{currentSessionId === session.id
								? 'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50'
								: 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] border border-transparent'}"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-[var(--color-text)] truncate">
									{session.name}
								</p>
								<p class="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
									{getPreviewText(session)}
								</p>
							</div>

							<!-- Action buttons (visible on hover) -->
							<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onclick={(e) => handleArchive(session.id, e)}
									class="p-1 rounded text-[var(--color-text-muted)] hover:text-yellow-500 hover:bg-yellow-500/10"
									title="Archive"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
									</svg>
								</button>
								<button
									onclick={(e) => handleDelete(session.id, e)}
									class="p-1 rounded text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10"
									title="Delete"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>

						<div class="flex items-center gap-2 mt-2">
							<span class="text-xs text-[var(--color-text-muted)]">
								{formatDate(session.updatedAt)}
							</span>
							<span class="text-xs text-[var(--color-text-muted)]">
								{session.messages.length} messages
							</span>
							{#if session.generations.length > 0}
								<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
									{session.generations.length} generations
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer with refresh -->
	<div class="border-t border-[var(--color-border)] p-2">
		<button
			onclick={loadSessions}
			class="w-full py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]
				rounded-md hover:bg-[var(--color-bg-tertiary)] transition-all-smooth flex items-center justify-center gap-1"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			Refresh
		</button>
	</div>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
