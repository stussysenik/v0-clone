<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { chronicleDB } from '@v0-clone/shared'
	import {
		pb,
		initPocketBase,
		getConnectionState,
		subscribeToConnectionState,
		type Conversation,
		type Message as PBMessage,
		type ConnectionState,
	} from '@v0-clone/shared'

	interface Props {
		onSubmit: (prompt: string) => void
		history?: Message[]
		isGenerating?: boolean
		onConversationChange?: (conversationId: string | null) => void
	}

	export interface Message {
		role: 'user' | 'assistant' | 'system'
		content: string
		timestamp: number
		synced?: boolean
		syncError?: boolean
		retrying?: boolean
	}

	let { onSubmit, history = [], isGenerating = false, onConversationChange }: Props = $props()

	let currentPrompt = $state('')
	let chatHistory = $state<Message[]>([])
	let chatContainer: HTMLDivElement

	// PocketBase state
	let currentConversation = $state<Conversation | null>(null)
	let connectionState = $state<ConnectionState>(getConnectionState())
	let isPocketBaseAvailable = $state(false)
	let unsubscribeConnection: (() => void) | null = null

	// Sync history prop to local state
	$effect(() => {
		chatHistory = history
	})

	const examples = [
		'A modern pricing card with 3 tiers and hover effects',
		'A dashboard sidebar with navigation and icons',
		'A hero section with gradient background and CTA buttons',
		'A contact form with validation',
	]

	function handleExampleClick(example: string) {
		currentPrompt = example
	}

	async function handleSubmit() {
		if (currentPrompt.trim() && !isGenerating) {
			const messageContent = currentPrompt.trim()

			const message: Message = {
				role: 'user',
				content: messageContent,
				timestamp: Date.now(),
				synced: false,
			}

			chatHistory = [...chatHistory, message]
			onSubmit(messageContent)

			// Save to chronicle (local IndexedDB)
			try {
				await chronicleDB.addChatMessage(message.content, message.role)
			} catch (e) {
				console.warn('Failed to save chat to chronicle:', e)
			}

			// Sync to PocketBase if available
			if (isPocketBaseAvailable) {
				await syncMessageToPocketBase(chatHistory.length - 1, messageContent, 'user')
			}

			currentPrompt = ''

			// Save to localStorage (for backwards compatibility)
			localStorage.setItem('chatHistory', JSON.stringify(chatHistory))

			// Scroll to bottom
			setTimeout(() => {
				if (chatContainer) {
					chatContainer.scrollTop = chatContainer.scrollHeight
				}
			}, 0)
		}
	}

	/**
	 * Sync a message to PocketBase with retry support
	 */
	async function syncMessageToPocketBase(index: number, content: string, role: 'user' | 'assistant') {
		if (index < 0 || index >= chatHistory.length) return

		// Mark as syncing
		chatHistory[index] = { ...chatHistory[index], retrying: true, syncError: false }

		try {
			// Create conversation if this is the first message
			if (!currentConversation) {
				currentConversation = await pb.conversations.createConversationWithTitle(content)
				onConversationChange?.(currentConversation.id)
			}

			// Save message to PocketBase
			await pb.messages.createMessage({
				conversation: currentConversation.id,
				role,
				content,
			})

			// Mark as synced
			chatHistory[index] = { ...chatHistory[index], synced: true, retrying: false, syncError: false }
		} catch (e) {
			console.warn('Failed to sync message to PocketBase:', e)
			chatHistory[index] = { ...chatHistory[index], synced: false, retrying: false, syncError: true }
		}
	}

	/**
	 * Retry syncing a failed message
	 */
	async function retrySync(index: number) {
		if (index < 0 || index >= chatHistory.length) return

		const message = chatHistory[index]
		if (!message.syncError) return

		await syncMessageToPocketBase(index, message.content, message.role)
		localStorage.setItem('chatHistory', JSON.stringify(chatHistory))
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault()
			handleSubmit()
		}
	}

	async function handleClearChat() {
		// Archive the conversation in PocketBase if it exists
		if (currentConversation && isPocketBaseAvailable) {
			try {
				await pb.conversations.archiveConversation(currentConversation.id)
			} catch (e) {
				console.warn('Failed to archive conversation:', e)
			}
		}

		chatHistory = []
		currentConversation = null
		onConversationChange?.(null)
		localStorage.removeItem('chatHistory')
	}

	/**
	 * Add assistant response to chat and sync
	 */
	export async function addAssistantMessage(content: string) {
		const message: Message = {
			role: 'assistant',
			content,
			timestamp: Date.now(),
			synced: false,
		}

		chatHistory = [...chatHistory, message]

		// Save to chronicle
		try {
			await chronicleDB.addChatMessage(content, 'assistant')
		} catch (e) {
			console.warn('Failed to save assistant message to chronicle:', e)
		}

		// Sync to PocketBase
		if (isPocketBaseAvailable && currentConversation) {
			try {
				await pb.messages.createMessage({
					conversation: currentConversation.id,
					role: 'assistant',
					content,
				})

				const lastIndex = chatHistory.length - 1
				if (lastIndex >= 0) {
					chatHistory[lastIndex] = { ...chatHistory[lastIndex], synced: true }
				}
			} catch (e) {
				console.warn('Failed to sync assistant message:', e)
			}
		}

		localStorage.setItem('chatHistory', JSON.stringify(chatHistory))

		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight
			}
		}, 0)
	}

	/**
	 * Load a conversation by ID
	 */
	export async function loadConversation(conversationId: string) {
		if (!isPocketBaseAvailable) return

		try {
			const conversation = await pb.conversations.getConversation(conversationId)
			if (!conversation) return

			currentConversation = conversation
			onConversationChange?.(conversationId)

			// Load messages
			const messages = await pb.messages.getAllConversationMessages(conversationId)
			chatHistory = messages.map((m) => ({
				role: m.role,
				content: m.content,
				timestamp: new Date(m.created).getTime(),
				synced: true,
			}))

			localStorage.setItem('chatHistory', JSON.stringify(chatHistory))
		} catch (e) {
			console.warn('Failed to load conversation:', e)
		}
	}

	// Initialize PocketBase and load chat history
	onMount(async () => {
		// Initialize PocketBase connection
		try {
			initPocketBase()

			// Subscribe to connection state changes
			unsubscribeConnection = subscribeToConnectionState((state) => {
				connectionState = state
				isPocketBaseAvailable = state.isConnected
			})

			// Test connection
			const state = getConnectionState()
			isPocketBaseAvailable = state.isConnected
		} catch (e) {
			console.warn('PocketBase not available:', e)
			isPocketBaseAvailable = false
		}

		// Load chat history from localStorage
		const saved = localStorage.getItem('chatHistory')
		if (saved) {
			try {
				chatHistory = JSON.parse(saved)
			} catch (e) {
				console.warn('Failed to load chat history:', e)
			}
		}

		// Try to restore last conversation ID
		const lastConversationId = localStorage.getItem('currentConversationId')
		if (lastConversationId && isPocketBaseAvailable) {
			try {
				const conversation = await pb.conversations.getConversation(lastConversationId)
				if (conversation && conversation.status === 'active') {
					currentConversation = conversation
					onConversationChange?.(conversation.id)
				}
			} catch (e) {
				// Conversation no longer exists, that's fine
			}
		}
	})

	onDestroy(() => {
		if (unsubscribeConnection) {
			unsubscribeConnection()
		}
	})

	// Save conversation ID to localStorage when it changes
	$effect(() => {
		if (currentConversation) {
			localStorage.setItem('currentConversationId', currentConversation.id)
		} else {
			localStorage.removeItem('currentConversationId')
		}
	})
