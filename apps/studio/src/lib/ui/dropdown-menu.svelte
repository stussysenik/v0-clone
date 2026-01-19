<script lang="ts">
	import { DropdownMenu } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface MenuItem {
		label: string
		onclick?: () => void
		disabled?: boolean
		destructive?: boolean
	}

	interface Props {
		trigger: Snippet
		items: MenuItem[]
	}

	let { trigger, items }: Props = $props()
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger asChild>
		{@render trigger()}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			class="z-50 min-w-[180px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
				rounded-lg p-1 shadow-lg animate-fade-in"
			sideOffset={5}
		>
			{#each items as item}
				<DropdownMenu.Item
					class="flex items-center px-3 py-2 text-sm rounded cursor-pointer
						outline-none transition-colors
						{item.destructive ? 'text-red-400 hover:bg-red-500/10' : 'text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]'}
						{item.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
					disabled={item.disabled}
					onclick={item.onclick}
				>
					{item.label}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
