<script lang="ts">
	import type { SelectedElement } from './ElementSelector.svelte'

	interface Props {
		selectedElement: SelectedElement | null
		position: { x: number; y: number } | null
		onAction?: (action: ContextMenuAction) => void
		onClose?: () => void
	}

	export type ContextMenuAction =
		| { type: 'ask-ai'; prompt?: string }
		| { type: 'edit-code' }
		| { type: 'duplicate' }
		| { type: 'delete' }
		| { type: 'copy-styles' }
		| { type: 'inspect' }
		| { type: 'wrap'; wrapper: string }

	let { selectedElement, position, onAction, onClose }: Props = $props()

	let showAiPrompt = $state(false)
	let aiPrompt = $state('')

	// Close on escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose?.()
		}
	}

	function handleAction(action: ContextMenuAction) {
		onAction?.(action)
		onClose?.()
	}

	function handleAskAi() {
		if (showAiPrompt) {
			handleAction({ type: 'ask-ai', prompt: aiPrompt })
			aiPrompt = ''
			showAiPrompt = false
		} else {
			showAiPrompt = true
		}
	}

	function handleAiSubmit(e: Event) {
		e.preventDefault()
		handleAction({ type: 'ask-ai', prompt: aiPrompt })
		aiPrompt = ''
		showAiPrompt = false
	}

	// Menu items configuration
	const menuItems = [
		{
			id: 'ask-ai',
			label: 'Ask AI to modify',
			icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
			shortcut: '/',
			action: () => handleAskAi(),
		},
		{
			id: 'edit-code',
			label: 'Edit in code',
			icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
			shortcut: 'E',
			action: () => handleAction({ type: 'edit-code' }),
		},
		{ type: 'separator' },
		{
			id: 'duplicate',
			label: 'Duplicate',
			icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
			shortcut: 'D',
			action: () => handleAction({ type: 'duplicate' }),
		},
		{
			id: 'delete',
			label: 'Delete',
			icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
			shortcut: 'Del',
			destructive: true,
			action: () => handleAction({ type: 'delete' }),
		},
		{ type: 'separator' },
		{
			id: 'copy-styles',
			label: 'Copy styles',
			icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3',
			action: () => handleAction({ type: 'copy-styles' }),
		},
		{
			id: 'inspect',
			label: 'Inspect element',
			icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
			action: () => handleAction({ type: 'inspect' }),
		},
		{ type: 'separator' },
		{
			id: 'wrap-div',
			label: 'Wrap in <div>',
			icon: 'M4 6h16M4 12h16M4 18h16',
			action: () => handleAction({ type: 'wrap', wrapper: 'div' }),
		},
		{
			id: 'wrap-flex',
			label: 'Wrap in flex container',
			icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
			action: () => handleAction({ type: 'wrap', wrapper: 'flex' }),
		},
	]
</script>

<svelte:window onkeydown={handleKeydown} />

{#if selectedElement && position}
	<!-- Backdrop to capture clicks outside -->
	<div
		class="fixed inset-0 z-[9998]"
		onclick={() => onClose?.()}
		oncontextmenu={(e) => { e.preventDefault(); onClose?.() }}
		role="presentation"
	></div>

	<!-- Context Menu -->
	<div
		class="context-menu fixed z-[9999] w-56 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl animate-scale-in"
		style="left: {position.x}px; top: {position.y}px;"
		role="menu"
	>
		<!-- Element info header -->
		<div class="px-3 py-2 border-b border-[var(--color-border)]">
			<div class="flex items-center gap-2">
				<span class="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded">
					{selectedElement.tagName}
				</span>
				{#if selectedElement.id}
					<span class="text-[10px] text-[var(--color-text-muted)] font-mono">
						#{selectedElement.id}
					</span>
				{/if}
			</div>
			{#if selectedElement.classList.length > 0}
				<div class="mt-1 text-[10px] text-[var(--color-text-muted)] truncate">
					.{selectedElement.classList.slice(0, 3).join(' .')}
					{#if selectedElement.classList.length > 3}
						<span class="opacity-50">+{selectedElement.classList.length - 3}</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- AI prompt input (expandable) -->
		{#if showAiPrompt}
			<form onsubmit={handleAiSubmit} class="px-2 py-2 border-b border-[var(--color-border)]">
				<input
					type="text"
					bind:value={aiPrompt}
					placeholder="What should AI change?"
					class="w-full px-2 py-1.5 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
					autofocus
				/>
				<div class="flex gap-1 mt-1.5">
					<button
						type="submit"
						class="flex-1 px-2 py-1 text-[10px] bg-[var(--color-accent)] text-white rounded hover:opacity-90 transition-opacity"
					>
						Send
					</button>
					<button
						type="button"
						onclick={() => { showAiPrompt = false; aiPrompt = '' }}
						class="px-2 py-1 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded hover:text-[var(--color-text)] transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		{/if}

		<!-- Menu items -->
		<div class="py-1">
			{#each menuItems as item}
				{#if item.type === 'separator'}
					<div class="my-1 border-t border-[var(--color-border)]"></div>
				{:else}
					<button
						onclick={item.action}
						class="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors
							{item.destructive
								? 'text-red-400 hover:bg-red-500/10'
								: 'text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]'}"
						role="menuitem"
					>
						<svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
						</svg>
						<span class="flex-1">{item.label}</span>
						{#if item.shortcut}
							<span class="text-[10px] text-[var(--color-text-muted)] opacity-50 font-mono">
								{item.shortcut}
							</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-scale-in {
		animation: scale-in 0.1s ease-out;
	}

	.context-menu {
		transform-origin: top left;
	}
</style>
