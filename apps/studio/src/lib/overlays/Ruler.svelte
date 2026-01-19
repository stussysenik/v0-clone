<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import type { ElementMeasurement } from '@v0-clone/shared'

	interface Props {
		previewIframe?: HTMLIFrameElement | null
		tickSpacing?: number
		showMeasurements?: boolean
	}

	let { previewIframe = null, tickSpacing = 50, showMeasurements = true }: Props = $props()

	let containerWidth = $state(0)
	let containerHeight = $state(0)
	let mouseX = $state(0)
	let mouseY = $state(0)
	let showCrosshair = $state(false)

	// Element measurement state
	let hoveredElement = $state<ElementMeasurement | null>(null)
	let measurementActive = $state(false)

	// Measurement between two points
	let measureStartPoint = $state<{ x: number; y: number } | null>(null)
	let measureEndPoint = $state<{ x: number; y: number } | null>(null)
	let measuringDistance = $state(false)

	onMount(() => {
		const updateDimensions = () => {
			containerWidth = window.innerWidth
			containerHeight = window.innerHeight
		}

		const handleMouseMove = (e: MouseEvent) => {
			mouseX = e.clientX
			mouseY = e.clientY
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			// Hold Alt to show crosshair
			if (e.key === 'Alt') {
				showCrosshair = true
			}
			// Hold Shift to activate element measurement
			if (e.key === 'Shift') {
				measurementActive = true
			}
			// Hold M to start distance measurement
			if (e.key === 'm' || e.key === 'M') {
				measuringDistance = true
			}
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Alt') {
				showCrosshair = false
			}
			if (e.key === 'Shift') {
				measurementActive = false
				hoveredElement = null
			}
			if (e.key === 'm' || e.key === 'M') {
				measuringDistance = false
				measureStartPoint = null
				measureEndPoint = null
			}
		}

		const handleClick = (e: MouseEvent) => {
			if (measuringDistance) {
				if (!measureStartPoint) {
					measureStartPoint = { x: e.clientX, y: e.clientY }
				} else {
					measureEndPoint = { x: e.clientX, y: e.clientY }
				}
			}
		}

		updateDimensions()
		window.addEventListener('resize', updateDimensions)
		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		window.addEventListener('click', handleClick)

		return () => {
			window.removeEventListener('resize', updateDimensions)
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
			window.removeEventListener('click', handleClick)
		}
	})

	// Generate tick marks
	const horizontalTicks = $derived(Math.ceil(containerWidth / tickSpacing))
	const verticalTicks = $derived(Math.ceil(containerHeight / tickSpacing))

	// Calculate distance between two points
	const measurementDistance = $derived(() => {
		if (!measureStartPoint || !measureEndPoint) return null
		const dx = measureEndPoint.x - measureStartPoint.x
		const dy = measureEndPoint.y - measureStartPoint.y
		return {
			distance: Math.sqrt(dx * dx + dy * dy),
			horizontal: Math.abs(dx),
			vertical: Math.abs(dy),
			angle: Math.atan2(dy, dx) * (180 / Math.PI)
		}
	})

	// Request element info from iframe
	function requestElementAtPoint(x: number, y: number) {
		if (!previewIframe?.contentWindow) return

		previewIframe.contentWindow.postMessage({
			type: 'getElementAtPoint',
			payload: { x, y },
			timestamp: Date.now()
		}, '*')
	}

	// Listen for element info from iframe
	onMount(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === 'elementAtPoint') {
				hoveredElement = event.data.payload as ElementMeasurement
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	})

	// Reactive effect for element measurement
	$effect(() => {
		if (measurementActive && previewIframe) {
			const rulerOffset = 24 // Account for ruler width/height
			const adjustedX = mouseX - rulerOffset
			const adjustedY = mouseY - rulerOffset
			if (adjustedX > 0 && adjustedY > 0) {
				requestElementAtPoint(adjustedX, adjustedY)
			}
		}
	})
</script>

