<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { chronicleDB, type ChronicleArtifact, type ChronicleStats } from '@v0-clone/shared'
	import {
		pb,
		getConnectionState,
		subscribeToConnectionState,
		type Conversation,
		type ConnectionState,
	} from '@v0-clone/shared'
	import ArtifactCard from './ArtifactCard.svelte'
	import ActivityCalendar from './ActivityCalendar.svelte'

	interface Props {
		onArtifactSelect?: (artifact: ChronicleArtifact) => void
		onConversationSelect?: (conversationId: string) => void
		onExport?: () => void
	}

	let { onArtifactSelect, onConversationSelect, onExport }: Props = $props()

	// View state
	type ViewMode = 'recent' | 'browse' | 'search' | 'calendar' | 'conversations'
	let viewMode = $state<ViewMode>('recent')

	// Date navigation
	let selectedYear = $state(new Date().getFullYear())
	let selectedMonth = $state<number | null>(null)
	let selectedDay = $state<number | null>(null)

	// Search
	let searchQuery = $state('')
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

	// Data
	let artifacts = $state<ChronicleArtifact[]>([])
	let conversations = $state<Conversation[]>([])
	let stats = $state<ChronicleStats | null>(null)
	let availableYears = $state<number[]>([])
	let selectedArtifact = $state<ChronicleArtifact | null>(null)
	let isLoading = $state(false)

	// PocketBase state
	let connectionState = $state<ConnectionState>(getConnectionState())
	let unsubscribeConnection: (() => void) | null = null

	// Tabs for filtering by type
	type FilterType = 'all' | 'generation' | 'chat' | 'checkpoint'
	let filterType = $state<FilterType>('all')

	// Computed filtered artifacts
	let filteredArtifacts = $derived(
		filterType === 'all'
			? artifacts
			: artifacts.filter((a) => a.type === filterType)
	)

	// Load artifacts based on current view
	async function loadArtifacts() {
		isLoading = true
		try {
			if (viewMode === 'search' && searchQuery.trim()) {
				artifacts = await chronicleDB.searchArtifacts(searchQuery.trim())
			} else if (viewMode === 'browse' || selectedMonth !== null) {
				artifacts = await chronicleDB.getArtifactsByDate(
					selectedYear,
					selectedMonth ?? undefined,
					selectedDay ?? undefined
				)
			} else {
				artifacts = await chronicleDB.getRecentArtifacts(50)
			}
		} catch (e) {
			console.warn('Failed to load artifacts:', e)
			artifacts = []
		}
		isLoading = false
	}

	// Load conversations from PocketBase
	async function loadConversations() {
		if (!connectionState.isConnected) {
			conversations = []
			return
		}

		isLoading = true
		try {
			conversations = await pb.conversations.getRecentConversations(30)
		} catch (e) {
			console.warn('Failed to load conversations:', e)
			conversations = []
		}
		isLoading = false
	}

	// Load stats
	async function loadStats() {
		try {
			stats = await chronicleDB.getStats()
			availableYears = await chronicleDB.instance.getAvailableYears()
			// Ensure current year is available
			if (!availableYears.includes(selectedYear)) {
				availableYears = [selectedYear, ...availableYears].sort((a, b) => b - a)
			}
		} catch (e) {
			console.warn('Failed to load stats:', e)
		}
	}

	// Handle search with debounce
	function handleSearchInput(value: string) {
		searchQuery = value
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer)

		if (value.trim()) {
			viewMode = 'search'
			searchDebounceTimer = setTimeout(() => {
				loadArtifacts()
			}, 300)
		} else {
			viewMode = 'recent'
			loadArtifacts()
		}
	}

	// Handle year change
	function changeYear(delta: number) {
		selectedYear += delta
		selectedMonth = null
		selectedDay = null
		if (viewMode !== 'search' && viewMode !== 'conversations') {
			loadArtifacts()
		}
	}

	// Handle month selection
	function selectMonth(month: number | null) {
		selectedMonth = selectedMonth === month ? null : month
		selectedDay = null
		viewMode = month !== null ? 'browse' : 'recent'
		loadArtifacts()
	}

	// Handle day selection from calendar
	function handleDayClick(year: number, month: number, day: number) {
		selectedYear = year
		selectedMonth = month
		selectedDay = day
		viewMode = 'browse'
		loadArtifacts()
	}

	// Handle artifact click
	function handleArtifactClick(artifact: ChronicleArtifact) {
		selectedArtifact = artifact
		onArtifactSelect?.(artifact)
	}

	// Handle conversation click
	function handleConversationClick(conversation: Conversation) {
		onConversationSelect?.(conversation.id)
	}

	// Export artifacts
	async function handleExport() {
		try {
			const blob = await chronicleDB.exportAsJSON()
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `v0-chronicle-${new Date().toISOString().split('T')[0]}.json`
			a.click()
			URL.revokeObjectURL(url)
			onExport?.()
		} catch (e) {
			console.warn('Failed to export:', e)
		}
	}

	// Toggle calendar view
	function toggleCalendar() {
		viewMode = viewMode === 'calendar' ? 'recent' : 'calendar'
	}

	// Toggle conversations view
	function toggleConversations() {
		if (viewMode === 'conversations') {
			viewMode = 'recent'
			loadArtifacts()
		} else {
			viewMode = 'conversations'
			loadConversations()
		}
	}

	// Clear filters
	function clearFilters() {
		selectedMonth = null
		selectedDay = null
		searchQuery = ''
		filterType = 'all'
		viewMode = 'recent'
		loadArtifacts()
	}

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	const months = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	]

	onMount(() => {
		loadArtifacts()
		loadStats()

		// Subscribe to connection state
		unsubscribeConnection = subscribeToConnectionState((state) => {
			connectionState = state
			// Reload conversations if we just connected and in conversations view
			if (state.isConnected && viewMode === 'conversations') {
				loadConversations()
			}
		})
	})

	onDestroy(() => {
		if (unsubscribeConnection) {
			unsubscribeConnection()
		}
	})

	// Reload when view parameters change
	$effect(() => {
		// Dependencies: viewMode, selectedYear, selectedMonth, selectedDay
		if (viewMode === 'browse') {
			loadArtifacts()
		}
	})
