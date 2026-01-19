<script lang="ts">
	import { type GridConfig, type GridRatio, GRID_SIZES } from '@v0-clone/shared'

	interface Props {
		config?: Partial<GridConfig>
		onConfigChange?: (config: GridConfig) => void
	}

	let { config = {}, onConfigChange }: Props = $props()

	// Default configuration
	const defaultConfig: GridConfig = {
		ratio: '8pt',
		showSubdivisions: false,
		subdivisionCount: 4,
		color: 'rgba(59, 130, 246, 0.1)',
		opacity: 1,
		showCenterLines: false,
	}

	let currentConfig = $state<GridConfig>({ ...defaultConfig, ...config })

	// Calculate grid size based on ratio
	const gridSize = $derived(() => {
		if (currentConfig.ratio === 'custom') {
			return currentConfig.customSize ?? 8
		}
		return GRID_SIZES[currentConfig.ratio]
	})

	// Subdivision size
	const subGridSize = $derived(() => gridSize() / currentConfig.subdivisionCount)

	// Available ratios for UI
	const ratioOptions: { value: GridRatio; label: string; description: string }[] = [
		{ value: '4pt', label: '4pt', description: 'Compact spacing' },
		{ value: '6pt', label: '6pt', description: 'Dense layouts' },
		{ value: '8pt', label: '8pt', description: 'Standard (Material)' },
		{ value: '12pt', label: '12pt', description: 'Spacious layouts' },
		{ value: 'golden', label: 'Golden', description: 'φ-based (8.09px)' },
		{ value: 'custom', label: 'Custom', description: 'Custom size' },
	]

	let showSettings = $state(false)

	function updateConfig(updates: Partial<GridConfig>) {
		currentConfig = { ...currentConfig, ...updates }
		onConfigChange?.(currentConfig)
	}

	function cycleRatio() {
		const currentIndex = ratioOptions.findIndex(r => r.value === currentConfig.ratio)
		const nextIndex = (currentIndex + 1) % ratioOptions.length
		updateConfig({ ratio: ratioOptions[nextIndex].value })
	}
</script>

<!-- Grid Overlay -->
<div
	class="dev-grid pointer-events-none absolute inset-0 z-[9998]"
	style="opacity: {currentConfig.opacity}"
>
	<!-- Main grid -->
	<div
		class="absolute inset-0"
		style="
			background-image:
				linear-gradient({currentConfig.color} 1px, transparent 1px),
				linear-gradient(90deg, {currentConfig.color} 1px, transparent 1px);
			background-size: {gridSize()}px {gridSize()}px;
		"
	></div>

	<!-- Subdivisions (when enabled) -->
	{#if currentConfig.showSubdivisions}
		<div
			class="absolute inset-0"
			style="
				background-image:
					linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
					linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
				background-size: {subGridSize()}px {subGridSize()}px;
			"
		></div>
	{/if}

	<!-- Center lines (when enabled) -->
	{#if currentConfig.showCenterLines}
		<div
			class="absolute inset-0 flex items-center justify-center pointer-events-none"
		>
			<div class="absolute w-full h-px bg-red-500/30"></div>
			<div class="absolute h-full w-px bg-red-500/30"></div>
		</div>
	{/if}
</div>

<!-- Grid Settings Panel (interactive) -->
<div class="absolute top-8 right-2 z-[10000] pointer-events-auto">
	<button
		onclick={() => showSettings = !showSettings}
		class="p-1.5 rounded bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
		title="Grid settings"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	</button>

	{#if showSettings}
		<div class="absolute top-full right-0 mt-1 w-48 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
			<div class="p-2 border-b border-[var(--color-border)]">
				<span class="text-xs font-medium text-[var(--color-text)]">Grid Settings</span>
			</div>

			<!-- Ratio selector -->
			<div class="p-2 space-y-2">
				<label class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Ratio</label>
				<div class="grid grid-cols-3 gap-1">
					{#each ratioOptions as option}
						<button
							onclick={() => updateConfig({ ratio: option.value })}
							class="px-2 py-1 text-[10px] rounded transition-colors
								{currentConfig.ratio === option.value
									? 'bg-[var(--color-accent)] text-white'
									: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
							title={option.description}
						>
							{option.label}
						</button>
					{/each}
				</div>

				{#if currentConfig.ratio === 'custom'}
					<div class="mt-2">
						<label class="text-[10px] text-[var(--color-text-muted)]">Custom size (px)</label>
						<input
							type="number"
							value={currentConfig.customSize ?? 8}
							onchange={(e) => updateConfig({ customSize: parseInt(e.currentTarget.value) || 8 })}
							class="w-full mt-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
							min="1"
							max="100"
						/>
					</div>
				{/if}
			</div>

			<!-- Toggles -->
			<div class="p-2 space-y-2 border-t border-[var(--color-border)]">
				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showSubdivisions}
						onchange={() => updateConfig({ showSubdivisions: !currentConfig.showSubdivisions })}
						class="rounded border-[var(--color-border)]"
					/>
					Subdivisions
				</label>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentConfig.showCenterLines}
						onchange={() => updateConfig({ showCenterLines: !currentConfig.showCenterLines })}
						class="rounded border-[var(--color-border)]"
					/>
					Center lines
				</label>
			</div>

			<!-- Opacity slider -->
			<div class="p-2 border-t border-[var(--color-border)]">
				<label class="text-[10px] text-[var(--color-text-muted)]">Opacity</label>
				<input
					type="range"
					min="0.1"
					max="1"
					step="0.1"
					value={currentConfig.opacity}
					oninput={(e) => updateConfig({ opacity: parseFloat(e.currentTarget.value) })}
					class="w-full mt-1"
				/>
			</div>

			<!-- Current size display -->
			<div class="p-2 border-t border-[var(--color-border)] text-center">
				<span class="text-[10px] text-[var(--color-text-muted)]">
					Grid: <span class="text-[var(--color-text)] font-mono">{gridSize().toFixed(2)}px</span>
				</span>
			</div>
		</div>
	{/if}
</div>
