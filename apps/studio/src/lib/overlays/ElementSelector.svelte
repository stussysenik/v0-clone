<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { browser } from '$app/environment'

	interface Props {
		iframeRef: HTMLIFrameElement | undefined
		isActive?: boolean
		onElementSelect?: (element: SelectedElement | null) => void
	}

	export interface SelectedElement {
		tagName: string
		id: string
		classList: string[]
		rect: DOMRect
		path: string[]
		computedStyles: Partial<CSSStyleDeclaration>
		innerHTML: string
		dataOid?: string
	}

	let { iframeRef, isActive = false, onElementSelect }: Props = $props()

	let selectedElement = $state<SelectedElement | null>(null)
	let hoveredElement = $state<{ rect: DOMRect; tagName: string } | null>(null)
	let containerRect = $state<DOMRect | null>(null)

	// Scripts to inject into iframe for element tracking
	const INJECTED_SCRIPT = `
		(function() {
			if (window.__elementSelectorInitialized) return;
			window.__elementSelectorInitialized = true;

			let currentHovered = null;
			let currentSelected = null;

			function getElementPath(el) {
				const path = [];
				while (el && el !== document.body && el !== document.documentElement) {
					let selector = el.tagName.toLowerCase();
					if (el.id) {
						selector += '#' + el.id;
					} else if (el.className && typeof el.className === 'string') {
						const classes = el.className.trim().split(/\\s+/).slice(0, 2);
						if (classes.length) selector += '.' + classes.join('.');
					}
					path.unshift(selector);
					el = el.parentElement;
				}
				return path;
			}

			function getElementInfo(el) {
				if (!el || el === document.body || el === document.documentElement) return null;

				const rect = el.getBoundingClientRect();
				const computed = window.getComputedStyle(el);

				return {
					tagName: el.tagName.toLowerCase(),
					id: el.id || '',
					classList: Array.from(el.classList),
					rect: {
						top: rect.top,
						left: rect.left,
						right: rect.right,
						bottom: rect.bottom,
						width: rect.width,
						height: rect.height,
						x: rect.x,
						y: rect.y
					},
					path: getElementPath(el),
					computedStyles: {
						color: computed.color,
						backgroundColor: computed.backgroundColor,
						fontSize: computed.fontSize,
						fontFamily: computed.fontFamily,
						fontWeight: computed.fontWeight,
						padding: computed.padding,
						margin: computed.margin,
						border: computed.border,
						borderRadius: computed.borderRadius,
						display: computed.display,
						position: computed.position,
						width: computed.width,
						height: computed.height,
					},
					innerHTML: el.innerHTML.substring(0, 500),
					dataOid: el.dataset?.oid || null
				};
			}

			document.addEventListener('mousemove', (e) => {
				if (!window.__elementSelectorActive) return;

				const el = document.elementFromPoint(e.clientX, e.clientY);
				if (el && el !== currentHovered) {
					currentHovered = el;
					const rect = el.getBoundingClientRect();
					window.parent.postMessage({
						type: 'element-hover',
						payload: {
							rect: {
								top: rect.top,
								left: rect.left,
								right: rect.right,
								bottom: rect.bottom,
								width: rect.width,
								height: rect.height,
								x: rect.x,
								y: rect.y
							},
							tagName: el.tagName.toLowerCase()
						}
					}, '*');
				}
			});

			document.addEventListener('mouseleave', () => {
				currentHovered = null;
				window.parent.postMessage({ type: 'element-hover', payload: null }, '*');
			});

			document.addEventListener('click', (e) => {
				if (!window.__elementSelectorActive) return;

				e.preventDefault();
				e.stopPropagation();

				const el = document.elementFromPoint(e.clientX, e.clientY);
				if (el) {
					currentSelected = el;
					const info = getElementInfo(el);
					window.parent.postMessage({ type: 'element-select', payload: info }, '*');
				}
			}, true);

			// Update selection rect on scroll/resize
			window.addEventListener('scroll', () => {
				if (currentSelected) {
					const info = getElementInfo(currentSelected);
					window.parent.postMessage({ type: 'element-update', payload: info }, '*');
				}
			});

			window.addEventListener('resize', () => {
				if (currentSelected) {
					const info = getElementInfo(currentSelected);
					window.parent.postMessage({ type: 'element-update', payload: info }, '*');
				}
			});

			// Expose activation control
			window.__setElementSelectorActive = (active) => {
				window.__elementSelectorActive = active;
				if (!active) {
					currentHovered = null;
					currentSelected = null;
				}
			};
		})();
	`

	function handleMessage(event: MessageEvent) {
		if (!iframeRef || event.source !== iframeRef.contentWindow) return

		const { type, payload } = event.data

		switch (type) {
			case 'element-hover':
				hoveredElement = payload
				break
			case 'element-select':
				selectedElement = payload
				onElementSelect?.(payload)
				break
			case 'element-update':
				if (selectedElement) {
					selectedElement = payload
					onElementSelect?.(payload)
				}
				break
		}
	}

	function injectScript() {
		if (!iframeRef?.contentDocument) return

		try {
			// Check if already injected
			const existingScript = iframeRef.contentDocument.getElementById('element-selector-script')
			if (existingScript) return

			const script = iframeRef.contentDocument.createElement('script')
			script.id = 'element-selector-script'
			script.textContent = INJECTED_SCRIPT
			iframeRef.contentDocument.body.appendChild(script)
		} catch (err) {
			console.warn('Failed to inject element selector script:', err)
		}
	}

	function setActive(active: boolean) {
		if (!iframeRef?.contentWindow) return

		try {
			;(iframeRef.contentWindow as any).__setElementSelectorActive?.(active)
		} catch (err) {
			console.warn('Failed to set element selector active state:', err)
		}
	}

	function updateContainerRect() {
		if (!iframeRef) return
		containerRect = iframeRef.getBoundingClientRect()
	}

	// Handle activation state changes
	$effect(() => {
		if (!browser) return
		if (isActive) {
			injectScript()
			setActive(true)
			updateContainerRect()
		} else {
			setActive(false)
			selectedElement = null
			hoveredElement = null
		}
	})

	// Handle iframe load
	$effect(() => {
		if (!browser || !iframeRef) return
		const handleLoad = () => {
			if (isActive) {
				injectScript()
				setActive(true)
			}
		}
		iframeRef.addEventListener('load', handleLoad)
		return () => iframeRef.removeEventListener('load', handleLoad)
	})

	onMount(() => {
		window.addEventListener('message', handleMessage)
		window.addEventListener('resize', updateContainerRect)

		// Initial injection if already active
		if (isActive) {
			injectScript()
			setActive(true)
		}
	})

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', handleMessage)
			window.removeEventListener('resize', updateContainerRect)
		}
		setActive(false)
	})

	function clearSelection() {
		selectedElement = null
		onElementSelect?.(null)
	}
