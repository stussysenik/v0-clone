<script lang="ts">
	import type { SelectedElement } from './ElementSelector.svelte'

	interface Props {
		selectedElement: SelectedElement | null
		onStyleChange?: (property: string, value: string) => void
		onClose?: () => void
	}

	interface StyleSection {
		name: string
		properties: StyleProperty[]
	}

	interface StyleProperty {
		label: string
		property: string
		type: 'color' | 'size' | 'select' | 'text' | 'spacing'
		options?: string[]
		min?: number
		max?: number
		step?: number
		unit?: string
	}

	let { selectedElement, onStyleChange, onClose }: Props = $props()

	let activeTab = $state<'layout' | 'typography' | 'colors' | 'spacing'>('layout')

	// Style values derived from selected element
	const styles = $derived(selectedElement?.computedStyles ?? {})

	// Parse color values
	function parseColor(color: string | undefined): string {
		if (!color) return '#000000'
		// Handle rgb/rgba format
		const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
		if (rgbMatch) {
			const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
			const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
			const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
			return `#${r}${g}${b}`
		}
		return color
	}

	// Parse size values (extract number and unit)
	function parseSize(size: string | undefined): { value: number; unit: string } {
		if (!size) return { value: 0, unit: 'px' }
		const match = size.match(/^([\d.]+)(px|em|rem|%|vh|vw)?$/)
		if (match) {
			return { value: parseFloat(match[1]), unit: match[2] || 'px' }
		}
		return { value: 0, unit: 'px' }
	}

	// Parse spacing values (handle compound values like "8px 16px")
	function parseSpacing(spacing: string | undefined): { top: number; right: number; bottom: number; left: number } {
		if (!spacing) return { top: 0, right: 0, bottom: 0, left: 0 }
		const values = spacing.split(' ').map(v => parseFloat(v) || 0)
		switch (values.length) {
			case 1:
				return { top: values[0], right: values[0], bottom: values[0], left: values[0] }
			case 2:
				return { top: values[0], right: values[1], bottom: values[0], left: values[1] }
			case 3:
				return { top: values[0], right: values[1], bottom: values[2], left: values[1] }
			case 4:
				return { top: values[0], right: values[1], bottom: values[2], left: values[3] }
			default:
				return { top: 0, right: 0, bottom: 0, left: 0 }
		}
	}

	// Style properties for each section
	const layoutProperties: StyleProperty[] = [
		{ label: 'Display', property: 'display', type: 'select', options: ['block', 'flex', 'grid', 'inline', 'inline-block', 'none'] },
		{ label: 'Position', property: 'position', type: 'select', options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
		{ label: 'Width', property: 'width', type: 'size', min: 0, max: 1000, unit: 'px' },
		{ label: 'Height', property: 'height', type: 'size', min: 0, max: 1000, unit: 'px' },
	]

	const typographyProperties: StyleProperty[] = [
		{ label: 'Font Size', property: 'fontSize', type: 'size', min: 8, max: 96, unit: 'px' },
		{ label: 'Font Weight', property: 'fontWeight', type: 'select', options: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
		{ label: 'Line Height', property: 'lineHeight', type: 'size', min: 0, max: 4, step: 0.1, unit: '' },
		{ label: 'Font Family', property: 'fontFamily', type: 'text' },
	]

	const colorProperties: StyleProperty[] = [
		{ label: 'Text Color', property: 'color', type: 'color' },
		{ label: 'Background', property: 'backgroundColor', type: 'color' },
		{ label: 'Border Color', property: 'borderColor', type: 'color' },
	]

	const spacingProperties: StyleProperty[] = [
		{ label: 'Margin', property: 'margin', type: 'spacing' },
		{ label: 'Padding', property: 'padding', type: 'spacing' },
		{ label: 'Border Radius', property: 'borderRadius', type: 'size', min: 0, max: 100, unit: 'px' },
	]

	function handleChange(property: string, value: string) {
		onStyleChange?.(property, value)
	}

	function handleSpacingChange(property: string, side: 'top' | 'right' | 'bottom' | 'left', value: number) {
		const current = parseSpacing(styles[property as keyof typeof styles] as string)
		current[side] = value
		const newValue = `${current.top}px ${current.right}px ${current.bottom}px ${current.left}px`
		handleChange(property, newValue)
	}
</script>

{#if selectedElement}
	<div class="style-inspector w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
		<!-- Header -->
		<div class="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-[var(--color-text)]">Styles</span>
				<span class="px-1.5 py-0.5 text-[10px] rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] font-mono">
					{selectedElement.tagName}
				</span>
			</div>
			<button
				onclick={() => onClose?.()}
				class="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-[var(--color-border)]">
			{#each [
				{ id: 'layout', label: 'Layout', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
				{ id: 'typography', label: 'Type', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
				{ id: 'colors', label: 'Colors', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
				{ id: 'spacing', label: 'Space', icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' }
			] as tab (tab.id)}
				<button
					onclick={() => activeTab = tab.id as typeof activeTab}
					class="flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
						{activeTab === tab.id
							? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5'
							: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon} />
					</svg>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-3 space-y-4">
			{#if activeTab === 'layout'}
				<!-- Layout Section -->
				<div class="space-y-3">
					{#each layoutProperties as prop}
						<div class="property-row">
							<label class="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">
								{prop.label}
							</label>
							{#if prop.type === 'select'}
								<select
									value={styles[prop.property as keyof typeof styles] || prop.options?.[0]}
									onchange={(e) => handleChange(prop.property, e.currentTarget.value)}
									class="w-full px-2 py-1.5 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
								>
									{#each prop.options ?? [] as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							{:else if prop.type === 'size'}
								{@const parsed = parseSize(styles[prop.property as keyof typeof styles] as string)}
								<div class="flex items-center gap-2">
									<input
										type="range"
										min={prop.min ?? 0}
										max={prop.max ?? 100}
										step={prop.step ?? 1}
										value={parsed.value}
										oninput={(e) => handleChange(prop.property, `${e.currentTarget.value}${prop.unit || 'px'}`)}
										class="flex-1 h-1 bg-[var(--color-bg-tertiary)] rounded-full appearance-none cursor-pointer"
									/>
									<input
										type="number"
										value={parsed.value}
										onchange={(e) => handleChange(prop.property, `${e.currentTarget.value}${prop.unit || 'px'}`)}
										class="w-16 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] text-right"
									/>
									<span class="text-[10px] text-[var(--color-text-muted)] w-6">{prop.unit || 'px'}</span>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Box model visualization -->
					<div class="mt-4 p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
						<div class="text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Box Model</div>
						<div class="relative p-4 bg-orange-500/20 rounded text-center text-[10px]">
							<span class="absolute top-1 left-1/2 -translate-x-1/2 text-orange-400">margin</span>
							<div class="p-4 bg-green-500/20 rounded">
								<span class="absolute text-green-400" style="top: 28px; left: 50%; transform: translateX(-50%);">padding</span>
								<div class="p-3 bg-blue-500/30 rounded min-h-[40px] flex items-center justify-center">
									<span class="text-blue-300 font-mono">
										{Math.round(selectedElement.rect.width)} × {Math.round(selectedElement.rect.height)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'typography'}
				<!-- Typography Section -->
				<div class="space-y-3">
					{#each typographyProperties as prop}
						<div class="property-row">
							<label class="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">
								{prop.label}
							</label>
							{#if prop.type === 'select'}
								<select
									value={styles[prop.property as keyof typeof styles] || '400'}
									onchange={(e) => handleChange(prop.property, e.currentTarget.value)}
									class="w-full px-2 py-1.5 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
								>
									{#each prop.options ?? [] as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							{:else if prop.type === 'size'}
								{@const parsed = parseSize(styles[prop.property as keyof typeof styles] as string)}
								<div class="flex items-center gap-2">
									<input
										type="range"
										min={prop.min ?? 0}
										max={prop.max ?? 100}
										step={prop.step ?? 1}
										value={parsed.value}
										oninput={(e) => handleChange(prop.property, `${e.currentTarget.value}${prop.unit || 'px'}`)}
										class="flex-1 h-1 bg-[var(--color-bg-tertiary)] rounded-full appearance-none cursor-pointer"
									/>
									<input
										type="number"
										value={parsed.value}
										onchange={(e) => handleChange(prop.property, `${e.currentTarget.value}${prop.unit || 'px'}`)}
										class="w-16 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] text-right"
									/>
									<span class="text-[10px] text-[var(--color-text-muted)] w-6">{prop.unit || 'px'}</span>
								</div>
							{:else if prop.type === 'text'}
								<input
									type="text"
									value={styles[prop.property as keyof typeof styles] || ''}
									onchange={(e) => handleChange(prop.property, e.currentTarget.value)}
									class="w-full px-2 py-1.5 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-mono"
								/>
							{/if}
						</div>
					{/each}

					<!-- Typography preview -->
					<div class="mt-4 p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
						<div class="text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Preview</div>
						<div
							class="p-2 bg-[var(--color-bg)] rounded"
							style="
								font-size: {styles.fontSize || '16px'};
								font-weight: {styles.fontWeight || '400'};
								font-family: {styles.fontFamily || 'system-ui'};
								color: {styles.color || 'inherit'};
							"
						>
							The quick brown fox
						</div>
					</div>
				</div>
			{:else if activeTab === 'colors'}
				<!-- Colors Section -->
				<div class="space-y-3">
					{#each colorProperties as prop}
						{@const colorValue = parseColor(styles[prop.property as keyof typeof styles] as string)}
						<div class="property-row">
							<label class="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">
								{prop.label}
							</label>
							<div class="flex items-center gap-2">
								<div class="relative">
									<input
										type="color"
										value={colorValue}
										onchange={(e) => handleChange(prop.property, e.currentTarget.value)}
										class="w-8 h-8 rounded cursor-pointer border border-[var(--color-border)] overflow-hidden"
									/>
								</div>
								<input
									type="text"
									value={colorValue}
									onchange={(e) => handleChange(prop.property, e.currentTarget.value)}
									class="flex-1 px-2 py-1.5 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
								/>
							</div>
						</div>
					{/each}

					<!-- Color palette suggestions -->
					<div class="mt-4">
						<div class="text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Palette</div>
						<div class="grid grid-cols-8 gap-1">
							{#each ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff'] as color}
								<button
									onclick={() => handleChange('color', color)}
									class="w-6 h-6 rounded border border-[var(--color-border)] hover:scale-110 transition-transform"
									style="background-color: {color}"
									title={color}
								></button>
							{/each}
						</div>
					</div>
				</div>
			{:else if activeTab === 'spacing'}
				<!-- Spacing Section -->
				<div class="space-y-4">
					<!-- Margin -->
					<div class="property-row">
						<label class="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
							Margin
						</label>
						<div class="grid grid-cols-2 gap-2">
							{#each [
								{ label: 'Top', side: 'top' as const },
								{ label: 'Right', side: 'right' as const },
								{ label: 'Bottom', side: 'bottom' as const },
								{ label: 'Left', side: 'left' as const }
							] as { label, side }}
								{@const margin = parseSpacing(styles.margin as string)}
								<div class="flex items-center gap-1">
									<span class="text-[10px] text-[var(--color-text-muted)] w-10">{label}</span>
									<input
										type="number"
										value={margin[side]}
										onchange={(e) => handleSpacingChange('margin', side, parseFloat(e.currentTarget.value) || 0)}
										class="flex-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] text-right"
									/>
								</div>
							{/each}
						</div>
					</div>

					<!-- Padding -->
					<div class="property-row">
						<label class="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">
							Padding
						</label>
						<div class="grid grid-cols-2 gap-2">
							{#each [
								{ label: 'Top', side: 'top' as const },
								{ label: 'Right', side: 'right' as const },
								{ label: 'Bottom', side: 'bottom' as const },
								{ label: 'Left', side: 'left' as const }
							] as { label, side }}
								{@const padding = parseSpacing(styles.padding as string)}
								<div class="flex items-center gap-1">
									<span class="text-[10px] text-[var(--color-text-muted)] w-10">{label}</span>
									<input
										type="number"
										value={padding[side]}
										onchange={(e) => handleSpacingChange('padding', side, parseFloat(e.currentTarget.value) || 0)}
										class="flex-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] text-right"
									/>
								</div>
							{/each}
						</div>
					</div>

					<!-- Border Radius -->
					<div class="property-row">
						<label class="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">
							Border Radius
						</label>
						<div class="flex items-center gap-2">
							<input
								type="range"
								min="0"
								max="100"
								value={parseSize(styles.borderRadius as string).value}
								oninput={(e) => handleChange('borderRadius', `${e.currentTarget.value}px`)}
								class="flex-1 h-1 bg-[var(--color-bg-tertiary)] rounded-full appearance-none cursor-pointer"
							/>
							<input
								type="number"
								value={parseSize(styles.borderRadius as string).value}
								onchange={(e) => handleChange('borderRadius', `${e.currentTarget.value}px`)}
								class="w-16 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] text-right"
							/>
							<span class="text-[10px] text-[var(--color-text-muted)]">px</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Computed styles footer -->
		<div class="border-t border-[var(--color-border)] p-3">
			<details class="text-xs">
				<summary class="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)]">
					Computed Styles
				</summary>
				<div class="mt-2 max-h-32 overflow-y-auto font-mono text-[10px] space-y-1">
					{#each Object.entries(styles).filter(([_, v]) => v) as [key, value]}
						<div class="flex justify-between">
							<span class="text-[var(--color-text-muted)]">{key}:</span>
							<span class="text-[var(--color-text)] truncate ml-2 max-w-[150px]">{value}</span>
						</div>
					{/each}
				</div>
			</details>
		</div>
	</div>
{/if}

<style>
	/* Custom range slider styling */
	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-accent);
		cursor: pointer;
		margin-top: -4px;
	}

	input[type="range"]::-webkit-slider-runnable-track {
		height: 4px;
		background: var(--color-bg-tertiary);
		border-radius: 2px;
	}

	input[type="range"]:focus {
		outline: none;
	}

	input[type="range"]:focus::-webkit-slider-thumb {
		box-shadow: 0 0 0 3px var(--color-accent-muted);
	}

	/* Color input styling */
	input[type="color"] {
		-webkit-appearance: none;
		appearance: none;
		padding: 0;
		border: none;
	}

	input[type="color"]::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	input[type="color"]::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}
</style>
