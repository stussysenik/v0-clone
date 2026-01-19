<script lang="ts">
	import { chronicleDB } from '@v0-clone/shared'

	interface Props {
		year: number
		onDayClick?: (year: number, month: number, day: number) => void
	}

	let { year, onDayClick }: Props = $props()

	let activityMap = $state(new Map<string, number>())
	let isLoading = $state(true)

	// Load activity data when year changes
	$effect(() => {
		loadActivity(year)
	})

	async function loadActivity(y: number) {
		isLoading = true
		try {
			activityMap = await chronicleDB.getActivityCalendar(y)
		} catch (e) {
			console.warn('Failed to load activity calendar:', e)
			activityMap = new Map()
		}
		isLoading = false
	}

	function getHeatLevel(count: number): string {
		if (count === 0) return 'heat-0'
		if (count <= 2) return 'heat-1'
		if (count <= 5) return 'heat-2'
		if (count <= 10) return 'heat-3'
		return 'heat-4'
	}

	function getDaysInMonth(year: number, month: number): number {
		return new Date(year, month, 0).getDate()
	}

	function getFirstDayOfMonth(year: number, month: number): number {
		// Returns 0-6 (Sun-Sat)
		return new Date(year, month - 1, 1).getDay()
	}

	// Generate calendar grid data
	function generateMonthGrid(year: number, month: number): Array<{ day: number | null; count: number; key: string }> {
		const daysInMonth = getDaysInMonth(year, month)
		const firstDay = getFirstDayOfMonth(year, month)
		const grid: Array<{ day: number | null; count: number; key: string }> = []

		// Add empty cells for days before the first day of month
		for (let i = 0; i < firstDay; i++) {
			grid.push({ day: null, count: 0, key: `empty-${month}-${i}` })
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
			const count = activityMap.get(key) ?? 0
			grid.push({ day, count, key })
		}

		return grid
	}

	const months = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	]

	const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

	function handleDayClick(month: number, day: number | null) {
		if (day !== null && onDayClick) {
			onDayClick(year, month, day)
		}
	}
</script>

<div class="activity-calendar">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="w-5 h-5 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
		</div>
	{:else}
		<!-- Year grid - 4x3 months -->
		<div class="grid grid-cols-4 gap-3">
			{#each months as monthName, monthIndex}
				{@const month = monthIndex + 1}
				{@const grid = generateMonthGrid(year, month)}
				<div class="month-block">
					<div class="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{monthName}</div>

					<!-- Weekday headers -->
					<div class="grid grid-cols-7 gap-0.5 mb-0.5">
						{#each weekdays as day}
							<div class="text-[8px] text-center text-[var(--color-text-muted)]">{day}</div>
						{/each}
					</div>

					<!-- Days grid -->
					<div class="grid grid-cols-7 gap-0.5">
						{#each grid as { day, count, key }}
							{#if day === null}
								<div class="w-3 h-3"></div>
							{:else}
								<button
									onclick={() => handleDayClick(month, day)}
									class="w-3 h-3 rounded-sm transition-all-smooth hover:ring-1 hover:ring-[var(--color-accent)] {getHeatLevel(count)}"
									title="{monthName} {day}: {count} artifact{count !== 1 ? 's' : ''}"
									type="button"
								></button>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="flex items-center justify-end gap-1 mt-3 text-xs text-[var(--color-text-muted)]">
			<span>Less</span>
			<div class="flex gap-0.5">
				<div class="w-3 h-3 rounded-sm heat-0"></div>
				<div class="w-3 h-3 rounded-sm heat-1"></div>
				<div class="w-3 h-3 rounded-sm heat-2"></div>
				<div class="w-3 h-3 rounded-sm heat-3"></div>
				<div class="w-3 h-3 rounded-sm heat-4"></div>
			</div>
			<span>More</span>
		</div>
	{/if}
</div>

<style>
	.heat-0 {
		background-color: var(--color-bg-tertiary);
	}

	.heat-1 {
		background-color: rgba(59, 130, 246, 0.2);
	}

	.heat-2 {
		background-color: rgba(59, 130, 246, 0.4);
	}

	.heat-3 {
		background-color: rgba(59, 130, 246, 0.6);
	}

	.heat-4 {
		background-color: rgba(59, 130, 246, 0.9);
	}

	/* Dark theme adjustments */
	:global([data-theme="dark"]) .heat-0 {
		background-color: var(--color-bg-tertiary);
	}

	:global([data-theme="dark"]) .heat-1 {
		background-color: rgba(59, 130, 246, 0.25);
	}

	:global([data-theme="dark"]) .heat-2 {
		background-color: rgba(59, 130, 246, 0.45);
	}

	:global([data-theme="dark"]) .heat-3 {
		background-color: rgba(59, 130, 246, 0.65);
	}

	:global([data-theme="dark"]) .heat-4 {
		background-color: rgba(59, 130, 246, 0.95);
	}

	.month-block {
		padding: 0.5rem;
		border-radius: 0.375rem;
		background-color: var(--color-bg-secondary);
	}
</style>