</script>

<!-- Element selector overlay -->
{#if isActive && containerRect}
	<!-- Hover highlight -->
	{#if hoveredElement && !selectedElement}
		<div
			class="element-highlight hover pointer-events-none absolute z-[9997]"
			style="
				top: {hoveredElement.rect.top}px;
				left: {hoveredElement.rect.left}px;
				width: {hoveredElement.rect.width}px;
				height: {hoveredElement.rect.height}px;
			"
		>
			<div class="absolute inset-0 border-2 border-blue-400/60 bg-blue-400/10 rounded-sm"></div>
			<div class="absolute -top-6 left-0 px-1.5 py-0.5 text-[10px] font-mono bg-blue-500 text-white rounded-sm whitespace-nowrap">
				{hoveredElement.tagName}
			</div>
		</div>
	{/if}

	<!-- Selection highlight -->
	{#if selectedElement}
		<div
			class="element-highlight selected pointer-events-none absolute z-[9998]"
			style="
				top: {selectedElement.rect.top}px;
				left: {selectedElement.rect.left}px;
				width: {selectedElement.rect.width}px;
				height: {selectedElement.rect.height}px;
			"
		>
			<!-- Bounding box -->
			<div class="absolute inset-0 border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5 rounded-sm"></div>

			<!-- Resize handles (visual only for now) -->
			<div class="absolute -top-1 -left-1 w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>
			<div class="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>
			<div class="absolute -bottom-1 -left-1 w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>
			<div class="absolute -bottom-1 -right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>

			<!-- Dimensions -->
			<div class="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-accent)] text-white rounded-sm whitespace-nowrap">
				{Math.round(selectedElement.rect.width)} × {Math.round(selectedElement.rect.height)}
			</div>
		</div>
	{/if}
{/if}

<!-- Breadcrumb bar (when element selected) -->
{#if isActive && selectedElement}
	<div class="absolute bottom-0 left-0 right-0 z-[9999] bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm border-t border-[var(--color-border)]">
		<div class="flex items-center justify-between px-3 py-2">
			<!-- Element path breadcrumb -->
			<div class="flex items-center gap-1 overflow-x-auto hide-scrollbar">
				{#each selectedElement.path as segment, i}
					<span class="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors">
						{segment}
					</span>
					{#if i < selectedElement.path.length - 1}
						<span class="text-[var(--color-text-muted)]">/</span>
					{/if}
				{/each}
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-2 ml-4">
				{#if selectedElement.dataOid}
					<span class="px-1.5 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-400 rounded">
						oid: {selectedElement.dataOid}
					</span>
				{/if}
				<button
					onclick={clearSelection}
					class="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
					title="Clear selection"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}

	.element-highlight {
		transition: all 0.1s ease-out;
	}
</style>
