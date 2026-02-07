<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let credits = $state(0);
	let transactions = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let addAmount = $state(10);
	let adding = $state(false);

	$effect(() => {
		const hash = $page.params.hash;
		if (hash) {
			fetchBilling(hash);
		}
	});

	async function fetchBilling(hash) {
		try {
			loading = true;
			const res = await fetch(`/api/user/${hash}/credits`);
			const data = await res.json();
			
			if (data.success) {
				credits = data.balance;
				transactions = data.transactions;
			} else {
				error = data.message;
			}
		} catch (e) {
			error = 'Failed to load billing info';
		} finally {
			loading = false;
		}
	}

	async function addCredits() {
		if (addAmount <= 0) return;
		
		adding = true;
		try {
			const res = await fetch(`/api/user/${$page.params.hash}/credits/add`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					amount: addAmount,
					description: `Added $${addAmount} credits`
				})
			});
			const data = await res.json();
			
			if (data.success) {
				credits = data.newBalance;
				await fetchBilling($page.params.hash);
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Failed to add credits');
		} finally {
			adding = false;
		}
	}

	function formatDate(date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Billing | Whatsaly</title>
</svelte:head>

<section class="space-y-6 fade-in">
	<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">Billing & Credits</h1>

	{#if loading}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div class="card p-6">
				<div class="shimmer h-4 w-24 rounded mb-2"></div>
				<div class="shimmer h-10 w-32 rounded"></div>
			</div>
			<div class="card p-6">
				<div class="shimmer h-4 w-32 rounded mb-2"></div>
				<div class="shimmer h-10 w-full rounded"></div>
			</div>
		</div>
	{:else if error}
		<div class="card p-8 text-center">
			<i class="fi fi-rr-exclamation text-3xl mb-4" style="color: hsl(var(--danger));"></i>
			<p style="color: hsl(var(--text-muted));">{error}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<!-- Balance -->
			<div class="card p-6">
				<div class="text-sm font-medium mb-2" style="color: hsl(var(--text-muted));">Current Balance</div>
				<div class="text-3xl font-bold" style="color: hsl(var(--primary));">
					${credits.toFixed(2)}
				</div>
				<p class="text-xs mt-2" style="color: hsl(var(--text-muted));">
					Rate: $0.10 per hour of runtime
				</p>
			</div>

			<!-- Add Credits -->
			<div class="card p-6">
				<div class="text-sm font-medium mb-3" style="color: hsl(var(--text-muted));">Add Credits</div>
				<div class="flex gap-2">
					<div class="flex-1 relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style="color: hsl(var(--text-muted));">$</span>
						<input 
							type="number" 
							bind:value={addAmount}
							min="1"
							step="5"
							class="input pl-7"
							placeholder="Amount"
						/>
					</div>
					<button 
						class="btn btn-primary"
						onclick={addCredits}
						disabled={adding || addAmount <= 0}>
						{#if adding}
							<i class="fi fi-rr-spinner animate-spin"></i>
						{:else}
							<i class="fi fi-rr-plus"></i>
						{/if}
						Add
					</button>
				</div>
				<div class="flex gap-2 mt-3">
					{#each [5, 10, 25, 50] as amount}
						<button 
							class="quick-amount"
							class:active={addAmount === amount}
							onclick={() => addAmount = amount}>
							${amount}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Pricing Info -->
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-info text-sm" style="color: hsl(var(--primary));"></i>
				<span>Pricing</span>
			</div>
			<div class="p-4">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="pricing-item">
						<i class="fi fi-rr-clock"></i>
						<div>
							<div class="font-medium">Hourly Rate</div>
							<div class="text-sm" style="color: hsl(var(--text-muted));">$0.10/hour runtime</div>
						</div>
					</div>
					<div class="pricing-item">
						<i class="fi fi-rr-pause"></i>
						<div>
							<div class="font-medium">Downtime</div>
							<div class="text-sm" style="color: hsl(var(--text-muted));">Free when paused</div>
						</div>
					</div>
					<div class="pricing-item">
						<i class="fi fi-rr-calculator"></i>
						<div>
							<div class="font-medium">Monthly Cap</div>
							<div class="text-sm" style="color: hsl(var(--text-muted));">~$72/month max</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Transactions -->
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-receipt text-sm" style="color: hsl(var(--primary));"></i>
				<span>Transaction History</span>
			</div>
			<div>
				{#if transactions.length === 0}
					<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
						<i class="fi fi-rr-receipt text-2xl mb-2 block opacity-40"></i>
						<p class="text-sm">No transactions yet</p>
					</div>
				{:else}
					{#each transactions as tx}
						<div class="transaction-item">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-full flex items-center justify-center"
									style="background: hsla({tx.transactionType === 'credit' ? 'var(--primary)' : 'var(--danger)'} / 0.1);">
									<i class="fi {tx.transactionType === 'credit' ? 'fi-rr-arrow-down' : 'fi-rr-arrow-up'}"
										style="color: hsl({tx.transactionType === 'credit' ? 'var(--primary)' : 'var(--danger)'});"></i>
								</div>
								<div>
									<div class="font-medium text-sm" style="color: hsl(var(--text));">
										{tx.description || tx.transactionType}
									</div>
									<div class="text-xs" style="color: hsl(var(--text-muted));">
										{formatDate(tx.createdAt)}
									</div>
								</div>
							</div>
							<div class="font-semibold" 
								style="color: hsl({tx.transactionType === 'credit' ? 'var(--primary)' : 'var(--danger)'});">
								{tx.transactionType === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.quick-amount {
		@apply flex-1 py-2 text-sm font-medium rounded-lg transition-colors;
		background: hsl(var(--bg));
		color: hsl(var(--text-muted));
		border: 1px solid hsl(var(--border));
	}

	.quick-amount:hover {
		border-color: hsl(var(--primary));
		color: hsl(var(--primary));
	}

	.quick-amount.active {
		background: hsla(var(--primary) / 0.1);
		border-color: hsl(var(--primary));
		color: hsl(var(--primary));
	}

	.pricing-item {
		@apply flex items-center gap-3 p-3 rounded-lg;
		background: hsl(var(--bg));
	}

	.pricing-item i {
		@apply text-lg;
		color: hsl(var(--primary));
	}

	.transaction-item {
		@apply p-4 border-b last:border-0 flex items-center justify-between;
		border-color: hsl(var(--border));
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
