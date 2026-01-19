<script lang="ts">
	import { onMount } from 'svelte'
	import type { ConstraintVisualization } from '@v0-clone/shared'

	interface Props {
		previewIframe?: HTMLIFrameElement | null
		config?: Partial<ConstraintVisualization>
		onConfigChange?: (config: ConstraintVisualization) => void
	}

	let { previewIframe = null, config = {}, onConfigChange }: Props = $props()

	// Default configuration
	const defaultConfig: ConstraintVisualization = {
		showFlexbox: true,
		showGrid: true,
		showMargins: false,
		showPadding: false,
		showGaps: true,
	}

	let currentConfig = $state<ConstraintVisualization>({ ...defaultConfig, ...config })
	let showSettings = $state(false)

	// Detected layout elements from iframe
	let flexContainers = $state<Array<{
		x: number
		y: number
		width: number
		height: number
		direction: 'row' | 'column'
		gap: string
		children: Array<{ x: number; y: number; width: number; height: number }>
	}>>([])

	let gridContainers = $state<Array<{
		x: number
		y: number
		width: number
		height: number
		columns: string
		rows: string
		gap: string
		cells: Array<{ x: number; y: number; width: number; height: number; column: number; row: number }>
	}>>([])

	function updateConfig(updates: Partial<ConstraintVisualization>) {
		currentConfig = { ...currentConfig, ...updates }
		onConfigChange?.(currentConfig)
	}

	// Request layout information from iframe
	function requestLayoutInfo() {
		if (!previewIframe?.contentWindow) return

		previewIframe.contentWindow.postMessage({
			type: 'getLayoutConstraints',
			payload: { config: currentConfig },
			timestamp: Date.now()
		}, '*')
	}

	// Listen for layout info from iframe
	onMount(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === 'layoutConstraints') {
				const payload = event.data.payload
				flexContainers = payload.flexContainers ?? []
				gridContainers = payload.gridContainers ?? []
			}
		}

		window.addEventListener('message', handleMessage)

		// Initial request
		requestLayoutInfo()

		// Periodic refresh
		const interval = setInterval(requestLayoutInfo, 2000)

		return () => {
			window.removeEventListener('message', handleMessage)
			clearInterval(interval)
		}
	})

	// Re-request when config changes
	$effect(() => {
		if (currentConfig) {
			requestLayoutInfo()
		}
	})
</script>

