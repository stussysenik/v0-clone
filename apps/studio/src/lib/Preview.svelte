<script lang="ts">
	import { onMount } from 'svelte'
	import { browser } from '$app/environment'
	import Welcome from './Welcome.svelte'
	import DevTools from './DevTools.svelte'
	import Grid from './overlays/Grid.svelte'
	import Ruler from './overlays/Ruler.svelte'
	import { takeScreenshot } from './utils/screenshot'
	import type { StudioState } from '@v0-clone/shared'

	interface Props {
		html: string
		studioState: StudioState
		currentStage?: 'parse' | 'generate' | 'render' | null
		generatedCode?: string
		onReady?: () => void
		onMetrics?: (metrics: { domNodes: number; loadTimeMs: number }) => void
		onPrompt?: (prompt: string) => void
	}

	let { html, studioState, currentStage = null, generatedCode = '', onReady, onMetrics, onPrompt }: Props = $props()

	let iframeRef: HTMLIFrameElement
	let containerRef: HTMLDivElement
	let isLoading = $state(true)
	let justGenerated = $state(false)
	let generationTime = $state(0)
	let showGrid = $state(false)
	let showRuler = $state(false)
	let showOutlines = $state(false)
	let viewport = $state<'mobile' | 'tablet' | 'desktop'>('desktop')

	function handleScreenshot() {
		if (iframeRef) {
			takeScreenshot(iframeRef)
		}
	}

	function handleGridToggle() {
		showGrid = !showGrid
	}

	function handleRulerToggle() {
		showRuler = !showRuler
	}

	function handleOutlinesToggle() {
		showOutlines = !showOutlines
		// Inject or remove outline styles in iframe
		if (iframeRef?.contentDocument) {
			const styleId = 'dev-outlines'
			let style = iframeRef.contentDocument.getElementById(styleId)

			if (showOutlines) {
				if (!style) {
					style = iframeRef.contentDocument.createElement('style')
					style.id = styleId
					style.textContent = '* { outline: 1px solid rgba(59, 130, 246, 0.3) !important; }'
					iframeRef.contentDocument.head.appendChild(style)
				}
			} else if (style) {
				style.remove()
			}
		}
	}

	function handleViewportChange(newViewport: 'mobile' | 'tablet' | 'desktop') {
		viewport = newViewport
		// Update iframe width based on viewport
		if (iframeRef) {
			switch (newViewport) {
				case 'mobile':
					iframeRef.style.width = '375px'
					iframeRef.style.margin = '0 auto'
					break
				case 'tablet':
					iframeRef.style.width = '768px'
					iframeRef.style.margin = '0 auto'
					break
				case 'desktop':
					iframeRef.style.width = '100%'
					iframeRef.style.margin = '0'
					break
			}
		}
	}

	// Handle messages from iframe
	function handleMessage(event: MessageEvent) {
		if (event.source !== iframeRef?.contentWindow) return

		const { type, payload } = event.data

		switch (type) {
			case 'ready':
				isLoading = false
				onReady?.()
				break
			case 'metrics':
				onMetrics?.(payload)
				break
		}
	}

	// Update iframe when html changes
	$effect(() => {
		if (browser && html && iframeRef) {
			isLoading = true
			iframeRef.srcdoc = html

			// Show success banner when generation completes
			if (studioState === 'idle') {
				justGenerated = true
				setTimeout(() => {
					justGenerated = false
				}, 3000)
			}
		}
	})

	onMount(() => {
		window.addEventListener('message', handleMessage)
		return () => {
			window.removeEventListener('message', handleMessage)
		}
	})
</script>

<div
	bind:this={containerRef}
	class="w-full h-full relative bg-[var(--color-bg-tertiary)] overflow-hidden flex flex-col"
