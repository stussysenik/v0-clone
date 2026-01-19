<script lang="ts">
	import { onMount } from 'svelte'
	import Preview from '$lib/Preview.svelte'
	import FileLoader from '$lib/FileLoader.svelte'
	import DevInfo from '$lib/DevInfo.svelte'
	import Editor from '$lib/Editor.svelte'
	import StatusBar from '$lib/StatusBar.svelte'
	import type { StudioState, StudioFile, TelemetryEvent, PipelineOutput } from '@v0-clone/shared'

	// State
	let state = $state<StudioState>('idle')
	let currentFile = $state<StudioFile | null>(null)
	let generatedCode = $state<string>('')
	let previewHtml = $state<string>('')
	let telemetry = $state<TelemetryEvent[]>([])
	let showDevInfo = $state(true) // DEV_INFO flag
	let error = $state<string | null>(null)

	// Pipeline metrics
	let metrics = $state({
		lastGenerationMs: 0,
		lastRenderMs: 0,
		totalRuns: 0,
	})

	// Handle file loaded
	function handleFileLoaded(file: StudioFile) {
		currentFile = file
		state = 'loading'

		addTelemetry('pipeline', { event: 'file_loaded', filename: file.name })

		// If markdown, trigger generation
		if (file.type === 'markdown') {
			generateFromContent(file.content as string)
		}
	}

	// Generate from content
	async function generateFromContent(content: string) {
		state = 'generating'
		error = null

		const startTime = performance.now()
		addTelemetry('pipeline', { event: 'generation_started' })

		try {
			// For now, create a simple preview from markdown
			// In Phase 2, this will use the full LLM pipeline
			const html = markdownToPreview(content)

			generatedCode = content
			previewHtml = html

			const duration = performance.now() - startTime
			metrics.lastGenerationMs = duration
			metrics.totalRuns++

			addTelemetry('pipeline', {
				event: 'generation_completed',
				durationMs: duration
			})

			state = 'idle'
		} catch (err) {
			error = err instanceof Error ? err.message : 'Generation failed'
			state = 'error'
			addTelemetry('error', { message: error })
		}
	}

	// Simple markdown to HTML preview (placeholder for LLM generation)
	function markdownToPreview(markdown: string): string {
		// Parse basic markdown
		let html = markdown
			// Headers
			.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
			.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>')
			.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
			// Bold and italic
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			// Lists
			.replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>')
			// Code blocks
			.replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-800 p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')
			// Inline code
			.replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
			// Paragraphs
			.replace(/\n\n/g, '</p><p class="mb-4">')

		// Wrap in document - use string concatenation to avoid Svelte parsing issues
		const scriptOpen = '<' + 'script'
		const scriptClose = '</' + 'script>'

		return '<!DOCTYPE html>' +
			'<html lang="en">' +
			'<head>' +
			'<meta charset="UTF-8">' +
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
			scriptOpen + ' src="https://cdn.tailwindcss.com">' + scriptClose +
			'<style>' +
			'body { font-family: system-ui, -apple-system, sans-serif; background: #18181b; color: #fafafa; padding: 2rem; margin: 0; }' +
			'</style>' +
			'</head>' +
			'<body>' +
			'<div class="max-w-2xl mx-auto">' +
			'<p class="mb-4">' + html + '</p>' +
			'</div>' +
			scriptOpen + '>' +
			'window.parent.postMessage({ type: "ready", timestamp: Date.now() }, "*");' +
			scriptClose +
			'</body>' +
			'</html>'
	}

	// Add telemetry event
	function addTelemetry(type: TelemetryEvent['type'], data: Record<string, unknown>) {
		telemetry = [...telemetry.slice(-99), {
			type,
			timestamp: performance.now(),
			data,
		}]
	}

	// Handle preview ready
	function handlePreviewReady() {
		const renderTime = performance.now()
		metrics.lastRenderMs = renderTime
		addTelemetry('render', { event: 'preview_ready' })
	}

	// Handle prompt input
	function handlePrompt(prompt: string) {
		generateFromContent(prompt)
	}

	onMount(() => {
		// Check for DEV_INFO flag
		showDevInfo = localStorage.getItem('DEV_INFO') === 'true' ||
			new URLSearchParams(window.location.search).has('dev')

		if (showDevInfo) {
			(globalThis as Record<string, unknown>).DEV_INFO = true
		}

		addTelemetry('pipeline', { event: 'studio_mounted' })
	})
</script>

<svelte:head>
	<title>v0-clone Studio</title>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="h-14 border-b border-[var(--color-border)] flex items-center px-4 gap-4 bg-[var(--color-bg-secondary)]">
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
				<span class="text-white font-bold text-sm">v0</span>
			</div>
			<span class="font-semibold text-lg">Studio</span>
		</div>

		<div class="flex-1"></div>

		<!-- Status indicator -->
		<div class="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
			{#if state === 'generating'}
				<div class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
				<span>Generating...</span>
			{:else if state === 'loading'}
				<div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
				<span>Loading...</span>
			{:else if state === 'error'}
				<div class="w-2 h-2 rounded-full bg-red-500"></div>
				<span>Error</span>
			{:else}
				<div class="w-2 h-2 rounded-full bg-green-500"></div>
				<span>Ready</span>
			{/if}
		</div>

		<!-- Dev info toggle -->
		<button
			onclick={() => showDevInfo = !showDevInfo}
			class="px-3 py-1.5 text-sm rounded-md transition-all-smooth
				{showDevInfo ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}"
		>
			DevInfo
		</button>
	</header>

	<!-- Main content -->
	<main class="flex-1 flex overflow-hidden">
		<!-- Left panel - Editor/Input -->
		<div class="w-1/2 flex flex-col border-r border-[var(--color-border)]">
			<!-- File loader -->
			<FileLoader onFileLoaded={handleFileLoaded} />

			<!-- Editor area -->
			<div class="flex-1 overflow-hidden">
				<Editor
					content={generatedCode}
					onUpdate={(content) => generatedCode = content}
					onSubmit={handlePrompt}
				/>
			</div>
		</div>

		<!-- Right panel - Preview -->
		<div class="w-1/2 flex flex-col">
			<div class="flex-1 relative">
				<Preview
					html={previewHtml}
					{state}
					onReady={handlePreviewReady}
				/>

				<!-- Error overlay -->
				{#if error}
					<div class="absolute inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center animate-fade-in">
						<div class="bg-[var(--color-bg-secondary)] border border-red-500/50 rounded-lg p-6 max-w-md">
							<h3 class="text-red-500 font-semibold mb-2">Error</h3>
							<p class="text-sm text-[var(--color-text-muted)]">{error}</p>
							<button
								onclick={() => { error = null; state = 'idle' }}
								class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm transition-all-smooth"
							>
								Dismiss
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</main>

	<!-- Dev info panel -->
	{#if showDevInfo}
		<DevInfo {telemetry} {metrics} {state} />
	{/if}

	<!-- Status bar -->
	<StatusBar {state} {metrics} file={currentFile} />
</div>
