<script lang="ts">
	import type { ChronicleArtifact } from '@v0-clone/shared'

	interface Props {
		artifact: ChronicleArtifact
		onclick?: () => void
		selected?: boolean
		compact?: boolean
	}

	let { artifact, onclick, selected = false, compact = false }: Props = $props()

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const diffMs = now.getTime() - timestamp
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffDays === 0) {
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
		} else if (diffDays === 1) {
			return 'Yesterday'
		} else if (diffDays < 7) {
			return date.toLocaleDateString('en-US', { weekday: 'short' })
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		}
	}

	function truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text
		return text.slice(0, maxLength).trim() + '...'
	}

	function getTypeIcon(type: ChronicleArtifact['type']): string {
		switch (type) {
			case 'generation':
				return 'M13 10V3L4 14h7v7l9-11h-7z' // Lightning bolt
			case 'chat':
				return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' // Chat
			case 'checkpoint':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' // Checkmark circle
			default:
				return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' // Document
		}
	}

	function getTypeColor(type: ChronicleArtifact['type']): string {
		switch (type) {
			case 'generation':
				return 'text-blue-500'
			case 'chat':
				return 'text-purple-500'
			case 'checkpoint':
				return 'text-green-500'
			default:
				return 'text-gray-500'
		}
	}

	function getTypeBgColor(type: ChronicleArtifact['type']): string {
		switch (type) {
			case 'generation':
				return 'bg-blue-500/10'
			case 'chat':
				return 'bg-purple-500/10'
			case 'checkpoint':
				return 'bg-green-500/10'
			default:
				return 'bg-gray-500/10'
		}
	}

	// Get display content based on artifact type
	function getDisplayContent(): string {
		if (artifact.type === 'chat' && artifact.chatMessage) {
			return artifact.chatMessage
		}
		return artifact.prompt || artifact.generatedCode?.slice(0, 100) || 'No content'
	}
</script>

<button
	{onclick}
	class="w-full text-left p-3 rounded-lg border transition-all-smooth
		{selected
			? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
			: 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50 bg-[var(--color-bg-secondary)]'}
		{compact ? 'py-2' : ''}"
	type="button"
>
	<div class="flex items-start gap-3">
		<!-- Type icon -->
		<div class="flex-shrink-0 w-8 h-8 rounded-lg {getTypeBgColor(artifact.type)} flex items-center justify-center">
			<svg class="w-4 h-4 {getTypeColor(artifact.type)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTypeIcon(artifact.type)} />
			</svg>
		</div>

		<div class="flex-1 min-w-0">
			<!-- Content preview -->
			<p class="text-sm text-[var(--color-text)] {compact ? 'line-clamp-1' : 'line-clamp-2'}">
				{truncate(getDisplayContent(), compact ? 50 : 100)}
			</p>

			<!-- Metadata row -->
			<div class="flex items-center gap-2 mt-1.5">
				<span class="text-xs text-[var(--color-text-muted)]">
					{formatDate(artifact.createdAt)}
				</span>

				{#if artifact.type === 'chat' && artifact.chatRole}
					<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
						{artifact.chatRole}
					</span>
				{/if}

				{#if artifact.tags && artifact.tags.length > 0 && !compact}
					<div class="flex items-center gap-1">
						{#each artifact.tags.slice(0, 2) as tag}
							<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
								{tag}
							</span>
						{/each}
						{#if artifact.tags.length > 2}
							<span class="text-xs text-[var(--color-text-muted)]">+{artifact.tags.length - 2}</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Code preview for generations -->
			{#if artifact.type === 'generation' && artifact.generatedCode && !compact}
				<div class="mt-2 p-2 rounded bg-[var(--color-bg-tertiary)] text-xs font-mono text-[var(--color-text-muted)] line-clamp-2 overflow-hidden">
					{truncate(artifact.generatedCode, 150)}
				</div>
			{/if}
		</div>
	</div>
</button>

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
