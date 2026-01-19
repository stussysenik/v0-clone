<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import {
		chronicleDB,
		pb,
		getConnectionState,
		subscribeToConnectionState,
		type ChronicleArtifact,
		type Generation,
		type ConnectionState,
	} from '@v0-clone/shared'

	interface Props {
		sessionId?: string
		conversationId?: string
		onArtifactClick?: (artifact: ChronicleArtifact) => void
		onRestoreVersion?: (generation: Generation) => void
		onForkVersion?: (generation: Generation) => void
		limit?: number
	}

	let { sessionId, conversationId, onArtifactClick, onRestoreVersion, onForkVersion, limit = 100 }: Props = $props()

	let artifacts = $state<ChronicleArtifact[]>([])
	let pbGenerations = $state<Generation[]>([])
	let isLoading = $state(true)
	let groupedByDate = $state<Map<string, (ChronicleArtifact | Generation)[]>>(new Map())
	let connectionState = $state<ConnectionState>(getConnectionState())
	let unsubscribe: (() => void) | null = null
	let activeContextMenu = $state<string | null>(null)

	// Load artifacts from Chronicle and PocketBase
	async function loadArtifacts() {
		isLoading = true
		try {
			// Load from Chronicle (IndexedDB)
			if (sessionId) {
				artifacts = await chronicleDB.instance.getSessionArtifacts(sessionId)
			} else {
				artifacts = await chronicleDB.getRecentArtifacts(limit)
			}

			// Load from PocketBase if connected
			if (connectionState.isConnected) {
				try {
					if (conversationId) {
						const result = await pb.generations.getConversationGenerations(conversationId)
						pbGenerations = result.items
					} else {
						const result = await pb.generations.getRecentGenerations(limit)
						pbGenerations = result.items
					}
				} catch (e) {
					console.warn('Failed to load PocketBase generations:', e)
					pbGenerations = []
				}
			}

			groupByDate()
		} catch (e) {
			console.warn('Failed to load timeline:', e)
			artifacts = []
			pbGenerations = []
		}
		isLoading = false
	}

	// Check if an item is a PocketBase Generation
	function isGeneration(item: ChronicleArtifact | Generation): item is Generation {
		return 'collectionId' in item
	}

	// Get timestamp from either type
	function getTimestamp(item: ChronicleArtifact | Generation): number {
		if (isGeneration(item)) {
			return new Date(item.created).getTime()
		}
		return item.createdAt
	}

	// Group artifacts by date (combines Chronicle and PocketBase)
	function groupByDate() {
		const groups = new Map<string, (ChronicleArtifact | Generation)[]>()
		const today = new Date()
		const yesterday = new Date(today)
		yesterday.setDate(yesterday.getDate() - 1)

		// Combine both sources
		const allItems: (ChronicleArtifact | Generation)[] = [
			...artifacts,
			...pbGenerations,
		]

		// Sort by timestamp descending
		allItems.sort((a, b) => getTimestamp(b) - getTimestamp(a))

		// Deduplicate (prefer PocketBase version if same prompt/time)
		const seen = new Set<string>()
		const deduped: (ChronicleArtifact | Generation)[] = []
		for (const item of allItems) {
			const key = isGeneration(item)
				? `pb_${item.id}`
				: `chronicle_${item.id}`
			if (!seen.has(key)) {
				seen.add(key)
				deduped.push(item)
			}
		}

		for (const item of deduped) {
			const timestamp = getTimestamp(item)
			const date = new Date(timestamp)
			let key: string

			if (isSameDay(date, today)) {
				key = 'Today'
			} else if (isSameDay(date, yesterday)) {
				key = 'Yesterday'
			} else if (isSameWeek(date, today)) {
				key = date.toLocaleDateString('en-US', { weekday: 'long' })
			} else {
				key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
			}

			if (!groups.has(key)) {
				groups.set(key, [])
			}
			groups.get(key)!.push(item)
		}

		groupedByDate = groups
	}

	function isSameDay(d1: Date, d2: Date): boolean {
		return d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
	}

	function isSameWeek(d1: Date, d2: Date): boolean {
		const oneWeekAgo = new Date(d2)
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
		return d1 >= oneWeekAgo && d1 <= d2
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})
	}

	function getItemType(item: ChronicleArtifact | Generation): 'generation' | 'chat' | 'checkpoint' | 'unknown' {
		if (isGeneration(item)) {
			return 'generation'
		}
		return item.type
	}

	function getTypeIcon(type: 'generation' | 'chat' | 'checkpoint' | 'unknown'): string {
		switch (type) {
			case 'generation':
				return 'M13 10V3L4 14h7v7l9-11h-7z'
			case 'chat':
				return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
			case 'checkpoint':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
			default:
				return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
		}
	}

	function getTypeColor(type: 'generation' | 'chat' | 'checkpoint' | 'unknown'): string {
		switch (type) {
			case 'generation':
				return 'bg-blue-500'
			case 'chat':
				return 'bg-purple-500'
			case 'checkpoint':
				return 'bg-green-500'
			default:
				return 'bg-gray-500'
		}
	}

	function getDisplayText(item: ChronicleArtifact | Generation): string {
		if (isGeneration(item)) {
			return item.prompt || 'Generation'
		}
		if (item.type === 'chat' && item.chatMessage) {
			return item.chatMessage
		}
		return item.prompt || 'Generation'
	}

	function getCode(item: ChronicleArtifact | Generation): string | undefined {
		if (isGeneration(item)) {
			return item.code
		}
		return item.generatedCode
	}

	function truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text
		return text.slice(0, maxLength).trim() + '...'
	}

	function handleItemClick(item: ChronicleArtifact | Generation) {
		if (isGeneration(item)) {
			// If it's a PocketBase generation, call restore handler
			onRestoreVersion?.(item)
		} else {
			// If it's a Chronicle artifact, use existing handler
			onArtifactClick?.(item)
		}
	}

	function handleContextMenu(e: MouseEvent, itemId: string) {
		e.preventDefault()
		activeContextMenu = activeContextMenu === itemId ? null : itemId
	}

	function handleFork(item: ChronicleArtifact | Generation) {
		if (isGeneration(item)) {
			onForkVersion?.(item)
		}
		activeContextMenu = null
	}

	function handleRestore(item: ChronicleArtifact | Generation) {
		if (isGeneration(item)) {
			onRestoreVersion?.(item)
		} else {
			onArtifactClick?.(item)
		}
		activeContextMenu = null
	}

	function getItemId(item: ChronicleArtifact | Generation): string {
		return isGeneration(item) ? item.id : item.id
	}

	onMount(() => {
		// Subscribe to connection state
		unsubscribe = subscribeToConnectionState((state) => {
			const wasConnected = connectionState.isConnected
			connectionState = state
			// Reload if connection state changed
			if (wasConnected !== state.isConnected) {
				loadArtifacts()
			}
		})

		loadArtifacts()
	})

	onDestroy(() => {
		unsubscribe?.()
	})

	// Close context menu on click outside
	function handleDocumentClick() {
		activeContextMenu = null
	}
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="timeline-container">
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="w-6 h-6 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
		</div>
	{:else if artifacts.length === 0 && pbGenerations.length === 0}
		<div class="text-center py-12">
			<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
				<svg class="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<p class="text-[var(--color-text-muted)]">No activity yet</p>
			{#if !connectionState.isConnected}
				<p class="text-xs text-[var(--color-text-muted)] mt-2">Local storage only</p>
			{/if}
		</div>
	{:else}
		<!-- Connection indicator -->
		{#if connectionState.isConnected}
			<div class="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-green-500/10 border border-green-500/20">
				<div class="w-2 h-2 rounded-full bg-green-500"></div>
				<span class="text-xs text-green-400">Synced with cloud</span>
			</div>
		{/if}

		{#each [...groupedByDate.entries()] as [dateLabel, dateItems]}
			<div class="date-group mb-6">
				<!-- Date header -->
				<div class="sticky top-0 z-10 bg-[var(--color-bg)] py-2">
					<div class="flex items-center gap-3">
						<div class="h-px flex-1 bg-[var(--color-border)]"></div>
						<span class="text-xs font-medium text-[var(--color-text-muted)] px-2">{dateLabel}</span>
						<div class="h-px flex-1 bg-[var(--color-border)]"></div>
					</div>
				</div>

				<!-- Timeline items -->
				<div class="relative pl-6">
					<!-- Vertical line -->
					<div class="absolute left-[11px] top-0 bottom-0 w-0.5 bg-[var(--color-border)]"></div>

					{#each dateItems as item}
						{@const itemType = getItemType(item)}
						{@const itemId = getItemId(item)}
						{@const code = getCode(item)}
						<div class="relative mb-4">
							<button
								onclick={() => handleItemClick(item)}
								oncontextmenu={(e) => handleContextMenu(e, itemId)}
								class="relative w-full text-left group"
								type="button"
							>
								<!-- Timeline dot -->
								<div class="absolute -left-6 top-1 w-5 h-5 rounded-full {getTypeColor(itemType)} flex items-center justify-center ring-4 ring-[var(--color-bg)]">
									<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTypeIcon(itemType)} />
									</svg>
								</div>

								<!-- Cloud indicator for PocketBase items -->
								{#if isGeneration(item)}
									<div class="absolute -left-1 top-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--color-bg)]" title="Synced to cloud"></div>
								{/if}

								<!-- Content -->
								<div class="ml-4 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
									group-hover:border-[var(--color-accent)]/50 transition-all-smooth">
									<!-- Header -->
									<div class="flex items-center justify-between mb-1">
										<div class="flex items-center gap-2">
											<span class="text-xs font-medium text-[var(--color-text-muted)] capitalize">
												{itemType}
											</span>
											{#if !isGeneration(item) && item.type === 'chat' && item.chatRole}
												<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
													{item.chatRole}
												</span>
											{/if}
											{#if isGeneration(item)}
												<span class="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
													cloud
												</span>
											{/if}
										</div>
										<span class="text-xs text-[var(--color-text-muted)]">
											{formatTime(getTimestamp(item))}
										</span>
									</div>

									<!-- Content -->
									<p class="text-sm text-[var(--color-text)] line-clamp-2">
										{truncate(getDisplayText(item), 150)}
									</p>

									<!-- Code preview for generations -->
									{#if itemType === 'generation' && code}
										<div class="mt-2 p-2 rounded bg-[var(--color-bg-tertiary)] text-xs font-mono text-[var(--color-text-muted)] line-clamp-2 overflow-hidden">
											{truncate(code, 100)}
										</div>
									{/if}

									<!-- Tags (only for Chronicle items) -->
									{#if !isGeneration(item) && item.tags && item.tags.length > 0}
										<div class="flex items-center gap-1 mt-2">
											{#each item.tags.slice(0, 3) as tag}
												<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
													{tag}
												</span>
											{/each}
										</div>
									{/if}
								</div>
							</button>

							<!-- Context Menu -->
							{#if activeContextMenu === itemId}
								<div class="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg py-1">
									<button
										onclick={() => handleRestore(item)}
										class="w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2"
										type="button"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
										Restore
									</button>
									{#if isGeneration(item)}
										<button
											onclick={() => handleFork(item)}
											class="w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2"
											type="button"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
											</svg>
											Fork from here
										</button>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.timeline-container {
		padding: 1rem;
	}
</style>
