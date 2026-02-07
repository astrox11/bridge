<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let dashboard = $state(null);
	let loading = $state(true);
	let error = $state(null);

	$effect(() => {
		const hash = $page.params.hash;
		if (hash) {
			fetchDashboard(hash);
		}
	});

	async function fetchDashboard(hash) {
		try {
			loading = true;
			const res = await fetch(`/api/user/${hash}/dashboard`);
			const data = await res.json();
			
			if (data.success) {
				dashboard = data.data;
			} else {
				error = data.message;
			}
		} catch (e) {
			error = 'Failed to load dashboard';
		} finally {
			loading = false;
		}
	}

	function formatCredits(credits) {
		return `$${credits.toFixed(2)}`;
	}

	function formatMinutes(minutes) {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	}
</script>

<svelte:head>
	<title>Dashboard | Whatsaly</title>
</svelte:head>

<section class="space-y-6 fade-in">
	{#if loading}
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			{#each [1, 2, 3] as _}
				<div class="card p-4">
					<div class="shimmer h-4 w-20 rounded mb-2"></div>
					<div class="shimmer h-8 w-24 rounded"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="card p-8 text-center">
			<i class="fi fi-rr-exclamation text-3xl mb-4" style="color: hsl(var(--danger));"></i>
			<p style="color: hsl(var(--text-muted));">{error}</p>
			<a href="/login" class="btn btn-primary mt-4 inline-flex">
				<i class="fi fi-rr-sign-in-alt"></i>
				Login Again
			</a>
		</div>
	{:else if dashboard}
		<!-- Stats -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="stat-card">
				<div class="stat-label">Credit Balance</div>
				<div class="stat-value" style="color: hsl(var(--primary));">
					{formatCredits(dashboard.user.credits)}
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Monthly Usage</div>
				<div class="stat-value">
					{formatMinutes(dashboard.monthlyUsageMinutes)}
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Active Instances</div>
				<div class="stat-value">
					{dashboard.instances.length}
				</div>
			</div>
		</div>

		<!-- Usage Cost -->
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-chart-histogram text-sm" style="color: hsl(var(--primary));"></i>
				<span>Billing Summary</span>
			</div>
			<div class="p-4">
				<div class="flex justify-between items-center mb-4">
					<span style="color: hsl(var(--text-muted));">This Month's Usage</span>
					<span class="font-semibold">{formatMinutes(dashboard.monthlyUsageMinutes)}</span>
				</div>
				<div class="flex justify-between items-center mb-4">
					<span style="color: hsl(var(--text-muted));">Billable Hours</span>
					<span class="font-semibold">{(dashboard.monthlyUsageMinutes / 60).toFixed(2)} hrs</span>
				</div>
				<div class="flex justify-between items-center border-t pt-4" style="border-color: hsl(var(--border));">
					<span style="color: hsl(var(--text-muted));">Estimated Cost (@$0.10/hr)</span>
					<span class="font-semibold" style="color: hsl(var(--primary));">
						{formatCredits(dashboard.creditsUsed)}
					</span>
				</div>
			</div>
		</div>

		<!-- Instances -->
		<div class="card">
			<div class="card-header flex items-center justify-between">
				<div class="flex items-center gap-2">
					<i class="fi fi-rr-server text-sm" style="color: hsl(var(--primary));"></i>
					<span>Your Instances</span>
				</div>
				<a href={`/user/${$page.params.hash}/instances`} class="text-xs" style="color: hsl(var(--primary));">
					View All →
				</a>
			</div>
			<div>
				{#if dashboard.instances.length === 0}
					<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
						<i class="fi fi-rr-server text-2xl mb-2 block opacity-40"></i>
						<p class="text-sm">No instances yet</p>
					</div>
				{:else}
					{#each dashboard.instances.slice(0, 3) as instance}
						<div class="session-item">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-full flex items-center justify-center" 
									style="background: hsla(var(--primary) / 0.1);">
									<i class="fi fi-rr-smartphone text-sm" style="color: hsl(var(--primary));"></i>
								</div>
								<div>
									<div class="font-medium text-sm" style="color: hsl(var(--text));">
										{instance.name || instance.sessionId}
									</div>
									<div class="text-xs" style="color: hsl(var(--text-muted));">
										{instance.sessionId}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="status-dot" class:status-online={instance.status === 'connected' || instance.status === 'active'}
									class:status-offline={instance.status !== 'connected' && instance.status !== 'active'}></span>
								<span class="text-xs capitalize" style="color: hsl(var(--text-muted));">
									{instance.status}
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-bolt text-sm" style="color: hsl(var(--primary));"></i>
				<span>Quick Actions</span>
			</div>
			<div class="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
				<a href={`/user/${$page.params.hash}/billing`} class="quick-action-btn">
					<i class="fi fi-rr-plus"></i>
					<span>Add Credits</span>
				</a>
				<a href={`/user/${$page.params.hash}/support`} class="quick-action-btn">
					<i class="fi fi-rr-headset"></i>
					<span>Get Support</span>
				</a>
				<a href={`/user/${$page.params.hash}/tools`} class="quick-action-btn">
					<i class="fi fi-rr-tools"></i>
					<span>Tools</span>
				</a>
				<a href="/pair" class="quick-action-btn">
					<i class="fi fi-rr-link-alt"></i>
					<span>Link Device</span>
				</a>
			</div>
		</div>
	{/if}
</section>

<style>
	.quick-action-btn {
		@apply flex flex-col items-center justify-center gap-2 p-4 rounded-lg text-sm transition-colors;
		background: hsl(var(--bg));
		color: hsl(var(--text-muted));
		border: 1px solid hsl(var(--border));
	}

	.quick-action-btn:hover {
		background: hsla(var(--primary) / 0.1);
		color: hsl(var(--primary));
		border-color: hsl(var(--primary));
	}

	.quick-action-btn i {
		font-size: 1.25rem;
	}
</style>
