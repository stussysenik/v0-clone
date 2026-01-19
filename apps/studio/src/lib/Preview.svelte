<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import type { StudioState } from '@v0-clone/shared'

	interface Props {
		html: string
		state: StudioState
		onReady?: () => void
		onMetrics?: (metrics: { domNodes: number; loadTimeMs: number }) => void
	}

	let { html, state, onReady, onMetrics }: Props = $props()

	let iframeRef: HTMLIFrameElement
	let containerRef: HTMLDivElement
	let loading = $state(true)

	// Handle messages from iframe
	function handleMessage(event: MessageEvent) {
		if (event.source !== iframeRef?.contentWindow) return

		const { type, payload, timestamp } = event.data

		switch (type) {
			case 'ready':
				loading = false
				onReady?.()
				break
			case 'metrics':
				onMetrics?.(payload)
				break
		}
	}

	// Update iframe when html changes
	$effect(() => {
		if (html && iframeRef) {
			loading = true
			iframeRef.srcdoc = html
		}
	})

	onMount(() => {
		window.addEventListener('message', handleMessage)
	})

	onDestroy(() => {
		window.removeEventListener('message', handleMessage)
	})
</script>

<div
	bind:this={containerRef}
	class="w-full h-full relative bg-[var(--color-bg-tertiary)] overflow-hidden"
>
	<!-- Loading overlay -->
	{#if loading || state === 'generating'}
		<div class="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-sm z-10 animate-fade-in">
			<div class="flex flex-col items-center gap-4">
				<div class="relative">
					<div class="w-12 h-12 border-2 border-[var(--color-border)] rounded-full"></div>
					<div class="absolute top-0 left-0 w-12 h-12 border-2 border-transparent border-t-[var(--color-accent)] rounded-full animate-spin"></div>
				</div>
				<span class="text-sm text-[var(--color-text-muted)]">
					{state === 'generating' ? 'Generating preview...' : 'Loading...'}
				</span>
			</div>
		</div>
	{/if}

	<!-- Empty state -->
	{#if !html}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="text-center animate-fade-in">
				<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center">
					<svg class="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
				<p class="text-[var(--color-text-muted)] text-sm">
					Load a file or enter a prompt to see the preview
				</p>
			</div>
		</div>
	{/if}

	<!-- Preview iframe -->
	<iframe
		bind:this={iframeRef}
		title="Preview"
		class="w-full h-full border-none transition-opacity duration-300
			{loading || !html ? 'opacity-0' : 'opacity-100'}"
		sandbox="allow-scripts allow-same-origin"
	></iframe>

	<!-- Responsive indicator -->
	<div class="absolute bottom-4 right-4 flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
		<button
			class="p-2 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
			title="Mobile view"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
		</button>
		<button
			class="p-2 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-all-smooth"
			title="Tablet view"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
		</button>
		<button
			class="p-2 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-all-smooth"
			title="Desktop view"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
		</button>
	</div>
</div>