>
	<!-- DevTools Toolbar -->
	{#if html}
		<DevTools
			onViewportChange={handleViewportChange}
			onGridToggle={handleGridToggle}
			onRulerToggle={handleRulerToggle}
			onOutlinesToggle={handleOutlinesToggle}
			onScreenshot={handleScreenshot}
		/>
	{/if}

	<div class="flex-1 relative overflow-hidden">
	<!-- Generation overlay with stage feedback -->
	{#if studioState === 'generating'}
		<div class="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg)]/90 backdrop-blur-sm z-10 animate-fade-in">
			<!-- Stage indicators -->
			<div class="stage-indicator flex flex-col gap-3 mb-6">
				<div class="stage flex items-center gap-3 {currentStage === 'parse' ? 'active' : currentStage && ['generate', 'render'].includes(currentStage) ? 'completed' : ''}">
					{#if currentStage === 'parse'}
						<div class="w-5 h-5 border-2 border-[var(--color-accent)] rounded-full border-t-transparent animate-spin"></div>
					{:else if currentStage && ['generate', 'render'].includes(currentStage)}
						<svg class="w-5 h-5 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
					{:else}
						<div class="w-5 h-5 border-2 border-[var(--color-border)] rounded-full"></div>
					{/if}
					<span class="text-sm {currentStage === 'parse' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}">
						Parsing prompt
					</span>
				</div>

				<div class="stage flex items-center gap-3 {currentStage === 'generate' ? 'active' : currentStage === 'render' ? 'completed' : ''}">
					{#if currentStage === 'generate'}
						<div class="w-5 h-5 border-2 border-[var(--color-accent)] rounded-full border-t-transparent animate-spin"></div>
					{:else if currentStage === 'render'}
						<svg class="w-5 h-5 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
					{:else}
						<div class="w-5 h-5 border-2 border-[var(--color-border)] rounded-full"></div>
					{/if}
					<span class="text-sm {currentStage === 'generate' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}">
						Generating code...
					</span>
				</div>

				<div class="stage flex items-center gap-3 {currentStage === 'render' ? 'active' : ''}">
					{#if currentStage === 'render'}
						<div class="w-5 h-5 border-2 border-[var(--color-accent)] rounded-full border-t-transparent animate-spin"></div>
					{:else}
						<div class="w-5 h-5 border-2 border-[var(--color-border)] rounded-full"></div>
					{/if}
					<span class="text-sm {currentStage === 'render' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}">
						Rendering preview
					</span>
				</div>
			</div>

			<!-- Streaming code preview (faded background) -->
			{#if generatedCode}
				<div class="code-stream-preview max-w-2xl w-full max-h-64 overflow-auto p-4 rounded-lg bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)]">
					<pre class="text-xs text-[var(--color-text-muted)] font-mono">{generatedCode}</pre>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Generation complete banner -->
	{#if justGenerated && html}
		<div class="absolute top-0 left-0 right-0 z-20 animate-slide-down">
			<div class="m-4 p-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 flex items-center gap-3 shadow-lg backdrop-blur-sm">
				<svg class="w-5 h-5 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<span class="text-sm font-medium text-[var(--color-text)]">
					✨ Generated successfully
					{#if generationTime > 0}
						<span class="text-[var(--color-text-muted)]">• {generationTime}ms</span>
					{/if}
				</span>
			</div>
		</div>
	{/if}

	<!-- Empty state / Welcome -->
	{#if !html && studioState === 'idle'}
		<div class="absolute inset-0">
			<Welcome onSubmit={(prompt) => onPrompt?.(prompt)} />
		</div>
	{/if}

	<!-- Preview iframe -->
	<iframe
		bind:this={iframeRef}
		title="Preview"
		class="w-full h-full border-none
			{isLoading || !html ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100 animate-fade-in-scale'}"
		style="transition: opacity 300ms var(--easing-smooth), transform 300ms var(--easing-smooth);"
		sandbox="allow-scripts allow-same-origin"
	></iframe>

	<!-- Dev overlays -->
	{#if showGrid}
		<Grid />
	{/if}

	{#if showRuler}
		<Ruler />
	{/if}
	</div>
</div>
