<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type {
		FigmaDesignTokens,
		FigmaImportResult,
		FigmaContext,
	} from '@v0-clone/shared'

	interface Props {
		onImport?: (result: FigmaImportResult) => void
		context?: FigmaContext | null
	}

	let { onImport, context = null }: Props = $props()

	const dispatch = createEventDispatcher<{
		import: FigmaImportResult
		clear: void
	}>()

	let figmaUrl = $state('')
	let isLoading = $state(false)
	let error = $state<string | null>(null)
	let importResult = $state<FigmaImportResult | null>(null)
	let showPreview = $state(false)

	// Parse Figma URL to extract file key
	function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
		try {
			const urlObj = new URL(url)

			// Support various Figma URL formats
			// https://www.figma.com/file/FILEKEY/Title
			// https://www.figma.com/design/FILEKEY/Title
			// https://www.figma.com/file/FILEKEY/Title?node-id=NODEID

			const pathMatch = urlObj.pathname.match(/\/(file|design)\/([a-zA-Z0-9]+)/)
			if (!pathMatch) return null

			const fileKey = pathMatch[2]
			const nodeId = urlObj.searchParams.get('node-id') ?? undefined

			return { fileKey, nodeId }
		} catch {
			return null
		}
	}

	async function handleImport() {
		if (!figmaUrl.trim()) return

		const parsed = parseFigmaUrl(figmaUrl)
		if (!parsed) {
			error = 'Invalid Figma URL. Please use a Figma file or design URL.'
			return
		}

		isLoading = true
		error = null

		try {
			// Call API endpoint to extract tokens via Figma MCP
			const response = await fetch('/api/figma/extract', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fileKey: parsed.fileKey,
					nodeId: parsed.nodeId,
				}),
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.error || `Failed to extract tokens: ${response.status}`)
			}

			const result: FigmaImportResult = await response.json()
			importResult = result

			if (result.success) {
				onImport?.(result)
				dispatch('import', result)
				showPreview = true
			} else {
				error = result.errors.join(', ')
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to import Figma tokens'
		}

		isLoading = false
	}

	function handleClear() {
		figmaUrl = ''
		importResult = null
		error = null
		showPreview = false
		dispatch('clear')
	}

	function formatColorValue(color: { value: string; opacity?: number }): string {
		if (color.opacity !== undefined && color.opacity < 1) {
			return `${color.value} (${Math.round(color.opacity * 100)}%)`
		}
		return color.value
	}
</script>

<div class="figma-importer p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
	<!-- Header -->
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
				<path d="M5.5 9a3.5 3.5 0 103.5-3.5H5.5V9z"/>
				<path d="M5.5 5.5A3.5 3.5 0 119 9H5.5V5.5z"/>
				<path d="M5.5 12.5A3.5 3.5 0 119 16H5.5v-3.5z"/>
				<path d="M5.5 19.5A3.5 3.5 0 119 16H5.5v3.5z"/>
				<path d="M12.5 12.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0z"/>
			</svg>
			<h3 class="text-sm font-semibold text-[var(--color-text)]">Figma Integration</h3>
		</div>
		{#if importResult?.success}
			<button
				onclick={handleClear}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- URL Input -->
	{#if !importResult?.success}
		<div class="space-y-3">
			<div class="relative">
				<input
					type="url"
					bind:value={figmaUrl}
					placeholder="Paste Figma file URL..."
					disabled={isLoading}
					class="w-full px-3 py-2 pr-20 text-sm rounded-lg border border-[var(--color-border)]
						bg-[var(--color-bg)] text-[var(--color-text)]
						placeholder:text-[var(--color-text-muted)]
						focus:border-purple-500 focus:outline-none
						disabled:opacity-50 transition-all"
				/>
				<button
					onclick={handleImport}
					disabled={!figmaUrl.trim() || isLoading}
					class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium
						rounded-md bg-purple-600 hover:bg-purple-700 text-white
						disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					{#if isLoading}
						<div class="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
					{:else}
						Import
					{/if}
				</button>
			</div>

			{#if error}
				<div class="flex items-start gap-2 p-2 rounded-md bg-red-500/10 text-red-400">
					<svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-xs">{error}</p>
				</div>
			{/if}

			<p class="text-xs text-[var(--color-text-muted)]">
				Import design tokens from Figma to generate UI with your brand colors and styles.
			</p>
		</div>
	{:else}
		<!-- Token Preview -->
		<div class="space-y-3">
			<!-- Success indicator -->
			<div class="flex items-center gap-2 p-2 rounded-md bg-green-500/10 text-green-400">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				<span class="text-xs font-medium">Tokens imported successfully</span>
			</div>

			<!-- Toggle preview -->
			<button
				onclick={() => showPreview = !showPreview}
				class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
			>
				<svg
					class="w-3 h-3 transition-transform {showPreview ? 'rotate-90' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				{showPreview ? 'Hide' : 'Show'} token preview
			</button>

			{#if showPreview && importResult?.tokens}
				{@const tokens = importResult.tokens}
				<div class="space-y-3 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
					<!-- Colors -->
					{#if Object.keys(tokens.colors.primary).length > 0 || Object.keys(tokens.colors.secondary).length > 0}
						<div>
							<h4 class="text-xs font-medium text-[var(--color-text-muted)] mb-2">Colors</h4>
							<div class="flex flex-wrap gap-1.5">
								{#each Object.entries(tokens.colors.primary) as [name, color]}
									<div
										class="w-6 h-6 rounded border border-[var(--color-border)]"
										style="background-color: {color.value}"
										title="{name}: {formatColorValue(color)}"
									></div>
								{/each}
								{#each Object.entries(tokens.colors.secondary) as [name, color]}
									<div
										class="w-6 h-6 rounded border border-[var(--color-border)]"
										style="background-color: {color.value}"
										title="{name}: {formatColorValue(color)}"
									></div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Typography -->
					{#if tokens.typography.fontFamilies.length > 0}
						<div>
							<h4 class="text-xs font-medium text-[var(--color-text-muted)] mb-1">Fonts</h4>
							<p class="text-xs text-[var(--color-text)]">
								{tokens.typography.fontFamilies.slice(0, 3).join(', ')}
								{#if tokens.typography.fontFamilies.length > 3}
									<span class="text-[var(--color-text-muted)]"> +{tokens.typography.fontFamilies.length - 3} more</span>
								{/if}
							</p>
						</div>
					{/if}

					<!-- Spacing -->
					{#if Object.keys(tokens.spacing).length > 0}
						<div>
							<h4 class="text-xs font-medium text-[var(--color-text-muted)] mb-1">Spacing</h4>
							<div class="flex gap-1 overflow-x-auto">
								{#each Object.entries(tokens.spacing).slice(0, 8) as [name, spacing]}
									<div
										class="flex-shrink-0 bg-purple-500/20 rounded text-[10px] px-1.5 py-0.5 text-purple-300"
										title="{name}"
									>
										{spacing.value}{spacing.unit}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Source info -->
					<div class="pt-2 border-t border-[var(--color-border)]">
						<p class="text-[10px] text-[var(--color-text-muted)]">
							From: {tokens.source.fileName}
						</p>
					</div>
				</div>
			{/if}

			<!-- Warnings -->
			{#if importResult?.warnings && importResult.warnings.length > 0}
				<div class="space-y-1">
					{#each importResult.warnings as warning}
						<div class="flex items-start gap-2 text-xs text-yellow-400">
							<svg class="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<span>{warning}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
