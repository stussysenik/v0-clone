<script lang="ts">
	import { Dialog } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface Props {
		open: boolean
		onOpenChange?: (open: boolean) => void
		children: Snippet
		title?: string
		description?: string
	}

	let { open = $bindable(), onOpenChange, children, title, description }: Props = $props()
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
		/>
		<Dialog.Content
			class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
				bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg
				p-6 max-w-md w-full shadow-xl animate-fade-in
				focus:outline-none"
		>
			{#if title}
				<Dialog.Title class="text-lg font-semibold mb-2">
					{title}
				</Dialog.Title>
			{/if}
			{#if description}
				<Dialog.Description class="text-sm text-[var(--color-text-muted)] mb-4">
					{description}
				</Dialog.Description>
			{/if}
			{@render children()}
			<Dialog.Close
				class="absolute top-4 right-4 p-1 rounded hover:bg-[var(--color-bg-tertiary)]
					text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