<div class="constraints-overlay pointer-events-none absolute inset-0 z-[9997]">
	<!-- Flexbox Containers -->
	{#if currentConfig.showFlexbox}
		{#each flexContainers as container}
			<div
				class="absolute border-2 border-dashed border-purple-500/50"
				style="
					left: {container.x}px;
					top: {container.y}px;
					width: {container.width}px;
					height: {container.height}px;
				"
			>
				<!-- Flex container badge -->
				<div class="absolute -top-5 left-0 bg-purple-500 text-white px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap">
					flex {container.direction}
					{#if container.gap !== '0px'}
						<span class="text-purple-200">gap: {container.gap}</span>
					{/if}
				</div>

				<!-- Direction arrow -->
				<div class="absolute inset-0 flex items-center justify-center">
					{#if container.direction === 'row'}
						<svg class="w-8 h-8 text-purple-500/30" fill="currentColor" viewBox="0 0 24 24">
							<path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" transform="rotate(90 12 12)" />
						</svg>
					{:else}
						<svg class="w-8 h-8 text-purple-500/30" fill="currentColor" viewBox="0 0 24 24">
							<path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" transform="rotate(180 12 12)" />
						</svg>
					{/if}
				</div>

				<!-- Flex children -->
				{#each container.children as child, i}
					<div
						class="absolute bg-purple-500/10 border border-purple-500/30"
						style="
							left: {child.x - container.x}px;
							top: {child.y - container.y}px;
							width: {child.width}px;
							height: {child.height}px;
						"
					>
						<span class="absolute top-0.5 left-0.5 text-[8px] text-purple-600/70 font-mono">
							{i + 1}
						</span>
					</div>
				{/each}

				<!-- Gap indicators -->
				{#if currentConfig.showGaps && container.gap !== '0px'}
					{#each container.children.slice(0, -1) as child, i}
						{@const nextChild = container.children[i + 1]}
						{#if nextChild}
							{#if container.direction === 'row'}
								<div
									class="absolute bg-purple-400/20 flex items-center justify-center"
									style="
										left: {child.x - container.x + child.width}px;
										top: {child.y - container.y}px;
										width: {nextChild.x - (child.x + child.width)}px;
										height: {child.height}px;
									"
								>
									<span class="text-[8px] text-purple-500 font-mono rotate-90">
										{container.gap}
									</span>
								</div>
							{:else}
								<div
									class="absolute bg-purple-400/20 flex items-center justify-center"
									style="
										left: {child.x - container.x}px;
										top: {child.y - container.y + child.height}px;
										width: {child.width}px;
										height: {nextChild.y - (child.y + child.height)}px;
									"
								>
									<span class="text-[8px] text-purple-500 font-mono">
										{container.gap}
									</span>
								</div>
							{/if}
						{/if}
					{/each}
				{/if}
			</div>
		{/each}
	{/if}

	<!-- Grid Containers -->
	{#if currentConfig.showGrid}
		{#each gridContainers as container}
			<div
				class="absolute border-2 border-dashed border-emerald-500/50"
				style="
					left: {container.x}px;
					top: {container.y}px;
					width: {container.width}px;
					height: {container.height}px;
				"
			>
				<!-- Grid container badge -->
				<div class="absolute -top-5 left-0 bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap">
					grid
					{#if container.gap !== '0px'}
						<span class="text-emerald-200">gap: {container.gap}</span>
					{/if}
				</div>

				<!-- Grid template info -->
				<div class="absolute -bottom-5 left-0 bg-emerald-600/80 text-white px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap max-w-full truncate">
					{container.columns}
				</div>

				<!-- Grid cells -->
				{#each container.cells as cell}
					<div
						class="absolute bg-emerald-500/10 border border-emerald-500/30"
						style="
							left: {cell.x - container.x}px;
							top: {cell.y - container.y}px;
							width: {cell.width}px;
							height: {cell.height}px;
						"
					>
						<span class="absolute top-0.5 left-0.5 text-[8px] text-emerald-600/70 font-mono">
							{cell.column},{cell.row}
						</span>
					</div>
				{/each}
			</div>
		{/each}
	{/if}
</div>

<!-- Settings Panel -->
<div class="absolute top-8 right-14 z-[10000] pointer-events-auto">
	<button
		onclick={() => showSettings = !showSettings}
		class="p-1.5 rounded bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
		title="Constraint settings"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
		</svg>
	</button>

	{#if showSettings}
		<div class="absolute top-full right-0 mt-1 w-44 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
			<div class="p-2 border-b border-[var(--color-border)]">
				<span class="text-xs font-medium text-[var(--color-text)]">Constraints</span>
			</div>

			<div class="p-2 space-y-2">
				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showFlexbox}
						onchange={() => updateConfig({ showFlexbox: !currentConfig.showFlexbox })}
						class="rounded border-[var(--color-border)]"
					/>
					<span class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-purple-500"></span>
						Flexbox
					</span>
				</label>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showGrid}
						onchange={() => updateConfig({ showGrid: !currentConfig.showGrid })}
						class="rounded border-[var(--color-border)]"
					/>
					<span class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
						CSS Grid
					</span>
				</label>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showGaps}
						onchange={() => updateConfig({ showGaps: !currentConfig.showGaps })}
						class="rounded border-[var(--color-border)]"
					/>
					Gap indicators
				</label>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showMargins}
						onchange={() => updateConfig({ showMargins: !currentConfig.showMargins })}
						class="rounded border-[var(--color-border)]"
					/>
					<span class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-orange-500"></span>
						Margins
					</span>
				</label>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showPadding}
						onchange={() => updateConfig({ showPadding: !currentConfig.showPadding })}
						class="rounded border-[var(--color-border)]"
					/>
					<span class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-blue-500"></span>
						Padding
					</span>
				</label>
			</div>

			<!-- Legend -->
			<div class="p-2 border-t border-[var(--color-border)]">
				<div class="text-[9px] text-[var(--color-text-muted)] space-y-0.5">
					<div class="flex items-center gap-1">
						<span class="w-3 h-0.5 border-t-2 border-dashed border-purple-500"></span>
						<span>Flex container</span>
					</div>
					<div class="flex items-center gap-1">
						<span class="w-3 h-0.5 border-t-2 border-dashed border-emerald-500"></span>
						<span>Grid container</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