<div class="ruler-overlay pointer-events-none absolute inset-0 z-[9999]">
	<!-- Top ruler -->
	<div class="absolute top-0 left-6 right-0 h-6 bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--color-border)] flex items-end">
		{#each Array(horizontalTicks) as _, i}
			<div class="relative flex-shrink-0" style="width: {tickSpacing}px">
				<div class="absolute bottom-0 left-0 w-px h-3 bg-[var(--color-text-muted)]/50"></div>
				<!-- Sub-ticks -->
				{#each [0.25, 0.5, 0.75] as fraction}
					<div
						class="absolute bottom-0 w-px bg-[var(--color-text-muted)]/25"
						style="left: {fraction * tickSpacing}px; height: {fraction === 0.5 ? '6px' : '4px'}"
					></div>
				{/each}
				<span class="absolute bottom-0.5 left-1 text-[9px] text-[var(--color-text-muted)] font-mono">
					{i * tickSpacing}
				</span>
			</div>
		{/each}

		<!-- Mouse position indicator -->
		{#if showCrosshair}
			<div
				class="absolute bottom-0 w-px h-6 bg-[var(--color-accent)]"
				style="left: {mouseX - 24}px"
			></div>
		{/if}
	</div>

	<!-- Left ruler -->
	<div class="absolute top-6 left-0 bottom-0 w-6 bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border-r border-[var(--color-border)] flex flex-col items-end">
		{#each Array(verticalTicks) as _, i}
			<div class="relative flex-shrink-0" style="height: {tickSpacing}px">
				<div class="absolute top-0 right-0 h-px w-3 bg-[var(--color-text-muted)]/50"></div>
				<!-- Sub-ticks -->
				{#each [0.25, 0.5, 0.75] as fraction}
					<div
						class="absolute right-0 h-px bg-[var(--color-text-muted)]/25"
						style="top: {fraction * tickSpacing}px; width: {fraction === 0.5 ? '6px' : '4px'}"
					></div>
				{/each}
				<span class="absolute top-0.5 right-1 text-[9px] text-[var(--color-text-muted)] writing-mode-vertical font-mono">
					{i * tickSpacing}
				</span>
			</div>
		{/each}

		<!-- Mouse position indicator -->
		{#if showCrosshair}
			<div
				class="absolute right-0 h-px w-6 bg-[var(--color-accent)]"
				style="top: {mouseY - 24}px"
			></div>
		{/if}
	</div>

	<!-- Corner square -->
	<div class="absolute top-0 left-0 w-6 h-6 bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border-r border-b border-[var(--color-border)] flex items-center justify-center">
		<span class="text-[8px] text-[var(--color-text-muted)]">px</span>
	</div>

	<!-- Crosshair lines -->
	{#if showCrosshair}
		<div
			class="absolute w-px bg-[var(--color-accent)]/50 pointer-events-none"
			style="left: {mouseX}px; top: 24px; bottom: 0"
		></div>
		<div
			class="absolute h-px bg-[var(--color-accent)]/50 pointer-events-none"
			style="top: {mouseY}px; left: 24px; right: 0"
		></div>

		<!-- Coordinate display -->
		<div
			class="absolute bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-[var(--color-text)] border border-[var(--color-border)] shadow-sm"
			style="left: {mouseX + 10}px; top: {mouseY + 10}px"
		>
			{mouseX - 24}, {mouseY - 24}
		</div>
	{/if}

	<!-- Distance measurement line -->
	{#if measureStartPoint}
		<svg class="absolute inset-0 pointer-events-none" style="z-index: 10001">
			<!-- Start point marker -->
			<circle
				cx={measureStartPoint.x}
				cy={measureStartPoint.y}
				r="4"
				fill="var(--color-accent)"
			/>

			{#if measureEndPoint}
				<!-- End point marker -->
				<circle
					cx={measureEndPoint.x}
					cy={measureEndPoint.y}
					r="4"
					fill="var(--color-accent)"
				/>

				<!-- Measurement line -->
				<line
					x1={measureStartPoint.x}
					y1={measureStartPoint.y}
					x2={measureEndPoint.x}
					y2={measureEndPoint.y}
					stroke="var(--color-accent)"
					stroke-width="2"
					stroke-dasharray="4 2"
				/>

				<!-- Horizontal guide -->
				<line
					x1={measureStartPoint.x}
					y1={measureEndPoint.y}
					x2={measureEndPoint.x}
					y2={measureEndPoint.y}
					stroke="var(--color-accent)"
					stroke-width="1"
					stroke-dasharray="2 2"
					opacity="0.5"
				/>

				<!-- Vertical guide -->
				<line
					x1={measureStartPoint.x}
					y1={measureStartPoint.y}
					x2={measureStartPoint.x}
					y2={measureEndPoint.y}
					stroke="var(--color-accent)"
					stroke-width="1"
					stroke-dasharray="2 2"
					opacity="0.5"
				/>
			{:else}
				<!-- Line following mouse -->
				<line
					x1={measureStartPoint.x}
					y1={measureStartPoint.y}
					x2={mouseX}
					y2={mouseY}
					stroke="var(--color-accent)"
					stroke-width="1"
					stroke-dasharray="4 2"
				/>
			{/if}
		</svg>

		<!-- Distance readout -->
		{#if measureEndPoint && measurementDistance()}
			{@const dist = measurementDistance()}
			<div
				class="absolute bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-mono border border-[var(--color-border)] shadow-lg"
				style="left: {(measureStartPoint.x + measureEndPoint.x) / 2}px; top: {(measureStartPoint.y + measureEndPoint.y) / 2 - 40}px; transform: translateX(-50%)"
			>
				<div class="text-[var(--color-text)] font-semibold">{dist.distance.toFixed(1)}px</div>
				<div class="text-[var(--color-text-muted)] text-[10px] mt-1">
					{dist.horizontal.toFixed(0)}×{dist.vertical.toFixed(0)} · {dist.angle.toFixed(1)}°
				</div>
			</div>
		{/if}
	{/if}

	<!-- Hovered element measurement -->
	{#if hoveredElement && measurementActive}
		<!-- Element highlight box -->
		<div
			class="absolute border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 pointer-events-none"
			style="
				left: {hoveredElement.x + 24}px;
				top: {hoveredElement.y + 24}px;
				width: {hoveredElement.width}px;
				height: {hoveredElement.height}px;
			"
		>
			<!-- Dimension labels -->
			<div class="absolute -top-5 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
				{hoveredElement.width.toFixed(0)}px
			</div>
			<div class="absolute -right-10 top-1/2 -translate-y-1/2 bg-[var(--color-accent)] text-white px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
				{hoveredElement.height.toFixed(0)}px
			</div>
		</div>

		<!-- Element info panel -->
		<div
			class="absolute bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-[var(--color-border)] shadow-lg"
			style="left: {hoveredElement.x + hoveredElement.width + 30}px; top: {hoveredElement.y + 24}px"
		>
			<div class="text-xs font-mono text-[var(--color-text)]">
				<span class="text-[var(--color-accent)]">&lt;{hoveredElement.element}&gt;</span>
			</div>
			<div class="text-[10px] text-[var(--color-text-muted)] mt-1 space-y-0.5">
				<div>display: {hoveredElement.computedStyles.display}</div>
				{#if hoveredElement.computedStyles.flexDirection}
					<div>flex-direction: {hoveredElement.computedStyles.flexDirection}</div>
				{/if}
				{#if hoveredElement.computedStyles.gap}
					<div>gap: {hoveredElement.computedStyles.gap}</div>
				{/if}
				<div>padding: {hoveredElement.computedStyles.padding}</div>
				<div>margin: {hoveredElement.computedStyles.margin}</div>
			</div>
		</div>
	{/if}

	<!-- Measurement mode indicator -->
	{#if measuringDistance}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
			{measureStartPoint ? (measureEndPoint ? 'Click to reset' : 'Click end point') : 'Click start point'} · Press M to exit
		</div>
	{/if}

	{#if measurementActive}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--color-bg-secondary)]/95 text-[var(--color-text)] px-3 py-1.5 rounded-full text-xs border border-[var(--color-border)] shadow-lg">
			Hover over elements to measure · Release Shift to exit
		</div>
	{/if}
</div>

<!-- Keyboard shortcuts hint -->
<div class="absolute bottom-16 right-2 z-[10000] pointer-events-auto">
	<div class="bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm px-2 py-1.5 rounded border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
		<div class="space-y-0.5">
			<div><kbd class="bg-[var(--color-bg-tertiary)] px-1 rounded">Alt</kbd> Crosshair</div>
			<div><kbd class="bg-[var(--color-bg-tertiary)] px-1 rounded">Shift</kbd> Measure element</div>
			<div><kbd class="bg-[var(--color-bg-tertiary)] px-1 rounded">M</kbd> Distance tool</div>
		</div>
	</div>
</div>

<style>
	.writing-mode-vertical {
		writing-mode: vertical-rl;
		text-orientation: mixed;
	}
</style>
