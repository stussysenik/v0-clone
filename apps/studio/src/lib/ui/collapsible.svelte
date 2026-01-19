<script lang="ts">
	import { Collapsible } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface Props {
		open: boolean
		onOpenChange?: (open: boolean) => void
		trigger: Snippet
		children: Snippet
		class?: string
	}

	let { open = $bindable(), onOpenChange, trigger, children, class: className = '' }: Props = $props()
</script>

<Collapsible.Root bind:open {onOpenChange} class={className}>
	<Collapsible.Trigger asChild>
		{@render trigger()}
	</Collapsible.Trigger>
	<Collapsible.Content class="overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
		{@render children()}
	</Collapsible.Content>
</Collapsible.Root>
