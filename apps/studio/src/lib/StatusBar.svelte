<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import type { StudioState, StudioFile, ConnectionState } from '@v0-clone/shared'
	import { subscribeToConnectionState } from '@v0-clone/shared/pocketbase'

	interface Props {
		studioState: StudioState
		metrics: {
			lastGenerationMs: number
			lastRenderMs: number
			totalRuns: number
		}
		file: StudioFile | null
	}

	let { studioState, metrics, file }: Props = $props()

	// Connection state
	let connectionState = $state<ConnectionState>({
		isOnline: true,
		isConnected: false,
		lastSyncAt: null,
		pendingChanges: 0,
	})
	let unsubscribe: (() => void) | null = null

	onMount(() => {
		unsubscribe = subscribeToConnectionState((state) => {
			connectionState = state
		})
	})

	onDestroy(() => {
		unsubscribe?.()
	})

	// Connection indicator status
	const connectionStatus = $derived(() => {
		if (connectionState.isConnected) {
			return { color: 'bg-green-500', label: 'Connected', title: 'PocketBase connected' }
		}
		if (connectionState.isOnline) {
			return { color: 'bg-yellow-500', label: 'Local', title: 'Local only (Chronicle)' }
		}
		return { color: 'bg-red-500', label: 'Offline', title: 'No persistence' }
	})

	function formatTime(ms: number): string {
		if (ms === 0) return '-'
		if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
		if (ms < 1000) return `${ms.toFixed(1)}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	function formatFileSize(content: string | ArrayBuffer): string {
		const bytes = typeof content === 'string' ? new Blob([content]).size : content.byteLength
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}
</script>

<footer class="h-6 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] px-3 flex items-center text-xs font-mono text-[var(--color-text-muted)]">
	<!-- Connection Status -->
	<div class="flex items-center gap-1.5" title={connectionStatus().title}>
		<div class="w-2 h-2 rounded-full {connectionStatus().color}"></div>
		<span class="opacity-70">{connectionStatus().label}</span>
		{#if connectionState.pendingChanges > 0}
			<span class="text-yellow-400">({connectionState.pendingChanges})</span>
		{/if}
	</div>

	<div class="w-px h-3 bg-[var(--color-border)] mx-3"></div>

	<!-- State -->
	<div class="flex items-center gap-1.5">
		<div class="w-2 h-2 rounded-full
			{studioState === 'idle' ? 'bg-green-500' :
			 studioState === 'generating' ? 'bg-yellow-500 animate-pulse' :
			 studioState === 'loading' ? 'bg-blue-500 animate-pulse' :
			 studioState === 'rendering' ? 'bg-purple-500 animate-pulse' :
			 'bg-red-500'}"
		></div>
		<span class="uppercase">{studioState}</span>
	</div>

	<div class="w-px h-3 bg-[var(--color-border)] mx-3"></div>

	<!-- File info -->
	{#if file}
		<div class="flex items-center gap-2">
			<span>{file.name}</span>
			<span class="opacity-50">{formatFileSize(file.content)}</span>
		</div>
		<div class="w-px h-3 bg-[var(--color-border)] mx-3"></div>
	{/if}

	<!-- Metrics -->
	<div class="flex items-center gap-4">
		<span>
			Gen: <span class="text-green-400">{formatTime(metrics.lastGenerationMs)}</span>
		</span>
		<span>
			Render: <span class="text-blue-400">{formatTime(metrics.lastRenderMs)}</span>
		</span>
	</div>

	<div class="flex-1"></div>

	<!-- Version -->
	<div class="flex items-center gap-2">
		<span class="opacity-50">v0-clone</span>
		<span>0.1.0</span>
	</div>
</footer>