</script>

<div class="h-full flex flex-col bg-[var(--color-bg)]">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
		<div class="flex items-center gap-2">
			<h2 class="text-sm font-semibold text-[var(--color-text)]">Chat</h2>
			<!-- Sync status indicator -->
			{#if isPocketBaseAvailable}
				<div class="w-2 h-2 rounded-full bg-green-500" title="Synced to cloud"></div>
			{:else}
				<div class="w-2 h-2 rounded-full bg-yellow-500" title="Local only"></div>
			{/if}
		</div>
		{#if chatHistory.length > 0}
			<button
				onclick={handleClearChat}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Chat History / Welcome -->
	<div bind:this={chatContainer} class="flex-1 overflow-y-auto overflow-x-hidden p-4">
		{#if chatHistory.length === 0}
			<!-- Welcome State -->
			<div class="welcome-section animate-fade-in">
				<div class="text-center mb-8">
					<div
						class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
					>
						<span class="text-white font-bold text-2xl">v0</span>
					</div>
					<h3 class="text-xl font-bold mb-2 text-[var(--color-text)]">
						Generate UI with AI
					</h3>
					<p class="text-sm text-[var(--color-text-secondary)]">
						Describe what you want to build
					</p>
				</div>

				<!-- Example Prompts -->
				<div class="space-y-2">
					<p class="text-xs text-[var(--color-text-muted)] mb-2">Try an example:</p>
					{#each examples as example}
						<button
							onclick={() => handleExampleClick(example)}
							class="w-full p-3 text-left text-sm rounded-lg border border-[var(--color-border)]
								hover:border-[var(--color-accent)] hover:shadow-sm
								bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]
								transition-all-smooth"
						>
							{example}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<!-- Chat Messages -->
			<div class="space-y-4">
				{#each chatHistory as message, index}
					<div
						class="message message-{message.role} animate-fade-in-scale"
						class:message-user={message.role === 'user'}
						class:message-assistant={message.role === 'assistant'}
						class:message-system={message.role === 'system'}
					>
						<div class="flex items-start gap-3">
							<div class="avatar flex-shrink-0">
								{#if message.role === 'user'}
									<div class="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
										<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
									</div>
								{:else}
									<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
										<span class="text-white font-bold text-xs">AI</span>
									</div>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1">
									<span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
									{#if message.retrying}
										<div class="w-3 h-3 border border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
									{:else if message.synced}
										<svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{:else if message.syncError}
										<button
											onclick={() => retrySync(index)}
											class="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
											title="Click to retry"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											<span class="text-xs">Retry</span>
										</button>
									{/if}
								</div>
								<div class="text-sm text-[var(--color-text)] leading-relaxed">
									{message.content}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<div class="border-t border-[var(--color-border)] p-4">
		<div class="relative">
			<textarea
				bind:value={currentPrompt}
				onkeydown={handleKeyDown}
				placeholder={chatHistory.length === 0 ? "Describe your UI component..." : "Type a follow-up..."}
				disabled={isGenerating}
				class="w-full h-24 p-3 pr-12 rounded-lg border border-[var(--color-border)]
					focus:border-[var(--color-accent)] focus:outline-none resize-none
					bg-[var(--color-bg-secondary)] text-[var(--color-text)]
					placeholder:text-[var(--color-text-muted)]
					disabled:opacity-50 disabled:cursor-not-allowed
					transition-all-smooth text-sm"
			></textarea>

			<button
				onclick={handleSubmit}
				disabled={!currentPrompt.trim() || isGenerating}
				class="absolute bottom-3 right-3 w-8 h-8 rounded-md bg-[var(--color-accent)]
					hover:bg-[var(--color-accent-hover)] text-white
					disabled:opacity-50 disabled:cursor-not-allowed
					transition-all-smooth flex items-center justify-center shadow-md"
				title="Send (⌘+Enter)"
			>
				{#if isGenerating}
					<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				{/if}
			</button>
		</div>

		<div class="mt-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
			<span>
				Press <kbd class="px-1.5 py-0.5 bg-[var(--color-bg-secondary)] rounded text-[var(--color-text)] mx-0.5">⌘</kbd>+<kbd class="px-1.5 py-0.5 bg-[var(--color-bg-secondary)] rounded text-[var(--color-text)] mx-0.5">Enter</kbd> to send
			</span>
			{#if connectionState.pendingChanges > 0}
				<span class="text-yellow-500">
					{connectionState.pendingChanges} pending sync
				</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.message {
		animation: fade-in-scale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes fade-in-scale {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