</script>

<div class="h-full flex flex-col bg-[var(--color-bg)]">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
		<div class="flex items-center gap-2">
			<h2 class="text-sm font-semibold text-[var(--color-text)]">Chronicle</h2>
			<!-- Sync status -->
			{#if connectionState.isConnected}
				<div class="w-2 h-2 rounded-full bg-green-500" title="Connected to cloud"></div>
			{:else}
				<div class="w-2 h-2 rounded-full bg-yellow-500" title="Local only"></div>
			{/if}
			{#if connectionState.pendingChanges > 0}
				<span class="text-xs text-yellow-500">{connectionState.pendingChanges}</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<!-- Conversations toggle -->
			<button
				onclick={toggleConversations}
				class="p-1.5 rounded-md transition-all-smooth
					{viewMode === 'conversations'
						? 'bg-[var(--color-accent)] text-white'
						: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'}"
				title="View conversations"
				disabled={!connectionState.isConnected}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
			</button>
			<button
				onclick={toggleCalendar}
				class="p-1.5 rounded-md transition-all-smooth
					{viewMode === 'calendar'
						? 'bg-[var(--color-accent)] text-white'
						: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'}"
				title="Toggle calendar view"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</button>
			<button
				onclick={handleExport}
				class="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
				title="Export artifacts"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Search (not shown in conversations view) -->
	{#if viewMode !== 'conversations'}
		<div class="p-3 border-b border-[var(--color-border)]">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="search"
					placeholder="Search artifacts..."
					value={searchQuery}
					oninput={(e) => handleSearchInput(e.currentTarget.value)}
					class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)]
						focus:border-[var(--color-accent)] focus:outline-none
						bg-[var(--color-bg-secondary)] text-[var(--color-text)]
						placeholder:text-[var(--color-text-muted)] transition-all-smooth"
				/>
			</div>
		</div>
	{/if}

	<!-- Conversations View -->
	{#if viewMode === 'conversations'}
		<div class="flex-1 overflow-y-auto p-3">
			{#if isLoading}
				<div class="flex items-center justify-center py-8">
					<div class="w-6 h-6 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
				</div>
			{:else if conversations.length === 0}
				<div class="text-center py-8">
					<div class="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
						<svg class="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<p class="text-sm text-[var(--color-text-muted)]">No conversations yet</p>
					<p class="text-xs text-[var(--color-text-muted)] mt-1">Start chatting to create one</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each conversations as conversation (conversation.id)}
						<button
							onclick={() => handleConversationClick(conversation)}
							class="w-full p-3 text-left rounded-lg border border-[var(--color-border)]
								hover:border-[var(--color-accent)] hover:shadow-sm
								bg-[var(--color-bg-secondary)] transition-all-smooth"
						>
							<div class="flex items-center justify-between mb-1">
								<span class="text-sm font-medium text-[var(--color-text)] truncate">
									{conversation.title}
								</span>
								{#if conversation.status === 'archived'}
									<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
										Archived
									</span>
								{/if}
							</div>
							<div class="text-xs text-[var(--color-text-muted)]">
								{formatDate(conversation.created)}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Date navigation -->
		{#if viewMode !== 'calendar'}
			<div class="p-3 border-b border-[var(--color-border)]">
				<!-- Year selector -->
				<div class="flex items-center justify-between mb-3">
					<button
						onclick={() => changeYear(-1)}
						class="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<span class="text-sm font-medium text-[var(--color-text)]">{selectedYear}</span>
					<button
						onclick={() => changeYear(1)}
						class="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>

				<!-- Month grid -->
				<div class="grid grid-cols-6 gap-1">
					{#each months as month, i}
						<button
							onclick={() => selectMonth(i + 1)}
							class="py-1 px-2 text-xs rounded transition-all-smooth
								{selectedMonth === i + 1
									? 'bg-[var(--color-accent)] text-white'
									: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'}"
						>
							{month}
						</button>
					{/each}
				</div>

				<!-- Active filters -->
				{#if selectedMonth !== null || selectedDay !== null || filterType !== 'all'}
					<div class="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
						<span class="text-xs text-[var(--color-text-muted)]">Filters:</span>
						{#if selectedMonth !== null}
							<span class="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
								{months[selectedMonth - 1]} {selectedDay !== null ? selectedDay : ''}
							</span>
						{/if}
						{#if filterType !== 'all'}
							<span class="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
								{filterType}
							</span>
						{/if}
						<button
							onclick={clearFilters}
							class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
						>
							Clear
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Calendar view -->
		{#if viewMode === 'calendar'}
			<div class="p-3 border-b border-[var(--color-border)]">
				<div class="flex items-center justify-between mb-3">
					<button
						onclick={() => selectedYear--}
						class="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<span class="text-sm font-medium text-[var(--color-text)]">{selectedYear}</span>
					<button
						onclick={() => selectedYear++}
						class="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
				<ActivityCalendar year={selectedYear} onDayClick={handleDayClick} />
			</div>
		{/if}

		<!-- Type filter tabs -->
		<div class="flex items-center gap-1 p-2 border-b border-[var(--color-border)]">
			{#each ['all', 'generation', 'chat', 'checkpoint'] as type}
				<button
					onclick={() => filterType = type as FilterType}
					class="px-2 py-1 text-xs rounded transition-all-smooth
						{filterType === type
							? 'bg-[var(--color-accent)] text-white'
							: 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'}"
				>
					{type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
				</button>
			{/each}
		</div>

		<!-- Stats bar -->
		{#if stats}
			<div class="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
				<span>{stats.totalArtifacts} artifacts</span>
				<span class="mx-2">|</span>
				<span>{stats.byType.generation} generations</span>
				<span class="mx-2">|</span>
				<span>{stats.byType.chat} chats</span>
			</div>
		{/if}

		<!-- Artifact list -->
		<div class="flex-1 overflow-y-auto p-3">
			{#if isLoading}
				<div class="flex items-center justify-center py-8">
					<div class="w-6 h-6 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
				</div>
			{:else if filteredArtifacts.length === 0}
				<div class="text-center py-8">
					<div class="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
						<svg class="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<p class="text-sm text-[var(--color-text-muted)]">
						{#if searchQuery}
							No artifacts found for "{searchQuery}"
						{:else if selectedMonth !== null}
							No artifacts in {months[selectedMonth - 1]} {selectedYear}
						{:else}
							No artifacts yet
						{/if}
					</p>
					<p class="text-xs text-[var(--color-text-muted)] mt-1">
						Generate some components to see them here
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each filteredArtifacts as artifact (artifact.id)}
						<ArtifactCard
							{artifact}
							selected={selectedArtifact?.id === artifact.id}
							onclick={() => handleArtifactClick(artifact)}
							compact
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
