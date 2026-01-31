<script>
	/** @type {string} */
	export let label;
	
	/** @type {string} */
	export let icon;
	
	/** @type {string | null} */
	export let value = null;
	
	/** @type {boolean} */
	export let loading = true;
</script>

<div class="stat-card">
	<div class="flex items-center justify-between">
		<span class="stat-label">{label}</span>
		<i class="fi {icon} text-sm" style="color: hsl(var(--text-muted));"></i>
	</div>
	{#if loading}
		<div class="shimmer h-8 w-20 rounded mt-2"></div>
	{:else}
		<div class="stat-value">{value}</div>
	{/if}
</div>
